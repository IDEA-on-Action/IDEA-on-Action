/**
 * Claude AI Edge Function
 *
 * Claude API를 사용한 AI 채팅 및 이미지 분석 기능을 제공합니다.
 * - JWT 토큰 검증 (MCP Auth 패턴 기반)
 * - Claude API 호출 (fetch 기반)
 * - SSE 스트리밍 응답 지원
 * - Rate Limiting
 * - 에러 핸들링
 *
 * @endpoint POST /functions/v1/claude-ai/chat - 채팅 요청
 * @endpoint POST /functions/v1/claude-ai/chat/stream - 스트리밍 채팅 요청
 * @endpoint POST /functions/v1/claude-ai/vision - 이미지 분석 요청
 * @endpoint POST /functions/v1/claude-ai/vision/stream - 스트리밍 이미지 분석 요청
 *
 * @headers
 *   Authorization: Bearer <ACCESS_TOKEN>
 *   Content-Type: application/json
 *
 * @version 1.1.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// 모듈 임포트
import {
  RateLimiter,
  DEFAULT_RATE_LIMIT_CONFIG,
  extractUserId,
  logRateLimitEvent,
  type RateLimitResult,
} from './rate-limiter.ts'

import {
  ClaudeUsageLogger,
  ClaudeAPIError,
  parseAnthropicError,
  createErrorHttpResponse,
  handleAnthropicResponse,
  scrubPII,
} from './error-handler.ts'

import {
  handleVision,
  handleVisionStream,
} from './vision-handler.ts'

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * CORS 헤더
 */
// CORS 헤더는 getCorsHeaders()로 동적 생성 (삭제됨)

/**
 * Claude API 설정
 */
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_API_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TEMPERATURE = 0.7

/**
 * Rate Limiting 설정
 * DB 기반 Rate Limiting은 rate-limiter.ts 모듈 사용
 * 아래 설정은 fallback 또는 캐시용
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1분
const RATE_LIMIT_MAX_REQUESTS = 20 // 분당 최대 요청 수

/**
 * JWT 발급자 정보 (MCP Auth와 동일)
 */
const JWT_ISSUER = 'mcp-auth'
const JWT_AUDIENCE = 'central-hub'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 메시지 역할
 */
type MessageRole = 'user' | 'assistant'

/**
 * 채팅 메시지
 */
interface ChatMessage {
  role: MessageRole
  content: string
}

/**
 * 채팅 요청
 */
interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  max_tokens?: number
  temperature?: number
  system?: string
  stream?: boolean
}

/**
 * 채팅 응답
 */
interface ChatResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: Array<{
    type: 'text'
    text: string
  }>
  model: string
  stop_reason: string | null
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * API 응답
 */
interface ApiResponse {
  success: boolean
  data?: {
    id: string
    content: string
    model: string
    usage: {
      input_tokens: number
      output_tokens: number
      total_tokens: number
    }
    stop_reason: string | null
  }
  error?: {
    code: string
    message: string
    request_id: string
    timestamp: string
  }
}

/**
 * JWT 페이로드
 */
interface JWTPayload {
  iss: string
  sub: string
  aud: string
  iat: number
  exp: number
  jti: string
  scope?: string[]
  client_id?: string
  user_id?: string
}

/**
 * Rate Limit 정보
 */
interface RateLimitInfo {
  requests: number
  window_start: number
}

// ============================================================================
// Rate Limiting 저장소 (In-Memory)
// 프로덕션에서는 Redis 또는 Supabase 테이블 사용 권장
// ============================================================================

const rateLimitStore = new Map<string, RateLimitInfo>()

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * UUID 생성
 */
function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Bearer 토큰 추출
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * JWT 페이로드 디코딩 (검증 없이)
 */
function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payloadBase64 = parts[1]
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(payloadJson) as JWTPayload
  } catch {
    return null
  }
}

/**
 * JWT 토큰 검증
 */
async function verifyJWT(
  token: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ valid: boolean; payload?: JWTPayload; userId?: string; error?: string }> {
  try {
    // JWT 구조 검증
    const payload = decodeJWTPayload(token)
    if (!payload) {
      return { valid: false, error: 'invalid_token_format' }
    }

    // 만료 시간 확인
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'token_expired' }
    }

    // 발급자 확인
    if (payload.iss !== JWT_ISSUER) {
      return { valid: false, error: 'invalid_issuer' }
    }

    // 대상 확인
    if (payload.aud !== JWT_AUDIENCE) {
      return { valid: false, error: 'invalid_audience' }
    }

    // user_id 추출 (사용자 인증의 경우)
    const userId = payload.user_id || payload.sub

    return {
      valid: true,
      payload,
      userId,
    }
  } catch (error) {
    console.error('Token verification error:', error)
    return { valid: false, error: 'token_verification_failed' }
  }
}

/**
 * Supabase Auth 토큰 검증 (일반 사용자)
 */
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

/**
 * Rate Limiting 체크
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const info = rateLimitStore.get(userId)

  // 새 윈도우 시작 또는 윈도우 만료
  if (!info || now - info.window_start >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { requests: 1, window_start: now })
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    }
  }

  // 기존 윈도우 내 요청 수 체크
  if (info.requests >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: info.window_start + RATE_LIMIT_WINDOW_MS,
    }
  }

  // 요청 카운트 증가
  info.requests++
  rateLimitStore.set(userId, info)

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - info.requests,
    resetAt: info.window_start + RATE_LIMIT_WINDOW_MS,
  }
}

/**
 * 에러 응답 생성
 */
function errorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string,
  headers?: Record<string, string>
): Response {
  const response: ApiResponse = {
    success: false,
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

/**
 * 성공 응답 생성
 */
function successResponse(data: ApiResponse['data'], requestId: string): Response {
  const response: ApiResponse = {
    success: true,
    data,
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Claude API 호출 (비스트리밍)
 */
async function callClaudeAPI(
  messages: ChatMessage[],
  options: {
    model?: string
    max_tokens?: number
    temperature?: number
    system?: string
  }
): Promise<ChatResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.')
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_API_VERSION,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: options.temperature || DEFAULT_TEMPERATURE,
      system: options.system,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Claude API error:', response.status, errorBody)
    throw new Error(`Claude API 오류: ${response.status}`)
  }

  return await response.json() as ChatResponse
}

/**
 * Claude API 스트리밍 호출
 */
async function* callClaudeAPIStream(
  messages: ChatMessage[],
  options: {
    model?: string
    max_tokens?: number
    temperature?: number
    system?: string
  }
): AsyncGenerator<string, void, unknown> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.')
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_API_VERSION,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: options.temperature || DEFAULT_TEMPERATURE,
      system: options.system,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Claude API streaming error:', response.status, errorBody)
    throw new Error(`Claude API 스트리밍 오류: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('응답 스트림을 읽을 수 없습니다.')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE 형식 파싱 (event: ... \n data: ... \n\n)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)

            // content_block_delta 이벤트에서 텍스트 추출
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text
            }

            // message_stop 이벤트
            if (parsed.type === 'message_stop') {
              return
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ============================================================================
// 핸들러 함수
// ============================================================================

/**
 * POST /claude-ai/chat - 채팅 요청 (비스트리밍)
 */
async function handleChat(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // 인증 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'))
  if (!token) {
    return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, requestId)
  }

  // 먼저 Supabase Auth 토큰 검증 시도
  let userId: string | undefined
  const supabaseAuthResult = await verifySupabaseAuth(token, supabase)

  if (supabaseAuthResult.valid) {
    userId = supabaseAuthResult.userId
  } else {
    // MCP JWT 토큰 검증 시도
    const jwtResult = await verifyJWT(token, supabase)
    if (!jwtResult.valid) {
      return errorResponse(
        jwtResult.error || 'invalid_token',
        '유효하지 않은 토큰입니다.',
        401,
        requestId
      )
    }
    userId = jwtResult.userId
  }

  if (!userId) {
    return errorResponse('unauthorized', '사용자 인증에 실패했습니다.', 401, requestId)
  }

  // Rate Limiting 체크 (DB 기반)
  const rateLimiter = new RateLimiter(supabase)
  const logger = new ClaudeUsageLogger(supabase)
  const dbRateLimitResult = await rateLimiter.checkLimit(userId)
  logRateLimitEvent(userId, dbRateLimitResult, '/claude-ai/chat')

  if (!dbRateLimitResult.allowed) {
    // Rate Limit 로깅
    await logger.logRateLimit(userId, requestId, req, dbRateLimitResult.retryAfterSeconds || 60)
    return rateLimiter.createLimitExceededResponse(dbRateLimitResult, corsHeaders)
  }

  // 요청 본문 파싱
  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 페이로드입니다.', 400, requestId)
  }

  // 필수 필드 검증
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return errorResponse('missing_field', 'messages 필드가 필요합니다.', 400, requestId)
  }

  // 메시지 형식 검증
  for (const msg of body.messages) {
    if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
      return errorResponse('invalid_message', '메시지 role은 user 또는 assistant이어야 합니다.', 400, requestId)
    }
    if (!msg.content || typeof msg.content !== 'string') {
      return errorResponse('invalid_message', '메시지 content는 문자열이어야 합니다.', 400, requestId)
    }
  }

  const startTime = Date.now()

  try {
    // Claude API 호출
    const response = await callClaudeAPI(body.messages, {
      model: body.model,
      max_tokens: body.max_tokens,
      temperature: body.temperature,
      system: body.system,
    })

    // 응답 변환
    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    const latencyMs = Date.now() - startTime

    // DB 로깅
    await logger.logSuccess(userId, requestId, req, {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
      latencyMs,
    })

    console.log(`Claude API usage - user: ${userId}, input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}, latency: ${latencyMs}ms`)

    return successResponse(
      {
        id: response.id,
        content,
        model: response.model,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        stop_reason: response.stop_reason,
      },
      requestId
    )
  } catch (error) {
    console.error('Chat error:', error)

    // 에러 로깅
    const claudeError = error instanceof ClaudeAPIError
      ? error
      : new ClaudeAPIError(500, error instanceof Error ? error.message : 'Unknown error', requestId)

    await logger.logError(userId, requestId, req, claudeError)

    return errorResponse(
      'api_error',
      error instanceof Error ? error.message : 'AI 응답 생성 중 오류가 발생했습니다.',
      500,
      requestId
    )
  }
}

/**
 * POST /claude-ai/chat/stream - 스트리밍 채팅 요청
 */
async function handleChatStream(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // 인증 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'))
  if (!token) {
    return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, requestId)
  }

  // 먼저 Supabase Auth 토큰 검증 시도
  let userId: string | undefined
  const supabaseAuthResult = await verifySupabaseAuth(token, supabase)

  if (supabaseAuthResult.valid) {
    userId = supabaseAuthResult.userId
  } else {
    // MCP JWT 토큰 검증 시도
    const jwtResult = await verifyJWT(token, supabase)
    if (!jwtResult.valid) {
      return errorResponse(
        jwtResult.error || 'invalid_token',
        '유효하지 않은 토큰입니다.',
        401,
        requestId
      )
    }
    userId = jwtResult.userId
  }

  if (!userId) {
    return errorResponse('unauthorized', '사용자 인증에 실패했습니다.', 401, requestId)
  }

  // Rate Limiting 체크 (DB 기반)
  const rateLimiter = new RateLimiter(supabase)
  const logger = new ClaudeUsageLogger(supabase)
  const dbRateLimitResult = await rateLimiter.checkLimit(userId)
  logRateLimitEvent(userId, dbRateLimitResult, '/claude-ai/chat/stream')

  if (!dbRateLimitResult.allowed) {
    // Rate Limit 로깅
    await logger.logRateLimit(userId, requestId, req, dbRateLimitResult.retryAfterSeconds || 60)
    return rateLimiter.createLimitExceededResponse(dbRateLimitResult, corsHeaders)
  }

  // 요청 본문 파싱
  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 페이로드입니다.', 400, requestId)
  }

  // 필수 필드 검증
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return errorResponse('missing_field', 'messages 필드가 필요합니다.', 400, requestId)
  }

  // 메시지 형식 검증
  for (const msg of body.messages) {
    if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
      return errorResponse('invalid_message', '메시지 role은 user 또는 assistant이어야 합니다.', 400, requestId)
    }
    if (!msg.content || typeof msg.content !== 'string') {
      return errorResponse('invalid_message', '메시지 content는 문자열이어야 합니다.', 400, requestId)
    }
  }

  const startTime = Date.now()

  try {
    // ReadableStream 생성
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          // 스트리밍 시작 이벤트
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', request_id: requestId })}\n\n`))

          // Claude API 스트리밍 호출
          for await (const chunk of callClaudeAPIStream(body.messages, {
            model: body.model,
            max_tokens: body.max_tokens,
            temperature: body.temperature,
            system: body.system,
          })) {
            // 텍스트 청크 전송
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`))
          }

          const latencyMs = Date.now() - startTime

          // 성공 로깅 (스트리밍에서는 토큰 수를 정확히 알기 어려움)
          await logger.logSuccess(userId, requestId, req, {
            model: body.model || DEFAULT_MODEL,
            latencyMs,
          })

          // 스트리밍 완료 이벤트
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        } catch (error) {
          // 에러 로깅
          const claudeError = error instanceof ClaudeAPIError
            ? error
            : new ClaudeAPIError(500, error instanceof Error ? error.message : 'Unknown error', requestId)

          await logger.logError(userId, requestId, req, claudeError)

          // 에러 이벤트
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: scrubPII(error instanceof Error ? error.message : 'Unknown error')
          })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-Id': requestId,
      },
    })
  } catch (error) {
    console.error('Stream error:', error)

    // 에러 로깅
    const claudeError = error instanceof ClaudeAPIError
      ? error
      : new ClaudeAPIError(500, error instanceof Error ? error.message : 'Unknown error', requestId)

    await logger.logError(userId, requestId, req, claudeError)

    return errorResponse(
      'api_error',
      error instanceof Error ? error.message : 'AI 스트리밍 응답 중 오류가 발생했습니다.',
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

  // POST만 허용
  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', '허용되지 않는 메서드입니다.', 405, generateUUID())
  }

  // 요청 ID 생성
  const requestId = req.headers.get('x-request-id') || generateUUID()

  // URL 파싱
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)

  // 엔드포인트 결정
  // /functions/v1/claude-ai/chat 또는 /functions/v1/claude-ai/chat/stream
  const lastPart = pathParts[pathParts.length - 1]
  const secondLastPart = pathParts[pathParts.length - 2]

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return errorResponse('server_error', '서버 설정 오류입니다.', 500, requestId)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 라우팅
  try {
    // POST /chat/stream - 스트리밍 채팅
    if (lastPart === 'stream' && secondLastPart === 'chat') {
      return await handleChatStream(req, supabase, requestId)
    }

    // POST /chat - 비스트리밍 채팅
    if (lastPart === 'chat' || lastPart === 'claude-ai') {
      return await handleChat(req, supabase, requestId)
    }

    // POST /vision/stream - 스트리밍 이미지 분석
    if (lastPart === 'stream' && secondLastPart === 'vision') {
      // 인증 확인 (Vision 핸들러로 전달 전에)
      const visionToken = extractBearerToken(req.headers.get('authorization'))
      if (!visionToken) {
        return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, requestId)
      }

      // 사용자 ID 추출
      let visionUserId: string | undefined
      const visionSupabaseAuth = await verifySupabaseAuth(visionToken, supabase)
      if (visionSupabaseAuth.valid) {
        visionUserId = visionSupabaseAuth.userId
      } else {
        const visionJwt = await verifyJWT(visionToken, supabase)
        if (!visionJwt.valid) {
          return errorResponse(visionJwt.error || 'invalid_token', '유효하지 않은 토큰입니다.', 401, requestId)
        }
        visionUserId = visionJwt.userId
      }

      if (!visionUserId) {
        return errorResponse('unauthorized', '사용자 인증에 실패했습니다.', 401, requestId)
      }

      return await handleVisionStream(req, supabase, visionUserId, requestId, corsHeaders)
    }

    // POST /vision - 비스트리밍 이미지 분석
    if (lastPart === 'vision') {
      // 인증 확인 (Vision 핸들러로 전달 전에)
      const visionToken = extractBearerToken(req.headers.get('authorization'))
      if (!visionToken) {
        return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, requestId)
      }

      // 사용자 ID 추출
      let visionUserId: string | undefined
      const visionSupabaseAuth = await verifySupabaseAuth(visionToken, supabase)
      if (visionSupabaseAuth.valid) {
        visionUserId = visionSupabaseAuth.userId
      } else {
        const visionJwt = await verifyJWT(visionToken, supabase)
        if (!visionJwt.valid) {
          return errorResponse(visionJwt.error || 'invalid_token', '유효하지 않은 토큰입니다.', 401, requestId)
        }
        visionUserId = visionJwt.userId
      }

      if (!visionUserId) {
        return errorResponse('unauthorized', '사용자 인증에 실패했습니다.', 401, requestId)
      }

      return await handleVision(req, supabase, visionUserId, requestId, corsHeaders)
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
