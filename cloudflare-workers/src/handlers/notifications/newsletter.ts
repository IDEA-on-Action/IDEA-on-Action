/**
 * Newsletter Send 핸들러
 * Cloudflare Workers Migration
 *
 * Resend API를 사용한 뉴스레터 발송
 *
 * @endpoint POST /notifications/newsletter/send - 뉴스레터 발송
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { requireAdmin } from '../../middleware/auth';

const newsletter = new Hono<AppType>();

// =============================================================================
// 상수
// =============================================================================

const BATCH_SIZE = 50;
const RESEND_API_URL = 'https://api.resend.com/emails/batch';

// =============================================================================
// 타입
// =============================================================================

interface SendRequest {
  newsletter_id: string;
  test_mode?: boolean;
  test_email?: string;
  segment?: {
    status?: string;
    topics?: string[];
  };
}

interface NewsletterArchive {
  id: string;
  subject: string;
  content: string;
  preview?: string;
  sent_at?: string;
  recipient_count: number;
}

// =============================================================================
// 유틸리티
// =============================================================================

function wrapEmailContent(content: string, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; line-height: 1.6; color: #333; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .footer a { color: #3b82f6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>IDEA on Action</h1></div>
    <div class="content">${content}</div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} IDEA on Action. All rights reserved.</p>
      <p><a href="https://www.ideaonaction.ai">www.ideaonaction.ai</a></p>
      <p><a href="${unsubscribeUrl}">구독 취소</a></p>
    </div>
  </div>
</body>
</html>`;
}

async function sendBatchEmails(
  emails: { to: string; subject: string; html: string }[],
  fromEmail: string,
  apiKey: string
): Promise<{ success: boolean; errors?: string[] }> {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        emails.map((email) => ({
          from: fromEmail,
          to: email.to,
          subject: email.subject,
          html: email.html,
        }))
      ),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, errors: [JSON.stringify(error)] };
    }

    return { success: true };
  } catch (error) {
    return { success: false, errors: [error instanceof Error ? error.message : 'Unknown error'] };
  }
}

// =============================================================================
// 핸들러
// =============================================================================

/**
 * POST /send - 뉴스레터 발송
 */
newsletter.post('/send', requireAdmin, async (c) => {
  const db = c.env.DB;
  const apiKey = c.env.RESEND_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'RESEND_API_KEY가 설정되지 않았습니다.' }, 500);
  }

  const fromEmail = 'newsletter@ideaonaction.ai';

  let body: SendRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '유효하지 않은 JSON 페이로드입니다.' }, 400);
  }

  if (!body.newsletter_id) {
    return c.json({ error: 'newsletter_id는 필수입니다.' }, 400);
  }

  // 뉴스레터 조회
  const newsletterData = await db
    .prepare('SELECT * FROM newsletter_archive WHERE id = ?')
    .bind(body.newsletter_id)
    .first<NewsletterArchive>();

  if (!newsletterData) {
    return c.json({ error: '뉴스레터를 찾을 수 없습니다.' }, 404);
  }

  // 테스트 모드
  if (body.test_mode) {
    const targetEmail = body.test_email || 'sinclairseo@gmail.com';
    const unsubscribeUrl = `https://www.ideaonaction.ai/newsletter/unsubscribe?email=${encodeURIComponent(targetEmail)}`;
    const htmlContent = wrapEmailContent(newsletterData.content, unsubscribeUrl);

    const result = await sendBatchEmails(
      [{ to: targetEmail, subject: `[테스트] ${newsletterData.subject}`, html: htmlContent }],
      fromEmail,
      apiKey
    );

    return c.json({
      success: result.success,
      message: result.success ? `테스트 이메일 발송: ${targetEmail}` : '테스트 이메일 발송 실패',
      errors: result.errors,
    });
  }

  // 구독자 목록 조회
  const subscribers = await db
    .prepare("SELECT id, email FROM newsletter_subscriptions WHERE status = 'confirmed'")
    .all<{ id: string; email: string }>();

  if (!subscribers.results || subscribers.results.length === 0) {
    return c.json({ success: true, sent_count: 0, failed_count: 0, message: '구독자가 없습니다.' });
  }

  console.log(`뉴스레터 발송: ${subscribers.results.length}명`);

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  // 배치 발송
  for (let i = 0; i < subscribers.results.length; i += BATCH_SIZE) {
    const batch = subscribers.results.slice(i, i + BATCH_SIZE);
    const emails = batch.map((sub) => {
      const unsubscribeUrl = `https://www.ideaonaction.ai/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}`;
      return {
        to: sub.email,
        subject: newsletterData.subject,
        html: wrapEmailContent(newsletterData.content, unsubscribeUrl),
      };
    });

    const result = await sendBatchEmails(emails, fromEmail, apiKey);

    if (result.success) {
      sentCount += batch.length;
    } else {
      failedCount += batch.length;
      if (result.errors) errors.push(...result.errors);
    }

    // Rate limiting
    if (i + BATCH_SIZE < subscribers.results.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // newsletter_archive 업데이트
  await db
    .prepare("UPDATE newsletter_archive SET sent_at = datetime('now'), recipient_count = ? WHERE id = ?")
    .bind(sentCount, body.newsletter_id)
    .run();

  return c.json({
    success: failedCount === 0,
    sent_count: sentCount,
    failed_count: failedCount,
    newsletter_id: body.newsletter_id,
    errors: errors.length > 0 ? errors : undefined,
  }, failedCount === 0 ? 200 : 207);
});

export default newsletter;
