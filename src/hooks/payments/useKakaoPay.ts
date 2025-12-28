/**
 * useKakaoPay Hook
 *
 * Kakao Pay 전용 결제 훅
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useState } from 'react'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import {
  prepareKakaoPayment,
  approveKakaoPayment,
  cancelKakaoPayment,
  getKakaoPayRedirectUrls,
} from '@/lib/payments/kakao-pay'
import type { PaymentResult, PaymentError } from '@/lib/payments/types'
import { devError } from '@/lib/errors'

export interface UseKakaoPayReturn {
  isProcessing: boolean
  error: PaymentError | null
  initiateKakaoPay: (orderId: string, orderNumber: string, amount: number, itemName: string) => Promise<void>
  approveKakaoPay: (orderId: string, tid: string, pgToken: string) => Promise<PaymentResult>
  cancelKakaoPay: (tid: string, cancelAmount: number) => Promise<void>
  clearError: () => void
}

export function useKakaoPay(): UseKakaoPayReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<PaymentError | null>(null)
  const { user, workersTokens } = useAuth()

  /**
   * Kakao Pay 결제 시작
   */
  const initiateKakaoPay = async (
    orderId: string,
    orderNumber: string,
    amount: number,
    itemName: string
  ): Promise<void> => {
    setIsProcessing(true)
    setError(null)

    try {
      if (!user || !workersTokens?.accessToken) throw new Error('로그인이 필요합니다.')

      // 1. Redirect URL 생성
      const redirectUrls = getKakaoPayRedirectUrls(orderId)

      // 2. Kakao Pay 결제 준비
      const readyResponse = await prepareKakaoPayment({
        partner_order_id: orderNumber,
        partner_user_id: user.id,
        item_name: itemName,
        quantity: 1,
        total_amount: amount,
        tax_free_amount: 0,
        ...redirectUrls,
      })

      // 3. TID를 세션 스토리지에 저장 (승인 시 사용)
      sessionStorage.setItem(`kakao_pay_tid_${orderId}`, readyResponse.tid)

      // 4. 결제 페이지로 리다이렉트
      window.location.href = readyResponse.next_redirect_pc_url
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 시작 실패'
      setError({
        provider: 'kakao',
        code: 'INITIATE_FAILED',
        message,
        orderId,
      })
      devError(err, { service: 'Kakao Pay', operation: '결제 시작' })
      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Kakao Pay 결제 승인
   */
  const approveKakaoPay = async (
    orderId: string,
    tid: string,
    pgToken: string
  ): Promise<PaymentResult> => {
    setIsProcessing(true)
    setError(null)

    try {
      if (!user || !workersTokens?.accessToken) throw new Error('로그인이 필요합니다.')

      // 1. 주문 정보 조회 (Workers API)
      const { data: order, error: orderError } = await callWorkersApi<{
        id: string;
        order_number: string;
      }>(`/api/v1/orders/${orderId}`, {
        token: workersTokens.accessToken,
      })

      if (orderError || !order) throw new Error('주문 정보를 찾을 수 없습니다.')

      // 2. Kakao Pay 승인 요청
      const approveResponse = await approveKakaoPayment({
        tid,
        partner_order_id: order.order_number,
        partner_user_id: user.id,
        pg_token: pgToken,
      })

      // 3. payments 테이블에 결제 정보 저장 (Workers API)
      const { error: paymentError } = await callWorkersApi('/api/v1/payments', {
        method: 'POST',
        token: workersTokens.accessToken,
        body: {
          order_id: orderId,
          amount: approveResponse.amount.total,
          status: 'completed',
          provider: 'kakao',
          provider_transaction_id: approveResponse.tid,
          payment_method: approveResponse.payment_method_type.toLowerCase(),
          card_info: approveResponse.card_info
            ? {
                cardType: approveResponse.card_info.card_type,
                issuer: approveResponse.card_info.kakaopay_issuer_corp,
                approveNo: approveResponse.card_info.approved_id,
              }
            : null,
          metadata: approveResponse,
          paid_at: approveResponse.approved_at,
        },
      })

      if (paymentError) throw new Error(paymentError)

      // 4. orders 테이블 상태 업데이트 (pending → confirmed)
      const { error: orderUpdateError } = await callWorkersApi(`/api/v1/orders/${orderId}`, {
        method: 'PATCH',
        token: workersTokens.accessToken,
        body: {
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        },
      })

      if (orderUpdateError) throw new Error(orderUpdateError)

      // 5. 세션 스토리지 정리
      sessionStorage.removeItem(`kakao_pay_tid_${orderId}`)

      return {
        success: true,
        provider: 'kakao',
        transactionId: approveResponse.tid,
        orderId,
        amount: approveResponse.amount.total,
        paidAt: approveResponse.approved_at,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 승인 실패'
      setError({
        provider: 'kakao',
        code: 'APPROVE_FAILED',
        message,
        orderId,
      })

      devError(err, { service: 'Kakao Pay', operation: '결제 승인' })

      // 결제 실패 시 orders 상태 업데이트
      if (workersTokens?.accessToken) {
        await callWorkersApi(`/api/v1/orders/${orderId}`, {
          method: 'PATCH',
          token: workersTokens.accessToken,
          body: { status: 'cancelled' },
        })
      }

      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Kakao Pay 결제 취소
   */
  const cancelKakaoPay = async (tid: string, cancelAmount: number): Promise<void> => {
    setIsProcessing(true)
    setError(null)

    try {
      await cancelKakaoPayment({
        tid,
        cancel_amount: cancelAmount,
        cancel_tax_free_amount: 0,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 취소 실패'
      setError({
        provider: 'kakao',
        code: 'CANCEL_FAILED',
        message,
      })
      devError(err, { service: 'Kakao Pay', operation: '결제 취소' })
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
    initiateKakaoPay,
    approveKakaoPay,
    cancelKakaoPay,
    clearError,
  }
}
