/**
 * Minu Webhook Edge Function
 *
 * Minu 서비스에서 발생하는 이벤트 웹훅을 수신합니다.
 *
 * @endpoint POST /functions/v1/minu-webhook
 * @version 1.0.0
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createResponse, createErrorResponse } from '../_shared/response.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verify.ts'
import type {
  MinuWebhookEvent,
  MinuWebhookEventType,
  MinuSubscriptionEventData,
  MinuPaymentEventData,
  MinuUsageEventData,
  MinuUserEventData,
  MinuService,
} from '../_shared/minu.types.ts'

// Supabase 클라이언트 생성
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405, origin)
  }

  try {
    // 요청 본문 읽기
    const payload = await req.text()

    // 헤더에서 정보 추출
    // 서비스별 서명 헤더: X-Minu-Find-Signature, X-Minu-Frame-Signature 등
    const serviceId = req.headers.get('x-service-id') as MinuService | null
    const signatureHeaderName = serviceId
      ? `x-minu-${serviceId}-signature`
      : 'x-webhook-signature'
    const signature = req.headers.get(signatureHeaderName) || req.headers.get('x-webhook-signature')
    const timestamp = req.headers.get('x-webhook-timestamp')

    // 서비스 ID 검증
    if (!serviceId || !['find', 'frame', 'build', 'keep'].includes(serviceId)) {
      console.error('Invalid or missing X-Service-Id:', serviceId)
      return createErrorResponse('유효하지 않은 서비스입니다.', 400, origin)
    }

    // 웹훅 시크릿 조회
    const secretEnvName = `MINU_${serviceId.toUpperCase()}_WEBHOOK_SECRET`
    const secret = Deno.env.get(secretEnvName) || Deno.env.get('MINU_WEBHOOK_SECRET')

    if (!secret) {
      console.error(`Webhook secret not configured: ${secretEnvName}`)
      return createErrorResponse('서버 설정 오류', 500, origin)
    }

    // 서명 검증
    const verifyResult = await verifyWebhookSignature(payload, signature, timestamp, secret)
    if (!verifyResult.valid) {
      console.error('Webhook signature verification failed:', verifyResult.error)
      return createErrorResponse('서명 검증 실패', 401, origin)
    }

    // 페이로드 파싱
    let event: MinuWebhookEvent
    try {
      event = JSON.parse(payload)
    } catch {
      return createErrorResponse('유효하지 않은 JSON입니다.', 400, origin)
    }

    // 이벤트 타입 검증
    if (!event.type || !event.data) {
      return createErrorResponse('type과 data가 필요합니다.', 400, origin)
    }

    console.log(`Processing webhook event: ${event.type} from ${serviceId}`)

    // service_events 테이블에 이벤트 저장
    await supabase
      .from('service_events')
      .insert({
        service_id: serviceId,
        event_type: event.type,
        payload: event.data,
        metadata: {
          event_id: event.id,
          timestamp: event.timestamp,
          service: event.service || serviceId,
        },
      })

    // 이벤트 타입별 처리
    switch (event.type) {
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionEvent(event.type, event.data as MinuSubscriptionEventData, serviceId)
        break

      case 'subscription.cancelled':
      case 'subscription.expired':
        await handleSubscriptionCancellation(event.type, event.data as MinuSubscriptionEventData, serviceId)
        break

      case 'payment.succeeded':
        await handlePaymentSuccess(event.data as MinuPaymentEventData, serviceId)
        break

      case 'payment.failed':
        await handlePaymentFailure(event.data as MinuPaymentEventData, serviceId)
        break

      case 'usage.limit_reached':
      case 'usage.warning':
        await handleUsageEvent(event.type, event.data as MinuUsageEventData, serviceId)
        break

      case 'user.updated':
        await handleUserUpdate(event.data as MinuUserEventData, serviceId)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // 성공 응답
    return createResponse({
      received: true,
      event_id: event.id,
      type: event.type,
    }, 200, origin)
  } catch (error) {
    console.error('Webhook processing error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      500,
      origin
    )
  }
})

/**
 * 구독 생성/업데이트 이벤트 처리
 */
async function handleSubscriptionEvent(
  eventType: MinuWebhookEventType,
  data: MinuSubscriptionEventData,
  service: MinuService
): Promise<void> {
  console.log(`Handling ${eventType}:`, data)

  // Minu user_id로 Central Hub 사용자 찾기
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const user = existingUsers?.users?.find(u =>
    u.user_metadata?.minu_id === data.user_id ||
    u.email === data.user_id // fallback: email로 검색
  )

  if (!user) {
    console.warn(`User not found for Minu user_id: ${data.user_id}`)
    return
  }

  // 구독 정보 업데이트
  await supabase.rpc('upsert_minu_subscription', {
    p_user_id: user.id,
    p_service: service,
    p_plan_id: data.plan_id,
    p_plan_name: data.plan_name,
    p_status: data.status,
    p_features: {},
    p_limits: {},
    p_minu_subscription_id: data.subscription_id,
  })

  // 알림 생성
  await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      type: 'subscription',
      title: eventType === 'subscription.created'
        ? `${service.toUpperCase()} 구독이 시작되었습니다`
        : `${service.toUpperCase()} 구독이 업데이트되었습니다`,
      message: `플랜: ${data.plan_name}`,
      metadata: { service, plan: data.plan_name, status: data.status },
    })
}

/**
 * 구독 취소/만료 이벤트 처리
 */
async function handleSubscriptionCancellation(
  eventType: MinuWebhookEventType,
  data: MinuSubscriptionEventData,
  service: MinuService
): Promise<void> {
  console.log(`Handling ${eventType}:`, data)

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const user = existingUsers?.users?.find(u =>
    u.user_metadata?.minu_id === data.user_id
  )

  if (!user) {
    console.warn(`User not found for Minu user_id: ${data.user_id}`)
    return
  }

  // 구독 상태 업데이트
  await supabase
    .from('minu_subscriptions')
    .update({
      status: eventType === 'subscription.cancelled' ? 'cancelled' : 'expired',
      synced_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('service', service)

  // 알림 생성
  await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      type: 'subscription',
      title: eventType === 'subscription.cancelled'
        ? `${service.toUpperCase()} 구독이 취소되었습니다`
        : `${service.toUpperCase()} 구독이 만료되었습니다`,
      message: data.cancellation_reason || '구독이 종료되었습니다.',
      metadata: { service, reason: data.cancellation_reason },
    })
}

/**
 * 결제 성공 이벤트 처리
 */
async function handlePaymentSuccess(
  data: MinuPaymentEventData,
  service: MinuService
): Promise<void> {
  console.log('Handling payment success:', data)

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const user = existingUsers?.users?.find(u =>
    u.user_metadata?.minu_id === data.user_id
  )

  if (!user) return

  // 결제 기록 저장
  await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      amount: data.amount,
      currency: data.currency,
      status: 'completed',
      payment_method: 'minu',
      provider_payment_id: data.payment_id,
      metadata: { service },
    })

  // 알림 생성
  await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      type: 'payment',
      title: '결제가 완료되었습니다',
      message: `${data.amount.toLocaleString()} ${data.currency}`,
      metadata: { service, amount: data.amount, currency: data.currency },
    })
}

/**
 * 결제 실패 이벤트 처리
 */
async function handlePaymentFailure(
  data: MinuPaymentEventData,
  service: MinuService
): Promise<void> {
  console.log('Handling payment failure:', data)

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const user = existingUsers?.users?.find(u =>
    u.user_metadata?.minu_id === data.user_id
  )

  if (!user) return

  // 결제 기록 저장
  await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      amount: data.amount,
      currency: data.currency,
      status: 'failed',
      payment_method: 'minu',
      provider_payment_id: data.payment_id,
      failure_reason: data.failure_reason,
      metadata: { service },
    })

  // 알림 생성 (중요)
  await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      type: 'payment',
      title: '결제에 실패했습니다',
      message: data.failure_reason || '결제 처리 중 오류가 발생했습니다.',
      priority: 'high',
      metadata: { service, reason: data.failure_reason },
    })
}

/**
 * 사용량 이벤트 처리
 */
async function handleUsageEvent(
  eventType: MinuWebhookEventType,
  data: MinuUsageEventData,
  service: MinuService
): Promise<void> {
  console.log(`Handling ${eventType}:`, data)

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const user = existingUsers?.users?.find(u =>
    u.user_metadata?.minu_id === data.user_id
  )

  if (!user) return

  // 알림 생성
  const isLimitReached = eventType === 'usage.limit_reached'

  await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      type: 'usage',
      title: isLimitReached
        ? `${service.toUpperCase()} 사용량 한도 도달`
        : `${service.toUpperCase()} 사용량 경고`,
      message: isLimitReached
        ? `${data.usage_type} 사용량이 한도에 도달했습니다.`
        : `${data.usage_type} 사용량이 ${data.percentage}%에 도달했습니다.`,
      priority: isLimitReached ? 'high' : 'normal',
      metadata: {
        service,
        usage_type: data.usage_type,
        current: data.current,
        limit: data.limit,
        percentage: data.percentage,
      },
    })
}

/**
 * 사용자 업데이트 이벤트 처리
 */
async function handleUserUpdate(
  data: MinuUserEventData,
  _service: MinuService
): Promise<void> {
  console.log('Handling user update:', data)

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const user = existingUsers?.users?.find(u =>
    u.user_metadata?.minu_id === data.user_id ||
    u.email === data.email
  )

  if (!user) return

  // 사용자 메타데이터 업데이트
  if (data.email && data.email !== user.email) {
    await supabase.auth.admin.updateUserById(user.id, {
      email: data.email,
    })
  }
}
