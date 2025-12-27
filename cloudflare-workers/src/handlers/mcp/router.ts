/**
 * MCP 이벤트 라우터 핸들러
 * 이벤트 전달 및 라우터 상태 조회
 *
 * Supabase Edge Functions mcp-router에서 마이그레이션
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import {
  VALID_SERVICE_IDS,
  type ServiceId,
} from '../../lib/mcp/constants';
import { verifyJWT } from '../../lib/mcp/jwt';

const router = new Hono<AppType>();

// ============================================================================
// 타입 정의
// ============================================================================

type EventPriority = 'critical' | 'high' | 'normal' | 'low';
type EventTarget = 'service_health' | 'service_issues' | 'service_events' | 'event_queue' | 'notifications';

interface DispatchRequest {
  event_type: string;
  source_service: ServiceId;
  target_service?: ServiceId | '*';
  payload: Record<string, unknown>;
  priority?: EventPriority;
  metadata?: {
    correlation_id?: string;
    timestamp?: string;
    idempotency_key?: string;
  };
}

interface RoutingRule {
  event_pattern: RegExp;
  target_table: EventTarget;
  transform?: (payload: Record<string, unknown>, sourceService: ServiceId) => Record<string, unknown>;
  notify?: boolean;
  priority_threshold?: EventPriority;
}

// ============================================================================
// 라우팅 규칙
// ============================================================================

const ROUTING_RULES: RoutingRule[] = [
  {
    event_pattern: /^service\.health\.update$/,
    target_table: 'service_health',
    transform: (payload, sourceService) => ({
      service_id: sourceService,
      status: payload.status || 'healthy',
      last_ping: new Date().toISOString(),
      metrics: payload.metrics || {},
    }),
  },
  {
    event_pattern: /^system\.health_check$/,
    target_table: 'service_health',
    transform: (payload, sourceService) => ({
      service_id: sourceService,
      status: payload.status || 'healthy',
      last_ping: new Date().toISOString(),
      metrics: payload.details || {},
    }),
  },
  {
    event_pattern: /^service\.issue\.created$/,
    target_table: 'service_issues',
    transform: (payload, sourceService) => ({
      service_id: sourceService,
      severity: payload.severity || 'medium',
      title: payload.title || 'Untitled Issue',
      description: payload.description,
      project_id: payload.project_id,
      reported_by: payload.reported_by,
      status: 'open',
    }),
    notify: true,
    priority_threshold: 'high',
  },
  {
    event_pattern: /^service\.event\.logged$/,
    target_table: 'service_events',
    transform: (payload, sourceService) => ({
      service_id: sourceService,
      event_type: payload.event_type || 'generic',
      project_id: payload.project_id,
      user_id: payload.user_id,
      payload: payload.data || {},
    }),
  },
  {
    event_pattern: /^api\.usage_reported$/,
    target_table: 'service_events',
    transform: (payload, sourceService) => ({
      service_id: sourceService,
      event_type: 'api.usage_reported',
      user_id: (payload.metadata as Record<string, unknown>)?.userId,
      payload: {
        endpoint: payload.endpoint,
        method: payload.method,
        statusCode: payload.statusCode,
        responseTimeMs: payload.responseTimeMs,
      },
    }),
  },
  {
    event_pattern: /^agent\.executed$/,
    target_table: 'service_events',
    transform: (payload, sourceService) => ({
      service_id: sourceService,
      event_type: 'agent.executed',
      user_id: (payload.metadata as Record<string, unknown>)?.userId,
      payload: {
        agentType: payload.agentType,
        action: payload.action,
        executionTimeMs: payload.executionTimeMs,
        tokenUsage: payload.tokenUsage,
        status: payload.status,
      },
    }),
  },
  {
    event_pattern: /^.*$/,
    target_table: 'event_queue',
    transform: (payload, sourceService) => ({
      source_service: sourceService,
      event_type: 'generic',
      payload,
    }),
  },
];

const PRIORITY_DELAYS: Record<EventPriority, number> = {
  critical: 0,
  high: 100,
  normal: 500,
  low: 1000,
};

const ROUTER_START_TIME = Date.now();

// ============================================================================
// 유틸리티 함수
// ============================================================================

function findRoutingRule(eventType: string): RoutingRule | undefined {
  return ROUTING_RULES.find((rule) => rule.event_pattern.test(eventType));
}

function isPriorityAbove(priority: EventPriority, threshold: EventPriority): boolean {
  const priorities: EventPriority[] = ['critical', 'high', 'normal', 'low'];
  return priorities.indexOf(priority) <= priorities.indexOf(threshold);
}

// ============================================================================
// POST /mcp/router/dispatch - 이벤트 전달
// ============================================================================

router.post('/dispatch', async (c) => {
  const db = c.env.DB;
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();

  // 토큰 검증
  const authHeader = c.req.header('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'unauthorized', message: '인증 토큰이 필요합니다.', request_id: requestId } }, 401);
  }

  const token = authHeader.substring(7);
  const jwtSecret = c.env.MCP_JWT_SECRET;
  const tokenResult = await verifyJWT(token, jwtSecret);

  if (!tokenResult.valid) {
    return c.json({ error: { code: tokenResult.errorCode, message: tokenResult.error, request_id: requestId } }, 401);
  }

  const body = await c.req.json<DispatchRequest>();

  if (!body.event_type) {
    return c.json({ error: { code: 'missing_field', message: 'event_type 필드가 필요합니다.', request_id: requestId } }, 400);
  }

  if (!body.source_service) {
    return c.json({ error: { code: 'missing_field', message: 'source_service 필드가 필요합니다.', request_id: requestId } }, 400);
  }

  if (!VALID_SERVICE_IDS.includes(body.source_service)) {
    return c.json({ error: { code: 'invalid_service', message: '유효하지 않은 source_service입니다.', request_id: requestId } }, 400);
  }

  const priority: EventPriority = body.priority || 'normal';
  const idempotencyKey = c.req.header('x-idempotency-key') || body.metadata?.idempotency_key;

  // 멱등성 키 확인
  if (idempotencyKey) {
    const existing = await db
      .prepare('SELECT id, status FROM event_queue WHERE idempotency_key = ?')
      .bind(idempotencyKey)
      .first<{ id: string; status: string }>();

    if (existing) {
      return c.json({
        dispatched: true,
        dispatch_id: existing.id,
        status: existing.status,
        message: '이미 처리된 요청입니다 (멱등성 키 일치).',
      });
    }
  }

  const rule = findRoutingRule(body.event_type);
  if (!rule) {
    return c.json({ error: { code: 'no_routing_rule', message: '해당 이벤트 타입에 대한 라우팅 규칙이 없습니다.', request_id: requestId } }, 400);
  }

  const transformedPayload = rule.transform
    ? rule.transform(body.payload, body.source_service)
    : body.payload;

  let dispatchId: string | null = null;
  let status: 'queued' | 'processed' = 'queued';

  try {
    switch (rule.target_table) {
      case 'service_health': {
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
            (transformedPayload as Record<string, unknown>).service_id,
            (transformedPayload as Record<string, unknown>).status,
            JSON.stringify((transformedPayload as Record<string, unknown>).metrics || {})
          )
          .run();
        status = 'processed';
        break;
      }

      case 'service_issues': {
        dispatchId = crypto.randomUUID();
        await db
          .prepare(`
            INSERT INTO service_issues (id, service_id, severity, title, description, project_id, reported_by, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
          `)
          .bind(
            dispatchId,
            (transformedPayload as Record<string, unknown>).service_id,
            (transformedPayload as Record<string, unknown>).severity,
            (transformedPayload as Record<string, unknown>).title,
            (transformedPayload as Record<string, unknown>).description || null,
            (transformedPayload as Record<string, unknown>).project_id || null,
            (transformedPayload as Record<string, unknown>).reported_by || null
          )
          .run();
        status = 'processed';
        break;
      }

      case 'service_events': {
        dispatchId = crypto.randomUUID();
        await db
          .prepare(`
            INSERT INTO service_events (id, service_id, event_type, project_id, user_id, payload)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .bind(
            dispatchId,
            (transformedPayload as Record<string, unknown>).service_id,
            (transformedPayload as Record<string, unknown>).event_type,
            (transformedPayload as Record<string, unknown>).project_id || null,
            (transformedPayload as Record<string, unknown>).user_id || null,
            JSON.stringify((transformedPayload as Record<string, unknown>).payload || {})
          )
          .run();
        status = 'processed';
        break;
      }

      case 'event_queue':
      default: {
        dispatchId = crypto.randomUUID();
        await db
          .prepare(`
            INSERT INTO event_queue (id, event_type, source_service, target_service, payload, priority, status, retry_count, idempotency_key)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?)
          `)
          .bind(
            dispatchId,
            body.event_type,
            body.source_service,
            body.target_service || null,
            JSON.stringify(transformedPayload),
            priority,
            idempotencyKey || null
          )
          .run();
        break;
      }
    }

    // 알림 생성
    if (rule.notify && rule.priority_threshold && isPriorityAbove(priority, rule.priority_threshold)) {
      await createNotification(db, body.event_type, body.source_service, body.payload);
    }

    console.log(`Event dispatched: ${body.event_type} from ${body.source_service}, priority: ${priority}`);

    return c.json({
      dispatched: true,
      dispatch_id: dispatchId || crypto.randomUUID(),
      status,
      estimated_delivery: new Date(Date.now() + PRIORITY_DELAYS[priority]).toISOString(),
      retry_policy: {
        max_retries: 3,
        backoff_type: 'exponential',
        initial_delay_ms: 1000,
      },
    }, 202);
  } catch (error) {
    console.error('Dispatch error:', error);
    return c.json({ error: { code: 'dispatch_failed', message: '이벤트 전달에 실패했습니다.', request_id: requestId } }, 500);
  }
});

// ============================================================================
// GET /mcp/router/status - 라우터 상태 조회
// ============================================================================

router.get('/status', async (c) => {
  const db = c.env.DB;
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();

  // 토큰 검증
  const authHeader = c.req.header('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'unauthorized', message: '인증 토큰이 필요합니다.', request_id: requestId } }, 401);
  }

  const token = authHeader.substring(7);
  const jwtSecret = c.env.MCP_JWT_SECRET;
  const tokenResult = await verifyJWT(token, jwtSecret);

  if (!tokenResult.valid) {
    return c.json({ error: { code: tokenResult.errorCode, message: tokenResult.error, request_id: requestId } }, 401);
  }

  try {
    // 통계 조회
    const [total, successful, failed, pending] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM event_queue').first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM event_queue WHERE status = 'completed'").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM event_queue WHERE status = 'failed'").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM event_queue WHERE status = 'pending'").first<{ count: number }>(),
    ]);

    // 우선순위별 대기열 깊이
    const [criticalCount, highCount, normalCount, lowCount] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM event_queue WHERE priority = 'critical' AND status = 'pending'").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM event_queue WHERE priority = 'high' AND status = 'pending'").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM event_queue WHERE priority = 'normal' AND status = 'pending'").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM event_queue WHERE priority = 'low' AND status = 'pending'").first<{ count: number }>(),
    ]);

    // 최근 이벤트
    const recentEvent = await db
      .prepare('SELECT created_at FROM event_queue ORDER BY created_at DESC LIMIT 1')
      .first<{ created_at: string }>();

    // 서비스 헬스
    const healthData = await db
      .prepare('SELECT service_id, status, last_ping, metrics FROM service_health')
      .all<{ service_id: string; status: string; last_ping: string; metrics: string }>();

    const services: Record<string, { status: string; latency_ms?: number }> = {
      'minu-find': { status: 'disconnected' },
      'minu-frame': { status: 'disconnected' },
      'minu-build': { status: 'disconnected' },
      'minu-keep': { status: 'disconnected' },
      'central-hub': { status: 'connected', latency_ms: 0 },
    };

    if (healthData.results) {
      for (const health of healthData.results) {
        if (services[health.service_id]) {
          const metrics = health.metrics ? JSON.parse(health.metrics) : {};
          services[health.service_id] = {
            status: health.status === 'healthy' ? 'connected' : health.status === 'degraded' ? 'degraded' : 'disconnected',
            latency_ms: metrics.response_time_ms,
          };
        }
      }
    }

    const totalCount = total?.count || 0;
    const successCount = successful?.count || 0;
    const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 10000) / 100 : 100;

    return c.json({
      status: (pending?.count || 0) > 100 ? 'degraded' : 'healthy',
      uptime_seconds: Math.floor((Date.now() - ROUTER_START_TIME) / 1000),
      statistics: {
        total_dispatched: totalCount,
        successful: successCount,
        failed: failed?.count || 0,
        pending: pending?.count || 0,
        success_rate: successRate,
      },
      queue_depth: {
        critical: criticalCount?.count || 0,
        high: highCount?.count || 0,
        normal: normalCount?.count || 0,
        low: lowCount?.count || 0,
      },
      last_dispatch: recentEvent?.created_at,
      services,
    });
  } catch (error) {
    console.error('Status error:', error);
    return c.json({ error: { code: 'status_failed', message: '상태 조회에 실패했습니다.', request_id: requestId } }, 500);
  }
});

// ============================================================================
// 헬퍼 함수
// ============================================================================

async function createNotification(
  db: D1Database,
  eventType: string,
  sourceService: ServiceId,
  payload: Record<string, unknown>
) {
  try {
    const admins = await db
      .prepare("SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')")
      .all<{ id: string }>();

    if (!admins.results || admins.results.length === 0) return;

    const title = `[${sourceService}] ${eventType}`;
    const message = (payload.title || payload.description || JSON.stringify(payload).slice(0, 200)) as string;

    for (const admin of admins.results) {
      await db
        .prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, read)
          VALUES (?, ?, ?, ?, 'system', 0)
        `)
        .bind(crypto.randomUUID(), admin.id, title, message)
        .run();
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export default router;
