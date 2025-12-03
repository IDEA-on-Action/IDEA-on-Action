/**
 * Slack Notification Tests
 *
 * Slack 알림 기능 단위 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  sendSlackNotification,
  formatIssueNotification,
  formatHealthAlert,
  isSlackEnabled,
  getNotificationColor,
  getHealthStatusColor,
  SlackNotificationError,
} from '@/lib/notifications/slack'
import {
  SlackChannel,
  NOTIFICATION_LEVEL_COLORS,
  HEALTH_STATUS_COLORS,
} from '@/types/notification.types'
import type { GitHubIssue, ServiceHealth } from '@/types/notification.types'

// ============================================================================
// Mocks
// ============================================================================

const originalFetch = global.fetch
const mockWebhookUrl = 'https://hooks.slack.com/services/TEST/WEBHOOK/URL'

// 환경 변수 모킹 (모듈 로드 전)
const originalEnv = import.meta.env.VITE_SLACK_WEBHOOK_URL

beforeEach(() => {
  vi.clearAllMocks()
  // fetch mock 설정
  global.fetch = vi.fn()
  // 환경 변수 설정
  vi.stubEnv('VITE_SLACK_WEBHOOK_URL', mockWebhookUrl)
})

afterEach(() => {
  global.fetch = originalFetch
  vi.unstubAllEnvs()
})

// ============================================================================
// sendSlackNotification Tests
// ============================================================================

describe('sendSlackNotification', () => {
  it('Webhook URL이 없으면 에러를 발생시킨다', async () => {
    vi.stubEnv('VITE_SLACK_WEBHOOK_URL', '')

    await expect(
      sendSlackNotification(SlackChannel.GENERAL, 'Test message')
    ).rejects.toThrow(SlackNotificationError)

    await expect(
      sendSlackNotification(SlackChannel.GENERAL, 'Test message')
    ).rejects.toThrow('Slack Webhook URL이 설정되지 않았습니다')
  })

  it('기본 메시지를 성공적으로 전송한다', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response('ok', { status: 200 })
    )

    await sendSlackNotification(SlackChannel.GENERAL, 'Hello Slack')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      mockWebhookUrl,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const callArgs = mockFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1]?.body as string)
    expect(body.text).toBe('Hello Slack')
    expect(body.channel).toBe(SlackChannel.GENERAL)
  })

  it('옵션과 함께 메시지를 전송한다', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response('ok', { status: 200 })
    )

    await sendSlackNotification(SlackChannel.ERRORS, 'Error occurred', {
      level: 'error',
      title: 'Application Error',
      fields: [
        { title: 'Error Type', value: 'DatabaseError', short: true },
        { title: 'Severity', value: 'High', short: true },
      ],
      url: 'https://example.com/error/123',
      footer: 'Error Monitor',
      includeTimestamp: true,
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)

    const callArgs = mockFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1]?.body as string)

    expect(body.attachments).toHaveLength(1)
    expect(body.attachments[0].color).toBe(NOTIFICATION_LEVEL_COLORS.error)
    expect(body.attachments[0].title).toBe('Application Error')
    expect(body.attachments[0].title_link).toBe('https://example.com/error/123')
    expect(body.attachments[0].fields).toHaveLength(2)
    expect(body.attachments[0].footer).toBe('Error Monitor')
    expect(body.attachments[0].ts).toBeDefined()
  })

  it('HTTP 오류 시 SlackNotificationError를 발생시킨다', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'Invalid webhook',
    } as Response)

    await expect(
      sendSlackNotification(SlackChannel.GENERAL, 'Test')
    ).rejects.toThrow(SlackNotificationError)

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'Invalid webhook',
    } as Response)

    await expect(
      sendSlackNotification(SlackChannel.GENERAL, 'Test')
    ).rejects.toThrow('Slack 알림 전송 실패')
  })

  it('응답이 "ok"가 아니면 에러를 발생시킨다', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'invalid_payload',
    } as Response)

    await expect(
      sendSlackNotification(SlackChannel.GENERAL, 'Test')
    ).rejects.toThrow(SlackNotificationError)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'invalid_payload',
    } as Response)

    await expect(
      sendSlackNotification(SlackChannel.GENERAL, 'Test')
    ).rejects.toThrow('Slack 알림 응답 오류')
  })

  it('타임아웃 시 에러를 발생시킨다', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted')
            error.name = 'AbortError'
            reject(error)
          }, 10)
        })
    )

    await expect(
      sendSlackNotification(SlackChannel.GENERAL, 'Test')
    ).rejects.toThrow('Slack 알림 요청 타임아웃')
  })

  it('네트워크 오류 시 에러를 발생시킨다', async () => {
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(
      sendSlackNotification(SlackChannel.GENERAL, 'Test')
    ).rejects.toThrow('Slack 알림 전송 중 오류')
  })
})

// ============================================================================
// formatIssueNotification Tests
// ============================================================================

describe('formatIssueNotification', () => {
  it('일반 이슈를 올바르게 포맷팅한다', () => {
    const issue: GitHubIssue = {
      number: 123,
      title: 'Feature request: Add dark mode',
      url: 'https://github.com/org/repo/issues/123',
      state: 'open',
      author: 'username',
      labels: ['enhancement'],
      created_at: '2025-12-03T10:00:00Z',
    }

    const { message, options } = formatIssueNotification(issue)

    expect(message).toContain('GitHub 이슈 알림')
    expect(message).toContain('새 이슈 등록')
    expect(options.level).toBe('info')
    expect(options.title).toBe('Feature request: Add dark mode')
    expect(options.url).toBe('https://github.com/org/repo/issues/123')
    expect(options.fields).toBeDefined()
    expect(options.fields?.length).toBeGreaterThan(0)
  })

  it('버그 이슈는 warning 레벨로 설정한다', () => {
    const issue: GitHubIssue = {
      number: 456,
      title: 'Bug: Login not working',
      url: 'https://github.com/org/repo/issues/456',
      state: 'open',
      author: 'bugfinder',
      labels: ['bug'],
      created_at: '2025-12-03T10:00:00Z',
    }

    const { options } = formatIssueNotification(issue)

    expect(options.level).toBe('warning')
  })

  it('critical 또는 high-priority 레이블이 있으면 error 레벨로 설정한다', () => {
    const criticalIssue: GitHubIssue = {
      number: 789,
      title: 'Critical: Data loss',
      url: 'https://github.com/org/repo/issues/789',
      state: 'open',
      author: 'admin',
      labels: ['critical', 'bug'],
      created_at: '2025-12-03T10:00:00Z',
    }

    const { options: criticalOptions } = formatIssueNotification(criticalIssue)
    expect(criticalOptions.level).toBe('error')

    const highPriorityIssue: GitHubIssue = {
      number: 790,
      title: 'High priority bug',
      url: 'https://github.com/org/repo/issues/790',
      state: 'open',
      author: 'admin',
      labels: ['high-priority'],
      created_at: '2025-12-03T10:00:00Z',
    }

    const { options: highPriorityOptions } = formatIssueNotification(highPriorityIssue)
    expect(highPriorityOptions.level).toBe('error')
  })

  it('닫힌 이슈를 올바르게 포맷팅한다', () => {
    const issue: GitHubIssue = {
      number: 100,
      title: 'Fixed: Login issue',
      url: 'https://github.com/org/repo/issues/100',
      state: 'closed',
      author: 'developer',
      created_at: '2025-12-03T10:00:00Z',
    }

    const { message, options } = formatIssueNotification(issue)

    expect(message).toContain('이슈 종료')
    expect(options.fields?.find((f) => f.title === '상태')?.value).toBe('닫힘')
  })

  it('레이블이 없는 이슈도 처리한다', () => {
    const issue: GitHubIssue = {
      number: 200,
      title: 'No labels',
      url: 'https://github.com/org/repo/issues/200',
      state: 'open',
      author: 'user',
      created_at: '2025-12-03T10:00:00Z',
    }

    const { options } = formatIssueNotification(issue)

    expect(options.fields?.find((f) => f.title === '레이블')).toBeUndefined()
  })
})

// ============================================================================
// formatHealthAlert Tests
// ============================================================================

describe('formatHealthAlert', () => {
  it('정상 상태를 올바르게 포맷팅한다', () => {
    const health: ServiceHealth = {
      service: 'Database',
      status: 'healthy',
      latency: 50,
      message: 'All systems operational',
      checked_at: '2025-12-03T10:00:00Z',
    }

    const { message, options } = formatHealthAlert('Database', health)

    expect(message).toContain('✅')
    expect(message).toContain('정상')
    expect(options.level).toBe('info')
    expect(options.fields?.find((f) => f.title === '응답 시간')?.value).toBe('50ms')
  })

  it('성능 저하 상태를 올바르게 포맷팅한다', () => {
    const health: ServiceHealth = {
      service: 'API',
      status: 'degraded',
      latency: 2000,
      message: 'Slow response times detected',
      checked_at: '2025-12-03T10:00:00Z',
    }

    const { message, options } = formatHealthAlert('API', health)

    expect(message).toContain('⚠️')
    expect(message).toContain('성능 저하')
    expect(options.level).toBe('warning')
    expect(options.title).toBe('서비스 헬스체크 - API')
  })

  it('장애 상태를 올바르게 포맷팅한다', () => {
    const health: ServiceHealth = {
      service: 'Cache',
      status: 'unhealthy',
      latency: 5000,
      message: 'Connection timeout',
      checked_at: '2025-12-03T10:00:00Z',
    }

    const { message, options } = formatHealthAlert('Cache', health)

    expect(message).toContain('🚨')
    expect(message).toContain('장애')
    expect(options.level).toBe('critical')
  })

  it('latency가 없어도 처리한다', () => {
    const health: ServiceHealth = {
      service: 'Storage',
      status: 'healthy',
      checked_at: '2025-12-03T10:00:00Z',
    }

    const { options } = formatHealthAlert('Storage', health)

    expect(options.fields?.find((f) => f.title === '응답 시간')).toBeUndefined()
  })

  it('message가 없어도 처리한다', () => {
    const health: ServiceHealth = {
      service: 'CDN',
      status: 'healthy',
      latency: 100,
      checked_at: '2025-12-03T10:00:00Z',
    }

    const { options } = formatHealthAlert('CDN', health)

    expect(options.fields?.find((f) => f.title === '상세 메시지')).toBeUndefined()
  })
})

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('isSlackEnabled', () => {
  it('Webhook URL이 설정되어 있으면 true를 반환한다', () => {
    vi.stubEnv('VITE_SLACK_WEBHOOK_URL', mockWebhookUrl)
    expect(isSlackEnabled()).toBe(true)
  })

  it('Webhook URL이 없으면 false를 반환한다', () => {
    vi.stubEnv('VITE_SLACK_WEBHOOK_URL', '')
    expect(isSlackEnabled()).toBe(false)
  })
})

describe('getNotificationColor', () => {
  it('알림 레벨에 따른 색상을 반환한다', () => {
    expect(getNotificationColor('info')).toBe(NOTIFICATION_LEVEL_COLORS.info)
    expect(getNotificationColor('warning')).toBe(NOTIFICATION_LEVEL_COLORS.warning)
    expect(getNotificationColor('error')).toBe(NOTIFICATION_LEVEL_COLORS.error)
    expect(getNotificationColor('critical')).toBe(NOTIFICATION_LEVEL_COLORS.critical)
  })
})

describe('getHealthStatusColor', () => {
  it('헬스 상태에 따른 색상을 반환한다', () => {
    expect(getHealthStatusColor('healthy')).toBe(HEALTH_STATUS_COLORS.healthy)
    expect(getHealthStatusColor('degraded')).toBe(HEALTH_STATUS_COLORS.degraded)
    expect(getHealthStatusColor('unhealthy')).toBe(HEALTH_STATUS_COLORS.unhealthy)
  })
})

// ============================================================================
// Error Class Tests
// ============================================================================

describe('SlackNotificationError', () => {
  it('메시지와 함께 생성된다', () => {
    const error = new SlackNotificationError('Test error')
    expect(error.message).toBe('Test error')
    expect(error.name).toBe('SlackNotificationError')
  })

  it('상태 코드와 응답을 포함할 수 있다', () => {
    const error = new SlackNotificationError('Test error', 400, { error: 'bad_request' })
    expect(error.statusCode).toBe(400)
    expect(error.response).toEqual({ error: 'bad_request' })
  })
})
