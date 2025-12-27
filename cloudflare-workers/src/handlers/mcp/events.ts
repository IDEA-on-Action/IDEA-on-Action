/**
 * MCP 서비스 이벤트 수신 핸들러
 * 외부 Minu 서비스에서 발생한 이벤트를 수신하고 저장
 *
 * Supabase Edge Functions receive-service-event에서 마이그레이션
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import {
  VALID_SERVICE_IDS,
  type ServiceId,
} from '../../lib/mcp/constants';
import {
  verifyJWT,
  hasRequiredScopes,
  verifyHmacSignature,
  verifyTimestamp,
} from '../../lib/mcp/jwt';

const events = new Hono<AppType>();

// ============================================================================
// 타입 정의
// ============================================================================

interface BaseEventPayload {
  id: string;
  type: string;
  service: string;
  data: Record<string, unknown>;
  metadata: {
    userId?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

interface LegacyPayload {
  event_type: string;
  payload?: Record<string, unknown>;
  project_id?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

interface NormalizedEvent {
  event_type: string;
  payload: Record<string, unknown>;
  project_id?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
  schema_version: 'legacy' | 'base_event';
  event_id?: string;
}

type AuthMethod = 'jwt' | 'hmac';

// ============================================================================
// 유틸리티 함수
// ============================================================================

function isBaseEventFormat(raw: unknown): raw is BaseEventPayload {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  return (
    typeof obj.type === 'string' &&
    typeof obj.data === 'object' &&
    typeof obj.metadata === 'object' &&
    typeof obj.service === 'string'
  );
}

function normalizePayload(raw: LegacyPayload | BaseEventPayload): NormalizedEvent {
  if (isBaseEventFormat(raw)) {
    return {
      event_type: raw.type,
      payload: raw.data as Record<string, unknown>,
      user_id: raw.metadata?.userId,
      metadata: raw.metadata as Record<string, unknown>,
      schema_version: 'base_event',
      event_id: raw.id,
    };
  }

  const legacy = raw as LegacyPayload;
  return {
    event_type: legacy.event_type,
    payload: (legacy.payload || {}) as Record<string, unknown>,
    project_id: legacy.project_id,
    user_id: legacy.user_id || (legacy.metadata as Record<string, string>)?.userId,
    metadata: legacy.metadata as Record<string, unknown>,
    schema_version: 'legacy',
  };
}

// ============================================================================
// POST /mcp/events - 이벤트 수신
// ============================================================================

events.post('/', async (c) => {
  const db = c.env.DB;

  const authHeader = c.req.header('authorization');
  const signature = c.req.header('x-signature');
  const timestamp = c.req.header('x-timestamp');

  let serviceId: string | null = null;
  let authMethod: AuthMethod | null = null;

  const body = await c.req.text();
  if (!body) {
    return c.json({ error: { code: 'empty_body', message: '요청 본문이 비어 있습니다.' }, received: false }, 400);
  }

  // JWT 인증
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const jwtSecret = c.env.MCP_JWT_SECRET;
    const result = await verifyJWT(token, jwtSecret);

    if (!result.valid) {
      return c.json({ error: { code: result.errorCode, message: result.error }, received: false }, 401);
    }

    if (!hasRequiredScopes(result.payload!, ['events:write'])) {
      return c.json({ error: { code: 'insufficient_scope', message: 'events:write 권한이 필요합니다.' }, received: false }, 403);
    }

    serviceId = result.payload!.sub;
    authMethod = 'jwt';
  }
  // HMAC 인증
  else if (signature) {
    serviceId = c.req.header('x-service-id') || null;

    if (!serviceId) {
      return c.json({ error: { code: 'missing_header', message: 'X-Service-Id 헤더가 필요합니다.' }, received: false }, 400);
    }

    if (!VALID_SERVICE_IDS.includes(serviceId as ServiceId)) {
      return c.json({ error: { code: 'invalid_service', message: '유효하지 않은 서비스 ID입니다.' }, received: false }, 400);
    }

    if (timestamp && !verifyTimestamp(timestamp)) {
      return c.json({ error: { code: 'invalid_timestamp', message: '타임스탬프가 만료되었습니다.' }, received: false }, 401);
    }

    const secretEnvName = `WEBHOOK_SECRET_${serviceId.toUpperCase().replace(/-/g, '_')}` as `WEBHOOK_SECRET_${string}`;
    const secret = c.env[secretEnvName];

    if (!secret) {
      return c.json({ error: { code: 'config_error', message: '서비스 설정 오류입니다.' }, received: false }, 500);
    }

    const isValidSignature = await verifyHmacSignature(body, signature, secret);
    if (!isValidSignature) {
      return c.json({ error: { code: 'invalid_signature', message: 'HMAC 서명이 유효하지 않습니다.' }, received: false }, 401);
    }

    authMethod = 'hmac';
  } else {
    return c.json({ error: { code: 'unauthorized', message: '인증 정보가 필요합니다.' }, received: false }, 401);
  }

  // 페이로드 파싱
  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(body);
  } catch {
    return c.json({ error: { code: 'invalid_json', message: '유효하지 않은 JSON 형식입니다.' }, received: false }, 400);
  }

  const normalized = normalizePayload(rawPayload as LegacyPayload | BaseEventPayload);

  if (!normalized.event_type) {
    return c.json({ error: { code: 'invalid_payload', message: 'event_type이 필요합니다.' }, received: false }, 400);
  }

  console.log(`Event: ${normalized.event_type} from ${serviceId} (schema: ${normalized.schema_version})`);

  let eventId: string | null = null;

  try {
    // 이벤트 유형별 처리
    switch (normalized.event_type) {
      case 'issue.created': {
        const result = await db
          .prepare(`
            INSERT INTO service_issues (id, service_id, severity, title, description, project_id, reported_by, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
          `)
          .bind(
            crypto.randomUUID(),
            serviceId,
            normalized.payload?.severity || 'medium',
            normalized.payload?.title || 'Untitled Issue',
            normalized.payload?.description || null,
            normalized.project_id || null,
            normalized.user_id || null
          )
          .run();

        // Critical/High 이슈는 알림 생성
        if (['critical', 'high'].includes(String(normalized.payload?.severity))) {
          await createNotification(
            db,
            `[${serviceId}] ${String(normalized.payload?.severity).toUpperCase()} 이슈: ${normalized.payload?.title}`,
            String(normalized.payload?.description || '')
          );
        }
        break;
      }

      case 'issue.resolved': {
        if (normalized.payload?.issue_id) {
          await db
            .prepare(`
              UPDATE service_issues
              SET status = 'resolved', resolved_at = datetime('now'), resolution = ?
              WHERE id = ?
            `)
            .bind(normalized.payload?.resolution || null, normalized.payload.issue_id)
            .run();
        }
        break;
      }

      case 'service.health':
      case 'system.health_check': {
        await db
          .prepare(`
            INSERT INTO service_health (service_id, status, last_ping, metrics)
            VALUES (?, ?, datetime('now'), ?)
            ON CONFLICT(service_id) DO UPDATE SET
              status = excluded.status,
              last_ping = excluded.last_ping,
              metrics = excluded.metrics
          `)
          .bind(
            serviceId,
            normalized.payload?.status || 'healthy',
            JSON.stringify(normalized.payload?.metrics || normalized.payload || {})
          )
          .run();

        if (normalized.payload?.status === 'unhealthy') {
          await createNotification(db, `[${serviceId}] 서비스 상태 이상`, '서비스가 unhealthy 상태입니다.');
        }
        break;
      }

      case 'source.synced': {
        if (['partial', 'failed'].includes(String(normalized.payload?.status))) {
          await createNotification(
            db,
            `[${serviceId}] 소스 동기화 ${normalized.payload?.status}`,
            `${normalized.payload?.sourceName}: ${normalized.payload?.errorMessage || '동기화 문제 발생'}`
          );
        }
        break;
      }

      default:
        break;
    }

    // 모든 이벤트를 이벤트 로그에 저장
    const insertResult = await db
      .prepare(`
        INSERT INTO service_events (id, service_id, event_type, project_id, user_id, payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        serviceId,
        normalized.event_type,
        normalized.project_id || null,
        normalized.user_id || null,
        JSON.stringify(normalized.payload || {})
      )
      .run();

    // 마지막 삽입 ID 가져오기
    const lastEvent = await db
      .prepare('SELECT id FROM service_events WHERE service_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(serviceId)
      .first<{ id: string }>();

    eventId = lastEvent?.id || crypto.randomUUID();

    console.log(`Event saved: ${normalized.event_type} from ${serviceId} (id: ${eventId}, auth: ${authMethod})`);

    return c.json({ received: true, event_id: eventId });
  } catch (error) {
    console.error('Error processing event:', error);
    return c.json({ error: { code: 'internal_error', message: '이벤트 처리 중 오류가 발생했습니다.' }, received: false }, 500);
  }
});

// ============================================================================
// 헬퍼 함수
// ============================================================================

async function createNotification(db: D1Database, title: string, message?: string) {
  try {
    const admins = await db
      .prepare("SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')")
      .all<{ id: string }>();

    if (!admins.results || admins.results.length === 0) return;

    for (const admin of admins.results) {
      await db
        .prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, read)
          VALUES (?, ?, ?, ?, 'system', 0)
        `)
        .bind(crypto.randomUUID(), admin.id, title, message || '')
        .run();
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export default events;
