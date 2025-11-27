/**
 * OAuth 2.0 Authorization Endpoint
 *
 * RFC 6749 (OAuth 2.0) + RFC 7636 (PKCE) 표준을 따르는 인증 엔드포인트입니다.
 * Minu 서비스가 사용자 인증 및 동의를 받아 Authorization Code를 발급합니다.
 *
 * @endpoint GET /functions/v1/oauth-authorize
 * @standard RFC 6749, RFC 7636 (PKCE)
 * @version 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// ============================================================================
// 상수 정의
// ============================================================================

// CORS 헤더는 getCorsHeaders()로 동적 생성 (삭제됨)

// Authorization Code 만료 시간 (10분)
const AUTHORIZATION_CODE_EXPIRY_SECONDS = 10 * 60

// 유효한 response_type
const VALID_RESPONSE_TYPES = ['code'] as const
type ResponseType = typeof VALID_RESPONSE_TYPES[number]

// 유효한 code_challenge_method
const VALID_CODE_CHALLENGE_METHODS = ['S256'] as const
type CodeChallengeMethod = typeof VALID_CODE_CHALLENGE_METHODS[number]

// 유효한 scope
const VALID_SCOPES = ['profile', 'subscription:read', 'subscription:write'] as const
type Scope = typeof VALID_SCOPES[number]

// ============================================================================
// 타입 정의
// ============================================================================

interface AuthorizeParams {
  response_type: ResponseType
  client_id: string
  redirect_uri: string
  scope: string
  state?: string
  code_challenge: string
  code_challenge_method: CodeChallengeMethod
}

interface OAuthClient {
  id: string
  client_id: string
  client_name: string
  redirect_uris: string[]
  require_pkce: boolean
  allowed_scopes: string[]
  is_active: boolean
}

interface ErrorResponse {
  error: string
  error_description: string
  error_uri?: string
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 랜덤 Authorization Code 생성
 */
function generateAuthorizationCode(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return 'ac_' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 에러 응답 생성 (OAuth 2.0 표준)
 */
function errorResponse(
  error: string,
  errorDescription: string,
  status = 400
): Response {
  const response: ErrorResponse = {
    error,
    error_description: errorDescription,
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * 리다이렉트 에러 응답 (RFC 6749 4.1.2.1)
 */
function redirectError(
  redirectUri: string,
  error: string,
  errorDescription: string,
  state?: string
): Response {
  const url = new URL(redirectUri)
  url.searchParams.set('error', error)
  url.searchParams.set('error_description', errorDescription)
  if (state) {
    url.searchParams.set('state', state)
  }

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': url.toString(),
    },
  })
}

/**
 * scope 검증 및 필터링
 */
function validateScopes(requestedScopes: string[], allowedScopes: string[]): string[] {
  const scopes = requestedScopes
    .filter(s => VALID_SCOPES.includes(s as Scope))
    .filter(s => allowedScopes.includes(s))

  return scopes
}

/**
 * 클라이언트 검증
 */
async function verifyClient(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  redirectUri: string
): Promise<{ valid: boolean; client?: OAuthClient; error?: string }> {
  const { data: client, error } = await supabase
    .from('oauth_clients')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single()

  if (error || !client) {
    return { valid: false, error: 'invalid_client' }
  }

  // redirect_uri 검증
  if (!client.redirect_uris.includes(redirectUri)) {
    return { valid: false, error: 'invalid_redirect_uri' }
  }

  return { valid: true, client: client as OAuthClient }
}

/**
 * 사용자 인증 상태 확인
 */
async function checkUserAuth(
  supabase: ReturnType<typeof createClient>,
  authHeader?: string | null
): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'missing_auth' }
  }

  const token = authHeader.substring(7)

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return { authenticated: false, error: 'invalid_token' }
  }

  return { authenticated: true, userId: user.id }
}

/**
 * Authorization Code 저장
 */
async function storeAuthorizationCode(
  supabase: ReturnType<typeof createClient>,
  code: string,
  clientId: string,
  userId: string,
  redirectUri: string,
  scope: string[],
  codeChallenge: string,
  codeChallengeMethod: string
): Promise<{ success: boolean; error?: string }> {
  const expiresAt = new Date(Date.now() + AUTHORIZATION_CODE_EXPIRY_SECONDS * 1000)

  const { error } = await supabase
    .from('authorization_codes')
    .insert({
      code,
      client_id: clientId,
      user_id: userId,
      redirect_uri: redirectUri,
      scope,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    console.error('Error storing authorization code:', error)
    return { success: false, error: 'server_error' }
  }

  return { success: true }
}

/**
 * 감사 로그 기록
 */
async function logAuditEvent(
  supabase: ReturnType<typeof createClient>,
  endpoint: string,
  method: string,
  clientId: string,
  userId: string | undefined,
  requestParams: Record<string, unknown>,
  responseStatus: number,
  errorCode?: string,
  errorDescription?: string,
  req?: Request
): Promise<void> {
  await supabase.from('oauth_audit_log').insert({
    endpoint,
    method,
    client_id: clientId,
    user_id: userId || null,
    request_params: requestParams,
    response_status: responseStatus,
    error_code: errorCode || null,
    error_description: errorDescription || null,
    ip_address: req?.headers.get('x-forwarded-for')?.split(',')[0] || null,
    user_agent: req?.headers.get('user-agent') || null,
  })
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

  // GET만 허용
  if (req.method !== 'GET') {
    return errorResponse('method_not_allowed', 'GET 메서드만 허용됩니다.', 405)
  }

  // URL 파라미터 파싱
  const url = new URL(req.url)
  const params = url.searchParams

  const responseType = params.get('response_type')
  const clientId = params.get('client_id')
  const redirectUri = params.get('redirect_uri')
  const scope = params.get('scope')
  const state = params.get('state') || undefined
  const codeChallenge = params.get('code_challenge')
  const codeChallengeMethod = params.get('code_challenge_method')

  // 필수 파라미터 검증
  if (!responseType || !clientId || !redirectUri || !scope) {
    return errorResponse(
      'invalid_request',
      '필수 파라미터가 누락되었습니다: response_type, client_id, redirect_uri, scope'
    )
  }

  // response_type 검증
  if (!VALID_RESPONSE_TYPES.includes(responseType as ResponseType)) {
    return errorResponse('unsupported_response_type', 'response_type은 "code"만 지원됩니다.')
  }

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return errorResponse('server_error', '서버 설정 오류입니다.', 500)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 클라이언트 검증
  const clientVerification = await verifyClient(supabase, clientId, redirectUri)

  if (!clientVerification.valid || !clientVerification.client) {
    await logAuditEvent(
      supabase,
      '/oauth/authorize',
      'GET',
      clientId,
      undefined,
      { response_type: responseType, client_id: clientId, redirect_uri: redirectUri },
      400,
      clientVerification.error,
      'Invalid client or redirect URI',
      req
    )

    return errorResponse(
      clientVerification.error || 'invalid_client',
      '클라이언트가 유효하지 않거나 redirect_uri가 허용되지 않습니다.'
    )
  }

  const client = clientVerification.client

  // PKCE 필수 여부 확인
  if (client.require_pkce && (!codeChallenge || !codeChallengeMethod)) {
    return redirectError(
      redirectUri,
      'invalid_request',
      'PKCE가 필수입니다: code_challenge, code_challenge_method',
      state
    )
  }

  // code_challenge_method 검증
  if (codeChallengeMethod && !VALID_CODE_CHALLENGE_METHODS.includes(codeChallengeMethod as CodeChallengeMethod)) {
    return redirectError(
      redirectUri,
      'invalid_request',
      'code_challenge_method는 "S256"만 지원됩니다.',
      state
    )
  }

  // scope 검증
  const requestedScopes = scope.split(' ')
  const validatedScopes = validateScopes(requestedScopes, client.allowed_scopes)

  if (validatedScopes.length === 0) {
    return redirectError(
      redirectUri,
      'invalid_scope',
      '유효한 scope가 없습니다.',
      state
    )
  }

  // 사용자 인증 확인
  const authHeader = req.headers.get('authorization')
  const userAuth = await checkUserAuth(supabase, authHeader)

  if (!userAuth.authenticated) {
    // 로그인 필요 - 프론트엔드 로그인 페이지로 리다이렉트
    const loginUrl = new URL(Deno.env.get('OAUTH_LOGIN_PAGE_URL') || 'https://www.ideaonaction.ai/login')
    loginUrl.searchParams.set('client_id', clientId)
    loginUrl.searchParams.set('redirect_uri', redirectUri)
    loginUrl.searchParams.set('scope', validatedScopes.join(' '))
    if (state) loginUrl.searchParams.set('state', state)
    if (codeChallenge) loginUrl.searchParams.set('code_challenge', codeChallenge)
    if (codeChallengeMethod) loginUrl.searchParams.set('code_challenge_method', codeChallengeMethod)

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': loginUrl.toString(),
      },
    })
  }

  const userId = userAuth.userId!

  // TODO: 동의 화면 표시 (현재는 즉시 승인)
  // 실제 프로덕션에서는 사용자가 scope에 동의하는 화면을 표시해야 합니다.

  // Authorization Code 생성
  const authorizationCode = generateAuthorizationCode()

  // Authorization Code 저장
  const storeResult = await storeAuthorizationCode(
    supabase,
    authorizationCode,
    clientId,
    userId,
    redirectUri,
    validatedScopes,
    codeChallenge || '',
    codeChallengeMethod || ''
  )

  if (!storeResult.success) {
    await logAuditEvent(
      supabase,
      '/oauth/authorize',
      'GET',
      clientId,
      userId,
      { response_type: responseType, scope: validatedScopes },
      500,
      'server_error',
      'Failed to store authorization code',
      req
    )

    return redirectError(
      redirectUri,
      'server_error',
      '인증 코드 생성 중 오류가 발생했습니다.',
      state
    )
  }

  // 감사 로그 기록
  await logAuditEvent(
    supabase,
    '/oauth/authorize',
    'GET',
    clientId,
    userId,
    { response_type: responseType, scope: validatedScopes },
    302,
    undefined,
    undefined,
    req
  )

  // 성공: 클라이언트에게 code와 state 반환 (리다이렉트)
  const callbackUrl = new URL(redirectUri)
  callbackUrl.searchParams.set('code', authorizationCode)
  if (state) {
    callbackUrl.searchParams.set('state', state)
  }

  console.log(`Authorization code issued for client: ${clientId}, user: ${userId}`)

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': callbackUrl.toString(),
    },
  })
})
