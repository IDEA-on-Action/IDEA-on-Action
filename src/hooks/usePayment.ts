// ===================================================================
// usePayment Hook
// 작성일: 2025-10-19
// 목적: 결제 게이트웨이 통합 훅 (Kakao Pay & Toss Payments)
// ===================================================================

import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  prepareKakaoPayment,
  approveKakaoPayment,
  cancelKakaoPayment,
  getKakaoPayRedirectUrls,
} from '@/lib/payments/kakao-pay'
import {
  requestTossPayment,
  confirmTossPayment,
  cancelTossPayment,
  getTossPaymentRedirectUrls,
} from '@/lib/payments/toss-payments'
import type { PaymentProvider, PaymentResult, PaymentError } from '@/lib/payments/types'

// ===================================================================
// Hook Interface
// ===================================================================

interface UsePaymentReturn {
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

// ===================================================================
// Hook Implementation
// ===================================================================

export function usePayment(): UsePaymentReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<PaymentError | null>(null)

  // ===================================================================
  // Kakao Pay Functions
  // ===================================================================

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 1. 주문 정보 조회
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', orderId)
        .single()

      if (orderError || !order) throw new Error('주문 정보를 찾을 수 없습니다.')

      // 2. Kakao Pay 승인 요청
      const approveResponse = await approveKakaoPayment({
        tid,
        partner_order_id: order.order_number,
        partner_user_id: user.id,
        pg_token: pgToken,
      })

      // 3. payments 테이블에 결제 정보 저장
      const { error: paymentError } = await supabase.from('payments').insert({
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

  // ===================================================================
  // Toss Payments Functions
  // ===================================================================

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
              approveNo: confirmResponse.card.approveNo,
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

  // ===================================================================
  // Common Functions
  // ===================================================================

  /**
   * 결제 취소 (공통)
   */
  const cancelPayment = async (
    paymentId: string,
    provider: PaymentProvider,
    reason: string
  ): Promise<void> => {
    setIsProcessing(true)
    setError(null)

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
        await cancelKakaoPayment({
          tid: payment.provider_transaction_id,
          cancel_amount: payment.amount,
          cancel_tax_free_amount: 0,
        })
      } else if (provider === 'toss') {
        await cancelTossPayment({
          paymentKey: payment.provider_transaction_id,
          cancelReason: reason,
        })
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
      const message = err instanceof Error ? err.message : '결제 취소 실패'
      setError({
        provider,
        code: 'CANCEL_FAILED',
        message,
      })
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
    initiateTossPay,
    confirmTossPay,
    cancelPayment,
    clearError,
  }
}
