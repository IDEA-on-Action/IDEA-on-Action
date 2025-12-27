/**
 * Session Management API
 *
 * 사용자의 활성 세션을 관리하는 RESTful API입니다.
 * - GET /sessions - 활성 세션 목록 조회
 * - DELETE /sessions/:id - 특정 세션 종료
 * - DELETE /sessions - 전체 세션 종료 (강제 로그아웃)
 *
 * @endpoint /functions/v1/session-api
 * @version 1.0.0
 * @standard RFC 7807 (Problem Details)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

// ============================================================================
// 상수 정의
// ============================================================================

// 세션 정책
const MAX_CONCURRENT_SESSIONS = 5 // 최대 동시 로그인 기기 수
const SESSION_TIMEOUT_MINUTES = 30 // 세션 타임아웃 (분)
const SESSION_EXPIRY_SECONDS = 30 * 24 * 60 * 60 // 30일

// JWT 발급자 정보
const JWT_ISSUER = 'https://www.ideaonaction.ai'
const JWT_AUDIENCE = ['minu.best']

// ============================================================================
// 타입 정의
// ============================================================================

interface SessionRecord {
  id: string
  user_id: string
  refresh_token_id: string | null
  device_info: DeviceInfo | null
  ip_address: string | null
  user_agent: string | null
  last_active_at: string
  expires_at: string | null
  created_at: string
}

interface DeviceInfo {
  browser?: string
  os?: string
  device_type?: string
}

interface SessionResponse {
  id: string
  device_info: DeviceInfo | null
  ip_address: string | null
  last_active_at: string
  created_at: string
  is_current: boolean
}

interface ErrorResponse {
  type: string
  title: string
  status: number
  detail: string
  instance: string
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * JWT Secret Key 가져오기
 */
function getJWTSecretKey(): Uint8Array {
  const secret = Deno.env.get('OAUTH_JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET')
  if (!secret) {
    throw new Error('JWT Secret이 설정되지 않았습니다.')
  }
  return new TextEncoder().encode(secret)
}

/**
 * JWT 검증
 */
async function verifyJWT(token: string): Promise<{
  valid: boolean
  payload?: jose.JWTPayload
  error?: string
}> {
  try {
    const secret = getJWTSecretKey()
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })

    return { valid: true, payload }
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return { valid: false, error: 'token_expired' }
    }
    return { valid: false, error: 'invalid_token' }
  }
}

/**
 * RFC 7807 에러 응답 생성
 */
function errorResponse(
  status: number,
  title: string,
  detail: string,
  instance: string,
  corsHeaders: Record<string, string>
): Response {
  const type = `https://www.ideaonaction.ai/errors/${status}`
  const response: ErrorResponse = {
    type,
    title,
    status,
    detail,
    instance,
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/problem+json' },
  })
}

/**
 * 성공 응답 생성
 */
function successResponse(data: unknown, corsHeaders: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * 감사 로그 기록
 */
async function logAuditEvent(
  supabase: ReturnType<typeof createClient>,
  endpoint: string,
  method: string,
  userId: string | undefined,
  responseStatus: number,
  errorCode?: string,
  errorDescription?: string,
  req?: Request
): Promise<void> {
  await supabase.from('oauth_audit_log').insert({
    endpoint,
    method,
    user_id: userId || null,
    request_params: {},
    response_status: responseStatus,
    error_code: errorCode || null,
    error_description: errorDescription || null,
    ip_address: req?.headers.get('x-forwarded-for')?.split(',')[0] || null,
    user_agent: req?.headers.get('user-agent') || null,
  })
}

/**
 * Device Info 파싱
 */
function parseDeviceInfo(userAgent: string | null): DeviceInfo | null {
  if (!userAgent) return null

  const deviceInfo: DeviceInfo = {}

  // 브라우저 감지
  if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome'
  else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox'
  else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari'
  else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge'
  else deviceInfo.browser = 'Unknown'

  // OS 감지
  if (userAgent.includes('Windows')) deviceInfo.os = 'Windows'
  else if (userAgent.includes('Mac OS')) deviceInfo.os = 'macOS'
  else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux'
  else if (userAgent.includes('Android')) deviceInfo.os = 'Android'
  else if (userAgent.includes('iOS')) deviceInfo.os = 'iOS'
  else deviceInfo.os = 'Unknown'

  // 기기 타입 감지
  if (userAgent.includes('Mobile')) deviceInfo.device_type = 'Mobile'
  else if (userAgent.includes('Tablet')) deviceInfo.device_type = 'Tablet'
  else deviceInfo.device_type = 'Desktop'

  return deviceInfo
}

/**
 * 세션 생성
 */
async function createSession(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  refreshTokenId: string | null,
  req: Request
): Promise<void> {
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || null
  const userAgent = req.headers.get('user-agent') || null
  const deviceInfo = parseDeviceInfo(userAgent)
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_SECONDS * 1000)

  // 기존 세션 개수 확인
  const { count } = await supabase
    .from('user_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())

  // 최대 동시 세션 수 초과 시 가장 오래된 세션 삭제
  if (count && count >= MAX_CONCURRENT_SESSIONS) {
    const { data: oldestSession } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('last_active_at', { ascending: true })
      .limit(1)
      .single()

    if (oldestSession) {
      await supabase.from('user_sessions').delete().eq('id', oldestSession.id)
      console.log(`Oldest session deleted for user: ${userId}`)
    }
  }

  // 새 세션 생성
  await supabase.from('user_sessions').insert({
    user_id: userId,
    refresh_token_id: refreshTokenId,
    device_info: deviceInfo,
    ip_address: ipAddress,
    user_agent: userAgent,
    expires_at: expiresAt.toISOString(),
  })

  console.log(`Session created for user: ${userId}`)
}

/**
 * 세션 활동 시간 업데이트
 */
async function updateSessionActivity(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  req: Request
): Promise<void> {
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || null
  const userAgent = req.headers.get('user-agent') || null

  // IP와 User-Agent로 세션 식별 (간단한 구현)
  await supabase
    .from('user_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('ip_address', ipAddress)
    .eq('user_agent', userAgent)
}

// ============================================================================
// API 핸들러
// ============================================================================

/**
 * GET /sessions - 활성 세션 목록 조회
 */
async function handleGetSessions(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { data: sessions, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('last_active_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch sessions:', error)
    await logAuditEvent(supabase, '/session-api', 'GET', userId, 500, 'database_error', error.message, req)
    return errorResponse(500, 'Internal Server Error', '세션 목록을 가져오는 중 오류가 발생했습니다.', req.url, corsHeaders)
  }

  // 현재 세션 식별 (IP + User-Agent)
  const currentIp = req.headers.get('x-forwarded-for')?.split(',')[0]
  const currentUserAgent = req.headers.get('user-agent')

  const response: SessionResponse[] = sessions.map((session: SessionRecord) => ({
    id: session.id,
    device_info: session.device_info,
    ip_address: session.ip_address,
    last_active_at: session.last_active_at,
    created_at: session.created_at,
    is_current: session.ip_address === currentIp && session.user_agent === currentUserAgent,
  }))

  await logAuditEvent(supabase, '/session-api', 'GET', userId, 200, undefined, undefined, req)
  return successResponse(response, corsHeaders)
}

/**
 * DELETE /sessions/:id - 특정 세션 종료
 */
async function handleDeleteSession(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string,
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // 세션 소유권 확인
  const { data: session, error: fetchError } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !session) {
    await logAuditEvent(supabase, '/session-api', 'DELETE', userId, 404, 'session_not_found', 'Session not found', req)
    return errorResponse(404, 'Not Found', '세션을 찾을 수 없습니다.', req.url, corsHeaders)
  }

  // 세션 삭제
  const { error: deleteError } = await supabase
    .from('user_sessions')
    .delete()
    .eq('id', sessionId)

  if (deleteError) {
    console.error('Failed to delete session:', deleteError)
    await logAuditEvent(supabase, '/session-api', 'DELETE', userId, 500, 'database_error', deleteError.message, req)
    return errorResponse(500, 'Internal Server Error', '세션을 삭제하는 중 오류가 발생했습니다.', req.url, corsHeaders)
  }

  // Refresh Token도 폐기
  if (session.refresh_token_id) {
    await supabase
      .from('oauth_refresh_tokens')
      .update({ is_revoked: true })
      .eq('id', session.refresh_token_id)
  }

  await logAuditEvent(supabase, '/session-api', 'DELETE', userId, 204, undefined, undefined, req)
  return new Response(null, { status: 204, headers: corsHeaders })
}

/**
 * DELETE /sessions - 전체 세션 종료 (강제 로그아웃)
 */
async function handleDeleteAllSessions(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // 모든 활성 세션 조회
  const { data: sessions, error: fetchError } = await supabase
    .from('user_sessions')
    .select('refresh_token_id')
    .eq('user_id', userId)

  if (fetchError) {
    console.error('Failed to fetch sessions:', fetchError)
    await logAuditEvent(supabase, '/session-api', 'DELETE', userId, 500, 'database_error', fetchError.message, req)
    return errorResponse(500, 'Internal Server Error', '세션을 가져오는 중 오류가 발생했습니다.', req.url, corsHeaders)
  }

  // 모든 세션 삭제
  const { error: deleteError } = await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    console.error('Failed to delete sessions:', deleteError)
    await logAuditEvent(supabase, '/session-api', 'DELETE', userId, 500, 'database_error', deleteError.message, req)
    return errorResponse(500, 'Internal Server Error', '세션을 삭제하는 중 오류가 발생했습니다.', req.url, corsHeaders)
  }

  // 모든 Refresh Token 폐기
  const refreshTokenIds = sessions
    .map((s: { refresh_token_id: string | null }) => s.refresh_token_id)
    .filter(Boolean)

  if (refreshTokenIds.length > 0) {
    await supabase
      .from('oauth_refresh_tokens')
      .update({ is_revoked: true })
      .in('id', refreshTokenIds)
  }

  await logAuditEvent(supabase, '/session-api', 'DELETE', userId, 204, undefined, undefined, req)
  return new Response(null, { status: 204, headers: corsHeaders })
}

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return errorResponse(500, 'Internal Server Error', '서버 설정 오류입니다.', req.url, corsHeaders)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // JWT 인증
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await logAuditEvent(supabase, '/session-api', req.method, undefined, 401, 'missing_token', 'Missing authorization header', req)
    return errorResponse(401, 'Unauthorized', '인증 토큰이 필요합니다.', req.url, corsHeaders)
  }

  const token = authHeader.substring(7)
  const { valid, payload, error } = await verifyJWT(token)

  if (!valid || !payload) {
    await logAuditEvent(supabase, '/session-api', req.method, undefined, 401, error || 'invalid_token', 'Invalid token', req)
    return errorResponse(401, 'Unauthorized', '유효하지 않은 인증 토큰입니다.', req.url, corsHeaders)
  }

  const userId = payload.sub as string

  // URL 파싱
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const sessionId = pathParts[pathParts.length - 1]

  // 라우팅
  if (req.method === 'GET' && url.pathname.endsWith('/sessions')) {
    return handleGetSessions(supabase, userId, req, corsHeaders)
  } else if (req.method === 'DELETE' && sessionId && sessionId !== 'sessions') {
    return handleDeleteSession(supabase, userId, sessionId, req, corsHeaders)
  } else if (req.method === 'DELETE' && url.pathname.endsWith('/sessions')) {
    return handleDeleteAllSessions(supabase, userId, req, corsHeaders)
  }

  // 지원하지 않는 메서드/경로
  return errorResponse(405, 'Method Not Allowed', '지원하지 않는 메서드입니다.', req.url, corsHeaders)
})

// Export 함수 (다른 Edge Function에서 사용 가능)
export { createSession, updateSessionActivity }
