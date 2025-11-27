/**
 * User API Edge Function
 *
 * 사용자 정보 및 구독 정보 조회 REST API
 *
 * @endpoint GET /api/user/me - 현재 사용자 정보
 * @endpoint GET /api/user/subscription - 구독 상세 정보
 *
 * @headers
 *   Authorization: Bearer <ACCESS_TOKEN>
 *   Content-Type: application/json
 *
 * @version 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// 상수 정의
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

// Rate Limiting (분당 60회)
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 60

// ============================================================================
// 타입 정의
// ============================================================================

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  subscription: SubscriptionInfo | null
}

interface SubscriptionInfo {
  id: string
  service_id: string
  service_name: string
  plan_id: string
  plan_name: string
  billing_cycle: string
  price: number
  status: string
  trial_end_date: string | null
  current_period_start: string
  current_period_end: string
  next_billing_date: string | null
  cancel_at_period_end: boolean
  created_at: string
}

interface SubscriptionDetail {
  subscription: SubscriptionInfo
  usage: {
    total_payments: number
    last_payment_date: string | null
    total_amount_paid: number
  }
  features: string[]
  next_payment: {
    amount: number
    date: string | null
  }
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
): Promise<{ valid: boolean; userId?: string; email?: string; error?: string }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { valid: false, error: 'invalid_token' }
    }

    return { valid: true, userId: user.id, email: user.email }
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
 * GET /api/user/me - 현재 사용자 정보
 */
async function handleGetMe(
  userId: string,
  email: string,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    // 사용자 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, avatar_url, created_at')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile query error:', profileError)
      throw profileError
    }

    // 활성 구독 조회
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        service_id,
        services!inner(name),
        plan_id,
        subscription_plans!inner(plan_name, billing_cycle, price),
        status,
        trial_end_date,
        current_period_start,
        current_period_end,
        next_billing_date,
        cancel_at_period_end,
        created_at
      `)
      .eq('user_id', userId)
      .in('status', ['trial', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (subscriptionError) {
      console.error('Subscription query error:', subscriptionError)
    }

    const subscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null

    const userProfile: UserProfile = {
      id: userId,
      email,
      full_name: profile?.full_name || null,
      avatar_url: profile?.avatar_url || null,
      created_at: profile?.created_at || new Date().toISOString(),
      subscription: subscription ? {
        id: subscription.id,
        service_id: subscription.service_id,
        service_name: subscription.services?.name || 'Unknown',
        plan_id: subscription.plan_id,
        plan_name: subscription.subscription_plans?.plan_name || 'Unknown',
        billing_cycle: subscription.subscription_plans?.billing_cycle || 'monthly',
        price: subscription.subscription_plans?.price || 0,
        status: subscription.status,
        trial_end_date: subscription.trial_end_date,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        next_billing_date: subscription.next_billing_date,
        cancel_at_period_end: subscription.cancel_at_period_end,
        created_at: subscription.created_at,
      } : null,
    }

    return successResponse(userProfile, requestId)
  } catch (error) {
    console.error('Get me error:', error)
    return errorResponse(
      'internal_error',
      error instanceof Error ? error.message : '사용자 정보 조회 중 오류가 발생했습니다.',
      500,
      requestId
    )
  }
}

/**
 * GET /api/user/subscription - 구독 상세 정보
 */
async function handleGetSubscription(
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
        service_id,
        services!inner(name),
        plan_id,
        subscription_plans!inner(plan_name, billing_cycle, price, features),
        status,
        trial_end_date,
        current_period_start,
        current_period_end,
        next_billing_date,
        cancel_at_period_end,
        created_at
      `)
      .eq('user_id', userId)
      .in('status', ['trial', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (subscriptionError) {
      console.error('Subscription query error:', subscriptionError)
      return errorResponse('query_error', '구독 정보 조회 실패', 500, requestId)
    }

    if (!subscriptions || subscriptions.length === 0) {
      return errorResponse('not_found', '활성 구독이 없습니다.', 404, requestId)
    }

    const subscription = subscriptions[0]

    // 결제 히스토리 조회
    const { data: payments, error: paymentsError } = await supabase
      .from('subscription_payments')
      .select('amount, paid_at, status')
      .eq('subscription_id', subscription.id)
      .eq('status', 'success')
      .order('paid_at', { ascending: false })

    if (paymentsError) {
      console.error('Payments query error:', paymentsError)
    }

    const totalPayments = payments?.length || 0
    const lastPaymentDate = payments && payments.length > 0 ? payments[0].paid_at : null
    const totalAmountPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

    // 플랜 기능 추출
    const features = Array.isArray(subscription.subscription_plans?.features)
      ? subscription.subscription_plans.features.map((f: { text?: string }) => f.text || '')
      : []

    const detail: SubscriptionDetail = {
      subscription: {
        id: subscription.id,
        service_id: subscription.service_id,
        service_name: subscription.services?.name || 'Unknown',
        plan_id: subscription.plan_id,
        plan_name: subscription.subscription_plans?.plan_name || 'Unknown',
        billing_cycle: subscription.subscription_plans?.billing_cycle || 'monthly',
        price: subscription.subscription_plans?.price || 0,
        status: subscription.status,
        trial_end_date: subscription.trial_end_date,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        next_billing_date: subscription.next_billing_date,
        cancel_at_period_end: subscription.cancel_at_period_end,
        created_at: subscription.created_at,
      },
      usage: {
        total_payments: totalPayments,
        last_payment_date: lastPaymentDate,
        total_amount_paid: totalAmountPaid,
      },
      features,
      next_payment: {
        amount: subscription.subscription_plans?.price || 0,
        date: subscription.next_billing_date,
      },
    }

    return successResponse(detail, requestId)
  } catch (error) {
    console.error('Get subscription error:', error)
    return errorResponse(
      'internal_error',
      error instanceof Error ? error.message : '구독 정보 조회 중 오류가 발생했습니다.',
      500,
      requestId
    )
  }
}

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // GET만 허용
  if (req.method !== 'GET') {
    return errorResponse('method_not_allowed', '허용되지 않는 메서드입니다.', 405, generateUUID())
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
  if (!authResult.valid || !authResult.userId || !authResult.email) {
    return errorResponse(
      authResult.error || 'invalid_token',
      '유효하지 않은 토큰입니다.',
      401,
      requestId
    )
  }

  const userId = authResult.userId
  const email = authResult.email

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
  const endpoint = pathParts[pathParts.length - 1]

  try {
    // GET /api/user/me
    if (endpoint === 'me') {
      return await handleGetMe(userId, email, supabase, requestId)
    }

    // GET /api/user/subscription
    if (endpoint === 'subscription') {
      return await handleGetSubscription(userId, supabase, requestId)
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
