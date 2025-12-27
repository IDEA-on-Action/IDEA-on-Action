/**
 * Minu Token Exchange Edge Function
 *
 * Minu SSO 토큰을 Central Hub 토큰으로 교환합니다.
 *
 * @endpoint POST /functions/v1/minu-token-exchange
 * @version 1.0.0
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createResponse, createErrorResponse } from '../_shared/response.ts'
import { createMinuClient, hashToken } from '../_shared/minu-client.ts'
import { JWT_ISSUER, JWT_AUDIENCE, ACCESS_TOKEN_EXPIRY_SECONDS, REFRESH_TOKEN_EXPIRY_SECONDS } from '../_shared/constants.ts'
import type {
  MinuTokenExchangeRequest,
  MinuTokenExchangeResponse,
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

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405, origin)
  }

  try {
    // 요청 본문 파싱
    const body: MinuTokenExchangeRequest = await req.json()

    // 필수 필드 검증
    if (!body.minu_access_token) {
      return createErrorResponse('minu_access_token이 필요합니다.', 400, origin)
    }

    if (!body.service || !['find', 'frame', 'build', 'keep'].includes(body.service)) {
      return createErrorResponse('유효한 service가 필요합니다.', 400, origin)
    }

    const service = body.service as MinuService

    // Minu 토큰 검증 및 사용자 정보 조회
    const minuClient = createMinuClient(service)

    let userInfo
    try {
      userInfo = await minuClient.getUserInfo(body.minu_access_token)
    } catch (error) {
      console.error('Failed to validate Minu token:', error)
      return createErrorResponse('유효하지 않은 Minu 토큰입니다.', 401, origin)
    }

    // 구독 정보 조회
    const subscription = await minuClient.getSubscription(body.minu_access_token)

    // 사용자 존재 여부 확인
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    let user = existingUsers?.users?.find(u => u.email === userInfo.email)

    if (!user) {
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
        return createErrorResponse('사용자 생성에 실패했습니다.', 500, origin)
      }

      user = newUser.user
    }

    // Minu 토큰 저장
    const minuTokenHash = await hashToken(body.minu_access_token)

    await supabase
      .from('minu_tokens')
      .upsert({
        user_id: user.id,
        service,
        access_token_hash: minuTokenHash,
        access_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1시간 가정
        scope: ['read', 'write'],
      }, {
        onConflict: 'user_id,service',
      })

    // 구독 정보 동기화
    if (subscription) {
      await supabase.rpc('upsert_minu_subscription', {
        p_user_id: user.id,
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

    // Central Hub JWT 토큰 생성
    const jwtSecret = Deno.env.get('MCP_JWT_SECRET')
    if (!jwtSecret) {
      console.error('MCP_JWT_SECRET not configured')
      return createErrorResponse('서버 설정 오류', 500, origin)
    }

    const secretKey = new TextEncoder().encode(jwtSecret)
    const tokenId = crypto.randomUUID()

    const accessToken = await new jose.SignJWT({
      sub: user.id,
      email: userInfo.email,
      name: userInfo.name,
      minu_service: service,
      minu_plan: subscription?.plan_name || 'free',
      scope: ['user:read', 'user:write'],
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setExpirationTime(`${ACCESS_TOKEN_EXPIRY_SECONDS}s`)
      .setJti(tokenId)
      .sign(secretKey)

    // Refresh Token 생성 (랜덤 문자열)
    const refreshTokenBytes = new Uint8Array(32)
    crypto.getRandomValues(refreshTokenBytes)
    const refreshToken = Array.from(refreshTokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Refresh Token 저장
    const refreshTokenHash = await hashToken(refreshToken)
    await supabase
      .from('service_tokens')
      .insert({
        service_id: `user-${user.id}`,
        token_hash: refreshTokenHash,
        token_type: 'refresh',
        scope: ['user:read', 'user:write'],
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000).toISOString(),
      })

    // 응답 생성
    const response: MinuTokenExchangeResponse = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: userInfo.email,
        name: userInfo.name,
        avatar_url: userInfo.avatar_url,
        organization: userInfo.organization,
      },
      subscription: subscription ? {
        id: subscription.id,
        plan_id: subscription.plan_id,
        plan_name: subscription.plan_name,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        features: subscription.features,
        limits: subscription.limits,
      } : null,
    }

    return createResponse(response, 200, origin)
  } catch (error) {
    console.error('Token exchange error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      500,
      origin
    )
  }
})
