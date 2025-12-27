/**
 * 인증 핸들러 - 로그인/회원가입
 * Phase 5: Workers 기반 자체 인증
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { SignJWT } from 'jose';

const login = new Hono<AppType>();

// 비밀번호 해싱 (Web Crypto API)
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 비밀번호 검증
async function verifyPassword(
  password: string,
  salt: string,
  storedHash: string
): Promise<boolean> {
  const hash = await hashPassword(password, salt);
  return hash === storedHash;
}

// Salt 생성
function generateSalt(): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 토큰 생성
async function generateTokens(
  userId: string,
  email: string,
  isAdmin: boolean,
  jwtSecret: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const secret = new TextEncoder().encode(jwtSecret);

  // Access Token (1시간)
  const accessToken = await new SignJWT({
    sub: userId,
    email,
    isAdmin,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setIssuer('idea-on-action')
    .sign(secret);

  // Refresh Token (30일)
  const refreshToken = await new SignJWT({
    sub: userId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .setIssuer('idea-on-action')
    .sign(secret);

  return { accessToken, refreshToken };
}

// POST /auth/register - 회원가입
login.post('/register', async (c) => {
  const db = c.env.DB;
  const kv = c.env.SESSIONS;

  const body = await c.req.json<{
    email: string;
    password: string;
    name?: string;
  }>();

  const { email, password, name } = body;

  // 입력 검증
  if (!email || !password) {
    return c.json({ error: '이메일과 비밀번호는 필수입니다' }, 400);
  }

  if (password.length < 8) {
    return c.json({ error: '비밀번호는 최소 8자 이상이어야 합니다' }, 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ error: '유효한 이메일 주소를 입력해주세요' }, 400);
  }

  try {
    // 이메일 중복 확인
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first();

    if (existingUser) {
      return c.json({ error: '이미 등록된 이메일입니다' }, 409);
    }

    // 비밀번호 해싱
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    // 사용자 생성
    const userId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO users (id, email, name, password_hash, password_salt, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `)
      .bind(userId, email.toLowerCase(), name || null, passwordHash, salt)
      .run();

    // 토큰 생성
    const tokens = await generateTokens(userId, email, false, c.env.JWT_SECRET);

    // Refresh Token을 KV에 저장
    await kv.put(
      `refresh_token:${userId}:${tokens.refreshToken.slice(-10)}`,
      JSON.stringify({
        userId,
        token: tokens.refreshToken,
        createdAt: new Date().toISOString(),
      }),
      { expirationTtl: 30 * 24 * 60 * 60 }
    );

    return c.json({
      user: {
        id: userId,
        email: email.toLowerCase(),
        name: name || null,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600,
    }, 201);
  } catch (error) {
    console.error('회원가입 오류:', error);
    return c.json({ error: '회원가입 중 오류가 발생했습니다' }, 500);
  }
});

// POST /auth/login - 로그인
login.post('/login', async (c) => {
  const db = c.env.DB;
  const kv = c.env.SESSIONS;

  const body = await c.req.json<{
    email: string;
    password: string;
  }>();

  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: '이메일과 비밀번호를 입력해주세요' }, 400);
  }

  try {
    // 로그인 시도 횟수 확인 (Rate Limiting)
    const attemptsKey = `login_attempts:${email.toLowerCase()}`;
    const attempts = await kv.get<number>(attemptsKey, 'json') || 0;

    if (attempts >= 5) {
      return c.json({
        error: '로그인 시도 횟수가 초과되었습니다. 5분 후 다시 시도해주세요'
      }, 429);
    }

    // 사용자 조회
    const user = await db
      .prepare(`
        SELECT id, email, name, password_hash, password_salt, is_active, avatar_url
        FROM users WHERE email = ?
      `)
      .bind(email.toLowerCase())
      .first();

    if (!user) {
      // 시도 횟수 증가
      await kv.put(attemptsKey, JSON.stringify(attempts + 1), { expirationTtl: 300 });
      return c.json({ error: '이메일 또는 비밀번호가 일치하지 않습니다' }, 401);
    }

    if (!user.is_active) {
      return c.json({ error: '비활성화된 계정입니다' }, 403);
    }

    // 비밀번호 검증
    const isValid = await verifyPassword(
      password,
      user.password_salt as string,
      user.password_hash as string
    );

    if (!isValid) {
      // 시도 횟수 증가
      await kv.put(attemptsKey, JSON.stringify(attempts + 1), { expirationTtl: 300 });

      // 로그인 실패 기록
      await db
        .prepare(`
          INSERT INTO login_attempts (id, email, user_id, ip_address, success)
          VALUES (?, ?, ?, ?, 0)
        `)
        .bind(
          crypto.randomUUID(),
          email.toLowerCase(),
          user.id,
          c.req.header('CF-Connecting-IP') || 'unknown'
        )
        .run();

      return c.json({ error: '이메일 또는 비밀번호가 일치하지 않습니다' }, 401);
    }

    // 관리자 여부 확인
    const adminRecord = await db
      .prepare('SELECT id FROM admins WHERE user_id = ? AND is_active = 1')
      .bind(user.id)
      .first();

    const isAdmin = !!adminRecord;

    // 시도 횟수 초기화
    await kv.delete(attemptsKey);

    // 토큰 생성
    const tokens = await generateTokens(
      user.id as string,
      user.email as string,
      isAdmin,
      c.env.JWT_SECRET
    );

    // Refresh Token을 KV에 저장
    await kv.put(
      `refresh_token:${user.id}:${tokens.refreshToken.slice(-10)}`,
      JSON.stringify({
        userId: user.id,
        token: tokens.refreshToken,
        createdAt: new Date().toISOString(),
      }),
      { expirationTtl: 30 * 24 * 60 * 60 }
    );

    // 로그인 성공 기록
    await db
      .prepare(`
        INSERT INTO login_attempts (id, email, user_id, ip_address, success)
        VALUES (?, ?, ?, ?, 1)
      `)
      .bind(
        crypto.randomUUID(),
        user.email as string,
        user.id,
        c.req.header('CF-Connecting-IP') || 'unknown'
      )
      .run();

    // 마지막 로그인 시간 업데이트
    await db
      .prepare("UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .bind(user.id)
      .run();

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        isAdmin,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    return c.json({ error: '로그인 중 오류가 발생했습니다' }, 500);
  }
});

// POST /auth/refresh - 토큰 갱신
login.post('/refresh', async (c) => {
  const db = c.env.DB;
  const kv = c.env.SESSIONS;
  const { jwtVerify } = await import('jose');

  const body = await c.req.json<{ refreshToken: string }>();
  const { refreshToken } = body;

  if (!refreshToken) {
    return c.json({ error: 'Refresh token이 필요합니다' }, 400);
  }

  try {
    // 토큰 검증
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(refreshToken, secret);

    if (payload.type !== 'refresh') {
      return c.json({ error: '유효하지 않은 토큰입니다' }, 401);
    }

    const userId = payload.sub as string;

    // KV에서 토큰 확인
    const storedToken = await kv.get(
      `refresh_token:${userId}:${refreshToken.slice(-10)}`
    );

    if (!storedToken) {
      return c.json({ error: '만료되었거나 폐기된 토큰입니다' }, 401);
    }

    // 사용자 정보 조회
    const user = await db
      .prepare('SELECT id, email, name, avatar_url, is_active FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user || !user.is_active) {
      return c.json({ error: '유효하지 않은 사용자입니다' }, 401);
    }

    // 관리자 여부 확인
    const adminRecord = await db
      .prepare('SELECT id FROM admins WHERE user_id = ? AND is_active = 1')
      .bind(userId)
      .first();

    const isAdmin = !!adminRecord;

    // 새 토큰 생성
    const tokens = await generateTokens(
      userId,
      user.email as string,
      isAdmin,
      c.env.JWT_SECRET
    );

    // 기존 Refresh Token 삭제
    await kv.delete(`refresh_token:${userId}:${refreshToken.slice(-10)}`);

    // 새 Refresh Token 저장
    await kv.put(
      `refresh_token:${userId}:${tokens.refreshToken.slice(-10)}`,
      JSON.stringify({
        userId,
        token: tokens.refreshToken,
        createdAt: new Date().toISOString(),
      }),
      { expirationTtl: 30 * 24 * 60 * 60 }
    );

    return c.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('토큰 갱신 오류:', error);
    return c.json({ error: '토큰 갱신 중 오류가 발생했습니다' }, 401);
  }
});

// POST /auth/logout - 로그아웃
login.post('/logout', async (c) => {
  const kv = c.env.SESSIONS;

  const body = await c.req.json<{ refreshToken: string }>();
  const { refreshToken } = body;

  if (!refreshToken) {
    return c.json({ success: true }); // 토큰 없어도 성공 처리
  }

  try {
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);

    try {
      const { payload } = await jwtVerify(refreshToken, secret);
      const userId = payload.sub as string;

      // KV에서 토큰 삭제
      await kv.delete(`refresh_token:${userId}:${refreshToken.slice(-10)}`);
    } catch {
      // 토큰이 이미 만료되었거나 유효하지 않음 - 무시
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('로그아웃 오류:', error);
    return c.json({ success: true }); // 에러가 있어도 성공 처리
  }
});

// POST /auth/forgot-password - 비밀번호 재설정 요청
login.post('/forgot-password', async (c) => {
  const db = c.env.DB;
  const kv = c.env.SESSIONS;

  const body = await c.req.json<{ email: string }>();
  const { email } = body;

  if (!email) {
    return c.json({ error: '이메일을 입력해주세요' }, 400);
  }

  try {
    // 사용자 조회
    const user = await db
      .prepare('SELECT id, email, name FROM users WHERE email = ? AND is_active = 1')
      .bind(email.toLowerCase())
      .first();

    // 보안상 사용자 존재 여부와 관계없이 동일한 응답
    if (!user) {
      return c.json({
        message: '해당 이메일로 비밀번호 재설정 링크를 전송했습니다'
      });
    }

    // 재설정 토큰 생성
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1시간

    // KV에 토큰 저장
    await kv.put(
      `password_reset:${resetToken}`,
      JSON.stringify({
        userId: user.id,
        email: user.email,
        expiresAt: expiresAt.toISOString(),
      }),
      { expirationTtl: 3600 }
    );

    // TODO: 이메일 발송 (Resend API 연동)
    console.log(`비밀번호 재설정 링크: /reset-password?token=${resetToken}`);

    return c.json({
      message: '해당 이메일로 비밀번호 재설정 링크를 전송했습니다'
    });
  } catch (error) {
    console.error('비밀번호 재설정 요청 오류:', error);
    return c.json({ error: '처리 중 오류가 발생했습니다' }, 500);
  }
});

// POST /auth/reset-password - 비밀번호 재설정
login.post('/reset-password', async (c) => {
  const db = c.env.DB;
  const kv = c.env.SESSIONS;

  const body = await c.req.json<{
    token: string;
    password: string;
  }>();

  const { token, password } = body;

  if (!token || !password) {
    return c.json({ error: '토큰과 새 비밀번호를 입력해주세요' }, 400);
  }

  if (password.length < 8) {
    return c.json({ error: '비밀번호는 최소 8자 이상이어야 합니다' }, 400);
  }

  try {
    // KV에서 토큰 조회
    const tokenData = await kv.get<{
      userId: string;
      email: string;
      expiresAt: string;
    }>(`password_reset:${token}`, 'json');

    if (!tokenData) {
      return c.json({ error: '유효하지 않거나 만료된 토큰입니다' }, 400);
    }

    // 만료 확인
    if (new Date(tokenData.expiresAt) < new Date()) {
      await kv.delete(`password_reset:${token}`);
      return c.json({ error: '만료된 토큰입니다' }, 400);
    }

    // 비밀번호 해싱
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    // 비밀번호 업데이트
    await db
      .prepare(`
        UPDATE users
        SET password_hash = ?, password_salt = ?, updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(passwordHash, salt, tokenData.userId)
      .run();

    // 토큰 삭제
    await kv.delete(`password_reset:${token}`);

    // 모든 Refresh Token 폐기 (강제 재로그인)
    const prefix = `refresh_token:${tokenData.userId}:`;
    // Note: KV list는 Workers에서 제한적이므로 필요시 별도 처리

    return c.json({ message: '비밀번호가 성공적으로 변경되었습니다' });
  } catch (error) {
    console.error('비밀번호 재설정 오류:', error);
    return c.json({ error: '비밀번호 재설정 중 오류가 발생했습니다' }, 500);
  }
});

export default login;
