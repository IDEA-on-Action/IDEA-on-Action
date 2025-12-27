/**
 * Slack 알림 Edge Function
 *
 * Critical/High 심각도 이슈 발생 시 Slack으로 자동 알림을 전송합니다.
 * - DB 트리거로부터 호출 (pg_net.http_post)
 * - Slack Incoming Webhook 사용
 * - 서비스/심각도/상태별 색상 코딩
 * - 타임스탬프 및 메타데이터 포함
 *
 * @endpoint POST /functions/v1/send-slack-notification
 * @headers
 *   Authorization: Bearer <SERVICE_ROLE_KEY>
 *   Content-Type: application/json
 *
 * @version 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * Slack Webhook Payload
 */
interface SlackPayload {
  channel?: string;
  text: string;
  attachments?: Array<{
    color: string;
    title: string;
    fields: Array<{ title: string; value: string; short: boolean }>;
    footer?: string;
    ts?: number;
  }>;
}

/**
 * 이슈 알림 데이터
 */
interface IssueNotification {
  id: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  service_id: string;
  status: string;
  created_at: string;
}

/**
 * 요청 바디
 */
interface RequestBody {
  issue: IssueNotification;
  type: string; // 'INSERT' | 'UPDATE'
}

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * CORS 헤더
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 심각도별 색상 매핑 (Slack Attachment Colors)
 */
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626', // red-600
  high: '#f97316',     // orange-500
  medium: '#eab308',   // yellow-500
  low: '#22c55e',      // green-500
};

/**
 * 심각도별 이모지 매핑
 */
const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🚨',
  high: '⚠️',
  medium: '📋',
  low: 'ℹ️',
};

/**
 * 서비스 이름 매핑
 */
const SERVICE_NAMES: Record<string, string> = {
  'minu-find': 'Minu Find',
  'minu-frame': 'Minu Frame',
  'minu-build': 'Minu Build',
  'minu-keep': 'Minu Keep',
};

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * Slack 메시지 페이로드 생성
 */
function createSlackPayload(issue: IssueNotification, type: string): SlackPayload {
  const emoji = SEVERITY_EMOJI[issue.severity] || '📌';
  const color = SEVERITY_COLORS[issue.severity] || '#6b7280';
  const serviceName = SERVICE_NAMES[issue.service_id] || issue.service_id;
  const actionType = type === 'INSERT' ? '신규 이슈 발생' : '이슈 업데이트';

  const payload: SlackPayload = {
    text: `${emoji} [${actionType}] ${issue.title}`,
    attachments: [
      {
        color,
        title: issue.title,
        fields: [
          { title: '서비스', value: serviceName, short: true },
          { title: '심각도', value: issue.severity.toUpperCase(), short: true },
          { title: '상태', value: issue.status, short: true },
          {
            title: '발생 시간',
            value: new Date(issue.created_at).toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            short: true
          },
        ],
        footer: 'IDEA on Action Central Hub',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  // 설명이 있으면 추가 (200자 제한)
  if (issue.description) {
    payload.attachments![0].fields.push({
      title: '설명',
      value: issue.description.length > 200
        ? issue.description.substring(0, 197) + '...'
        : issue.description,
      short: false,
    });
  }

  return payload;
}

/**
 * Slack Webhook으로 메시지 전송
 */
async function sendToSlack(webhookUrl: string, payload: SlackPayload): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Slack API error: ${response.status} - ${errorText}`);
  }
}

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req) => {
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 환경 변수 확인
    const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    if (!webhookUrl) {
      console.error('SLACK_WEBHOOK_URL not configured');
      throw new Error('SLACK_WEBHOOK_URL not configured');
    }

    // 요청 바디 파싱
    const { issue, type }: RequestBody = await req.json();

    // 유효성 검사
    if (!issue || !issue.id || !issue.title) {
      throw new Error('Invalid request body: missing required fields');
    }

    console.log(`Processing ${type} notification for issue: ${issue.id} (${issue.severity})`);

    // Slack 메시지 생성 및 전송
    const payload = createSlackPayload(issue, type);
    await sendToSlack(webhookUrl, payload);

    console.log(`Slack notification sent successfully for issue: ${issue.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        issue_id: issue.id,
        severity: issue.severity,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Slack notification error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
