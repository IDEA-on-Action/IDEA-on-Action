/**
 * Minu OAuth Callback 핸들러
 * Cloudflare Workers용
 *
 * Supabase Edge Functions minu-oauth-callback에서 마이그레이션
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import {
  type MinuService,
  type MinuOAuthState,
  type MinuOAuthSession,
  VALID_MINU_SERVICES,
} from '../../lib/minu/types';
import { createMinuClient, hashToken } from '../../lib/minu/client';

const oauthCallback = new Hono<AppType>();

// ============================================================================
// GET /minu/oauth/callback - OAuth 콜백 처리
// ============================================================================

oauthCallback.get('/callback', async (c) => {
  const db = c.env.DB;
  const url = new URL(c.req.url);

  // 쿼리 파라미터 파싱
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // OAuth 에러 처리
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return redirectWithError(c, error, errorDescription || 'OAuth 인증 중 오류가 발생했습니다.');
  }

  // 필수 파라미터 검증
  if (!code || !state) {
    return redirectWithError(c, 'invalid_request', 'code와 state가 필요합니다.');
  }

  // State 디코딩 및 검증
  let stateData: MinuOAuthState;
  try {
    const decoded = atob(state);
    stateData = JSON.parse(decoded);
  } catch {
    return redirectWithError(c, 'invalid_state', '유효하지 않은 state입니다.');
  }

  // 서비스 검증
  if (!VALID_MINU_SERVICES.includes(stateData.service)) {
    return redirectWithError(c, 'invalid_service', '유효하지 않은 서비스입니다.');
  }

  try {
    // 세션 조회 및 검증
    const session = await db
      .prepare(`
        SELECT * FROM minu_oauth_sessions
        WHERE state = ? AND used_at IS NULL
      `)
      .bind(state)
      .first<MinuOAuthSession>();

    if (!session) {
      console.error('Session not found or already used');
      return redirectWithError(c, 'invalid_session', '세션이 만료되었거나 이미 사용되었습니다.');
    }

    // 세션 만료 확인
    if (new Date(session.expires_at) < new Date()) {
      return redirectWithError(c, 'session_expired', '세션이 만료되었습니다. 다시 시도해주세요.');
    }

    // Minu API로 토큰 교환
    const service = session.service as MinuService;
    const minuClient = createMinuClient(service, c.env as unknown as Record<string, string>);

    const tokenResponse = await minuClient.exchangeCodeForToken(
      code,
      session.code_verifier,
      session.redirect_uri
    );

    // 사용자 정보 조회
    const userInfo = await minuClient.getUserInfo(tokenResponse.access_token);

    // 구독 정보 조회
    const subscription = await minuClient.getSubscription(tokenResponse.access_token);

    // 세션 사용 처리
    await db
      .prepare("UPDATE minu_oauth_sessions SET used_at = datetime('now') WHERE id = ?")
      .bind(session.id)
      .run();

    // 사용자 존재 여부 확인 및 생성/업데이트
    let userId = session.user_id;

    if (!userId) {
      // 이메일로 기존 프로필 찾기
      const existingProfile = await db
        .prepare('SELECT id FROM profiles WHERE email = ?')
        .bind(userInfo.email)
        .first<{ id: string }>();

      if (existingProfile) {
        userId = existingProfile.id;
      } else {
        // 새 프로필 생성
        userId = crypto.randomUUID();
        await db
          .prepare(`
            INSERT INTO profiles (id, email, display_name, avatar_url, role, created_at)
            VALUES (?, ?, ?, ?, 'user', datetime('now'))
          `)
          .bind(userId, userInfo.email, userInfo.name || null, userInfo.avatar_url || null)
          .run();
      }
    }

    // 토큰 저장 (해시)
    const accessTokenHash = await hashToken(tokenResponse.access_token);
    const refreshTokenHash = tokenResponse.refresh_token
      ? await hashToken(tokenResponse.refresh_token)
      : null;

    await db
      .prepare(`
        INSERT INTO minu_tokens (id, user_id, service, access_token_hash, refresh_token_hash,
          access_token_expires_at, scope, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now', '+' || ? || ' seconds'), ?, datetime('now'), datetime('now'))
        ON CONFLICT(user_id, service) DO UPDATE SET
          access_token_hash = excluded.access_token_hash,
          refresh_token_hash = excluded.refresh_token_hash,
          access_token_expires_at = excluded.access_token_expires_at,
          scope = excluded.scope,
          updated_at = datetime('now')
      `)
      .bind(
        crypto.randomUUID(),
        userId,
        service,
        accessTokenHash,
        refreshTokenHash,
        tokenResponse.expires_in,
        JSON.stringify(tokenResponse.scope?.split(' ') || [])
      )
      .run();

    // 구독 정보 동기화
    if (subscription) {
      await db
        .prepare(`
          INSERT INTO minu_subscriptions (id, user_id, service, plan_id, plan_name, status,
            features, limits, minu_subscription_id, synced_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(user_id, service) DO UPDATE SET
            plan_id = excluded.plan_id,
            plan_name = excluded.plan_name,
            status = excluded.status,
            features = excluded.features,
            limits = excluded.limits,
            minu_subscription_id = excluded.minu_subscription_id,
            synced_at = datetime('now')
        `)
        .bind(
          crypto.randomUUID(),
          userId,
          service,
          subscription.plan_id,
          subscription.plan_name,
          subscription.status,
          JSON.stringify(subscription.features),
          JSON.stringify(subscription.limits),
          subscription.id || null
        )
        .run();
    }

    // 프론트엔드로 리다이렉트 (토큰 파라미터 포함)
    const redirectUrl = new URL(stateData.redirect_uri);
    redirectUrl.searchParams.set('access_token', tokenResponse.access_token);
    redirectUrl.searchParams.set('service', service);
    redirectUrl.searchParams.set('user_id', userId);

    if (subscription) {
      redirectUrl.searchParams.set('plan', subscription.plan_name);
      redirectUrl.searchParams.set('status', subscription.status);
    }

    return c.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OAuth callback error:', error);
    return redirectWithError(
      c,
      'server_error',
      error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    );
  }
});

// ============================================================================
// 헬퍼 함수
// ============================================================================

function redirectWithError(
  c: { redirect: (url: string) => Response; env: { OAUTH_ERROR_PAGE_URL?: string } },
  error: string,
  description: string
): Response {
  const errorUrl = new URL(c.env.OAUTH_ERROR_PAGE_URL || 'https://www.ideaonaction.ai/auth/error');
  errorUrl.searchParams.set('error', error);
  errorUrl.searchParams.set('error_description', description);
  return c.redirect(errorUrl.toString());
}

export default oauthCallback;
