/**
 * 제품 문의 API 핸들러
 *
 * POST  /api/v1/product-inquiries      문의 접수 (공개)
 * GET   /api/v1/product-inquiries      문의 목록 (관리자)
 * PATCH /api/v1/product-inquiries/:id  상태와 관리자 메모 변경 (관리자)
 *
 * 공개 설정: PRODUCT_INQUIRY_ENABLED 가 'true' 일 때만 접수한다.
 * 남용 방지: 숨김 입력 칸, Cloudflare Turnstile, 같은 IP 와 같은 메일 주소의 반복 제출 제한.
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { AppType, Env } from '../../types';
import { requireAdmin } from '../../middleware/auth';
import { createRateLimiter } from '../../middleware/rate-limit';
import {
  PRODUCT_IDS,
  STATUSES,
  buildConfirmationEmail,
  buildNotificationEmail,
  validateProductInquiry,
  type ProductInquiryInput,
  type ProductInquiryStatus,
} from '../../lib/product-inquiry';

const productInquiries = new Hono<AppType>();

const FROM_ADDRESS = 'IDEA on Action <noreply@ideaonaction.ai>';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** 같은 메일 주소로 24시간 안에 접수할 수 있는 건수 */
const MAX_PER_EMAIL_PER_DAY = 3;
const ADMIN_NOTES_MAX_LENGTH = 5000;

interface ProductInquiryRow extends ProductInquiryInput {
  id: string;
  consent_at: string;
  status: ProductInquiryStatus;
  admin_notes: string | null;
  created_at: string;
}

async function verifyTurnstile(env: Env, token: unknown, ip: string | undefined): Promise<'ok' | 'failed' | 'not_configured'> {
  if (!env.TURNSTILE_SECRET_KEY) {
    // 로컬 개발에서만 검증 없이 통과시킨다
    return env.ENVIRONMENT === 'development' ? 'ok' : 'not_configured';
  }
  if (typeof token !== 'string' || !token) return 'failed';

  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (ip) form.set('remoteip', ip);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: form });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true ? 'ok' : 'failed';
  } catch (error) {
    console.error('[Product Inquiries API] Turnstile 검증 오류:', error);
    return 'failed';
  }
}

async function sendEmail(env: Env, message: { to: string; subject: string; html: string; replyTo?: string }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [message.to],
      reply_to: message.replyTo,
      subject: message.subject,
      html: message.html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API error: ${response.status} ${await response.text()}`);
  }
}

/** 수신자 알림 1통과 문의자 접수 확인 1통을 보낸다. 실패해도 접수 자체는 유지한다. */
async function sendInquiryEmails(env: Env, inquiry: ProductInquiryInput, id: string) {
  if (!env.RESEND_API_KEY) {
    console.warn('[Product Inquiries API] RESEND_API_KEY 가 없어 메일을 보내지 않습니다.');
    return;
  }

  const jobs: Promise<void>[] = [];

  if (env.PRODUCT_INQUIRY_RECIPIENT) {
    jobs.push(
      sendEmail(env, {
        to: env.PRODUCT_INQUIRY_RECIPIENT,
        replyTo: inquiry.email,
        ...buildNotificationEmail(inquiry, id),
      })
    );
  } else {
    console.warn('[Product Inquiries API] PRODUCT_INQUIRY_RECIPIENT 가 없어 알림 메일을 보내지 않습니다.');
  }

  jobs.push(sendEmail(env, { to: inquiry.email, ...buildConfirmationEmail(inquiry) }));

  const results = await Promise.allSettled(jobs);
  results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .forEach((result) => console.error('[Product Inquiries API] 메일 발송 오류:', result.reason));
}

function runInBackground(c: Context<AppType>, task: Promise<void>) {
  try {
    c.executionCtx.waitUntil(task);
  } catch {
    // 실행 컨텍스트가 없는 환경(테스트)에서는 그대로 진행한다
    void task;
  }
}

// POST /api/v1/product-inquiries - 문의 접수 (공개)
productInquiries.post(
  '/',
  createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5, keyPrefix: 'product-inquiry' }),
  async (c) => {
    if (c.env.PRODUCT_INQUIRY_ENABLED !== 'true') {
      return c.json({ error: '제품 문의 접수가 아직 열려 있지 않습니다.' }, 503);
    }

    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: '요청 형식이 올바르지 않습니다.' }, 400);
    }

    // 숨김 입력 칸: 사람은 채우지 않는다. 채워져 있으면 저장하지 않고 접수된 것처럼 응답한다.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return c.json({ data: { id: crypto.randomUUID(), status: 'received' } }, 201);
    }

    const validation = validateProductInquiry(body);
    if (!validation.ok) {
      return c.json({ error: '입력한 내용을 확인해야 합니다.', fields: validation.errors }, 400);
    }
    const inquiry = validation.value;

    const turnstile = await verifyTurnstile(c.env, body.turnstile_token, c.req.header('CF-Connecting-IP'));
    if (turnstile === 'not_configured') {
      return c.json({ error: '제품 문의 접수가 아직 열려 있지 않습니다.' }, 503);
    }
    if (turnstile === 'failed') {
      return c.json({ error: '자동 입력 방지 확인에 실패했습니다. 다시 시도해야 합니다.' }, 400);
    }

    try {
      const db = c.env.DB;
      const now = new Date();
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const recent = await db
        .prepare('SELECT COUNT(*) AS count FROM product_inquiries WHERE email = ? AND created_at >= ?')
        .bind(inquiry.email, since)
        .first<{ count: number }>();

      if ((recent?.count ?? 0) >= MAX_PER_EMAIL_PER_DAY) {
        return c.json({ error: '같은 메일 주소로 접수한 문의가 많습니다. 잠시 뒤에 다시 시도해야 합니다.' }, 429);
      }

      const id = crypto.randomUUID();
      const createdAt = now.toISOString();

      await db
        .prepare(`
          INSERT INTO product_inquiries
            (id, product_id, company, name, email, phone, role, use_case, deployment, timeline, consent_at, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?)
        `)
        .bind(
          id,
          inquiry.product_id,
          inquiry.company,
          inquiry.name,
          inquiry.email,
          inquiry.phone,
          inquiry.role,
          inquiry.use_case,
          inquiry.deployment,
          inquiry.timeline,
          createdAt,
          createdAt
        )
        .run();

      runInBackground(c, sendInquiryEmails(c.env, inquiry, id));

      return c.json({ data: { id, status: 'received', created_at: createdAt } }, 201);
    } catch (error) {
      console.error('[Product Inquiries API] 접수 오류:', error);
      return c.json({ error: '문의를 접수하지 못했습니다. 잠시 뒤에 다시 시도해야 합니다.' }, 500);
    }
  }
);

// GET /api/v1/product-inquiries - 문의 목록 (관리자)
productInquiries.get('/', requireAdmin, async (c) => {
  const { status, product_id, limit, offset } = c.req.query();

  try {
    let sql = 'SELECT * FROM product_inquiries WHERE 1 = 1';
    const params: (string | number)[] = [];

    if (status) {
      if (!(STATUSES as readonly string[]).includes(status)) {
        return c.json({ error: '상태 값이 올바르지 않습니다.' }, 400);
      }
      sql += ' AND status = ?';
      params.push(status);
    }
    if (product_id) {
      if (!(PRODUCT_IDS as readonly string[]).includes(product_id)) {
        return c.json({ error: '제품 값이 올바르지 않습니다.' }, 400);
      }
      sql += ' AND product_id = ?';
      params.push(product_id);
    }

    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);

    const result = await c.env.DB.prepare(sql).bind(...params).all<ProductInquiryRow>();

    return c.json({
      data: result.results || [],
      meta: { limit: limitNum, offset: offsetNum },
    });
  } catch (error) {
    console.error('[Product Inquiries API] 목록 조회 오류:', error);
    return c.json({ error: '제품 문의를 조회할 수 없습니다.' }, 500);
  }
});

// PATCH /api/v1/product-inquiries/:id - 상태와 관리자 메모 변경 (관리자)
productInquiries.patch('/:id', requireAdmin, async (c) => {
  const { id } = c.req.param();

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '요청 형식이 올바르지 않습니다.' }, 400);
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !(STATUSES as readonly string[]).includes(body.status)) {
      return c.json({ error: '상태 값이 올바르지 않습니다.' }, 400);
    }
    updates.push('status = ?');
    values.push(body.status);
  }

  if (body.admin_notes !== undefined) {
    if (body.admin_notes !== null && typeof body.admin_notes !== 'string') {
      return c.json({ error: '관리자 메모 값이 올바르지 않습니다.' }, 400);
    }
    if (typeof body.admin_notes === 'string' && body.admin_notes.length > ADMIN_NOTES_MAX_LENGTH) {
      return c.json({ error: '관리자 메모가 너무 깁니다.' }, 400);
    }
    updates.push('admin_notes = ?');
    values.push(body.admin_notes || null);
  }

  if (updates.length === 0) {
    return c.json({ error: '변경할 값이 없습니다.' }, 400);
  }

  try {
    const db = c.env.DB;
    const result = await db
      .prepare(`UPDATE product_inquiries SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values, id)
      .run();

    if (!result.meta?.changes) {
      return c.json({ error: '제품 문의를 찾을 수 없습니다.' }, 404);
    }

    const row = await db.prepare('SELECT * FROM product_inquiries WHERE id = ?').bind(id).first<ProductInquiryRow>();
    return c.json({ data: row });
  } catch (error) {
    console.error('[Product Inquiries API] 변경 오류:', error);
    return c.json({ error: '제품 문의를 변경할 수 없습니다.' }, 500);
  }
});

export default productInquiries;
