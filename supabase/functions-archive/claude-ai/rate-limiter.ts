/**
 * Claude AI Rate Limiter
 *
 * Token Bucket 알고리즘을 사용한 사용자별 API 호출 제한 미들웨어
 *
 * @features
 * - Token Bucket 알고리즘 (분당 10회 기본 제한)
 * - 사용자별 개별 제한 (user_id 기반)
 * - Supabase DB에 상태 저장 (claude_rate_limits 테이블)
 * - 429 Too Many Requests 응답
 * - Rate Limit 헤더 포함 (X-RateLimit-*)
 *
 * @version 1.0.0
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// 상수 정의
// ============================================================================

/** 기본 버킷 설정 */
export const DEFAULT_RATE_LIMIT_CONFIG = {
  /** 분당 최대 요청 수 */
  MAX_REQUESTS_PER_MINUTE: 10,
  /** 토큰 리필 간격 (밀리초) - 6초마다 1개 토큰 */
  REFILL_INTERVAL_MS: 6000,
  /** 버킷 최대 용량 */
  BUCKET_CAPACITY: 10,
  /** 토큰 리필량 (간격당) */
  REFILL_AMOUNT: 1,
} as const

/** 관리자 설정 (더 높은 제한) */
export const ADMIN_RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 60,
  REFILL_INTERVAL_MS: 1000,
  BUCKET_CAPACITY: 60,
  REFILL_AMOUNT: 1,
} as const

// ============================================================================
// 타입 정의
// ============================================================================

/** Rate Limit 설정 타입 */
export interface RateLimitConfig {
  MAX_REQUESTS_PER_MINUTE: number
  REFILL_INTERVAL_MS: number
  BUCKET_CAPACITY: number
  REFILL_AMOUNT: number
}

/** Rate Limit DB 레코드 */
export interface RateLimitRecord {
  id: string
  user_id: string
  tokens_remaining: number
  bucket_capacity: number
  last_refill_at: string
  created_at: string
  updated_at: string
}

/** Rate Limit 체크 결과 */
export interface RateLimitResult {
  allowed: boolean
  tokensRemaining: number
  bucketCapacity: number
  retryAfterSeconds?: number
  resetAt?: string
}

/** Rate Limit 응답 헤더 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
  'Retry-After'?: string
}

/** Rate Limiter 에러 */
export class RateLimitError extends Error {
  public readonly statusCode = 429
  public readonly retryAfterSeconds: number
  public readonly headers: RateLimitHeaders

  constructor(
    message: string,
    retryAfterSeconds: number,
    headers: RateLimitHeaders
  ) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
    this.headers = headers
  }
}

// ============================================================================
// Rate Limiter 클래스
// ============================================================================

/**
 * Token Bucket 알고리즘 기반 Rate Limiter
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter(supabase)
 * const result = await limiter.checkLimit(userId)
 * if (!result.allowed) {
 *   throw new RateLimitError('Rate limit exceeded', result.retryAfterSeconds!)
 * }
 * ```
 */
export class RateLimiter {
  private supabase: SupabaseClient
  private config: RateLimitConfig

  constructor(
    supabase: SupabaseClient,
    config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
  ) {
    this.supabase = supabase
    this.config = config
  }

  /**
   * Rate Limit 체크 및 토큰 소비
   *
   * @param userId - 사용자 ID
   * @param tokensToConsume - 소비할 토큰 수 (기본값: 1)
   * @returns Rate Limit 체크 결과
   */
  async checkLimit(userId: string, tokensToConsume = 1): Promise<RateLimitResult> {
    const now = new Date()

    // 1. 기존 레코드 조회 또는 생성
    let record = await this.getOrCreateRecord(userId, now)

    // 2. 토큰 리필 계산
    record = this.refillTokens(record, now)

    // 3. 토큰 소비 가능 여부 확인
    if (record.tokens_remaining < tokensToConsume) {
      const retryAfterSeconds = this.calculateRetryAfter(record, tokensToConsume)
      const resetAt = new Date(now.getTime() + retryAfterSeconds * 1000)

      return {
        allowed: false,
        tokensRemaining: record.tokens_remaining,
        bucketCapacity: record.bucket_capacity,
        retryAfterSeconds,
        resetAt: resetAt.toISOString(),
      }
    }

    // 4. 토큰 소비 및 DB 업데이트
    record.tokens_remaining -= tokensToConsume
    await this.updateRecord(record, now)

    return {
      allowed: true,
      tokensRemaining: record.tokens_remaining,
      bucketCapacity: record.bucket_capacity,
    }
  }

  /**
   * Rate Limit 응답 헤더 생성
   */
  createHeaders(result: RateLimitResult): RateLimitHeaders {
    const resetTime = result.resetAt
      ? Math.ceil(new Date(result.resetAt).getTime() / 1000).toString()
      : Math.ceil((Date.now() + 60000) / 1000).toString()

    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': result.bucketCapacity.toString(),
      'X-RateLimit-Remaining': Math.max(0, result.tokensRemaining).toString(),
      'X-RateLimit-Reset': resetTime,
    }

    if (result.retryAfterSeconds) {
      headers['Retry-After'] = result.retryAfterSeconds.toString()
    }

    return headers
  }

  /**
   * 429 Too Many Requests 응답 생성
   */
  createLimitExceededResponse(result: RateLimitResult, corsHeaders: Record<string, string> = {}): Response {
    const headers = this.createHeaders(result)

    return new Response(
      JSON.stringify({
        error: {
          code: 'rate_limit_exceeded',
          message: 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          details: {
            limit: result.bucketCapacity,
            remaining: result.tokensRemaining,
            retry_after_seconds: result.retryAfterSeconds,
            reset_at: result.resetAt,
          },
          timestamp: new Date().toISOString(),
        },
        hint: `다음 요청까지 ${result.retryAfterSeconds}초 대기가 필요합니다.`,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          ...headers,
          'Content-Type': 'application/json',
        },
      }
    )
  }

  /**
   * 사용자의 현재 Rate Limit 상태 조회 (토큰 소비 없음)
   */
  async getStatus(userId: string): Promise<RateLimitResult> {
    const now = new Date()
    let record = await this.getOrCreateRecord(userId, now)
    record = this.refillTokens(record, now)

    return {
      allowed: record.tokens_remaining > 0,
      tokensRemaining: record.tokens_remaining,
      bucketCapacity: record.bucket_capacity,
    }
  }

  /**
   * 특정 사용자의 Rate Limit 리셋
   */
  async resetLimit(userId: string): Promise<void> {
    const now = new Date().toISOString()

    await this.supabase
      .from('claude_rate_limits')
      .upsert({
        user_id: userId,
        tokens_remaining: this.config.BUCKET_CAPACITY,
        bucket_capacity: this.config.BUCKET_CAPACITY,
        last_refill_at: now,
        updated_at: now,
      }, {
        onConflict: 'user_id',
      })
  }

  // ============================================================================
  // Private 메서드
  // ============================================================================

  /**
   * DB에서 레코드 조회 또는 새로 생성
   */
  private async getOrCreateRecord(userId: string, now: Date): Promise<RateLimitRecord> {
    const { data: existing, error } = await this.supabase
      .from('claude_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existing && !error) {
      return existing as RateLimitRecord
    }

    // 새 레코드 생성
    const newRecord: Omit<RateLimitRecord, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      tokens_remaining: this.config.BUCKET_CAPACITY,
      bucket_capacity: this.config.BUCKET_CAPACITY,
      last_refill_at: now.toISOString(),
    }

    const { data: inserted, error: insertError } = await this.supabase
      .from('claude_rate_limits')
      .insert(newRecord)
      .select()
      .single()

    if (insertError) {
      // 동시성 문제로 이미 생성된 경우 다시 조회
      const { data: retry } = await this.supabase
        .from('claude_rate_limits')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (retry) {
        return retry as RateLimitRecord
      }

      throw new Error(`Rate limit record creation failed: ${insertError.message}`)
    }

    return inserted as RateLimitRecord
  }

  /**
   * Token Bucket 리필 로직
   */
  private refillTokens(record: RateLimitRecord, now: Date): RateLimitRecord {
    const lastRefill = new Date(record.last_refill_at).getTime()
    const elapsed = now.getTime() - lastRefill

    // 리필 간격에 따른 추가 토큰 계산
    const intervalsElapsed = Math.floor(elapsed / this.config.REFILL_INTERVAL_MS)
    const tokensToAdd = intervalsElapsed * this.config.REFILL_AMOUNT

    if (tokensToAdd > 0) {
      record.tokens_remaining = Math.min(
        record.bucket_capacity,
        record.tokens_remaining + tokensToAdd
      )
      record.last_refill_at = new Date(lastRefill + intervalsElapsed * this.config.REFILL_INTERVAL_MS).toISOString()
    }

    return record
  }

  /**
   * 레코드 업데이트
   */
  private async updateRecord(record: RateLimitRecord, now: Date): Promise<void> {
    const { error } = await this.supabase
      .from('claude_rate_limits')
      .update({
        tokens_remaining: record.tokens_remaining,
        last_refill_at: record.last_refill_at,
        updated_at: now.toISOString(),
      })
      .eq('user_id', record.user_id)

    if (error) {
      console.error('Failed to update rate limit record:', error)
    }
  }

  /**
   * 재시도까지 대기 시간 계산
   */
  private calculateRetryAfter(record: RateLimitRecord, tokensNeeded: number): number {
    const tokensShort = tokensNeeded - record.tokens_remaining
    const intervalsNeeded = Math.ceil(tokensShort / this.config.REFILL_AMOUNT)
    return Math.ceil((intervalsNeeded * this.config.REFILL_INTERVAL_MS) / 1000)
  }
}

// ============================================================================
// 미들웨어 함수
// ============================================================================

/**
 * Rate Limit 미들웨어
 *
 * @param supabase - Supabase 클라이언트
 * @param userId - 사용자 ID
 * @param config - Rate Limit 설정 (선택)
 * @param corsHeaders - CORS 헤더 (선택)
 * @returns 제한 초과시 Response 객체, 아니면 null 및 헤더
 *
 * @example
 * ```ts
 * const { response, headers } = await rateLimitMiddleware(supabase, userId)
 * if (response) {
 *   return response // 429 Too Many Requests
 * }
 * // headers를 응답에 포함
 * ```
 */
export async function rateLimitMiddleware(
  supabase: SupabaseClient,
  userId: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG,
  corsHeaders: Record<string, string> = {}
): Promise<{
  response: Response | null
  headers: RateLimitHeaders
  result: RateLimitResult
}> {
  const limiter = new RateLimiter(supabase, config)
  const result = await limiter.checkLimit(userId)
  const headers = limiter.createHeaders(result)

  if (!result.allowed) {
    return {
      response: limiter.createLimitExceededResponse(result, corsHeaders),
      headers,
      result,
    }
  }

  return {
    response: null,
    headers,
    result,
  }
}

/**
 * 관리자용 Rate Limit 미들웨어 (더 높은 제한)
 */
export async function adminRateLimitMiddleware(
  supabase: SupabaseClient,
  userId: string,
  corsHeaders: Record<string, string> = {}
): Promise<{
  response: Response | null
  headers: RateLimitHeaders
  result: RateLimitResult
}> {
  return rateLimitMiddleware(supabase, userId, ADMIN_RATE_LIMIT_CONFIG, corsHeaders)
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 사용자 ID 추출 (JWT 또는 헤더에서)
 */
export function extractUserId(req: Request, authPayload?: { sub?: string }): string {
  // 1. JWT payload에서 추출
  if (authPayload?.sub) {
    return authPayload.sub
  }

  // 2. 커스텀 헤더에서 추출
  const headerUserId = req.headers.get('x-user-id')
  if (headerUserId) {
    return headerUserId
  }

  // 3. IP 기반 폴백 (익명 사용자)
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return `anon:${ip}`
}

/**
 * Rate Limit 상태 로깅
 */
export function logRateLimitEvent(
  userId: string,
  result: RateLimitResult,
  endpoint: string
): void {
  const status = result.allowed ? 'allowed' : 'exceeded'
  console.log(
    `[RateLimit] ${status} | user=${userId} | remaining=${result.tokensRemaining}/${result.bucketCapacity} | endpoint=${endpoint}`
  )
}
