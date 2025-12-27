/**
 * RFC 7807 Problem Details for HTTP APIs
 *
 * 표준화된 API 에러 응답을 생성하는 유틸리티 함수
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */

import { getCorsHeaders } from './cors.ts'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * RFC 7807 Problem Details
 */
export interface ProblemDetails {
  /** 에러 타입 URI (문제 해결 방법이 설명된 문서 URL) */
  type: string
  /** 에러 제목 (사람이 읽을 수 있는 짧은 요약) */
  title: string
  /** HTTP 상태 코드 */
  status: number
  /** 에러 상세 설명 (해당 오류 발생에 대한 구체적인 설명) */
  detail: string
  /** 요청 인스턴스 URI (문제가 발생한 특정 요청 식별) */
  instance: string
  /** 확장 필드 (문제별 추가 정보) */
  extensions?: Record<string, unknown>
}

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * API 에러 타입 URI
 */
export const API_ERROR_TYPES = {
  // 인증 관련
  UNAUTHORIZED: 'https://ideaonaction.ai/errors/unauthorized',
  TOKEN_EXPIRED: 'https://ideaonaction.ai/errors/token-expired',
  TOKEN_INVALID: 'https://ideaonaction.ai/errors/token-invalid',
  INSUFFICIENT_PERMISSIONS: 'https://ideaonaction.ai/errors/insufficient-permissions',

  // 구독 관련
  SUBSCRIPTION_EXPIRED: 'https://ideaonaction.ai/errors/subscription-expired',
  SUBSCRIPTION_INACTIVE: 'https://ideaonaction.ai/errors/subscription-inactive',
  SUBSCRIPTION_REQUIRED: 'https://ideaonaction.ai/errors/subscription-required',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'https://ideaonaction.ai/errors/rate-limit-exceeded',

  // 리소스 관련
  RESOURCE_NOT_FOUND: 'https://ideaonaction.ai/errors/resource-not-found',
  RESOURCE_CONFLICT: 'https://ideaonaction.ai/errors/resource-conflict',

  // 요청 검증
  INVALID_REQUEST: 'https://ideaonaction.ai/errors/invalid-request',
  VALIDATION_ERROR: 'https://ideaonaction.ai/errors/validation-error',

  // OAuth 관련
  INVALID_GRANT: 'https://ideaonaction.ai/errors/oauth/invalid-grant',
  INVALID_CLIENT: 'https://ideaonaction.ai/errors/oauth/invalid-client',
  UNSUPPORTED_GRANT_TYPE: 'https://ideaonaction.ai/errors/oauth/unsupported-grant-type',

  // 서버 에러
  INTERNAL_ERROR: 'https://ideaonaction.ai/errors/internal-error',
  SERVICE_UNAVAILABLE: 'https://ideaonaction.ai/errors/service-unavailable',
  DATABASE_ERROR: 'https://ideaonaction.ai/errors/database-error',
} as const

/**
 * 에러 타입별 기본 제목
 */
export const ERROR_TITLES: Record<string, string> = {
  [API_ERROR_TYPES.UNAUTHORIZED]: '인증 필요',
  [API_ERROR_TYPES.TOKEN_EXPIRED]: '토큰 만료',
  [API_ERROR_TYPES.TOKEN_INVALID]: '유효하지 않은 토큰',
  [API_ERROR_TYPES.INSUFFICIENT_PERMISSIONS]: '권한 부족',
  [API_ERROR_TYPES.SUBSCRIPTION_EXPIRED]: '구독 만료',
  [API_ERROR_TYPES.SUBSCRIPTION_INACTIVE]: '구독 비활성',
  [API_ERROR_TYPES.SUBSCRIPTION_REQUIRED]: '구독 필요',
  [API_ERROR_TYPES.RATE_LIMIT_EXCEEDED]: 'Rate Limit 초과',
  [API_ERROR_TYPES.RESOURCE_NOT_FOUND]: '리소스를 찾을 수 없음',
  [API_ERROR_TYPES.RESOURCE_CONFLICT]: '리소스 충돌',
  [API_ERROR_TYPES.INVALID_REQUEST]: '잘못된 요청',
  [API_ERROR_TYPES.VALIDATION_ERROR]: '유효성 검증 실패',
  [API_ERROR_TYPES.INVALID_GRANT]: '유효하지 않은 인가 코드',
  [API_ERROR_TYPES.INVALID_CLIENT]: '유효하지 않은 클라이언트',
  [API_ERROR_TYPES.UNSUPPORTED_GRANT_TYPE]: '지원하지 않는 Grant Type',
  [API_ERROR_TYPES.INTERNAL_ERROR]: '서버 내부 오류',
  [API_ERROR_TYPES.SERVICE_UNAVAILABLE]: '서비스 이용 불가',
  [API_ERROR_TYPES.DATABASE_ERROR]: '데이터베이스 오류',
}

/**
 * Content-Type
 */
export const CONTENT_TYPE_PROBLEM_JSON = 'application/problem+json'

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * RFC 7807 Problem Details 응답 생성
 *
 * @param type - 에러 타입 URI
 * @param title - 에러 제목
 * @param status - HTTP 상태 코드
 * @param detail - 에러 상세 설명
 * @param instance - 요청 인스턴스 URI
 * @param extensions - 확장 필드 (선택)
 * @param request - HTTP 요청 객체 (CORS 헤더 생성용, 선택)
 * @returns RFC 7807 Problem Details 응답
 */
export function createProblemResponse(
  type: string,
  title: string,
  status: number,
  detail: string,
  instance: string,
  extensions?: Record<string, unknown>,
  request?: Request
): Response {
  const problem: ProblemDetails = {
    type,
    title,
    status,
    detail,
    instance,
  }

  // 확장 필드가 있는 경우 병합
  if (extensions) {
    problem.extensions = extensions
  }

  // CORS 헤더 생성
  const origin = request?.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // 응답 생성
  return new Response(JSON.stringify(problem, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': CONTENT_TYPE_PROBLEM_JSON,
    },
  })
}

/**
 * 간편 에러 응답 생성
 *
 * 미리 정의된 에러 타입을 사용하여 빠르게 응답 생성
 *
 * @param errorType - API_ERROR_TYPES의 키
 * @param detail - 에러 상세 설명
 * @param instance - 요청 인스턴스 URI
 * @param status - HTTP 상태 코드 (선택, 에러 타입별 기본값 사용)
 * @param extensions - 확장 필드 (선택)
 * @param request - HTTP 요청 객체 (선택)
 * @returns RFC 7807 Problem Details 응답
 */
export function createErrorResponse(
  errorType: keyof typeof API_ERROR_TYPES,
  detail: string,
  instance: string,
  status?: number,
  extensions?: Record<string, unknown>,
  request?: Request
): Response {
  const type = API_ERROR_TYPES[errorType]
  const title = ERROR_TITLES[type] || 'API 에러'

  // 에러 타입별 기본 상태 코드
  const defaultStatus = getDefaultStatusCode(errorType)

  return createProblemResponse(
    type,
    title,
    status || defaultStatus,
    detail,
    instance,
    extensions,
    request
  )
}

/**
 * 에러 타입별 기본 HTTP 상태 코드 반환
 */
function getDefaultStatusCode(errorType: keyof typeof API_ERROR_TYPES): number {
  const statusMap: Record<string, number> = {
    UNAUTHORIZED: 401,
    TOKEN_EXPIRED: 401,
    TOKEN_INVALID: 401,
    INSUFFICIENT_PERMISSIONS: 403,
    SUBSCRIPTION_EXPIRED: 403,
    SUBSCRIPTION_INACTIVE: 403,
    SUBSCRIPTION_REQUIRED: 402,
    RATE_LIMIT_EXCEEDED: 429,
    RESOURCE_NOT_FOUND: 404,
    RESOURCE_CONFLICT: 409,
    INVALID_REQUEST: 400,
    VALIDATION_ERROR: 422,
    INVALID_GRANT: 400,
    INVALID_CLIENT: 401,
    UNSUPPORTED_GRANT_TYPE: 400,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    DATABASE_ERROR: 500,
  }

  return statusMap[errorType] || 500
}

/**
 * Rate Limit 에러 응답 생성
 *
 * @param detail - 에러 상세 설명
 * @param instance - 요청 인스턴스 URI
 * @param retryAfter - 재시도 가능 시간 (Unix timestamp)
 * @param limit - 요청 제한 (분당 요청 수)
 * @param current - 현재 사용량
 * @param resetAt - 리셋 시간 (Unix timestamp)
 * @param request - HTTP 요청 객체 (선택)
 * @returns RFC 7807 Problem Details 응답
 */
export function createRateLimitResponse(
  detail: string,
  instance: string,
  retryAfter: number,
  limit: number,
  current: number,
  resetAt: number,
  request?: Request
): Response {
  return createErrorResponse(
    'RATE_LIMIT_EXCEEDED',
    detail,
    instance,
    429,
    {
      retry_after: retryAfter,
      limit,
      current,
      reset_at: resetAt,
    },
    request
  )
}

/**
 * Validation 에러 응답 생성
 *
 * @param detail - 에러 상세 설명
 * @param instance - 요청 인스턴스 URI
 * @param errors - 유효성 검증 실패 필드 목록
 * @param request - HTTP 요청 객체 (선택)
 * @returns RFC 7807 Problem Details 응답
 */
export function createValidationErrorResponse(
  detail: string,
  instance: string,
  errors: Array<{ field: string; code: string; message: string }>,
  request?: Request
): Response {
  return createErrorResponse(
    'VALIDATION_ERROR',
    detail,
    instance,
    422,
    {
      errors,
    },
    request
  )
}
