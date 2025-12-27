/**
 * OAuth 2.0 인가 엔드포인트
 * Wave 3: 고위험 함수 - RFC 6749 + PKCE
 */

import { Hono } from 'hono';
import type { Env } from '../../types';
import { optionalAuthMiddleware, type AuthContext } from '../../middleware/auth';
import { SignJWT } from 'jose';

const authorize = new Hono<AppType>();

interface AuthorizeParams {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  nonce?: string;
}

// Base64URL 인코딩
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// 인가 코드 생성
async function generateAuthorizationCode(): Promise<string> {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return base64UrlEncode(buffer);
}

// 클라이언트 검증
async function validateClient(
  db: D1Database,
  clientId: string,
  redirectUri: string
): Promise<{ valid: boolean; client?: D1Result<unknown>['results'][0]; error?: string }> {
  const client = await db
    .prepare('SELECT * FROM oauth_clients WHERE client_id = ? AND is_active = 1')
    .bind(clientId)
    .first();

  if (!client) {
    return { valid: false, error: 'invalid_client' };
  }

  // redirect_uri 검증
  const allowedUris = JSON.parse(client.redirect_uris as string) as string[];
  if (!allowedUris.includes(redirectUri)) {
    return { valid: false, error: 'invalid_redirect_uri' };
  }

  return { valid: true, client };
}

// 스코프 검증
function validateScopes(
  requestedScopes: string[],
  allowedScopes: string[]
): { valid: boolean; scopes: string[] } {
  const validScopes = requestedScopes.filter(s => allowedScopes.includes(s));

  // 최소한 하나의 유효한 스코프가 있어야 함
  if (validScopes.length === 0 && requestedScopes.length > 0) {
    return { valid: false, scopes: [] };
  }

  // 기본 스코프 추가
  if (!validScopes.includes('openid')) {
    validScopes.unshift('openid');
  }

  return { valid: true, scopes: validScopes };
}

// GET /oauth/authorize - 인가 페이지 리다이렉트
authorize.get('/', optionalAuthMiddleware, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth') as AuthContext | undefined;
  const query = c.req.query() as unknown as AuthorizeParams;

  const {
    response_type,
    client_id,
    redirect_uri,
    scope = 'openid profile',
    state,
    code_challenge,
    code_challenge_method = 'S256',
    nonce,
  } = query;

  // 필수 파라미터 검증
  if (!response_type || !client_id || !redirect_uri) {
    return c.json({
      error: 'invalid_request',
      error_description: 'response_type, client_id, redirect_uri는 필수입니다',
    }, 400);
  }

  // response_type 검증
  if (response_type !== 'code') {
    return c.json({
      error: 'unsupported_response_type',
      error_description: 'code만 지원됩니다',
    }, 400);
  }

  // 클라이언트 검증
  const clientValidation = await validateClient(db, client_id, redirect_uri);
  if (!clientValidation.valid) {
    return c.json({
      error: clientValidation.error,
      error_description: '유효하지 않은 클라이언트 또는 redirect_uri입니다',
    }, 400);
  }

  const client = clientValidation.client!;

  // PKCE 검증 (필수인 경우)
  if (client.require_pkce && !code_challenge) {
    return c.json({
      error: 'invalid_request',
      error_description: 'PKCE code_challenge가 필요합니다',
    }, 400);
  }

  if (code_challenge && code_challenge_method !== 'S256') {
    return c.json({
      error: 'invalid_request',
      error_description: 'S256 code_challenge_method만 지원됩니다',
    }, 400);
  }

  // 스코프 검증
  const requestedScopes = scope.split(' ').filter(Boolean);
  const allowedScopes = JSON.parse(client.allowed_scopes as string) as string[];
  const scopeValidation = validateScopes(requestedScopes, allowedScopes);

  if (!scopeValidation.valid) {
    return c.json({
      error: 'invalid_scope',
      error_description: '유효하지 않은 스코프입니다',
    }, 400);
  }

  // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
  if (!auth?.userId) {
    const loginUrl = new URL('/login', c.req.url);
    loginUrl.searchParams.set('redirect', c.req.url);
    return c.redirect(loginUrl.toString());
  }

  // 인가 코드 생성
  const code = await generateAuthorizationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분

  // 인가 코드 저장
  await db
    .prepare(`
      INSERT INTO authorization_codes (
        id, code, client_id, user_id, redirect_uri, scope,
        code_challenge, code_challenge_method, nonce, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      crypto.randomUUID(),
      code,
      client_id,
      auth.userId,
      redirect_uri,
      scopeValidation.scopes.join(' '),
      code_challenge || null,
      code_challenge ? code_challenge_method : null,
      nonce || null,
      expiresAt.toISOString()
    )
    .run();

  // 리다이렉트
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return c.redirect(redirectUrl.toString());
});

// POST /oauth/authorize - 동의 처리 (프론트엔드 없이 직접 처리)
authorize.post('/', optionalAuthMiddleware, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth') as AuthContext | undefined;

  if (!auth?.userId) {
    return c.json({
      error: 'unauthorized',
      error_description: '로그인이 필요합니다',
    }, 401);
  }

  const body = await c.req.json<{
    client_id: string;
    redirect_uri: string;
    scope: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    nonce?: string;
    consent: boolean;
  }>();

  if (!body.consent) {
    const redirectUrl = new URL(body.redirect_uri);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('error_description', '사용자가 동의를 거부했습니다');
    if (body.state) {
      redirectUrl.searchParams.set('state', body.state);
    }
    return c.json({ redirect: redirectUrl.toString() });
  }

  // 클라이언트 검증
  const clientValidation = await validateClient(db, body.client_id, body.redirect_uri);
  if (!clientValidation.valid) {
    return c.json({
      error: clientValidation.error,
      error_description: '유효하지 않은 클라이언트입니다',
    }, 400);
  }

  const client = clientValidation.client!;

  // 스코프 검증
  const requestedScopes = body.scope.split(' ').filter(Boolean);
  const allowedScopes = JSON.parse(client.allowed_scopes as string) as string[];
  const scopeValidation = validateScopes(requestedScopes, allowedScopes);

  // 인가 코드 생성
  const code = await generateAuthorizationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db
    .prepare(`
      INSERT INTO authorization_codes (
        id, code, client_id, user_id, redirect_uri, scope,
        code_challenge, code_challenge_method, nonce, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      crypto.randomUUID(),
      code,
      body.client_id,
      auth.userId,
      body.redirect_uri,
      scopeValidation.scopes.join(' '),
      body.code_challenge || null,
      body.code_challenge ? (body.code_challenge_method || 'S256') : null,
      body.nonce || null,
      expiresAt.toISOString()
    )
    .run();

  const redirectUrl = new URL(body.redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (body.state) {
    redirectUrl.searchParams.set('state', body.state);
  }

  return c.json({ redirect: redirectUrl.toString() });
});

export default authorize;
