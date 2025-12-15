/**
 * JWT 검증 유틸리티
 *
 * mcp-auth에서 발급한 JWT 토큰을 검증합니다.
 *
 * @see supabase/functions/mcp-auth/index.ts
 */

import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts'

// JWT 발급자 정보 (mcp-auth와 동일해야 함)
const JWT_ISSUER = 'mcp-auth'
const JWT_AUDIENCE = 'central-hub'

/**
 * JWT 페이로드 타입
 */
export interface JWTPayload {
  /** 발급자 */
  iss: string
  /** 주체 (service_id) */
  sub: string
  /** 대상 */
  aud: string
  /** 발급 시간 */
  iat: number
  /** 만료 시간 */
  exp: number
  /** 토큰 ID */
  jti: string
  /** 권한 범위 */
  scope: string[]
  /** 클라이언트 ID */
  client_id: string
}

/**
 * JWT 검증 결과
 */
export interface JWTVerifyResult {
  valid: boolean
  payload?: JWTPayload
  error?: string
  errorCode?: 'token_expired' | 'token_invalid' | 'config_error' | 'verification_failed'
}

/**
 * JWT 토큰 검증
 *
 * @param token - 검증할 JWT 토큰
 * @returns 검증 결과
 */
export async function verifyJWTToken(token: string): Promise<JWTVerifyResult> {
  const secret = Deno.env.get('MCP_JWT_SECRET')

  if (!secret) {
    console.error('MCP_JWT_SECRET 환경 변수가 설정되지 않았습니다.')
    return {
      valid: false,
      error: 'JWT secret not configured',
      errorCode: 'config_error',
    }
  }

  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jose.jwtVerify(token, secretKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })

    return {
      valid: true,
      payload: payload as unknown as JWTPayload,
    }
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return {
        valid: false,
        error: '토큰이 만료되었습니다.',
        errorCode: 'token_expired',
      }
    }

    if (error instanceof jose.errors.JWTInvalid) {
      return {
        valid: false,
        error: '유효하지 않은 토큰입니다.',
        errorCode: 'token_invalid',
      }
    }

    console.error('JWT verification error:', error)
    return {
      valid: false,
      error: '토큰 검증에 실패했습니다.',
      errorCode: 'verification_failed',
    }
  }
}

/**
 * 필요한 scope가 있는지 확인
 *
 * @param payload - JWT 페이로드
 * @param requiredScopes - 필요한 scope 목록
 * @returns 모든 필요한 scope가 있으면 true
 */
export function hasRequiredScopes(
  payload: JWTPayload,
  requiredScopes: string[]
): boolean {
  if (!payload.scope || !Array.isArray(payload.scope)) {
    return false
  }

  return requiredScopes.every(required => payload.scope.includes(required))
}
