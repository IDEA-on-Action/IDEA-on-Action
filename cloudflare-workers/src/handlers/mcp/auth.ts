/**
 * MCP Auth 핸들러
 * JWT 토큰 발급, 검증, 갱신, 폐기
 *
 * Supabase Edge Functions mcp-auth에서 마이그레이션
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import {
  VALID_SERVICE_IDS,
  ACCESS_TOKEN_EXPIRY_SECONDS,
  REFRESH_TOKEN_EXPIRY_SECONDS,
  type ServiceId,
  type Scope,
} from '../../lib/mcp/constants';
import {
  generateJWT,
  verifyJWT,
  validateScopes,
  generateRefreshToken,
  hashToken,
  verifyHmacSignature,
  verifyTimestamp,
} from '../../lib/mcp/jwt';

const auth = new Hono<AppType>();

// ============================================================================
// 타입 정의
// ============================================================================

interface TokenRequest {
  grant_type: 'service_credentials';
  scope?: string[];
  client_id: string;
}

interface RefreshRequest {
  grant_type: 'refresh_token';
  refresh_token: string;
}

interface VerifyRequest {
  token: string;
  required_scope?: string[];
}

interface RevokeRequest {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
  reason?: string;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

function errorResponse(
  c: { json: (data: unknown, status: number) => Response },
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return c.json({
    error: {
      code,
      message,
      details,
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    },
  }, status);
}

// ============================================================================
// POST /mcp/auth/token - 토큰 발급
// ============================================================================

auth.post('/token', async (c) => {
  const db = c.env.DB;

  // 헤더 검증
  const serviceId = c.req.header('x-service-id');
  const signature = c.req.header('x-signature');
  const timestamp = c.req.header('x-timestamp');

  if (!serviceId) {
    return errorResponse(c, 'missing_header', 'X-Service-Id 헤더가 필요합니다.', 400);
  }

  if (!VALID_SERVICE_IDS.includes(serviceId as ServiceId)) {
    return errorResponse(c, 'invalid_service', '유효하지 않은 서비스 ID입니다.', 400);
  }

  if (!signature) {
    return errorResponse(c, 'missing_header', 'X-Signature 헤더가 필요합니다.', 400);
  }

  if (timestamp && !verifyTimestamp(timestamp)) {
    return errorResponse(c, 'invalid_timestamp', '요청 타임스탬프가 만료되었습니다.', 401);
  }

  // 요청 본문 읽기
  const body = await c.req.text();
  if (!body) {
    return errorResponse(c, 'invalid_payload', '요청 본문이 비어 있습니다.', 400);
  }

  // 서비스 시크릿으로 서명 검증
  const secretEnvName = `WEBHOOK_SECRET_${serviceId.toUpperCase().replace(/-/g, '_')}` as `WEBHOOK_SECRET_${string}`;
  const secret = c.env[secretEnvName];

  if (!secret) {
    console.error(`Missing webhook secret for service: ${serviceId}`);
    return errorResponse(c, 'configuration_error', '서비스 설정 오류입니다.', 500);
  }

  const isValidSignature = await verifyHmacSignature(body, signature, secret);
  if (!isValidSignature) {
    return errorResponse(c, 'invalid_signature', 'HMAC 서명이 유효하지 않습니다.', 401);
  }

  // 요청 파싱
  let request: TokenRequest;
  try {
    request = JSON.parse(body);
  } catch {
    return errorResponse(c, 'invalid_payload', '유효하지 않은 JSON 형식입니다.', 400);
  }

  if (request.grant_type !== 'service_credentials') {
    return errorResponse(c, 'unsupported_grant_type', 'service_credentials만 허용됩니다.', 400);
  }

  if (!request.client_id) {
    return errorResponse(c, 'invalid_payload', 'client_id가 필요합니다.', 400);
  }

  // scope 검증
  const requestedScope = request.scope || ['events:read', 'events:write', 'health:write'];
  const validatedScope = validateScopes(requestedScope);

  if (validatedScope.length === 0) {
    return errorResponse(c, 'invalid_scope', '유효한 scope가 없습니다.', 400);
  }

  try {
    // Access Token 생성
    const jwtSecret = c.env.MCP_JWT_SECRET;
    if (!jwtSecret) {
      return errorResponse(c, 'configuration_error', 'JWT 시크릿이 설정되지 않았습니다.', 500);
    }

    const { token: accessToken, jti: accessJti, exp: accessExp } =
      await generateJWT(serviceId, request.client_id, validatedScope, jwtSecret);

    // Access Token 해시 저장
    const accessTokenHash = await hashToken(accessToken);
    await db
      .prepare(`
        INSERT INTO service_tokens (id, service_id, client_id, token_hash, token_type, scope, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, 'access', ?, datetime(?, 'unixepoch'), ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        serviceId,
        request.client_id,
        accessTokenHash,
        JSON.stringify(validatedScope),
        accessExp,
        c.req.header('cf-connecting-ip') || null,
        c.req.header('user-agent') || null
      )
      .run();

    // Refresh Token 생성
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = await hashToken(refreshToken);
    const refreshExpiresAt = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY_SECONDS;

    await db
      .prepare(`
        INSERT INTO service_tokens (id, service_id, client_id, token_hash, token_type, scope, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, 'refresh', ?, datetime(?, 'unixepoch'), ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        serviceId,
        request.client_id,
        refreshTokenHash,
        JSON.stringify(validatedScope),
        refreshExpiresAt,
        c.req.header('cf-connecting-ip') || null,
        c.req.header('user-agent') || null
      )
      .run();

    // 감사 로그
    await db
      .prepare(`
        INSERT INTO mcp_audit_log (id, endpoint, method, service_id, client_id, status_code, success, request_id, ip_address, user_agent)
        VALUES (?, '/mcp/auth/token', 'POST', ?, ?, 200, 1, ?, ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        serviceId,
        request.client_id,
        accessJti,
        c.req.header('cf-connecting-ip') || null,
        c.req.header('user-agent') || null
      )
      .run();

    console.log(`Token issued for service: ${serviceId}, client: ${request.client_id}`);

    return c.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      token_type: 'Bearer',
      scope: validatedScope.join(' '),
      issued_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error issuing token:', error);
    return errorResponse(c, 'internal_error', '토큰 발급 중 오류가 발생했습니다.', 500);
  }
});

// ============================================================================
// POST /mcp/auth/verify - 토큰 검증
// ============================================================================

auth.post('/verify', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json<VerifyRequest>();

  if (!body.token) {
    return errorResponse(c, 'invalid_payload', 'token이 필요합니다.', 400);
  }

  const jwtSecret = c.env.MCP_JWT_SECRET;
  if (!jwtSecret) {
    return errorResponse(c, 'configuration_error', 'JWT 시크릿이 설정되지 않았습니다.', 500);
  }

  const result = await verifyJWT(body.token, jwtSecret);

  if (!result.valid) {
    return c.json({
      valid: false,
      error: result.errorCode,
      error_description: result.error,
    }, 401);
  }

  const payload = result.payload!;

  // DB에서 토큰 폐기 여부 확인
  const tokenHash = await hashToken(body.token);
  const tokenRecord = await db
    .prepare('SELECT is_revoked FROM service_tokens WHERE token_hash = ?')
    .bind(tokenHash)
    .first<{ is_revoked: number }>();

  if (tokenRecord?.is_revoked) {
    return c.json({
      valid: false,
      error: 'token_revoked',
      error_description: '토큰이 폐기되었습니다.',
    }, 401);
  }

  // 필요 scope 확인
  if (body.required_scope && body.required_scope.length > 0) {
    const hasAllScopes = body.required_scope.every((s) => payload.scope.includes(s));
    if (!hasAllScopes) {
      return c.json({
        valid: false,
        error: 'insufficient_scope',
        error_description: '필요한 권한이 없습니다.',
      }, 403);
    }
  }

  const expiresAt = new Date(payload.exp * 1000);
  const remainingSeconds = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));

  return c.json({
    valid: true,
    service_id: payload.sub,
    scope: payload.scope,
    expires_at: expiresAt.toISOString(),
    remaining_seconds: remainingSeconds,
  });
});

// ============================================================================
// POST /mcp/auth/refresh - 토큰 갱신
// ============================================================================

auth.post('/refresh', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json<RefreshRequest>();

  if (body.grant_type !== 'refresh_token') {
    return errorResponse(c, 'unsupported_grant_type', 'refresh_token만 허용됩니다.', 400);
  }

  if (!body.refresh_token) {
    return errorResponse(c, 'invalid_payload', 'refresh_token이 필요합니다.', 400);
  }

  const tokenHash = await hashToken(body.refresh_token);
  const tokenRecord = await db
    .prepare(`
      SELECT * FROM service_tokens
      WHERE token_hash = ? AND token_type = 'refresh'
    `)
    .bind(tokenHash)
    .first<{
      id: string;
      service_id: string;
      client_id: string;
      scope: string;
      is_revoked: number;
      used: number;
      expires_at: string;
    }>();

  if (!tokenRecord) {
    return errorResponse(c, 'invalid_token', 'Refresh 토큰이 유효하지 않습니다.', 401);
  }

  if (tokenRecord.is_revoked) {
    return errorResponse(c, 'token_revoked', 'Refresh 토큰이 폐기되었습니다.', 401);
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return errorResponse(c, 'token_expired', 'Refresh 토큰이 만료되었습니다.', 401);
  }

  // Token Rotation: 이미 사용된 토큰인지 확인
  if (tokenRecord.used) {
    console.warn(`Refresh token reuse detected for service: ${tokenRecord.service_id}`);

    // 해당 서비스의 모든 토큰 폐기
    await db
      .prepare(`
        UPDATE service_tokens
        SET is_revoked = 1, revoked_at = datetime('now'), revoked_reason = 'refresh_token_reuse'
        WHERE service_id = ?
      `)
      .bind(tokenRecord.service_id)
      .run();

    return errorResponse(c, 'refresh_token_reuse', '보안 위협 감지: 모든 세션이 종료되었습니다.', 401);
  }

  try {
    // 기존 Refresh Token을 사용됨으로 표시
    await db
      .prepare("UPDATE service_tokens SET used = 1, used_at = datetime('now') WHERE id = ?")
      .bind(tokenRecord.id)
      .run();

    // 새 Access Token 생성
    const jwtSecret = c.env.MCP_JWT_SECRET;
    const scope = JSON.parse(tokenRecord.scope);
    const { token: accessToken, jti: accessJti, exp: accessExp } =
      await generateJWT(tokenRecord.service_id, tokenRecord.client_id, scope, jwtSecret);

    const accessTokenHash = await hashToken(accessToken);
    await db
      .prepare(`
        INSERT INTO service_tokens (id, service_id, client_id, token_hash, token_type, scope, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, 'access', ?, datetime(?, 'unixepoch'), ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        tokenRecord.service_id,
        tokenRecord.client_id,
        accessTokenHash,
        tokenRecord.scope,
        accessExp,
        c.req.header('cf-connecting-ip') || null,
        c.req.header('user-agent') || null
      )
      .run();

    // 새 Refresh Token 생성
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = await hashToken(newRefreshToken);
    const refreshExpiresAt = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY_SECONDS;

    await db
      .prepare(`
        INSERT INTO service_tokens (id, service_id, client_id, token_hash, token_type, scope, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, 'refresh', ?, datetime(?, 'unixepoch'), ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        tokenRecord.service_id,
        tokenRecord.client_id,
        newRefreshTokenHash,
        tokenRecord.scope,
        refreshExpiresAt,
        c.req.header('cf-connecting-ip') || null,
        c.req.header('user-agent') || null
      )
      .run();

    console.log(`Token refreshed for service: ${tokenRecord.service_id}`);

    return c.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      token_type: 'Bearer',
      issued_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return errorResponse(c, 'internal_error', '토큰 갱신 중 오류가 발생했습니다.', 500);
  }
});

// ============================================================================
// POST /mcp/auth/revoke - 토큰 폐기
// ============================================================================

auth.post('/revoke', async (c) => {
  const db = c.env.DB;

  // Authorization 헤더에서 토큰 추출
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(c, 'unauthorized', 'Authorization 헤더가 필요합니다.', 401);
  }

  const bearerToken = authHeader.substring(7);
  const jwtSecret = c.env.MCP_JWT_SECRET;
  const verifyResult = await verifyJWT(bearerToken, jwtSecret);

  if (!verifyResult.valid) {
    return errorResponse(c, 'unauthorized', '인증에 실패했습니다.', 401);
  }

  const body = await c.req.json<RevokeRequest>();

  if (!body.token) {
    return errorResponse(c, 'invalid_payload', 'token이 필요합니다.', 400);
  }

  try {
    const tokenHash = await hashToken(body.token);

    const result = await db
      .prepare(`
        UPDATE service_tokens
        SET is_revoked = 1, revoked_at = datetime('now'), revoked_reason = ?
        WHERE token_hash = ?
      `)
      .bind(body.reason || 'user_request', tokenHash)
      .run();

    console.log(`Token revoked, changes: ${result.meta.changes}`);

    return c.json({
      revoked: true,
      revoked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error revoking token:', error);
    return errorResponse(c, 'internal_error', '토큰 폐기 중 오류가 발생했습니다.', 500);
  }
});

export default auth;
