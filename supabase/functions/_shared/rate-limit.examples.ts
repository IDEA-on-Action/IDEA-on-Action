/**
 * Rate Limit 적용 예시 코드
 *
 * 각 엔드포인트 타입별 Rate Limiting 적용 방법을 보여줍니다.
 *
 * @module rate-limit.examples
 * @version 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from './cors.ts'
import {
  checkRateLimit,
  rateLimitMiddleware,
  addRateLimitHeaders,
  RATE_LIMIT_PRESETS,
  createUserIdKeyGenerator,
  type RateLimitConfig,
} from './rate-limit.ts'

// ============================================================================
// 예시 1: OAuth Token 엔드포인트 (IP 기반, 10 req/min)
// ============================================================================

/**
 * OAuth Token 엔드포인트에 Rate Limiting 적용
 *
 * - IP 주소 기반으로 제한
 * - 10 req/min
 * - RFC 6585 준수 응답
 */
serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Rate Limit 체크 (미들웨어 방식)
  const rateLimitResponse = await rateLimitMiddleware(
    supabase,
    req,
    RATE_LIMIT_PRESETS.OAUTH
  )

  if (rateLimitResponse) {
    // Rate Limit 초과 시 429 응답
    return rateLimitResponse
  }

  // 정상 처리 로직...
  const response = new Response(
    JSON.stringify({ message: 'Token issued successfully' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )

  return response
})

// ============================================================================
// 예시 2: OAuth Authorize 엔드포인트 (IP 기반, 10 req/min)
// ============================================================================

/**
 * OAuth Authorize 엔드포인트에 Rate Limiting 적용
 */
serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Rate Limit 체크 (수동 방식)
  const result = await checkRateLimit(
    supabase,
    req,
    RATE_LIMIT_PRESETS.OAUTH
  )

  if (!result.allowed) {
    // Rate Limit 초과 시 429 응답
    return new Response(
      JSON.stringify({
        type: 'https://ideaonaction.ai/errors/rate-limit-exceeded',
        title: 'Rate Limit 초과',
        status: 429,
        detail: `요청 한도를 초과했습니다. ${result.retryAfter}초 후 다시 시도하세요.`,
        instance: new URL(req.url).pathname,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/problem+json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetAt.toString(),
          'Retry-After': result.retryAfter.toString(),
        },
      }
    )
  }

  // 정상 처리 로직...
  const response = new Response(
    JSON.stringify({ message: 'Authorization successful' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )

  // Rate Limit 헤더 추가
  return addRateLimitHeaders(response, result)
})

// ============================================================================
// 예시 3: Subscription API (User ID 기반, 60 req/min)
// ============================================================================

/**
 * Subscription API에 Rate Limiting 적용
 *
 * - User ID 기반으로 제한
 * - 60 req/min
 */
serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Rate Limit 체크 (미들웨어 방식)
  const rateLimitResponse = await rateLimitMiddleware(
    supabase,
    req,
    RATE_LIMIT_PRESETS.API
  )

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // 정상 처리 로직...
  const response = new Response(
    JSON.stringify({ message: 'Subscription data retrieved' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )

  return response
})

// ============================================================================
// 예시 4: User API (User ID 기반, 60 req/min)
// ============================================================================

/**
 * User API에 Rate Limiting 적용
 */
serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Rate Limit 체크
  const rateLimitResponse = await rateLimitMiddleware(
    supabase,
    req,
    RATE_LIMIT_PRESETS.API
  )

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // 정상 처리 로직...
  const response = new Response(
    JSON.stringify({ message: 'User data retrieved' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )

  return response
})

// ============================================================================
// 예시 5: Webhook 엔드포인트 (Client ID 기반, 100 req/min)
// ============================================================================

/**
 * Webhook 엔드포인트에 Rate Limiting 적용
 *
 * - Client ID 기반으로 제한
 * - 100 req/min
 */
serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Rate Limit 체크
  const rateLimitResponse = await rateLimitMiddleware(
    supabase,
    req,
    RATE_LIMIT_PRESETS.WEBHOOK
  )

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // 정상 처리 로직...
  const response = new Response(
    JSON.stringify({ message: 'Webhook processed successfully' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )

  return response
})

// ============================================================================
// 예시 6: 커스텀 Rate Limit 설정
// ============================================================================

/**
 * 커스텀 Rate Limit 설정 예시
 */
const CUSTOM_RATE_LIMIT: RateLimitConfig = {
  windowMs: 5 * 60 * 1000, // 5분
  maxRequests: 100,
  keyGenerator: (req: Request) => {
    // 커스텀 키 생성 로직
    const apiKey = req.headers.get('x-api-key') || 'anonymous'
    return `custom:apikey:${apiKey}`
  },
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // 커스텀 Rate Limit 체크
  const rateLimitResponse = await rateLimitMiddleware(
    supabase,
    req,
    CUSTOM_RATE_LIMIT
  )

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // 정상 처리 로직...
  const response = new Response(
    JSON.stringify({ message: 'Custom endpoint processed' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )

  return response
})

// ============================================================================
// 예시 7: User ID 기반 커스텀 키 생성기 사용
// ============================================================================

/**
 * User ID 추출 및 커스텀 키 생성 예시
 */
const CUSTOM_USER_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1분
  maxRequests: 30,
  keyGenerator: createUserIdKeyGenerator('custom-api'),
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // User ID 기반 Rate Limit 체크
  const rateLimitResponse = await rateLimitMiddleware(
    supabase,
    req,
    CUSTOM_USER_RATE_LIMIT
  )

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // 정상 처리 로직...
  const response = new Response(
    JSON.stringify({ message: 'User-specific endpoint processed' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )

  return response
})

// ============================================================================
// 예시 8: Rate Limit과 기존 에러 처리 통합
// ============================================================================

/**
 * Rate Limit과 기존 에러 처리를 통합한 예시
 */
import { createErrorResponse } from './problem-details.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Rate Limit 체크 (수동 방식)
  const result = await checkRateLimit(
    supabase,
    req,
    RATE_LIMIT_PRESETS.API
  )

  if (!result.allowed) {
    // createRateLimitResponse 함수 사용 (problem-details.ts에 이미 정의됨)
    return createErrorResponse(
      'RATE_LIMIT_EXCEEDED',
      `요청 한도를 초과했습니다. ${result.retryAfter}초 후 다시 시도하세요.`,
      new URL(req.url).pathname,
      429,
      {
        limit: result.limit,
        current: result.current,
        remaining: result.remaining,
        reset_at: result.resetAt,
        retry_after: result.retryAfter,
      },
      req
    )
  }

  // 정상 처리 로직...
  const response = new Response(
    JSON.stringify({ message: 'Integrated error handling example' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )

  // Rate Limit 헤더 추가
  return addRateLimitHeaders(response, result)
})
