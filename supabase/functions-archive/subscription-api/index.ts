/**
 * Subscription API Edge Function
 *
 * 구독 기능 제한 및 사용량 관리 REST API
 *
 * @endpoint GET /api/subscription/features - 플랜 기능 목록
 * @endpoint GET /api/subscription/usage - 현재 사용량
 * @endpoint POST /api/subscription/usage/increment - 사용량 증가
 * @endpoint GET /api/subscription/can-access - 기능 접근 가능 여부
 *
 * @headers
 *   Authorization: Bearer <ACCESS_TOKEN>
 *   Content-Type: application/json
 *
 * @version 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// ============================================================================
// 상수 정의
// ============================================================================

// CORS 헤더는 getCorsHeaders()로 동적 생성 (삭제됨)

// Rate Limiting (분당 60회)
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 60

// ============================================================================
// 타입 정의
// ============================================================================

interface PlanFeature {
  icon: string
  text: string
  limit?: number // 제한 횟수 (선택)
}

interface FeatureUsage {
  feature_key: string
  used_count: number
  limit: number
  remaining: number
  period_start: string
  period_end: string
}

interface UsageResponse {
  subscription_id: string
  plan_name: string
  billing_cycle: string
  current_period_start: string
  current_period_end: string
  features: FeatureUsage[]
}

interface IncrementRequest {
  feature_key: string
}

interface IncrementResponse {
  success: boolean
  feature_key: string
  used_count: number
  remaining: number
}

interface CanAccessResponse {
  can_access: boolean
  feature_key: string
  used_count: number
  limit: number
  remaining: number
}

interface ErrorResponse {
  error: {
    code: string
    message: string
    request_id: string
    timestamp: string
  }
}

interface RateLimitInfo {
  requests: number
  window_start: number
}

// ============================================================================
// Rate Limiting 저장소
// ============================================================================

const rateLimitStore = new Map<string, RateLimitInfo>()

// ============================================================================
// 유틸리티 함수
// ============================================================================

function generateUUID(): string {
  return crypto.randomUUID()
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

async function verifySupabaseAuth(
  token: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { valid: false, error: 'invalid_token' }
    }

    return { valid: true, userId: user.id }
  } catch (error) {
    console.error('Supabase auth verification error:', error)
    return { valid: false, error: 'auth_verification_failed' }
  }
}

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const info = rateLimitStore.get(userId)

  if (!info || now - info.window_start >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { requests: 1, window_start: now })
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    }
  }

  if (info.requests >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: info.window_start + RATE_LIMIT_WINDOW_MS,
    }
  }

  info.requests++
  rateLimitStore.set(userId, info)

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - info.requests,
    resetAt: info.window_start + RATE_LIMIT_WINDOW_MS,
  }
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string,
  headers?: Record<string, string>
): Response {
  const response: ErrorResponse = {
    error: {
      code,
      message,
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...headers },
  })
}

function successResponse<T>(data: T, requestId: string, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId, ...headers },
  })
}

// ============================================================================
// 핸들러 함수
// ============================================================================

/**
 * GET /api/subscription/features - 플랜 기능 목록
 */
async function handleGetFeatures(
  req: Request,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    // URL 쿼리 파라미터에서 plan_id 추출
    const url = new URL(req.url)
    const planId = url.searchParams.get('plan_id')

    if (!planId) {
      return errorResponse('missing_parameter', 'plan_id 쿼리 파라미터가 필요합니다.', 400, requestId)
    }

    // 플랜 정보 조회
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('plan_name, billing_cycle, features')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      console.error('Plan query error:', planError)
      return errorResponse('not_found', '플랜을 찾을 수 없습니다.', 404, requestId)
    }

    // features는 JSONB array
    const features: PlanFeature[] = Array.isArray(plan.features) ? plan.features : []

    return successResponse({
      plan_id: planId,
      plan_name: plan.plan_name,
      billing_cycle: plan.billing_cycle,
      features,
    }, requestId)
  } catch (error) {
    console.error('Get features error:', error)
    return errorResponse(
      'internal_error',
      error instanceof Error ? error.message : '기능 목록 조회 중 오류가 발생했습니다.',
      500,
      requestId
    )
  }
}

/**
 * GET /api/subscription/usage - 현재 사용량
 */
async function handleGetUsage(
  userId: string,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    // 활성 구독 조회
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        plan_id,
        subscription_plans!inner(plan_name, billing_cycle),
        current_period_start,
        current_period_end
      `)
      .eq('user_id', userId)
      .in('status', ['trial', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (subscriptionError || !subscriptions || subscriptions.length === 0) {
      console.error('Subscription query error:', subscriptionError)
      return errorResponse('not_found', '활성 구독이 없습니다.', 404, requestId)
    }

    const subscription = subscriptions[0]

    // 플랜 기능 목록 조회
    const { data: planFeatures, error: featuresError } = await supabase
      .from('plan_features')
      .select('feature_key, limit_value, limit_type, description')
      .eq('plan_id', subscription.plan_id)
      .eq('limit_type', 'count')

    if (featuresError) {
      console.error('Plan features query error:', featuresError)
      return errorResponse('query_error', '플랜 기능 조회 실패', 500, requestId)
    }

    // 각 기능의 현재 사용량 조회
    const featureUsages: FeatureUsage[] = []

    for (const feature of planFeatures || []) {
      const { data: usageData, error: usageError } = await supabase
        .rpc('get_current_usage', {
          p_subscription_id: subscription.id,
          p_feature_key: feature.feature_key,
        })
        .single()

      if (usageError) {
        console.error('Usage query error:', usageError)
        continue
      }

      featureUsages.push({
        feature_key: feature.feature_key,
        used_count: usageData.used_count || 0,
        limit: usageData.limit_value || 0,
        remaining: usageData.remaining || 0,
        period_start: usageData.period_start,
        period_end: usageData.period_end,
      })
    }

    const response: UsageResponse = {
      subscription_id: subscription.id,
      plan_name: subscription.subscription_plans?.plan_name || 'Unknown',
      billing_cycle: subscription.subscription_plans?.billing_cycle || 'monthly',
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      features: featureUsages,
    }

    return successResponse(response, requestId)
  } catch (error) {
    console.error('Get usage error:', error)
    return errorResponse(
      'internal_error',
      error instanceof Error ? error.message : '사용량 조회 중 오류가 발생했습니다.',
      500,
      requestId
    )
  }
}

/**
 * POST /api/subscription/usage/increment - 사용량 증가
 */
async function handleIncrementUsage(
  req: Request,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    // 요청 본문 파싱
    let body: IncrementRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse('invalid_payload', '유효하지 않은 JSON 페이로드입니다.', 400, requestId)
    }

    if (!body.feature_key) {
      return errorResponse('missing_field', 'feature_key 필드가 필요합니다.', 400, requestId)
    }

    // 활성 구독 조회
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['trial', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (subscriptionError || !subscriptions || subscriptions.length === 0) {
      console.error('Subscription query error:', subscriptionError)
      return errorResponse('not_found', '활성 구독이 없습니다.', 404, requestId)
    }

    const subscription = subscriptions[0]

    // increment_subscription_usage 함수 호출 (원자적 업데이트)
    const { data: result, error: incrementError } = await supabase
      .rpc('increment_subscription_usage', {
        p_subscription_id: subscription.id,
        p_feature_key: body.feature_key,
        p_increment: 1,
      })
      .single()

    if (incrementError) {
      console.error('Increment usage error:', incrementError)
      return errorResponse('increment_error', '사용량 증가 실패', 500, requestId)
    }

    // 결과 파싱
    if (!result.success) {
      return errorResponse(
        'limit_exceeded',
        result.error_message || '기능 사용 제한을 초과했습니다.',
        403,
        requestId
      )
    }

    const remaining = result.limit_value === -1
      ? -1 // 무제한
      : Math.max(0, result.limit_value - result.current_usage)

    const response: IncrementResponse = {
      success: true,
      feature_key: body.feature_key,
      used_count: result.current_usage,
      remaining,
    }

    return successResponse(response, requestId)
  } catch (error) {
    console.error('Increment usage error:', error)
    return errorResponse(
      'internal_error',
      error instanceof Error ? error.message : '사용량 증가 중 오류가 발생했습니다.',
      500,
      requestId
    )
  }
}

/**
 * GET /api/subscription/can-access - 기능 접근 가능 여부
 */
async function handleCanAccess(
  req: Request,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    // URL 쿼리 파라미터에서 feature_key 추출
    const url = new URL(req.url)
    const featureKey = url.searchParams.get('feature_key')

    if (!featureKey) {
      return errorResponse('missing_parameter', 'feature_key 쿼리 파라미터가 필요합니다.', 400, requestId)
    }

    // 활성 구독 조회
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['trial', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (subscriptionError || !subscriptions || subscriptions.length === 0) {
      console.error('Subscription query error:', subscriptionError)
      return successResponse({
        can_access: false,
        feature_key: featureKey,
        used_count: 0,
        limit: 0,
        remaining: 0,
      } as CanAccessResponse, requestId)
    }

    const subscription = subscriptions[0]

    // check_feature_limit 함수 호출
    const { data: result, error: checkError } = await supabase
      .rpc('check_feature_limit', {
        p_subscription_id: subscription.id,
        p_feature_key: featureKey,
      })
      .single()

    if (checkError) {
      console.error('Check feature limit error:', checkError)
      return errorResponse('check_error', '기능 제한 확인 실패', 500, requestId)
    }

    const remaining = result.limit_value === -1
      ? -1 // 무제한
      : Math.max(0, result.limit_value - result.current_usage)

    const response: CanAccessResponse = {
      can_access: result.allowed,
      feature_key: featureKey,
      used_count: result.current_usage || 0,
      limit: result.limit_value || 0,
      remaining,
    }

    return successResponse(response, requestId)
  } catch (error) {
    console.error('Can access error:', error)
    return errorResponse(
      'internal_error',
      error instanceof Error ? error.message : '접근 가능 여부 확인 중 오류가 발생했습니다.',
      500,
      requestId
    )
  }
}

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = req.headers.get('x-request-id') || generateUUID()

  // 인증 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'))
  if (!token) {
    return errorResponse('unauthorized', 'Authorization 헤더가 필요합니다.', 401, requestId)
  }

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return errorResponse('server_error', '서버 설정 오류입니다.', 500, requestId)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Supabase Auth 토큰 검증
  const authResult = await verifySupabaseAuth(token, supabase)
  if (!authResult.valid || !authResult.userId) {
    return errorResponse(
      authResult.error || 'invalid_token',
      '유효하지 않은 토큰입니다.',
      401,
      requestId
    )
  }

  const userId = authResult.userId

  // Rate Limiting 체크
  const rateLimitResult = checkRateLimit(userId)
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
    return errorResponse(
      'rate_limit_exceeded',
      `요청 한도를 초과했습니다. ${retryAfter}초 후 다시 시도하세요.`,
      429,
      requestId,
      {
        'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetAt / 1000).toString(),
        'Retry-After': retryAfter.toString(),
      }
    )
  }

  // URL 파싱
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)

  // 엔드포인트 결정
  const lastPart = pathParts[pathParts.length - 1]
  const secondLastPart = pathParts[pathParts.length - 2]

  try {
    // GET /api/subscription/features
    if (req.method === 'GET' && lastPart === 'features') {
      return await handleGetFeatures(req, userId, supabase, requestId)
    }

    // GET /api/subscription/usage
    if (req.method === 'GET' && lastPart === 'usage') {
      return await handleGetUsage(userId, supabase, requestId)
    }

    // POST /api/subscription/usage/increment
    if (req.method === 'POST' && lastPart === 'increment' && secondLastPart === 'usage') {
      return await handleIncrementUsage(req, userId, supabase, requestId)
    }

    // GET /api/subscription/can-access
    if (req.method === 'GET' && lastPart === 'can-access') {
      return await handleCanAccess(req, userId, supabase, requestId)
    }

    // 지원하지 않는 엔드포인트
    return errorResponse(
      'not_found',
      '요청한 엔드포인트를 찾을 수 없습니다.',
      404,
      requestId
    )
  } catch (error) {
    console.error('Unhandled error:', error)
    return errorResponse(
      'internal_error',
      '서버 내부 오류가 발생했습니다.',
      500,
      requestId
    )
  }
})
