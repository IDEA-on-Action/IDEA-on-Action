/**
 * Rate Limiting 공유 모듈
 *
 * Supabase 테이블 기반 Rate Limiting 구현 (추가 비용 없음)
 * 슬라이딩 윈도우 알고리즘 사용
 *
 * @module rate-limit
 * @version 1.0.0
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * Rate Limit 설정
 */
export interface RateLimitConfig {
  /** 시간 윈도우 (밀리초) */
  windowMs: number
  /** 시간 윈도우당 최대 요청 수 */
  maxRequests: number
  /** 키 생성 함수 */
  keyGenerator: (req: Request) => string | Promise<string>
}

/**
 * Rate Limit 결과
 */
export interface RateLimitResult {
  /** 요청 허용 여부 */
  allowed: boolean
  /** 최대 요청 수 */
  limit: number
  /** 현재 사용량 */
  current: number
  /** 남은 요청 수 */
  remaining: number
  /** 리셋 시간 (Unix timestamp, 초 단위) */
  resetAt: number
  /** 재시도 가능 시간 (초) */
  retryAfter: number
}

/**
 * Rate Limit 엔트리 (DB 레코드)
 */
interface RateLimitEntry {
  id?: string
  key: string
  count: number
  window_start: string
  expires_at: string
  created_at?: string
  updated_at?: string
}

// ============================================================================
// Rate Limit 프리셋
// ============================================================================

/**
 * 사전 정의된 Rate Limit 정책
 */
export const RATE_LIMIT_PRESETS = {
  /** OAuth 엔드포인트: 10 req/min (IP 기준) */
  OAUTH: {
    windowMs: 60 * 1000, // 1분
    maxRequests: 10,
    keyGenerator: (req: Request) => {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                 req.headers.get('x-real-ip') ||
                 'unknown'
      return `oauth:ip:${ip}`
    },
  } as RateLimitConfig,

  /** API 엔드포인트: 60 req/min (User ID 기준) */
  API: {
    windowMs: 60 * 1000, // 1분
    maxRequests: 60,
    keyGenerator: async (req: Request) => {
      // Authorization 헤더에서 User ID 추출 (JWT 파싱 필요)
      const authHeader = req.headers.get('authorization')
      if (!authHeader) {
        throw new Error('Authorization header required for API rate limit')
      }
      // 임시: Authorization 헤더 해시 사용
      const userId = await hashString(authHeader)
      return `api:user:${userId.substring(0, 16)}`
    },
  } as RateLimitConfig,

  /** Webhook 엔드포인트: 100 req/min (Client ID 기준) */
  WEBHOOK: {
    windowMs: 60 * 1000, // 1분
    maxRequests: 100,
    keyGenerator: (req: Request) => {
      const clientId = req.headers.get('x-client-id') || 'unknown'
      return `webhook:client:${clientId}`
    },
  } as RateLimitConfig,
} as const

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 문자열 SHA-256 해시
 */
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ============================================================================
// Rate Limit 체크 함수
// ============================================================================

/**
 * Rate Limit 체크 (슬라이딩 윈도우)
 *
 * @param supabase - Supabase 클라이언트
 * @param req - HTTP 요청 객체
 * @param config - Rate Limit 설정
 * @returns Rate Limit 결과
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  req: Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowMs)
  const expiresAt = new Date(now.getTime() + config.windowMs)

  // 키 생성
  let key: string
  try {
    key = await config.keyGenerator(req)
  } catch (error) {
    console.error('Rate limit key generation error:', error)
    // 키 생성 실패 시 기본 키 사용 (IP 기반)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    key = `default:ip:${ip}`
  }

  // 만료된 엔트리 자동 삭제 (TTL)
  await cleanupExpiredEntries(supabase, key)

  // 현재 윈도우 내의 요청 수 조회
  const { data: entries, error: queryError } = await supabase
    .from('rate_limit_entries')
    .select('id, count, window_start')
    .eq('key', key)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)

  if (queryError) {
    console.error('Rate limit query error:', queryError)
    // 에러 시 요청 허용 (Fail-Open)
    return {
      allowed: true,
      limit: config.maxRequests,
      current: 0,
      remaining: config.maxRequests,
      resetAt: Math.ceil(expiresAt.getTime() / 1000),
      retryAfter: 0,
    }
  }

  const currentEntry = entries && entries.length > 0 ? entries[0] : null
  const currentCount = currentEntry?.count || 0

  // Rate Limit 초과 확인
  if (currentCount >= config.maxRequests) {
    const resetAt = currentEntry
      ? Math.ceil((new Date(currentEntry.window_start).getTime() + config.windowMs) / 1000)
      : Math.ceil(expiresAt.getTime() / 1000)

    const retryAfter = Math.max(0, resetAt - Math.floor(Date.now() / 1000))

    return {
      allowed: false,
      limit: config.maxRequests,
      current: currentCount,
      remaining: 0,
      resetAt,
      retryAfter,
    }
  }

  // 요청 수 증가
  let newCount = currentCount + 1

  if (currentEntry) {
    // 기존 엔트리 업데이트
    const { error: updateError } = await supabase
      .from('rate_limit_entries')
      .update({
        count: newCount,
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', currentEntry.id)

    if (updateError) {
      console.error('Rate limit update error:', updateError)
    }
  } else {
    // 새 엔트리 생성
    const { error: insertError } = await supabase
      .from('rate_limit_entries')
      .insert({
        key,
        count: 1,
        window_start: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('Rate limit insert error:', insertError)
    }

    newCount = 1
  }

  const resetAt = currentEntry
    ? Math.ceil((new Date(currentEntry.window_start).getTime() + config.windowMs) / 1000)
    : Math.ceil(expiresAt.getTime() / 1000)

  return {
    allowed: true,
    limit: config.maxRequests,
    current: newCount,
    remaining: Math.max(0, config.maxRequests - newCount),
    resetAt,
    retryAfter: 0,
  }
}

/**
 * 만료된 엔트리 정리
 */
async function cleanupExpiredEntries(
  supabase: SupabaseClient,
  key: string
): Promise<void> {
  const now = new Date()

  await supabase
    .from('rate_limit_entries')
    .delete()
    .eq('key', key)
    .lt('expires_at', now.toISOString())
}

// ============================================================================
// Rate Limit 미들웨어
// ============================================================================

/**
 * Rate Limit 미들웨어 (RFC 6585 준수)
 *
 * @param supabase - Supabase 클라이언트
 * @param req - HTTP 요청 객체
 * @param config - Rate Limit 설정
 * @returns Rate Limit 초과 시 429 응답, 아니면 null
 */
export async function rateLimitMiddleware(
  supabase: SupabaseClient,
  req: Request,
  config: RateLimitConfig
): Promise<Response | null> {
  const result = await checkRateLimit(supabase, req, config)

  // Rate Limit 헤더 생성
  const headers = new Headers({
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  })

  if (!result.allowed) {
    // RFC 6585 - 429 Too Many Requests
    headers.set('Retry-After', result.retryAfter.toString())
    headers.set('Content-Type', 'application/problem+json')

    const problem = {
      type: 'https://ideaonaction.ai/errors/rate-limit-exceeded',
      title: 'Rate Limit 초과',
      status: 429,
      detail: `요청 한도를 초과했습니다. ${result.retryAfter}초 후 다시 시도하세요.`,
      instance: new URL(req.url).pathname,
      extensions: {
        limit: result.limit,
        current: result.current,
        remaining: result.remaining,
        reset_at: result.resetAt,
        retry_after: result.retryAfter,
      },
    }

    return new Response(JSON.stringify(problem, null, 2), {
      status: 429,
      headers,
    })
  }

  // Rate Limit 통과 (헤더는 응답에 추가해야 함)
  return null
}

/**
 * Rate Limit 헤더 추가
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', result.resetAt.toString())

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// ============================================================================
// User ID 추출 유틸리티
// ============================================================================

/**
 * JWT에서 User ID 추출 (간단한 파싱, 검증 없음)
 *
 * @param token - JWT 토큰
 * @returns User ID 또는 null
 */
export function extractUserIdFromJWT(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1]))
    return payload.sub || payload.user_id || null
  } catch {
    return null
  }
}

/**
 * User ID 기반 키 생성 함수
 *
 * @param prefix - 키 접두사 (예: 'api', 'webhook')
 * @returns 키 생성 함수
 */
export function createUserIdKeyGenerator(prefix: string) {
  return (req: Request): string => {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header required')
    }

    const token = authHeader.substring(7)
    const userId = extractUserIdFromJWT(token)

    if (!userId) {
      throw new Error('Invalid token: cannot extract user ID')
    }

    return `${prefix}:user:${userId}`
  }
}
