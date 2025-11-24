/**
 * Vision Handler for Claude AI Edge Function
 *
 * Claude Vision API를 사용한 이미지 분석 기능을 제공합니다.
 * - 5가지 분석 유형별 시스템 프롬프트
 * - Base64 및 URL 이미지 소스 지원
 * - 스트리밍/비스트리밍 응답 처리
 * - 에러 핸들링
 *
 * @endpoint POST /functions/v1/claude-ai/vision - 이미지 분석
 * @endpoint POST /functions/v1/claude-ai/vision/stream - 스트리밍 이미지 분석
 *
 * @version 1.0.0
 */

import { ClaudeAPIError, ClaudeUsageLogger, scrubPII } from './error-handler.ts'
import { RateLimiter, logRateLimitEvent } from './rate-limiter.ts'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * Claude API 설정
 */
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_API_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TEMPERATURE = 0.7

/**
 * 이미지 검증 상수
 */
const MAX_IMAGES = 10
const MAX_IMAGE_SIZE_MB = 20 // Claude Vision은 20MB까지 지원

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 분석 유형
 */
export type AnalysisType = 'general' | 'ui-design' | 'diagram' | 'screenshot' | 'wireframe'

/**
 * 이미지 미디어 타입
 */
export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'

/**
 * 이미지 소스 유형
 */
export type ImageSourceType = 'base64' | 'url'

/**
 * Vision 이미지
 */
export interface VisionImage {
  source: ImageSourceType
  data: string
  mediaType: ImageMediaType
}

/**
 * Vision 요청
 */
export interface VisionRequest {
  images: VisionImage[]
  prompt: string
  analysisType?: AnalysisType
  maxTokens?: number
  stream?: boolean
  model?: string
  temperature?: number
}

/**
 * Vision 응답
 */
export interface VisionResponse {
  analysis: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  model?: string
  id?: string
  stopReason?: string
}

/**
 * Claude API 이미지 콘텐츠 타입
 */
interface ClaudeImageContent {
  type: 'image'
  source: {
    type: 'base64' | 'url'
    media_type?: ImageMediaType
    data?: string
    url?: string
  }
}

/**
 * Claude API 텍스트 콘텐츠 타입
 */
interface ClaudeTextContent {
  type: 'text'
  text: string
}

/**
 * Claude API 콘텐츠 타입
 */
type ClaudeContent = ClaudeImageContent | ClaudeTextContent

/**
 * Claude API 응답 타입
 */
interface ClaudeAPIResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: Array<{
    type: 'text'
    text: string
  }>
  model: string
  stop_reason: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

// ============================================================================
// 분석 유형별 시스템 프롬프트
// ============================================================================

/**
 * 분석 유형별 시스템 프롬프트 매핑
 */
export const ANALYSIS_SYSTEM_PROMPTS: Record<AnalysisType, string> = {
  general: `당신은 이미지 분석 전문가입니다.
주어진 이미지를 상세하게 분석하고 설명해주세요.

분석 항목:
1. 이미지의 주요 내용과 구성 요소
2. 색상, 레이아웃, 시각적 특징
3. 텍스트가 있다면 해당 내용
4. 이미지의 목적이나 맥락 추론

응답은 한국어로 작성하고, 구조화된 형식으로 정리해주세요.`,

  'ui-design': `당신은 UI/UX 디자인 전문가입니다.
주어진 이미지의 UI/UX 디자인을 전문적으로 분석해주세요.

분석 항목:
1. **레이아웃 구조**: 그리드 시스템, 정렬, 공간 활용
2. **시각적 계층**: 타이포그래피, 색상 대비, 강조 요소
3. **UI 컴포넌트**: 버튼, 입력 필드, 카드 등의 디자인 패턴
4. **사용성**: 네비게이션, 접근성, 인터랙션 힌트
5. **브랜딩**: 색상 팔레트, 아이콘 스타일, 전체적인 톤앤매너
6. **개선 제안**: 더 나은 사용자 경험을 위한 구체적인 제안

응답은 한국어로 작성하고, 각 항목별로 구조화하여 정리해주세요.`,

  diagram: `당신은 시스템 아키텍처와 프로세스 분석 전문가입니다.
주어진 다이어그램/플로우차트를 분석해주세요.

분석 항목:
1. **다이어그램 유형**: 플로우차트, 시퀀스 다이어그램, ER 다이어그램, 아키텍처 도 등
2. **구성 요소**: 노드, 연결선, 레이블 등 각 요소의 의미
3. **흐름 분석**: 데이터 흐름, 프로세스 순서, 의사결정 포인트
4. **관계 파악**: 컴포넌트 간 연결, 의존성, 통신 방식
5. **전체 목적**: 다이어그램이 설명하려는 시스템이나 프로세스
6. **개선점**: 누락된 부분, 불명확한 연결, 최적화 제안

응답은 한국어로 작성하고, 기술적 용어는 정확하게 사용해주세요.
가능하다면 텍스트 기반 다이어그램(ASCII art 또는 Mermaid)으로 재현해주세요.`,

  screenshot: `당신은 소프트웨어 및 웹 애플리케이션 분석 전문가입니다.
주어진 스크린샷을 분석해주세요.

분석 항목:
1. **애플리케이션 식별**: 어떤 종류의 앱/웹사이트인지, 플랫폼 추정
2. **화면 구성**: 헤더, 사이드바, 메인 콘텐츠, 푸터 등
3. **UI 요소**: 버튼, 메뉴, 폼, 테이블, 그래프 등
4. **텍스트 내용**: 보이는 텍스트의 주요 내용 추출
5. **현재 상태**: 어떤 작업이나 화면을 보여주는지
6. **기능 추정**: 이 화면에서 가능한 사용자 액션

응답은 한국어로 작성하고, 실용적인 관점에서 분석해주세요.`,

  wireframe: `당신은 제품 디자인 및 프로토타이핑 전문가입니다.
주어진 와이어프레임/목업을 분석해주세요.

분석 항목:
1. **화면 목적**: 이 와이어프레임이 표현하려는 기능/페이지
2. **정보 구조**: 콘텐츠의 우선순위와 배치
3. **사용자 흐름**: 예상되는 사용자 인터랙션 순서
4. **핵심 기능**: 와이어프레임에 표현된 주요 기능들
5. **컴포넌트 명세**: 각 UI 요소의 상세 설명
6. **구현 고려사항**: 개발 시 고려해야 할 기술적 포인트
7. **개선 제안**: UX 관점에서의 개선 아이디어

응답은 한국어로 작성하고, 개발자와 디자이너 모두 이해할 수 있도록 설명해주세요.`,
}

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
 * VisionImage를 Claude API 형식으로 변환
 */
function convertToClaudeImageContent(image: VisionImage): ClaudeImageContent {
  if (image.source === 'url') {
    return {
      type: 'image',
      source: {
        type: 'url',
        url: image.data,
      },
    }
  }

  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: image.mediaType,
      data: image.data,
    },
  }
}

/**
 * 이미지 요청 검증
 */
function validateVisionRequest(body: VisionRequest): { valid: boolean; error?: string } {
  // 이미지 배열 확인
  if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
    return { valid: false, error: '최소 1개의 이미지가 필요합니다.' }
  }

  // 이미지 개수 제한
  if (body.images.length > MAX_IMAGES) {
    return { valid: false, error: `이미지는 최대 ${MAX_IMAGES}개까지만 지원됩니다.` }
  }

  // 프롬프트 확인
  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    return { valid: false, error: '분석 요청 프롬프트가 필요합니다.' }
  }

  // 각 이미지 검증
  for (let i = 0; i < body.images.length; i++) {
    const image = body.images[i]

    if (!image.source || !['base64', 'url'].includes(image.source)) {
      return { valid: false, error: `이미지 ${i + 1}: 유효하지 않은 source 타입입니다.` }
    }

    if (!image.data || typeof image.data !== 'string') {
      return { valid: false, error: `이미지 ${i + 1}: 이미지 데이터가 없습니다.` }
    }

    if (image.source === 'base64') {
      if (!image.mediaType || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(image.mediaType)) {
        return { valid: false, error: `이미지 ${i + 1}: 유효하지 않은 미디어 타입입니다.` }
      }
    }
  }

  // 분석 유형 검증 (선택적)
  if (body.analysisType && !Object.keys(ANALYSIS_SYSTEM_PROMPTS).includes(body.analysisType)) {
    return { valid: false, error: `유효하지 않은 분석 유형입니다: ${body.analysisType}` }
  }

  return { valid: true }
}

// ============================================================================
// Vision API 호출 함수
// ============================================================================

/**
 * Claude Vision API 호출 (비스트리밍)
 */
export async function callVisionAPI(request: VisionRequest): Promise<ClaudeAPIResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.')
  }

  // 분석 유형에 따른 시스템 프롬프트 선택
  const analysisType = request.analysisType || 'general'
  const systemPrompt = ANALYSIS_SYSTEM_PROMPTS[analysisType]

  // 이미지 콘텐츠 구성
  const imageContents: ClaudeContent[] = request.images.map(convertToClaudeImageContent)

  // 사용자 프롬프트 추가
  const userContent: ClaudeContent[] = [
    ...imageContents,
    {
      type: 'text',
      text: request.prompt,
    },
  ]

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_API_VERSION,
    },
    body: JSON.stringify({
      model: request.model || DEFAULT_MODEL,
      max_tokens: request.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: request.temperature ?? DEFAULT_TEMPERATURE,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Claude Vision API error:', response.status, errorBody)
    throw new Error(`Claude Vision API 오류: ${response.status}`)
  }

  return await response.json() as ClaudeAPIResponse
}

/**
 * Claude Vision API 스트리밍 호출
 */
export async function* callVisionAPIStream(
  request: VisionRequest
): AsyncGenerator<string, void, unknown> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.')
  }

  // 분석 유형에 따른 시스템 프롬프트 선택
  const analysisType = request.analysisType || 'general'
  const systemPrompt = ANALYSIS_SYSTEM_PROMPTS[analysisType]

  // 이미지 콘텐츠 구성
  const imageContents: ClaudeContent[] = request.images.map(convertToClaudeImageContent)

  // 사용자 프롬프트 추가
  const userContent: ClaudeContent[] = [
    ...imageContents,
    {
      type: 'text',
      text: request.prompt,
    },
  ]

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_API_VERSION,
    },
    body: JSON.stringify({
      model: request.model || DEFAULT_MODEL,
      max_tokens: request.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: request.temperature ?? DEFAULT_TEMPERATURE,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Claude Vision API streaming error:', response.status, errorBody)
    throw new Error(`Claude Vision API 스트리밍 오류: ${response.status}`)
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
 * 에러 응답 생성
 */
function errorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code,
        message,
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

/**
 * 성공 응답 생성
 */
function successResponse(
  data: VisionResponse,
  requestId: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

/**
 * POST /claude-ai/vision - 이미지 분석 (비스트리밍)
 */
export async function handleVision(
  req: Request,
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Rate Limiting 체크 (DB 기반)
  const rateLimiter = new RateLimiter(supabase)
  const logger = new ClaudeUsageLogger(supabase)
  const dbRateLimitResult = await rateLimiter.checkLimit(userId)
  logRateLimitEvent(userId, dbRateLimitResult, '/claude-ai/vision')

  if (!dbRateLimitResult.allowed) {
    await logger.logRateLimit(userId, requestId, req, dbRateLimitResult.retryAfterSeconds || 60)
    return rateLimiter.createLimitExceededResponse(dbRateLimitResult, corsHeaders)
  }

  // 요청 본문 파싱
  let body: VisionRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 페이로드입니다.', 400, requestId, corsHeaders)
  }

  // 요청 검증
  const validation = validateVisionRequest(body)
  if (!validation.valid) {
    return errorResponse('invalid_request', validation.error || '잘못된 요청입니다.', 400, requestId, corsHeaders)
  }

  const startTime = Date.now()

  try {
    // Claude Vision API 호출
    const response = await callVisionAPI(body)

    // 응답 변환
    const analysis = response.content
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
    }, {
      action: 'vision',
      analysisType: body.analysisType || 'general',
      imageCount: body.images.length,
    })

    console.log(
      `Claude Vision API usage - user: ${userId}, input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}, latency: ${latencyMs}ms`
    )

    return successResponse(
      {
        analysis,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        model: response.model,
        id: response.id,
        stopReason: response.stop_reason ?? undefined,
      },
      requestId,
      corsHeaders
    )
  } catch (error) {
    console.error('Vision error:', error)

    // 에러 로깅
    const claudeError =
      error instanceof ClaudeAPIError
        ? error
        : new ClaudeAPIError(500, error instanceof Error ? error.message : 'Unknown error', requestId)

    await logger.logError(userId, requestId, req, claudeError, {
      action: 'vision',
      analysisType: body.analysisType || 'general',
    })

    return errorResponse(
      'api_error',
      error instanceof Error ? error.message : '이미지 분석 중 오류가 발생했습니다.',
      500,
      requestId,
      corsHeaders
    )
  }
}

/**
 * POST /claude-ai/vision/stream - 스트리밍 이미지 분석
 */
export async function handleVisionStream(
  req: Request,
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Rate Limiting 체크 (DB 기반)
  const rateLimiter = new RateLimiter(supabase)
  const logger = new ClaudeUsageLogger(supabase)
  const dbRateLimitResult = await rateLimiter.checkLimit(userId)
  logRateLimitEvent(userId, dbRateLimitResult, '/claude-ai/vision/stream')

  if (!dbRateLimitResult.allowed) {
    await logger.logRateLimit(userId, requestId, req, dbRateLimitResult.retryAfterSeconds || 60)
    return rateLimiter.createLimitExceededResponse(dbRateLimitResult, corsHeaders)
  }

  // 요청 본문 파싱
  let body: VisionRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 페이로드입니다.', 400, requestId, corsHeaders)
  }

  // 요청 검증
  const validation = validateVisionRequest(body)
  if (!validation.valid) {
    return errorResponse('invalid_request', validation.error || '잘못된 요청입니다.', 400, requestId, corsHeaders)
  }

  const startTime = Date.now()

  try {
    // ReadableStream 생성
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          // 스트리밍 시작 이벤트
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'start', request_id: requestId })}\n\n`)
          )

          // Claude Vision API 스트리밍 호출
          for await (const chunk of callVisionAPIStream(body)) {
            // 텍스트 청크 전송
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`))
          }

          const latencyMs = Date.now() - startTime

          // 성공 로깅 (스트리밍에서는 토큰 수를 정확히 알기 어려움)
          await logger.logSuccess(userId, requestId, req, {
            model: body.model || DEFAULT_MODEL,
            latencyMs,
          }, {
            action: 'vision_stream',
            analysisType: body.analysisType || 'general',
            imageCount: body.images.length,
          })

          // 스트리밍 완료 이벤트
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        } catch (error) {
          // 에러 로깅
          const claudeError =
            error instanceof ClaudeAPIError
              ? error
              : new ClaudeAPIError(500, error instanceof Error ? error.message : 'Unknown error', requestId)

          await logger.logError(userId, requestId, req, claudeError, {
            action: 'vision_stream',
            analysisType: body.analysisType || 'general',
          })

          // 에러 이벤트
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: scrubPII(error instanceof Error ? error.message : 'Unknown error'),
              })}\n\n`
            )
          )
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
    console.error('Vision stream error:', error)

    // 에러 로깅
    const claudeError =
      error instanceof ClaudeAPIError
        ? error
        : new ClaudeAPIError(500, error instanceof Error ? error.message : 'Unknown error', requestId)

    await logger.logError(userId, requestId, req, claudeError, {
      action: 'vision_stream',
      analysisType: body.analysisType || 'general',
    })

    return errorResponse(
      'api_error',
      error instanceof Error ? error.message : '이미지 스트리밍 분석 중 오류가 발생했습니다.',
      500,
      requestId,
      corsHeaders
    )
  }
}
