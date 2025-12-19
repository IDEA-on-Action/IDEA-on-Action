/**
 * Minu 서비스 타입 정의
 *
 * Minu 서비스 연동에 필요한 타입을 정의합니다.
 *
 * @version 1.0.0
 */

// ============================================================================
// 기본 타입
// ============================================================================

/** Minu 서비스 타입 */
export type MinuService = 'find' | 'frame' | 'build' | 'keep'

/** Minu 서비스 URL 매핑 */
export const MINU_SERVICE_URLS: Record<MinuService, string> = {
  find: 'https://find.minu.best',
  frame: 'https://frame.minu.best',
  build: 'https://build.minu.best',
  keep: 'https://keep.minu.best',
}

/** Minu 서비스 개발 URL 매핑 */
export const MINU_SERVICE_URLS_DEV: Record<MinuService, string> = {
  find: 'http://localhost:5001',
  frame: 'http://localhost:5002',
  build: 'http://localhost:5003',
  keep: 'http://localhost:5004',
}

// ============================================================================
// OAuth 관련 타입
// ============================================================================

/** OAuth 콜백 쿼리 파라미터 */
export interface MinuOAuthCallbackParams {
  /** Authorization Code */
  code?: string
  /** CSRF state (base64 인코딩된 JSON) */
  state?: string
  /** OAuth 에러 코드 */
  error?: string
  /** OAuth 에러 설명 */
  error_description?: string
}

/** State 디코딩 결과 */
export interface MinuOAuthState {
  /** CSRF 토큰 */
  csrf: string
  /** 리다이렉트 URI */
  redirect_uri: string
  /** 서비스 타입 */
  service: MinuService
  /** 사용자 ID (선택) */
  user_id?: string
}

/** OAuth 세션 정보 */
export interface MinuOAuthSession {
  id: string
  user_id: string | null
  service: MinuService
  state: string
  code_verifier: string
  redirect_uri: string
  created_at: string
  expires_at: string
  used_at: string | null
}

// ============================================================================
// 토큰 관련 타입
// ============================================================================

/** 토큰 교환 요청 */
export interface MinuTokenExchangeRequest {
  /** Minu Access Token */
  minu_access_token: string
  /** 서비스 타입 */
  service: MinuService
}

/** 토큰 교환 응답 */
export interface MinuTokenExchangeResponse {
  /** Central Hub Access Token */
  access_token: string
  /** 토큰 타입 */
  token_type: 'Bearer'
  /** 만료 시간 (초) */
  expires_in: number
  /** Refresh Token */
  refresh_token: string
  /** 사용자 정보 */
  user: MinuUserInfo
  /** 구독 정보 */
  subscription: MinuSubscriptionInfo | null
}

/** Minu 토큰 응답 (Minu API에서 받는 형식) */
export interface MinuTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

// ============================================================================
// 사용자 관련 타입
// ============================================================================

/** Minu 사용자 정보 */
export interface MinuUserInfo {
  /** 사용자 ID */
  id: string
  /** 이메일 */
  email: string
  /** 이름 */
  name?: string
  /** 프로필 이미지 */
  avatar_url?: string
  /** 조직 */
  organization?: string
  /** 생성일 */
  created_at?: string
}

/** Minu userinfo 엔드포인트 응답 */
export interface MinuUserInfoResponse {
  sub: string
  email: string
  name?: string
  picture?: string
  organization?: string
}

// ============================================================================
// 구독 관련 타입
// ============================================================================

/** Minu 구독 정보 */
export interface MinuSubscriptionInfo {
  /** 구독 ID */
  id?: string
  /** 플랜 ID */
  plan_id: string
  /** 플랜 이름 */
  plan_name: string
  /** 상태 */
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing'
  /** 현재 기간 시작 */
  current_period_start?: string
  /** 현재 기간 종료 */
  current_period_end?: string
  /** 체험 종료 */
  trial_end?: string
  /** 활성화된 기능 */
  features: string[]
  /** 사용 제한 */
  limits: MinuSubscriptionLimits
}

/** 구독 제한 정보 */
export interface MinuSubscriptionLimits {
  /** 월간 검색 횟수 */
  search_count?: number
  /** 연결 가능 플랫폼 수 */
  platforms?: number
  /** AI 분석 사용 가능 여부 */
  ai_analysis?: boolean
  /** 히스토리 보관 기간 (개월) */
  history_months?: number
  /** 팀원 수 */
  team_members?: number
  /** API 호출 제한 (분당) */
  api_rate_limit?: number
}

// ============================================================================
// 웹훅 관련 타입
// ============================================================================

/** 웹훅 이벤트 타입 */
export type MinuWebhookEventType =
  // 구독 이벤트
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'subscription.expired'
  // 결제 이벤트
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  // 사용량 이벤트
  | 'usage.limit_reached'
  | 'usage.warning'
  // 사용자 이벤트
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'

/** 웹훅 이벤트 */
export interface MinuWebhookEvent {
  /** 이벤트 ID */
  id: string
  /** 이벤트 타입 */
  type: MinuWebhookEventType
  /** 서비스 */
  service: MinuService
  /** 발생 시간 */
  timestamp: string
  /** 데이터 */
  data: MinuWebhookEventData
}

/** 웹훅 이벤트 데이터 (타입별) */
export type MinuWebhookEventData =
  | MinuSubscriptionEventData
  | MinuPaymentEventData
  | MinuUsageEventData
  | MinuUserEventData

/** 구독 이벤트 데이터 */
export interface MinuSubscriptionEventData {
  /** 사용자 ID */
  user_id: string
  /** 구독 ID */
  subscription_id: string
  /** 플랜 ID */
  plan_id: string
  /** 플랜 이름 */
  plan_name: string
  /** 상태 */
  status: string
  /** 이전 상태 */
  previous_status?: string
  /** 취소 사유 */
  cancellation_reason?: string
}

/** 결제 이벤트 데이터 */
export interface MinuPaymentEventData {
  /** 사용자 ID */
  user_id: string
  /** 결제 ID */
  payment_id: string
  /** 금액 */
  amount: number
  /** 통화 */
  currency: string
  /** 상태 */
  status: string
  /** 실패 사유 */
  failure_reason?: string
}

/** 사용량 이벤트 데이터 */
export interface MinuUsageEventData {
  /** 사용자 ID */
  user_id: string
  /** 사용량 타입 */
  usage_type: string
  /** 현재 사용량 */
  current: number
  /** 제한 */
  limit: number
  /** 퍼센트 */
  percentage: number
}

/** 사용자 이벤트 데이터 */
export interface MinuUserEventData {
  /** 사용자 ID */
  user_id: string
  /** 이메일 */
  email: string
  /** 변경된 필드 */
  changed_fields?: string[]
}

// ============================================================================
// 에러 타입
// ============================================================================

/** Minu API 에러 */
export interface MinuApiError {
  /** 에러 코드 */
  code: string
  /** 에러 메시지 */
  message: string
  /** 상세 정보 */
  details?: Record<string, unknown>
}

/** Minu 에러 코드 */
export const MinuErrorCodes = {
  INVALID_TOKEN: 'MINU_INVALID_TOKEN',
  TOKEN_EXPIRED: 'MINU_TOKEN_EXPIRED',
  INVALID_SERVICE: 'MINU_INVALID_SERVICE',
  SUBSCRIPTION_NOT_FOUND: 'MINU_SUBSCRIPTION_NOT_FOUND',
  USER_NOT_FOUND: 'MINU_USER_NOT_FOUND',
  WEBHOOK_INVALID_SIGNATURE: 'MINU_WEBHOOK_INVALID_SIGNATURE',
  API_ERROR: 'MINU_API_ERROR',
  NETWORK_ERROR: 'MINU_NETWORK_ERROR',
} as const

export type MinuErrorCode = (typeof MinuErrorCodes)[keyof typeof MinuErrorCodes]
