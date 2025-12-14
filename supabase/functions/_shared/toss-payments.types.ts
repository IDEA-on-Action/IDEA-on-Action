/**
 * Toss Payments API 타입 정의
 *
 * @see https://docs.tosspayments.com/reference
 */

/**
 * 토스페이먼츠 결제 결과
 */
export interface TossPaymentResult {
  mId: string
  orderId: string
  orderName: string
  status: 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED' | 'IN_PROGRESS'
  method?: string
  requestedAt: string
  approvedAt?: string
  paymentKey?: string
  totalAmount: number
  balanceAmount: number
  suppliedAmount: number
  vat: number
  cultureExpense: boolean
  taxFreeAmount: number
  taxExemptionAmount: number
  card?: {
    issuerCode: string
    acquirerCode?: string
    number: string
    installmentPlanMonths: number
    isInterestFree: boolean
    interestPayer?: 'BUYER' | 'CARD_COMPANY' | 'MERCHANT'
    approveNo: string
    useCardPoint: boolean
    cardType: 'CREDIT' | 'DEBIT' | 'GIFT' | 'UNKNOWN'
    ownerType: 'PERSONAL' | 'CORPORATE' | 'UNKNOWN'
    acquireStatus: 'READY' | 'REQUESTED' | 'COMPLETED' | 'CANCEL_REQUESTED' | 'CANCELED'
    receiptUrl?: string
  }
  virtualAccount?: {
    accountType: 'NORMAL' | 'FIXED'
    accountNumber: string
    bankCode: string
    customerName: string
    dueDate: string
    refundStatus: 'NONE' | 'PENDING' | 'FAILED' | 'COMPLETED'
    expired: boolean
    settlementStatus: 'INCOMPLETE' | 'COMPLETE'
    refundReceiveAccount?: {
      bankCode: string
      accountNumber: string
      holderName: string
    }
  }
  transfer?: {
    bankCode: string
    settlementStatus: 'INCOMPLETE' | 'COMPLETE'
  }
  mobilePhone?: {
    customerMobilePhone: string
    settlementStatus: 'INCOMPLETE' | 'COMPLETE'
    receiptUrl: string
  }
  giftCertificate?: {
    approveNo: string
    settlementStatus: 'INCOMPLETE' | 'COMPLETE'
  }
  receipt?: {
    url: string
  }
  checkout?: {
    url: string
  }
  currency: string
  country?: string
  failure?: {
    code: string
    message: string
  }
  isPartialCancelable: boolean
  cancels?: Array<{
    cancelAmount: number
    cancelReason: string
    taxFreeAmount: number
    taxExemptionAmount: number
    refundableAmount: number
    easyPayDiscountAmount: number
    canceledAt: string
    transactionKey: string
    receiptKey?: string
  }>
  secret?: string
  type: 'NORMAL' | 'BILLING' | 'BRANDPAY'
  easyPay?: {
    provider: string
    amount: number
    discountAmount: number
  }
  customerKey?: string
  billingKey?: string
}

/**
 * 토스페이먼츠 에러 응답
 */
export interface TossPaymentError {
  code: string
  message: string
}

/**
 * 결제 처리 결과 (내부 타입)
 */
export interface PaymentProcessResult {
  success: boolean
  data?: TossPaymentResult
  error?: TossPaymentError
}

/**
 * 구독 정보 (Supabase subscriptions 테이블)
 */
export interface SubscriptionInfo {
  id: string
  user_id: string
  plan_id: string
  billing_key_id: string
  current_period_end: string
  next_billing_date: string
  status: 'active' | 'trial' | 'suspended' | 'expired' | 'canceled'
  cancel_at_period_end: boolean
  billing_key: {
    billing_key: string
    customer_key: string
  }
  plan: {
    price: number
    plan_name: string
    billing_cycle: 'monthly' | 'quarterly' | 'yearly'
  }
}

/**
 * 구독 플랜 정보 (Supabase subscription_plans 테이블)
 */
export interface SubscriptionPlan {
  id: string
  plan_name: string
  price: number
  billing_cycle: 'monthly' | 'quarterly' | 'yearly'
  features: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * 결제 기록 정보 (Supabase subscription_payments 테이블)
 */
export interface SubscriptionPayment {
  id?: string
  subscription_id: string
  amount: number
  status: 'success' | 'failed' | 'pending' | 'refunded'
  payment_key?: string
  order_id: string
  paid_at?: string
  error_code?: string
  error_message?: string
  metadata?: TossPaymentResult | TossPaymentError
  created_at?: string
}

/**
 * 활동 로그 정보 (Supabase activity_logs 테이블)
 */
export interface ActivityLog {
  id?: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  metadata?: Record<string, unknown>
  created_at?: string
}

/**
 * Weekly Recap 통계 타입
 */
export interface WeeklyStats {
  total_logs: number
  release_count: number
  learning_count: number
  decision_count: number
  active_projects: number
  top_tags: Array<{ tag: string; count: number }>
  start_date: string
  end_date: string
}

/**
 * Weekly Recap 로그 타입
 */
export interface WeeklyLog {
  log_type: string
  log_count: number
  logs: Array<{
    id: number
    type: string
    title: string
    content: string
    project_id: string | null
    tags: string[]
    created_at: string
  }>
}

/**
 * Weekly Recap 프로젝트 활동 타입
 */
export interface ProjectActivity {
  project_id: string
  project_title: string
  log_count: number
  release_count: number
  learning_count: number
  decision_count: number
}

/**
 * 빌링키 발급 요청
 */
export interface IssueBillingKeyRequest {
  authKey: string
  customerKey: string
}

/**
 * 빌링키 발급 응답 (토스페이먼츠 API)
 */
export interface TossBillingKeyResponse {
  mId: string
  customerKey: string
  authenticatedAt: string
  method: string
  billingKey: string
  cardCompany: string
  cardNumber: string
  card?: {
    issuerCode: string
    acquirerCode: string
    number: string
    cardType: 'CREDIT' | 'DEBIT' | 'GIFT'
    ownerType: 'PERSONAL' | 'CORPORATE'
  }
}

/**
 * 빌링키 발급 결과 (Edge Function 응답)
 */
export interface IssueBillingKeyResult {
  success: boolean
  billingKey?: string
  customerKey?: string
  cardCompany?: string
  cardNumber?: string
  authenticatedAt?: string
  error?: {
    code: string
    message: string
  }
}
