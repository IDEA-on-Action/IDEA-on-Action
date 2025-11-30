/**
 * Slack 웹훅 유틸리티
 *
 * Slack Incoming Webhook을 사용한 알림 전송
 *
 * @module utils/slack
 */

// ============================================================================
// 타입 정의
// ============================================================================

export interface SlackMessage {
  /** 메시지 텍스트 */
  text: string;
  /** 메시지 블록 (Rich formatting) */
  blocks?: SlackBlock[];
  /** 첨부 파일 */
  attachments?: SlackAttachment[];
  /** 사용자명 (옵션) */
  username?: string;
  /** 아이콘 이모지 (옵션) */
  icon_emoji?: string;
  /** 아이콘 URL (옵션) */
  icon_url?: string;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  ts?: number;
}

export interface SlackWebhookResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// 상수
// ============================================================================

const SLACK_COLORS = {
  critical: '#dc2626', // red-600
  high: '#ea580c', // orange-600
  medium: '#ca8a04', // yellow-600
  low: '#16a34a', // green-600
  info: '#2563eb', // blue-600
  success: '#16a34a', // green-600
};

// ============================================================================
// 웹훅 전송
// ============================================================================

/**
 * Slack 웹훅 URL 유효성 검사
 */
export function isValidSlackWebhookUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'hooks.slack.com' &&
      parsed.pathname.startsWith('/services/')
    );
  } catch {
    return false;
  }
}

/**
 * Slack 웹훅으로 메시지 전송
 *
 * @param webhookUrl - Slack Webhook URL
 * @param message - 전송할 메시지
 * @returns 전송 결과
 *
 * @example
 * ```ts
 * await sendSlackMessage('https://hooks.slack.com/services/...', {
 *   text: '새 이슈 발생',
 *   attachments: [{
 *     color: SLACK_COLORS.critical,
 *     title: '빌드 실패',
 *     text: '심각도: 높음',
 *   }],
 * });
 * ```
 */
export async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage
): Promise<SlackWebhookResponse> {
  if (!isValidSlackWebhookUrl(webhookUrl)) {
    return {
      success: false,
      error: '유효하지 않은 Slack 웹훅 URL입니다.',
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Slack API 오류: ${response.status} - ${errorText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/**
 * 테스트 메시지 전송
 */
export async function sendSlackTestMessage(webhookUrl: string): Promise<SlackWebhookResponse> {
  return sendSlackMessage(webhookUrl, {
    text: '✅ IDEA on Action 알림 테스트',
    attachments: [
      {
        color: SLACK_COLORS.success,
        title: 'Slack 웹훅 연동 테스트',
        text: 'Slack 알림이 정상적으로 작동합니다.',
        footer: 'IDEA on Action',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  });
}

// ============================================================================
// 이슈/이벤트 메시지 생성
// ============================================================================

/**
 * 이슈 알림 메시지 생성
 */
export function createIssueSlackMessage(
  issueTitle: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  serviceId: string,
  description?: string
): SlackMessage {
  const severityLabels = {
    critical: '🔴 심각',
    high: '🟠 높음',
    medium: '🟡 보통',
    low: '🟢 낮음',
  };

  return {
    text: `이슈 발생: ${issueTitle}`,
    attachments: [
      {
        color: SLACK_COLORS[severity],
        title: issueTitle,
        text: description || '',
        fields: [
          {
            title: '심각도',
            value: severityLabels[severity],
            short: true,
          },
          {
            title: '서비스',
            value: serviceId,
            short: true,
          },
        ],
        footer: 'IDEA on Action',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

/**
 * 이벤트 알림 메시지 생성
 */
export function createEventSlackMessage(
  eventMessage: string,
  serviceId: string,
  eventType: string
): SlackMessage {
  return {
    text: `이벤트: ${eventMessage}`,
    attachments: [
      {
        color: SLACK_COLORS.info,
        title: eventMessage,
        fields: [
          {
            title: '서비스',
            value: serviceId,
            short: true,
          },
          {
            title: '타입',
            value: eventType,
            short: true,
          },
        ],
        footer: 'IDEA on Action',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

/**
 * 이슈 알림 전송 (헬퍼)
 */
export async function sendIssueToSlack(
  webhookUrl: string,
  issueTitle: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  serviceId: string,
  description?: string
): Promise<SlackWebhookResponse> {
  const message = createIssueSlackMessage(issueTitle, severity, serviceId, description);
  return sendSlackMessage(webhookUrl, message);
}

/**
 * 이벤트 알림 전송 (헬퍼)
 */
export async function sendEventToSlack(
  webhookUrl: string,
  eventMessage: string,
  serviceId: string,
  eventType: string
): Promise<SlackWebhookResponse> {
  const message = createEventSlackMessage(eventMessage, serviceId, eventType);
  return sendSlackMessage(webhookUrl, message);
}

export default {
  isValidSlackWebhookUrl,
  sendSlackMessage,
  sendSlackTestMessage,
  createIssueSlackMessage,
  createEventSlackMessage,
  sendIssueToSlack,
  sendEventToSlack,
  SLACK_COLORS,
};
