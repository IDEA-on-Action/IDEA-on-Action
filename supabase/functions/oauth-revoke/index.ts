/**
 * OAuth 2.0 Token Revocation Endpoint
 *
 * RFC 7009 (Token Revocation) 표준을 따르는 토큰 폐기 엔드포인트입니다.
 * Access Token 또는 Refresh Token을 무효화합니다.
 *
 * @endpoint POST /functions/v1/oauth-revoke
 * @standard RFC 7009
 * @version 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// ============================================================================
// 상수 정의
// ============================================================================

// CORS 헤더는 getCorsHeaders()로 동적 생성 (삭제됨)

// 유효한 token_type_hint
const VALID_TOKEN_TYPE_HINTS = ['access_token', 'refresh_token'] as const
type TokenTypeHint = typeof VALID_TOKEN_TYPE_HINTS[number]

// ============================================================================
// 타입 정의
// ============================================================================

interface RevokeRequest {
  token: string
  token_type_hint?: TokenTypeHint
  client_id?: string
}

interface ErrorResponse {
  error: string
  error_description: string
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * SHA256 해시 생성
 */
async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 에러 응답 생성
 */
function errorResponse(error: string, errorDescription: string, status = 400): Response {
  const response: ErrorResponse = { error, error_description: errorDescription }
  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * 성공 응답 생성 (RFC 7009: 항상 200 OK)
 */
function successResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

/**
 * 감사 로그 기록
 */
async function logAuditEvent(
  supabase: ReturnType<typeof createClient>,
  endpoint: string,
  clientId: string | undefined,
  userId: string | undefined,
  tokenTypeHint: string | undefined,
  responseStatus: number,
  errorCode?: string,
  errorDescription?: string,
  req?: Request
): Promise<void> {
  await supabase.from('oauth_audit_log').insert({
    endpoint,
    method: 'POST',
    client_id: clientId || null,
    user_id: userId || null,
    request_params: { token_type_hint: tokenTypeHint },
    response_status: responseStatus,
    error_code: errorCode || null,
    error_description: errorDescription || null,
    ip_address: req?.headers.get('x-forwarded-for')?.split(',')[0] || null,
    user_agent: req?.headers.get('user-agent') || null,
  })
}

/**
 * Refresh Token 폐기
 */
async function revokeRefreshToken(
  supabase: ReturnType<typeof createClient>,
  tokenHash: string,
  reason: string
): Promise<{ revoked: boolean; clientId?: string; userId?: string }> {
  const { data: tokenRecord, error } = await supabase
    .from('oauth_refresh_tokens')
    .update({
      is_revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
    })
    .eq('token_hash', tokenHash)
    .select('client_id, user_id')
    .single()

  if (error || !tokenRecord) {
    // RFC 7009: 토큰이 없어도 200 OK 응답
    return { revoked: false }
  }

  return {
    revoked: true,
    clientId: tokenRecord.client_id,
    userId: tokenRecord.user_id,
  }
}

/**
 * 사용자의 모든 Refresh Token 폐기
 */
async function revokeAllUserTokens(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  clientId?: string
): Promise<number> {
  const query = supabase
    .from('oauth_refresh_tokens')
    .update({
      is_revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_reason: 'user_logout',
    })
    .eq('user_id', userId)
    .eq('is_revoked', false)

  if (clientId) {
    query.eq('client_id', clientId)
  }

  const { count } = await query

  return count || 0
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
    return errorResponse('method_not_allowed', 'POST 메서드만 허용됩니다.', 405)
  }

  // 요청 본문 파싱
  let request: RevokeRequest
  try {
    request = await req.json()
  } catch {
    return errorResponse('invalid_request', '유효하지 않은 JSON 형식입니다.')
  }

  const { token, token_type_hint, client_id } = request

  // 필수 파라미터 검증
  if (!token) {
    return errorResponse('invalid_request', '필수 파라미터가 누락되었습니다: token')
  }

  // token_type_hint 검증
  if (token_type_hint && !VALID_TOKEN_TYPE_HINTS.includes(token_type_hint)) {
    return errorResponse('unsupported_token_type', 'token_type_hint는 "access_token" 또는 "refresh_token"만 지원됩니다.')
  }

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return errorResponse('server_error', '서버 설정 오류입니다.', 500)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 토큰 타입 힌트가 있으면 해당 타입만 확인, 없으면 Refresh Token으로 간주
    const typeHint = token_type_hint || (token.startsWith('rt_') ? 'refresh_token' : 'access_token')

    if (typeHint === 'refresh_token') {
      // Refresh Token 폐기
      const tokenHash = await sha256Hash(token)
      const result = await revokeRefreshToken(supabase, tokenHash, 'user_request')

      // 감사 로그 기록
      await logAuditEvent(
        supabase,
        '/oauth/revoke',
        result.clientId || client_id,
        result.userId,
        typeHint,
        200,
        undefined,
        undefined,
        req
      )

      if (result.revoked) {
        console.log(`Refresh token revoked for user: ${result.userId}, client: ${result.clientId}`)
      } else {
        console.log('Token not found or already revoked')
      }
    } else if (typeHint === 'access_token') {
      // Access Token은 stateless JWT이므로 DB에서 폐기 불가
      // 클라이언트가 토큰을 삭제하고 더 이상 사용하지 않으면 됨
      // 필요 시 블랙리스트 테이블을 만들어 관리할 수 있음

      console.log('Access token revocation requested (JWT - client-side deletion)')

      // 감사 로그 기록
      await logAuditEvent(
        supabase,
        '/oauth/revoke',
        client_id,
        undefined,
        typeHint,
        200,
        undefined,
        'JWT access token (client-side deletion)',
        req
      )
    }

    // RFC 7009: 항상 200 OK 응답
    return successResponse()
  } catch (error) {
    console.error('Error revoking token:', error)

    // 감사 로그 기록
    await logAuditEvent(
      supabase,
      '/oauth/revoke',
      client_id,
      undefined,
      token_type_hint,
      500,
      'server_error',
      'Internal server error',
      req
    )

    // RFC 7009: 에러가 발생해도 200 OK 응답
    return successResponse()
  }
})
