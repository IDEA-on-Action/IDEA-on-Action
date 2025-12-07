/**
 * JWT 토큰 생성 및 검증 유틸리티
 *
 * jose 라이브러리를 사용한 JWT 토큰 관리
 * - Access Token: 1시간 만료
 * - Refresh Token: 7일 만료
 *
 * @module lib/auth/jwt
 */

import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import type { JWTPayload } from '@/types/mcp-auth.types';

// ============================================================================
// 상수
// ============================================================================

/** JWT Secret Key (환경 변수에서 로드, 없으면 기본값) */
const JWT_SECRET =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JWT_SECRET) ||
  'default-secret-key-change-in-production';

/** JWT Issuer */
const JWT_ISSUER =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JWT_ISSUER) ||
  'https://www.ideaonaction.ai';

/** Access Token 기본 만료 시간 (초) */
const ACCESS_TOKEN_EXPIRES_IN = 60 * 60; // 1시간

/** Refresh Token 기본 만료 시간 (초) */
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7일

/** Secret을 Uint8Array로 변환 */
function getSecretKey(): Uint8Array {
  // jsdom 환경에서는 Buffer 사용
  if (typeof Buffer !== 'undefined' && typeof process !== 'undefined') {
    return new Uint8Array(Buffer.from(JWT_SECRET, 'utf-8'));
  }
  // 브라우저 환경에서는 TextEncoder 사용
  return new TextEncoder().encode(JWT_SECRET);
}

const SECRET_KEY = getSecretKey();

// ============================================================================
// 타입
// ============================================================================

/**
 * JWT 생성 페이로드 (필수 필드)
 */
export interface JWTGeneratePayload {
  /** Subject (User ID) */
  sub: string;

  /** Audience (Client ID) */
  aud: string;

  /** Scope (OAuth 2.0) */
  scope?: string;

  /** Session ID (for refresh token) */
  sid?: string;

  /** JWT ID (Unique identifier for token) */
  jti?: string;

  /** User Email */
  email?: string;

  /** User Name */
  name?: string;

  /** User Avatar URL */
  picture?: string;

  /** Custom Claims */
  [key: string]: unknown;
}

// ============================================================================
// JWT 생성 함수
// ============================================================================

/**
 * Access Token 생성
 *
 * @param payload JWT 페이로드 (sub, aud 필수)
 * @param expiresIn 만료 시간 (초, 기본 1시간)
 * @returns JWT 토큰 문자열
 *
 * @example
 * ```ts
 * const token = await generateAccessToken({
 *   sub: 'user-uuid',
 *   aud: 'minu-find-sandbox',
 *   scope: 'openid profile',
 *   jti: 'token-uuid',
 * });
 * ```
 */
export async function generateAccessToken(
  payload: JWTGeneratePayload,
  expiresIn: number = ACCESS_TOKEN_EXPIRES_IN
): Promise<string> {
  // jose의 SignJWT는 페이로드를 자동으로 처리하므로 별도 변환 불필요
  const jwt = new SignJWT({
    scope: payload.scope || 'openid',
    sid: payload.sid,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  });

  const token = await jwt
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setSubject(payload.sub)
    .setAudience(payload.aud)
    .setJti(payload.jti || '')
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(SECRET_KEY);

  return token;
}

/**
 * Refresh Token 생성
 *
 * @param payload JWT 페이로드 (sub, aud, sid 필수)
 * @returns JWT 토큰 문자열
 *
 * @example
 * ```ts
 * const refreshToken = await generateRefreshToken({
 *   sub: 'user-uuid',
 *   aud: 'minu-find-sandbox',
 *   sid: 'session-uuid',
 *   jti: 'refresh-token-uuid',
 * });
 * ```
 */
export async function generateRefreshToken(payload: JWTGeneratePayload): Promise<string> {
  const jwt = new SignJWT({
    scope: payload.scope || 'offline_access',
    sid: payload.sid,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  });

  const token = await jwt
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setSubject(payload.sub)
    .setAudience(payload.aud)
    .setJti(payload.jti || '')
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_EXPIRES_IN}s`)
    .sign(SECRET_KEY);

  return token;
}

// ============================================================================
// JWT 검증 함수
// ============================================================================

/**
 * JWT 토큰 검증 (서명 + 만료 확인)
 *
 * @param token JWT 토큰 문자열
 * @returns 검증된 페이로드 또는 null (검증 실패 시)
 *
 * @example
 * ```ts
 * const payload = await verifyToken(accessToken);
 * if (payload) {
 *   console.log('User ID:', payload.sub);
 * }
 * ```
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      issuer: JWT_ISSUER,
    });

    return payload as JWTPayload;
  } catch (error) {
    // 만료, 서명 오류 등
    console.error('[JWT] Token verification failed:', error);
    return null;
  }
}

// ============================================================================
// JWT 디코딩 함수
// ============================================================================

/**
 * JWT 토큰 디코딩 (검증 없이 페이로드만 추출)
 *
 * ⚠️ 주의: 이 함수는 토큰을 검증하지 않습니다!
 * 서명이나 만료를 확인하지 않고 페이로드만 파싱합니다.
 * 보안이 중요한 경우 verifyToken()을 사용하세요.
 *
 * @param token JWT 토큰 문자열
 * @returns 디코딩된 페이로드 또는 null (디코딩 실패 시)
 *
 * @example
 * ```ts
 * const payload = decodeToken(token);
 * if (payload) {
 *   console.log('Token expires at:', new Date(payload.exp * 1000));
 * }
 * ```
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const payload = decodeJwt(token);
    return payload as JWTPayload;
  } catch (error) {
    console.error('[JWT] Token decoding failed:', error);
    return null;
  }
}

// ============================================================================
// JWT 유틸리티 함수
// ============================================================================

/**
 * JWT 토큰 만료 여부 확인 (검증 없이 exp claim만 확인)
 *
 * @param token JWT 토큰 문자열
 * @returns 만료 여부 (true: 만료됨, false: 유효함, null: 디코딩 실패)
 *
 * @example
 * ```ts
 * if (isTokenExpired(token)) {
 *   console.log('Token expired, need refresh');
 * }
 * ```
 */
export function isTokenExpired(token: string): boolean | null {
  const payload = decodeToken(token);

  if (!payload || !payload.exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * JWT 토큰 만료까지 남은 시간 (초)
 *
 * @param token JWT 토큰 문자열
 * @returns 남은 시간 (초) 또는 null (디코딩 실패/만료됨)
 *
 * @example
 * ```ts
 * const remaining = getRemainingTime(token);
 * if (remaining && remaining < 300) {
 *   console.log('Token expires in 5 minutes, refresh needed');
 * }
 * ```
 */
export function getRemainingTime(token: string): number | null {
  const payload = decodeToken(token);

  if (!payload || !payload.exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - now;

  return remaining > 0 ? remaining : null;
}

/**
 * JWT 토큰에서 사용자 정보 추출
 *
 * @param token JWT 토큰 문자열
 * @returns 사용자 정보 객체 또는 null
 *
 * @example
 * ```ts
 * const userInfo = extractUserInfo(token);
 * if (userInfo) {
 *   console.log('User:', userInfo.email);
 * }
 * ```
 */
export function extractUserInfo(token: string): {
  userId: string;
  email?: string;
  name?: string;
  picture?: string;
} | null {
  const payload = decodeToken(token);

  if (!payload || !payload.sub) {
    return null;
  }

  return {
    userId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}
