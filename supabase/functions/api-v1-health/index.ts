/**
 * API v1 Health Check Endpoint
 *
 * 시스템 및 컴포넌트 상태를 확인하는 헬스체크 엔드포인트입니다.
 * 데이터베이스 연결, 응답 시간 등을 측정하여 전체 시스템 상태를 반환합니다.
 *
 * Endpoints:
 * - GET /api-v1-health - 기본 헬스체크 (빠른 응답)
 * - GET /api-v1-health/detailed - 상세 컴포넌트 상태
 * - GET /api-v1-health/metrics - 성능 메트릭
 * - GET /api-v1-health/ready - Kubernetes readiness probe
 * - GET /api-v1-health/live - Kubernetes liveness probe
 *
 * @version 2.23.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// ============================================================================
// 타입 정의
// ============================================================================

type ComponentStatus = 'healthy' | 'degraded' | 'unhealthy' | 'pass' | 'fail'
type SystemStatus = 'healthy' | 'degraded' | 'unhealthy'

interface ComponentHealth {
  status: ComponentStatus
  latency_ms?: number
  message?: string
  metadata?: Record<string, unknown>
  details?: Record<string, unknown>
}

interface HealthCheckResponse {
  status: SystemStatus
  version: string
  timestamp: string
  components?: Record<string, ComponentHealth>
  response_time_ms?: number
  uptime_seconds?: number
}

interface DetailedHealthResponse extends HealthCheckResponse {
  components: Record<string, ComponentHealth>
  checks?: Record<string, {
    status: 'pass' | 'fail'
    latency_ms?: number
    message?: string
  }>
}

interface MetricsResponse {
  timestamp: string
  period: string
  requests: {
    total: number
    success: number
    error: number
    success_rate: number
  }
  latency: {
    p50_ms: number
    p95_ms: number
    p99_ms: number
    avg_ms: number
  }
  rate_limits: {
    total_blocked: number
    top_blocked_ips: string[]
  }
  errors: {
    by_code: Record<string, number>
  }
}

// ============================================================================
// 상수 정의
// ============================================================================

const API_VERSION = '2.23.0'
const SERVICE_START_TIME = Date.now()

// 헬스체크 임계값 (밀리초)
const THRESHOLDS = {
  database: {
    healthy: 100,    // 100ms 이하: healthy
    degraded: 500,   // 500ms 이하: degraded, 초과: unhealthy
  },
  auth: {
    healthy: 150,
    degraded: 600,
  },
  storage: {
    healthy: 200,
    degraded: 800,
  },
}

// 캐시 설정 (초)
const CACHE_DURATION = {
  basic: 10,
  detailed: 30,
  metrics: 60,
}

// 간단한 메모리 캐시
const cache = new Map<string, { data: unknown; expires: number }>()

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: unknown, durationSeconds: number): void {
  cache.set(key, {
    data,
    expires: Date.now() + durationSeconds * 1000,
  })
}

// ============================================================================
// 헬스체크 함수
// ============================================================================

/**
 * 데이터베이스 헬스체크
 */
async function checkDatabaseHealth(
  supabase: ReturnType<typeof createClient>,
  detailed = false
): Promise<ComponentHealth> {
  const startTime = performance.now()

  try {
    // 간단한 쿼리로 DB 연결 확인
    const { error, data } = await supabase
      .from('subscription_plans')
      .select('id')
      .limit(1)

    const latency = Math.round(performance.now() - startTime)

    if (error) {
      return {
        status: 'unhealthy',
        latency_ms: latency,
        message: `데이터베이스 쿼리 실패: ${error.message}`,
      }
    }

    const result: ComponentHealth = {
      status: latency <= THRESHOLDS.database.healthy
        ? 'healthy'
        : latency <= THRESHOLDS.database.degraded
          ? 'degraded'
          : 'unhealthy',
      latency_ms: latency,
    }

    // 상세 정보 추가
    if (detailed) {
      try {
        // 최신 마이그레이션 조회
        const { data: migrations } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .like('table_name', 'schema_migrations%')
          .limit(1)

        result.details = {
          connection_pool: 'N/A', // Supabase에서는 직접 조회 불가
          last_migration: '20251201000005', // 하드코딩 (실제로는 별도 테이블 필요)
        }
      } catch {
        // 상세 정보 조회 실패는 무시
      }
    }

    return result
  } catch (error) {
    const latency = Math.round(performance.now() - startTime)
    return {
      status: 'unhealthy',
      latency_ms: latency,
      message: `데이터베이스 연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Auth 서비스 헬스체크
 */
async function checkAuthHealth(
  supabase: ReturnType<typeof createClient>
): Promise<ComponentHealth> {
  const startTime = performance.now()

  try {
    // Auth 서비스 상태 확인 (간단한 세션 조회)
    const { error } = await supabase.auth.getSession()
    const latency = Math.round(performance.now() - startTime)

    if (error) {
      return {
        status: 'unhealthy',
        latency_ms: latency,
        message: `Auth 서비스 실패: ${error.message}`,
      }
    }

    return {
      status: latency <= THRESHOLDS.auth.healthy
        ? 'healthy'
        : latency <= THRESHOLDS.auth.degraded
          ? 'degraded'
          : 'unhealthy',
      latency_ms: latency,
    }
  } catch (error) {
    const latency = Math.round(performance.now() - startTime)
    return {
      status: 'unhealthy',
      latency_ms: latency,
      message: `Auth 연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Storage 서비스 헬스체크
 */
async function checkStorageHealth(
  supabase: ReturnType<typeof createClient>
): Promise<ComponentHealth> {
  const startTime = performance.now()

  try {
    // Storage 버킷 목록 조회
    const { error } = await supabase.storage.listBuckets()
    const latency = Math.round(performance.now() - startTime)

    if (error) {
      return {
        status: 'unhealthy',
        latency_ms: latency,
        message: `Storage 서비스 실패: ${error.message}`,
      }
    }

    return {
      status: latency <= THRESHOLDS.storage.healthy
        ? 'healthy'
        : latency <= THRESHOLDS.storage.degraded
          ? 'degraded'
          : 'unhealthy',
      latency_ms: latency,
    }
  } catch (error) {
    const latency = Math.round(performance.now() - startTime)
    return {
      status: 'unhealthy',
      latency_ms: latency,
      message: `Storage 연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Edge Functions 상태 확인
 */
async function checkEdgeFunctionsHealth(): Promise<ComponentHealth> {
  // Edge Functions는 현재 실행 중이므로 항상 healthy
  // 실제 환경에서는 배포된 함수 목록을 조회할 수 있음
  return {
    status: 'healthy',
    latency_ms: 0,
    details: {
      active_count: 22, // 하드코딩 (실제로는 Supabase Management API 필요)
    },
  }
}

/**
 * OAuth 토큰 체크
 */
async function checkOAuthToken(
  supabase: ReturnType<typeof createClient>
): Promise<{ status: 'pass' | 'fail'; latency_ms: number; message?: string }> {
  const startTime = performance.now()

  try {
    const { error } = await supabase
      .from('oauth_tokens')
      .select('id')
      .limit(1)

    const latency = Math.round(performance.now() - startTime)

    return {
      status: error ? 'fail' : 'pass',
      latency_ms: latency,
      message: error ? error.message : undefined,
    }
  } catch (error) {
    return {
      status: 'fail',
      latency_ms: Math.round(performance.now() - startTime),
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Subscription API 체크
 */
async function checkSubscriptionAPI(
  supabase: ReturnType<typeof createClient>
): Promise<{ status: 'pass' | 'fail'; latency_ms: number; message?: string }> {
  const startTime = performance.now()

  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .select('id')
      .limit(1)

    const latency = Math.round(performance.now() - startTime)

    return {
      status: error ? 'fail' : 'pass',
      latency_ms: latency,
      message: error ? error.message : undefined,
    }
  } catch (error) {
    return {
      status: 'fail',
      latency_ms: Math.round(performance.now() - startTime),
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 전체 시스템 상태 결정
 */
function determineSystemStatus(components: Record<string, ComponentHealth>): SystemStatus {
  const statuses = Object.values(components).map(c => c.status)

  // 하나라도 unhealthy면 전체 시스템 unhealthy
  if (statuses.includes('unhealthy')) {
    return 'unhealthy'
  }

  // 하나라도 degraded면 전체 시스템 degraded
  if (statuses.includes('degraded')) {
    return 'degraded'
  }

  // 모두 healthy면 전체 시스템 healthy
  return 'healthy'
}

/**
 * 메트릭 데이터 조회
 */
async function getMetrics(
  supabase: ReturnType<typeof createClient>
): Promise<MetricsResponse> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  try {
    // health_metrics 테이블에서 메트릭 조회
    const { data, error } = await supabase
      .from('health_metrics_hourly')
      .select('*')
      .gte('hour', oneHourAgo.toISOString())
      .single()

    if (error || !data) {
      // 데이터가 없으면 기본값 반환
      return {
        timestamp: now.toISOString(),
        period: '1h',
        requests: {
          total: 0,
          success: 0,
          error: 0,
          success_rate: 0,
        },
        latency: {
          p50_ms: 0,
          p95_ms: 0,
          p99_ms: 0,
          avg_ms: 0,
        },
        rate_limits: {
          total_blocked: 0,
          top_blocked_ips: [],
        },
        errors: {
          by_code: {},
        },
      }
    }

    // 데이터 변환 및 반환
    return {
      timestamp: now.toISOString(),
      period: '1h',
      requests: {
        total: data.total_requests || 0,
        success: data.success_count || 0,
        error: (data.total_requests || 0) - (data.success_count || 0),
        success_rate: data.total_requests
          ? Math.round((data.success_count / data.total_requests) * 1000) / 10
          : 0,
      },
      latency: {
        p50_ms: Math.round(data.avg_latency_ms || 0),
        p95_ms: Math.round(data.p95_latency_ms || 0),
        p99_ms: Math.round((data.p95_latency_ms || 0) * 1.2), // 근사값
        avg_ms: Math.round(data.avg_latency_ms || 0),
      },
      rate_limits: {
        total_blocked: 0, // 별도 테이블 필요
        top_blocked_ips: [],
      },
      errors: {
        by_code: {}, // 별도 집계 필요
      },
    }
  } catch {
    // 오류 시 기본값 반환
    return {
      timestamp: now.toISOString(),
      period: '1h',
      requests: {
        total: 0,
        success: 0,
        error: 0,
        success_rate: 0,
      },
      latency: {
        p50_ms: 0,
        p95_ms: 0,
        p99_ms: 0,
        avg_ms: 0,
      },
      rate_limits: {
        total_blocked: 0,
        top_blocked_ips: [],
      },
      errors: {
        by_code: {},
      },
    }
  }
}

/**
 * 메트릭 기록
 */
async function recordMetric(
  supabase: ReturnType<typeof createClient>,
  endpoint: string,
  statusCode: number,
  latencyMs: number,
  errorCode?: string
): Promise<void> {
  try {
    await supabase.from('health_metrics').insert({
      endpoint,
      status_code: statusCode,
      latency_ms: latencyMs,
      error_code: errorCode,
    })
  } catch {
    // 메트릭 기록 실패는 무시 (헬스체크 자체에 영향 없음)
  }
}

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req) => {
  const startTime = performance.now()

  // CORS 헤더 생성
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // GET만 허용
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        error: 'Method Not Allowed',
        message: 'GET 메서드만 허용됩니다.',
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')

    const response: HealthCheckResponse = {
      status: 'unhealthy',
      version: API_VERSION,
      timestamp: new Date().toISOString(),
      components: {
        configuration: {
          status: 'unhealthy',
          message: 'Supabase 설정 누락',
        },
      },
      response_time_ms: Math.round(performance.now() - startTime),
    }

    return new Response(JSON.stringify(response, null, 2), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // URL 경로 파싱
  const url = new URL(req.url)
  const path = url.pathname

  // 라우팅
  try {
    // /ready - Kubernetes readiness probe
    if (path.endsWith('/ready')) {
      const cached = getCached<HealthCheckResponse>('ready')
      if (cached) {
        return new Response(JSON.stringify(cached, null, 2), {
          status: cached.status === 'healthy' ? 200 : 503,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_DURATION.basic}`,
          },
        })
      }

      const dbHealth = await checkDatabaseHealth(supabase, false)
      const isReady = dbHealth.status === 'healthy'

      const response: HealthCheckResponse = {
        status: isReady ? 'healthy' : 'unhealthy',
        version: API_VERSION,
        timestamp: new Date().toISOString(),
        response_time_ms: Math.round(performance.now() - startTime),
      }

      setCache('ready', response, CACHE_DURATION.basic)

      await recordMetric(
        supabase,
        '/ready',
        isReady ? 200 : 503,
        response.response_time_ms || 0
      )

      return new Response(JSON.stringify(response, null, 2), {
        status: isReady ? 200 : 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_DURATION.basic}`,
        },
      })
    }

    // /live - Kubernetes liveness probe
    if (path.endsWith('/live')) {
      const response: HealthCheckResponse = {
        status: 'healthy',
        version: API_VERSION,
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor((Date.now() - SERVICE_START_TIME) / 1000),
        response_time_ms: Math.round(performance.now() - startTime),
      }

      await recordMetric(
        supabase,
        '/live',
        200,
        response.response_time_ms || 0
      )

      return new Response(JSON.stringify(response, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_DURATION.basic}`,
        },
      })
    }

    // /metrics - 성능 메트릭
    if (path.endsWith('/metrics')) {
      const cached = getCached<MetricsResponse>('metrics')
      if (cached) {
        return new Response(JSON.stringify(cached, null, 2), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_DURATION.metrics}`,
          },
        })
      }

      const metrics = await getMetrics(supabase)
      setCache('metrics', metrics, CACHE_DURATION.metrics)

      await recordMetric(
        supabase,
        '/metrics',
        200,
        Math.round(performance.now() - startTime)
      )

      return new Response(JSON.stringify(metrics, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_DURATION.metrics}`,
        },
      })
    }

    // /detailed - 상세 헬스체크
    if (path.endsWith('/detailed')) {
      const cached = getCached<DetailedHealthResponse>('detailed')
      if (cached) {
        return new Response(JSON.stringify(cached, null, 2), {
          status: cached.status === 'unhealthy' ? 503 : 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_DURATION.detailed}`,
          },
        })
      }

      // 모든 컴포넌트 헬스체크 병렬 실행
      const [database, auth, storage, edgeFunctions, oauthCheck, subscriptionCheck] = await Promise.all([
        checkDatabaseHealth(supabase, true),
        checkAuthHealth(supabase),
        checkStorageHealth(supabase),
        checkEdgeFunctionsHealth(),
        checkOAuthToken(supabase),
        checkSubscriptionAPI(supabase),
      ])

      const components: Record<string, ComponentHealth> = {
        database,
        auth,
        storage,
        edge_functions: edgeFunctions,
      }

      const systemStatus = determineSystemStatus(components)

      const response: DetailedHealthResponse = {
        status: systemStatus,
        version: API_VERSION,
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor((Date.now() - SERVICE_START_TIME) / 1000),
        components,
        checks: {
          oauth_token: oauthCheck,
          subscription_api: subscriptionCheck,
        },
        response_time_ms: Math.round(performance.now() - startTime),
      }

      setCache('detailed', response, CACHE_DURATION.detailed)

      await recordMetric(
        supabase,
        '/detailed',
        systemStatus === 'unhealthy' ? 503 : 200,
        response.response_time_ms || 0
      )

      return new Response(JSON.stringify(response, null, 2), {
        status: systemStatus === 'unhealthy' ? 503 : 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_DURATION.detailed}`,
        },
      })
    }

    // 기본 엔드포인트 - 빠른 헬스체크
    const cached = getCached<HealthCheckResponse>('basic')
    if (cached) {
      return new Response(JSON.stringify(cached, null, 2), {
        status: cached.status === 'unhealthy' ? 503 : 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_DURATION.basic}`,
        },
      })
    }

    // 컴포넌트별 헬스체크 실행 (기본은 DB만)
    const components: Record<string, ComponentHealth> = {
      database: await checkDatabaseHealth(supabase, false),
    }

    // 전체 시스템 상태 결정
    const systemStatus = determineSystemStatus(components)

    // 응답 생성
    const response: HealthCheckResponse = {
      status: systemStatus,
      version: API_VERSION,
      timestamp: new Date().toISOString(),
      components,
      response_time_ms: Math.round(performance.now() - startTime),
    }

    setCache('basic', response, CACHE_DURATION.basic)

    // HTTP 상태 코드 결정
    const httpStatus = systemStatus === 'unhealthy' ? 503 : 200

    await recordMetric(
      supabase,
      '/basic',
      httpStatus,
      response.response_time_ms || 0
    )

    return new Response(JSON.stringify(response, null, 2), {
      status: httpStatus,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_DURATION.basic}`,
      },
    })
  } catch (error) {
    console.error('Health check error:', error)

    const response: HealthCheckResponse = {
      status: 'unhealthy',
      version: API_VERSION,
      timestamp: new Date().toISOString(),
      components: {
        error: {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      response_time_ms: Math.round(performance.now() - startTime),
    }

    await recordMetric(
      supabase,
      '/error',
      503,
      response.response_time_ms || 0,
      error instanceof Error ? error.name : 'UnknownError'
    )

    return new Response(JSON.stringify(response, null, 2), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }
})
