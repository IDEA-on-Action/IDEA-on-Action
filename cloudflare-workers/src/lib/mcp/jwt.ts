/**
 * MCP JWT 유틸리티
 * Cloudflare Workers용 JWT 생성/검증
 */

import {
  JWT_ISSUER,
  JWT_AUDIENCE,
  ACCESS_TOKEN_EXPIRY_SECONDS,
  VALID_SCOPES,
  type Scope,
} from './constants';

// ============================================================================
// 타입 정의
// ============================================================================

export interface JWTPayload {
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
  scope: string[];
  client_id: string;
}

export interface JWTVerifyResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  errorCode?: string;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * Base64URL 인코딩
 */
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64URL 디코딩
 */
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * HMAC-SHA256 서명 생성
 */
async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

/**
 * HMAC-SHA256 서명 검증
 */
async function hmacVerify(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSig = await hmacSign(data, secret);
  return signature === expectedSig;
}

// ============================================================================
// JWT 함수
// ============================================================================

/**
 * JWT 생성
 */
export async function generateJWT(
  serviceId: string,
  clientId: string,
  scope: string[],
  secret: string
): Promise<{ token: string; jti: string; exp: number }> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ACCESS_TOKEN_EXPIRY_SECONDS;
  const jti = crypto.randomUUID();

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JWTPayload = {
    iss: JWT_ISSUER,
    sub: serviceId,
    aud: JWT_AUDIENCE,
    iat: now,
    exp,
    jti,
    scope,
    client_id: clientId,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await hmacSign(`${headerB64}.${payloadB64}`, secret);

  return {
    token: `${headerB64}.${payloadB64}.${signature}`,
    jti,
    exp,
  };
}

/**
 * JWT 검증
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTVerifyResult> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: '유효하지 않은 토큰 형식입니다.', errorCode: 'token_invalid' };
    }

    const [headerB64, payloadB64, signature] = parts;

    // 서명 검증
    const isValidSig = await hmacVerify(`${headerB64}.${payloadB64}`, signature, secret);
    if (!isValidSig) {
      return { valid: false, error: '토큰 서명이 유효하지 않습니다.', errorCode: 'token_invalid' };
    }

    // 페이로드 디코딩
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload: JWTPayload = JSON.parse(payloadJson);

    // 만료 확인
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: '토큰이 만료되었습니다.', errorCode: 'token_expired' };
    }

    // 발급자 확인
    if (payload.iss !== JWT_ISSUER) {
      return { valid: false, error: '유효하지 않은 발급자입니다.', errorCode: 'token_invalid' };
    }

    // 대상 확인
    if (payload.aud !== JWT_AUDIENCE) {
      return { valid: false, error: '유효하지 않은 대상입니다.', errorCode: 'token_invalid' };
    }

    return { valid: true, payload };
  } catch (error) {
    console.error('JWT verification error:', error);
    return { valid: false, error: '토큰 검증에 실패했습니다.', errorCode: 'token_invalid' };
  }
}

/**
 * scope 검증
 */
export function validateScopes(scopes: string[]): Scope[] {
  return scopes.filter((s) => VALID_SCOPES.includes(s as Scope)) as Scope[];
}

/**
 * 필요한 scope 보유 확인
 */
export function hasRequiredScopes(payload: JWTPayload, required: string[]): boolean {
  return required.every((req) => payload.scope.includes(req));
}

/**
 * Refresh Token 생성
 */
export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'rt_' + Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 토큰 해시 생성 (SHA-256)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * HMAC-SHA256 서명 검증 (웹훅용)
 */
export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // timing-safe 비교
    const sig = signature.replace('sha256=', '').toLowerCase();
    const expected = expectedSignature.toLowerCase();

    if (sig.length !== expected.length) return false;

    let result = 0;
    for (let i = 0; i < sig.length; i++) {
      result |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * 타임스탬프 검증 (5분 이내)
 */
export function verifyTimestamp(timestamp: string, toleranceMs = 5 * 60 * 1000): boolean {
  try {
    const requestTime = new Date(timestamp).getTime();
    const now = Date.now();
    return Math.abs(now - requestTime) <= toleranceMs;
  } catch {
    return false;
  }
}
