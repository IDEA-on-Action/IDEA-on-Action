/**
 * Toss Payments Edge Function
 *
 * 토스페이먼츠 결제 처리
 * - 결제 준비 (ready)
 * - 결제 승인 (confirm)
 * - 결제 취소 (cancel)
 *
 * @see https://docs.tosspayments.com/
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors } from '../_shared/cors.ts'
import { successResponse, errors } from '../_shared/response.ts'

// 환경 변수
const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY')!
const TOSS_API_URL = 'https://api.tosspayments.com/v1'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 요청 타입
interface PaymentReadyRequest {
  action: 'ready'
  orderId: string
  amount: number
  orderName: string
  customerName?: string
  customerEmail?: string
  successUrl: string
  failUrl: string
}

interface PaymentConfirmRequest {
  action: 'confirm'
  paymentKey: string
  orderId: string
  amount: number
}

interface PaymentCancelRequest {
  action: 'cancel'
  paymentKey: string
  cancelReason: string
}

type PaymentRequest =
  | PaymentReadyRequest
  | PaymentConfirmRequest
  | PaymentCancelRequest

serve(async (req: Request) => {
  // CORS Preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // 인증 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errors.unauthorized()
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 사용자 확인
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return errors.unauthorized()
    }

    // 요청 파싱
    const body: PaymentRequest = await req.json()

    switch (body.action) {
      case 'ready':
        return await handlePaymentReady(body, user.id, supabase)
      case 'confirm':
        return await handlePaymentConfirm(body, user.id, supabase)
      case 'cancel':
        return await handlePaymentCancel(body, user.id, supabase)
      default:
        return errors.badRequest('지원하지 않는 action입니다.')
    }
  } catch (error) {
    console.error('Payment error:', error)
    return errors.internalError(
      error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.'
    )
  }
})

/**
 * 결제 준비
 * 결제 위젯을 렌더링하기 전에 주문 정보를 저장
 */
async function handlePaymentReady(
  data: PaymentReadyRequest,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<Response> {
  const { orderId, amount, orderName, customerName, customerEmail } = data

  // 주문 정보 검증 (DB에서 확인)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', userId)
    .single()

  if (orderError || !order) {
    return errors.notFound('주문')
  }

  // 금액 검증
  if (order.total_amount !== amount) {
    return errors.paymentError('결제 금액이 일치하지 않습니다.')
  }

  // 이미 결제된 주문인지 확인
  if (order.status !== 'pending') {
    return errors.paymentError('이미 처리된 주문입니다.')
  }

  // Payment 레코드 생성 (pending 상태)
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      payment_method: 'toss',
      amount,
      status: 'pending',
      metadata: {
        orderName,
        customerName,
        customerEmail,
      },
    })
    .select()
    .single()

  if (paymentError) {
    console.error('Payment record creation error:', paymentError)
    return errors.internalError('결제 정보 생성에 실패했습니다.')
  }

  return successResponse({
    paymentId: payment.id,
    orderId,
    amount,
    orderName,
    message: '결제 준비가 완료되었습니다. 결제 위젯을 표시하세요.',
  })
}

/**
 * 결제 승인
 * 사용자가 결제를 완료한 후 서버에서 최종 승인
 */
async function handlePaymentConfirm(
  data: PaymentConfirmRequest,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<Response> {
  const { paymentKey, orderId, amount } = data

  // 주문 검증
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', userId)
    .single()

  if (orderError || !order) {
    return errors.notFound('주문')
  }

  // 금액 검증
  if (order.total_amount !== amount) {
    return errors.paymentError('결제 금액이 일치하지 않습니다.')
  }

  // 토스페이먼츠 결제 승인 API 호출
  const authString = btoa(`${TOSS_SECRET_KEY}:`)
  const confirmResponse = await fetch(`${TOSS_API_URL}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount,
    }),
  })

  const confirmResult = await confirmResponse.json()

  if (!confirmResponse.ok) {
    console.error('Toss confirm error:', confirmResult)

    // 결제 실패 상태 업데이트
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        metadata: {
          error: confirmResult,
        },
      })
      .eq('order_id', orderId)

    return errors.paymentError(
      confirmResult.message || '결제 승인에 실패했습니다.',
      confirmResult
    )
  }

  // 결제 성공 - Payment 업데이트
  await supabase
    .from('payments')
    .update({
      payment_key: paymentKey,
      status: 'completed',
      approved_at: new Date().toISOString(),
      metadata: {
        toss_response: confirmResult,
      },
    })
    .eq('order_id', orderId)

  // 주문 상태 업데이트
  await supabase
    .from('orders')
    .update({
      status: 'paid',
      payment_method: 'toss',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  // 장바구니 비우기
  await supabase.from('carts').delete().eq('user_id', userId)

  return successResponse({
    orderId,
    paymentKey,
    amount: confirmResult.totalAmount,
    status: 'completed',
    approvedAt: confirmResult.approvedAt,
    method: confirmResult.method,
    receipt: confirmResult.receipt?.url,
  })
}

/**
 * 결제 취소
 */
async function handlePaymentCancel(
  data: PaymentCancelRequest,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<Response> {
  const { paymentKey, cancelReason } = data

  // 결제 정보 확인
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*, orders(*)')
    .eq('payment_key', paymentKey)
    .single()

  if (paymentError || !payment) {
    return errors.notFound('결제')
  }

  // 본인 주문인지 확인
  if (payment.orders.user_id !== userId) {
    return errors.forbidden()
  }

  // 토스페이먼츠 결제 취소 API 호출
  const authString = btoa(`${TOSS_SECRET_KEY}:`)
  const cancelResponse = await fetch(
    `${TOSS_API_URL}/payments/${paymentKey}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancelReason,
      }),
    }
  )

  const cancelResult = await cancelResponse.json()

  if (!cancelResponse.ok) {
    console.error('Toss cancel error:', cancelResult)
    return errors.paymentError(
      cancelResult.message || '결제 취소에 실패했습니다.',
      cancelResult
    )
  }

  // 결제 상태 업데이트
  await supabase
    .from('payments')
    .update({
      status: 'cancelled',
      metadata: {
        cancel_reason: cancelReason,
        toss_cancel_response: cancelResult,
      },
    })
    .eq('payment_key', paymentKey)

  // 주문 상태 업데이트
  await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.order_id)

  return successResponse({
    paymentKey,
    status: 'cancelled',
    cancelReason,
    canceledAt: cancelResult.cancels?.[0]?.canceledAt,
  })
}
