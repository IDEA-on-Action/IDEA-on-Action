/**
 * Google OAuth 2.0 핸들러
 * Social Login - Google 제공자
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { SignJWT } from 'jose';

const google = new Hono<AppType>();

// Google OAuth 엔드포인트
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

// PKCE 코드 생성
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
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

// GET /oauth/google/authorize - Google 로그인 시작
google.get('/authorize', async (c) => {
  const kv = c.env.SESSIONS;
  const clientId = c.env.GOOGLE_CLIENT_ID;
  const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${c.env.WORKER_URL}/oauth/google/callback`;

  if (!clientId) {
    return c.json({ error: 'GOOGLE_CLIENT_ID가 설정되지 않았습니다' }, 500);
  }

  // PKCE 생성
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  // KV에 state와 code_verifier 저장 (5분 TTL)
  await kv.put(`oauth:google:${state}`, JSON.stringify({
    code_verifier: codeVerifier,
    created_at: Date.now(),
  }), { expirationTtl: 300 });

  // Google 인증 URL 생성
  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  return c.redirect(authUrl.toString());
});

// GET /oauth/google/callback - Google 콜백 처리
google.get('/callback', async (c) => {
  const db = c.env.DB;
  const kv = c.env.SESSIONS;
  const jwtSecret = c.env.JWT_SECRET;
  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${c.env.WORKER_URL}/oauth/google/callback`;
  const frontendUrl = c.env.FRONTEND_URL || 'https://www.ideaonaction.ai';

  const { code, state, error, error_description } = c.req.query();

  // 에러 처리
  if (error) {
    console.error('[Google OAuth] 에러:', error, error_description);
    return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    return c.redirect(`${frontendUrl}/login?error=invalid_request`);
  }

  // State 검증 및 code_verifier 가져오기
  const storedData = await kv.get(`oauth:google:${state}`);
  if (!storedData) {
    return c.redirect(`${frontendUrl}/login?error=invalid_state`);
  }

  const { code_verifier } = JSON.parse(storedData);
  await kv.delete(`oauth:google:${state}`);

  try {
    // 환경변수 검증
    if (!clientId || !clientSecret) {
      return c.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
    }

    // 액세스 토큰 교환
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[Google OAuth] 토큰 교환 실패:', errorData);
      return c.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      id_token: string;
      expires_in: number;
    };

    // 사용자 정보 가져오기
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return c.redirect(`${frontendUrl}/login?error=userinfo_failed`);
    }

    const userInfo = await userInfoResponse.json() as {
      sub: string;
      email: string;
      email_verified: boolean;
      name: string;
      picture: string;
      given_name?: string;
      family_name?: string;
    };

    // 사용자 찾기 또는 생성
    let user = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(userInfo.email)
      .first<{ id: string; email: string; name: string; is_active: number }>();

    if (!user) {
      // 새 사용자 생성
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      await db
        .prepare(`
          INSERT INTO users (id, email, name, avatar_url, is_active, email_verified, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, 1, ?, ?)
        `)
        .bind(userId, userInfo.email, userInfo.name, userInfo.picture, now, now)
        .run();

      // 프로필은 필요시 별도 생성 (user_profiles 테이블 스키마가 다름)

      user = { id: userId, email: userInfo.email, name: userInfo.name, is_active: 1 };
    }

    // OAuth 연결 저장/업데이트
    const existingConnection = await db
      .prepare('SELECT id FROM oauth_connections WHERE provider = ? AND provider_user_id = ?')
      .bind('google', userInfo.sub)
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
          tokens.refresh_token || null,
          new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          now,
          existingConnection.id
        )
        .run();
    } else {
      await db
        .prepare(`
          INSERT INTO oauth_connections (id, user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at, created_at, updated_at)
          VALUES (?, ?, 'google', ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          crypto.randomUUID(),
          user.id,
          userInfo.sub,
          tokens.access_token,
          tokens.refresh_token || null,
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

    // 프론트엔드로 리다이렉트 (토큰 포함)
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
    redirectUrl.searchParams.set('access_token', accessToken);
    redirectUrl.searchParams.set('refresh_token', refreshToken);
    redirectUrl.searchParams.set('expires_in', String(7 * 24 * 60 * 60));

    return c.redirect(redirectUrl.toString());
  } catch (err) {
    console.error('[Google OAuth] 처리 중 오류:', err);
    return c.redirect(`${frontendUrl}/login?error=internal_error`);
  }
});

export default google;
