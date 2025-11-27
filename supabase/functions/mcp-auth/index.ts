/**
 * MCP Auth Edge Function
 *
 * Minu 시리즈 서비스(Find, Frame, Build, Keep)와 Central Hub 간의
 * 안전한 인증을 위한 JWT 토큰 발급, 검증, 갱신, 폐기 기능을 제공합니다.
 *
 * @endpoint POST /functions/v1/mcp-auth/token - 토큰 발급
 * @endpoint POST /functions/v1/mcp-auth/verify - 토큰 검증
 * @endpoint POST /functions/v1/mcp-auth/refresh - 토큰 갱신
 * @endpoint POST /functions/v1/mcp-auth/revoke - 토큰 폐기
 *
 * @security HMAC-SHA256 서명, JWT (HS256)
 * @version 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

// ============================================================================
// 상수 정의
// ============================================================================

// CORS 헤더는 getCorsHeaders()로 동적 생성 (삭제됨)

// 유효한 서비스 ID 목록
const VALID_SERVICE_IDS = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'] as const
type ServiceId = typeof VALID_SERVICE_IDS[number]

// 유효한 scope 목록
const VALID_SCOPES = [
  'events:read',
  'events:write',
  'health:read',
  'health:write',
  'sync:read',
  'sync:write',
] as const
type Scope = typeof VALID_SCOPES[number]

// 토큰 만료 시간
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60 // 15분
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60 // 7일

// 타임스탬프 유효 기간 (5분)
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000

// JWT 발급자 정보
const JWT_ISSUER = 'mcp-auth'
const JWT_AUDIENCE = 'central-hub'

// ============================================================================
// 타입 정의
// ============================================================================

interface TokenRequest {
  grant_type: 'service_credentials'
  scope?: string[]
  client_id: string
}

interface RefreshRequest {
  grant_type: 'refresh_token'
  refresh_token: string
}

interface VerifyRequest {
  token: string
  required_scope?: string[]
}

interface RevokeRequest {
  token: string
  token_type_hint?: 'access_token' | 'refresh_token'
  reason?: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: 'Bearer'
  scope?: string
  issued_at: string
}

interface VerifyResponse {
  valid: boolean
  service_id?: string
  scope?: string[]
  expires_at?: string
  remaining_seconds?: number
  error?: string
  error_description?: string
  expired_at?: string
}

interface RevokeResponse {
  revoked: boolean
  token_id?: string
  revoked_at?: string
}

interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    request_id: string
    timestamp: string
  }
  hint?: string
}

interface JWTPayload {
  iss: string
  sub: string
  aud: string
  iat: number
  exp: number
  jti: string
  scope: string[]
  client_id: string
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * UUID v4 생성
 */
function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Refresh Token 생성 (랜덤 문자열)
 */
function generateRefreshToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return 'rt_' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 토큰 해시 생성 (SHA-256)
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * HMAC-SHA256 서명 검증
 */
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
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

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // timing-safe 비교
    const sig = signature.replace('sha256=', '').toLowerCase()
    const expected = expectedSignature.toLowerCase()

    if (sig.length !== expected.length) return false

    let result = 0
    for (let i = 0; i < sig.length; i++) {
      result |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    }

    return result === 0
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * 타임스탬프 검증 (5분 이내)
 */
function verifyTimestamp(timestamp: string): boolean {
  try {
    const requestTime = new Date(timestamp).getTime()
    const now = Date.now()
    return Math.abs(now - requestTime) <= TIMESTAMP_TOLERANCE_MS
  } catch {
    return false
  }
}

/**
 * scope 검증
 */
function validateScopes(scopes: string[]): Scope[] {
  return scopes.filter(s => VALID_SCOPES.includes(s as Scope)) as Scope[]
}

/**
 * 에러 응답 생성
 */
function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  hint?: string
): Response {
  const response: ErrorResponse = {
    error: {
      code,
      message,
      details,
      request_id: generateUUID(),
      timestamp: new Date().toISOString(),
    },
  }

  if (hint) {
    response.hint = hint
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * 성공 응답 생성
 */
function successResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * JWT 시크릿 키 가져오기
 */
function getJWTSecret(): Uint8Array {
  const secret = Deno.env.get('MCP_JWT_SECRET')
  if (!secret) {
    throw new Error('MCP_JWT_SECRET 환경 변수가 설정되지 않았습니다.')
  }
  return new TextEncoder().encode(secret)
}

/**
 * 서비스별 웹훅 시크릿 가져오기
 */
function getServiceSecret(serviceId: string): string | null {
  const secretEnvName = `WEBHOOK_SECRET_${serviceId.toUpperCase().replace(/-/g, '_')}`
  return Deno.env.get(secretEnvName) || null
}

// ============================================================================
// JWT 발급/검증 함수
// ============================================================================

/**
 * Access Token (JWT) 생성
 */
async function generateAccessToken(
  serviceId: string,
  clientId: string,
  scope: string[]
): Promise<{ token: string; jti: string; exp: number }> {
  const secret = getJWTSecret()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + ACCESS_TOKEN_EXPIRY_SECONDS
  const jti = generateUUID()

  const token = await new jose.SignJWT({
    scope,
    client_id: clientId,
  } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setSubject(serviceId)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setJti(jti)
    .sign(secret)

  return { token, jti, exp }
}

/**
 * JWT 검증
 */
async function verifyJWT(token: string): Promise<{
  valid: boolean
  payload?: JWTPayload
  error?: string
}> {
  try {
    const secret = getJWTSecret()
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })

    return {
      valid: true,
      payload: payload as unknown as JWTPayload,
    }
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return { valid: false, error: 'token_expired' }
    }
    if (error instanceof jose.errors.JWTInvalid) {
      return { valid: false, error: 'token_invalid' }
    }
    return { valid: false, error: 'verification_failed' }
  }
}

// ============================================================================
// 엔드포인트 핸들러
// ============================================================================

/**
 * POST /mcp-auth/token - 토큰 발급
 */
async function handleToken(
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> {
  // 헤더 검증
  const serviceId = req.headers.get('x-service-id')
  const signature = req.headers.get('x-signature')
  const timestamp = req.headers.get('x-timestamp')

  if (!serviceId) {
    return errorResponse('missing_header', 'X-Service-Id 헤더가 필요합니다.', 400)
  }

  if (!VALID_SERVICE_IDS.includes(serviceId as ServiceId)) {
    return errorResponse('invalid_service', '유효하지 않은 서비스 ID입니다.', 400)
  }

  if (!signature) {
    return errorResponse('missing_header', 'X-Signature 헤더가 필요합니다.', 400)
  }

  if (timestamp && !verifyTimestamp(timestamp)) {
    return errorResponse('invalid_timestamp', '요청 타임스탬프가 만료되었거나 유효하지 않습니다.', 401)
  }

  // 요청 본문 읽기
  const body = await req.text()
  if (!body) {
    return errorResponse('invalid_payload', '요청 본문이 비어 있습니다.', 400)
  }

  // 서비스 시크릿으로 서명 검증
  const secret = getServiceSecret(serviceId)
  if (!secret) {
    console.error(`Missing webhook secret for service: ${serviceId}`)
    return errorResponse('configuration_error', '서비스 설정 오류입니다.', 500)
  }

  const isValidSignature = await verifySignature(body, signature, secret)
  if (!isValidSignature) {
    return errorResponse('invalid_signature', 'HMAC 서명이 유효하지 않습니다.', 401)
  }

  // 요청 파싱
  let request: TokenRequest
  try {
    request = JSON.parse(body)
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 형식입니다.', 400)
  }

  // grant_type 검증
  if (request.grant_type !== 'service_credentials') {
    return errorResponse(
      'unsupported_grant_type',
      '지원하지 않는 grant_type입니다. service_credentials만 허용됩니다.',
      400
    )
  }

  // client_id 검증
  if (!request.client_id) {
    return errorResponse('invalid_payload', 'client_id가 필요합니다.', 400)
  }

  // scope 검증 및 정규화
  const requestedScope = request.scope || ['events:read', 'events:write', 'health:write']
  const validatedScope = validateScopes(requestedScope)

  if (validatedScope.length === 0) {
    return errorResponse('invalid_scope', '유효한 scope가 없습니다.', 400)
  }

  try {
    // Access Token 생성
    const { token: accessToken, jti: accessJti, exp: accessExp } =
      await generateAccessToken(serviceId, request.client_id, validatedScope)

    // Access Token 해시 저장
    const accessTokenHash = await hashToken(accessToken)
    const { error: accessInsertError } = await supabase
      .from('service_tokens')
      .insert({
        service_id: serviceId,
        client_id: request.client_id,
        token_hash: accessTokenHash,
        token_type: 'access',
        scope: validatedScope,
        expires_at: new Date(accessExp * 1000).toISOString(),
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || null,
        user_agent: req.headers.get('user-agent'),
      })

    if (accessInsertError) {
      console.error('Error inserting access token:', accessInsertError)
      throw accessInsertError
    }

    // Refresh Token 생성
    const refreshToken = generateRefreshToken()
    const refreshTokenHash = await hashToken(refreshToken)
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000)

    const { error: refreshInsertError } = await supabase
      .from('service_tokens')
      .insert({
        service_id: serviceId,
        client_id: request.client_id,
        token_hash: refreshTokenHash,
        token_type: 'refresh',
        scope: validatedScope,
        expires_at: refreshExpiresAt.toISOString(),
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || null,
        user_agent: req.headers.get('user-agent'),
      })

    if (refreshInsertError) {
      console.error('Error inserting refresh token:', refreshInsertError)
      throw refreshInsertError
    }

    // 감사 로그 기록
    await supabase.from('mcp_audit_log').insert({
      endpoint: '/mcp-auth/token',
      method: 'POST',
      service_id: serviceId,
      client_id: request.client_id,
      status_code: 200,
      success: true,
      request_id: accessJti,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: req.headers.get('user-agent'),
    })

    const response: TokenResponse = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      token_type: 'Bearer',
      scope: validatedScope.join(' '),
      issued_at: new Date().toISOString(),
    }

    console.log(`Token issued for service: ${serviceId}, client: ${request.client_id}`)
    return successResponse(response)
  } catch (error) {
    console.error('Error issuing token:', error)
    return errorResponse('internal_error', '토큰 발급 중 오류가 발생했습니다.', 500)
  }
}

/**
 * POST /mcp-auth/verify - 토큰 검증
 */
async function handleVerify(
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> {
  // 요청 본문 읽기
  let request: VerifyRequest
  try {
    request = await req.json()
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 형식입니다.', 400)
  }

  if (!request.token) {
    return errorResponse('invalid_payload', 'token이 필요합니다.', 400)
  }

  // JWT 검증
  const result = await verifyJWT(request.token)

  if (!result.valid) {
    const response: VerifyResponse = {
      valid: false,
      error: result.error,
      error_description: result.error === 'token_expired'
        ? '토큰이 만료되었습니다.'
        : '토큰이 유효하지 않습니다.',
    }
    return successResponse(response, 401)
  }

  const payload = result.payload!

  // DB에서 토큰 폐기 여부 확인
  const tokenHash = await hashToken(request.token)
  const { data: tokenRecord } = await supabase
    .from('service_tokens')
    .select('is_revoked')
    .eq('token_hash', tokenHash)
    .single()

  if (tokenRecord?.is_revoked) {
    const response: VerifyResponse = {
      valid: false,
      error: 'token_revoked',
      error_description: '토큰이 폐기되었습니다.',
    }
    return successResponse(response, 401)
  }

  // 필요 scope 확인
  if (request.required_scope && request.required_scope.length > 0) {
    const hasAllScopes = request.required_scope.every(
      s => payload.scope.includes(s)
    )

    if (!hasAllScopes) {
      const response: VerifyResponse = {
        valid: false,
        error: 'insufficient_scope',
        error_description: '필요한 권한이 없습니다.',
      }
      return successResponse(response, 403)
    }
  }

  const expiresAt = new Date(payload.exp * 1000)
  const remainingSeconds = Math.max(0, payload.exp - Math.floor(Date.now() / 1000))

  const response: VerifyResponse = {
    valid: true,
    service_id: payload.sub,
    scope: payload.scope,
    expires_at: expiresAt.toISOString(),
    remaining_seconds: remainingSeconds,
  }

  return successResponse(response)
}

/**
 * POST /mcp-auth/refresh - 토큰 갱신
 */
async function handleRefresh(
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> {
  // 요청 본문 읽기
  let request: RefreshRequest
  try {
    request = await req.json()
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 형식입니다.', 400)
  }

  if (request.grant_type !== 'refresh_token') {
    return errorResponse(
      'unsupported_grant_type',
      '지원하지 않는 grant_type입니다. refresh_token만 허용됩니다.',
      400
    )
  }

  if (!request.refresh_token) {
    return errorResponse('invalid_payload', 'refresh_token이 필요합니다.', 400)
  }

  // Refresh Token 해시로 조회
  const tokenHash = await hashToken(request.refresh_token)
  const { data: tokenRecord, error: queryError } = await supabase
    .from('service_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('token_type', 'refresh')
    .single()

  if (queryError || !tokenRecord) {
    return errorResponse('invalid_token', 'Refresh 토큰이 유효하지 않습니다.', 401)
  }

  // 폐기된 토큰 확인
  if (tokenRecord.is_revoked) {
    return errorResponse('token_revoked', 'Refresh 토큰이 폐기되었습니다.', 401)
  }

  // 만료 확인
  if (new Date(tokenRecord.expires_at) < new Date()) {
    return errorResponse('token_expired', 'Refresh 토큰이 만료되었습니다.', 401)
  }

  // Token Rotation: 이미 사용된 토큰인지 확인 (보안 위협 감지)
  if (tokenRecord.used) {
    console.warn(`Refresh token reuse detected for service: ${tokenRecord.service_id}`)

    // 해당 서비스의 모든 토큰 폐기
    await supabase
      .from('service_tokens')
      .update({ is_revoked: true, revoked_at: new Date().toISOString(), revoked_reason: 'refresh_token_reuse' })
      .eq('service_id', tokenRecord.service_id)

    // 감사 로그 기록
    await supabase.from('mcp_audit_log').insert({
      endpoint: '/mcp-auth/refresh',
      method: 'POST',
      service_id: tokenRecord.service_id,
      client_id: tokenRecord.client_id,
      status_code: 401,
      success: false,
      error_code: 'refresh_token_reuse',
      request_id: generateUUID(),
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: req.headers.get('user-agent'),
    })

    return errorResponse(
      'refresh_token_reuse',
      '보안 위협 감지: Refresh 토큰 재사용이 감지되었습니다. 모든 세션이 종료되었습니다.',
      401
    )
  }

  try {
    // 기존 Refresh Token을 사용됨으로 표시
    await supabase
      .from('service_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id)

    // 새 Access Token 생성
    const { token: accessToken, jti: accessJti, exp: accessExp } =
      await generateAccessToken(
        tokenRecord.service_id,
        tokenRecord.client_id,
        tokenRecord.scope
      )

    // Access Token 해시 저장
    const accessTokenHash = await hashToken(accessToken)
    await supabase.from('service_tokens').insert({
      service_id: tokenRecord.service_id,
      client_id: tokenRecord.client_id,
      token_hash: accessTokenHash,
      token_type: 'access',
      scope: tokenRecord.scope,
      expires_at: new Date(accessExp * 1000).toISOString(),
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: req.headers.get('user-agent'),
    })

    // 새 Refresh Token 생성
    const newRefreshToken = generateRefreshToken()
    const newRefreshTokenHash = await hashToken(newRefreshToken)
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000)

    await supabase.from('service_tokens').insert({
      service_id: tokenRecord.service_id,
      client_id: tokenRecord.client_id,
      token_hash: newRefreshTokenHash,
      token_type: 'refresh',
      scope: tokenRecord.scope,
      expires_at: refreshExpiresAt.toISOString(),
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: req.headers.get('user-agent'),
    })

    // 감사 로그 기록
    await supabase.from('mcp_audit_log').insert({
      endpoint: '/mcp-auth/refresh',
      method: 'POST',
      service_id: tokenRecord.service_id,
      client_id: tokenRecord.client_id,
      status_code: 200,
      success: true,
      request_id: accessJti,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: req.headers.get('user-agent'),
    })

    const response: TokenResponse = {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      token_type: 'Bearer',
      issued_at: new Date().toISOString(),
    }

    console.log(`Token refreshed for service: ${tokenRecord.service_id}`)
    return successResponse(response)
  } catch (error) {
    console.error('Error refreshing token:', error)
    return errorResponse('internal_error', '토큰 갱신 중 오류가 발생했습니다.', 500)
  }
}

/**
 * POST /mcp-auth/revoke - 토큰 폐기
 */
async function handleRevoke(
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> {
  // Authorization 헤더에서 토큰 추출
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('unauthorized', 'Authorization 헤더가 필요합니다.', 401)
  }

  const bearerToken = authHeader.substring(7)

  // 요청자의 토큰 검증
  const verifyResult = await verifyJWT(bearerToken)
  if (!verifyResult.valid) {
    return errorResponse('unauthorized', '인증에 실패했습니다.', 401)
  }

  // 요청 본문 읽기
  let request: RevokeRequest
  try {
    request = await req.json()
  } catch {
    return errorResponse('invalid_payload', '유효하지 않은 JSON 형식입니다.', 400)
  }

  if (!request.token) {
    return errorResponse('invalid_payload', 'token이 필요합니다.', 400)
  }

  try {
    // 폐기할 토큰의 해시 계산
    const tokenHash = await hashToken(request.token)

    // 토큰 유형 힌트 활용
    const tokenType = request.token_type_hint ||
      (request.token.startsWith('rt_') ? 'refresh' : 'access')

    // 토큰 폐기
    const { data: revokedToken, error: revokeError } = await supabase
      .from('service_tokens')
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_reason: request.reason || 'user_request',
      })
      .eq('token_hash', tokenHash)
      .select('id, service_id, client_id')
      .single()

    if (revokeError) {
      // 토큰이 DB에 없어도 성공으로 처리 (RFC 7009)
      console.log('Token not found or already revoked')
    }

    // 감사 로그 기록
    await supabase.from('mcp_audit_log').insert({
      endpoint: '/mcp-auth/revoke',
      method: 'POST',
      service_id: revokedToken?.service_id || verifyResult.payload?.sub,
      client_id: revokedToken?.client_id || verifyResult.payload?.client_id,
      status_code: 200,
      success: true,
      request_id: generateUUID(),
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: req.headers.get('user-agent'),
    })

    const response: RevokeResponse = {
      revoked: true,
      token_id: revokedToken?.id,
      revoked_at: new Date().toISOString(),
    }

    console.log(`Token revoked: ${revokedToken?.id || 'unknown'}`)
    return successResponse(response)
  } catch (error) {
    console.error('Error revoking token:', error)
    return errorResponse('internal_error', '토큰 폐기 중 오류가 발생했습니다.', 500)
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
    return errorResponse('method_not_allowed', '허용되지 않는 메서드입니다.', 405)
  }

  // URL 파싱
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)

  // 엔드포인트 결정 (functions/v1/mcp-auth/xxx 형식)
  const endpoint = pathParts[pathParts.length - 1]

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return errorResponse('configuration_error', '서버 설정 오류입니다.', 500)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 엔드포인트별 라우팅
  switch (endpoint) {
    case 'token':
      return handleToken(req, supabase)

    case 'verify':
      return handleVerify(req, supabase)

    case 'refresh':
      return handleRefresh(req, supabase)

    case 'revoke':
      return handleRevoke(req, supabase)

    default:
      return errorResponse(
        'not_found',
        `알 수 없는 엔드포인트: ${endpoint}`,
        404,
        undefined,
        '유효한 엔드포인트: /token, /verify, /refresh, /revoke'
      )
  }
})
