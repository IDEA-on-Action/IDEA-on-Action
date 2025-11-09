/**
 * usePayment Hook
 *
 * 통합 결제 훅 (Kakao Pay & Toss Payments)
 * 개별 결제 훅들을 통합하여 제공
 */

import { useKakaoPay } from './useKakaoPay'
import { useTossPay } from './useTossPay'
import { supabase } from '@/integrations/supabase/client'
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

  // 통합 처리 상태
  const isProcessing = kakaoPay.isProcessing || tossPay.isProcessing
  const error = kakaoPay.error || tossPay.error

  /**
   * 결제 취소 (공통)
   */
  const cancelPayment = async (
    paymentId: string,
    provider: PaymentProvider,
    reason: string
  ): Promise<void> => {
    try {
      // 1. 결제 정보 조회
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('provider_transaction_id, amount, order_id')
        .eq('id', paymentId)
        .single()

      if (paymentError || !payment) throw new Error('결제 정보를 찾을 수 없습니다.')

      // 2. 게이트웨이별 취소 요청
      if (provider === 'kakao') {
        await kakaoPay.cancelKakaoPay(payment.provider_transaction_id, payment.amount)
      } else if (provider === 'toss') {
        await tossPay.cancelTossPay(payment.provider_transaction_id, reason, payment.amount)
      }

      // 3. payments 테이블 상태 업데이트
      await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          failure_reason: reason,
        })
        .eq('id', paymentId)

      // 4. orders 테이블 상태 업데이트
      await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', payment.order_id)
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

