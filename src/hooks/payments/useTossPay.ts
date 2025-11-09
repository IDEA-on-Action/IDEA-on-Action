/**
 * useTossPay Hook
 *
 * Toss Payments 전용 결제 훅
 */

import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  requestTossPayment,
  confirmTossPayment,
  cancelTossPayment,
  getTossPaymentRedirectUrls,
} from '@/lib/payments/toss-payments'
import type { PaymentResult, PaymentError } from '@/lib/payments/types'
import { devError } from '@/lib/errors'

export interface UseTossPayReturn {
  isProcessing: boolean
  error: PaymentError | null
  initiateTossPay: (orderId: string, orderNumber: string, amount: number, orderName: string) => Promise<void>
  confirmTossPay: (orderId: string, paymentKey: string, amount: number) => Promise<PaymentResult>
  cancelTossPay: (paymentKey: string, cancelReason: string, cancelAmount?: number) => Promise<void>
  clearError: () => void
}

export function useTossPay(): UseTossPayReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<PaymentError | null>(null)

  /**
   * Toss Payments 결제 시작
   */
  const initiateTossPay = async (
    orderId: string,
    orderNumber: string,
    amount: number,
    orderName: string
  ): Promise<void> => {
    setIsProcessing(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 1. Redirect URL 생성
      const redirectUrls = getTossPaymentRedirectUrls(orderId)

      // 2. Toss Payments 결제 요청 (결제창 호출)
      await requestTossPayment({
        orderId: orderNumber,
        orderName,
        amount,
        customerEmail: user.email,
        ...redirectUrls,
      })

      // 결제창으로 리다이렉트됨
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 시작 실패'
      setError({
        provider: 'toss',
        code: 'INITIATE_FAILED',
        message,
        orderId,
      })
      devError(err, { service: 'Toss Payments', operation: '결제 시작' })
      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Toss Payments 결제 승인
   */
  const confirmTossPay = async (
    orderId: string,
    paymentKey: string,
    amount: number
  ): Promise<PaymentResult> => {
    setIsProcessing(true)
    setError(null)

    try {
      // 1. 주문 정보 조회
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', orderId)
        .single()

      if (orderError || !order) throw new Error('주문 정보를 찾을 수 없습니다.')

      // 2. Toss Payments 승인 요청
      const confirmResponse = await confirmTossPayment({
        paymentKey,
        orderId: order.order_number,
        amount,
      })

      // 3. payments 테이블에 결제 정보 저장
      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: orderId,
        amount: confirmResponse.totalAmount,
        status: 'completed',
        provider: 'toss',
        provider_transaction_id: confirmResponse.paymentKey,
        payment_method: confirmResponse.method,
        card_info: confirmResponse.card
          ? {
              cardType: confirmResponse.card.cardType,
              cardNumber: confirmResponse.card.number,
              issuer: confirmResponse.card.company,
              approveNo: confirmResponse.card.approvedNo,
            }
          : null,
        metadata: confirmResponse,
        paid_at: confirmResponse.approvedAt,
      })

      if (paymentError) throw paymentError

      // 4. orders 테이블 상태 업데이트 (pending → confirmed)
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (orderUpdateError) throw orderUpdateError

      return {
        success: true,
        provider: 'toss',
        transactionId: confirmResponse.paymentKey,
        orderId,
        amount: confirmResponse.totalAmount,
        paidAt: confirmResponse.approvedAt,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 승인 실패'
      setError({
        provider: 'toss',
        code: 'CONFIRM_FAILED',
        message,
        orderId,
      })

      devError(err, { service: 'Toss Payments', operation: '결제 승인' })

      // 결제 실패 시 orders 상태 업데이트
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)

      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Toss Payments 결제 취소
   */
  const cancelTossPay = async (paymentKey: string, cancelReason: string, cancelAmount?: number): Promise<void> => {
    setIsProcessing(true)
    setError(null)

    try {
      await cancelTossPayment({
        paymentKey,
        cancelReason,
        cancelAmount,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 취소 실패'
      setError({
        provider: 'toss',
        code: 'CANCEL_FAILED',
        message,
      })
      devError(err, { service: 'Toss Payments', operation: '결제 취소' })
      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * 에러 초기화
   */
  const clearError = () => {
    setError(null)
  }

  return {
    isProcessing,
    error,
    initiateTossPay,
    confirmTossPay,
    cancelTossPay,
    clearError,
  }
}

