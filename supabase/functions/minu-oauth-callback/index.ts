/**
 * Minu OAuth Callback Edge Function
 *
 * Minu 서비스에서 OAuth 인증 후 콜백을 처리합니다.
 *
 * @endpoint GET /functions/v1/minu-oauth-callback
 * @version 1.0.0
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createResponse, createErrorResponse } from '../_shared/response.ts'
import { createMinuClient, hashToken } from '../_shared/minu-client.ts'
import type {
  MinuOAuthCallbackParams,
  MinuOAuthState,
  MinuService,
} from '../_shared/minu.types.ts'

// Supabase 클라이언트 생성
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // GET 요청만 허용
  if (req.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405, origin)
  }

  try {
    // 쿼리 파라미터 파싱
    const url = new URL(req.url)
    const params: MinuOAuthCallbackParams = {
      code: url.searchParams.get('code') || undefined,
      state: url.searchParams.get('state') || undefined,
      error: url.searchParams.get('error') || undefined,
      error_description: url.searchParams.get('error_description') || undefined,
    }

    // OAuth 에러 처리
    if (params.error) {
      console.error('OAuth error:', params.error, params.error_description)
      return redirectWithError(
        params.error,
        params.error_description || 'OAuth 인증 중 오류가 발생했습니다.',
        corsHeaders
      )
    }

    // 필수 파라미터 검증
    if (!params.code || !params.state) {
      return redirectWithError(
        'invalid_request',
        'code와 state가 필요합니다.',
        corsHeaders
      )
    }

    // State 디코딩 및 검증
    let stateData: MinuOAuthState
    try {
      const decoded = atob(params.state)
      stateData = JSON.parse(decoded)
    } catch {
      return redirectWithError(
        'invalid_state',
        '유효하지 않은 state입니다.',
        corsHeaders
      )
    }

    // 세션 조회 및 검증
    const { data: session, error: sessionError } = await supabase
      .from('minu_oauth_sessions')
      .select('*')
      .eq('state', params.state)
      .is('used_at', null)
      .single()

    if (sessionError || !session) {
      console.error('Session not found or already used:', sessionError)
      return redirectWithError(
        'invalid_session',
        '세션이 만료되었거나 이미 사용되었습니다.',
        corsHeaders
      )
    }

    // 세션 만료 확인
    if (new Date(session.expires_at) < new Date()) {
      return redirectWithError(
        'session_expired',
        '세션이 만료되었습니다. 다시 시도해주세요.',
        corsHeaders
      )
    }

    // Minu API로 토큰 교환
    const service = session.service as MinuService
    const minuClient = createMinuClient(service)

    const tokenResponse = await minuClient.exchangeCodeForToken(
      params.code,
      session.code_verifier,
      session.redirect_uri
    )

    // 사용자 정보 조회
    const userInfo = await minuClient.getUserInfo(tokenResponse.access_token)

    // 구독 정보 조회
    const subscription = await minuClient.getSubscription(tokenResponse.access_token)

    // 세션 사용 처리
    await supabase
      .from('minu_oauth_sessions')
      .update({ used_at: new Date().toISOString() })
      .eq('id', session.id)

    // 사용자 존재 여부 확인 및 생성/업데이트
    let userId = session.user_id

    if (!userId) {
      // 이메일로 기존 사용자 찾기
      const { data: existingUser } = await supabase.auth.admin.listUsers()
      const matchedUser = existingUser?.users?.find(u => u.email === userInfo.email)

      if (matchedUser) {
        userId = matchedUser.id
      } else {
        // 새 사용자 생성
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: userInfo.email,
          email_confirm: true,
          user_metadata: {
            name: userInfo.name,
            avatar_url: userInfo.avatar_url,
            minu_id: userInfo.id,
          },
        })

        if (createError || !newUser.user) {
          console.error('Failed to create user:', createError)
          return redirectWithError(
            'user_creation_failed',
            '사용자 생성에 실패했습니다.',
            corsHeaders
          )
        }

        userId = newUser.user.id
      }
    }

    // 토큰 저장 (해시)
    const accessTokenHash = await hashToken(tokenResponse.access_token)
    const refreshTokenHash = tokenResponse.refresh_token
      ? await hashToken(tokenResponse.refresh_token)
      : null

    await supabase
      .from('minu_tokens')
      .upsert({
        user_id: userId,
        service,
        access_token_hash: accessTokenHash,
        refresh_token_hash: refreshTokenHash,
        access_token_expires_at: new Date(
          Date.now() + tokenResponse.expires_in * 1000
        ).toISOString(),
        refresh_token_expires_at: tokenResponse.refresh_token
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        scope: tokenResponse.scope?.split(' ') || [],
      }, {
        onConflict: 'user_id,service',
      })

    // 구독 정보 동기화
    if (subscription) {
      await supabase.rpc('upsert_minu_subscription', {
        p_user_id: userId,
        p_service: service,
        p_plan_id: subscription.plan_id,
        p_plan_name: subscription.plan_name,
        p_status: subscription.status,
        p_features: subscription.features,
        p_limits: subscription.limits,
        p_current_period_start: subscription.current_period_start,
        p_current_period_end: subscription.current_period_end,
        p_minu_subscription_id: subscription.id,
      })
    }

    // Central Hub 세션 생성
    const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userInfo.email,
      options: {
        redirectTo: stateData.redirect_uri,
      },
    })

    if (signInError || !signInData) {
      console.error('Failed to generate magic link:', signInError)
      return redirectWithError(
        'session_creation_failed',
        '세션 생성에 실패했습니다.',
        corsHeaders
      )
    }

    // 프론트엔드로 리다이렉트 (토큰 파라미터 포함)
    const redirectUrl = new URL(stateData.redirect_uri)
    redirectUrl.searchParams.set('access_token', tokenResponse.access_token)
    redirectUrl.searchParams.set('service', service)
    redirectUrl.searchParams.set('user_id', userId)

    if (subscription) {
      redirectUrl.searchParams.set('plan', subscription.plan_name)
      redirectUrl.searchParams.set('status', subscription.status)
    }

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: redirectUrl.toString(),
      },
    })
  } catch (error) {
    console.error('OAuth callback error:', error)
    return redirectWithError(
      'server_error',
      error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      {}
    )
  }
})

/**
 * 에러와 함께 리다이렉트
 */
function redirectWithError(
  error: string,
  description: string,
  headers: Record<string, string>
): Response {
  // 에러 페이지 URL 또는 기본 URL
  const errorUrl = new URL(Deno.env.get('OAUTH_ERROR_PAGE_URL') || 'https://www.ideaonaction.ai/auth/error')
  errorUrl.searchParams.set('error', error)
  errorUrl.searchParams.set('error_description', description)

  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      Location: errorUrl.toString(),
    },
  })
}
