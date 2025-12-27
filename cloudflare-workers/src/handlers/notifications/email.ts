/**
 * 이메일 알림 Handler
 * Supabase send-work-inquiry-email → Cloudflare Workers
 */

import { Hono } from 'hono';
import { Env, AppType } from '../../types';

const email = new Hono<AppType>();

interface WorkInquiry {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  budget?: string;
  timeline?: string;
  projectType: string;
  description: string;
}

function buildEmailHtml(inquiry: WorkInquiry): string {
  const rows: string[] = [];

  rows.push(`<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>이름</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${inquiry.name}</td></tr>`);
  rows.push(`<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>이메일</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${inquiry.email}</td></tr>`);

  if (inquiry.company) {
    rows.push(`<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>회사</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${inquiry.company}</td></tr>`);
  }
  if (inquiry.phone) {
    rows.push(`<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>연락처</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${inquiry.phone}</td></tr>`);
  }

  rows.push(`<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>프로젝트 유형</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${inquiry.projectType}</td></tr>`);

  if (inquiry.budget) {
    rows.push(`<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>예산</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${inquiry.budget}</td></tr>`);
  }
  if (inquiry.timeline) {
    rows.push(`<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>일정</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${inquiry.timeline}</td></tr>`);
  }

  return `
    <h2>새로운 작업 문의</h2>
    <table style="border-collapse: collapse; width: 100%;">${rows.join('')}</table>
    <h3>프로젝트 설명</h3>
    <p style="white-space: pre-wrap;">${inquiry.description}</p>
    <hr>
    <p style="color: #666; font-size: 12px;">이 이메일은 IDEA on Action 웹사이트에서 자동 발송되었습니다.</p>
  `;
}

/**
 * POST /notifications/email/work-inquiry
 * 작업 문의 이메일 전송
 */
email.post('/work-inquiry', async (c) => {
  try {
    const resendApiKey = c.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return c.json({ error: 'RESEND_API_KEY not configured', success: false }, 500);
    }

    const inquiry = await c.req.json<WorkInquiry>();

    if (!inquiry.name || !inquiry.email || !inquiry.description) {
      return c.json({ error: 'Missing required fields', success: false }, 400);
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'IDEA on Action <noreply@ideaonaction.ai>',
        to: ['contact@ideaonaction.ai'],
        reply_to: inquiry.email,
        subject: `[작업 문의] ${inquiry.projectType} - ${inquiry.name}`,
        html: buildEmailHtml(inquiry),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json() as { id: string };

    return c.json({
      success: true,
      message: '문의가 성공적으로 전송되었습니다.',
      email_id: result.id,
    });
  } catch (error) {
    console.error('Email send error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }, 500);
  }
});

export default email;
