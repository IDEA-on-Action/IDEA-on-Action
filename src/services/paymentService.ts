/**
 * Payment Service
 *
 * 결제 처리 서비스
 * - 카카오페이 / 토스페이먼츠 연동 준비
 * - 결제 준비 / 승인 / 취소 로직
 *
 * Note: 실제 결제 SDK 연동 전 Mock 구현
 */

import { supabase } from '@/integrations/supabase/client'
import type { Payment, PaymentInsert, Order } from '@/types/database'

export type PaymentProvider = 'kakao' | 'toss' | 'stripe'

export interface PaymentReadyRequest {
  orderId: string
  provider: PaymentProvider
  amount: number
  itemName: string
  successUrl: string
  failUrl: string
  cancelUrl: string
}

export interface PaymentReadyResponse {
  paymentId: string
  redirectUrl: string
  tid?: string // 결제사 거래 ID (카카오페이)
}

export interface PaymentApproveRequest {
  paymentId: string
  provider: PaymentProvider
  pgToken?: string // 카카오페이
  paymentKey?: string // 토스페이먼츠
}

export interface PaymentApproveResponse {
  success: boolean
  payment: Payment
  message?: string
}

/**
 * 결제 준비 (결제 페이지로 리다이렉트 전)
 */
export async function preparePayment(
  request: PaymentReadyRequest
): Promise<PaymentReadyResponse> {
  const { orderId, provider, amount, itemName, successUrl, failUrl } = request

  // 1. payments 테이블에 pending 상태로 생성
  const paymentData: PaymentInsert = {
    order_id: orderId,
    provider,
    amount,
    status: 'pending',
    payment_method: null,
    provider_transaction_id: null,
    metadata: {
      item_name: itemName,
      requested_at: new Date().toISOString(),
    },
    paid_at: null,
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert(paymentData)
    .select()
    .single()

  if (error) {
    console.error('Payment creation failed:', error)
    throw new Error('결제 생성에 실패했습니다.')
  }

  // 2. 결제사별 리다이렉트 URL 생성
  // Note: 실제 구현 시 각 결제사 SDK 호출
  let redirectUrl: string

  switch (provider) {
    case 'kakao':
      // TODO: 카카오페이 API 호출
      // const kakaoResponse = await kakaoPayReady({ ... })
      redirectUrl = `${successUrl}?paymentId=${payment.id}&provider=kakao`
      break

    case 'toss':
      // TODO: 토스페이먼츠 API 호출
      // const tossResponse = await tossPayReady({ ... })
      redirectUrl = `${successUrl}?paymentId=${payment.id}&provider=toss`
      break

    case 'stripe':
      // TODO: Stripe API 호출
      redirectUrl = `${successUrl}?paymentId=${payment.id}&provider=stripe`
      break

    default:
      throw new Error('지원하지 않는 결제 수단입니다.')
  }

  return {
    paymentId: payment.id,
    redirectUrl,
  }
}

/**
 * 결제 승인 (결제사 콜백 후)
 */
export async function approvePayment(
  request: PaymentApproveRequest
): Promise<PaymentApproveResponse> {
  const { paymentId, provider } = request

  // 1. payment 조회
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('*, order:orders(*)')
    .eq('id', paymentId)
    .single()

  if (fetchError || !payment) {
    throw new Error('결제 정보를 찾을 수 없습니다.')
  }

  if (payment.status !== 'pending') {
    throw new Error('이미 처리된 결제입니다.')
  }

  // 2. 결제사별 승인 처리
  // Note: 실제 구현 시 각 결제사 SDK 호출
  let providerTransactionId: string
  let paymentMethod: string

  switch (provider) {
    case 'kakao':
      // TODO: 카카오페이 승인 API 호출
      // const kakaoApprove = await kakaoPayApprove({ tid, pg_token })
      providerTransactionId = `KAKAO_${Date.now()}`
      paymentMethod = '카카오페이'
      break

    case 'toss':
      // TODO: 토스페이먼츠 승인 API 호출
      providerTransactionId = `TOSS_${Date.now()}`
      paymentMethod = '토스페이'
      break

    case 'stripe':
      // TODO: Stripe 승인 처리
      providerTransactionId = `STRIPE_${Date.now()}`
      paymentMethod = 'Stripe'
      break

    default:
      throw new Error('지원하지 않는 결제 수단입니다.')
  }

  // 3. payment 상태 업데이트
  const { data: updatedPayment, error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      provider_transaction_id: providerTransactionId,
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
      metadata: {
        ...((payment.metadata as Record<string, unknown>) || {}),
        approved_at: new Date().toISOString(),
      },
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (updateError) {
    console.error('Payment update failed:', updateError)
    throw new Error('결제 상태 업데이트에 실패했습니다.')
  }

  // 4. 주문 상태 업데이트
  if (payment.order_id) {
    await supabase
      .from('orders')
      .update({ status: 'processing' })
      .eq('id', payment.order_id)
  }

  return {
    success: true,
    payment: updatedPayment as Payment,
    message: '결제가 완료되었습니다.',
  }
}

/**
 * 결제 실패 처리
 */
export async function failPayment(paymentId: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      metadata: {
        failed_at: new Date().toISOString(),
        fail_reason: reason || 'Unknown error',
      },
    })
    .eq('id', paymentId)

  if (error) {
    console.error('Payment fail update error:', error)
  }
}

/**
 * 결제 취소/환불
 */
export async function cancelPayment(
  paymentId: string,
  reason?: string
): Promise<Payment> {
  // 1. payment 조회
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()

  if (fetchError || !payment) {
    throw new Error('결제 정보를 찾을 수 없습니다.')
  }

  if (payment.status !== 'completed') {
    throw new Error('완료된 결제만 취소할 수 있습니다.')
  }

  // 2. 결제사별 취소 처리
  // TODO: 각 결제사 취소 API 호출

  // 3. payment 상태 업데이트
  const { data: updatedPayment, error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'refunded',
      metadata: {
        ...((payment.metadata as Record<string, unknown>) || {}),
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
      },
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (updateError) {
    throw new Error('결제 취소에 실패했습니다.')
  }

  // 4. 주문 상태 업데이트
  if (payment.order_id) {
    await supabase
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', payment.order_id)
  }

  return updatedPayment as Payment
}

/**
 * 결제 상태 조회
 */
export async function getPaymentStatus(paymentId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()

  if (error) {
    console.error('Payment fetch error:', error)
    return null
  }

  return data as Payment
}

/**
 * 주문의 결제 정보 조회
 */
export async function getPaymentByOrderId(orderId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return null
  }

  return data as Payment
}
