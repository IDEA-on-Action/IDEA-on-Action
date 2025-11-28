/**
 * Payment Webhook Edge Function
 *
 * 토스페이먼츠 웹훅 수신
 * - 결제 상태 변경 알림
 * - 가상계좌 입금 알림
 *
 * @see https://docs.tosspayments.com/guides/webhook
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { successResponse, errors } from '../_shared/response.ts'
import { createHmac } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

// 환경 변수
const TOSS_WEBHOOK_SECRET = Deno.env.get('TOSS_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 웹훅 이벤트 타입
type WebhookEventType =
  | 'PAYMENT_STATUS_CHANGED'
  | 'DEPOSIT_CALLBACK'
  | 'VIRTUAL_ACCOUNT_ISSUED'

interface WebhookPayload {
  eventType: WebhookEventType
  createdAt: string
  data: {
    paymentKey: string
    orderId: string
    status: string
    secret?: string
    // 가상계좌 입금 시
    depositInfo?: {
      amount: number
      depositorName: string
      depositedAt: string
    }
  }
}

serve(async (req: Request) => {
  // POST만 허용
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // 시그니처 검증
    const signature = req.headers.get('Toss-Signature')
    const timestamp = req.headers.get('Toss-Timestamp')
    const body = await req.text()

    if (!signature || !timestamp) {
      console.error('Missing signature or timestamp')
      return errors.unauthorized()
    }

    // HMAC 검증
    const isValid = await verifySignature(body, signature, timestamp)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return errors.unauthorized()
    }

    const payload: WebhookPayload = JSON.parse(body)
    console.log('Webhook received:', payload.eventType, payload.data.orderId)

    // Supabase 클라이언트
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 중복 처리 방지 (Idempotency)
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('payment_key', payload.data.paymentKey)
      .eq('event_type', payload.eventType)
      .eq('created_at', payload.createdAt)
      .single()

    if (existingEvent) {
      console.log('Duplicate webhook event, skipping')
      return successResponse({ message: 'Already processed' })
    }

    // 이벤트 기록
    await supabase.from('webhook_events').insert({
      payment_key: payload.data.paymentKey,
      order_id: payload.data.orderId,
      event_type: payload.eventType,
      status: payload.data.status,
      payload: payload,
      created_at: payload.createdAt,
    })

    // 이벤트 타입별 처리
    switch (payload.eventType) {
      case 'PAYMENT_STATUS_CHANGED':
        await handlePaymentStatusChanged(payload, supabase)
        break

      case 'DEPOSIT_CALLBACK':
        await handleDepositCallback(payload, supabase)
        break

      case 'VIRTUAL_ACCOUNT_ISSUED':
        await handleVirtualAccountIssued(payload, supabase)
        break

      default:
        console.log('Unknown event type:', payload.eventType)
    }

    return successResponse({ message: 'Webhook processed' })
  } catch (error) {
    console.error('Webhook error:', error)
    return errors.internalError(
      error instanceof Error ? error.message : 'Webhook 처리 중 오류 발생'
    )
  }
})

/**
 * HMAC-SHA256 시그니처 검증
 */
async function verifySignature(
  body: string,
  signature: string,
  timestamp: string
): Promise<boolean> {
  try {
    const message = `${timestamp}${body}`
    const encoder = new TextEncoder()
    const keyData = encoder.encode(TOSS_WEBHOOK_SECRET)
    const messageData = encoder.encode(message)

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData)
    const signatureArray = new Uint8Array(signatureBuffer)
    const computedSignature = Array.from(signatureArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return computedSignature === signature
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * 결제 상태 변경 처리
 */
async function handlePaymentStatusChanged(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const { paymentKey, orderId, status } = payload.data

  // 상태 매핑
  const statusMap: Record<string, string> = {
    DONE: 'completed',
    CANCELED: 'cancelled',
    PARTIAL_CANCELED: 'partial_cancelled',
    ABORTED: 'failed',
    EXPIRED: 'expired',
  }

  const mappedStatus = statusMap[status] || status.toLowerCase()

  // Payment 업데이트
  await supabase
    .from('payments')
    .update({
      status: mappedStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('payment_key', paymentKey)

  // Order 업데이트
  const orderStatus =
    mappedStatus === 'completed'
      ? 'paid'
      : mappedStatus === 'cancelled'
      ? 'cancelled'
      : 'pending'

  await supabase
    .from('orders')
    .update({
      status: orderStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  console.log(`Payment ${paymentKey} status updated to ${mappedStatus}`)
}

/**
 * 가상계좌 입금 완료 처리
 */
async function handleDepositCallback(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const { paymentKey, orderId, depositInfo } = payload.data

  if (!depositInfo) {
    console.error('Missing deposit info')
    return
  }

  // Payment 업데이트
  await supabase
    .from('payments')
    .update({
      status: 'completed',
      approved_at: depositInfo.depositedAt,
      metadata: {
        deposit_amount: depositInfo.amount,
        depositor_name: depositInfo.depositorName,
        deposited_at: depositInfo.depositedAt,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('payment_key', paymentKey)

  // Order 업데이트
  await supabase
    .from('orders')
    .update({
      status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  console.log(`Virtual account deposit completed for ${paymentKey}`)
}

/**
 * 가상계좌 발급 완료 처리
 */
async function handleVirtualAccountIssued(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const { paymentKey, orderId } = payload.data

  // Payment 업데이트 - 가상계좌 대기 상태
  await supabase
    .from('payments')
    .update({
      status: 'waiting_deposit',
      updated_at: new Date().toISOString(),
    })
    .eq('payment_key', paymentKey)

  // Order 업데이트
  await supabase
    .from('orders')
    .update({
      status: 'awaiting_payment',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  console.log(`Virtual account issued for ${paymentKey}`)
}
