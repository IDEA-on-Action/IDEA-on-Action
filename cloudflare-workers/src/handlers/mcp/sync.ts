/**
 * MCP 상태 동기화 핸들러
 * Cloudflare Workers용
 *
 * Supabase Edge Functions mcp-sync에서 마이그레이션
 * - 서비스 상태 업데이트/조회
 * - KV 기반 캐싱 (인메모리 대신)
 * - 캐시 무효화
 */

import { Hono } from 'hono';
import { AppType } from '../../types';

const sync = new Hono<AppType>();

// ============================================================================
// 타입 정의
// ============================================================================

type ServiceId = 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep' | 'central-hub';
type StateType = 'health' | 'capabilities' | 'config' | 'metadata';
type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

interface StateUpdateRequest {
  service_id: ServiceId;
  state_type: StateType;
  state: Record<string, unknown>;
  ttl_seconds?: number;
}

interface ServiceStateRecord {
  id: string;
  service_id: ServiceId;
  state_type: StateType;
  state: Record<string, unknown>;
  version: number;
  ttl_seconds: number;
  synced_at: string;
  expires_at: string;
}

// ============================================================================
// 상수
// ============================================================================

const VALID_SERVICE_IDS: ServiceId[] = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep', 'central-hub'];
const VALID_STATE_TYPES: StateType[] = ['health', 'capabilities', 'config', 'metadata'];

const DEFAULT_TTL: Record<StateType, number> = {
  health: 60,        // 1분
  capabilities: 3600, // 1시간
  config: 3600,      // 1시간
  metadata: 300,     // 5분
};

const CACHE_TTL_SECONDS = 300; // 5분

// ============================================================================
// 유틸리티 함수
// ============================================================================

function getCacheKey(serviceId: ServiceId, stateType?: StateType): string {
  return stateType ? `state:${serviceId}:${stateType}` : `state:${serviceId}`;
}

function verifyToken(token: string): { valid: boolean; service_id?: ServiceId; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'invalid_token_format' };
    }

    const payloadBase64 = parts[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'token_expired' };
    }

    if (payload.iss !== 'mcp-auth') {
      return { valid: false, error: 'invalid_issuer' };
    }

    const serviceId = payload.sub as ServiceId;
    if (!VALID_SERVICE_IDS.includes(serviceId)) {
      return { valid: false, error: 'invalid_service' };
    }

    return { valid: true, service_id: serviceId };
  } catch {
    return { valid: false, error: 'token_verification_failed' };
  }
}

// ============================================================================
// POST /mcp/sync/state - 상태 업데이트
// ============================================================================

sync.post('/state', async (c) => {
  const db = c.env.DB;
  const cache = c.env.CACHE;

  // 토큰 검증
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return c.json({ error: { code: 'unauthorized', message: '인증 토큰이 필요합니다.' } }, 401);
  }

  const tokenResult = verifyToken(token);
  if (!tokenResult.valid) {
    return c.json({ error: { code: tokenResult.error, message: '유효하지 않은 토큰입니다.' } }, 401);
  }

  // 요청 본문
  let body: StateUpdateRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: 'invalid_payload', message: '유효하지 않은 JSON입니다.' } }, 400);
  }

  // 검증
  if (!body.service_id || !VALID_SERVICE_IDS.includes(body.service_id)) {
    return c.json({ error: { code: 'invalid_service', message: '유효하지 않은 service_id입니다.' } }, 400);
  }

  if (!body.state_type || !VALID_STATE_TYPES.includes(body.state_type)) {
    return c.json({ error: { code: 'invalid_state_type', message: '유효하지 않은 state_type입니다.' } }, 400);
  }

  if (!body.state || typeof body.state !== 'object') {
    return c.json({ error: { code: 'missing_field', message: 'state 필드가 필요합니다.' } }, 400);
  }

  const ttlSeconds = body.ttl_seconds || DEFAULT_TTL[body.state_type];
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const syncedAt = new Date().toISOString();

  try {
    // 기존 버전 조회
    const existing = await db
      .prepare('SELECT version FROM service_states WHERE service_id = ? AND state_type = ?')
      .bind(body.service_id, body.state_type)
      .first<{ version: number }>();

    const newVersion = (existing?.version || 0) + 1;
    const stateId = crypto.randomUUID();

    // Upsert
    await db
      .prepare(`
        INSERT INTO service_states (id, service_id, state_type, state, version, ttl_seconds, synced_at, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(service_id, state_type) DO UPDATE SET
          state = excluded.state,
          version = excluded.version,
          ttl_seconds = excluded.ttl_seconds,
          synced_at = excluded.synced_at,
          expires_at = excluded.expires_at,
          updated_at = datetime('now')
      `)
      .bind(
        stateId,
        body.service_id,
        body.state_type,
        JSON.stringify(body.state),
        newVersion,
        ttlSeconds,
        syncedAt,
        expiresAt
      )
      .run();

    // 캐시 업데이트
    const cacheKey = getCacheKey(body.service_id, body.state_type);
    await cache.put(cacheKey, JSON.stringify({
      service_id: body.service_id,
      state_type: body.state_type,
      state: body.state,
      version: newVersion,
      synced_at: syncedAt,
      expires_at: expiresAt,
    }), { expirationTtl: CACHE_TTL_SECONDS });

    // service_health 테이블도 업데이트 (health 타입인 경우)
    if (body.state_type === 'health') {
      try {
        await db
          .prepare(`
            INSERT INTO service_health (service_id, status, last_ping, metrics, version)
            VALUES (?, ?, datetime('now'), ?, ?)
            ON CONFLICT(service_id) DO UPDATE SET
              status = excluded.status,
              last_ping = datetime('now'),
              metrics = excluded.metrics,
              version = excluded.version
          `)
          .bind(
            body.service_id,
            (body.state.status as string) || 'healthy',
            JSON.stringify(body.state.metrics || {}),
            (body.state.version as string) || '1.0.0'
          )
          .run();
      } catch (healthError) {
        console.warn('service_health update failed:', healthError);
        // 테이블이 없거나 스키마가 다를 경우 무시
      }
    }

    console.log(`State synced: ${body.service_id}/${body.state_type} v${newVersion}`);

    return c.json({
      synced: true,
      sync_id: stateId,
      service_id: body.service_id,
      state_type: body.state_type,
      version: newVersion,
      synced_at: syncedAt,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error('State update error:', error);
    return c.json({ error: { code: 'sync_failed', message: '상태 동기화에 실패했습니다.' } }, 500);
  }
});

// ============================================================================
// GET /mcp/sync/state/:serviceId - 특정 서비스 상태 조회
// ============================================================================

sync.get('/state/:serviceId', async (c) => {
  const db = c.env.DB;
  const cache = c.env.CACHE;
  const serviceId = c.req.param('serviceId') as ServiceId;

  // 토큰 검증
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return c.json({ error: { code: 'unauthorized', message: '인증 토큰이 필요합니다.' } }, 401);
  }

  const tokenResult = verifyToken(token);
  if (!tokenResult.valid) {
    return c.json({ error: { code: tokenResult.error, message: '유효하지 않은 토큰입니다.' } }, 401);
  }

  if (!VALID_SERVICE_IDS.includes(serviceId)) {
    return c.json({ error: { code: 'invalid_service', message: '유효하지 않은 service_id입니다.' } }, 400);
  }

  const stateType = c.req.query('state_type') as StateType | undefined;

  try {
    // 특정 상태 유형 조회
    if (stateType) {
      if (!VALID_STATE_TYPES.includes(stateType)) {
        return c.json({ error: { code: 'invalid_state_type', message: '유효하지 않은 state_type입니다.' } }, 400);
      }

      // 캐시 확인
      const cacheKey = getCacheKey(serviceId, stateType);
      const cached = await cache.get(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);
        return c.json({ ...data, from_cache: true });
      }

      // DB 조회
      const state = await db
        .prepare('SELECT * FROM service_states WHERE service_id = ? AND state_type = ?')
        .bind(serviceId, stateType)
        .first<ServiceStateRecord>();

      if (!state) {
        return c.json({ error: { code: 'not_found', message: '상태를 찾을 수 없습니다.' } }, 404);
      }

      // 캐시 저장
      await cache.put(cacheKey, JSON.stringify({
        service_id: state.service_id,
        state_type: state.state_type,
        state: typeof state.state === 'string' ? JSON.parse(state.state) : state.state,
        version: state.version,
        synced_at: state.synced_at,
        expires_at: state.expires_at,
      }), { expirationTtl: CACHE_TTL_SECONDS });

      return c.json({
        service_id: state.service_id,
        state_type: state.state_type,
        state: typeof state.state === 'string' ? JSON.parse(state.state) : state.state,
        version: state.version,
        synced_at: state.synced_at,
        expires_at: state.expires_at,
        from_cache: false,
      });
    }

    // 모든 상태 유형 조회
    const { results: states } = await db
      .prepare('SELECT * FROM service_states WHERE service_id = ?')
      .bind(serviceId)
      .all<ServiceStateRecord>();

    if (!states || states.length === 0) {
      // Fallback: service_health 테이블
      const health = await db
        .prepare('SELECT * FROM service_health WHERE service_id = ?')
        .bind(serviceId)
        .first<{ status: string; last_ping: string; metrics: string }>();

      if (!health) {
        return c.json({ error: { code: 'not_found', message: '상태를 찾을 수 없습니다.' } }, 404);
      }

      return c.json({
        service_id: serviceId,
        states: {
          health: {
            status: health.status,
            metrics: typeof health.metrics === 'string' ? JSON.parse(health.metrics) : health.metrics,
            synced_at: health.last_ping,
            version: 1,
          },
        },
        last_seen: health.last_ping,
        fallback: 'service_health',
      });
    }

    // 상태들을 객체로 변환
    const statesObject: Record<string, unknown> = {};
    let lastSeen: string | null = null;

    for (const state of states) {
      const stateData = typeof state.state === 'string' ? JSON.parse(state.state) : state.state;
      statesObject[state.state_type] = {
        ...stateData,
        synced_at: state.synced_at,
        expires_at: state.expires_at,
        version: state.version,
      };

      if (!lastSeen || state.synced_at > lastSeen) {
        lastSeen = state.synced_at;
      }
    }

    return c.json({
      service_id: serviceId,
      states: statesObject,
      last_seen: lastSeen,
    });
  } catch (error) {
    console.error('Get service state error:', error);
    return c.json({ error: { code: 'fetch_failed', message: '상태 조회에 실패했습니다.' } }, 500);
  }
});

// ============================================================================
// GET /mcp/sync/state - 전체 상태 조회
// ============================================================================

sync.get('/state', async (c) => {
  const db = c.env.DB;

  // 토큰 검증
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return c.json({ error: { code: 'unauthorized', message: '인증 토큰이 필요합니다.' } }, 401);
  }

  const tokenResult = verifyToken(token);
  if (!tokenResult.valid) {
    return c.json({ error: { code: tokenResult.error, message: '유효하지 않은 토큰입니다.' } }, 401);
  }

  try {
    // 모든 서비스 상태 조회
    const { results: states } = await db
      .prepare('SELECT * FROM service_states ORDER BY synced_at DESC')
      .all<ServiceStateRecord>();

    // 서비스별로 그룹핑
    const services: Record<string, {
      status: ServiceStatus;
      last_seen: string | null;
      state_count: number;
    }> = {};

    // 초기화
    for (const serviceId of VALID_SERVICE_IDS) {
      if (serviceId !== 'central-hub') {
        services[serviceId] = {
          status: 'unknown',
          last_seen: null,
          state_count: 0,
        };
      }
    }

    // 상태 집계
    for (const state of states || []) {
      const serviceId = state.service_id;
      if (!services[serviceId]) {
        services[serviceId] = {
          status: 'unknown',
          last_seen: null,
          state_count: 0,
        };
      }

      services[serviceId].state_count++;

      if (!services[serviceId].last_seen || state.synced_at > services[serviceId].last_seen!) {
        services[serviceId].last_seen = state.synced_at;
      }

      // health 상태 타입이면 status 업데이트
      if (state.state_type === 'health') {
        const stateData = typeof state.state === 'string' ? JSON.parse(state.state) : state.state;
        if (stateData.status) {
          services[serviceId].status = stateData.status as ServiceStatus;
        }
      }
    }

    const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;

    return c.json({
      services,
      total_services: Object.keys(services).length,
      healthy_services: healthyCount,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all states error:', error);
    return c.json({ error: { code: 'fetch_failed', message: '전체 상태 조회에 실패했습니다.' } }, 500);
  }
});

// ============================================================================
// POST /mcp/sync/invalidate - 캐시 무효화
// ============================================================================

sync.post('/invalidate', async (c) => {
  const cache = c.env.CACHE;

  // 토큰 검증
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return c.json({ error: { code: 'unauthorized', message: '인증 토큰이 필요합니다.' } }, 401);
  }

  const tokenResult = verifyToken(token);
  if (!tokenResult.valid) {
    return c.json({ error: { code: tokenResult.error, message: '유효하지 않은 토큰입니다.' } }, 401);
  }

  let serviceId: ServiceId | undefined;
  try {
    const body = await c.req.json<{ service_id?: ServiceId }>();
    if (body.service_id && VALID_SERVICE_IDS.includes(body.service_id)) {
      serviceId = body.service_id;
    }
  } catch {
    // 빈 본문이면 전체 캐시 무효화
  }

  let invalidatedCount = 0;

  if (serviceId) {
    // 특정 서비스 캐시만 무효화
    for (const stateType of VALID_STATE_TYPES) {
      const cacheKey = getCacheKey(serviceId, stateType);
      await cache.delete(cacheKey);
      invalidatedCount++;
    }
  } else {
    // 전체 캐시 무효화
    for (const svcId of VALID_SERVICE_IDS) {
      for (const stateType of VALID_STATE_TYPES) {
        const cacheKey = getCacheKey(svcId, stateType);
        await cache.delete(cacheKey);
        invalidatedCount++;
      }
    }
  }

  console.log(`Cache invalidated: ${serviceId || 'all'}, count: ${invalidatedCount}`);

  return c.json({
    invalidated: true,
    service_id: serviceId || 'all',
    invalidated_count: invalidatedCount,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// GET /mcp/sync/status - 동기화 상태 확인
// ============================================================================

sync.get('/status', async (c) => {
  const db = c.env.DB;

  try {
    // 테이블 존재 여부 확인
    const tableCheck = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='service_states'")
      .first();

    // 최근 동기화 통계
    const stats = await db
      .prepare(`
        SELECT
          service_id,
          COUNT(*) as state_count,
          MAX(synced_at) as last_synced
        FROM service_states
        GROUP BY service_id
      `)
      .all();

    return c.json({
      status: 'operational',
      table_exists: !!tableCheck,
      services: stats.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({
      status: 'error',
      error: String(error),
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

export default sync;
