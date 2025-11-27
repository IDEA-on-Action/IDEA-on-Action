/**
 * RAG Embed Edge Function
 *
 * 문서를 청킹하고 OpenAI 임베딩을 생성하여 rag_embeddings 테이블에 저장합니다.
 * - JWT 토큰 검증 (MCP Auth 패턴 기반)
 * - 문서 청킹 (500토큰 단위, 50토큰 오버랩)
 * - OpenAI text-embedding-3-small API 호출
 * - rag_embeddings 테이블에 저장
 * - 에러 핸들링 및 상태 업데이트
 *
 * @endpoint POST /functions/v1/rag-embed
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

/**
 * OpenAI API 설정
 */
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings'
const OPENAI_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSION = 1536 // text-embedding-3-small의 차원

/**
 * 청킹 설정
 */
const CHUNK_SIZE = 500 // 토큰 단위
const CHUNK_OVERLAP = 50 // 토큰 단위

/**
 * JWT 발급자 정보
 */
const JWT_ISSUER = 'mcp-auth'
const JWT_AUDIENCE = 'central-hub'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * RAG 임베딩 요청
 */
interface RAGEmbedRequest {
  documentId: string
}

/**
 * RAG 임베딩 응답
 */
interface RAGEmbedResponse {
  success: boolean
  documentId: string
  chunkCount: number
  error?: string
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
 * RAG 문서 (DB)
 */
interface RAGDocument {
  id: string
  user_id: string
  title: string
  content: string
  document_type: string
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed'
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

/**
 * OpenAI 임베딩 응답
 */
interface OpenAIEmbeddingResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
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

    // user_id 추출
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
 * Supabase Auth 토큰 검증
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
 * 에러 응답 생성
 */
function errorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string
): Response {
  const response: RAGEmbedResponse = {
    success: false,
    documentId: '',
    chunkCount: 0,
    error: `${code}: ${message}`,
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
  })
}

/**
 * 성공 응답 생성
 */
function successResponse(documentId: string, chunkCount: number, requestId: string): Response {
  const response: RAGEmbedResponse = {
    success: true,
    documentId,
    chunkCount,
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
  })
}

/**
 * 텍스트 토큰화 (간단한 단어 분리 기반)
 * 실제 프로덕션에서는 tiktoken 라이브러리 사용 권장
 */
function tokenize(text: string): string[] {
  // 공백, 구두점으로 분리
  return text.split(/\s+/).filter(token => token.length > 0)
}

/**
 * 텍스트 청킹 (토큰 기반)
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const tokens = tokenize(text)
  const chunks: string[] = []

  let i = 0
  while (i < tokens.length) {
    const end = Math.min(i + chunkSize, tokens.length)
    const chunk = tokens.slice(i, end).join(' ')
    chunks.push(chunk)

    // 다음 청크 시작 위치 (오버랩 고려)
    i += chunkSize - overlap
  }

  return chunks
}

/**
 * OpenAI 임베딩 API 호출
 */
async function createEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.')
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: text,
      encoding_format: 'float',
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('OpenAI API error:', response.status, errorBody)
    throw new Error(`OpenAI API 오류: ${response.status}`)
  }

  const data = await response.json() as OpenAIEmbeddingResponse
  return data.data[0].embedding
}

// ============================================================================
// 핸들러 함수
// ============================================================================

/**
 * POST /rag-embed - 문서 임베딩 생성
 */
async function handleRAGEmbed(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // 인증 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'))
  if (!token) {
    return errorResponse('unauthorized', '인증 토큰이 필요합니다.', 401, requestId)
  }

  // Supabase Auth 토큰 검증 시도
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

  // 요청 본문 파싱
  let body: RAGEmbedRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 페이로드입니다.', 400, requestId)
  }

  // 필수 필드 검증
  if (!body.documentId) {
    return errorResponse('missing_field', 'documentId 필드가 필요합니다.', 400, requestId)
  }

  const { documentId } = body

  try {
    // 1. 문서 조회
    const { data: document, error: fetchError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      console.error('Document fetch error:', fetchError)
      return errorResponse(
        'document_not_found',
        '문서를 찾을 수 없습니다.',
        404,
        requestId
      )
    }

    const ragDocument = document as RAGDocument

    // 권한 확인 (본인 문서만 임베딩 가능)
    if (ragDocument.user_id !== userId) {
      return errorResponse(
        'forbidden',
        '해당 문서에 대한 권한이 없습니다.',
        403,
        requestId
      )
    }

    // 2. 문서 상태를 'processing'으로 업데이트
    const { error: updateProcessingError } = await supabase
      .from('rag_documents')
      .update({
        embedding_status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateProcessingError) {
      console.error('Update processing status error:', updateProcessingError)
      throw new Error('문서 상태 업데이트 실패')
    }

    console.log(`Processing document ${documentId}: "${ragDocument.title}"`)

    // 3. 텍스트 청킹
    const chunks = chunkText(ragDocument.content, CHUNK_SIZE, CHUNK_OVERLAP)
    console.log(`Generated ${chunks.length} chunks for document ${documentId}`)

    // 4. 각 청크에 대해 임베딩 생성 및 저장
    const embeddingPromises = chunks.map(async (chunkText, index) => {
      // 임베딩 생성
      const embedding = await createEmbedding(chunkText)

      // rag_embeddings 테이블에 저장
      // pgvector는 배열을 자동으로 vector 타입으로 변환
      const { error: insertError } = await supabase
        .from('rag_embeddings')
        .insert({
          id: generateUUID(),
          document_id: documentId,
          chunk_index: index,
          chunk_text: chunkText,
          embedding: embedding, // pgvector가 배열을 vector 타입으로 변환
          token_count: tokenize(chunkText).length,
          metadata: {
            chunk_size: CHUNK_SIZE,
            chunk_overlap: CHUNK_OVERLAP,
          },
          created_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error(`Embedding insert error for chunk ${index}:`, insertError)
        throw new Error(`청크 ${index} 임베딩 저장 실패`)
      }

      console.log(`Saved embedding for chunk ${index}/${chunks.length}`)
    })

    // 모든 임베딩 저장 완료 대기
    await Promise.all(embeddingPromises)

    // 5. 문서 상태를 'completed'로 업데이트
    const { error: updateCompletedError } = await supabase
      .from('rag_documents')
      .update({
        embedding_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateCompletedError) {
      console.error('Update completed status error:', updateCompletedError)
      throw new Error('문서 상태 업데이트 실패')
    }

    console.log(`Completed embedding for document ${documentId}`)

    return successResponse(documentId, chunks.length, requestId)
  } catch (error) {
    console.error('RAG embed error:', error)

    // 에러 발생 시 문서 상태를 'failed'로 업데이트
    try {
      await supabase
        .from('rag_documents')
        .update({
          embedding_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)
    } catch (updateError) {
      console.error('Failed to update document status to failed:', updateError)
    }

    return errorResponse(
      'embedding_failed',
      error instanceof Error ? error.message : 'RAG 임베딩 생성 중 오류가 발생했습니다.',
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

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return errorResponse('server_error', '서버 설정 오류입니다.', 500, requestId)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    return await handleRAGEmbed(req, supabase, requestId)
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
