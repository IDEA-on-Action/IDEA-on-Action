/**
 * Apple Sign In 핸들러
 * Social Login - Apple 제공자
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { SignJWT, importPKCS8 } from 'jose';

const apple = new Hono<AppType>();

// Apple OAuth 엔드포인트
const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

// 랜덤 문자열 생성
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

// Apple Client Secret 생성 (ES256 JWT)
async function generateClientSecret(
  teamId: string,
  clientId: string,
  keyId: string,
  privateKey: string
): Promise<string> {
  const key = await importPKCS8(privateKey, 'ES256');

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .sign(key);
}

// JWT 생성 (내부용)
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

// Apple ID Token 디코딩 (검증 없이 페이로드만 추출)
function decodeIdToken(idToken: string): {
  sub: string;
  email?: string;
  email_verified?: string;
  is_private_email?: string;
  real_user_status?: number;
} {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid ID token format');
  }

  const payload = parts[1];
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decoded);
}

// GET /oauth/apple/authorize - Apple 로그인 시작
apple.get('/authorize', async (c) => {
  const kv = c.env.SESSIONS;
  const clientId = c.env.APPLE_CLIENT_ID;
  const redirectUri = c.env.APPLE_REDIRECT_URI || `${c.env.WORKER_URL}/oauth/apple/callback`;

  if (!clientId) {
    return c.json({ error: 'APPLE_CLIENT_ID가 설정되지 않았습니다' }, 500);
  }

  const state = generateRandomString(32);
  const nonce = generateRandomString(32);

  // KV에 state와 nonce 저장 (5분 TTL)
  await kv.put(`oauth:apple:${state}`, JSON.stringify({
    nonce,
    created_at: Date.now(),
  }), { expirationTtl: 300 });

  // Apple 인증 URL 생성
  const authUrl = new URL(APPLE_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code id_token');
  authUrl.searchParams.set('scope', 'name email');
  authUrl.searchParams.set('response_mode', 'form_post');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);

  return c.redirect(authUrl.toString());
});

// POST /oauth/apple/callback - Apple 콜백 처리 (form_post 방식)
apple.post('/callback', async (c) => {
  const db = c.env.DB;
  const kv = c.env.SESSIONS;
  const jwtSecret = c.env.JWT_SECRET;
  const clientId = c.env.APPLE_CLIENT_ID;
  const teamId = c.env.APPLE_TEAM_ID;
  const keyId = c.env.APPLE_KEY_ID;
  const privateKey = c.env.APPLE_PRIVATE_KEY;
  const redirectUri = c.env.APPLE_REDIRECT_URI || `${c.env.WORKER_URL}/oauth/apple/callback`;
  const frontendUrl = c.env.FRONTEND_URL || 'https://www.ideaonaction.ai';

  const body = await c.req.parseBody();
  const { code, state, id_token, user, error } = body as {
    code?: string;
    state?: string;
    id_token?: string;
    user?: string;
    error?: string;
  };

  // 에러 처리
  if (error) {
    console.error('[Apple OAuth] 에러:', error);
    return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return c.redirect(`${frontendUrl}/login?error=invalid_request`);
  }

  // State 검증
  const storedData = await kv.get(`oauth:apple:${state}`);
  if (!storedData) {
    return c.redirect(`${frontendUrl}/login?error=invalid_state`);
  }
  await kv.delete(`oauth:apple:${state}`);

  try {
    // 환경변수 검증
    if (!clientId || !teamId || !keyId || !privateKey) {
      return c.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
    }

    // Client Secret 생성
    const clientSecret = await generateClientSecret(teamId, clientId, keyId, privateKey);

    // 액세스 토큰 교환
    const tokenResponse = await fetch(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[Apple OAuth] 토큰 교환 실패:', errorData);
      return c.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      id_token: string;
      token_type: string;
      expires_in: number;
    };

    // ID Token에서 사용자 정보 추출
    const idTokenPayload = decodeIdToken(tokens.id_token);
    const appleUserId = idTokenPayload.sub;
    let email = idTokenPayload.email;

    // 첫 로그인 시 user 객체에서 이름 추출
    let name = 'Apple User';
    if (user) {
      try {
        const userData = JSON.parse(user) as {
          name?: { firstName?: string; lastName?: string };
          email?: string;
        };
        if (userData.name) {
          name = `${userData.name.firstName || ''} ${userData.name.lastName || ''}`.trim() || 'Apple User';
        }
        if (userData.email) {
          email = userData.email;
        }
      } catch {
        // user 파싱 실패 무시
      }
    }

    if (!email) {
      return c.redirect(`${frontendUrl}/login?error=email_required`);
    }

    // 사용자 찾기 또는 생성
    let dbUser = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; email: string; name: string; status: string }>();

    if (!dbUser) {
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

      dbUser = { id: userId, email, name, status: 'active' };
    }

    // OAuth 연결 저장/업데이트
    const existingConnection = await db
      .prepare('SELECT id FROM oauth_connections WHERE provider = ? AND provider_user_id = ?')
      .bind('apple', appleUserId)
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
          VALUES (?, ?, 'apple', ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          crypto.randomUUID(),
          dbUser.id,
          appleUserId,
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
      .bind(now, dbUser.id)
      .run();

    // JWT 생성
    const accessToken = await generateJWT(dbUser.id, dbUser.email, jwtSecret, '7d');
    const refreshToken = await generateJWT(dbUser.id, dbUser.email, jwtSecret, '30d');

    // 세션 저장
    await kv.put(`session:${dbUser.id}:${accessToken.slice(-16)}`, JSON.stringify({
      userId: dbUser.id,
      email: dbUser.email,
      createdAt: Date.now(),
    }), { expirationTtl: 7 * 24 * 60 * 60 });

    // 프론트엔드로 리다이렉트
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
    redirectUrl.searchParams.set('access_token', accessToken);
    redirectUrl.searchParams.set('refresh_token', refreshToken);
    redirectUrl.searchParams.set('expires_in', String(7 * 24 * 60 * 60));

    return c.redirect(redirectUrl.toString());
  } catch (err) {
    console.error('[Apple OAuth] 처리 중 오류:', err);
    return c.redirect(`${frontendUrl}/login?error=internal_error`);
  }
});

export default apple;
