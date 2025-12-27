/**
 * Webhook Send 핸들러
 * Cloudflare Workers Migration
 *
 * HMAC-SHA256 서명과 함께 타겟 URL로 이벤트 전송
 *
 * @endpoint POST /webhooks/send - 웹훅 전송
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireAdmin } from '../../middleware/auth';

const webhookSend = new Hono<AppType>();

// =============================================================================
// 상수
// =============================================================================

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 10000;

// =============================================================================
// 타입
// =============================================================================

interface WebhookRequest {
  event_type: string;
  payload: Record<string, unknown>;
  target_urls: string[];
  webhook_secret?: string;
}

interface WebhookResult {
  target_url: string;
  success: boolean;
  status_code?: number;
  error?: string;
  retry_count: number;
}

// =============================================================================
// 유틸리티
// =============================================================================

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `sha256=${signature}`;
}

async function sendWebhook(
  targetUrl: string,
  eventType: string,
  payload: Record<string, unknown>,
  signature: string,
  requestId: string
): Promise<WebhookResult> {
  let lastError: string | undefined;
  let statusCode: number | undefined;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-Event-Type': eventType,
          'X-Request-Id': requestId,
          'User-Agent': 'IdeaOnAction-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      statusCode = response.status;

      if (response.ok) {
        return { target_url: targetUrl, success: true, status_code: statusCode, retry_count: attempt };
      }

      if (response.status >= 400 && response.status < 500) {
        lastError = `HTTP ${response.status}`;
        break;
      }

      lastError = `HTTP ${response.status}: Server error`;

      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  return {
    target_url: targetUrl,
    success: false,
    status_code: statusCode,
    error: lastError,
    retry_count: MAX_RETRY_ATTEMPTS,
  };
}

// =============================================================================
// 핸들러
// =============================================================================

/**
 * POST /send - 웹훅 전송
 */
webhookSend.post('/send', requireAdmin, async (c) => {
  const db = c.env.DB;
  const requestId = c.req.header('CF-Ray') || crypto.randomUUID();

  let body: WebhookRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '유효하지 않은 JSON 페이로드입니다.' }, 400);
  }

  if (!body.event_type) {
    return c.json({ error: 'event_type 필드가 필요합니다.' }, 400);
  }
  if (!body.payload || typeof body.payload !== 'object') {
    return c.json({ error: 'payload는 객체여야 합니다.' }, 400);
  }
  if (!body.target_urls || body.target_urls.length === 0) {
    return c.json({ error: 'target_urls는 비어있지 않은 배열이어야 합니다.' }, 400);
  }

  // URL 유효성 검증
  for (const url of body.target_urls) {
    try {
      new URL(url);
    } catch {
      return c.json({ error: `유효하지 않은 URL: ${url}` }, 400);
    }
  }

  const webhookSecret = body.webhook_secret || c.env.WEBHOOK_SECRET_MINU;
  if (!webhookSecret) {
    return c.json({ error: '웹훅 시크릿이 설정되지 않았습니다.' }, 500);
  }

  const payloadString = JSON.stringify(body.payload);
  const signature = await generateSignature(payloadString, webhookSecret);

  const results: WebhookResult[] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const targetUrl of body.target_urls) {
    const result = await sendWebhook(targetUrl, body.event_type, body.payload, signature, requestId);
    results.push(result);

    if (result.success) {
      sentCount++;
    } else {
      failedCount++;
      // Dead Letter Queue에 기록
      try {
        await db
          .prepare(
            `INSERT INTO dead_letter_queue (id, event_type, payload, target_url, error_message, retry_count, request_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            crypto.randomUUID(),
            body.event_type,
            payloadString,
            targetUrl,
            result.error || 'Unknown error',
            MAX_RETRY_ATTEMPTS,
            requestId
          )
          .run();
      } catch (dlqError) {
        console.error('Dead letter queue error:', dlqError);
      }
    }
  }

  return c.json({
    success: failedCount === 0,
    sent_count: sentCount,
    failed_count: failedCount,
    results,
    request_id: requestId,
  });
});

export default webhookSend;
