/**
 * OAuth 2.0 Token Endpoint
 *
 * RFC 6749 (OAuth 2.0) + RFC 7636 (PKCE) 표준을 따르는 토큰 발급 엔드포인트입니다.
 * Authorization Code를 검증하고 Access Token과 Refresh Token을 발급합니다.
 *
 * @endpoint POST /functions/v1/oauth-token
 * @standard RFC 6749, RFC 7636 (PKCE)
 * @version 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createSession } from '../session-api/index.ts'

// ============================================================================
// 상수 정의
// ============================================================================

// CORS 헤더는 getCorsHeaders()로 동적 생성 (삭제됨)

// 토큰 만료 시간
const ACCESS_TOKEN_EXPIRY_SECONDS = 60 * 60 // 1시간
const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60 // 30일

// JWT 발급자 정보
const JWT_ISSUER = 'https://www.ideaonaction.ai'
const JWT_AUDIENCE = ['minu.best']

// 유효한 grant_type
const VALID_GRANT_TYPES = ['authorization_code', 'refresh_token'] as const
type GrantType = typeof VALID_GRANT_TYPES[number]

// ============================================================================
// 타입 정의
// ============================================================================

interface TokenRequest {
  grant_type: GrantType
  code?: string
  redirect_uri?: string
  client_id: string
  client_secret?: string
  code_verifier?: string
  refresh_token?: string
}

interface TokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token?: string
  scope: string
}

interface ErrorResponse {
  error: string
  error_description: string
}

interface JWTPayload {
  sub: string // user_id
  iss: string
  aud: string[]
  exp: number
  iat: number
  scope: string
  subscription?: {
    plan_id: string
    plan_name: string
    status: string
    expires_at: string
    services: string[]
  }
}

interface AuthorizationCodeRecord {
  id: string
  code: string
  client_id: string
  user_id: string
  redirect_uri: string
  scope: string[]
  code_challenge: string
  code_challenge_method: string
  is_used: boolean
  expires_at: string
}

interface RefreshTokenRecord {
  id: string
  token_hash: string
  client_id: string
  user_id: string
  scope: string[]
  is_revoked: boolean
  expires_at: string
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 랜덤 Refresh Token 생성
 */
function generateRefreshToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return 'rt_' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

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
 * PKCE code_verifier 검증
 */
async function verifyPKCE(codeVerifier: string, codeChallenge: string, method: string): Promise<boolean> {
  if (method === 'S256') {
    const hash = await sha256Hash(codeVerifier)
    // Base64URL 인코딩 비교 (간단히 해시 비교로 구현)
    return hash === codeChallenge || btoa(hash).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '') === codeChallenge
  }

  // plain은 보안상 권장하지 않음
  return codeVerifier === codeChallenge
}

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
 * Access Token (JWT) 생성
 */
async function generateAccessToken(
  userId: string,
  clientId: string,
  scope: string[],
  subscription?: { plan_id: string; plan_name: string; status: string }
): Promise<string> {
  const secret = getJWTSecretKey()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + ACCESS_TOKEN_EXPIRY_SECONDS

  const payload: Record<string, unknown> = {
    scope: scope.join(' '),
  }

  if (subscription) {
    payload.subscription = subscription
  }

  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setSubject(userId)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret)

  return token
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
 * 성공 응답 생성
 */
function successResponse(data: TokenResponse): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * 감사 로그 기록
 */
async function logAuditEvent(
  supabase: ReturnType<typeof createClient>,
  endpoint: string,
  clientId: string,
  userId: string | undefined,
  grantType: string,
  responseStatus: number,
  errorCode?: string,
  errorDescription?: string,
  req?: Request
): Promise<void> {
  await supabase.from('oauth_audit_log').insert({
    endpoint,
    method: 'POST',
    client_id: clientId,
    user_id: userId || null,
    request_params: { grant_type: grantType },
    response_status: responseStatus,
    error_code: errorCode || null,
    error_description: errorDescription || null,
    ip_address: req?.headers.get('x-forwarded-for')?.split(',')[0] || null,
    user_agent: req?.headers.get('user-agent') || null,
  })
}

/**
 * 사용자 구독 정보 조회
 */
async function getUserSubscription(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ plan_id: string; plan_name: string; status: string; expires_at: string; services: string[] } | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select(`
      id,
      status,
      plan_id,
      ends_at,
      subscription_plans (
        plan_name
      ),
      services (
        slug
      )
    `)
    .eq('user_id', userId)
    .in('status', ['trial', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  // 서비스 슬러그를 추출하여 배열로 변환
  const services = Array.isArray(data.services)
    ? data.services.map((s: { slug?: string }) => s.slug).filter(Boolean)
    : []

  return {
    plan_id: data.plan_id,
    plan_name: (data.subscription_plans as { plan_name?: string })?.plan_name || 'Basic',
    status: data.status,
    expires_at: data.ends_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 기본값: 1년 후
    services: services as string[],
  }
}

// ============================================================================
// Grant Type 핸들러
// ============================================================================

/**
 * Authorization Code Grant
 */
async function handleAuthorizationCodeGrant(
  supabase: ReturnType<typeof createClient>,
  request: TokenRequest,
  req: Request
): Promise<Response> {
  const { code, redirect_uri, client_id, code_verifier } = request

  if (!code || !redirect_uri || !code_verifier) {
    return errorResponse('invalid_request', '필수 파라미터가 누락되었습니다: code, redirect_uri, code_verifier')
  }

  // Authorization Code 조회
  const { data: authCode, error: codeError } = await supabase
    .from('authorization_codes')
    .select('*')
    .eq('code', code)
    .eq('client_id', client_id)
    .single()

  if (codeError || !authCode) {
    await logAuditEvent(supabase, '/oauth/token', client_id, undefined, 'authorization_code', 400, 'invalid_grant', 'Invalid authorization code', req)
    return errorResponse('invalid_grant', '인증 코드가 유효하지 않습니다.')
  }

  const codeRecord = authCode as unknown as AuthorizationCodeRecord

  // 코드 사용 여부 확인
  if (codeRecord.is_used) {
    await logAuditEvent(supabase, '/oauth/token', client_id, codeRecord.user_id, 'authorization_code', 400, 'invalid_grant', 'Code already used', req)
    return errorResponse('invalid_grant', '인증 코드가 이미 사용되었습니다.')
  }

  // 코드 만료 확인
  if (new Date(codeRecord.expires_at) < new Date()) {
    await logAuditEvent(supabase, '/oauth/token', client_id, codeRecord.user_id, 'authorization_code', 400, 'invalid_grant', 'Code expired', req)
    return errorResponse('invalid_grant', '인증 코드가 만료되었습니다.')
  }

  // redirect_uri 검증
  if (codeRecord.redirect_uri !== redirect_uri) {
    await logAuditEvent(supabase, '/oauth/token', client_id, codeRecord.user_id, 'authorization_code', 400, 'invalid_grant', 'Redirect URI mismatch', req)
    return errorResponse('invalid_grant', 'redirect_uri가 일치하지 않습니다.')
  }

  // PKCE 검증
  if (codeRecord.code_challenge) {
    const isValidPKCE = await verifyPKCE(code_verifier, codeRecord.code_challenge, codeRecord.code_challenge_method)
    if (!isValidPKCE) {
      await logAuditEvent(supabase, '/oauth/token', client_id, codeRecord.user_id, 'authorization_code', 400, 'invalid_grant', 'PKCE verification failed', req)
      return errorResponse('invalid_grant', 'PKCE 검증에 실패했습니다.')
    }
  }

  // 코드를 사용됨으로 표시
  await supabase
    .from('authorization_codes')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('id', codeRecord.id)

  // 사용자 구독 정보 조회
  const subscription = await getUserSubscription(supabase, codeRecord.user_id)

  // Access Token 생성
  const accessToken = await generateAccessToken(
    codeRecord.user_id,
    client_id,
    codeRecord.scope,
    subscription || undefined
  )

  // Refresh Token 생성
  const refreshToken = generateRefreshToken()
  const refreshTokenHash = await sha256Hash(refreshToken)
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000)

  const { data: refreshTokenData } = await supabase.from('oauth_refresh_tokens').insert({
    token_hash: refreshTokenHash,
    client_id,
    user_id: codeRecord.user_id,
    scope: codeRecord.scope,
    expires_at: refreshExpiresAt.toISOString(),
  }).select('id').single()

  // 세션 생성
  if (refreshTokenData) {
    await createSession(supabase, codeRecord.user_id, refreshTokenData.id, req)
  }

  // 감사 로그 기록
  await logAuditEvent(supabase, '/oauth/token', client_id, codeRecord.user_id, 'authorization_code', 200, undefined, undefined, req)

  const response: TokenResponse = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
    refresh_token: refreshToken,
    scope: codeRecord.scope.join(' '),
  }

  console.log(`Access token issued for user: ${codeRecord.user_id}, client: ${client_id}`)

  return successResponse(response)
}

/**
 * Refresh Token Grant
 */
async function handleRefreshTokenGrant(
  supabase: ReturnType<typeof createClient>,
  request: TokenRequest,
  req: Request
): Promise<Response> {
  const { refresh_token, client_id } = request

  if (!refresh_token) {
    return errorResponse('invalid_request', '필수 파라미터가 누락되었습니다: refresh_token')
  }

  // Refresh Token 해시로 조회
  const tokenHash = await sha256Hash(refresh_token)
  const { data: tokenRecord, error: queryError } = await supabase
    .from('oauth_refresh_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('client_id', client_id)
    .single()

  if (queryError || !tokenRecord) {
    await logAuditEvent(supabase, '/oauth/token', client_id, undefined, 'refresh_token', 400, 'invalid_grant', 'Invalid refresh token', req)
    return errorResponse('invalid_grant', 'Refresh 토큰이 유효하지 않습니다.')
  }

  const refreshRecord = tokenRecord as unknown as RefreshTokenRecord

  // 폐기 여부 확인
  if (refreshRecord.is_revoked) {
    await logAuditEvent(supabase, '/oauth/token', client_id, refreshRecord.user_id, 'refresh_token', 400, 'invalid_grant', 'Token revoked', req)
    return errorResponse('invalid_grant', 'Refresh 토큰이 폐기되었습니다.')
  }

  // 만료 확인
  if (new Date(refreshRecord.expires_at) < new Date()) {
    await logAuditEvent(supabase, '/oauth/token', client_id, refreshRecord.user_id, 'refresh_token', 400, 'invalid_grant', 'Token expired', req)
    return errorResponse('invalid_grant', 'Refresh 토큰이 만료되었습니다.')
  }

  // 마지막 사용 시간 업데이트
  await supabase
    .from('oauth_refresh_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', refreshRecord.id)

  // 사용자 구독 정보 조회
  const subscription = await getUserSubscription(supabase, refreshRecord.user_id)

  // 새 Access Token 생성
  const accessToken = await generateAccessToken(
    refreshRecord.user_id,
    client_id,
    refreshRecord.scope,
    subscription || undefined
  )

  // 감사 로그 기록
  await logAuditEvent(supabase, '/oauth/token', client_id, refreshRecord.user_id, 'refresh_token', 200, undefined, undefined, req)

  const response: TokenResponse = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
    scope: refreshRecord.scope.join(' '),
  }

  console.log(`Access token refreshed for user: ${refreshRecord.user_id}, client: ${client_id}`)

  return successResponse(response)
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
  let request: TokenRequest
  try {
    request = await req.json()
  } catch {
    return errorResponse('invalid_request', '유효하지 않은 JSON 형식입니다.')
  }

  const { grant_type, client_id } = request

  // 필수 파라미터 검증
  if (!grant_type || !client_id) {
    return errorResponse('invalid_request', '필수 파라미터가 누락되었습니다: grant_type, client_id')
  }

  // grant_type 검증
  if (!VALID_GRANT_TYPES.includes(grant_type as GrantType)) {
    return errorResponse('unsupported_grant_type', '지원하지 않는 grant_type입니다.')
  }

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return errorResponse('server_error', '서버 설정 오류입니다.', 500)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Grant Type별 처리
  if (grant_type === 'authorization_code') {
    return handleAuthorizationCodeGrant(supabase, request, req)
  } else if (grant_type === 'refresh_token') {
    return handleRefreshTokenGrant(supabase, request, req)
  }

  return errorResponse('unsupported_grant_type', '지원하지 않는 grant_type입니다.')
})
