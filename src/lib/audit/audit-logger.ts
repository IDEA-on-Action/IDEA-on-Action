/**
 * Audit Logger Utility - v2.36.0
 * 감사 로그 이벤트 기록 유틸리티
 */

import { callWorkersApi } from '@/integrations/cloudflare/client';
import type {
  CreateAuditLogInput,
  AuditContext,
  EventType,
  AuditAction,
  ActorType,
  ResourceType,
  AuditChanges,
  AuditMetadata,
} from '@/types/audit.types';

// ============================================================================
// Constants
// ============================================================================

/** 브라우저 환경 여부 */
const IS_BROWSER = typeof window !== 'undefined';

// ============================================================================
// Context Extraction
// ============================================================================

/**
 * 브라우저 환경에서 감사 컨텍스트 생성
 * IP 주소는 서버에서만 정확히 추출 가능
 */
export function createBrowserAuditContext(): AuditContext {
  if (!IS_BROWSER) {
    return {};
  }

  return {
    user_agent: navigator.userAgent,
    // IP 주소는 서버 측에서 설정해야 함
    // 클라이언트에서는 정확한 IP를 가져올 수 없음
  };
}

/**
 * Request 객체로부터 감사 컨텍스트 추출
 * 주로 서버 사이드에서 사용
 */
export function createAuditContextFromRequest(request: Request): AuditContext {
  return {
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                request.headers.get('x-real-ip') ||
                undefined,
    user_agent: request.headers.get('user-agent') || undefined,
  };
}

/**
 * Workers Auth 토큰 저장 키
 */
const WORKERS_TOKEN_KEY = 'workers_auth_tokens';

/**
 * 현재 세션 ID 가져오기 (Workers Auth 기반)
 */
function getSessionId(): string | undefined {
  try {
    const stored = localStorage.getItem(WORKERS_TOKEN_KEY);
    if (!stored) return undefined;

    const tokens = JSON.parse(stored);
    // JWT에서 세션 ID 추출 (jti claim 사용)
    if (tokens.accessToken) {
      const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
      return payload.jti || payload.sub;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * 현재 사용자 ID 가져오기 (Workers Auth 기반)
 */
function getCurrentUserId(): string | undefined {
  try {
    const stored = localStorage.getItem(WORKERS_TOKEN_KEY);
    if (!stored) return undefined;

    const tokens = JSON.parse(stored);
    // JWT에서 사용자 ID 추출 (sub claim 사용)
    if (tokens.accessToken) {
      const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
      return payload.sub;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// ============================================================================
// Core Logging Functions
// ============================================================================

/**
 * 감사 로그 이벤트 기록
 *
 * @param input 감사 로그 입력 데이터
 * @returns 생성된 로그 ID
 *
 * @example
 * ```typescript
 * await logAuditEvent({
 *   event_type: 'user.login',
 *   action: 'login',
 *   metadata: { method: 'email' }
 * });
 * ```
 */
export async function logAuditEvent(input: CreateAuditLogInput): Promise<string | null> {
  try {
    // 컨텍스트 준비
    const context = input.context || createBrowserAuditContext();
    const session_id = getSessionId();
    const actor_id = input.actor_id || getCurrentUserId();

    // Workers API를 통한 감사 로그 기록
    const stored = localStorage.getItem(WORKERS_TOKEN_KEY);
    const token = stored ? JSON.parse(stored).accessToken : null;

    const { data, error } = await callWorkersApi<{ id: string }>('/api/v1/audit/log', {
      method: 'POST',
      token,
      body: {
        event_type: input.event_type,
        action: input.action,
        actor_id: actor_id || null,
        actor_type: input.actor_type || 'user',
        resource_type: input.resource_type || null,
        resource_id: input.resource_id || null,
        changes: input.changes || null,
        metadata: input.metadata || null,
        ip_address: context.ip_address || null,
        user_agent: context.user_agent || null,
        session_id: session_id || null,
      },
    });

    if (error) {
      console.error('[AuditLogger] Failed to log audit event:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('[AuditLogger] Unexpected error:', error);
    return null;
  }
}

/**
 * 간편한 감사 로그 기록 (빌더 패턴)
 */
export class AuditLogBuilder {
  private input: CreateAuditLogInput;

  constructor(eventType: EventType | string, action: AuditAction) {
    this.input = {
      event_type: eventType,
      action,
    };
  }

  /** 액터 설정 */
  actor(actorId: string, actorType: ActorType = 'user'): this {
    this.input.actor_id = actorId;
    this.input.actor_type = actorType;
    return this;
  }

  /** 리소스 설정 */
  resource(resourceType: ResourceType, resourceId?: string): this {
    this.input.resource_type = resourceType;
    this.input.resource_id = resourceId;
    return this;
  }

  /** 변경사항 추가 */
  changes(changes: AuditChanges): this {
    this.input.changes = changes;
    return this;
  }

  /** 메타데이터 추가 */
  metadata(metadata: AuditMetadata): this {
    this.input.metadata = metadata;
    return this;
  }

  /** 컨텍스트 설정 */
  context(context: AuditContext): this {
    this.input.context = context;
    return this;
  }

  /** 로그 기록 실행 */
  async log(): Promise<string | null> {
    return logAuditEvent(this.input);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * 사용자 로그인 이벤트 기록
 */
export async function logUserLogin(
  userId: string,
  metadata?: { method?: string; provider?: string }
): Promise<string | null> {
  return new AuditLogBuilder('user.login', 'login')
    .actor(userId, 'user')
    .metadata(metadata || {})
    .log();
}

/**
 * 사용자 로그아웃 이벤트 기록
 */
export async function logUserLogout(userId: string): Promise<string | null> {
  return new AuditLogBuilder('user.logout', 'logout')
    .actor(userId, 'user')
    .log();
}

/**
 * 구독 생성 이벤트 기록
 */
export async function logSubscriptionCreated(
  userId: string,
  subscriptionId: string,
  metadata?: { plan?: string; amount?: number }
): Promise<string | null> {
  return new AuditLogBuilder('subscription.created', 'create')
    .actor(userId, 'user')
    .resource('subscription', subscriptionId)
    .metadata(metadata || {})
    .log();
}

/**
 * 구독 취소 이벤트 기록
 */
export async function logSubscriptionCancelled(
  userId: string,
  subscriptionId: string,
  metadata?: { reason?: string }
): Promise<string | null> {
  return new AuditLogBuilder('subscription.cancelled', 'cancel')
    .actor(userId, 'user')
    .resource('subscription', subscriptionId)
    .metadata(metadata || {})
    .log();
}

/**
 * 결제 성공 이벤트 기록
 */
export async function logPaymentSucceeded(
  userId: string,
  paymentId: string,
  metadata?: { amount?: number; method?: string; orderId?: string }
): Promise<string | null> {
  return new AuditLogBuilder('payment.succeeded', 'create')
    .actor(userId, 'user')
    .resource('payment', paymentId)
    .metadata(metadata || {})
    .log();
}

/**
 * 결제 환불 이벤트 기록
 */
export async function logPaymentRefunded(
  userId: string,
  paymentId: string,
  metadata?: { amount?: number; reason?: string }
): Promise<string | null> {
  return new AuditLogBuilder('payment.refunded', 'refund')
    .actor(userId, 'user')
    .resource('payment', paymentId)
    .metadata(metadata || {})
    .log();
}

/**
 * 팀 멤버 추가 이벤트 기록
 */
export async function logTeamMemberAdded(
  actorId: string,
  teamId: string,
  metadata?: { memberEmail?: string; role?: string }
): Promise<string | null> {
  return new AuditLogBuilder('team.member_added', 'create')
    .actor(actorId, 'user')
    .resource('team', teamId)
    .metadata(metadata || {})
    .log();
}

/**
 * 팀 멤버 제거 이벤트 기록
 */
export async function logTeamMemberRemoved(
  actorId: string,
  teamId: string,
  metadata?: { memberEmail?: string }
): Promise<string | null> {
  return new AuditLogBuilder('team.member_removed', 'delete')
    .actor(actorId, 'user')
    .resource('team', teamId)
    .metadata(metadata || {})
    .log();
}

/**
 * 권한 부여 이벤트 기록
 */
export async function logPermissionGranted(
  actorId: string,
  metadata?: { permission?: string; targetUser?: string }
): Promise<string | null> {
  return new AuditLogBuilder('permission.granted', 'grant')
    .actor(actorId, 'admin')
    .resource('permission')
    .metadata(metadata || {})
    .log();
}

/**
 * 권한 회수 이벤트 기록
 */
export async function logPermissionRevoked(
  actorId: string,
  metadata?: { permission?: string; targetUser?: string }
): Promise<string | null> {
  return new AuditLogBuilder('permission.revoked', 'revoke')
    .actor(actorId, 'admin')
    .resource('permission')
    .metadata(metadata || {})
    .log();
}

/**
 * 리소스 생성 이벤트 기록 (범용)
 */
export async function logResourceCreated(
  resourceType: ResourceType,
  resourceId: string,
  actorId?: string,
  metadata?: AuditMetadata
): Promise<string | null> {
  return new AuditLogBuilder(`${resourceType}.created` as EventType, 'create')
    .actor(actorId || getCurrentUserId() || '', 'user')
    .resource(resourceType, resourceId)
    .metadata(metadata || {})
    .log();
}

/**
 * 리소스 업데이트 이벤트 기록 (범용)
 */
export async function logResourceUpdated(
  resourceType: ResourceType,
  resourceId: string,
  changes: AuditChanges,
  actorId?: string
): Promise<string | null> {
  return new AuditLogBuilder(`${resourceType}.updated` as EventType, 'update')
    .actor(actorId || getCurrentUserId() || '', 'user')
    .resource(resourceType, resourceId)
    .changes(changes)
    .log();
}

/**
 * 리소스 삭제 이벤트 기록 (범용)
 */
export async function logResourceDeleted(
  resourceType: ResourceType,
  resourceId: string,
  actorId?: string,
  metadata?: AuditMetadata
): Promise<string | null> {
  return new AuditLogBuilder(`${resourceType}.deleted` as EventType, 'delete')
    .actor(actorId || getCurrentUserId() || '', 'user')
    .resource(resourceType, resourceId)
    .metadata(metadata || {})
    .log();
}

// ============================================================================
// Batch Logging
// ============================================================================

/**
 * 여러 감사 로그를 배치로 기록
 *
 * @param inputs 감사 로그 입력 배열
 * @returns 성공한 로그 ID 배열
 */
export async function logAuditEventsBatch(
  inputs: CreateAuditLogInput[]
): Promise<(string | null)[]> {
  const results = await Promise.allSettled(
    inputs.map(input => logAuditEvent(input))
  );

  return results.map(result =>
    result.status === 'fulfilled' ? result.value : null
  );
}

// ============================================================================
// Exports
// ============================================================================

export default {
  logAuditEvent,
  AuditLogBuilder,
  // User Events
  logUserLogin,
  logUserLogout,
  // Subscription Events
  logSubscriptionCreated,
  logSubscriptionCancelled,
  // Payment Events
  logPaymentSucceeded,
  logPaymentRefunded,
  // Team Events
  logTeamMemberAdded,
  logTeamMemberRemoved,
  // Permission Events
  logPermissionGranted,
  logPermissionRevoked,
  // Generic Resource Events
  logResourceCreated,
  logResourceUpdated,
  logResourceDeleted,
  // Batch
  logAuditEventsBatch,
  // Context Helpers
  createBrowserAuditContext,
  createAuditContextFromRequest,
};
