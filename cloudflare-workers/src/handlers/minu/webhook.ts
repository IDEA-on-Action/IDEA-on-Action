/**
 * Minu Webhook 핸들러
 * Cloudflare Workers용
 *
 * Supabase Edge Functions minu-webhook에서 마이그레이션
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import {
  type MinuService,
  type MinuWebhookEvent,
  type MinuWebhookEventType,
  type MinuSubscriptionEventData,
  type MinuPaymentEventData,
  type MinuUsageEventData,
  type MinuUserEventData,
  VALID_MINU_SERVICES,
} from '../../lib/minu/types';
import { verifyWebhookSignature } from '../../lib/minu/client';

const webhook = new Hono<AppType>();

// ============================================================================
// POST /minu/webhook - 웹훅 수신
// ============================================================================

webhook.post('/', async (c) => {
  const db = c.env.DB;

  // 헤더에서 정보 추출
  const serviceId = c.req.header('x-service-id') as MinuService | null;
  const signatureHeaderName = serviceId ? `x-minu-${serviceId}-signature` : 'x-webhook-signature';
  const signature = c.req.header(signatureHeaderName) || c.req.header('x-webhook-signature');
  const timestamp = c.req.header('x-webhook-timestamp');

  // 서비스 ID 검증
  if (!serviceId || !VALID_MINU_SERVICES.includes(serviceId)) {
    console.error('Invalid or missing X-Service-Id:', serviceId);
    return c.json({ error: { code: 'invalid_service', message: '유효하지 않은 서비스입니다.' } }, 400);
  }

  // 요청 본문 읽기
  const payload = await c.req.text();

  // 웹훅 시크릿 조회
  const secretEnvName = `MINU_${serviceId.toUpperCase()}_WEBHOOK_SECRET` as `MINU_${string}_WEBHOOK_SECRET`;
  const secret = c.env[secretEnvName] || c.env.MINU_WEBHOOK_SECRET;

  if (!secret) {
    console.error(`Webhook secret not configured: ${secretEnvName}`);
    return c.json({ error: { code: 'config_error', message: '서버 설정 오류' } }, 500);
  }

  // 서명 검증
  const verifyResult = await verifyWebhookSignature(payload, signature || null, timestamp || null, secret);
  if (!verifyResult.valid) {
    console.error('Webhook signature verification failed:', verifyResult.error);
    return c.json({ error: { code: 'invalid_signature', message: '서명 검증 실패' } }, 401);
  }

  // 페이로드 파싱
  let event: MinuWebhookEvent;
  try {
    event = JSON.parse(payload);
  } catch {
    return c.json({ error: { code: 'invalid_json', message: '유효하지 않은 JSON입니다.' } }, 400);
  }

  // 이벤트 타입 검증
  if (!event.type || !event.data) {
    return c.json({ error: { code: 'invalid_event', message: 'type과 data가 필요합니다.' } }, 400);
  }

  console.log(`Processing webhook event: ${event.type} from ${serviceId}`);

  try {
    // service_events 테이블에 이벤트 저장
    await db
      .prepare(`
        INSERT INTO service_events (id, service_id, event_type, payload, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `)
      .bind(
        crypto.randomUUID(),
        serviceId,
        event.type,
        JSON.stringify({
          ...event.data,
          event_id: event.id,
          timestamp: event.timestamp,
          service: event.service || serviceId,
        })
      )
      .run();

    // 이벤트 타입별 처리
    switch (event.type) {
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionEvent(db, event.type, event.data as MinuSubscriptionEventData, serviceId);
        break;

      case 'subscription.cancelled':
      case 'subscription.expired':
        await handleSubscriptionCancellation(db, event.type, event.data as MinuSubscriptionEventData, serviceId);
        break;

      case 'payment.succeeded':
        await handlePaymentSuccess(db, event.data as MinuPaymentEventData, serviceId);
        break;

      case 'payment.failed':
        await handlePaymentFailure(db, event.data as MinuPaymentEventData, serviceId);
        break;

      case 'usage.limit_reached':
      case 'usage.warning':
        await handleUsageEvent(db, event.type, event.data as MinuUsageEventData, serviceId);
        break;

      case 'user.updated':
        await handleUserUpdate(db, event.data as MinuUserEventData);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // 성공 응답
    return c.json({
      received: true,
      event_id: event.id,
      type: event.type,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return c.json(
      { error: { code: 'internal_error', message: error instanceof Error ? error.message : '서버 오류' } },
      500
    );
  }
});

// ============================================================================
// 이벤트 핸들러 함수
// ============================================================================

async function handleSubscriptionEvent(
  db: D1Database,
  eventType: MinuWebhookEventType,
  data: MinuSubscriptionEventData,
  service: MinuService
): Promise<void> {
  console.log(`Handling ${eventType}:`, data);

  // Minu user_id로 프로필 찾기
  const profile = await db
    .prepare("SELECT id FROM profiles WHERE id = ? OR email = ?")
    .bind(data.user_id, data.user_id)
    .first<{ id: string }>();

  if (!profile) {
    console.warn(`User not found for Minu user_id: ${data.user_id}`);
    return;
  }

  // 구독 정보 업데이트
  await db
    .prepare(`
      INSERT INTO minu_subscriptions (id, user_id, service, plan_id, plan_name, status,
        minu_subscription_id, synced_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id, service) DO UPDATE SET
        plan_id = excluded.plan_id,
        plan_name = excluded.plan_name,
        status = excluded.status,
        minu_subscription_id = excluded.minu_subscription_id,
        synced_at = datetime('now')
    `)
    .bind(
      crypto.randomUUID(),
      profile.id,
      service,
      data.plan_id,
      data.plan_name,
      data.status,
      data.subscription_id
    )
    .run();

  // 알림 생성
  await db
    .prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, metadata, created_at)
      VALUES (?, ?, 'subscription', ?, ?, ?, datetime('now'))
    `)
    .bind(
      crypto.randomUUID(),
      profile.id,
      eventType === 'subscription.created'
        ? `${service.toUpperCase()} 구독이 시작되었습니다`
        : `${service.toUpperCase()} 구독이 업데이트되었습니다`,
      `플랜: ${data.plan_name}`,
      JSON.stringify({ service, plan: data.plan_name, status: data.status })
    )
    .run();
}

async function handleSubscriptionCancellation(
  db: D1Database,
  eventType: MinuWebhookEventType,
  data: MinuSubscriptionEventData,
  service: MinuService
): Promise<void> {
  console.log(`Handling ${eventType}:`, data);

  const profile = await db
    .prepare("SELECT id FROM profiles WHERE id = ? OR email = ?")
    .bind(data.user_id, data.user_id)
    .first<{ id: string }>();

  if (!profile) {
    console.warn(`User not found for Minu user_id: ${data.user_id}`);
    return;
  }

  // 구독 상태 업데이트
  await db
    .prepare(`
      UPDATE minu_subscriptions
      SET status = ?, synced_at = datetime('now')
      WHERE user_id = ? AND service = ?
    `)
    .bind(
      eventType === 'subscription.cancelled' ? 'cancelled' : 'expired',
      profile.id,
      service
    )
    .run();

  // 알림 생성
  await db
    .prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, metadata, created_at)
      VALUES (?, ?, 'subscription', ?, ?, ?, datetime('now'))
    `)
    .bind(
      crypto.randomUUID(),
      profile.id,
      eventType === 'subscription.cancelled'
        ? `${service.toUpperCase()} 구독이 취소되었습니다`
        : `${service.toUpperCase()} 구독이 만료되었습니다`,
      data.cancellation_reason || '구독이 종료되었습니다.',
      JSON.stringify({ service, reason: data.cancellation_reason })
    )
    .run();
}

async function handlePaymentSuccess(
  db: D1Database,
  data: MinuPaymentEventData,
  service: MinuService
): Promise<void> {
  console.log('Handling payment success:', data);

  const profile = await db
    .prepare("SELECT id FROM profiles WHERE id = ? OR email = ?")
    .bind(data.user_id, data.user_id)
    .first<{ id: string }>();

  if (!profile) return;

  // 결제 기록 저장
  await db
    .prepare(`
      INSERT INTO payments (id, user_id, amount, currency, status, payment_method, provider_payment_id, metadata, created_at)
      VALUES (?, ?, ?, ?, 'completed', 'minu', ?, ?, datetime('now'))
    `)
    .bind(
      crypto.randomUUID(),
      profile.id,
      data.amount,
      data.currency,
      data.payment_id,
      JSON.stringify({ service })
    )
    .run();

  // 알림 생성
  await db
    .prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, metadata, created_at)
      VALUES (?, ?, 'payment', '결제가 완료되었습니다', ?, ?, datetime('now'))
    `)
    .bind(
      crypto.randomUUID(),
      profile.id,
      `${data.amount.toLocaleString()} ${data.currency}`,
      JSON.stringify({ service, amount: data.amount, currency: data.currency })
    )
    .run();
}

async function handlePaymentFailure(
  db: D1Database,
  data: MinuPaymentEventData,
  service: MinuService
): Promise<void> {
  console.log('Handling payment failure:', data);

  const profile = await db
    .prepare("SELECT id FROM profiles WHERE id = ? OR email = ?")
    .bind(data.user_id, data.user_id)
    .first<{ id: string }>();

  if (!profile) return;

  // 결제 기록 저장
  await db
    .prepare(`
      INSERT INTO payments (id, user_id, amount, currency, status, payment_method, provider_payment_id, failure_reason, metadata, created_at)
      VALUES (?, ?, ?, ?, 'failed', 'minu', ?, ?, ?, datetime('now'))
    `)
    .bind(
      crypto.randomUUID(),
      profile.id,
      data.amount,
      data.currency,
      data.payment_id,
      data.failure_reason || null,
      JSON.stringify({ service })
    )
    .run();

  // 알림 생성 (중요)
  await db
    .prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, metadata, created_at)
      VALUES (?, ?, 'payment', '결제에 실패했습니다', ?, ?, datetime('now'))
    `)
    .bind(
      crypto.randomUUID(),
      profile.id,
      data.failure_reason || '결제 처리 중 오류가 발생했습니다.',
      JSON.stringify({ service, reason: data.failure_reason })
    )
    .run();
}

async function handleUsageEvent(
  db: D1Database,
  eventType: MinuWebhookEventType,
  data: MinuUsageEventData,
  service: MinuService
): Promise<void> {
  console.log(`Handling ${eventType}:`, data);

  const profile = await db
    .prepare("SELECT id FROM profiles WHERE id = ? OR email = ?")
    .bind(data.user_id, data.user_id)
    .first<{ id: string }>();

  if (!profile) return;

  const isLimitReached = eventType === 'usage.limit_reached';

  // 알림 생성
  await db
    .prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, metadata, created_at)
      VALUES (?, ?, 'usage', ?, ?, ?, datetime('now'))
    `)
    .bind(
      crypto.randomUUID(),
      profile.id,
      isLimitReached
        ? `${service.toUpperCase()} 사용량 한도 도달`
        : `${service.toUpperCase()} 사용량 경고`,
      isLimitReached
        ? `${data.usage_type} 사용량이 한도에 도달했습니다.`
        : `${data.usage_type} 사용량이 ${data.percentage}%에 도달했습니다.`,
      JSON.stringify({
        service,
        usage_type: data.usage_type,
        current: data.current,
        limit: data.limit,
        percentage: data.percentage,
      })
    )
    .run();
}

async function handleUserUpdate(db: D1Database, data: MinuUserEventData): Promise<void> {
  console.log('Handling user update:', data);

  const profile = await db
    .prepare("SELECT id, email FROM profiles WHERE id = ? OR email = ?")
    .bind(data.user_id, data.user_id)
    .first<{ id: string; email: string }>();

  if (!profile) return;

  // 이메일 변경 시 프로필 업데이트
  if (data.email && data.email !== profile.email) {
    await db
      .prepare("UPDATE profiles SET email = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(data.email, profile.id)
      .run();
  }
}

export default webhook;
