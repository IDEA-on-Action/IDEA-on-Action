// =====================================================
// 감사 로그(Audit Log) 유틸리티
// =====================================================
// 목적: Edge Function에서 감사 로그를 쉽게 기록
// 사용법: import { logAudit } from '../_shared/audit-log.ts'
// =====================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// =====================================================
// 타입 정의
// =====================================================

/**
 * 행위자 타입
 */
export type ActorType = 'user' | 'system' | 'service' | 'anonymous';

/**
 * 액션 타입
 */
export type Action = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'other';

/**
 * 상태 타입
 */
export type Status = 'success' | 'failure' | 'pending';

/**
 * 감사 로그 엔트리
 */
export interface AuditLogEntry {
  // 이벤트 정보
  eventType: string;

  // 행위자 정보
  actorId?: string;
  actorType: ActorType;
  actorEmail?: string;

  // 리소스 정보
  resourceType?: string;
  resourceId?: string;
  organizationId?: string;

  // 액션 정보
  action: Action;

  // 변경 데이터
  changes?: {
    before?: unknown;
    after?: unknown;
  };
  metadata?: Record<string, unknown>;

  // 성능 정보
  durationMs?: number;

  // 상태 정보
  status: Status;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * 요청 컨텍스트 (Request에서 추출)
 */
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

// =====================================================
// 헬퍼 함수
// =====================================================

/**
 * Request에서 IP 주소 추출
 */
function extractIpAddress(req: Request): string | undefined {
  // Cloudflare, Fastly, 기타 프록시 헤더 확인
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return undefined;
}

/**
 * Request에서 User-Agent 추출
 */
function extractUserAgent(req: Request): string | undefined {
  return req.headers.get('user-agent') || undefined;
}

/**
 * Request에서 요청 ID 추출 (없으면 생성)
 */
function extractRequestId(req: Request): string {
  const existing = req.headers.get('x-request-id');
  if (existing) {
    return existing;
  }

  // UUID v4 생성 (crypto.randomUUID)
  return crypto.randomUUID();
}

/**
 * Request에서 컨텍스트 추출
 */
function extractRequestContext(req?: Request): RequestContext {
  if (!req) {
    return {};
  }

  return {
    ipAddress: extractIpAddress(req),
    userAgent: extractUserAgent(req),
    requestId: extractRequestId(req),
  };
}

/**
 * 민감 정보 마스킹 (비밀번호, 토큰 등)
 */
function maskSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  const sensitiveKeys = [
    'password',
    'password_hash',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'secret',
    'private_key',
    'ssn',
    'credit_card',
  ];

  const masked = { ...data } as Record<string, unknown>;

  for (const key in masked) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
}

// =====================================================
// 주요 함수
// =====================================================

/**
 * 감사 로그 기록
 *
 * @param supabase Supabase 클라이언트
 * @param entry 감사 로그 엔트리
 * @param req Request 객체 (선택)
 * @returns 생성된 감사 로그 ID
 *
 * @example
 * ```typescript
 * await logAudit(supabase, {
 *   eventType: AUDIT_EVENTS.TEAM_MEMBER_ADD,
 *   actorId: userId,
 *   actorType: 'user',
 *   resourceType: 'team',
 *   resourceId: teamId,
 *   action: 'create',
 *   changes: { after: { userId: newMemberId, role: 'member' } },
 *   status: 'success',
 * }, req);
 * ```
 */
export async function logAudit(
  supabase: SupabaseClient,
  entry: AuditLogEntry,
  req?: Request
): Promise<string | null> {
  try {
    const context = extractRequestContext(req);

    // 민감 정보 마스킹
    const maskedChanges = entry.changes
      ? {
          before: entry.changes.before ? maskSensitiveData(entry.changes.before) : undefined,
          after: entry.changes.after ? maskSensitiveData(entry.changes.after) : undefined,
        }
      : undefined;

    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        event_type: entry.eventType,
        actor_id: entry.actorId,
        actor_type: entry.actorType,
        actor_email: entry.actorEmail,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        organization_id: entry.organizationId,
        action: entry.action,
        changes: maskedChanges,
        metadata: entry.metadata,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        request_id: context.requestId,
        duration_ms: entry.durationMs,
        status: entry.status,
        error_code: entry.errorCode,
        error_message: entry.errorMessage,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Audit Log] Failed to insert:', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('[Audit Log] Exception:', err);
    return null;
  }
}

/**
 * 비동기 감사 로그 기록 (Fire-and-Forget)
 * 성능에 영향을 주지 않기 위해 결과를 기다리지 않음
 *
 * @param supabase Supabase 클라이언트
 * @param entry 감사 로그 엔트리
 * @param req Request 객체 (선택)
 */
export function logAuditAsync(
  supabase: SupabaseClient,
  entry: AuditLogEntry,
  req?: Request
): void {
  // Promise를 await 하지 않고 Fire-and-Forget
  logAudit(supabase, entry, req).catch((err) => {
    console.error('[Audit Log Async] Exception:', err);
  });
}

/**
 * 성능 측정과 함께 감사 로그 기록
 *
 * @param supabase Supabase 클라이언트
 * @param entry 감사 로그 엔트리 (durationMs 제외)
 * @param fn 실행할 함수
 * @param req Request 객체 (선택)
 * @returns 함수 실행 결과
 *
 * @example
 * ```typescript
 * const result = await logAuditWithTiming(
 *   supabase,
 *   {
 *     eventType: AUDIT_EVENTS.SUBSCRIPTION_CREATE,
 *     actorId: userId,
 *     actorType: 'user',
 *     action: 'create',
 *     status: 'success',
 *   },
 *   async () => {
 *     return await createSubscription(userId, planId);
 *   },
 *   req
 * );
 * ```
 */
export async function logAuditWithTiming<T>(
  supabase: SupabaseClient,
  entry: Omit<AuditLogEntry, 'durationMs'>,
  fn: () => Promise<T>,
  req?: Request
): Promise<T> {
  const startTime = Date.now();
  let result: T;
  let finalEntry: AuditLogEntry;

  try {
    result = await fn();
    const durationMs = Date.now() - startTime;

    finalEntry = {
      ...entry,
      durationMs,
      status: 'success',
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    finalEntry = {
      ...entry,
      durationMs,
      status: 'failure',
      errorCode: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
    };

    // 비동기로 로그 기록 후 에러 재발생
    logAuditAsync(supabase, finalEntry, req);
    throw error;
  }

  // 비동기로 로그 기록
  logAuditAsync(supabase, finalEntry, req);

  return result;
}

/**
 * 특정 리소스의 감사 로그 조회
 *
 * @param supabase Supabase 클라이언트
 * @param resourceType 리소스 타입
 * @param resourceId 리소스 ID
 * @param limit 조회 개수 (기본 50)
 */
export async function getResourceAuditLogs(
  supabase: SupabaseClient,
  resourceType: string,
  resourceId: string,
  limit = 50
) {
  const { data, error } = await supabase.rpc('get_resource_audit_logs', {
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_limit: limit,
  });

  if (error) {
    console.error('[Audit Log] Failed to get resource logs:', error);
    return null;
  }

  return data;
}

/**
 * 특정 사용자의 감사 로그 조회
 *
 * @param supabase Supabase 클라이언트
 * @param actorId 행위자 ID
 * @param limit 조회 개수 (기본 50)
 */
export async function getUserAuditLogs(
  supabase: SupabaseClient,
  actorId: string,
  limit = 50
) {
  const { data, error } = await supabase.rpc('get_user_audit_logs', {
    p_actor_id: actorId,
    p_limit: limit,
  });

  if (error) {
    console.error('[Audit Log] Failed to get user logs:', error);
    return null;
  }

  return data;
}
