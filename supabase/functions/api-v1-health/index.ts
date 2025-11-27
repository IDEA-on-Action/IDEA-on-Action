/**
 * API v1 Health Check Endpoint
 *
 * 시스템 및 컴포넌트 상태를 확인하는 헬스체크 엔드포인트입니다.
 * 데이터베이스 연결, 응답 시간 등을 측정하여 전체 시스템 상태를 반환합니다.
 *
 * @endpoint GET /functions/v1/api-v1-health
 * @version 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// ============================================================================
// 타입 정의
// ============================================================================

type ComponentStatus = 'healthy' | 'degraded' | 'unhealthy'
type SystemStatus = 'healthy' | 'degraded' | 'unhealthy'

interface ComponentHealth {
  status: ComponentStatus
  latency_ms?: number
  message?: string
  metadata?: Record<string, unknown>
}

interface HealthCheckResponse {
  status: SystemStatus
  version: string
  timestamp: string
  components?: Record<string, ComponentHealth>
  response_time_ms?: number
}

// ============================================================================
// 상수 정의
// ============================================================================

const API_VERSION = '1.0.0'

// 헬스체크 임계값 (밀리초)
const THRESHOLDS = {
  database: {
    healthy: 100,    // 100ms 이하: healthy
    degraded: 500,   // 500ms 이하: degraded, 초과: unhealthy
  },
}

// ============================================================================
// 헬스체크 함수
// ============================================================================

/**
 * 데이터베이스 헬스체크
 */
async function checkDatabaseHealth(
  supabase: ReturnType<typeof createClient>
): Promise<ComponentHealth> {
  const startTime = performance.now()

  try {
    // 간단한 쿼리로 DB 연결 확인
    const { error } = await supabase
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

    // 응답 시간에 따른 상태 결정
    if (latency <= THRESHOLDS.database.healthy) {
      return {
        status: 'healthy',
        latency_ms: latency,
        message: '데이터베이스 정상',
      }
    } else if (latency <= THRESHOLDS.database.degraded) {
      return {
        status: 'degraded',
        latency_ms: latency,
        message: '데이터베이스 응답 지연',
      }
    } else {
      return {
        status: 'unhealthy',
        latency_ms: latency,
        message: '데이터베이스 응답 시간 초과',
      }
    }
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

  // 컴포넌트별 헬스체크 실행
  const components: Record<string, ComponentHealth> = {
    database: await checkDatabaseHealth(supabase),
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

  // HTTP 상태 코드 결정
  let httpStatus = 200
  if (systemStatus === 'degraded') {
    httpStatus = 200 // degraded도 200 반환 (서비스는 가능)
  } else if (systemStatus === 'unhealthy') {
    httpStatus = 503 // Service Unavailable
  }

  return new Response(JSON.stringify(response, null, 2), {
    status: httpStatus,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
})
