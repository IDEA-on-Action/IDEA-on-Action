/**
 * API Common Types
 *
 * API 표준화를 위한 공통 타입 정의
 * RFC 7807 (Problem Details for HTTP APIs) 준수
 *
 * @module types/api
 */

// ============================================================================
// API Version Management
// ============================================================================

/**
 * API 버전
 */
export type ApiVersion = 'v1' | 'v2'

/**
 * API 버전 헤더
 */
export const API_VERSION_HEADER = 'X-API-Version'

// ============================================================================
// RFC 7807 Problem Details
// ============================================================================

/**
 * RFC 7807 Problem Details
 *
 * HTTP API 에러 응답 표준 포맷
 * @see https://datatracker.ietf.org/doc/html/rfc7807
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
// API Error Types
// ============================================================================

/**
 * API 에러 타입 URI
 *
 * 각 에러는 문서화된 URI로 식별되며, 클라이언트는 이를 통해 에러 처리 방법을 확인할 수 있습니다.
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

  // 서버 에러
  INTERNAL_ERROR: 'https://ideaonaction.ai/errors/internal-error',
  SERVICE_UNAVAILABLE: 'https://ideaonaction.ai/errors/service-unavailable',
  DATABASE_ERROR: 'https://ideaonaction.ai/errors/database-error',
} as const

/**
 * Rate Limit 초과 에러 확장 필드
 */
export interface RateLimitExtensions {
  /** 재시도 가능 시간 (Unix timestamp) */
  retry_after: number
  /** 요청 제한 (분당 요청 수) */
  limit: number
  /** 현재 사용량 */
  current: number
  /** 리셋 시간 (Unix timestamp) */
  reset_at: number
}

/**
 * Validation 에러 확장 필드
 */
export interface ValidationExtensions {
  /** 유효성 검증 실패 필드 목록 */
  errors: Array<{
    /** 필드 경로 (예: "user.email") */
    field: string
    /** 에러 코드 */
    code: string
    /** 에러 메시지 */
    message: string
  }>
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * 컴포넌트 상태
 */
export type ComponentStatus = 'healthy' | 'degraded' | 'unhealthy'

/**
 * 전체 시스템 상태
 */
export type SystemStatus = 'healthy' | 'degraded' | 'unhealthy'

/**
 * 컴포넌트 헬스 정보
 */
export interface ComponentHealth {
  /** 컴포넌트 상태 */
  status: ComponentStatus
  /** 응답 시간 (밀리초) */
  latency_ms?: number
  /** 상태 메시지 */
  message?: string
  /** 추가 정보 */
  metadata?: Record<string, unknown>
}

/**
 * 헬스체크 응답
 *
 * 시스템 전체 상태와 각 컴포넌트 상태를 포함합니다.
 */
export interface HealthCheckResponse {
  /** 전체 시스템 상태 */
  status: SystemStatus
  /** API 버전 */
  version: string
  /** 체크 시간 (ISO 8601) */
  timestamp: string
  /** 컴포넌트별 상태 */
  components?: Record<string, ComponentHealth>
  /** 전체 응답 시간 (밀리초) */
  response_time_ms?: number
}

// ============================================================================
// Pagination
// ============================================================================

/**
 * 페이지네이션 파라미터
 */
export interface PaginationParams {
  /** 페이지 번호 (1부터 시작) */
  page?: number
  /** 페이지당 항목 수 */
  limit?: number
  /** 정렬 필드 */
  sort_by?: string
  /** 정렬 방향 */
  sort_order?: 'asc' | 'desc'
}

/**
 * 페이지네이션 메타데이터
 */
export interface PaginationMeta {
  /** 현재 페이지 */
  current_page: number
  /** 페이지당 항목 수 */
  per_page: number
  /** 전체 항목 수 */
  total_count: number
  /** 전체 페이지 수 */
  total_pages: number
  /** 이전 페이지 존재 여부 */
  has_previous: boolean
  /** 다음 페이지 존재 여부 */
  has_next: boolean
}

/**
 * 페이지네이션 응답
 */
export interface PaginatedResponse<T> {
  /** 데이터 배열 */
  data: T[]
  /** 페이지네이션 메타데이터 */
  meta: PaginationMeta
}

// ============================================================================
// API Response Wrappers
// ============================================================================

/**
 * 성공 응답 래퍼
 */
export interface ApiSuccessResponse<T> {
  /** 성공 여부 */
  success: true
  /** 응답 데이터 */
  data: T
  /** 메타데이터 (선택) */
  meta?: Record<string, unknown>
}

/**
 * 에러 응답 래퍼
 */
export interface ApiErrorResponse {
  /** 성공 여부 */
  success: false
  /** RFC 7807 Problem Details */
  error: ProblemDetails
}

/**
 * API 응답 (성공 또는 에러)
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// ============================================================================
// Constants
// ============================================================================

/**
 * 기본 페이지네이션 설정
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const

/**
 * Content-Type 헤더
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  PROBLEM_JSON: 'application/problem+json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
} as const

/**
 * HTTP 상태 코드 (자주 사용하는 것만)
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const
