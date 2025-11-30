// =====================================================
// 감사 로그 이벤트 타입 정의
// =====================================================
// 목적: 시스템 전체에서 사용하는 감사 이벤트 타입 통일
// 사용법: import { AUDIT_EVENTS } from '../_shared/audit-events.ts'
// =====================================================

/**
 * 감사 로그 이벤트 타입 상수
 *
 * 네이밍 규칙: <RESOURCE>_<ACTION>
 * 예: USER_CREATE, TEAM_MEMBER_ADD
 */
export const AUDIT_EVENTS = {
  // =====================================================
  // 인증 (Authentication)
  // =====================================================
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGIN_FAILED: 'auth.login.failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_SIGNUP: 'auth.signup',
  AUTH_TOKEN_REFRESH: 'auth.token.refresh',
  AUTH_PASSWORD_RESET_REQUEST: 'auth.password.reset.request',
  AUTH_PASSWORD_RESET_CONFIRM: 'auth.password.reset.confirm',
  AUTH_PASSWORD_CHANGE: 'auth.password.change',
  AUTH_EMAIL_VERIFY: 'auth.email.verify',
  AUTH_MFA_ENABLE: 'auth.mfa.enable',
  AUTH_MFA_DISABLE: 'auth.mfa.disable',

  // =====================================================
  // 사용자 (User)
  // =====================================================
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_PROFILE_UPDATE: 'user.profile.update',
  USER_AVATAR_UPDATE: 'user.avatar.update',
  USER_ROLE_CHANGE: 'user.role.change',
  USER_STATUS_CHANGE: 'user.status.change',
  USER_DEACTIVATE: 'user.deactivate',
  USER_REACTIVATE: 'user.reactivate',

  // =====================================================
  // 프로필 (Profile)
  // =====================================================
  PROFILE_CREATE: 'profile.create',
  PROFILE_UPDATE: 'profile.update',
  PROFILE_DELETE: 'profile.delete',
  PROFILE_VIEW: 'profile.view',

  // =====================================================
  // 팀 (Team)
  // =====================================================
  TEAM_CREATE: 'team.create',
  TEAM_UPDATE: 'team.update',
  TEAM_DELETE: 'team.delete',
  TEAM_MEMBER_ADD: 'team.member.add',
  TEAM_MEMBER_REMOVE: 'team.member.remove',
  TEAM_MEMBER_ROLE_CHANGE: 'team.member.role.change',
  TEAM_INVITE_SEND: 'team.invite.send',
  TEAM_INVITE_ACCEPT: 'team.invite.accept',
  TEAM_INVITE_REJECT: 'team.invite.reject',
  TEAM_SETTINGS_UPDATE: 'team.settings.update',

  // =====================================================
  // 구독 (Subscription)
  // =====================================================
  SUBSCRIPTION_CREATE: 'subscription.create',
  SUBSCRIPTION_UPDATE: 'subscription.update',
  SUBSCRIPTION_CANCEL: 'subscription.cancel',
  SUBSCRIPTION_RENEW: 'subscription.renew',
  SUBSCRIPTION_UPGRADE: 'subscription.upgrade',
  SUBSCRIPTION_DOWNGRADE: 'subscription.downgrade',
  SUBSCRIPTION_PAYMENT_SUCCESS: 'subscription.payment.success',
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription.payment.failed',
  SUBSCRIPTION_TRIAL_START: 'subscription.trial.start',
  SUBSCRIPTION_TRIAL_END: 'subscription.trial.end',

  // =====================================================
  // 결제 (Payment)
  // =====================================================
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUND: 'payment.refund',
  PAYMENT_METHOD_ADD: 'payment.method.add',
  PAYMENT_METHOD_UPDATE: 'payment.method.update',
  PAYMENT_METHOD_REMOVE: 'payment.method.remove',

  // =====================================================
  // 권한 (Permission)
  // =====================================================
  PERMISSION_GRANT: 'permission.grant',
  PERMISSION_REVOKE: 'permission.revoke',
  PERMISSION_UPDATE: 'permission.update',
  PERMISSION_CHECK: 'permission.check',
  PERMISSION_DENIED: 'permission.denied',

  // =====================================================
  // 역할 (Role)
  // =====================================================
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_ASSIGN: 'role.assign',
  ROLE_UNASSIGN: 'role.unassign',

  // =====================================================
  // 세션 (Session)
  // =====================================================
  SESSION_CREATE: 'session.create',
  SESSION_TERMINATE: 'session.terminate',
  SESSION_TERMINATE_ALL: 'session.terminate.all',
  SESSION_EXTEND: 'session.extend',
  SESSION_EXPIRED: 'session.expired',

  // =====================================================
  // API 키 (API Key)
  // =====================================================
  API_KEY_CREATE: 'api_key.create',
  API_KEY_UPDATE: 'api_key.update',
  API_KEY_DELETE: 'api_key.delete',
  API_KEY_ROTATE: 'api_key.rotate',
  API_KEY_REVOKE: 'api_key.revoke',

  // =====================================================
  // 데이터 (Data)
  // =====================================================
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  DATA_DELETE: 'data.delete',
  DATA_BACKUP: 'data.backup',
  DATA_RESTORE: 'data.restore',

  // =====================================================
  // 설정 (Settings)
  // =====================================================
  SETTINGS_UPDATE: 'settings.update',
  SETTINGS_RESET: 'settings.reset',

  // =====================================================
  // 보안 (Security)
  // =====================================================
  SECURITY_BREACH_DETECTED: 'security.breach.detected',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious.activity',
  SECURITY_IP_BLOCKED: 'security.ip.blocked',
  SECURITY_RATE_LIMIT_EXCEEDED: 'security.rate_limit.exceeded',

  // =====================================================
  // 시스템 (System)
  // =====================================================
  SYSTEM_MAINTENANCE_START: 'system.maintenance.start',
  SYSTEM_MAINTENANCE_END: 'system.maintenance.end',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_MIGRATION: 'system.migration',

  // =====================================================
  // 조직 (Organization)
  // =====================================================
  ORGANIZATION_CREATE: 'organization.create',
  ORGANIZATION_UPDATE: 'organization.update',
  ORGANIZATION_DELETE: 'organization.delete',
  ORGANIZATION_MEMBER_ADD: 'organization.member.add',
  ORGANIZATION_MEMBER_REMOVE: 'organization.member.remove',
  ORGANIZATION_SETTINGS_UPDATE: 'organization.settings.update',

  // =====================================================
  // 프로젝트 (Project) - 향후 확장용
  // =====================================================
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  PROJECT_MEMBER_ADD: 'project.member.add',
  PROJECT_MEMBER_REMOVE: 'project.member.remove',

  // =====================================================
  // 파일 (File) - 향후 확장용
  // =====================================================
  FILE_UPLOAD: 'file.upload',
  FILE_DOWNLOAD: 'file.download',
  FILE_DELETE: 'file.delete',
  FILE_SHARE: 'file.share',

  // =====================================================
  // 알림 (Notification) - 향후 확장용
  // =====================================================
  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_DELETE: 'notification.delete',

  // =====================================================
  // 웹훅 (Webhook) - 향후 확장용
  // =====================================================
  WEBHOOK_CREATE: 'webhook.create',
  WEBHOOK_UPDATE: 'webhook.update',
  WEBHOOK_DELETE: 'webhook.delete',
  WEBHOOK_TRIGGER: 'webhook.trigger',
  WEBHOOK_FAILED: 'webhook.failed',
} as const;

/**
 * 이벤트 타입 (타입 안전성)
 */
export type AuditEventType = typeof AUDIT_EVENTS[keyof typeof AUDIT_EVENTS];

/**
 * 이벤트 카테고리 추출
 * 예: 'auth.login' -> 'auth'
 */
export function getEventCategory(eventType: string): string {
  return eventType.split('.')[0];
}

/**
 * 이벤트 액션 추출
 * 예: 'auth.login' -> 'login'
 */
export function getEventAction(eventType: string): string {
  const parts = eventType.split('.');
  return parts[parts.length - 1];
}

/**
 * 카테고리별 이벤트 그룹화
 */
export const AUDIT_EVENT_CATEGORIES = {
  AUTH: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('auth.')),
  USER: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('user.')),
  PROFILE: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('profile.')),
  TEAM: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('team.')),
  SUBSCRIPTION: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('subscription.')),
  PAYMENT: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('payment.')),
  PERMISSION: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('permission.')),
  ROLE: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('role.')),
  SESSION: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('session.')),
  API_KEY: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('api_key.')),
  DATA: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('data.')),
  SETTINGS: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('settings.')),
  SECURITY: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('security.')),
  SYSTEM: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('system.')),
  ORGANIZATION: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('organization.')),
  PROJECT: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('project.')),
  FILE: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('file.')),
  NOTIFICATION: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('notification.')),
  WEBHOOK: Object.values(AUDIT_EVENTS).filter((e) => e.startsWith('webhook.')),
} as const;

/**
 * 중요도가 높은 이벤트 (보안, 결제, 데이터 삭제 등)
 */
export const CRITICAL_EVENTS = [
  AUDIT_EVENTS.AUTH_LOGIN_FAILED,
  AUDIT_EVENTS.AUTH_PASSWORD_RESET_CONFIRM,
  AUDIT_EVENTS.USER_DELETE,
  AUDIT_EVENTS.USER_ROLE_CHANGE,
  AUDIT_EVENTS.SUBSCRIPTION_PAYMENT_FAILED,
  AUDIT_EVENTS.PAYMENT_REFUND,
  AUDIT_EVENTS.PERMISSION_DENIED,
  AUDIT_EVENTS.SESSION_TERMINATE_ALL,
  AUDIT_EVENTS.DATA_DELETE,
  AUDIT_EVENTS.DATA_EXPORT,
  AUDIT_EVENTS.SECURITY_BREACH_DETECTED,
  AUDIT_EVENTS.SECURITY_SUSPICIOUS_ACTIVITY,
  AUDIT_EVENTS.SECURITY_IP_BLOCKED,
  AUDIT_EVENTS.SYSTEM_ERROR,
] as const;

/**
 * 이벤트가 중요한지 확인
 */
export function isCriticalEvent(eventType: string): boolean {
  return CRITICAL_EVENTS.includes(eventType as any);
}
