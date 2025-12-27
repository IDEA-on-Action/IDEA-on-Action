/**
 * 구독 관리 핸들러
 * Wave 3: 정기결제 구독 생성/관리/취소
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const subscription = new Hono<AppType>();

// 토스페이먼츠 API 기본 URL
const TOSS_API_URL = 'https://api.tosspayments.com';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  billing_key: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: number;
}

// 토스페이먼츠 API 호출
async function callTossAPI(
  endpoint: string,
  method: string,
  secretKey: string,
  body?: unknown
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const authHeader = btoa(`${secretKey}:`);

  try {
    const response = await fetch(`${TOSS_API_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json() as { message?: string };

    if (!response.ok) {
      return { ok: false, error: data.message || '결제 처리 중 오류가 발생했습니다' };
    }

    return { ok: true, data };
  } catch (error) {
    console.error('토스페이먼츠 API 오류:', error);
    return { ok: false, error: '결제 서버 연결에 실패했습니다' };
  }
}

// 구독 플랜 목록 조회
subscription.get('/plans', async (c) => {
  const db = c.env.DB;

  try {
    const plans = await db
      .prepare(`
        SELECT id, name, description, price, interval, features, is_popular
        FROM subscription_plans
        WHERE is_active = 1
        ORDER BY price ASC
      `)
      .all();

    // features JSON 파싱
    const parsedPlans = plans.results.map((plan: Record<string, unknown>) => ({
      ...plan,
      features: plan.features ? JSON.parse(plan.features as string) : [],
    }));

    return c.json({ plans: parsedPlans });
  } catch (error) {
    console.error('구독 플랜 조회 오류:', error);
    return c.json({ error: '구독 플랜 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 현재 구독 조회
subscription.get('/current', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;

  try {
    const sub = await db
      .prepare(`
        SELECT s.*, sp.name as plan_name, sp.price, sp.interval, sp.features
        FROM subscriptions s
        INNER JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.user_id = ? AND s.status IN ('active', 'past_due')
        ORDER BY s.created_at DESC
        LIMIT 1
      `)
      .bind(auth.userId)
      .first();

    if (!sub) {
      return c.json({ subscription: null });
    }

    return c.json({
      subscription: {
        ...sub,
        features: sub.features ? JSON.parse(sub.features as string) : [],
      },
    });
  } catch (error) {
    console.error('구독 조회 오류:', error);
    return c.json({ error: '구독 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 구독 생성
subscription.post('/', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const body = await c.req.json<{
    plan_id: string;
    billing_key_id: string;
  }>();

  const { plan_id, billing_key_id } = body;

  if (!plan_id || !billing_key_id) {
    return c.json({ error: 'plan_id, billing_key_id는 필수입니다' }, 400);
  }

  try {
    // 기존 활성 구독 확인
    const existingSub = await db
      .prepare("SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active'")
      .bind(auth.userId)
      .first();

    if (existingSub) {
      return c.json({ error: '이미 활성 구독이 있습니다. 먼저 기존 구독을 취소해주세요.' }, 400);
    }

    // 플랜 조회
    const plan = await db
      .prepare('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1')
      .bind(plan_id)
      .first<SubscriptionPlan & { id: string }>();

    if (!plan) {
      return c.json({ error: '유효하지 않은 구독 플랜입니다' }, 404);
    }

    // 빌링키 조회
    const billingKey = await db
      .prepare('SELECT * FROM billing_keys WHERE id = ? AND user_id = ? AND is_active = 1')
      .bind(billing_key_id, auth.userId)
      .first<{ billing_key: string }>();

    if (!billingKey) {
      return c.json({ error: '유효하지 않은 결제 수단입니다' }, 404);
    }

    // 첫 결제 실행
    const orderId = `SUB_${crypto.randomUUID().slice(0, 8)}_${Date.now()}`;
    const customerKey = auth.userId;

    const result = await callTossAPI(
      `/v1/billing/${billingKey.billing_key}`,
      'POST',
      c.env.TOSS_SECRET_KEY,
      {
        customerKey,
        amount: plan.price,
        orderId,
        orderName: `${plan.name} 구독`,
      }
    );

    if (!result.ok) {
      return c.json({ error: result.error }, 400);
    }

    const paymentData = result.data as { paymentKey: string };

    // 구독 기간 계산
    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.interval === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // 구독 생성
    const subscriptionId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO subscriptions (
          id, user_id, plan_id, billing_key_id, status,
          current_period_start, current_period_end, payment_key
        ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
      `)
      .bind(
        subscriptionId,
        auth.userId,
        plan_id,
        billing_key_id,
        now.toISOString(),
        periodEnd.toISOString(),
        paymentData.paymentKey
      )
      .run();

    // 결제 기록 생성
    await db
      .prepare(`
        INSERT INTO payments (
          id, order_id, user_id, payment_key, amount, status, subscription_id
        ) VALUES (?, ?, ?, ?, ?, 'completed', ?)
      `)
      .bind(
        crypto.randomUUID(),
        orderId,
        auth.userId,
        paymentData.paymentKey,
        plan.price,
        subscriptionId
      )
      .run();

    return c.json({
      success: true,
      subscription: {
        id: subscriptionId,
        plan_id,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      },
    }, 201);
  } catch (error) {
    console.error('구독 생성 오류:', error);
    return c.json({ error: '구독 생성 중 오류가 발생했습니다' }, 500);
  }
});

// 구독 취소
subscription.post('/:id/cancel', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const subscriptionId = c.req.param('id');
  const body = await c.req.json<{
    cancel_immediately?: boolean;
    reason?: string;
  }>();

  try {
    // 구독 조회
    const sub = await db
      .prepare("SELECT * FROM subscriptions WHERE id = ? AND user_id = ? AND status = 'active'")
      .bind(subscriptionId, auth.userId)
      .first<UserSubscription>();

    if (!sub) {
      return c.json({ error: '유효하지 않은 구독입니다' }, 404);
    }

    if (body.cancel_immediately) {
      // 즉시 취소
      await db
        .prepare(`
          UPDATE subscriptions
          SET status = 'cancelled', cancelled_at = datetime('now'), cancel_reason = ?, updated_at = datetime('now')
          WHERE id = ?
        `)
        .bind(body.reason || null, subscriptionId)
        .run();

      return c.json({
        success: true,
        message: '구독이 즉시 취소되었습니다.',
      });
    } else {
      // 기간 만료 후 취소
      await db
        .prepare(`
          UPDATE subscriptions
          SET cancel_at_period_end = 1, cancel_reason = ?, updated_at = datetime('now')
          WHERE id = ?
        `)
        .bind(body.reason || null, subscriptionId)
        .run();

      return c.json({
        success: true,
        message: `구독이 ${sub.current_period_end}에 취소됩니다.`,
        cancel_at: sub.current_period_end,
      });
    }
  } catch (error) {
    console.error('구독 취소 오류:', error);
    return c.json({ error: '구독 취소 중 오류가 발생했습니다' }, 500);
  }
});

// 구독 재개 (취소 예정 구독)
subscription.post('/:id/resume', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const subscriptionId = c.req.param('id');

  try {
    const result = await db
      .prepare(`
        UPDATE subscriptions
        SET cancel_at_period_end = 0, cancel_reason = NULL, updated_at = datetime('now')
        WHERE id = ? AND user_id = ? AND status = 'active' AND cancel_at_period_end = 1
      `)
      .bind(subscriptionId, auth.userId)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ error: '재개할 수 있는 구독이 없습니다' }, 404);
    }

    return c.json({
      success: true,
      message: '구독이 재개되었습니다.',
    });
  } catch (error) {
    console.error('구독 재개 오류:', error);
    return c.json({ error: '구독 재개 중 오류가 발생했습니다' }, 500);
  }
});

// 플랜 변경
subscription.post('/:id/change-plan', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const subscriptionId = c.req.param('id');
  const body = await c.req.json<{ new_plan_id: string }>();

  if (!body.new_plan_id) {
    return c.json({ error: 'new_plan_id는 필수입니다' }, 400);
  }

  try {
    // 현재 구독 조회
    const sub = await db
      .prepare(`
        SELECT s.*, sp.price as current_price
        FROM subscriptions s
        INNER JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.id = ? AND s.user_id = ? AND s.status = 'active'
      `)
      .bind(subscriptionId, auth.userId)
      .first<UserSubscription & { current_price: number }>();

    if (!sub) {
      return c.json({ error: '유효하지 않은 구독입니다' }, 404);
    }

    // 새 플랜 조회
    const newPlan = await db
      .prepare('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1')
      .bind(body.new_plan_id)
      .first<SubscriptionPlan & { id: string; price: number }>();

    if (!newPlan) {
      return c.json({ error: '유효하지 않은 구독 플랜입니다' }, 404);
    }

    // 플랜 변경 기록
    await db
      .prepare(`
        UPDATE subscriptions
        SET plan_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(body.new_plan_id, subscriptionId)
      .run();

    // 플랜 변경 로그
    await db
      .prepare(`
        INSERT INTO subscription_changes (id, subscription_id, old_plan_id, new_plan_id, changed_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `)
      .bind(crypto.randomUUID(), subscriptionId, sub.plan_id, body.new_plan_id)
      .run();

    return c.json({
      success: true,
      message: '플랜이 변경되었습니다.',
      new_plan: {
        id: newPlan.id,
        name: newPlan.name,
        price: newPlan.price,
      },
    });
  } catch (error) {
    console.error('플랜 변경 오류:', error);
    return c.json({ error: '플랜 변경 중 오류가 발생했습니다' }, 500);
  }
});

// 구독 결제 수단 변경
subscription.post('/:id/update-payment', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const subscriptionId = c.req.param('id');
  const body = await c.req.json<{ billing_key_id: string }>();

  if (!body.billing_key_id) {
    return c.json({ error: 'billing_key_id는 필수입니다' }, 400);
  }

  try {
    // 빌링키 소유권 확인
    const billingKey = await db
      .prepare('SELECT id FROM billing_keys WHERE id = ? AND user_id = ? AND is_active = 1')
      .bind(body.billing_key_id, auth.userId)
      .first();

    if (!billingKey) {
      return c.json({ error: '유효하지 않은 결제 수단입니다' }, 404);
    }

    const result = await db
      .prepare(`
        UPDATE subscriptions
        SET billing_key_id = ?, updated_at = datetime('now')
        WHERE id = ? AND user_id = ? AND status = 'active'
      `)
      .bind(body.billing_key_id, subscriptionId, auth.userId)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ error: '유효하지 않은 구독입니다' }, 404);
    }

    return c.json({
      success: true,
      message: '결제 수단이 변경되었습니다.',
    });
  } catch (error) {
    console.error('결제 수단 변경 오류:', error);
    return c.json({ error: '결제 수단 변경 중 오류가 발생했습니다' }, 500);
  }
});

// 구독 갱신 처리 (Cron에서 호출)
subscription.post('/renew', requireAdmin, async (c) => {
  const db = c.env.DB;

  try {
    // 갱신 대상 구독 조회 (만료 1일 전)
    const subscriptions = await db
      .prepare(`
        SELECT s.*, bk.billing_key, sp.price, sp.name as plan_name, sp.interval
        FROM subscriptions s
        INNER JOIN billing_keys bk ON s.billing_key_id = bk.id
        INNER JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.status = 'active'
          AND s.cancel_at_period_end = 0
          AND datetime(s.current_period_end) <= datetime('now', '+1 day')
      `)
      .all();

    const results = {
      total: subscriptions.results.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const sub of subscriptions.results as unknown as Array<UserSubscription & {
      billing_key: string;
      price: number;
      plan_name: string;
      interval: string;
    }>) {
      const orderId = `RENEW_${sub.id.slice(0, 8)}_${Date.now()}`;

      const result = await callTossAPI(
        `/v1/billing/${sub.billing_key}`,
        'POST',
        c.env.TOSS_SECRET_KEY,
        {
          customerKey: sub.user_id,
          amount: sub.price,
          orderId,
          orderName: `${sub.plan_name} 구독 갱신`,
        }
      );

      if (result.ok) {
        const paymentData = result.data as { paymentKey: string };

        // 다음 기간 계산
        const newPeriodStart = new Date(sub.current_period_end);
        const newPeriodEnd = new Date(newPeriodStart);
        if (sub.interval === 'monthly') {
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
        } else {
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
        }

        // 구독 업데이트
        await db
          .prepare(`
            UPDATE subscriptions
            SET current_period_start = ?, current_period_end = ?, payment_key = ?, updated_at = datetime('now')
            WHERE id = ?
          `)
          .bind(
            newPeriodStart.toISOString(),
            newPeriodEnd.toISOString(),
            paymentData.paymentKey,
            sub.id
          )
          .run();

        // 결제 기록
        await db
          .prepare(`
            INSERT INTO payments (id, order_id, user_id, payment_key, amount, status, subscription_id)
            VALUES (?, ?, ?, ?, ?, 'completed', ?)
          `)
          .bind(
            crypto.randomUUID(),
            orderId,
            sub.user_id,
            paymentData.paymentKey,
            sub.price,
            sub.id
          )
          .run();

        results.success++;
      } else {
        // 결제 실패
        await db
          .prepare("UPDATE subscriptions SET status = 'past_due', updated_at = datetime('now') WHERE id = ?")
          .bind(sub.id)
          .run();

        results.failed++;
        results.errors.push(`${sub.id}: ${result.error}`);
      }
    }

    return c.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('구독 갱신 오류:', error);
    return c.json({ error: '구독 갱신 처리 중 오류가 발생했습니다' }, 500);
  }
});

// 구독 내역 조회
subscription.get('/history', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;

  try {
    const subscriptions = await db
      .prepare(`
        SELECT s.*, sp.name as plan_name, sp.price, sp.interval
        FROM subscriptions s
        INNER JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
      `)
      .bind(auth.userId)
      .all();

    return c.json({ subscriptions: subscriptions.results });
  } catch (error) {
    console.error('구독 내역 조회 오류:', error);
    return c.json({ error: '구독 내역 조회 중 오류가 발생했습니다' }, 500);
  }
});

export default subscription;
