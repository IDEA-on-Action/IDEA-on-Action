/**
 * GitHub OAuth 2.0 핸들러
 * Social Login - GitHub 제공자
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { SignJWT } from 'jose';

const github = new Hono<AppType>();

// GitHub OAuth 엔드포인트
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

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

// GET /oauth/github/authorize - GitHub 로그인 시작
github.get('/authorize', async (c) => {
  const kv = c.env.SESSIONS;
  const clientId = c.env.GITHUB_CLIENT_ID;
  const workerUrl = c.env.WORKER_URL;
  const redirectUri = c.env.GITHUB_REDIRECT_URI || `${workerUrl}/oauth/github/callback`;

  // 디버그 로그
  console.log('[GitHub OAuth] 설정:', {
    clientId: clientId ? `${clientId.slice(0, 8)}...` : 'NOT SET',
    workerUrl,
    redirectUri,
    hasGithubRedirectUri: !!c.env.GITHUB_REDIRECT_URI,
  });

  if (!clientId) {
    return c.json({ error: 'GITHUB_CLIENT_ID가 설정되지 않았습니다' }, 500);
  }

  const state = generateRandomString(32);

  // KV에 state 저장 (5분 TTL)
  await kv.put(`oauth:github:${state}`, JSON.stringify({
    created_at: Date.now(),
  }), { expirationTtl: 300 });

  // GitHub 인증 URL 생성
  const authUrl = new URL(GITHUB_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'user:email read:user');
  authUrl.searchParams.set('state', state);

  console.log('[GitHub OAuth] 리다이렉트 URL:', authUrl.toString());

  return c.redirect(authUrl.toString());
});

// GET /oauth/github/callback - GitHub 콜백 처리
github.get('/callback', async (c) => {
  const db = c.env.DB;
  const kv = c.env.SESSIONS;
  const jwtSecret = c.env.JWT_SECRET;
  const clientId = c.env.GITHUB_CLIENT_ID;
  const clientSecret = c.env.GITHUB_CLIENT_SECRET;
  const redirectUri = c.env.GITHUB_REDIRECT_URI || `${c.env.WORKER_URL}/oauth/github/callback`;
  const frontendUrl = c.env.FRONTEND_URL || 'https://www.ideaonaction.ai';

  const { code, state, error, error_description } = c.req.query();

  // 에러 처리
  if (error) {
    console.error('[GitHub OAuth] 에러:', error, error_description);
    return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    return c.redirect(`${frontendUrl}/login?error=invalid_request`);
  }

  // State 검증
  const storedData = await kv.get(`oauth:github:${state}`);
  if (!storedData) {
    return c.redirect(`${frontendUrl}/login?error=invalid_state`);
  }
  await kv.delete(`oauth:github:${state}`);

  try {
    // 액세스 토큰 교환
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[GitHub OAuth] 토큰 교환 실패:', errorData);
      return c.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      token_type: string;
      scope: string;
      error?: string;
    };

    if (tokens.error) {
      console.error('[GitHub OAuth] 토큰 에러:', tokens.error);
      return c.redirect(`${frontendUrl}/login?error=${tokens.error}`);
    }

    // 사용자 정보 가져오기
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      return c.redirect(`${frontendUrl}/login?error=userinfo_failed`);
    }

    const userInfo = await userResponse.json() as {
      id: number;
      login: string;
      name: string;
      email: string | null;
      avatar_url: string;
    };

    // 이메일이 없는 경우 이메일 API 호출
    let email = userInfo.email;
    if (!email) {
      const emailsResponse = await fetch(GITHUB_EMAILS_URL, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json() as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primaryEmail = emails.find(e => e.primary && e.verified);
        email = primaryEmail?.email || emails[0]?.email;
      }
    }

    if (!email) {
      return c.redirect(`${frontendUrl}/login?error=email_required`);
    }

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
        .bind(userId, email, userInfo.name || userInfo.login, userInfo.avatar_url, now, now)
        .run();

      user = { id: userId, email, name: userInfo.name || userInfo.login, is_active: 1 };
    }

    // OAuth 연결 저장/업데이트
    const existingConnection = await db
      .prepare('SELECT id FROM oauth_connections WHERE provider = ? AND provider_user_id = ?')
      .bind('github', String(userInfo.id))
      .first();

    const now = new Date().toISOString();
    if (existingConnection) {
      await db
        .prepare(`
          UPDATE oauth_connections
          SET access_token = ?, updated_at = ?
          WHERE id = ?
        `)
        .bind(tokens.access_token, now, existingConnection.id)
        .run();
    } else {
      await db
        .prepare(`
          INSERT INTO oauth_connections (id, user_id, provider, provider_user_id, access_token, created_at, updated_at)
          VALUES (?, ?, 'github', ?, ?, ?, ?)
        `)
        .bind(crypto.randomUUID(), user.id, String(userInfo.id), tokens.access_token, now, now)
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
    console.error('[GitHub OAuth] 처리 중 오류:', err);
    return c.redirect(`${frontendUrl}/login?error=internal_error`);
  }
});

export default github;
