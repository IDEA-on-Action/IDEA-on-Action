/**
 * Notification Types
 *
 * Slack 알림 및 알림 시스템을 위한 타입 정의
 *
 * @module types/notification
 */

// ============================================================================
// Notification Level
// ============================================================================

/**
 * 알림 레벨
 *
 * 알림의 중요도를 나타내며, Slack 메시지 색상과 연결됩니다.
 */
export type NotificationLevel = 'info' | 'warning' | 'error' | 'critical'

// ============================================================================
// Slack Channel
// ============================================================================

/**
 * Slack 채널
 *
 * 알림을 보낼 Slack 채널을 정의합니다.
 */
export enum SlackChannel {
  /** 일반 알림 */
  GENERAL = '#general',
  /** 개발 관련 알림 */
  DEVELOPMENT = '#development',
  /** 프로덕션 알림 */
  PRODUCTION = '#production',
  /** 에러 알림 */
  ERRORS = '#errors',
  /** 헬스체크 알림 */
  MONITORING = '#monitoring',
  /** GitHub 이슈 알림 */
  GITHUB = '#github',
  /** 긴급 알림 */
  ALERTS = '#alerts',
}

// ============================================================================
// Slack Message Types
// ============================================================================

/**
 * Slack 메시지 첨부 필드
 */
export interface SlackAttachmentField {
  /** 필드 제목 */
  title: string
  /** 필드 값 */
  value: string
  /** 짧게 표시 여부 (좌우 2컬럼 배치) */
  short?: boolean
}

/**
 * Slack 메시지 첨부
 *
 * Slack의 Attachment 포맷
 * @see https://api.slack.com/messaging/composing/layouts#attachments
 */
export interface SlackAttachment {
  /** 첨부 색상 (hex color 또는 'good', 'warning', 'danger') */
  color?: string
  /** 제목 */
  title?: string
  /** 제목 링크 */
  title_link?: string
  /** 본문 텍스트 */
  text?: string
  /** 필드 목록 */
  fields?: SlackAttachmentField[]
  /** 푸터 텍스트 */
  footer?: string
  /** 푸터 아이콘 URL */
  footer_icon?: string
  /** 타임스탬프 (Unix timestamp) */
  ts?: number
}

/**
 * Slack 메시지
 *
 * Slack Incoming Webhook 메시지 포맷
 * @see https://api.slack.com/messaging/webhooks
 */
export interface SlackMessage {
  /** 메시지 텍스트 (필수) */
  text: string
  /** 채널 (옵션, webhook 기본 채널 사용) */
  channel?: string
  /** 사용자명 */
  username?: string
  /** 아이콘 이모지 */
  icon_emoji?: string
  /** 아이콘 URL */
  icon_url?: string
  /** 첨부 목록 */
  attachments?: SlackAttachment[]
}

// ============================================================================
// Slack Options
// ============================================================================

/**
 * Slack 알림 옵션
 */
export interface SlackNotificationOptions {
  /** 알림 레벨 */
  level?: NotificationLevel
  /** 제목 */
  title?: string
  /** 추가 필드 */
  fields?: SlackAttachmentField[]
  /** 링크 URL */
  url?: string
  /** 푸터 텍스트 */
  footer?: string
  /** 타임스탬프 포함 여부 */
  includeTimestamp?: boolean
}

// ============================================================================
// Issue Notification
// ============================================================================

/**
 * GitHub 이슈 정보
 */
export interface GitHubIssue {
  /** 이슈 번호 */
  number: number
  /** 이슈 제목 */
  title: string
  /** 이슈 URL */
  url: string
  /** 이슈 상태 */
  state: 'open' | 'closed'
  /** 작성자 */
  author: string
  /** 레이블 목록 */
  labels?: string[]
  /** 생성 시간 */
  created_at: string
}

// ============================================================================
// Health Alert
// ============================================================================

/**
 * 서비스 헬스 상태
 */
export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unhealthy'

/**
 * 서비스 헬스 정보
 */
export interface ServiceHealth {
  /** 서비스 이름 */
  service: string
  /** 상태 */
  status: ServiceHealthStatus
  /** 응답 시간 (ms) */
  latency?: number
  /** 상태 메시지 */
  message?: string
  /** 체크 시간 */
  checked_at: string
}

// ============================================================================
// Color Constants
// ============================================================================

/**
 * 알림 레벨별 색상 매핑
 */
export const NOTIFICATION_LEVEL_COLORS: Record<NotificationLevel, string> = {
  info: '#36a64f', // Green
  warning: '#ff9900', // Orange
  error: '#ff0000', // Red
  critical: '#990000', // Dark Red
}

/**
 * 헬스 상태별 색상 매핑
 */
export const HEALTH_STATUS_COLORS: Record<ServiceHealthStatus, string> = {
  healthy: '#36a64f', // Green
  degraded: '#ff9900', // Orange
  unhealthy: '#ff0000', // Red
}

// ============================================================================
// Webhook Response
// ============================================================================

/**
 * Slack Webhook 응답
 */
export interface SlackWebhookResponse {
  /** 성공 여부 */
  ok: boolean
  /** 에러 메시지 (실패 시) */
  error?: string
}
