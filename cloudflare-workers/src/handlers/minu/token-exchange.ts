/**
 * Minu Token Exchange 핸들러
 * Cloudflare Workers용
 *
 * Supabase Edge Functions minu-token-exchange에서 마이그레이션
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import {
  type MinuService,
  type MinuTokenExchangeRequest,
  type MinuTokenExchangeResponse,
  VALID_MINU_SERVICES,
} from '../../lib/minu/types';
import { createMinuClient, hashToken } from '../../lib/minu/client';
import { generateJWT } from '../../lib/mcp/jwt';
import { ACCESS_TOKEN_EXPIRY_SECONDS, REFRESH_TOKEN_EXPIRY_SECONDS } from '../../lib/mcp/constants';

const tokenExchange = new Hono<AppType>();

// ============================================================================
// POST /minu/token/exchange - 토큰 교환
// ============================================================================

tokenExchange.post('/exchange', async (c) => {
  const db = c.env.DB;

  let body: MinuTokenExchangeRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: 'invalid_json', message: '유효하지 않은 JSON입니다.' } }, 400);
  }

  // 필수 필드 검증
  if (!body.minu_access_token) {
    return c.json({ error: { code: 'invalid_request', message: 'minu_access_token이 필요합니다.' } }, 400);
  }

  if (!body.service || !VALID_MINU_SERVICES.includes(body.service)) {
    return c.json({ error: { code: 'invalid_service', message: '유효한 service가 필요합니다.' } }, 400);
  }

  const service = body.service as MinuService;

  try {
    // Minu 토큰 검증 및 사용자 정보 조회
    const minuClient = createMinuClient(service, c.env as unknown as Record<string, string>);

    let userInfo;
    try {
      userInfo = await minuClient.getUserInfo(body.minu_access_token);
    } catch (error) {
      console.error('Failed to validate Minu token:', error);
      return c.json({ error: { code: 'invalid_token', message: '유효하지 않은 Minu 토큰입니다.' } }, 401);
    }

    // 구독 정보 조회
    const subscription = await minuClient.getSubscription(body.minu_access_token);

    // 사용자 존재 여부 확인
    let profile = await db
      .prepare('SELECT id, email FROM profiles WHERE email = ?')
      .bind(userInfo.email)
      .first<{ id: string; email: string }>();

    if (!profile) {
      // 새 프로필 생성
      const userId = crypto.randomUUID();
      await db
        .prepare(`
          INSERT INTO profiles (id, email, display_name, avatar_url, role, created_at)
          VALUES (?, ?, ?, ?, 'user', datetime('now'))
        `)
        .bind(userId, userInfo.email, userInfo.name || null, userInfo.avatar_url || null)
        .run();

      profile = { id: userId, email: userInfo.email };
    }

    // Minu 토큰 저장
    const minuTokenHash = await hashToken(body.minu_access_token);

    await db
      .prepare(`
        INSERT INTO minu_tokens (id, user_id, service, access_token_hash, access_token_expires_at, scope, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now', '+1 hour'), ?, datetime('now'), datetime('now'))
        ON CONFLICT(user_id, service) DO UPDATE SET
          access_token_hash = excluded.access_token_hash,
          access_token_expires_at = excluded.access_token_expires_at,
          scope = excluded.scope,
          updated_at = datetime('now')
      `)
      .bind(
        crypto.randomUUID(),
        profile.id,
        service,
        minuTokenHash,
        JSON.stringify(['read', 'write'])
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
          profile.id,
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

    // Central Hub JWT 토큰 생성
    const jwtSecret = c.env.MCP_JWT_SECRET;
    if (!jwtSecret) {
      console.error('MCP_JWT_SECRET not configured');
      return c.json({ error: { code: 'config_error', message: '서버 설정 오류' } }, 500);
    }

    const { token: accessToken, jti: tokenId } = await generateJWT(
      profile.id,
      `user-${service}`,
      ['user:read', 'user:write'],
      jwtSecret
    );

    // Refresh Token 생성 (랜덤 문자열)
    const refreshTokenBytes = new Uint8Array(32);
    crypto.getRandomValues(refreshTokenBytes);
    const refreshToken = 'rt_' + Array.from(refreshTokenBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Refresh Token 저장
    const refreshTokenHash = await hashToken(refreshToken);
    await db
      .prepare(`
        INSERT INTO service_tokens (id, service_id, client_id, token_hash, token_type, scope, expires_at, created_at)
        VALUES (?, ?, ?, ?, 'refresh', ?, datetime('now', '+' || ? || ' seconds'), datetime('now'))
      `)
      .bind(
        crypto.randomUUID(),
        `user-${profile.id}`,
        `minu-${service}`,
        refreshTokenHash,
        JSON.stringify(['user:read', 'user:write']),
        REFRESH_TOKEN_EXPIRY_SECONDS
      )
      .run();

    // 응답 생성
    const response: MinuTokenExchangeResponse = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      refresh_token: refreshToken,
      user: {
        id: profile.id,
        email: userInfo.email,
        name: userInfo.name,
        avatar_url: userInfo.avatar_url,
        organization: userInfo.organization,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            plan_id: subscription.plan_id,
            plan_name: subscription.plan_name,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            features: subscription.features,
            limits: subscription.limits,
          }
        : null,
    };

    console.log(`Token exchanged for user ${profile.id} via ${service}`);

    return c.json(response);
  } catch (error) {
    console.error('Token exchange error:', error);
    return c.json(
      { error: { code: 'internal_error', message: error instanceof Error ? error.message : '서버 오류' } },
      500
    );
  }
});

export default tokenExchange;
