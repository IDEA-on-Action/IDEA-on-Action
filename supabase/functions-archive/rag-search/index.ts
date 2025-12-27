/**
 * RAG Search Edge Function
 *
 * OpenAI Embedding과 PostgreSQL pgvector를 사용한 시맨틱 검색 기능을 제공합니다.
 * - JWT 토큰 검증 (Supabase Auth + MCP Auth)
 * - OpenAI text-embedding-3-small 임베딩 생성
 * - PostgreSQL search_rag_embeddings() 함수 호출
 * - 유사도 기반 검색 결과 반환
 *
 * @endpoint POST /functions/v1/rag-search
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
const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings'
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536 // text-embedding-3-small의 기본 차원

/**
 * JWT 발급자 정보
 */
const JWT_ISSUER = 'mcp-auth'
const JWT_AUDIENCE = 'central-hub'

/**
 * 기본값
 */
const DEFAULT_LIMIT = 5
const DEFAULT_THRESHOLD = 0.7

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * RAG 검색 요청
 */
interface RAGSearchRequest {
  query: string
  serviceId?: string // 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep'
  limit?: number // default: 5
  threshold?: number // default: 0.7
}

/**
 * RAG 검색 결과 항목
 */
interface RAGSearchResult {
  documentId: string
  documentTitle: string
  chunkText: string
  chunkIndex: number
  similarity: number
  sourceType: string
  serviceId?: string
}

/**
 * RAG 검색 응답
 */
interface RAGSearchResponse {
  success: boolean
  query: string
  results: RAGSearchResult[]
  totalResults: number
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

/**
 * PostgreSQL 검색 결과
 */
interface PostgresSearchResult {
  document_id: string
  document_title: string
  chunk_text: string
  chunk_index: number
  similarity: number
  source_type: string
  service_id?: string
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
  _supabase: ReturnType<typeof createClient>
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
  message: string,
  status: number,
  requestId: string
): Response {
  const response: RAGSearchResponse = {
    success: false,
    query: '',
    results: [],
    totalResults: 0,
    error: message,
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
    },
  })
}

/**
 * 성공 응답 생성
 */
function successResponse(
  query: string,
  results: RAGSearchResult[],
  requestId: string
): Response {
  const response: RAGSearchResponse = {
    success: true,
    query,
    results,
    totalResults: results.length,
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
    },
  })
}

/**
 * OpenAI 임베딩 생성
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.')
  }

  const response = await fetch(OPENAI_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
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

  if (!data.data || data.data.length === 0) {
    throw new Error('임베딩 생성 실패: 응답이 비어있습니다.')
  }

  return data.data[0].embedding
}

/**
 * PostgreSQL search_rag_embeddings() 함수 호출
 */
async function searchRAGEmbeddings(
  supabase: ReturnType<typeof createClient>,
  queryEmbedding: number[],
  serviceId?: string,
  limit?: number,
  threshold?: number
): Promise<RAGSearchResult[]> {
  // PostgreSQL 함수 호출
  const { data, error } = await supabase.rpc('search_rag_embeddings', {
    query_embedding: queryEmbedding,
    match_service_id: serviceId || null,
    match_limit: limit || DEFAULT_LIMIT,
    similarity_threshold: threshold || DEFAULT_THRESHOLD,
  })

  if (error) {
    console.error('PostgreSQL search error:', error)
    throw new Error(`데이터베이스 검색 오류: ${error.message}`)
  }

  if (!data || !Array.isArray(data)) {
    return []
  }

  // 결과 변환
  return data.map((row: PostgresSearchResult) => ({
    documentId: row.document_id,
    documentTitle: row.document_title,
    chunkText: row.chunk_text,
    chunkIndex: row.chunk_index,
    similarity: row.similarity,
    sourceType: row.source_type,
    serviceId: row.service_id,
  }))
}

// ============================================================================
// 핸들러 함수
// ============================================================================

/**
 * POST /rag-search - RAG 검색 요청
 */
async function handleRAGSearch(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // 인증 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'))
  if (!token) {
    return errorResponse('인증 토큰이 필요합니다.', 401, requestId)
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
      return errorResponse('유효하지 않은 토큰입니다.', 401, requestId)
    }
    userId = jwtResult.userId
  }

  if (!userId) {
    return errorResponse('사용자 인증에 실패했습니다.', 401, requestId)
  }

  // 요청 본문 파싱
  let body: RAGSearchRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('유효하지 않은 JSON 페이로드입니다.', 400, requestId)
  }

  // 필수 필드 검증
  if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
    return errorResponse('query 필드가 필요합니다.', 400, requestId)
  }

  // 파라미터 검증
  const limit = body.limit !== undefined ? Math.max(1, Math.min(20, body.limit)) : DEFAULT_LIMIT
  const threshold = body.threshold !== undefined ? Math.max(0, Math.min(1, body.threshold)) : DEFAULT_THRESHOLD

  const startTime = Date.now()

  try {
    console.log(`[${requestId}] RAG Search started - user: ${userId}, query: "${body.query}", service: ${body.serviceId || 'all'}, limit: ${limit}, threshold: ${threshold}`)

    // Step 1: OpenAI 임베딩 생성
    const queryEmbedding = await generateEmbedding(body.query.trim())
    console.log(`[${requestId}] Embedding generated (${queryEmbedding.length} dimensions)`)

    // Step 2: PostgreSQL 검색
    const results = await searchRAGEmbeddings(
      supabase,
      queryEmbedding,
      body.serviceId,
      limit,
      threshold
    )

    const latencyMs = Date.now() - startTime
    console.log(`[${requestId}] RAG Search completed - ${results.length} results, ${latencyMs}ms`)

    // Step 3: 응답 반환
    return successResponse(body.query, results, requestId)
  } catch (error) {
    console.error(`[${requestId}] RAG Search error:`, error)
    return errorResponse(
      error instanceof Error ? error.message : 'RAG 검색 중 오류가 발생했습니다.',
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
    const requestId = generateUUID()
    return errorResponse('허용되지 않는 메서드입니다. POST만 지원합니다.', 405, requestId)
  }

  // 요청 ID 생성
  const requestId = req.headers.get('x-request-id') || generateUUID()

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return errorResponse('서버 설정 오류입니다.', 500, requestId)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 라우팅
  try {
    return await handleRAGSearch(req, supabase, requestId)
  } catch (error) {
    console.error('Unhandled error:', error)
    return errorResponse('서버 내부 오류가 발생했습니다.', 500, requestId)
  }
})
