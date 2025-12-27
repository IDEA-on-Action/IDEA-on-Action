/**
 * 토스페이먼츠 결제 핸들러
 * Wave 4: 핵심 비즈니스 - 결제 승인/취소
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const toss = new Hono<AppType>();

// 토스페이먼츠 API 응답 타입
interface TossAPIError {
  code: string;
  message: string;
}

interface TossAPIResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}

// 토스페이먼츠 API 기본 URL
const TOSS_API_URL = 'https://api.tosspayments.com';

interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

interface BillingKeyIssueRequest {
  authKey: string;
  customerKey: string;
}

interface SubscriptionPaymentRequest {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}

// 토스페이먼츠 API 호출 헬퍼
async function callTossAPI(
  endpoint: string,
  method: string,
  secretKey: string,
  body?: unknown
): Promise<TossAPIResponse> {
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

    const data = await response.json() as unknown;

    if (!response.ok) {
      const errorData = data as TossAPIError;
      return { ok: false, error: errorData.message || '결제 처리 중 오류가 발생했습니다' };
    }

    return { ok: true, data };
  } catch (error) {
    console.error('토스페이먼츠 API 오류:', error);
    return { ok: false, error: '결제 서버 연결에 실패했습니다' };
  }
}

// 결제 승인
toss.post('/confirm', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const body = await c.req.json<PaymentConfirmRequest>();

  const { paymentKey, orderId, amount } = body;

  if (!paymentKey || !orderId || !amount) {
    return c.json({ error: 'paymentKey, orderId, amount는 필수입니다' }, 400);
  }

  try {
    // 주문 정보 조회
    const order = await db
      .prepare("SELECT * FROM orders WHERE id = ? AND status = 'pending'")
      .bind(orderId)
      .first();

    if (!order) {
      return c.json({ error: '유효하지 않은 주문입니다' }, 404);
    }

    // 주문자 확인
    if (order.user_id !== auth.userId && !auth.isAdmin) {
      return c.json({ error: '권한이 없습니다' }, 403);
    }

    // 금액 검증
    if (order.total_amount !== amount) {
      return c.json({ error: '결제 금액이 일치하지 않습니다' }, 400);
    }

    // 토스페이먼츠 결제 승인
    const result = await callTossAPI(
      '/v1/payments/confirm',
      'POST',
      c.env.TOSS_SECRET_KEY,
      { paymentKey, orderId, amount }
    );

    if (!result.ok) {
      // 결제 실패 기록
      await db
        .prepare(`
          INSERT INTO payments (id, order_id, user_id, payment_key, amount, status, failure_reason)
          VALUES (?, ?, ?, ?, ?, 'failed', ?)
        `)
        .bind(crypto.randomUUID(), orderId, auth.userId, paymentKey, amount, result.error)
        .run();

      return c.json({ error: result.error }, 400);
    }

    const paymentData = result.data as Record<string, unknown>;

    // 결제 성공 기록
    const paymentId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO payments (id, order_id, user_id, payment_key, amount, status, method, card_info, paid_at, metadata)
        VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, datetime('now'), ?)
      `)
      .bind(
        paymentId,
        orderId,
        auth.userId,
        paymentKey,
        amount,
        paymentData.method || null,
        paymentData.card ? JSON.stringify(paymentData.card) : null,
        JSON.stringify(paymentData)
      )
      .run();

    // 주문 상태 업데이트
    await db
      .prepare("UPDATE orders SET status = 'paid', payment_id = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(paymentId, orderId)
      .run();

    return c.json({
      success: true,
      paymentId,
      payment: paymentData,
    });
  } catch (error) {
    console.error('결제 승인 오류:', error);
    return c.json({ error: '결제 처리 중 오류가 발생했습니다' }, 500);
  }
});

// 빌링키 발급
toss.post('/billing-key', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const body = await c.req.json<BillingKeyIssueRequest>();

  const { authKey, customerKey } = body;

  if (!authKey || !customerKey) {
    return c.json({ error: 'authKey, customerKey는 필수입니다' }, 400);
  }

  try {
    // 빌링키 발급 요청
    const result = await callTossAPI(
      '/v1/billing/authorizations/issue',
      'POST',
      c.env.TOSS_SECRET_KEY,
      { authKey, customerKey }
    );

    if (!result.ok) {
      return c.json({ error: result.error }, 400);
    }

    const billingData = result.data as {
      billingKey: string;
      customerKey: string;
      card?: {
        issuerCode: string;
        number: string;
        cardType: string;
      };
    };

    // 빌링키 저장
    const billingKeyId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO billing_keys (id, user_id, billing_key, card_type, card_number, card_company, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        billingKeyId,
        auth.userId,
        billingData.billingKey,
        billingData.card?.cardType || null,
        billingData.card?.number || null,
        billingData.card?.issuerCode || null,
        1 // 첫 번째 카드를 기본으로 설정
      )
      .run();

    // 기존 기본 카드 해제
    await db
      .prepare("UPDATE billing_keys SET is_default = 0, updated_at = datetime('now') WHERE user_id = ? AND id != ?")
      .bind(auth.userId, billingKeyId)
      .run();

    return c.json({
      success: true,
      billingKeyId,
      card: billingData.card,
    });
  } catch (error) {
    console.error('빌링키 발급 오류:', error);
    return c.json({ error: '빌링키 발급 중 오류가 발생했습니다' }, 500);
  }
});

// 정기결제 실행
toss.post('/subscription', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const body = await c.req.json<SubscriptionPaymentRequest>();

  const { billingKey, customerKey, amount, orderId, orderName } = body;

  if (!billingKey || !customerKey || !amount || !orderId || !orderName) {
    return c.json({ error: '필수 파라미터가 누락되었습니다' }, 400);
  }

  try {
    // 빌링키 소유권 확인
    const billingKeyRecord = await db
      .prepare('SELECT * FROM billing_keys WHERE billing_key = ? AND user_id = ? AND is_active = 1')
      .bind(billingKey, auth.userId)
      .first();

    if (!billingKeyRecord && !auth.isAdmin) {
      return c.json({ error: '유효하지 않은 빌링키입니다' }, 403);
    }

    // 정기결제 실행
    const result = await callTossAPI(
      '/v1/billing/' + billingKey,
      'POST',
      c.env.TOSS_SECRET_KEY,
      { customerKey, amount, orderId, orderName }
    );

    if (!result.ok) {
      return c.json({ error: result.error }, 400);
    }

    const paymentData = result.data as Record<string, unknown>;

    return c.json({
      success: true,
      payment: paymentData,
    });
  } catch (error) {
    console.error('정기결제 오류:', error);
    return c.json({ error: '정기결제 처리 중 오류가 발생했습니다' }, 500);
  }
});

// 결제 취소
toss.post('/cancel', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const body = await c.req.json<{
    paymentKey: string;
    cancelReason: string;
    cancelAmount?: number;
  }>();

  const { paymentKey, cancelReason, cancelAmount } = body;

  if (!paymentKey || !cancelReason) {
    return c.json({ error: 'paymentKey, cancelReason은 필수입니다' }, 400);
  }

  try {
    // 결제 정보 조회
    const payment = await db
      .prepare("SELECT * FROM payments WHERE payment_key = ? AND status = 'completed'")
      .bind(paymentKey)
      .first();

    if (!payment) {
      return c.json({ error: '유효하지 않은 결제입니다' }, 404);
    }

    // 권한 확인
    if (payment.user_id !== auth.userId && !auth.isAdmin) {
      return c.json({ error: '권한이 없습니다' }, 403);
    }

    // 결제 취소 요청
    const cancelBody: Record<string, unknown> = { cancelReason };
    if (cancelAmount) {
      cancelBody.cancelAmount = cancelAmount;
    }

    const result = await callTossAPI(
      `/v1/payments/${paymentKey}/cancel`,
      'POST',
      c.env.TOSS_SECRET_KEY,
      cancelBody
    );

    if (!result.ok) {
      return c.json({ error: result.error }, 400);
    }

    // 결제 상태 업데이트
    await db
      .prepare("UPDATE payments SET status = 'refunded', updated_at = datetime('now') WHERE payment_key = ?")
      .bind(paymentKey)
      .run();

    // 주문 상태 업데이트
    await db
      .prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE payment_id = ?")
      .bind(payment.id)
      .run();

    return c.json({
      success: true,
      cancellation: result.data,
    });
  } catch (error) {
    console.error('결제 취소 오류:', error);
    return c.json({ error: '결제 취소 중 오류가 발생했습니다' }, 500);
  }
});

// 결제 내역 조회
toss.get('/history', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const { limit = '20', offset = '0' } = c.req.query();

  try {
    const payments = await db
      .prepare(`
        SELECT p.*, o.order_name
        FROM payments p
        LEFT JOIN orders o ON p.order_id = o.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(auth.userId, parseInt(limit), parseInt(offset))
      .all();

    const total = await db
      .prepare('SELECT COUNT(*) as count FROM payments WHERE user_id = ?')
      .bind(auth.userId)
      .first<{ count: number }>();

    return c.json({
      payments: payments.results,
      total: total?.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('결제 내역 조회 오류:', error);
    return c.json({ error: '결제 내역 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 결제 인텐트 생성 (플랜 업그레이드용)
toss.post('/intent', requireAuth, async (c) => {
  const db = c.env.DB;
  const auth = c.get('auth')!;
  const body = await c.req.json<{ planId: string }>();

  const { planId } = body;

  if (!planId) {
    return c.json({ error: 'planId는 필수입니다' }, 400);
  }

  try {
    // 플랜 조회
    const plan = await db
      .prepare('SELECT id, name, price FROM subscription_plans WHERE id = ? AND is_active = 1')
      .bind(planId)
      .first<{ id: string; name: string; price: number }>();

    if (!plan) {
      return c.json({ error: '플랜을 찾을 수 없습니다' }, 404);
    }

    // 주문 ID 생성
    const orderId = `upgrade_${auth.userId?.slice(0, 8)}_${Date.now()}`;

    return c.json({
      orderId,
      amount: plan.price,
      orderName: `${plan.name} 업그레이드`,
      planId: plan.id,
    });
  } catch (error) {
    console.error('결제 인텐트 생성 오류:', error);
    return c.json({ error: '결제 인텐트 생성 중 오류가 발생했습니다' }, 500);
  }
});

// 웹훅 처리
toss.post('/webhook', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json<{
    eventType: string;
    data: Record<string, unknown>;
  }>();

  try {
    const { eventType, data } = body;

    console.log('토스페이먼츠 웹훅:', eventType, data);

    switch (eventType) {
      case 'PAYMENT_STATUS_CHANGED': {
        // 결제 상태 변경 처리
        const paymentKey = data.paymentKey as string;
        const status = data.status as string;

        if (status === 'DONE') {
          await db
            .prepare("UPDATE payments SET status = 'completed', updated_at = datetime('now') WHERE payment_key = ?")
            .bind(paymentKey)
            .run();
        } else if (status === 'CANCELED') {
          await db
            .prepare("UPDATE payments SET status = 'refunded', updated_at = datetime('now') WHERE payment_key = ?")
            .bind(paymentKey)
            .run();
        }
        break;
      }

      case 'BILLING_STATUS_CHANGED': {
        // 빌링 상태 변경 처리
        const billingKey = data.billingKey as string;
        const billingStatus = data.status as string;

        if (billingStatus === 'DISABLED') {
          await db
            .prepare("UPDATE billing_keys SET is_active = 0, updated_at = datetime('now') WHERE billing_key = ?")
            .bind(billingKey)
            .run();
        }
        break;
      }

      default:
        console.log('처리되지 않은 웹훅 이벤트:', eventType);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('웹훅 처리 오류:', error);
    return c.json({ error: '웹훅 처리 중 오류가 발생했습니다' }, 500);
  }
});

export default toss;
