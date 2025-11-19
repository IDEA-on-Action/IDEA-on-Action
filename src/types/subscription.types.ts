/**
 * Subscription Types
 *
 * 구독 관리 시스템 타입 정의
 */

import type { Database } from './supabase'

// =====================================================
// Database Types
// =====================================================

export type BillingKey = Database['public']['Tables']['billing_keys']['Row']
export type BillingKeyInsert = Database['public']['Tables']['billing_keys']['Insert']
export type BillingKeyUpdate = Database['public']['Tables']['billing_keys']['Update']

export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

export type SubscriptionPayment = Database['public']['Tables']['subscription_payments']['Row']
export type SubscriptionPaymentInsert = Database['public']['Tables']['subscription_payments']['Insert']
export type SubscriptionPaymentUpdate = Database['public']['Tables']['subscription_payments']['Update']

// =====================================================
// Enums
// =====================================================

export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'expired' | 'suspended'
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled'
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly'

// =====================================================
// Extended Types (with Relations)
// =====================================================

/**
 * 구독 정보 + 서비스/플랜 정보
 */
export interface SubscriptionWithPlan extends Omit<Subscription, 'service_id' | 'plan_id'> {
  service: {
    id: string
    title: string
    slug: string
    image_url: string | null
  }
  plan: {
    id: string
    plan_name: string
    billing_cycle: BillingCycle
    price: number
    features: Record<string, unknown>
  }
  billing_key?: BillingKey | null
}

/**
 * 결제 내역 + 구독 정보
 */
export interface SubscriptionPaymentWithDetails extends Omit<SubscriptionPayment, 'subscription_id'> {
  subscription: {
    id: string
    service_title: string
    plan_name: string
  }
}

// =====================================================
// Form Types
// =====================================================

/**
 * 구독 생성 요청 데이터
 */
export interface CreateSubscriptionRequest {
  service_id: string
  plan_id: string
  billing_key_id?: string
  trial_days?: number // 무료 체험 기간 (기본값: 14일)
}

/**
 * 구독 취소 요청 데이터
 */
export interface CancelSubscriptionRequest {
  subscription_id: string
  cancel_at_period_end: boolean // true면 현재 주기 종료 시 취소, false면 즉시 취소
  reason?: string // 취소 사유 (선택)
}

/**
 * 플랜 변경 요청 데이터
 */
export interface UpgradeSubscriptionRequest {
  subscription_id: string
  new_plan_id: string
  prorate?: boolean // 일할 계산 여부 (기본값: true)
}

// =====================================================
// UI Types
// =====================================================

/**
 * 구독 상태 한글 변환
 */
export const SUBSCRIPTION_STATUS_KR: Record<SubscriptionStatus, string> = {
  trial: '무료 체험',
  active: '활성',
  cancelled: '취소됨',
  expired: '만료됨',
  suspended: '정지됨',
}

/**
 * 결제 상태 한글 변환
 */
export const PAYMENT_STATUS_KR: Record<PaymentStatus, string> = {
  pending: '결제 대기',
  success: '결제 완료',
  failed: '결제 실패',
  cancelled: '결제 취소',
}

/**
 * 구독 주기 한글 변환
 */
export const BILLING_CYCLE_KR: Record<BillingCycle, string> = {
  monthly: '월간',
  quarterly: '분기',
  yearly: '연간',
}

/**
 * 구독 상태 배지 색상
 */
export const SUBSCRIPTION_STATUS_VARIANT: Record<
  SubscriptionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  trial: 'secondary',
  active: 'default',
  cancelled: 'destructive',
  expired: 'outline',
  suspended: 'destructive',
}

/**
 * 결제 상태 배지 색상
 */
export const PAYMENT_STATUS_VARIANT: Record<
  PaymentStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  success: 'default',
  failed: 'destructive',
  cancelled: 'outline',
}

// =====================================================
// Helper Types
// =====================================================

/**
 * 구독 요약 정보
 */
export interface SubscriptionSummary {
  total_subscriptions: number
  active_subscriptions: number
  trial_subscriptions: number
  cancelled_subscriptions: number
  total_revenue: number // 총 수익 (원 단위)
  monthly_revenue: number // 월간 수익 (원 단위)
}

/**
 * 다음 결제 정보
 */
export interface NextBillingInfo {
  date: string // ISO 8601 date string
  amount: number // 원 단위
  billing_cycle: BillingCycle
}
