/**
 * Webhook Send Edge Function
 *
 * 웹훅 전송 - HMAC-SHA256 서명과 함께 타겟 URL로 이벤트 전송
 *
 * @endpoint POST /webhooks/send - 웹훅 전송
 *
 * @headers
 *   Authorization: Bearer <SERVICE_ROLE_KEY>
 *   Content-Type: application/json
 *
 * @security 내부 전용 (service_role 키 필요)
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 재시도 설정
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000 // 1초

// 타임아웃 설정
const REQUEST_TIMEOUT_MS = 10000 // 10초

// ============================================================================
// 타입 정의
// ============================================================================

interface WebhookRequest {
  event_type: string
  payload: Record<string, any>
  target_urls: string[]
  webhook_secret?: string // 선택 (없으면 기본 시크릿 사용)
}

interface WebhookResponse {
  success: boolean
  sent_count: number
  failed_count: number
  results: WebhookResult[]
}

interface WebhookResult {
  target_url: string
  success: boolean
  status_code?: number
  error?: string
  retry_count: number
}

interface ErrorResponse {
  error: {
    code: string
    message: string
    request_id: string
    timestamp: string
  }
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * HMAC-SHA256 서명 생성
 */
async function generateSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  )

  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return `sha256=${signature}`
}

/**
 * 웹훅 전송 (재시도 포함)
 */
async function sendWebhook(
  targetUrl: string,
  eventType: string,
  payload: Record<string, any>,
  signature: string,
  requestId: string
): Promise<WebhookResult> {
  let lastError: string | undefined
  let statusCode: number | undefined

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-Event-Type': eventType,
          'X-Request-Id': requestId,
          'User-Agent': 'IdeaOnAction-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      statusCode = response.status

      // 2xx 응답은 성공
      if (response.ok) {
        return {
          target_url: targetUrl,
          success: true,
          status_code: statusCode,
          retry_count: attempt,
        }
      }

      // 4xx 에러는 재시도하지 않음
      if (response.status >= 400 && response.status < 500) {
        lastError = `HTTP ${response.status}: ${await response.text()}`
        break
      }

      // 5xx 에러는 재시도
      lastError = `HTTP ${response.status}: Server error`

      // 재시도 전 대기
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'

      // AbortError (타임아웃)는 재시도
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = 'Request timeout'
      }

      // 재시도 전 대기
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
      }
    }
  }

  // 모든 재시도 실패
  return {
    target_url: targetUrl,
    success: false,
    status_code: statusCode,
    error: lastError,
    retry_count: MAX_RETRY_ATTEMPTS,
  }
}

/**
 * Dead Letter Queue에 실패한 웹훅 기록
 */
async function recordDeadLetter(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  payload: Record<string, any>,
  targetUrl: string,
  error: string,
  requestId: string
): Promise<void> {
  try {
    const { error: insertError } = await supabase
      .from('dead_letter_queue')
      .insert({
        event_type: eventType,
        payload,
        target_url: targetUrl,
        error_message: error,
        retry_count: MAX_RETRY_ATTEMPTS,
        request_id: requestId,
      })

    if (insertError) {
      console.error('Dead letter queue insert error:', insertError)
    }
  } catch (error) {
    console.error('Failed to record dead letter:', error)
  }
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function successResponse<T>(data: T, requestId: string): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
  })
}

// ============================================================================
// 핸들러 함수
// ============================================================================

/**
 * POST /webhooks/send - 웹훅 전송
 */
async function handleWebhookSend(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    // 요청 본문 파싱
    let body: WebhookRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse('invalid_payload', '유효하지 않은 JSON 페이로드입니다.', 400, requestId)
    }

    // 필수 필드 검증
    if (!body.event_type) {
      return errorResponse('missing_field', 'event_type 필드가 필요합니다.', 400, requestId)
    }

    if (!body.payload || typeof body.payload !== 'object') {
      return errorResponse('invalid_field', 'payload는 객체여야 합니다.', 400, requestId)
    }

    if (!body.target_urls || !Array.isArray(body.target_urls) || body.target_urls.length === 0) {
      return errorResponse('invalid_field', 'target_urls는 비어있지 않은 배열이어야 합니다.', 400, requestId)
    }

    // URL 유효성 검증
    for (const url of body.target_urls) {
      try {
        new URL(url)
      } catch {
        return errorResponse('invalid_url', `유효하지 않은 URL: ${url}`, 400, requestId)
      }
    }

    // 웹훅 시크릿 가져오기
    const webhookSecret = body.webhook_secret || Deno.env.get('WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('Missing webhook secret')
      return errorResponse('configuration_error', '웹훅 시크릿이 설정되지 않았습니다.', 500, requestId)
    }

    // 페이로드 JSON 문자열화
    const payloadString = JSON.stringify(body.payload)

    // HMAC-SHA256 서명 생성
    const signature = await generateSignature(payloadString, webhookSecret)

    // 각 타겟 URL로 웹훅 전송
    const results: WebhookResult[] = []
    let sentCount = 0
    let failedCount = 0

    for (const targetUrl of body.target_urls) {
      const result = await sendWebhook(
        targetUrl,
        body.event_type,
        body.payload,
        signature,
        requestId
      )

      results.push(result)

      if (result.success) {
        sentCount++
        console.log(`Webhook sent successfully to ${targetUrl}`)
      } else {
        failedCount++
        console.error(`Webhook failed to ${targetUrl}: ${result.error}`)

        // Dead Letter Queue에 기록
        await recordDeadLetter(
          supabase,
          body.event_type,
          body.payload,
          targetUrl,
          result.error || 'Unknown error',
          requestId
        )
      }
    }

    const response: WebhookResponse = {
      success: failedCount === 0,
      sent_count: sentCount,
      failed_count: failedCount,
      results,
    }

    return successResponse(response, requestId)
  } catch (error) {
    console.error('Webhook send error:', error)
    return errorResponse(
      'internal_error',
      error instanceof Error ? error.message : '웹훅 전송 중 오류가 발생했습니다.',
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

  // POST만 허용
  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', '허용되지 않는 메서드입니다.', 405, generateUUID())
  }

  const requestId = req.headers.get('x-request-id') || generateUUID()

  // Service Role Key 검증 (내부 전용)
  const authHeader = req.headers.get('authorization')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!authHeader || !serviceRoleKey) {
    return errorResponse('unauthorized', 'Authorization 헤더가 필요합니다.', 401, requestId)
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader

  if (token !== serviceRoleKey) {
    return errorResponse('forbidden', '이 엔드포인트는 내부 전용입니다.', 403, requestId)
  }

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase configuration')
    return errorResponse('server_error', '서버 설정 오류입니다.', 500, requestId)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    return await handleWebhookSend(req, supabase, requestId)
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
