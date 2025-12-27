/**
 * Claude AI Error Handler & Logger
 *
 * Anthropic API 에러 코드 매핑, 구조화된 에러 응답 생성,
 * Supabase 로깅 및 PII 스크러빙 기능을 제공합니다.
 *
 * @features
 * - Anthropic API 에러 코드 매핑 (400, 401, 429, 500 등)
 * - 구조화된 에러 응답 (JSON 형식)
 * - Supabase 로깅 (claude_usage_logs 테이블)
 * - PII 스크러빙 (민감 정보 제거)
 * - 요청 ID 추적
 *
 * @version 1.0.0
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// 상수 정의
// ============================================================================

/** Anthropic API 에러 코드 매핑 */
export const ANTHROPIC_ERROR_CODES = {
  400: {
    code: 'bad_request',
    message: '잘못된 요청입니다.',
    retryable: false,
  },
  401: {
    code: 'authentication_error',
    message: '인증에 실패했습니다.',
    retryable: false,
  },
  403: {
    code: 'permission_denied',
    message: '접근 권한이 없습니다.',
    retryable: false,
  },
  404: {
    code: 'not_found',
    message: '요청한 리소스를 찾을 수 없습니다.',
    retryable: false,
  },
  408: {
    code: 'request_timeout',
    message: '요청 시간이 초과되었습니다.',
    retryable: true,
  },
  429: {
    code: 'rate_limit_exceeded',
    message: 'API 호출 한도를 초과했습니다.',
    retryable: true,
  },
  500: {
    code: 'internal_server_error',
    message: '서버 내부 오류가 발생했습니다.',
    retryable: true,
  },
  502: {
    code: 'bad_gateway',
    message: '게이트웨이 오류가 발생했습니다.',
    retryable: true,
  },
  503: {
    code: 'service_unavailable',
    message: '서비스를 일시적으로 사용할 수 없습니다.',
    retryable: true,
  },
  529: {
    code: 'overloaded',
    message: 'API 서버가 과부하 상태입니다.',
    retryable: true,
  },
} as const

/** PII 스크러빙 패턴 */
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // 이메일
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
  },
  // 전화번호 (한국)
  {
    pattern: /(\+82|0)[\s-]?1[0-9][\s-]?[0-9]{3,4}[\s-]?[0-9]{4}/g,
    replacement: '[PHONE_REDACTED]',
  },
  // 주민등록번호
  {
    pattern: /\d{6}[-\s]?\d{7}/g,
    replacement: '[SSN_REDACTED]',
  },
  // 신용카드 번호
  {
    pattern: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
    replacement: '[CARD_REDACTED]',
  },
  // IP 주소 (민감한 경우)
  {
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    replacement: '[IP_REDACTED]',
  },
  // API 키 패턴
  {
    pattern: /sk-[a-zA-Z0-9]{20,}/g,
    replacement: '[API_KEY_REDACTED]',
  },
  // Bearer 토큰
  {
    pattern: /Bearer\s+[a-zA-Z0-9._-]+/gi,
    replacement: 'Bearer [TOKEN_REDACTED]',
  },
]

// ============================================================================
// 타입 정의
// ============================================================================

/** 에러 응답 구조 */
export interface ClaudeErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    request_id: string
    timestamp: string
    retryable: boolean
  }
  hint?: string
}

/** 로그 레벨 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 사용 로그 레코드 */
export interface UsageLogRecord {
  id?: string
  user_id: string
  request_id: string
  endpoint: string
  method: string
  status_code: number
  success: boolean
  error_code?: string | null
  error_message?: string | null
  input_tokens?: number | null
  output_tokens?: number | null
  total_tokens?: number | null
  model?: string | null
  latency_ms?: number | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string
}

/** Anthropic API 에러 응답 타입 */
export interface AnthropicError {
  type: string
  error?: {
    type: string
    message: string
  }
  message?: string
}

/** 로거 옵션 */
export interface LoggerOptions {
  scrubPII?: boolean
  logLevel?: LogLevel
  includeMetadata?: boolean
}

// ============================================================================
// 에러 클래스
// ============================================================================

/**
 * Claude API 에러 클래스
 */
export class ClaudeAPIError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly retryable: boolean
  public readonly requestId: string
  public readonly details?: Record<string, unknown>

  constructor(
    statusCode: number,
    message: string,
    requestId: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ClaudeAPIError'
    this.statusCode = statusCode
    this.requestId = requestId
    this.details = details

    const errorInfo = ANTHROPIC_ERROR_CODES[statusCode as keyof typeof ANTHROPIC_ERROR_CODES]
    if (errorInfo) {
      this.code = errorInfo.code
      this.retryable = errorInfo.retryable
    } else {
      this.code = 'unknown_error'
      this.retryable = false
    }
  }
}

// ============================================================================
// PII 스크러빙
// ============================================================================

/**
 * 문자열에서 PII (개인식별정보) 제거
 *
 * @param text - 원본 텍스트
 * @returns PII가 마스킹된 텍스트
 */
export function scrubPII(text: string): string {
  if (!text) return text

  let result = text
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/**
 * 객체에서 재귀적으로 PII 제거
 *
 * @param obj - 원본 객체
 * @returns PII가 마스킹된 객체
 */
export function scrubPIIFromObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return scrubPII(obj) as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => scrubPIIFromObject(item)) as T
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // 민감한 필드명 마스킹
      if (['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization'].includes(key.toLowerCase())) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = scrubPIIFromObject(value)
      }
    }
    return result as T
  }

  return obj
}

// ============================================================================
// 에러 응답 생성
// ============================================================================

/**
 * UUID v4 생성
 */
function generateRequestId(): string {
  return crypto.randomUUID()
}

/**
 * Anthropic API 에러를 파싱하여 구조화된 에러 생성
 *
 * @param statusCode - HTTP 상태 코드
 * @param anthropicError - Anthropic API 에러 응답
 * @param requestId - 요청 ID (선택)
 * @returns ClaudeAPIError 인스턴스
 */
export function parseAnthropicError(
  statusCode: number,
  anthropicError: AnthropicError | string | null,
  requestId?: string
): ClaudeAPIError {
  const reqId = requestId || generateRequestId()

  // 문자열 에러인 경우
  if (typeof anthropicError === 'string') {
    const errorInfo = ANTHROPIC_ERROR_CODES[statusCode as keyof typeof ANTHROPIC_ERROR_CODES]
    return new ClaudeAPIError(
      statusCode,
      errorInfo?.message || anthropicError,
      reqId,
      { original_message: anthropicError }
    )
  }

  // Anthropic 에러 객체인 경우
  if (anthropicError && typeof anthropicError === 'object') {
    const errorMessage = anthropicError.error?.message || anthropicError.message || '알 수 없는 오류'
    const errorType = anthropicError.error?.type || anthropicError.type || 'unknown'

    return new ClaudeAPIError(
      statusCode,
      errorMessage,
      reqId,
      {
        type: errorType,
        original_error: anthropicError,
      }
    )
  }

  // 기본 에러
  const errorInfo = ANTHROPIC_ERROR_CODES[statusCode as keyof typeof ANTHROPIC_ERROR_CODES]
  return new ClaudeAPIError(
    statusCode,
    errorInfo?.message || '알 수 없는 오류가 발생했습니다.',
    reqId
  )
}

/**
 * 구조화된 에러 응답 JSON 생성
 *
 * @param error - ClaudeAPIError 인스턴스
 * @param hint - 사용자 힌트 (선택)
 * @param scrubPIIFlag - PII 스크러빙 여부
 * @returns 에러 응답 객체
 */
export function createErrorResponse(
  error: ClaudeAPIError,
  hint?: string,
  scrubPIIFlag = true
): ClaudeErrorResponse {
  const response: ClaudeErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      request_id: error.requestId,
      timestamp: new Date().toISOString(),
      retryable: error.retryable,
    },
  }

  if (error.details) {
    response.error.details = scrubPIIFlag
      ? scrubPIIFromObject(error.details)
      : error.details
  }

  if (hint) {
    response.hint = hint
  }

  return response
}

/**
 * HTTP 에러 응답 생성
 *
 * @param error - ClaudeAPIError 인스턴스
 * @param corsHeaders - CORS 헤더
 * @param hint - 사용자 힌트
 * @returns Response 객체
 */
export function createErrorHttpResponse(
  error: ClaudeAPIError,
  corsHeaders: Record<string, string> = {},
  hint?: string
): Response {
  const errorResponse = createErrorResponse(error, hint)

  return new Response(JSON.stringify(errorResponse), {
    status: error.statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Request-ID': error.requestId,
    },
  })
}

/**
 * 일반 에러로부터 HTTP 응답 생성
 *
 * @param statusCode - HTTP 상태 코드
 * @param message - 에러 메시지
 * @param corsHeaders - CORS 헤더
 * @param hint - 사용자 힌트
 * @returns Response 객체
 */
export function errorResponse(
  statusCode: number,
  message: string,
  corsHeaders: Record<string, string> = {},
  hint?: string
): Response {
  const requestId = generateRequestId()
  const error = new ClaudeAPIError(statusCode, message, requestId)
  return createErrorHttpResponse(error, corsHeaders, hint)
}

// ============================================================================
// 로깅
// ============================================================================

/**
 * Claude API 사용 로거
 */
export class ClaudeUsageLogger {
  private supabase: SupabaseClient
  private options: Required<LoggerOptions>

  constructor(
    supabase: SupabaseClient,
    options: LoggerOptions = {}
  ) {
    this.supabase = supabase
    this.options = {
      scrubPII: options.scrubPII ?? true,
      logLevel: options.logLevel ?? 'info',
      includeMetadata: options.includeMetadata ?? true,
    }
  }

  /**
   * 성공 로그 기록
   */
  async logSuccess(
    userId: string,
    requestId: string,
    req: Request,
    response: {
      inputTokens?: number
      outputTokens?: number
      model?: string
      latencyMs?: number
    },
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const url = new URL(req.url)

    const logRecord: UsageLogRecord = {
      user_id: userId,
      request_id: requestId,
      endpoint: url.pathname,
      method: req.method,
      status_code: 200,
      success: true,
      input_tokens: response.inputTokens,
      output_tokens: response.outputTokens,
      total_tokens: (response.inputTokens || 0) + (response.outputTokens || 0),
      model: response.model,
      latency_ms: response.latencyMs,
      ip_address: this.getClientIP(req),
      user_agent: req.headers.get('user-agent'),
      metadata: this.options.includeMetadata && metadata
        ? (this.options.scrubPII ? scrubPIIFromObject(metadata) : metadata)
        : null,
    }

    await this.insertLog(logRecord)
  }

  /**
   * 에러 로그 기록
   */
  async logError(
    userId: string,
    requestId: string,
    req: Request,
    error: ClaudeAPIError | Error,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const url = new URL(req.url)
    const isClaudeError = error instanceof ClaudeAPIError

    const logRecord: UsageLogRecord = {
      user_id: userId,
      request_id: requestId,
      endpoint: url.pathname,
      method: req.method,
      status_code: isClaudeError ? error.statusCode : 500,
      success: false,
      error_code: isClaudeError ? error.code : 'unknown_error',
      error_message: this.options.scrubPII ? scrubPII(error.message) : error.message,
      ip_address: this.getClientIP(req),
      user_agent: req.headers.get('user-agent'),
      metadata: this.options.includeMetadata && metadata
        ? (this.options.scrubPII ? scrubPIIFromObject(metadata) : metadata)
        : null,
    }

    await this.insertLog(logRecord)
  }

  /**
   * Rate Limit 로그 기록
   */
  async logRateLimit(
    userId: string,
    requestId: string,
    req: Request,
    retryAfterSeconds: number
  ): Promise<void> {
    const url = new URL(req.url)

    const logRecord: UsageLogRecord = {
      user_id: userId,
      request_id: requestId,
      endpoint: url.pathname,
      method: req.method,
      status_code: 429,
      success: false,
      error_code: 'rate_limit_exceeded',
      error_message: 'Rate limit exceeded',
      ip_address: this.getClientIP(req),
      user_agent: req.headers.get('user-agent'),
      metadata: {
        retry_after_seconds: retryAfterSeconds,
      },
    }

    await this.insertLog(logRecord)
  }

  /**
   * DB에 로그 삽입
   */
  private async insertLog(record: UsageLogRecord): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('claude_usage_logs')
        .insert(record)

      if (error) {
        console.error('[ClaudeUsageLogger] Failed to insert log:', error)
      }
    } catch (err) {
      console.error('[ClaudeUsageLogger] Exception while logging:', err)
    }
  }

  /**
   * 클라이언트 IP 추출
   */
  private getClientIP(req: Request): string | null {
    const forwarded = req.headers.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    const realIP = req.headers.get('x-real-ip')
    if (realIP) {
      return realIP
    }
    return null
  }

  /**
   * 콘솔 로그 출력 (개발용)
   */
  log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }

    if (levels[level] < levels[this.options.logLevel]) {
      return
    }

    const timestamp = new Date().toISOString()
    const logData = this.options.scrubPII && data ? scrubPIIFromObject(data) : data

    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`

    switch (level) {
      case 'debug':
        console.debug(logMessage, logData)
        break
      case 'info':
        console.info(logMessage, logData)
        break
      case 'warn':
        console.warn(logMessage, logData)
        break
      case 'error':
        console.error(logMessage, logData)
        break
    }
  }
}

// ============================================================================
// 에러 핸들링 미들웨어
// ============================================================================

/**
 * 전역 에러 핸들러
 *
 * @param handler - 실제 요청 핸들러 함수
 * @param supabase - Supabase 클라이언트
 * @param userId - 사용자 ID
 * @param corsHeaders - CORS 헤더
 * @returns 래핑된 핸들러
 */
export function withErrorHandler(
  handler: () => Promise<Response>,
  supabase: SupabaseClient,
  userId: string,
  corsHeaders: Record<string, string> = {}
): Promise<Response> {
  return handler().catch(async (error: Error) => {
    const requestId = generateRequestId()
    const logger = new ClaudeUsageLogger(supabase)

    // ClaudeAPIError인 경우
    if (error instanceof ClaudeAPIError) {
      await logger.logError(
        userId,
        error.requestId,
        new Request('http://localhost'), // 더미 Request
        error
      )
      return createErrorHttpResponse(error, corsHeaders)
    }

    // 일반 에러인 경우
    const claudeError = new ClaudeAPIError(
      500,
      '서버 내부 오류가 발생했습니다.',
      requestId,
      { original_message: error.message }
    )

    await logger.logError(
      userId,
      requestId,
      new Request('http://localhost'),
      claudeError,
      { stack: error.stack }
    )

    return createErrorHttpResponse(
      claudeError,
      corsHeaders,
      '잠시 후 다시 시도해주세요.'
    )
  })
}

/**
 * Anthropic API 응답 에러 처리
 *
 * @param response - Anthropic API 응답
 * @param requestId - 요청 ID
 * @returns 성공 시 null, 실패 시 ClaudeAPIError
 */
export async function handleAnthropicResponse(
  response: Response,
  requestId?: string
): Promise<ClaudeAPIError | null> {
  if (response.ok) {
    return null
  }

  let errorBody: AnthropicError | null = null
  try {
    errorBody = await response.json()
  } catch {
    // JSON 파싱 실패 시 null 유지
  }

  return parseAnthropicError(response.status, errorBody, requestId)
}

// ============================================================================
// 유틸리티 익스포트
// ============================================================================

export { generateRequestId }
