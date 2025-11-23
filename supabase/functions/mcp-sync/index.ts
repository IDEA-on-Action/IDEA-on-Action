/**
 * MCP 상태 동기화 Edge Function
 *
 * Minu 서비스들과 Central Hub 간의 상태 동기화를 담당합니다.
 * Supabase Realtime 채널과 캐시 TTL(5분)을 활용한 효율적인 상태 관리를 제공합니다.
 *
 * @endpoint POST /functions/v1/mcp-sync/state - 상태 업데이트
 * @endpoint GET /functions/v1/mcp-sync/state/:service - 특정 서비스 상태 조회
 * @endpoint GET /functions/v1/mcp-sync/state - 전체 상태 조회
 * @endpoint POST /functions/v1/mcp-sync/invalidate - 캐시 즉시 무효화
 *
 * @headers
 *   Authorization: Bearer <ACCESS_TOKEN>
 *   X-Service-Id: minu-find | minu-frame | minu-build | minu-keep (상태 업데이트 시)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 서비스 ID 타입
 */
type ServiceId = 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep' | 'central-hub';

/**
 * 서비스 상태 유형
 */
type StateType = 'health' | 'capabilities' | 'config' | 'metadata';

/**
 * 서비스 상태
 */
type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * 상태 업데이트 요청
 */
interface StateUpdateRequest {
  service_id: ServiceId;
  state_type: StateType;
  state: Record<string, unknown>;
  ttl_seconds?: number;
}

/**
 * 서비스 상태 레코드 (DB)
 */
interface ServiceStateRecord {
  id: string;
  service_id: ServiceId;
  state_type: StateType;
  state: Record<string, unknown>;
  version: number;
  ttl_seconds: number;
  synced_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * 캐시 항목
 */
interface CacheEntry {
  data: ServiceStateRecord;
  cached_at: number;
  expires_at: number;
}

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * CORS 헤더
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-service-id, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

/**
 * 유효한 서비스 ID 목록
 */
const VALID_SERVICE_IDS: ServiceId[] = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep', 'central-hub'];

/**
 * 유효한 상태 유형 목록
 */
const VALID_STATE_TYPES: StateType[] = ['health', 'capabilities', 'config', 'metadata'];

/**
 * 상태 유형별 기본 TTL (초)
 */
const DEFAULT_TTL: Record<StateType, number> = {
  health: 60,        // 1분
  capabilities: 3600, // 1시간
  config: 3600,      // 1시간
  metadata: 300,     // 5분
};

/**
 * 캐시 TTL (ms) - 5분
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 인메모리 캐시
 */
const stateCache: Map<string, CacheEntry> = new Map();

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 에러 응답 생성
 */
function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  requestId?: string
) {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
        details,
        request_id: requestId || crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * 성공 응답 생성
 */
function successResponse(data: Record<string, unknown>, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Bearer 토큰 추출
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * JWT 토큰 검증 (간단한 구조 검증)
 */
async function verifyToken(
  token: string
): Promise<{ valid: boolean; service_id?: ServiceId; scope?: string[]; error?: string }> {
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

    return {
      valid: true,
      service_id: serviceId,
      scope: payload.scope || [],
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return { valid: false, error: 'token_verification_failed' };
  }
}

/**
 * 캐시 키 생성
 */
function getCacheKey(serviceId: ServiceId, stateType?: StateType): string {
  return stateType ? `${serviceId}:${stateType}` : serviceId;
}

/**
 * 캐시에서 상태 조회
 */
function getFromCache(cacheKey: string): ServiceStateRecord | null {
  const entry = stateCache.get(cacheKey);
  if (!entry) return null;

  const now = Date.now();
  if (now > entry.expires_at) {
    stateCache.delete(cacheKey);
    return null;
  }

  return entry.data;
}

/**
 * 캐시에 상태 저장
 */
function setToCache(cacheKey: string, data: ServiceStateRecord): void {
  const now = Date.now();
  stateCache.set(cacheKey, {
    data,
    cached_at: now,
    expires_at: now + CACHE_TTL_MS,
  });
}

/**
 * 캐시 무효화
 */
function invalidateCache(serviceId?: ServiceId): number {
  let count = 0;
  if (serviceId) {
    for (const key of stateCache.keys()) {
      if (key.startsWith(serviceId)) {
        stateCache.delete(key);
        count++;
      }
    }
  } else {
    count = stateCache.size;
    stateCache.clear();
  }
  return count;
}

// ============================================================================
// 핸들러 함수
// ============================================================================

/**
 * POST /mcp-sync/state - 상태 업데이트
 */
async function handleStateUpdate(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) {
    return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, undefined, requestId);
  }

  const tokenResult = await verifyToken(token);
  if (!tokenResult.valid) {
    return errorResponse(
      tokenResult.error || 'invalid_token',
      '유효하지 않은 토큰입니다.',
      401,
      undefined,
      requestId
    );
  }

  // 요청 본문 파싱
  let body: StateUpdateRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 페이로드입니다.', 400, undefined, requestId);
  }

  // 필수 필드 검증
  if (!body.service_id) {
    return errorResponse('missing_field', 'service_id 필드가 필요합니다.', 400, undefined, requestId);
  }

  if (!VALID_SERVICE_IDS.includes(body.service_id)) {
    return errorResponse('invalid_service', '유효하지 않은 service_id입니다.', 400, undefined, requestId);
  }

  if (!body.state_type) {
    return errorResponse('missing_field', 'state_type 필드가 필요합니다.', 400, undefined, requestId);
  }

  if (!VALID_STATE_TYPES.includes(body.state_type)) {
    return errorResponse('invalid_state_type', '유효하지 않은 state_type입니다.', 400, {
      valid_types: VALID_STATE_TYPES,
    }, requestId);
  }

  if (!body.state || typeof body.state !== 'object') {
    return errorResponse('missing_field', 'state 필드가 필요합니다 (객체).', 400, undefined, requestId);
  }

  // X-Service-Id 헤더 검증 (선택적)
  const headerServiceId = req.headers.get('x-service-id');
  if (headerServiceId && headerServiceId !== body.service_id) {
    return errorResponse(
      'service_id_mismatch',
      'X-Service-Id 헤더와 body의 service_id가 일치하지 않습니다.',
      400,
      undefined,
      requestId
    );
  }

  // TTL 설정
  const ttlSeconds = body.ttl_seconds || DEFAULT_TTL[body.state_type];
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  try {
    // 기존 상태 조회 (버전 관리용)
    const { data: existing } = await supabase
      .from('service_states')
      .select('version')
      .eq('service_id', body.service_id)
      .eq('state_type', body.state_type)
      .single();

    const newVersion = (existing?.version || 0) + 1;

    // 상태 업서트
    const { data, error } = await supabase
      .from('service_states')
      .upsert({
        service_id: body.service_id,
        state_type: body.state_type,
        state: body.state,
        version: newVersion,
        ttl_seconds: ttlSeconds,
        synced_at: new Date().toISOString(),
        expires_at: expiresAt,
      }, {
        onConflict: 'service_id,state_type',
      })
      .select()
      .single();

    if (error) {
      // service_states 테이블이 없을 경우 service_health 사용 (호환성)
      if (error.code === '42P01') {
        // 테이블 없음: service_health 테이블 사용
        if (body.state_type === 'health') {
          const { error: healthError } = await supabase
            .from('service_health')
            .upsert({
              service_id: body.service_id,
              status: body.state.status || 'healthy',
              last_ping: new Date().toISOString(),
              metrics: body.state.metrics || {},
              version: body.state.version,
            }, {
              onConflict: 'service_id',
            });

          if (healthError) throw healthError;

          // 캐시 무효화
          const cacheKey = getCacheKey(body.service_id, body.state_type);
          stateCache.delete(cacheKey);

          return successResponse({
            synced: true,
            sync_id: crypto.randomUUID(),
            service_id: body.service_id,
            state_type: body.state_type,
            version: 1,
            synced_at: new Date().toISOString(),
            expires_at: expiresAt,
            fallback: 'service_health',
          });
        }
        throw error;
      }
      throw error;
    }

    // 캐시 업데이트
    const cacheKey = getCacheKey(body.service_id, body.state_type);
    if (data) {
      setToCache(cacheKey, data);
    }

    console.log(`State synced: ${body.service_id}/${body.state_type} v${newVersion}`);

    return successResponse({
      synced: true,
      sync_id: data?.id || crypto.randomUUID(),
      service_id: body.service_id,
      state_type: body.state_type,
      version: newVersion,
      synced_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

  } catch (error) {
    console.error('State update error:', error);
    return errorResponse(
      'sync_failed',
      '상태 동기화에 실패했습니다.',
      500,
      { error: String(error) },
      requestId
    );
  }
}

/**
 * GET /mcp-sync/state/:service - 특정 서비스 상태 조회
 */
async function handleGetServiceState(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  serviceId: ServiceId,
  requestId: string
): Promise<Response> {
  // 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) {
    return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, undefined, requestId);
  }

  const tokenResult = await verifyToken(token);
  if (!tokenResult.valid) {
    return errorResponse(
      tokenResult.error || 'invalid_token',
      '유효하지 않은 토큰입니다.',
      401,
      undefined,
      requestId
    );
  }

  // 쿼리 파라미터 파싱
  const url = new URL(req.url);
  const stateType = url.searchParams.get('state_type') as StateType | null;
  const includeHistory = url.searchParams.get('include_history') === 'true';

  try {
    // 상태 유형 필터가 있으면 해당 상태만 조회
    if (stateType) {
      if (!VALID_STATE_TYPES.includes(stateType)) {
        return errorResponse('invalid_state_type', '유효하지 않은 state_type입니다.', 400, undefined, requestId);
      }

      // 캐시 확인
      const cacheKey = getCacheKey(serviceId, stateType);
      const cached = getFromCache(cacheKey);
      if (cached) {
        return successResponse({
          service_id: serviceId,
          state_type: stateType,
          state: cached.state,
          version: cached.version,
          synced_at: cached.synced_at,
          expires_at: cached.expires_at,
          from_cache: true,
        });
      }

      // DB 조회
      const { data, error } = await supabase
        .from('service_states')
        .select('*')
        .eq('service_id', serviceId)
        .eq('state_type', stateType)
        .single();

      if (error && error.code === 'PGRST116') {
        return errorResponse('not_found', '해당 서비스의 상태를 찾을 수 없습니다.', 404, undefined, requestId);
      }
      if (error) throw error;

      // 캐시 저장
      if (data) {
        setToCache(cacheKey, data);
      }

      return successResponse({
        service_id: serviceId,
        state_type: stateType,
        state: data.state,
        version: data.version,
        synced_at: data.synced_at,
        expires_at: data.expires_at,
        from_cache: false,
      });
    }

    // 모든 상태 유형 조회
    const { data: states, error } = await supabase
      .from('service_states')
      .select('*')
      .eq('service_id', serviceId);

    // service_states 테이블이 없으면 service_health 사용
    if (error && error.code === '42P01') {
      const { data: health, error: healthError } = await supabase
        .from('service_health')
        .select('*')
        .eq('service_id', serviceId)
        .single();

      if (healthError && healthError.code === 'PGRST116') {
        return errorResponse('not_found', '해당 서비스의 상태를 찾을 수 없습니다.', 404, undefined, requestId);
      }
      if (healthError) throw healthError;

      return successResponse({
        service_id: serviceId,
        states: {
          health: {
            status: health.status,
            metrics: health.metrics,
            synced_at: health.last_ping,
            version: 1,
          },
        },
        last_seen: health.last_ping,
        fallback: 'service_health',
      });
    }
    if (error) throw error;

    // 상태들을 객체로 변환
    const statesObject: Record<string, unknown> = {};
    let lastSeen: string | null = null;

    for (const state of states || []) {
      statesObject[state.state_type] = {
        ...state.state,
        synced_at: state.synced_at,
        expires_at: state.expires_at,
        version: state.version,
      };
      if (!lastSeen || state.synced_at > lastSeen) {
        lastSeen = state.synced_at;
      }

      // 캐시에 저장
      const cacheKey = getCacheKey(serviceId, state.state_type);
      setToCache(cacheKey, state);
    }

    return successResponse({
      service_id: serviceId,
      states: statesObject,
      last_seen: lastSeen,
    });

  } catch (error) {
    console.error('Get service state error:', error);
    return errorResponse(
      'fetch_failed',
      '상태 조회에 실패했습니다.',
      500,
      { error: String(error) },
      requestId
    );
  }
}

/**
 * GET /mcp-sync/state - 전체 상태 조회
 */
async function handleGetAllStates(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) {
    return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, undefined, requestId);
  }

  const tokenResult = await verifyToken(token);
  if (!tokenResult.valid) {
    return errorResponse(
      tokenResult.error || 'invalid_token',
      '유효하지 않은 토큰입니다.',
      401,
      undefined,
      requestId
    );
  }

  try {
    // 모든 서비스 상태 조회
    const { data: states, error } = await supabase
      .from('service_states')
      .select('*')
      .order('synced_at', { ascending: false });

    // service_states 테이블이 없으면 service_health 사용
    if (error && error.code === '42P01') {
      const { data: healthData, error: healthError } = await supabase
        .from('service_health')
        .select('*');

      if (healthError) throw healthError;

      const services: Record<string, {
        status: ServiceStatus;
        last_seen: string;
        state_count: number;
      }> = {};

      let healthyCount = 0;
      for (const health of healthData || []) {
        const status: ServiceStatus = health.status === 'healthy' ? 'healthy' :
                        health.status === 'degraded' ? 'degraded' : 'unhealthy';
        services[health.service_id] = {
          status,
          last_seen: health.last_ping,
          state_count: 1,
        };
        if (status === 'healthy') healthyCount++;
      }

      return successResponse({
        services,
        total_services: Object.keys(services).length,
        healthy_services: healthyCount,
        synced_at: new Date().toISOString(),
        fallback: 'service_health',
      });
    }
    if (error) throw error;

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

      // 마지막 동기화 시간 업데이트
      if (!services[serviceId].last_seen || state.synced_at > services[serviceId].last_seen!) {
        services[serviceId].last_seen = state.synced_at;
      }

      // health 상태 타입이면 status 업데이트
      if (state.state_type === 'health' && state.state.status) {
        services[serviceId].status = state.state.status as ServiceStatus;
      }
    }

    // 건강한 서비스 수 계산
    const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;

    return successResponse({
      services,
      total_services: Object.keys(services).length,
      healthy_services: healthyCount,
      synced_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Get all states error:', error);
    return errorResponse(
      'fetch_failed',
      '전체 상태 조회에 실패했습니다.',
      500,
      { error: String(error) },
      requestId
    );
  }
}

/**
 * POST /mcp-sync/invalidate - 캐시 즉시 무효화
 */
async function handleInvalidateCache(
  req: Request,
  requestId: string
): Promise<Response> {
  // 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) {
    return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, undefined, requestId);
  }

  const tokenResult = await verifyToken(token);
  if (!tokenResult.valid) {
    return errorResponse(
      tokenResult.error || 'invalid_token',
      '유효하지 않은 토큰입니다.',
      401,
      undefined,
      requestId
    );
  }

  // 요청 본문 파싱 (선택적)
  let serviceId: ServiceId | undefined;
  try {
    const body = await req.json();
    if (body.service_id && VALID_SERVICE_IDS.includes(body.service_id)) {
      serviceId = body.service_id;
    }
  } catch {
    // 빈 본문이면 전체 캐시 무효화
  }

  const invalidatedCount = invalidateCache(serviceId);

  console.log(`Cache invalidated: ${serviceId || 'all'}, count: ${invalidatedCount}`);

  return successResponse({
    invalidated: true,
    service_id: serviceId || 'all',
    invalidated_count: invalidatedCount,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 요청 ID 생성/추출
  const requestId = crypto.randomUUID();

  // URL 파싱
  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/functions\/v1\/mcp-sync/, '')
    .replace(/^\/mcp-sync/, '');

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    return errorResponse('server_error', '서버 설정 오류입니다.', 500, undefined, requestId);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 라우팅
  try {
    // POST /state - 상태 업데이트
    if (req.method === 'POST' && (path === '/state' || path === '')) {
      return await handleStateUpdate(req, supabase, requestId);
    }

    // POST /invalidate - 캐시 무효화
    if (req.method === 'POST' && path === '/invalidate') {
      return await handleInvalidateCache(req, requestId);
    }

    // GET /state/:service - 특정 서비스 상태 조회
    const serviceMatch = path.match(/^\/state\/([a-z-]+)$/);
    if (req.method === 'GET' && serviceMatch) {
      const serviceId = serviceMatch[1] as ServiceId;
      if (!VALID_SERVICE_IDS.includes(serviceId)) {
        return errorResponse('invalid_service', '유효하지 않은 service_id입니다.', 400, undefined, requestId);
      }
      return await handleGetServiceState(req, supabase, serviceId, requestId);
    }

    // GET /state - 전체 상태 조회
    if (req.method === 'GET' && path === '/state') {
      return await handleGetAllStates(req, supabase, requestId);
    }

    // 지원하지 않는 엔드포인트
    return errorResponse(
      'not_found',
      '요청한 엔드포인트를 찾을 수 없습니다.',
      404,
      { path, method: req.method },
      requestId
    );

  } catch (error) {
    console.error('Unhandled error:', error);
    return errorResponse(
      'internal_error',
      '서버 내부 오류가 발생했습니다.',
      500,
      { error: String(error) },
      requestId
    );
  }
});
