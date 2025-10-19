// ===================================================================
// Payment Gateway Types
// 작성일: 2025-10-19
// 목적: Kakao Pay & Toss Payments 공통 타입 정의
// ===================================================================

export type PaymentProvider = 'kakao' | 'toss' | 'stripe' | 'paypal'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded'
export type PaymentMethod = 'card' | 'bank' | 'kakao_pay' | 'toss_pay' | 'virtual_account'

// ===================================================================
// Kakao Pay Types
// ===================================================================

export interface KakaoPayReadyRequest {
  cid: string // 가맹점 코드 (TC0ONETIME for test)
  partner_order_id: string // 주문번호
  partner_user_id: string // 사용자 ID
  item_name: string // 상품명
  quantity: number // 수량
  total_amount: number // 총 금액
  tax_free_amount: number // 비과세 금액
  approval_url: string // 성공 시 redirect URL
  cancel_url: string // 취소 시 redirect URL
  fail_url: string // 실패 시 redirect URL
}

export interface KakaoPayReadyResponse {
  tid: string // 거래 고유번호
  next_redirect_pc_url: string // PC 웹 결제 페이지
  next_redirect_mobile_url: string // 모바일 웹 결제 페이지
  created_at: string // 결제 준비 요청 시각
}

export interface KakaoPayApproveRequest {
  cid: string
  tid: string
  partner_order_id: string
  partner_user_id: string
  pg_token: string // 사용자 결제 승인 토큰
}

export interface KakaoPayApproveResponse {
  aid: string // 요청 고유번호
  tid: string // 거래 고유번호
  cid: string // 가맹점 코드
  partner_order_id: string // 주문번호
  partner_user_id: string // 사용자 ID
  payment_method_type: string // 결제 수단 (CARD, MONEY)
  amount: {
    total: number // 총 금액
    tax_free: number // 비과세 금액
    vat: number // 부가세
    point: number // 사용 포인트
    discount: number // 할인 금액
  }
  card_info?: {
    card_type: string // 카드 종류 (신용/체크/선불)
    kakaopay_purchase_corp: string // 카카오페이 매입사
    kakaopay_purchase_corp_code: string
    kakaopay_issuer_corp: string // 카드 발급사
    kakaopay_issuer_corp_code: string
    bin: string // 카드 BIN
    card_mid: string
    approved_id: string // 승인 번호
    install_month: string // 할부 개월 수
    interest_free_install: string // 무이자 여부
  }
  item_name: string // 상품명
  item_code: string // 상품 코드
  quantity: number // 수량
  created_at: string // 결제 준비 요청 시각
  approved_at: string // 결제 승인 시각
}

export interface KakaoPayCancelRequest {
  cid: string
  tid: string
  cancel_amount: number
  cancel_tax_free_amount: number
}

export interface KakaoPayCancelResponse {
  aid: string
  tid: string
  cid: string
  status: string // CANCEL_PAYMENT, PART_CANCEL_PAYMENT
  partner_order_id: string
  partner_user_id: string
  payment_method_type: string
  amount: {
    total: number
    tax_free: number
    vat: number
    point: number
    discount: number
  }
  approved_cancel_amount: {
    total: number
    tax_free: number
    vat: number
    point: number
    discount: number
  }
  canceled_at: string
  item_name: string
  quantity: number
}

// ===================================================================
// Toss Payments Types
// ===================================================================

export interface TossPaymentRequest {
  orderId: string // 주문번호 (영문, 숫자, - _ 만 허용)
  orderName: string // 주문명
  amount: number // 결제 금액
  customerEmail?: string // 고객 이메일
  customerName?: string // 고객 이름
  successUrl: string // 성공 시 redirect URL
  failUrl: string // 실패 시 redirect URL
}

export interface TossPaymentResponse {
  paymentKey: string // 결제 키
  orderId: string // 주문번호
  orderName: string // 주문명
  method: string // 결제 수단 (카드, 가상계좌, 간편결제, 휴대폰, 계좌이체, 문화상품권, 도서문화상품권, 게임문화상품권)
  totalAmount: number // 총 결제 금액
  balanceAmount: number // 취소 가능 금액
  status: string // READY, IN_PROGRESS, WAITING_FOR_DEPOSIT, DONE, CANCELED, PARTIAL_CANCELED, ABORTED, EXPIRED
  requestedAt: string // 결제 요청 시각
  approvedAt?: string // 결제 승인 시각
  useEscrow: boolean // 에스크로 사용 여부
  cultureExpense: boolean // 문화비 지출 여부
  card?: {
    company: string // 카드사
    number: string // 카드번호 (마스킹)
    installmentPlanMonths: number // 할부 개월 수
    isInterestFree: boolean // 무이자 여부
    approveNo: string // 승인 번호
    useCardPoint: boolean // 카드 포인트 사용 여부
    cardType: string // 카드 종류 (신용/체크/기프트)
    ownerType: string // 개인/법인
    acquireStatus: string // 매입 상태
  }
  virtualAccount?: {
    accountType: string // 가상계좌 타입 (일반, 고정)
    accountNumber: string // 계좌번호
    bankCode: string // 은행 코드
    customerName: string // 입금자명
    dueDate: string // 입금 기한
    refundStatus: string // 환불 상태
    expired: boolean // 만료 여부
  }
  transfer?: {
    bankCode: string // 은행 코드
    settlementStatus: string // 정산 상태
  }
  receipt?: {
    url: string // 영수증 URL
  }
  checkout?: {
    url: string // 결제창 URL
  }
  easyPay?: {
    provider: string // 간편결제사
    amount: number // 간편결제 금액
    discountAmount: number // 간편결제 할인 금액
  }
  country: string // 결제 국가
  failure?: {
    code: string // 오류 코드
    message: string // 오류 메시지
  }
}

export interface TossPaymentConfirmRequest {
  paymentKey: string
  orderId: string
  amount: number
}

export interface TossPaymentCancelRequest {
  paymentKey: string
  cancelReason: string
  cancelAmount?: number // 부분 취소 금액 (없으면 전액 취소)
}

// ===================================================================
// Common Payment Types (for usePayment hook)
// ===================================================================

export interface PaymentResult {
  success: boolean
  provider: PaymentProvider
  transactionId: string // tid (Kakao) or paymentKey (Toss)
  orderId: string
  amount: number
  paidAt?: string
  error?: string
}

export interface PaymentError {
  provider: PaymentProvider
  code: string
  message: string
  orderId?: string
}
