/**
 * Microsoft OAuth 2.0 핸들러
 * Social Login - Microsoft (Azure AD) 제공자
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { SignJWT } from 'jose';

const microsoft = new Hono<AppType>();

// Microsoft OAuth 엔드포인트
const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_USER_URL = 'https://graph.microsoft.com/v1.0/me';

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

// GET /oauth/microsoft/authorize - Microsoft 로그인 시작
microsoft.get('/authorize', async (c) => {
  const kv = c.env.SESSIONS;
  const clientId = c.env.MICROSOFT_CLIENT_ID;
  const redirectUri = c.env.MICROSOFT_REDIRECT_URI || `${c.env.WORKER_URL}/oauth/microsoft/callback`;

  if (!clientId) {
    return c.json({ error: 'MICROSOFT_CLIENT_ID가 설정되지 않았습니다' }, 500);
  }

  // PKCE 생성
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  // KV에 state와 code_verifier 저장 (5분 TTL)
  await kv.put(`oauth:microsoft:${state}`, JSON.stringify({
    code_verifier: codeVerifier,
    created_at: Date.now(),
  }), { expirationTtl: 300 });

  // Microsoft 인증 URL 생성
  const authUrl = new URL(MS_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile User.Read');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('response_mode', 'query');

  return c.redirect(authUrl.toString());
});

// GET /oauth/microsoft/callback - Microsoft 콜백 처리
microsoft.get('/callback', async (c) => {
  const db = c.env.DB;
  const kv = c.env.SESSIONS;
  const jwtSecret = c.env.JWT_SECRET;
  const clientId = c.env.MICROSOFT_CLIENT_ID;
  const clientSecret = c.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = c.env.MICROSOFT_REDIRECT_URI || `${c.env.WORKER_URL}/oauth/microsoft/callback`;
  const frontendUrl = c.env.FRONTEND_URL || 'https://www.ideaonaction.ai';

  const { code, state, error, error_description } = c.req.query();

  // 에러 처리
  if (error) {
    console.error('[Microsoft OAuth] 에러:', error, error_description);
    return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    return c.redirect(`${frontendUrl}/login?error=invalid_request`);
  }

  // State 검증 및 code_verifier 가져오기
  const storedData = await kv.get(`oauth:microsoft:${state}`);
  if (!storedData) {
    return c.redirect(`${frontendUrl}/login?error=invalid_state`);
  }

  const { code_verifier } = JSON.parse(storedData);
  await kv.delete(`oauth:microsoft:${state}`);

  try {
    // 환경변수 검증
    if (!clientId || !clientSecret) {
      return c.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
    }

    // 액세스 토큰 교환
    const tokenResponse = await fetch(MS_TOKEN_URL, {
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
      console.error('[Microsoft OAuth] 토큰 교환 실패:', errorData);
      return c.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      id_token: string;
      token_type: string;
      expires_in: number;
    };

    // 사용자 정보 가져오기
    const userResponse = await fetch(MS_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      return c.redirect(`${frontendUrl}/login?error=userinfo_failed`);
    }

    const userInfo = await userResponse.json() as {
      id: string;
      displayName: string;
      mail?: string;
      userPrincipalName: string;
      givenName?: string;
      surname?: string;
    };

    const email = userInfo.mail || userInfo.userPrincipalName;
    const name = userInfo.displayName || `${userInfo.givenName || ''} ${userInfo.surname || ''}`.trim() || 'Microsoft User';

    if (!email) {
      return c.redirect(`${frontendUrl}/login?error=email_required`);
    }

    // 사용자 찾기 또는 생성
    let user = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; email: string; name: string; status: string }>();

    if (!user) {
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      await db
        .prepare(`
          INSERT INTO users (id, email, name, status, email_confirmed_at, created_at, updated_at)
          VALUES (?, ?, ?, 'active', ?, ?, ?)
        `)
        .bind(userId, email, name, now, now, now)
        .run();

      await db
        .prepare(`
          INSERT INTO user_profiles (id, user_id, display_name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `)
        .bind(crypto.randomUUID(), userId, name, now, now)
        .run();

      user = { id: userId, email, name, status: 'active' };
    }

    // OAuth 연결 저장/업데이트
    const existingConnection = await db
      .prepare('SELECT id FROM oauth_connections WHERE provider = ? AND provider_user_id = ?')
      .bind('microsoft', userInfo.id)
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
          VALUES (?, ?, 'microsoft', ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          crypto.randomUUID(),
          user.id,
          userInfo.id,
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
      .prepare('UPDATE users SET last_sign_in_at = ? WHERE id = ?')
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
    console.error('[Microsoft OAuth] 처리 중 오류:', err);
    return c.redirect(`${frontendUrl}/login?error=internal_error`);
  }
});

export default microsoft;
