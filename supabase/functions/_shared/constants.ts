/**
 * 공유 상수 정의
 *
 * Edge Functions 전체에서 사용되는 상수를 중앙 관리합니다.
 *
 * @version 1.0.0
 */

// ============================================================================
// JWT 설정
// ============================================================================

/** JWT 발급자 */
export const JWT_ISSUER = 'mcp-auth'

/** JWT 대상 */
export const JWT_AUDIENCE = 'central-hub'

/** Access Token 만료 시간 (15분) */
export const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60

/** Refresh Token 만료 시간 (7일) */
export const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60

// ============================================================================
// 보안 설정
// ============================================================================

/** 타임스탬프 유효 기간 (5분) */
export const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000

// ============================================================================
// 서비스 ID
// ============================================================================

/** 유효한 서비스 ID 목록 */
export const VALID_SERVICE_IDS = [
  'minu-find',
  'minu-frame',
  'minu-build',
  'minu-keep',
  'minu-portal',
] as const

/** 서비스 ID 타입 */
export type ServiceId = (typeof VALID_SERVICE_IDS)[number]

// ============================================================================
// Scope
// ============================================================================

/** 유효한 scope 목록 */
export const VALID_SCOPES = [
  'events:read',
  'events:write',
  'health:read',
  'health:write',
  'sync:read',
  'sync:write',
] as const

/** Scope 타입 */
export type Scope = (typeof VALID_SCOPES)[number]

// ============================================================================
// 환경
// ============================================================================

/** 환경 목록 */
export const ENVIRONMENTS = ['development', 'staging', 'production'] as const

/** 환경 타입 */
export type Environment = (typeof ENVIRONMENTS)[number]
