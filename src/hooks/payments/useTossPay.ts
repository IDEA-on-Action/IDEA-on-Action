/**
 * useTossPay Hook
 *
 * Toss Payments 전용 결제 훅
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useState } from 'react'
import { paymentsApi, ordersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/auth/useAuth'
import {
  requestTossPayment,
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
  const { workersTokens, workersUser } = useAuth()

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
      if (!workersUser) throw new Error('로그인이 필요합니다.')

      // 1. Redirect URL 생성
      const redirectUrls = getTossPaymentRedirectUrls(orderId)

      // 2. Toss Payments 결제 요청 (결제창 호출)
      await requestTossPayment({
        orderId: orderNumber,
        orderName,
        amount,
        customerEmail: workersUser.email,
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
      const token = workersTokens?.accessToken
      if (!token) throw new Error('로그인이 필요합니다.')

      // Workers API로 결제 승인 요청
      // Workers에서 토스 API 호출 + payments 삽입 + orders 업데이트 처리
      const response = await paymentsApi.confirm(token, {
        paymentKey,
        orderId,
        amount,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      const result = response.data as {
        success: boolean
        payment: {
          paymentKey: string
          totalAmount: number
          approvedAt: string
        }
      }

      return {
        success: true,
        provider: 'toss',
        transactionId: result.payment.paymentKey,
        orderId,
        amount: result.payment.totalAmount,
        paidAt: result.payment.approvedAt,
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

      // 결제 실패 시 orders 상태 업데이트 (Workers API 사용)
      const token = workersTokens?.accessToken
      if (token) {
        try {
          await ordersApi.updateStatus(token, orderId, 'cancelled')
        } catch (updateErr) {
          console.error('[useTossPay] 주문 상태 업데이트 실패:', updateErr)
        }
      }

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
      const token = workersTokens?.accessToken
      if (!token) throw new Error('로그인이 필요합니다.')

      // Workers API로 결제 취소 요청
      const response = await paymentsApi.cancel(token, {
        paymentKey,
        cancelReason,
        cancelAmount,
      })

      if (response.error) {
        throw new Error(response.error)
      }
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
