/**
 * Slack Notification Library
 *
 * Slack Incoming Webhook을 사용한 알림 전송 기능
 *
 * @module lib/notifications/slack
 */

import type {
  SlackMessage,
  SlackNotificationOptions,
  GitHubIssue,
  ServiceHealth,
  SlackChannel,
  SlackAttachmentField,
  NotificationLevel,
} from '@/types/notification.types'
import {
  NOTIFICATION_LEVEL_COLORS,
  HEALTH_STATUS_COLORS,
} from '@/types/notification.types'

// ============================================================================
// Constants
// ============================================================================

/**
 * Slack Webhook URL 가져오기
 * 환경 변수에서 동적으로 가져옵니다 (테스트 모킹을 위해)
 */
function getSlackWebhookUrl(): string | undefined {
  return import.meta.env.VITE_SLACK_WEBHOOK_URL
}

/**
 * 기본 아이콘
 */
const DEFAULT_ICON = ':robot_face:'

/**
 * 기본 사용자명
 */
const DEFAULT_USERNAME = 'IdeaOnAction Bot'

/**
 * 요청 타임아웃 (ms)
 */
const REQUEST_TIMEOUT = 5000

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Slack 알림 에러
 */
export class SlackNotificationError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message)
    this.name = 'SlackNotificationError'
  }
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Slack 알림 전송
 *
 * @param channel - 대상 채널
 * @param message - 메시지 텍스트
 * @param options - 알림 옵션
 * @throws {SlackNotificationError} Webhook URL이 설정되지 않았거나 전송 실패 시
 *
 * @example
 * ```typescript
 * await sendSlackNotification(
 *   SlackChannel.ERRORS,
 *   'Application error occurred',
 *   {
 *     level: 'error',
 *     title: 'Error Details',
 *     fields: [
 *       { title: 'Error', value: 'Database connection failed', short: false }
 *     ]
 *   }
 * )
 * ```
 */
export async function sendSlackNotification(
  channel: SlackChannel,
  message: string,
  options: SlackNotificationOptions = {}
): Promise<void> {
  // Webhook URL 검증
  const webhookUrl = getSlackWebhookUrl()
  if (!webhookUrl) {
    throw new SlackNotificationError(
      'Slack Webhook URL이 설정되지 않았습니다. VITE_SLACK_WEBHOOK_URL 환경 변수를 확인하세요.'
    )
  }

  // 메시지 구성
  const slackMessage = buildSlackMessage(channel, message, options)

  // 전송
  await sendWebhook(webhookUrl, slackMessage)
}

/**
 * Slack 메시지 구성
 *
 * @param channel - 대상 채널
 * @param message - 메시지 텍스트
 * @param options - 알림 옵션
 * @returns Slack 메시지 객체
 */
function buildSlackMessage(
  channel: SlackChannel,
  message: string,
  options: SlackNotificationOptions
): SlackMessage {
  const { level = 'info', title, fields = [], url, footer, includeTimestamp = true } = options

  const slackMessage: SlackMessage = {
    text: message,
    channel: channel,
    username: DEFAULT_USERNAME,
    icon_emoji: DEFAULT_ICON,
  }

  // Attachment 추가
  if (title || fields.length > 0 || url || footer) {
    slackMessage.attachments = [
      {
        color: NOTIFICATION_LEVEL_COLORS[level],
        title: title,
        title_link: url,
        fields: fields,
        footer: footer || 'IdeaOnAction',
        footer_icon: 'https://www.ideaonaction.ai/favicon.ico',
        ts: includeTimestamp ? Math.floor(Date.now() / 1000) : undefined,
      },
    ]
  }

  return slackMessage
}

/**
 * Webhook 전송
 *
 * @param webhookUrl - Webhook URL
 * @param message - Slack 메시지
 * @throws {SlackNotificationError} 전송 실패 시
 */
async function sendWebhook(webhookUrl: string, message: SlackMessage): Promise<void> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new SlackNotificationError(
        `Slack 알림 전송 실패: ${response.statusText}`,
        response.status,
        errorText
      )
    }

    // Slack은 성공 시 'ok' 텍스트를 반환
    const responseText = await response.text()
    if (responseText !== 'ok') {
      throw new SlackNotificationError(
        `Slack 알림 응답 오류: ${responseText}`,
        response.status,
        responseText
      )
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof SlackNotificationError) {
      throw error
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new SlackNotificationError(
          `Slack 알림 요청 타임아웃 (${REQUEST_TIMEOUT}ms)`
        )
      }
      throw new SlackNotificationError(`Slack 알림 전송 중 오류: ${error.message}`)
    }

    throw new SlackNotificationError('알 수 없는 오류가 발생했습니다.')
  }
}

// ============================================================================
// Formatters
// ============================================================================

/**
 * GitHub 이슈 알림 포맷팅
 *
 * @param issue - GitHub 이슈 정보
 * @returns 포맷된 Slack 메시지와 옵션
 *
 * @example
 * ```typescript
 * const issue = {
 *   number: 123,
 *   title: 'Bug: Login not working',
 *   url: 'https://github.com/org/repo/issues/123',
 *   state: 'open',
 *   author: 'username',
 *   labels: ['bug', 'high-priority'],
 *   created_at: '2025-12-03T10:00:00Z'
 * }
 * const { message, options } = formatIssueNotification(issue)
 * await sendSlackNotification(SlackChannel.GITHUB, message, options)
 * ```
 */
export function formatIssueNotification(issue: GitHubIssue): {
  message: string
  options: SlackNotificationOptions
} {
  const level: NotificationLevel =
    issue.labels?.includes('critical') || issue.labels?.includes('high-priority')
      ? 'error'
      : issue.labels?.includes('bug')
        ? 'warning'
        : 'info'

  const fields: SlackAttachmentField[] = [
    {
      title: '이슈 번호',
      value: `#${issue.number}`,
      short: true,
    },
    {
      title: '상태',
      value: issue.state === 'open' ? '열림' : '닫힘',
      short: true,
    },
    {
      title: '작성자',
      value: issue.author,
      short: true,
    },
  ]

  if (issue.labels && issue.labels.length > 0) {
    fields.push({
      title: '레이블',
      value: issue.labels.join(', '),
      short: true,
    })
  }

  fields.push({
    title: '생성 시간',
    value: new Date(issue.created_at).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
    }),
    short: false,
  })

  return {
    message: `GitHub 이슈 알림: ${issue.state === 'open' ? '새 이슈 등록' : '이슈 종료'}`,
    options: {
      level,
      title: issue.title,
      url: issue.url,
      fields,
      footer: 'GitHub',
      includeTimestamp: true,
    },
  }
}

/**
 * 헬스체크 알림 포맷팅
 *
 * @param service - 서비스 이름
 * @param status - 서비스 상태
 * @returns 포맷된 Slack 메시지와 옵션
 *
 * @example
 * ```typescript
 * const health: ServiceHealth = {
 *   service: 'Database',
 *   status: 'unhealthy',
 *   latency: 5000,
 *   message: 'Connection timeout',
 *   checked_at: new Date().toISOString()
 * }
 * const { message, options } = formatHealthAlert(health.service, health)
 * await sendSlackNotification(SlackChannel.MONITORING, message, options)
 * ```
 */
export function formatHealthAlert(
  service: string,
  status: ServiceHealth
): {
  message: string
  options: SlackNotificationOptions
} {
  const level: NotificationLevel =
    status.status === 'unhealthy'
      ? 'critical'
      : status.status === 'degraded'
        ? 'warning'
        : 'info'

  const statusText =
    status.status === 'healthy'
      ? '정상'
      : status.status === 'degraded'
        ? '성능 저하'
        : '장애'

  const emoji =
    status.status === 'healthy' ? '✅' : status.status === 'degraded' ? '⚠️' : '🚨'

  const fields: SlackAttachmentField[] = [
    {
      title: '서비스',
      value: service,
      short: true,
    },
    {
      title: '상태',
      value: `${emoji} ${statusText}`,
      short: true,
    },
  ]

  if (status.latency !== undefined) {
    fields.push({
      title: '응답 시간',
      value: `${status.latency}ms`,
      short: true,
    })
  }

  if (status.message) {
    fields.push({
      title: '상세 메시지',
      value: status.message,
      short: false,
    })
  }

  fields.push({
    title: '체크 시간',
    value: new Date(status.checked_at).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
    }),
    short: false,
  })

  return {
    message: `${emoji} ${service} 헬스체크 알림: ${statusText}`,
    options: {
      level,
      title: `서비스 헬스체크 - ${service}`,
      fields,
      footer: 'Health Monitor',
      includeTimestamp: true,
    },
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Slack Webhook URL 설정 여부 확인
 *
 * @returns Webhook URL이 설정되어 있으면 true
 */
export function isSlackEnabled(): boolean {
  return !!getSlackWebhookUrl()
}

/**
 * 알림 레벨에 따른 색상 가져오기
 *
 * @param level - 알림 레벨
 * @returns 색상 코드
 */
export function getNotificationColor(level: NotificationLevel): string {
  return NOTIFICATION_LEVEL_COLORS[level]
}

/**
 * 헬스 상태에 따른 색상 가져오기
 *
 * @param status - 헬스 상태
 * @returns 색상 코드
 */
export function getHealthStatusColor(status: ServiceHealth['status']): string {
  return HEALTH_STATUS_COLORS[status]
}
