/**
 * OAuth 2.0 토큰 엔드포인트
 * Wave 3: 고위험 함수 - 토큰 발급/갱신
 */

import { Hono } from 'hono';
import type { Env } from '../../types';
import { SignJWT, jwtVerify } from 'jose';

const token = new Hono<AppType>();

interface TokenRequest {
  grant_type: string;
  code?: string;
  redirect_uri?: string;
  client_id?: string;
  client_secret?: string;
  code_verifier?: string;
  refresh_token?: string;
  scope?: string;
}

// Base64URL 디코딩
function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// PKCE 검증
async function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: string
): Promise<boolean> {
  if (method !== 'S256') {
    return false;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  // Base64URL 인코딩
  let binary = '';
  for (let i = 0; i < hashArray.byteLength; i++) {
    binary += String.fromCharCode(hashArray[i]);
  }
  const computedChallenge = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return computedChallenge === codeChallenge;
}

// 액세스 토큰 생성
async function generateAccessToken(
  userId: string,
  scope: string[],
  clientId: string,
  secret: Uint8Array,
  expiresIn: number = 3600
): Promise<string> {
  const jwt = await new SignJWT({
    sub: userId,
    scope: scope.join(' '),
    client_id: clientId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .setIssuer('idea-on-action')
    .setAudience(clientId)
    .sign(secret);

  return jwt;
}

// 리프레시 토큰 생성
async function generateRefreshToken(): Promise<string> {
  const buffer = new Uint8Array(48);
  crypto.getRandomValues(buffer);
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ID 토큰 생성 (OpenID Connect)
async function generateIdToken(
  userId: string,
  email: string,
  name: string | null,
  clientId: string,
  nonce: string | null,
  secret: Uint8Array
): Promise<string> {
  const payload: Record<string, unknown> = {
    sub: userId,
    email,
    name,
    email_verified: true,
  };

  if (nonce) {
    payload.nonce = nonce;
  }

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setIssuer('idea-on-action')
    .setAudience(clientId)
    .sign(secret);

  return jwt;
}

// POST /oauth/token
token.post('/', async (c) => {
  const db = c.env.DB;
  const contentType = c.req.header('Content-Type');

  let body: TokenRequest;

  if (contentType?.includes('application/json')) {
    body = await c.req.json<TokenRequest>();
  } else {
    // application/x-www-form-urlencoded
    const formData = await c.req.parseBody();
    body = formData as unknown as TokenRequest;
  }

  const { grant_type } = body;

  if (grant_type === 'authorization_code') {
    return handleAuthorizationCodeGrant(c, db, body);
  } else if (grant_type === 'refresh_token') {
    return handleRefreshTokenGrant(c, db, body);
  } else {
    return c.json({
      error: 'unsupported_grant_type',
      error_description: 'authorization_code, refresh_token만 지원됩니다',
    }, 400);
  }
});

// Authorization Code Grant 처리
async function handleAuthorizationCodeGrant(
  c: ReturnType<typeof Hono.prototype.get>,
  db: D1Database,
  body: TokenRequest
) {
  const { code, redirect_uri, client_id, client_secret, code_verifier } = body;

  if (!code || !redirect_uri || !client_id) {
    return c.json({
      error: 'invalid_request',
      error_description: 'code, redirect_uri, client_id는 필수입니다',
    }, 400);
  }

  // 인가 코드 조회
  const authCode = await db
    .prepare(`
      SELECT * FROM authorization_codes
      WHERE code = ? AND is_used = 0 AND expires_at > datetime('now')
    `)
    .bind(code)
    .first();

  if (!authCode) {
    return c.json({
      error: 'invalid_grant',
      error_description: '유효하지 않거나 만료된 인가 코드입니다',
    }, 400);
  }

  // 클라이언트 검증
  if (authCode.client_id !== client_id) {
    return c.json({
      error: 'invalid_grant',
      error_description: 'client_id가 일치하지 않습니다',
    }, 400);
  }

  if (authCode.redirect_uri !== redirect_uri) {
    return c.json({
      error: 'invalid_grant',
      error_description: 'redirect_uri가 일치하지 않습니다',
    }, 400);
  }

  // 클라이언트 조회
  const client = await db
    .prepare('SELECT * FROM oauth_clients WHERE client_id = ?')
    .bind(client_id)
    .first();

  if (!client) {
    return c.json({
      error: 'invalid_client',
      error_description: '유효하지 않은 클라이언트입니다',
    }, 400);
  }

  // PKCE 검증 (code_challenge가 있는 경우)
  if (authCode.code_challenge) {
    if (!code_verifier) {
      return c.json({
        error: 'invalid_request',
        error_description: 'PKCE code_verifier가 필요합니다',
      }, 400);
    }

    const isValid = await verifyCodeChallenge(
      code_verifier,
      authCode.code_challenge as string,
      authCode.code_challenge_method as string
    );

    if (!isValid) {
      return c.json({
        error: 'invalid_grant',
        error_description: 'PKCE code_verifier가 일치하지 않습니다',
      }, 400);
    }
  } else if (client_secret) {
    // client_secret 검증 (PKCE가 아닌 경우)
    // TODO: bcrypt 비교 (Workers에서는 별도 라이브러리 필요)
    // 현재는 해시 비교 스킵
  }

  // 인가 코드 사용 처리
  await db
    .prepare("UPDATE authorization_codes SET is_used = 1, updated_at = datetime('now') WHERE id = ?")
    .bind(authCode.id)
    .run();

  // 사용자 정보 조회
  const user = await db
    .prepare('SELECT id, email, name FROM users WHERE id = ?')
    .bind(authCode.user_id)
    .first();

  if (!user) {
    return c.json({
      error: 'invalid_grant',
      error_description: '사용자를 찾을 수 없습니다',
    }, 500);
  }

  // 토큰 생성
  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  const scope = (authCode.scope as string).split(' ');

  const accessToken = await generateAccessToken(
    user.id as string,
    scope,
    client_id,
    secret
  );

  const refreshToken = await generateRefreshToken();

  // 리프레시 토큰 저장
  const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db
    .prepare(`
      INSERT INTO oauth_refresh_tokens (id, token, user_id, client_id, scope, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(
      crypto.randomUUID(),
      refreshToken,
      user.id,
      client_id,
      authCode.scope,
      refreshTokenExpiresAt.toISOString()
    )
    .run();

  // 응답 생성
  const response: Record<string, unknown> = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: refreshToken,
    scope: authCode.scope,
  };

  // ID 토큰 생성 (openid 스코프가 있는 경우)
  if (scope.includes('openid')) {
    const idToken = await generateIdToken(
      user.id as string,
      user.email as string,
      user.name as string | null,
      client_id,
      authCode.nonce as string | null,
      secret
    );
    response.id_token = idToken;
  }

  return c.json(response);
}

// Refresh Token Grant 처리
async function handleRefreshTokenGrant(
  c: ReturnType<typeof Hono.prototype.get>,
  db: D1Database,
  body: TokenRequest
) {
  const { refresh_token, client_id, client_secret, scope } = body;

  if (!refresh_token || !client_id) {
    return c.json({
      error: 'invalid_request',
      error_description: 'refresh_token, client_id는 필수입니다',
    }, 400);
  }

  // 리프레시 토큰 조회
  const storedToken = await db
    .prepare(`
      SELECT * FROM oauth_refresh_tokens
      WHERE token = ? AND is_revoked = 0 AND expires_at > datetime('now')
    `)
    .bind(refresh_token)
    .first();

  if (!storedToken) {
    return c.json({
      error: 'invalid_grant',
      error_description: '유효하지 않거나 만료된 리프레시 토큰입니다',
    }, 400);
  }

  if (storedToken.client_id !== client_id) {
    return c.json({
      error: 'invalid_grant',
      error_description: 'client_id가 일치하지 않습니다',
    }, 400);
  }

  // 새 액세스 토큰 생성
  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  const tokenScope = scope
    ? scope.split(' ')
    : (storedToken.scope as string).split(' ');

  const accessToken = await generateAccessToken(
    storedToken.user_id as string,
    tokenScope,
    client_id,
    secret
  );

  // 리프레시 토큰 로테이션 (선택적)
  const newRefreshToken = await generateRefreshToken();

  // 기존 토큰 폐기
  await db
    .prepare("UPDATE oauth_refresh_tokens SET is_revoked = 1, updated_at = datetime('now') WHERE id = ?")
    .bind(storedToken.id)
    .run();

  // 새 리프레시 토큰 저장
  const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db
    .prepare(`
      INSERT INTO oauth_refresh_tokens (id, token, user_id, client_id, scope, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(
      crypto.randomUUID(),
      newRefreshToken,
      storedToken.user_id,
      client_id,
      tokenScope.join(' '),
      refreshTokenExpiresAt.toISOString()
    )
    .run();

  return c.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: newRefreshToken,
    scope: tokenScope.join(' '),
  });
}

export default token;
