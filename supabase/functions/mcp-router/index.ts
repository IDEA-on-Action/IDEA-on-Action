/**
 * MCP 이벤트 라우터 Edge Function
 *
 * Minu 서비스들과 Central Hub 간의 이벤트 라우팅을 담당합니다.
 * Bearer 토큰 인증 (mcp-auth 연동)으로 보안을 강화합니다.
 *
 * @endpoint POST /functions/v1/mcp-router/dispatch - 이벤트 전달
 * @endpoint GET /functions/v1/mcp-router/status - 라우터 상태 조회
 *
 * @headers
 *   Authorization: Bearer <ACCESS_TOKEN>
 *   X-Request-Id: UUID (선택)
 *   X-Idempotency-Key: UNIQUE_KEY (선택)
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
 * 이벤트 우선순위
 */
type EventPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * 이벤트 라우팅 대상
 */
type EventTarget =
  | 'service_health'   // 서비스 헬스 테이블
  | 'service_issues'   // 서비스 이슈 테이블
  | 'service_events'   // 서비스 이벤트 테이블
  | 'event_queue'      // 이벤트 큐 (비동기 처리)
  | 'notifications';   // 알림 시스템

/**
 * 이벤트 전달 요청
 */
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

/**
 * 라우팅 규칙
 */
interface RoutingRule {
  event_pattern: RegExp;
  target_table: EventTarget;
  transform?: (payload: Record<string, unknown>, sourceService: ServiceId) => Record<string, unknown>;
  notify?: boolean;
  priority_threshold?: EventPriority;
}

/**
 * 이벤트 큐 항목
 */
interface EventQueueItem {
  id?: string;
  event_type: string;
  source_service: ServiceId;
  target_service?: string;
  payload: Record<string, unknown>;
  priority: EventPriority;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  created_at?: string;
  processed_at?: string;
  error_message?: string;
}

/**
 * 라우터 상태
 */
interface RouterStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime_seconds: number;
  statistics: {
    total_dispatched: number;
    successful: number;
    failed: number;
    pending: number;
    success_rate: number;
  };
  queue_depth: Record<EventPriority, number>;
  last_dispatch?: string;
  services: Record<ServiceId, {
    status: 'connected' | 'disconnected' | 'degraded';
    latency_ms?: number;
  }>;
}

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * CORS 헤더
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-request-id, x-idempotency-key, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

/**
 * 유효한 서비스 ID 목록
 */
const VALID_SERVICE_IDS: ServiceId[] = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep', 'central-hub'];

/**
 * 우선순위별 처리 지연 시간 (ms)
 */
const PRIORITY_DELAYS: Record<EventPriority, number> = {
  critical: 0,    // 즉시 처리
  high: 100,      // 100ms
  normal: 500,    // 500ms
  low: 1000,      // 1s
};

/**
 * 라우터 시작 시간 (업타임 계산용)
 */
const ROUTER_START_TIME = Date.now();

/**
 * 이벤트 라우팅 규칙
 */
const ROUTING_RULES: RoutingRule[] = [
  // 서비스 헬스 업데이트
  {
    event_pattern: /^service\.health\.update$/,
    target_table: 'service_health',
    transform: (payload, sourceService) => ({
      service_id: sourceService,
      status: payload.status || 'healthy',
      last_ping: new Date().toISOString(),
      metrics: payload.metrics || {},
    }),
    notify: false,
  },

  // 이슈 생성
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

  // 이벤트 로그
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
    notify: false,
  },

  // 문서 생성 알림
  {
    event_pattern: /^document\.generated$/,
    target_table: 'notifications',
    transform: (payload, sourceService) => ({
      title: `[${sourceService}] 문서 생성 완료`,
      message: `${payload.document_type || '문서'}가 생성되었습니다: ${payload.document_name || 'Untitled'}`,
      type: 'info',
    }),
    notify: true,
  },

  // 구독 상태 변경
  {
    event_pattern: /^subscription\.changed$/,
    target_table: 'event_queue',
    transform: (payload, sourceService) => ({
      source_service: sourceService,
      event_type: 'subscription.changed',
      payload: {
        user_id: payload.user_id,
        plan_id: payload.plan_id,
        action: payload.action, // 'created' | 'upgraded' | 'downgraded' | 'cancelled'
      },
    }),
    notify: true,
  },

  // 사용자 활동 로그
  {
    event_pattern: /^user\.action$/,
    target_table: 'service_events',
    transform: (payload, sourceService) => ({
      service_id: sourceService,
      event_type: 'user.action',
      user_id: payload.user_id,
      payload: {
        action: payload.action,
        resource: payload.resource,
        details: payload.details,
      },
    }),
    notify: false,
  },

  // 기본 이벤트 (매칭되지 않는 모든 이벤트)
  {
    event_pattern: /^.*$/,
    target_table: 'event_queue',
    transform: (payload, sourceService) => ({
      source_service: sourceService,
      event_type: 'generic',
      payload,
    }),
    notify: false,
  },
];

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
 * 실제 프로덕션에서는 mcp-auth/verify 호출 또는 JWT 라이브러리 사용 권장
 */
async function verifyToken(
  token: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ valid: boolean; service_id?: ServiceId; scope?: string[]; error?: string }> {
  try {
    // JWT 구조 검증 (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'invalid_token_format' };
    }

    // Payload 디코딩
    const payloadBase64 = parts[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    // 만료 시간 확인
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'token_expired' };
    }

    // 발급자 확인
    if (payload.iss !== 'mcp-auth') {
      return { valid: false, error: 'invalid_issuer' };
    }

    // 서비스 ID 확인
    const serviceId = payload.sub as ServiceId;
    if (!VALID_SERVICE_IDS.includes(serviceId)) {
      return { valid: false, error: 'invalid_service' };
    }

    // 토큰이 폐기되었는지 확인 (service_tokens 테이블에서)
    // 실제 구현 시 토큰 해시를 저장하고 확인해야 함
    // 여기서는 간단히 구조만 검증

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
 * 이벤트 타입에 매칭되는 라우팅 규칙 찾기
 */
function findRoutingRule(eventType: string): RoutingRule | undefined {
  return ROUTING_RULES.find(rule => rule.event_pattern.test(eventType));
}

/**
 * 우선순위 비교
 */
function isPriorityAbove(priority: EventPriority, threshold: EventPriority): boolean {
  const priorities: EventPriority[] = ['critical', 'high', 'normal', 'low'];
  return priorities.indexOf(priority) <= priorities.indexOf(threshold);
}

// ============================================================================
// 핸들러 함수
// ============================================================================

/**
 * POST /mcp-router/dispatch - 이벤트 전달
 */
async function handleDispatch(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) {
    return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, undefined, requestId);
  }

  const tokenResult = await verifyToken(token, supabase);
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
  let body: DispatchRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 페이로드입니다.', 400, undefined, requestId);
  }

  // 필수 필드 검증
  if (!body.event_type) {
    return errorResponse('missing_field', 'event_type 필드가 필요합니다.', 400, undefined, requestId);
  }

  if (!body.source_service) {
    return errorResponse('missing_field', 'source_service 필드가 필요합니다.', 400, undefined, requestId);
  }

  if (!VALID_SERVICE_IDS.includes(body.source_service)) {
    return errorResponse('invalid_service', '유효하지 않은 source_service입니다.', 400, undefined, requestId);
  }

  // 기본값 설정
  const priority: EventPriority = body.priority || 'normal';
  const idempotencyKey = req.headers.get('x-idempotency-key') || body.metadata?.idempotency_key;

  // 멱등성 키 확인 (이미 처리된 요청인지)
  if (idempotencyKey) {
    const { data: existingEvent } = await supabase
      .from('event_queue')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingEvent) {
      return successResponse({
        dispatched: true,
        dispatch_id: existingEvent.id,
        status: existingEvent.status,
        message: '이미 처리된 요청입니다 (멱등성 키 일치).',
      }, 200);
    }
  }

  // 라우팅 규칙 찾기
  const rule = findRoutingRule(body.event_type);
  if (!rule) {
    return errorResponse('no_routing_rule', '해당 이벤트 타입에 대한 라우팅 규칙이 없습니다.', 400, undefined, requestId);
  }

  // 페이로드 변환
  const transformedPayload = rule.transform
    ? rule.transform(body.payload, body.source_service)
    : body.payload;

  let dispatchId: string | null = null;
  let status: 'queued' | 'processed' = 'queued';

  try {
    // 대상 테이블에 따른 처리
    switch (rule.target_table) {
      case 'service_health': {
        const { error } = await supabase
          .from('service_health')
          .upsert(transformedPayload);

        if (error) throw error;
        status = 'processed';
        break;
      }

      case 'service_issues': {
        const { data, error } = await supabase
          .from('service_issues')
          .insert(transformedPayload)
          .select('id')
          .single();

        if (error) throw error;
        dispatchId = data.id;
        status = 'processed';
        break;
      }

      case 'service_events': {
        const { data, error } = await supabase
          .from('service_events')
          .insert(transformedPayload)
          .select('id')
          .single();

        if (error) throw error;
        dispatchId = data.id;
        status = 'processed';
        break;
      }

      case 'notifications': {
        // 알림 대상 조회 (관리자들)
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['admin', 'super_admin']);

        if (admins && admins.length > 0) {
          const notifications = admins.map(admin => ({
            user_id: admin.id,
            ...transformedPayload,
            read: false,
          }));

          await supabase.from('notifications').insert(notifications);
        }
        status = 'processed';
        break;
      }

      case 'event_queue':
      default: {
        // 이벤트 큐에 저장
        const queueItem: EventQueueItem = {
          event_type: body.event_type,
          source_service: body.source_service,
          target_service: body.target_service,
          payload: transformedPayload,
          priority,
          status: 'pending',
          retry_count: 0,
        };

        // 멱등성 키가 있으면 추가
        const insertData = idempotencyKey
          ? { ...queueItem, idempotency_key: idempotencyKey }
          : queueItem;

        const { data, error } = await supabase
          .from('event_queue')
          .insert(insertData)
          .select('id')
          .single();

        if (error) throw error;
        dispatchId = data.id;
        break;
      }
    }

    // 알림 생성 (규칙에 정의된 경우)
    if (rule.notify && rule.priority_threshold && isPriorityAbove(priority, rule.priority_threshold)) {
      await createNotification(
        supabase,
        body.event_type,
        body.source_service,
        body.payload
      );
    }

    console.log(`Event dispatched: ${body.event_type} from ${body.source_service}, priority: ${priority}`);

    return successResponse({
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
    return errorResponse(
      'dispatch_failed',
      '이벤트 전달에 실패했습니다.',
      500,
      { error: String(error) },
      requestId
    );
  }
}

/**
 * GET /mcp-router/status - 라우터 상태 조회
 */
async function handleStatus(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) {
    return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, undefined, requestId);
  }

  const tokenResult = await verifyToken(token, supabase);
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
    // 통계 조회
    const [
      { count: totalDispatched },
      { count: successful },
      { count: failed },
      { count: pending },
    ] = await Promise.all([
      supabase.from('event_queue').select('*', { count: 'exact', head: true }),
      supabase.from('event_queue').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('event_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from('event_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    // 우선순위별 대기열 깊이
    const [
      { count: criticalCount },
      { count: highCount },
      { count: normalCount },
      { count: lowCount },
    ] = await Promise.all([
      supabase.from('event_queue').select('*', { count: 'exact', head: true }).eq('priority', 'critical').eq('status', 'pending'),
      supabase.from('event_queue').select('*', { count: 'exact', head: true }).eq('priority', 'high').eq('status', 'pending'),
      supabase.from('event_queue').select('*', { count: 'exact', head: true }).eq('priority', 'normal').eq('status', 'pending'),
      supabase.from('event_queue').select('*', { count: 'exact', head: true }).eq('priority', 'low').eq('status', 'pending'),
    ]);

    // 최근 이벤트 조회
    const { data: recentEvent } = await supabase
      .from('event_queue')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 서비스 헬스 조회
    const { data: healthData } = await supabase
      .from('service_health')
      .select('service_id, status, last_ping, metrics');

    // 서비스 상태 구성
    const services: RouterStatus['services'] = {
      'minu-find': { status: 'disconnected' },
      'minu-frame': { status: 'disconnected' },
      'minu-build': { status: 'disconnected' },
      'minu-keep': { status: 'disconnected' },
      'central-hub': { status: 'connected', latency_ms: 0 },
    };

    if (healthData) {
      for (const health of healthData) {
        const serviceId = health.service_id as ServiceId;
        if (services[serviceId]) {
          services[serviceId] = {
            status: health.status === 'healthy' ? 'connected' :
                    health.status === 'degraded' ? 'degraded' : 'disconnected',
            latency_ms: health.metrics?.response_time_ms,
          };
        }
      }
    }

    // 성공률 계산
    const total = totalDispatched || 0;
    const success = successful || 0;
    const successRate = total > 0 ? Math.round((success / total) * 10000) / 100 : 100;

    const status: RouterStatus = {
      status: (pending || 0) > 100 ? 'degraded' : 'healthy',
      uptime_seconds: Math.floor((Date.now() - ROUTER_START_TIME) / 1000),
      statistics: {
        total_dispatched: total,
        successful: success,
        failed: failed || 0,
        pending: pending || 0,
        success_rate: successRate,
      },
      queue_depth: {
        critical: criticalCount || 0,
        high: highCount || 0,
        normal: normalCount || 0,
        low: lowCount || 0,
      },
      last_dispatch: recentEvent?.created_at,
      services,
    };

    return successResponse(status);

  } catch (error) {
    console.error('Status error:', error);
    return errorResponse(
      'status_failed',
      '상태 조회에 실패했습니다.',
      500,
      { error: String(error) },
      requestId
    );
  }
}

/**
 * 관리자 알림 생성 헬퍼
 */
async function createNotification(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  sourceService: ServiceId,
  payload: Record<string, unknown>
) {
  try {
    // 관리자 목록 조회
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'super_admin']);

    if (!admins || admins.length === 0) return;

    // 알림 제목 및 메시지 생성
    const title = `[${sourceService}] ${eventType}`;
    const message = payload.title || payload.description || JSON.stringify(payload).slice(0, 200);

    // 각 관리자에게 알림 생성
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      title,
      message: String(message),
      type: 'system',
      read: false,
    }));

    await supabase.from('notifications').insert(notifications);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
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
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  // URL 파싱
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/functions\/v1\/mcp-router/, '').replace(/^\/mcp-router/, '');

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
    // POST /dispatch - 이벤트 전달
    if (req.method === 'POST' && (path === '/dispatch' || path === '')) {
      return await handleDispatch(req, supabase, requestId);
    }

    // GET /status - 라우터 상태
    if (req.method === 'GET' && path === '/status') {
      return await handleStatus(req, supabase, requestId);
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
