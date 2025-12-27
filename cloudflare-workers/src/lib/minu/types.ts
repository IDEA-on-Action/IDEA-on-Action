/**
 * Minu 서비스 타입 정의
 * Cloudflare Workers용
 */

// ============================================================================
// 기본 타입
// ============================================================================

/** Minu 서비스 타입 */
export type MinuService = 'find' | 'frame' | 'build' | 'keep';

/** 유효한 Minu 서비스 ID 목록 */
export const VALID_MINU_SERVICES: MinuService[] = ['find', 'frame', 'build', 'keep'];

/** Minu 서비스 URL 매핑 */
export const MINU_SERVICE_URLS: Record<MinuService, string> = {
  find: 'https://find.minu.best',
  frame: 'https://frame.minu.best',
  build: 'https://build.minu.best',
  keep: 'https://keep.minu.best',
};

// ============================================================================
// OAuth 관련 타입
// ============================================================================

/** OAuth 콜백 쿼리 파라미터 */
export interface MinuOAuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/** State 디코딩 결과 */
export interface MinuOAuthState {
  csrf: string;
  redirect_uri: string;
  service: MinuService;
  user_id?: string;
}

/** OAuth 세션 정보 (D1) */
export interface MinuOAuthSession {
  id: string;
  user_id: string | null;
  service: MinuService;
  state: string;
  code_verifier: string;
  redirect_uri: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

// ============================================================================
// 토큰 관련 타입
// ============================================================================

/** 토큰 교환 요청 */
export interface MinuTokenExchangeRequest {
  minu_access_token: string;
  service: MinuService;
}

/** 토큰 교환 응답 */
export interface MinuTokenExchangeResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  user: MinuUserInfo;
  subscription: MinuSubscriptionInfo | null;
}

/** Minu 토큰 응답 */
export interface MinuTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

// ============================================================================
// 사용자 관련 타입
// ============================================================================

/** Minu 사용자 정보 */
export interface MinuUserInfo {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  organization?: string;
  created_at?: string;
}

/** Minu userinfo 엔드포인트 응답 */
export interface MinuUserInfoResponse {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  organization?: string;
}

// ============================================================================
// 구독 관련 타입
// ============================================================================

/** Minu 구독 정보 */
export interface MinuSubscriptionInfo {
  id?: string;
  plan_id: string;
  plan_name: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing';
  current_period_start?: string;
  current_period_end?: string;
  trial_end?: string;
  features: string[];
  limits: MinuSubscriptionLimits;
}

/** 구독 제한 정보 */
export interface MinuSubscriptionLimits {
  search_count?: number;
  platforms?: number;
  ai_analysis?: boolean;
  history_months?: number;
  team_members?: number;
  api_rate_limit?: number;
}

// ============================================================================
// 웹훅 관련 타입
// ============================================================================

/** 웹훅 이벤트 타입 */
export type MinuWebhookEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'subscription.expired'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'usage.limit_reached'
  | 'usage.warning'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted';

/** 웹훅 이벤트 */
export interface MinuWebhookEvent {
  id: string;
  type: MinuWebhookEventType;
  service: MinuService;
  timestamp: string;
  data: MinuWebhookEventData;
}

/** 웹훅 이벤트 데이터 */
export type MinuWebhookEventData =
  | MinuSubscriptionEventData
  | MinuPaymentEventData
  | MinuUsageEventData
  | MinuUserEventData;

/** 구독 이벤트 데이터 */
export interface MinuSubscriptionEventData {
  user_id: string;
  subscription_id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  previous_status?: string;
  cancellation_reason?: string;
}

/** 결제 이벤트 데이터 */
export interface MinuPaymentEventData {
  user_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  failure_reason?: string;
}

/** 사용량 이벤트 데이터 */
export interface MinuUsageEventData {
  user_id: string;
  usage_type: string;
  current: number;
  limit: number;
  percentage: number;
}

/** 사용자 이벤트 데이터 */
export interface MinuUserEventData {
  user_id: string;
  email: string;
  changed_fields?: string[];
}
