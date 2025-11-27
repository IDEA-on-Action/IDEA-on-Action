/**
 * Minu Integration Types
 *
 * Minu 서비스 통합 및 SSO 관련 타입 정의
 *
 * @module types/minu-integration
 */

import type { SubscriptionStatus } from './subscription.types'
import type { PlanFeature, FeatureKey } from './subscription-usage.types'
import type { OAuthScope } from './oauth.types'

// ============================================================================
// Service Definitions
// ============================================================================

/**
 * Minu 서비스 타입
 */
export type MinuService =
  | 'find'   // Minu Find (시장 분석)
  | 'frame'  // Minu Frame (문서 생성)
  | 'build'  // Minu Build (프로젝트 관리)
  | 'keep'   // Minu Keep (운영/모니터링)

/**
 * Minu 서비스 도메인 매핑
 *
 * 프로덕션 환경 도메인 설정
 */
export const MINU_DOMAINS: Record<MinuService, string> = {
  find: 'find.minu.best',
  frame: 'frame.minu.best',
  build: 'build.minu.best',
  keep: 'keep.minu.best',
}

/**
 * Minu 서비스 개발 도메인 매핑
 *
 * 로컬/스테이징 환경에서 사용
 */
export const MINU_DOMAINS_DEV: Record<MinuService, string> = {
  find: 'localhost:5001',
  frame: 'localhost:5002',
  build: 'localhost:5003',
  keep: 'localhost:5004',
}

/**
 * Minu 서비스 이름 (한글)
 */
export const MINU_SERVICE_NAMES: Record<MinuService, string> = {
  find: 'Minu Find',
  frame: 'Minu Frame',
  build: 'Minu Build',
  keep: 'Minu Keep',
}

/**
 * Minu 서비스 설명
 */
export const MINU_SERVICE_DESCRIPTIONS: Record<MinuService, string> = {
  find: '시장 분석 및 사업 기회 탐색',
  frame: '문서 생성 및 RFP 작성',
  build: '프로젝트 관리 및 협업',
  keep: '운영 모니터링 및 유지보수',
}

/**
 * Minu 서비스 아이콘 (Emoji)
 */
export const MINU_SERVICE_ICONS: Record<MinuService, string> = {
  find: '🔍',
  frame: '📝',
  build: '🏗️',
  keep: '🛡️',
}

/**
 * Minu 서비스 색상 (Tailwind CSS)
 */
export const MINU_SERVICE_COLORS: Record<MinuService, string> = {
  find: 'blue',
  frame: 'green',
  build: 'purple',
  keep: 'orange',
}

// ============================================================================
// SSO Types
// ============================================================================

/**
 * SSO 인증 상태
 */
export interface SSOState {
  /** 인증 여부 */
  isAuthenticated: boolean
  /** 사용자 정보 */
  user: MinuUser | null
  /** 구독 정보 */
  subscription: MinuSubscription | null
  /** 액세스 토큰 (JWT) */
  accessToken: string | null
  /** 토큰 만료 타임스탬프 (Unix epoch) */
  expiresAt: number | null
}

/**
 * Minu 사용자 정보
 *
 * SSO 로그인 후 공유되는 사용자 데이터
 */
export interface MinuUser {
  /** 사용자 ID (Supabase Auth) */
  id: string
  /** 이메일 */
  email: string
  /** 이름 */
  full_name: string
  /** 프로필 이미지 URL */
  avatar_url: string | null
  /** 조직 ID (선택) */
  organization_id?: string | null
  /** 조직 이름 (선택) */
  organization_name?: string | null
}

/**
 * Minu 구독 정보
 *
 * SSO 로그인 후 공유되는 구독 데이터
 */
export interface MinuSubscription {
  /** 플랜 ID */
  plan_id: string
  /** 플랜 이름 */
  plan_name: string
  /** 구독 상태 */
  status: SubscriptionStatus
  /** 현재 주기 종료일 (ISO 8601) */
  current_period_end: string
  /** 플랜 기능 목록 */
  features: PlanFeature[]
}

/**
 * SSO 로그인 요청
 */
export interface SSOLoginRequest {
  /** 대상 서비스 */
  service: MinuService
  /** 리디렉션 URI (로그인 후 돌아올 URL) */
  redirect_uri?: string
  /** CSRF 방지용 상태값 */
  state?: string
}

/**
 * SSO 로그인 응답
 */
export interface SSOLoginResponse {
  /** 인가 URL (사용자가 방문할 URL) */
  authorization_url: string
  /** 상태값 (CSRF 검증용) */
  state: string
}

/**
 * SSO 콜백 처리 요청
 */
export interface SSOCallbackRequest {
  /** 인가 코드 */
  code: string
  /** 상태값 (CSRF 검증용) */
  state: string
}

/**
 * SSO 콜백 처리 응답
 */
export interface SSOCallbackResponse {
  /** 액세스 토큰 */
  access_token: string
  /** 리프레시 토큰 */
  refresh_token: string
  /** 토큰 만료 시간 (초) */
  expires_in: number
  /** 사용자 정보 */
  user: MinuUser
  /** 구독 정보 */
  subscription: MinuSubscription
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * 웹훅 이벤트 타입
 *
 * Minu 서비스에서 발생하는 이벤트
 */
export type WebhookEventType =
  // 구독 관련
  | 'subscription.created'     // 구독 생성
  | 'subscription.updated'     // 구독 업데이트
  | 'subscription.cancelled'   // 구독 취소
  | 'subscription.expired'     // 구독 만료
  | 'subscription.suspended'   // 구독 정지
  // 결제 관련
  | 'payment.success'          // 결제 성공
  | 'payment.failed'           // 결제 실패
  | 'payment.refunded'         // 환불 완료
  // 사용량 관련
  | 'usage.limit_reached'      // 사용량 한도 도달
  | 'usage.limit_exceeded'     // 사용량 한도 초과
  | 'usage.reset'              // 사용량 초기화
  // 사용자 관련
  | 'user.updated'             // 사용자 정보 업데이트
  | 'user.deleted'             // 사용자 삭제
  // 기능 관련
  | 'feature.enabled'          // 기능 활성화
  | 'feature.disabled'         // 기능 비활성화

/**
 * 웹훅 페이로드
 *
 * Minu 서비스에서 전송하는 웹훅 데이터
 */
export interface WebhookPayload {
  /** 이벤트 타입 */
  event_type: WebhookEventType
  /** 발생 타임스탬프 (ISO 8601) */
  timestamp: string
  /** 이벤트 데이터 */
  data: Record<string, unknown>
  /** HMAC 서명 (검증용) */
  signature: string
  /** 이벤트 ID (중복 방지) */
  event_id: string
  /** 재시도 횟수 */
  retry_count?: number
}

/**
 * 구독 이벤트 데이터
 */
export interface SubscriptionEventData {
  /** 구독 ID */
  subscription_id: string
  /** 사용자 ID */
  user_id: string
  /** 플랜 ID */
  plan_id: string
  /** 플랜 이름 */
  plan_name: string
  /** 구독 상태 */
  status: SubscriptionStatus
  /** 이전 상태 (업데이트 시) */
  previous_status?: SubscriptionStatus
  /** 현재 주기 시작일 */
  current_period_start: string
  /** 현재 주기 종료일 */
  current_period_end: string
}

/**
 * 결제 이벤트 데이터
 */
export interface PaymentEventData {
  /** 결제 ID */
  payment_id: string
  /** 구독 ID */
  subscription_id: string
  /** 사용자 ID */
  user_id: string
  /** 결제 금액 */
  amount: number
  /** 통화 (KRW 고정) */
  currency: 'KRW'
  /** 결제 방법 */
  payment_method: string
  /** 결제 상태 */
  status: 'success' | 'failed' | 'refunded'
  /** 실패 사유 (실패 시) */
  failure_reason?: string
  /** 결제 일시 */
  paid_at: string
}

/**
 * 사용량 이벤트 데이터
 */
export interface UsageEventData {
  /** 구독 ID */
  subscription_id: string
  /** 사용자 ID */
  user_id: string
  /** 기능 키 */
  feature_key: FeatureKey
  /** 현재 사용량 */
  current_usage: number
  /** 제한값 */
  limit_value: number | null
  /** 사용률 (0~1) */
  usage_rate: number
  /** 초과 여부 */
  is_exceeded: boolean
}

/**
 * 웹훅 검증 결과
 */
export interface WebhookVerificationResult {
  /** 검증 성공 여부 */
  valid: boolean
  /** 에러 메시지 (실패 시) */
  error?: string
  /** 디코딩된 페이로드 (성공 시) */
  payload?: WebhookPayload
}

// ============================================================================
// Service Communication Types
// ============================================================================

/**
 * 서비스 간 통신 요청
 */
export interface ServiceToServiceRequest {
  /** 요청 ID (추적용) */
  request_id: string
  /** 출처 서비스 */
  source_service: MinuService
  /** 대상 서비스 */
  target_service: MinuService
  /** 액션 */
  action: string
  /** 페이로드 */
  payload: Record<string, unknown>
  /** 타임스탬프 */
  timestamp: string
  /** 서명 */
  signature: string
}

/**
 * 서비스 간 통신 응답
 */
export interface ServiceToServiceResponse {
  /** 요청 ID */
  request_id: string
  /** 성공 여부 */
  success: boolean
  /** 응답 데이터 */
  data?: Record<string, unknown>
  /** 에러 메시지 */
  error?: string
  /** 타임스탬프 */
  timestamp: string
}

// ============================================================================
// Feature Flag Types
// ============================================================================

/**
 * 기능 플래그 (Feature Flag)
 *
 * 서비스별 기능 활성화 여부 제어
 */
export interface FeatureFlag {
  /** 플래그 ID */
  id: string
  /** 플래그 키 */
  key: string
  /** 설명 */
  description: string
  /** 활성화 여부 */
  enabled: boolean
  /** 대상 서비스 (null = 전체) */
  service?: MinuService | null
  /** 대상 플랜 (null = 전체) */
  plan_id?: string | null
  /** 대상 사용자 (null = 전체) */
  user_id?: string | null
  /** 생성 일시 */
  created_at: string
  /** 수정 일시 */
  updated_at: string
}

/**
 * 기능 플래그 확인 요청
 */
export interface CheckFeatureFlagRequest {
  /** 플래그 키 */
  key: string
  /** 서비스 */
  service: MinuService
  /** 사용자 ID (선택) */
  user_id?: string
}

/**
 * 기능 플래그 확인 응답
 */
export interface CheckFeatureFlagResponse {
  /** 플래그 키 */
  key: string
  /** 활성화 여부 */
  enabled: boolean
  /** 플래그 설명 */
  description?: string
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Minu 서비스 분석 데이터
 */
export interface MinuAnalyticsData {
  /** 서비스 */
  service: MinuService
  /** 사용자 ID */
  user_id: string
  /** 이벤트 타입 */
  event_type: string
  /** 이벤트 데이터 */
  event_data: Record<string, unknown>
  /** 세션 ID */
  session_id?: string
  /** 발생 타임스탬프 */
  timestamp: string
}

/**
 * 서비스 사용 통계
 */
export interface ServiceUsageStatistics {
  /** 서비스 */
  service: MinuService
  /** 기간 */
  period: {
    start: string
    end: string
  }
  /** 총 사용자 수 */
  total_users: number
  /** 활성 사용자 수 (MAU) */
  active_users: number
  /** 총 세션 수 */
  total_sessions: number
  /** 평균 세션 시간 (초) */
  avg_session_duration: number
  /** 기능별 사용 횟수 */
  feature_usage: Record<FeatureKey, number>
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Minu 통합 에러 코드
 */
export type MinuIntegrationErrorCode =
  | 'MINU_001' // SSO 로그인 실패
  | 'MINU_002' // SSO 콜백 처리 실패
  | 'MINU_003' // 웹훅 검증 실패
  | 'MINU_004' // 서비스 간 통신 실패
  | 'MINU_005' // 기능 플래그 조회 실패
  | 'MINU_006' // 구독 정보 불일치
  | 'MINU_007' // 권한 없음
  | 'MINU_008' // 서비스 접근 제한
  | 'MINU_009' // 네트워크 오류
  | 'MINU_010' // 알 수 없는 오류

/**
 * Minu 통합 에러
 */
export interface MinuIntegrationError {
  /** 에러 코드 */
  code: MinuIntegrationErrorCode
  /** 에러 메시지 */
  message: string
  /** 상세 정보 */
  details?: string
  /** 서비스 */
  service?: MinuService
  /** 타임스탬프 */
  timestamp: string
}

/**
 * 에러 코드별 메시지 매핑
 */
export const MINU_INTEGRATION_ERROR_MESSAGES: Record<MinuIntegrationErrorCode, string> = {
  MINU_001: 'SSO 로그인에 실패했습니다',
  MINU_002: 'SSO 콜백 처리에 실패했습니다',
  MINU_003: '웹훅 검증에 실패했습니다',
  MINU_004: '서비스 간 통신에 실패했습니다',
  MINU_005: '기능 플래그 조회에 실패했습니다',
  MINU_006: '구독 정보가 일치하지 않습니다',
  MINU_007: '권한이 없습니다',
  MINU_008: '서비스 접근이 제한되었습니다',
  MINU_009: '네트워크 오류가 발생했습니다',
  MINU_010: '알 수 없는 오류가 발생했습니다',
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * useMinuSSO 훅 반환 타입
 */
export interface UseMinuSSOResult {
  /** SSO 상태 */
  state: SSOState
  /** 로딩 중 여부 */
  isLoading: boolean
  /** 에러 발생 여부 */
  isError: boolean
  /** 에러 객체 */
  error: MinuIntegrationError | null

  /** SSO 로그인 */
  login: (service: MinuService, redirectUri?: string) => Promise<void>
  /** SSO 로그아웃 */
  logout: () => Promise<void>
  /** 토큰 갱신 */
  refreshToken: () => Promise<void>
  /** 상태 초기화 */
  clearState: () => void

  /** 특정 서비스 접근 가능 여부 */
  canAccessService: (service: MinuService) => boolean
  /** 특정 기능 사용 가능 여부 */
  canUseFeature: (featureKey: FeatureKey) => boolean
  /** 특정 스코프 보유 여부 */
  hasScope: (scope: OAuthScope) => boolean
}

// ============================================================================
// Constants
// ============================================================================

/**
 * SSO 토큰 저장 키
 */
export const MINU_SSO_STORAGE_KEY = 'minu_sso_token'

/**
 * 웹훅 시크릿 키 (환경 변수)
 */
export const MINU_WEBHOOK_SECRET_KEY = 'MINU_WEBHOOK_SECRET'

/**
 * 웹훅 재시도 최대 횟수
 */
export const WEBHOOK_MAX_RETRY_COUNT = 3

/**
 * 웹훅 타임아웃 (밀리초)
 */
export const WEBHOOK_TIMEOUT_MS = 5000
