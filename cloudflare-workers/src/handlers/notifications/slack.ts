/**
 * Slack 알림 Handler
 * Supabase send-slack-notification → Cloudflare Workers
 */

import { Hono } from 'hono';
import { Env, AppType } from '../../types';

const slack = new Hono<AppType>();

// 심각도별 색상
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

// 심각도별 이모지
const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🚨',
  high: '⚠️',
  medium: '📋',
  low: 'ℹ️',
};

// 서비스 이름 매핑
const SERVICE_NAMES: Record<string, string> = {
  'minu-find': 'Minu Find',
  'minu-frame': 'Minu Frame',
  'minu-build': 'Minu Build',
  'minu-keep': 'Minu Keep',
};

interface IssueNotification {
  id: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  service_id: string;
  status: string;
  created_at: string;
}

interface SlackPayload {
  text: string;
  attachments: Array<{
    color: string;
    title: string;
    fields: Array<{ title: string; value: string; short: boolean }>;
    footer?: string;
    ts?: number;
  }>;
}

/**
 * Slack 페이로드 생성
 */
function createSlackPayload(issue: IssueNotification, type: string): SlackPayload {
  const emoji = SEVERITY_EMOJI[issue.severity] || '📌';
  const color = SEVERITY_COLORS[issue.severity] || '#6b7280';
  const serviceName = SERVICE_NAMES[issue.service_id] || issue.service_id;
  const actionType = type === 'INSERT' ? '신규 이슈 발생' : '이슈 업데이트';

  const fields = [
    { title: '서비스', value: serviceName, short: true },
    { title: '심각도', value: issue.severity.toUpperCase(), short: true },
    { title: '상태', value: issue.status, short: true },
    {
      title: '발생 시간',
      value: new Date(issue.created_at).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
      }),
      short: true,
    },
  ];

  if (issue.description) {
    fields.push({
      title: '설명',
      value: issue.description.length > 200
        ? issue.description.substring(0, 197) + '...'
        : issue.description,
      short: false,
    });
  }

  return {
    text: `${emoji} [${actionType}] ${issue.title}`,
    attachments: [{
      color,
      title: issue.title,
      fields,
      footer: 'IDEA on Action Central Hub',
      ts: Math.floor(Date.now() / 1000),
    }],
  };
}

/**
 * POST /notifications/slack
 * Slack으로 알림 전송
 */
slack.post('/', async (c) => {
  try {
    const webhookUrl = c.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return c.json({ error: 'SLACK_WEBHOOK_URL not configured', success: false }, 500);
    }

    const { issue, type } = await c.req.json<{ issue: IssueNotification; type: string }>();

    if (!issue?.id || !issue?.title) {
      return c.json({ error: 'Invalid request body', success: false }, 400);
    }

    const payload = createSlackPayload(issue, type);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Slack API error: ${response.status} - ${errorText}`);
    }

    return c.json({
      success: true,
      issue_id: issue.id,
      severity: issue.severity,
    });
  } catch (error) {
    console.error('Slack notification error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }, 500);
  }
});

export default slack;
