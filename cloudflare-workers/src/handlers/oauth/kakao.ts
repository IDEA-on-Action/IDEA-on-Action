/**
 * Kakao OAuth 2.0 핸들러
 * Social Login - Kakao 제공자
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { SignJWT } from 'jose';

const kakao = new Hono<AppType>();

// Kakao OAuth 엔드포인트
const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL = 'https://kapi.kakao.com/v2/user/me';

// 랜덤 문자열 생성
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

// JWT 생성
async function generateJWT(
  userId: string,
  email: string,
  secret: string,
  expiresIn: string = '7d'
): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  return new SignJWT({
    sub: userId,
    email,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer('idea-on-action')
    .sign(secretKey);
}

// GET /oauth/kakao/authorize - Kakao 로그인 시작
kakao.get('/authorize', async (c) => {
  const kv = c.env.SESSIONS;
  const clientId = c.env.KAKAO_CLIENT_ID;
  const redirectUri = c.env.KAKAO_REDIRECT_URI || `${c.env.WORKER_URL}/oauth/kakao/callback`;

  if (!clientId) {
    return c.json({ error: 'KAKAO_CLIENT_ID가 설정되지 않았습니다' }, 500);
  }

  const state = generateRandomString(32);

  // KV에 state 저장 (5분 TTL)
  await kv.put(`oauth:kakao:${state}`, JSON.stringify({
    created_at: Date.now(),
  }), { expirationTtl: 300 });

  // Kakao 인증 URL 생성
  const authUrl = new URL(KAKAO_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  // account_email은 비즈니스 앱에서만 사용 가능하므로 제외
  authUrl.searchParams.set('scope', 'profile_nickname profile_image');
  authUrl.searchParams.set('state', state);

  return c.redirect(authUrl.toString());
});

// GET /oauth/kakao/callback - Kakao 콜백 처리
kakao.get('/callback', async (c) => {
  const db = c.env.DB;
  const kv = c.env.SESSIONS;
  const jwtSecret = c.env.JWT_SECRET;
  const clientId = c.env.KAKAO_CLIENT_ID;
  const clientSecret = c.env.KAKAO_CLIENT_SECRET;
  const redirectUri = c.env.KAKAO_REDIRECT_URI || `${c.env.WORKER_URL}/oauth/kakao/callback`;
  const frontendUrl = c.env.FRONTEND_URL || 'https://www.ideaonaction.ai';

  const { code, state, error, error_description } = c.req.query();

  // 에러 처리
  if (error) {
    console.error('[Kakao OAuth] 에러:', error, error_description);
    return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    return c.redirect(`${frontendUrl}/login?error=invalid_request`);
  }

  // State 검증
  const storedData = await kv.get(`oauth:kakao:${state}`);
  if (!storedData) {
    return c.redirect(`${frontendUrl}/login?error=invalid_state`);
  }
  await kv.delete(`oauth:kakao:${state}`);

  try {
    // 환경변수 검증
    if (!clientId) {
      return c.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
    }

    // 액세스 토큰 교환
    const tokenResponse = await fetch(KAKAO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret || '',
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[Kakao OAuth] 토큰 교환 실패:', errorData);
      return c.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      token_type: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    };

    // 사용자 정보 가져오기
    const userResponse = await fetch(KAKAO_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    if (!userResponse.ok) {
      return c.redirect(`${frontendUrl}/login?error=userinfo_failed`);
    }

    const userInfo = await userResponse.json() as {
      id: number;
      kakao_account?: {
        email?: string;
        email_needs_agreement?: boolean;
        is_email_valid?: boolean;
        is_email_verified?: boolean;
        profile?: {
          nickname?: string;
          thumbnail_image_url?: string;
          profile_image_url?: string;
        };
      };
      properties?: {
        nickname?: string;
        profile_image?: string;
        thumbnail_image?: string;
      };
    };

    // 이메일이 없으면 Kakao ID 기반 가상 이메일 생성
    const email = userInfo.kakao_account?.email || `kakao_${userInfo.id}@kakao.local`;
    const name = userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname || 'Kakao User';
    const avatarUrl = userInfo.kakao_account?.profile?.profile_image_url || userInfo.properties?.profile_image;

    console.log('[Kakao OAuth] 사용자:', name, email);

    // 사용자 찾기 또는 생성
    let user = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; email: string; name: string; is_active: number }>();

    if (!user) {
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      await db
        .prepare(`
          INSERT INTO users (id, email, name, avatar_url, is_active, email_verified, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, 1, ?, ?)
        `)
        .bind(userId, email, name, avatarUrl || null, now, now)
        .run();

      user = { id: userId, email, name, is_active: 1 };
    }

    // OAuth 연결 저장/업데이트
    const existingConnection = await db
      .prepare('SELECT id FROM oauth_connections WHERE provider = ? AND provider_user_id = ?')
      .bind('kakao', String(userInfo.id))
      .first();

    const now = new Date().toISOString();
    if (existingConnection) {
      await db
        .prepare(`
          UPDATE oauth_connections
          SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = ?
          WHERE id = ?
        `)
        .bind(
          tokens.access_token,
          tokens.refresh_token,
          new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          now,
          existingConnection.id
        )
        .run();
    } else {
      await db
        .prepare(`
          INSERT INTO oauth_connections (id, user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at, created_at, updated_at)
          VALUES (?, ?, 'kakao', ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          crypto.randomUUID(),
          user.id,
          String(userInfo.id),
          tokens.access_token,
          tokens.refresh_token,
          new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          now,
          now
        )
        .run();
    }

    // 마지막 로그인 시간 업데이트
    await db
      .prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
      .bind(now, user.id)
      .run();

    // JWT 생성
    const accessToken = await generateJWT(user.id, user.email, jwtSecret, '7d');
    const refreshToken = await generateJWT(user.id, user.email, jwtSecret, '30d');

    // 세션 저장
    await kv.put(`session:${user.id}:${accessToken.slice(-16)}`, JSON.stringify({
      userId: user.id,
      email: user.email,
      createdAt: Date.now(),
    }), { expirationTtl: 7 * 24 * 60 * 60 });

    // 프론트엔드로 리다이렉트
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
    redirectUrl.searchParams.set('access_token', accessToken);
    redirectUrl.searchParams.set('refresh_token', refreshToken);
    redirectUrl.searchParams.set('expires_in', String(7 * 24 * 60 * 60));

    return c.redirect(redirectUrl.toString());
  } catch (err) {
    console.error('[Kakao OAuth] 처리 중 오류:', err);
    return c.redirect(`${frontendUrl}/login?error=internal_error`);
  }
});

export default kakao;
