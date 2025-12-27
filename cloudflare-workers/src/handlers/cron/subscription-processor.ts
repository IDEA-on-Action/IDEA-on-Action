/**
 * 정기결제 처리 Cron 핸들러
 * Cloudflare Workers용
 *
 * Edge Functions process-subscription-payments에서 마이그레이션
 * - 만기 구독 결제 처리
 * - Retry 로직 (지수 백오프)
 * - 연속 실패 시 구독 정지
 * - 만료 구독 처리
 */

import { Hono } from 'hono';
import { AppType, Env } from '../../types';

const subscriptionProcessor = new Hono<AppType>();

/**
 * Cron에서 직접 호출되는 정기결제 처리 함수
 */
export async function processSubscriptions(env: Env): Promise<void> {
  const db = env.DB;
  const today = new Date().toISOString().split('T')[0];

  console.log(`Processing subscriptions for ${today}`);

  try {
    // 결제 대상 구독 조회
    const { results: subscriptions } = await db
      .prepare(`
        SELECT
          s.id, s.user_id, s.plan_id, s.billing_key_id, s.status, s.cancel_at_period_end,
          bk.billing_key, bk.customer_key,
          sp.price, sp.name as plan_name, sp.interval as billing_cycle
        FROM subscriptions s
        INNER JOIN billing_keys bk ON s.billing_key_id = bk.id
        INNER JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.status IN ('active', 'trial')
          AND date(s.next_billing_date) <= date(?)
          AND s.cancel_at_period_end = 0
      `)
      .bind(today)
      .all();

    console.log(`Found ${subscriptions.length} subscriptions due for payment`);

    for (const rawSub of subscriptions) {
      const sub = rawSub as unknown as SubscriptionInfo;

      try {
        // 무료 플랜은 기간만 연장
        if (sub.price === 0) {
          const nextDates = calculateNextDates(sub.billing_cycle);
          await db
            .prepare(`
              UPDATE subscriptions
              SET status = 'active',
                  current_period_start = datetime('now'),
                  current_period_end = ?,
                  next_billing_date = ?,
                  updated_at = datetime('now')
              WHERE id = ?
            `)
            .bind(nextDates.current_period_end, nextDates.next_billing_date, sub.id)
            .run();
          continue;
        }

        // 결제 실행
        const orderId = `sub_${sub.id.slice(0, 8)}_${Date.now()}`;
        const paymentResult = await processPayment(sub, orderId, env.TOSS_SECRET_KEY);

        if (paymentResult.success && paymentResult.data) {
          const nextDates = calculateNextDates(sub.billing_cycle);

          // 결제 기록 및 구독 업데이트
          await db
            .prepare(`
              INSERT INTO subscription_payments (
                id, subscription_id, amount, status, payment_key, order_id, paid_at, metadata, created_at
              ) VALUES (?, ?, ?, 'success', ?, ?, datetime('now'), ?, datetime('now'))
            `)
            .bind(
              crypto.randomUUID(),
              sub.id,
              sub.price,
              paymentResult.data.paymentKey,
              orderId,
              JSON.stringify(paymentResult.data)
            )
            .run();

          await db
            .prepare(`
              UPDATE subscriptions
              SET status = 'active',
                  current_period_start = datetime('now'),
                  current_period_end = ?,
                  next_billing_date = ?,
                  updated_at = datetime('now')
              WHERE id = ?
            `)
            .bind(nextDates.current_period_end, nextDates.next_billing_date, sub.id)
            .run();

          console.log(`✅ Payment successful for ${sub.id}: ₩${sub.price.toLocaleString()}`);
        } else {
          // 실패 처리
          const errorData = paymentResult.error || { code: 'UNKNOWN', message: 'Unknown error' };

          await db
            .prepare(`
              INSERT INTO subscription_payments (
                id, subscription_id, amount, status, order_id, error_code, error_message, metadata, created_at
              ) VALUES (?, ?, ?, 'failed', ?, ?, ?, ?, datetime('now'))
            `)
            .bind(
              crypto.randomUUID(),
              sub.id,
              sub.price,
              orderId,
              errorData.code || 'UNKNOWN',
              errorData.message,
              JSON.stringify(errorData)
            )
            .run();

          // 연속 실패 확인
          const { results: recentPayments } = await db
            .prepare(`
              SELECT status FROM subscription_payments
              WHERE subscription_id = ?
              ORDER BY created_at DESC
              LIMIT 3
            `)
            .bind(sub.id)
            .all();

          const consecutiveFailures = (recentPayments as Array<{ status: string }>).filter(p => p.status === 'failed').length;

          if (consecutiveFailures >= 3) {
            await db
              .prepare("UPDATE subscriptions SET status = 'suspended', updated_at = datetime('now') WHERE id = ?")
              .bind(sub.id)
              .run();
            console.log(`⚠️ Subscription ${sub.id} suspended after 3 consecutive failures`);
          } else {
            console.log(`❌ Payment failed for ${sub.id}: ${errorData.message} (${consecutiveFailures}/3)`);
          }
        }
      } catch (err) {
        console.error(`Error processing subscription ${sub.id}:`, err);
      }
    }

    // 만료 구독 처리
    const { results: expiredSubs } = await db
      .prepare(`
        SELECT id FROM subscriptions
        WHERE cancel_at_period_end = 1
          AND date(current_period_end) < date(?)
          AND status != 'expired'
      `)
      .bind(today)
      .all();

    for (const expiredSub of expiredSubs as Array<{ id: string }>) {
      await db
        .prepare("UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE id = ?")
        .bind(expiredSub.id)
        .run();
    }

    if (expiredSubs.length > 0) {
      console.log(`Expired ${expiredSubs.length} subscriptions`);
    }

    console.log(`Subscription processing completed`);
  } catch (error) {
    console.error('Subscription processing error:', error);
    throw error;
  }
}

// 토스페이먼츠 API 설정
const TOSS_PAYMENTS_API_URL = 'https://api.tosspayments.com/v1/billing';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// 타입 정의
interface SubscriptionInfo {
  id: string;
  user_id: string;
  plan_id: string;
  billing_key_id: string;
  status: string;
  cancel_at_period_end: number;
  billing_key: string;
  customer_key: string;
  price: number;
  plan_name: string;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
}

interface TossPaymentResult {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  approvedAt: string;
  method?: string;
  card?: {
    issuerCode: string;
    number: string;
    cardType: string;
  };
}

interface TossPaymentError {
  code?: string;
  message: string;
}

interface PaymentProcessResult {
  success: boolean;
  data?: TossPaymentResult;
  error?: TossPaymentError;
}

// 토스페이먼츠 결제 처리 (retry 로직 포함)
async function processPayment(
  sub: SubscriptionInfo,
  orderId: string,
  secretKey: string,
  retryCount = 0
): Promise<PaymentProcessResult> {
  const basicAuth = btoa(secretKey + ':');

  try {
    const response = await fetch(`${TOSS_PAYMENTS_API_URL}/${sub.billing_key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: sub.price,
        customerKey: sub.customer_key || sub.user_id,
        orderId: orderId,
        orderName: `${sub.plan_name} 정기결제`,
        customerEmail: '',
        taxFreeAmount: 0,
      }),
    });

    const data = await response.json() as TossPaymentResult | TossPaymentError;

    if (!response.ok) {
      // 재시도 가능한 에러인지 확인 (5xx 서버 에러, 429 Rate Limit)
      const isRetryable = response.status >= 500 || response.status === 429;

      if (isRetryable && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.log(`Payment failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return processPayment(sub, orderId, secretKey, retryCount + 1);
      }

      return { success: false, error: data as TossPaymentError };
    }

    return { success: true, data: data as TossPaymentResult };
  } catch (error) {
    // 네트워크 에러 - retry
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`Network error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return processPayment(sub, orderId, secretKey, retryCount + 1);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: { message: errorMessage, code: 'NETWORK_ERROR' } };
  }
}

// 다음 결제일 계산
function calculateNextDates(cycle: 'monthly' | 'quarterly' | 'yearly'): {
  current_period_end: string;
  next_billing_date: string;
} {
  const now = new Date();
  const nextDate = new Date(now);

  switch (cycle) {
    case 'monthly':
      nextDate.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(now.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(now.getFullYear() + 1);
      break;
  }

  return {
    current_period_end: nextDate.toISOString(),
    next_billing_date: nextDate.toISOString().split('T')[0],
  };
}

// POST /cron/subscriptions/process - 정기결제 처리
subscriptionProcessor.post('/process', async (c) => {
  const db = c.env.DB;

  // CRON_SECRET 검증
  const cronSecret = c.env.INTERNAL_API_KEY;
  const authHeader = c.req.header('Authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized attempt to execute cron job');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. 결제 대상 구독 조회
    const { results: subscriptions } = await db
      .prepare(`
        SELECT
          s.id, s.user_id, s.plan_id, s.billing_key_id, s.status, s.cancel_at_period_end,
          bk.billing_key, bk.customer_key,
          sp.price, sp.name as plan_name, sp.interval as billing_cycle
        FROM subscriptions s
        INNER JOIN billing_keys bk ON s.billing_key_id = bk.id
        INNER JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.status IN ('active', 'trial')
          AND date(s.next_billing_date) <= date(?)
          AND s.cancel_at_period_end = 0
      `)
      .bind(today)
      .all();

    console.log(`Found ${subscriptions.length} subscriptions due for payment`);

    const results: Array<{
      id: string;
      status: string;
      orderId?: string;
      error?: string;
    }> = [];

    // 2. 각 구독 처리
    for (const rawSub of subscriptions) {
      const sub = rawSub as unknown as SubscriptionInfo;

      try {
        // 무료 플랜은 기간만 연장
        if (sub.price === 0) {
          const nextDates = calculateNextDates(sub.billing_cycle);

          await db
            .prepare(`
              UPDATE subscriptions
              SET status = 'active',
                  current_period_start = datetime('now'),
                  current_period_end = ?,
                  next_billing_date = ?,
                  updated_at = datetime('now')
              WHERE id = ?
            `)
            .bind(nextDates.current_period_end, nextDates.next_billing_date, sub.id)
            .run();

          results.push({ id: sub.id, status: 'extended_free' });
          continue;
        }

        // 결제 실행
        const orderId = `sub_${sub.id.slice(0, 8)}_${Date.now()}`;
        const paymentResult = await processPayment(sub, orderId, c.env.TOSS_SECRET_KEY);

        if (paymentResult.success && paymentResult.data) {
          // 결제 성공 처리
          const nextDates = calculateNextDates(sub.billing_cycle);

          // 결제 기록 저장
          await db
            .prepare(`
              INSERT INTO subscription_payments (
                id, subscription_id, amount, status, payment_key, order_id, paid_at, metadata, created_at
              ) VALUES (?, ?, ?, 'success', ?, ?, datetime('now'), ?, datetime('now'))
            `)
            .bind(
              crypto.randomUUID(),
              sub.id,
              sub.price,
              paymentResult.data.paymentKey,
              orderId,
              JSON.stringify(paymentResult.data)
            )
            .run();

          // 구독 업데이트
          await db
            .prepare(`
              UPDATE subscriptions
              SET status = 'active',
                  current_period_start = datetime('now'),
                  current_period_end = ?,
                  next_billing_date = ?,
                  updated_at = datetime('now')
              WHERE id = ?
            `)
            .bind(nextDates.current_period_end, nextDates.next_billing_date, sub.id)
            .run();

          // 활동 로그
          await db
            .prepare(`
              INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
              VALUES (?, ?, 'subscription_payment_success', 'subscription', ?, ?, datetime('now'))
            `)
            .bind(
              crypto.randomUUID(),
              sub.user_id,
              sub.id,
              JSON.stringify({
                amount: sub.price,
                plan_name: sub.plan_name,
                order_id: orderId,
                payment_key: paymentResult.data.paymentKey,
              })
            )
            .run();

          console.log(`✅ Payment successful for ${sub.id}: ₩${sub.price.toLocaleString()}`);
          results.push({ id: sub.id, status: 'success', orderId });
        } else {
          // 결제 실패 처리
          const errorData = paymentResult.error || { code: 'UNKNOWN', message: 'Unknown error' };

          // 실패 기록 저장
          await db
            .prepare(`
              INSERT INTO subscription_payments (
                id, subscription_id, amount, status, order_id, error_code, error_message, metadata, created_at
              ) VALUES (?, ?, ?, 'failed', ?, ?, ?, ?, datetime('now'))
            `)
            .bind(
              crypto.randomUUID(),
              sub.id,
              sub.price,
              orderId,
              errorData.code || 'UNKNOWN',
              errorData.message,
              JSON.stringify(errorData)
            )
            .run();

          // 연속 실패 횟수 확인
          const { results: recentPayments } = await db
            .prepare(`
              SELECT status FROM subscription_payments
              WHERE subscription_id = ?
              ORDER BY created_at DESC
              LIMIT 3
            `)
            .bind(sub.id)
            .all();

          const consecutiveFailures = (recentPayments as Array<{ status: string }>).filter(p => p.status === 'failed').length;

          if (consecutiveFailures >= 3) {
            // 3회 연속 실패 시 구독 정지
            await db
              .prepare(`
                UPDATE subscriptions
                SET status = 'suspended', updated_at = datetime('now')
                WHERE id = ?
              `)
              .bind(sub.id)
              .run();

            // 정지 로그
            await db
              .prepare(`
                INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
                VALUES (?, ?, 'subscription_suspended', 'subscription', ?, ?, datetime('now'))
              `)
              .bind(
                crypto.randomUUID(),
                sub.user_id,
                sub.id,
                JSON.stringify({
                  reason: 'consecutive_payment_failures',
                  failure_count: consecutiveFailures,
                  last_error: errorData.message,
                })
              )
              .run();

            console.log(`⚠️ Subscription ${sub.id} suspended after 3 consecutive payment failures`);
          } else {
            // 실패 로그
            await db
              .prepare(`
                INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
                VALUES (?, ?, 'subscription_payment_failed', 'subscription', ?, ?, datetime('now'))
              `)
              .bind(
                crypto.randomUUID(),
                sub.user_id,
                sub.id,
                JSON.stringify({
                  amount: sub.price,
                  plan_name: sub.plan_name,
                  order_id: orderId,
                  error_code: errorData.code,
                  error_message: errorData.message,
                  consecutive_failures: consecutiveFailures,
                })
              )
              .run();

            console.log(`❌ Payment failed for ${sub.id}: ${errorData.message} (${consecutiveFailures}/3 failures)`);
          }

          results.push({ id: sub.id, status: 'failed', error: errorData.message });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing subscription ${sub.id}:`, err);
        results.push({ id: sub.id, status: 'error', error: errorMessage });
      }
    }

    // 3. 만료 구독 처리 (cancel_at_period_end이고 기간이 지난 구독)
    const { results: expiredSubs } = await db
      .prepare(`
        SELECT id FROM subscriptions
        WHERE cancel_at_period_end = 1
          AND date(current_period_end) < date(?)
          AND status != 'expired'
      `)
      .bind(today)
      .all();

    if (expiredSubs.length > 0) {
      const expiredIds = (expiredSubs as Array<{ id: string }>).map(s => s.id);

      for (const expiredId of expiredIds) {
        await db
          .prepare("UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE id = ?")
          .bind(expiredId)
          .run();
      }

      console.log(`Expired ${expiredIds.length} subscriptions`);
    }

    return c.json({
      message: 'Subscription processing completed',
      processed: results.length,
      expired: expiredSubs.length,
      results,
    });
  } catch (error) {
    console.error('Subscription processing error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// GET /cron/subscriptions/status - 구독 처리 상태 조회
subscriptionProcessor.get('/status', async (c) => {
  const db = c.env.DB;

  try {
    const today = new Date().toISOString().split('T')[0];

    // 오늘 결제 대상 구독 수
    const pending = await db
      .prepare(`
        SELECT COUNT(*) as count FROM subscriptions
        WHERE status IN ('active', 'trial')
          AND date(next_billing_date) <= date(?)
          AND cancel_at_period_end = 0
      `)
      .bind(today)
      .first<{ count: number }>();

    // 상태별 구독 수
    const stats = await db
      .prepare(`
        SELECT status, COUNT(*) as count
        FROM subscriptions
        GROUP BY status
      `)
      .all();

    // 오늘 처리된 결제 수
    const todayPayments = await db
      .prepare(`
        SELECT status, COUNT(*) as count
        FROM subscription_payments
        WHERE date(created_at) = date(?)
        GROUP BY status
      `)
      .bind(today)
      .all();

    return c.json({
      pendingPayments: pending?.count || 0,
      subscriptionStats: stats.results,
      todayPayments: todayPayments.results,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({ error: 'Status check failed' }, 500);
  }
});

export default subscriptionProcessor;
