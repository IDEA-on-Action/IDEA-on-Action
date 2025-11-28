/**
 * Toss Payments Service
 *
 * 토스페이먼츠 결제 클라이언트
 * - 결제 위젯 초기화
 * - 결제 요청
 * - 결제 승인 (Edge Function 호출)
 *
 * @see https://docs.tosspayments.com/
 */

import { loadTossPayments, TossPaymentsInstance } from '@tosspayments/payment-sdk'
import { supabase } from '@/integrations/supabase/client'

// 환경 변수
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY

// 결제 요청 타입
interface PaymentRequestParams {
  orderId: string
  amount: number
  orderName: string
  customerName?: string
  customerEmail?: string
  successUrl?: string
  failUrl?: string
}

// 결제 승인 요청 타입
interface PaymentConfirmParams {
  paymentKey: string
  orderId: string
  amount: number
}

// 결제 취소 요청 타입
interface PaymentCancelParams {
  paymentKey: string
  cancelReason: string
}

// 결제 결과 타입
interface PaymentResult {
  success: boolean
  data?: {
    orderId: string
    paymentKey: string
    amount: number
    status: string
    approvedAt?: string
    method?: string
    receipt?: string
  }
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

class TossPaymentService {
  private tossPayments: TossPaymentsInstance | null = null

  /**
   * TossPayments SDK 초기화
   */
  async initialize(): Promise<TossPaymentsInstance> {
    if (this.tossPayments) {
      return this.tossPayments
    }

    if (!TOSS_CLIENT_KEY) {
      throw new Error('VITE_TOSS_CLIENT_KEY 환경 변수가 설정되지 않았습니다.')
    }

    this.tossPayments = await loadTossPayments(TOSS_CLIENT_KEY)
    return this.tossPayments
  }

  /**
   * 결제 준비 (Edge Function 호출)
   */
  async preparePayment(params: PaymentRequestParams): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke('toss-payment', {
        body: {
          action: 'ready',
          ...params,
        },
      })

      if (error) {
        return {
          success: false,
          error: {
            code: 'PREPARE_ERROR',
            message: error.message,
          },
        }
      }

      return {
        success: true,
        data: data.data,
      }
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.',
        },
      }
    }
  }

  /**
   * 결제 요청 (결제 위젯 표시)
   */
  async requestPayment(params: PaymentRequestParams): Promise<void> {
    const tossPayments = await this.initialize()

    const {
      orderId,
      amount,
      orderName,
      customerName,
      customerEmail,
      successUrl = `${window.location.origin}/payment/success`,
      failUrl = `${window.location.origin}/payment/fail`,
    } = params

    await tossPayments.requestPayment('카드', {
      amount,
      orderId,
      orderName,
      customerName,
      customerEmail,
      successUrl,
      failUrl,
    })
  }

  /**
   * 결제 승인 (Edge Function 호출)
   * 결제 성공 페이지에서 호출
   */
  async confirmPayment(params: PaymentConfirmParams): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke('toss-payment', {
        body: {
          action: 'confirm',
          ...params,
        },
      })

      if (error) {
        return {
          success: false,
          error: {
            code: 'CONFIRM_ERROR',
            message: error.message,
          },
        }
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error,
        }
      }

      return {
        success: true,
        data: data.data,
      }
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.',
        },
      }
    }
  }

  /**
   * 결제 취소 (Edge Function 호출)
   */
  async cancelPayment(params: PaymentCancelParams): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke('toss-payment', {
        body: {
          action: 'cancel',
          ...params,
        },
      })

      if (error) {
        return {
          success: false,
          error: {
            code: 'CANCEL_ERROR',
            message: error.message,
          },
        }
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error,
        }
      }

      return {
        success: true,
        data: data.data,
      }
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.',
        },
      }
    }
  }

  /**
   * 금액 포맷팅 (원화)
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }
}

// 싱글톤 인스턴스
export const tossPaymentService = new TossPaymentService()

// 타입 export
export type {
  PaymentRequestParams,
  PaymentConfirmParams,
  PaymentCancelParams,
  PaymentResult,
}
