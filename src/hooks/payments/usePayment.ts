/**
 * usePayment Hook
 *
 * 통합 결제 훅 (Kakao Pay & Toss Payments)
 * 개별 결제 훅들을 통합하여 제공
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useKakaoPay } from '@/hooks/payments/useKakaoPay'
import { useTossPay } from '@/hooks/payments/useTossPay'
import { paymentsApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/auth/useAuth'
import type { PaymentProvider, PaymentResult, PaymentError } from '@/lib/payments/types'
import { devError } from '@/lib/errors'

export interface UsePaymentReturn {
  // 상태
  isProcessing: boolean
  error: PaymentError | null

  // Kakao Pay
  initiateKakaoPay: (orderId: string, orderNumber: string, amount: number, itemName: string) => Promise<void>
  approveKakaoPay: (orderId: string, tid: string, pgToken: string) => Promise<PaymentResult>

  // Toss Payments
  initiateTossPay: (orderId: string, orderNumber: string, amount: number, orderName: string) => Promise<void>
  confirmTossPay: (orderId: string, paymentKey: string, amount: number) => Promise<PaymentResult>

  // 공통
  cancelPayment: (paymentId: string, provider: PaymentProvider, reason: string) => Promise<void>
  clearError: () => void
}

export function usePayment(): UsePaymentReturn {
  const kakaoPay = useKakaoPay()
  const tossPay = useTossPay()
  const { workersTokens } = useAuth()

  // 통합 처리 상태
  const isProcessing = kakaoPay.isProcessing || tossPay.isProcessing
  const error = kakaoPay.error || tossPay.error

  /**
   * 결제 취소 (공통)
   * Workers API를 통해 결제 취소 처리
   */
  const cancelPayment = async (
    paymentId: string,
    provider: PaymentProvider,
    reason: string
  ): Promise<void> => {
    try {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('로그인이 필요합니다.')

      // Workers API로 결제 취소 요청
      // Workers에서 게이트웨이별 취소 + payments 업데이트 + orders 업데이트 처리
      if (provider === 'kakao') {
        // 카카오페이 취소는 별도 API 필요 (현재 useTossPay로만 지원)
        await kakaoPay.cancelKakaoPay(paymentId, 0) // paymentId를 tid로 사용
      } else if (provider === 'toss') {
        // 토스페이먼츠 취소
        const response = await paymentsApi.cancel(token, {
          paymentKey: paymentId, // paymentId를 paymentKey로 사용
          cancelReason: reason,
        })

        if (response.error) {
          throw new Error(response.error)
        }
      }
    } catch (err) {
      devError(err, { service: 'Payment', operation: '결제 취소' })
      throw err
    }
  }

  /**
   * 에러 초기화
   */
  const clearError = () => {
    kakaoPay.clearError()
    tossPay.clearError()
  }

  return {
    isProcessing,
    error,
    initiateKakaoPay: kakaoPay.initiateKakaoPay,
    approveKakaoPay: kakaoPay.approveKakaoPay,
    initiateTossPay: tossPay.initiateTossPay,
    confirmTossPay: tossPay.confirmTossPay,
    cancelPayment,
    clearError,
  }
}
