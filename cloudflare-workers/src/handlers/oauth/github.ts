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

// JWT 생성 (사용자 정보 포함)
async function generateJWT(
  userId: string,
  email: string,
  secret: string,
  options: {
    expiresIn?: string;
    name?: string | null;
    avatarUrl?: string | null;
    type?: 'access' | 'refresh';
  } = {}
): Promise<string> {
  const { expiresIn = '7d', name, avatarUrl, type = 'access' } = options;
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  return new SignJWT({
    sub: userId,
    email,
    name: name || null,
    avatar_url: avatarUrl || null,
    type,
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

  console.log('[GitHub OAuth] 콜백 시작');

  const { code, state, error, error_description } = c.req.query();

  // 에러 처리
  if (error) {
    console.error('[GitHub OAuth] 에러:', error, error_description);
    return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    console.error('[GitHub OAuth] code 또는 state 없음');
    return c.redirect(`${frontendUrl}/login?error=invalid_request`);
  }

  // State 검증
  const storedData = await kv.get(`oauth:github:${state}`);
  if (!storedData) {
    console.error('[GitHub OAuth] state 검증 실패');
    return c.redirect(`${frontendUrl}/login?error=invalid_state`);
  }
  await kv.delete(`oauth:github:${state}`);

  try {
    console.log('[GitHub OAuth] 토큰 교환 시작...');

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

    const tokenText = await tokenResponse.text();
    console.log('[GitHub OAuth] 토큰 응답:', tokenResponse.status, tokenText.slice(0, 200));

    if (!tokenResponse.ok) {
      console.error('[GitHub OAuth] 토큰 교환 실패:', tokenText);
      return c.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    const tokens = JSON.parse(tokenText) as {
      access_token: string;
      token_type: string;
      scope: string;
      error?: string;
      error_description?: string;
    };

    if (tokens.error) {
      console.error('[GitHub OAuth] 토큰 에러:', tokens.error, tokens.error_description);
      return c.redirect(`${frontendUrl}/login?error=${tokens.error}`);
    }

    if (!tokens.access_token) {
      console.error('[GitHub OAuth] access_token 없음:', tokens);
      return c.redirect(`${frontendUrl}/login?error=no_access_token`);
    }

    console.log('[GitHub OAuth] 토큰 획득 성공, 사용자 정보 조회 중...');

    // 사용자 정보 가져오기
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'IDEA-on-Action-OAuth',
      },
    });

    const userText = await userResponse.text();
    console.log('[GitHub OAuth] 사용자 정보 응답:', userResponse.status, userText.slice(0, 300));

    if (!userResponse.ok) {
      console.error('[GitHub OAuth] 사용자 정보 조회 실패:', userResponse.status, userText);
      return c.redirect(`${frontendUrl}/login?error=userinfo_failed`);
    }

    const userInfo = JSON.parse(userText) as {
      id: number;
      login: string;
      name: string;
      email: string | null;
      avatar_url: string;
    };

    console.log('[GitHub OAuth] 사용자:', userInfo.login, userInfo.email);

    // 이메일이 없는 경우 이메일 API 호출
    let email = userInfo.email;
    if (!email) {
      console.log('[GitHub OAuth] 공개 이메일 없음, 이메일 API 호출 중...');

      const emailsResponse = await fetch(GITHUB_EMAILS_URL, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'IDEA-on-Action-OAuth',
        },
      });

      const emailsText = await emailsResponse.text();
      console.log('[GitHub OAuth] 이메일 API 응답:', emailsResponse.status, emailsText.slice(0, 500));

      if (emailsResponse.ok) {
        const emails = JSON.parse(emailsText) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        console.log('[GitHub OAuth] 이메일 목록:', emails.length, '개');
        if (emails.length > 0) {
          console.log('[GitHub OAuth] 이메일 상세:', JSON.stringify(emails.slice(0, 3)));
        }
        const primaryEmail = emails.find(e => e.primary && e.verified);
        email = primaryEmail?.email || emails.find(e => e.verified)?.email || emails[0]?.email;
        console.log('[GitHub OAuth] 선택된 이메일:', email);
      } else {
        console.error('[GitHub OAuth] 이메일 API 실패:', emailsResponse.status, emailsText);
      }
    }

    if (!email) {
      console.error('[GitHub OAuth] 이메일을 찾을 수 없음 - GitHub 계정에 이메일이 없거나 비공개 설정됨');
      return c.redirect(`${frontendUrl}/login?error=email_required&message=${encodeURIComponent('GitHub 계정에 확인된 이메일이 없습니다. GitHub 설정에서 이메일을 추가하고 인증해주세요.')}`);
    }

    console.log('[GitHub OAuth] 최종 이메일:', email);

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

    // JWT 생성 (사용자 정보 포함)
    const userName = userInfo.name || userInfo.login;
    const accessToken = await generateJWT(user.id, user.email, jwtSecret, {
      expiresIn: '7d',
      name: userName,
      avatarUrl: userInfo.avatar_url,
      type: 'access',
    });
    const refreshToken = await generateJWT(user.id, user.email, jwtSecret, {
      expiresIn: '30d',
      name: userName,
      avatarUrl: userInfo.avatar_url,
      type: 'refresh',
    });

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
