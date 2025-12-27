/**
 * 세션 API 핸들러
 * Wave 2: 중위험 함수 - KV 기반 세션 관리
 */

import { Hono } from 'hono';
import { AppType, AuthContext } from '../../types';
import { requireAuth } from '../../middleware/auth';

const sessions = new Hono<AppType>();

// 세션 키 접두어
const SESSION_PREFIX = 'session:';
const USER_SESSIONS_PREFIX = 'user_sessions:';

interface SessionData {
  id: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    device?: string;
    browser?: string;
    os?: string;
  };
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

// User-Agent 파싱 (간단한 버전)
function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let device = 'Unknown';
  let browser = 'Unknown';
  let os = 'Unknown';

  // OS 감지
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // 브라우저 감지
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';

  // 디바이스 감지
  if (ua.includes('Mobile')) device = 'Mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';
  else device = 'Desktop';

  return { device, browser, os };
}

// 현재 사용자의 모든 세션 조회
sessions.get('/', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const kv = c.env.SESSIONS;

  try {
    // 사용자의 세션 목록 조회
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${auth.userId}`;
    const sessionIds = await kv.get<string[]>(userSessionsKey, 'json');

    if (!sessionIds || sessionIds.length === 0) {
      return c.json({ sessions: [] });
    }

    // 각 세션 데이터 조회
    const sessionsData: SessionData[] = [];
    for (const sessionId of sessionIds) {
      const sessionData = await kv.get<SessionData>(`${SESSION_PREFIX}${sessionId}`, 'json');
      if (sessionData) {
        sessionsData.push(sessionData);
      }
    }

    // 만료된 세션 필터링
    const now = new Date().toISOString();
    const activeSessions = sessionsData.filter(s => s.expiresAt > now);

    return c.json({ sessions: activeSessions });
  } catch (error) {
    console.error('세션 목록 조회 오류:', error);
    return c.json({ error: '세션 목록 조회 중 오류가 발생했습니다' }, 500);
  }
});

// 새 세션 생성
sessions.post('/', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const kv = c.env.SESSIONS;
  const db = c.env.DB;

  try {
    const userAgent = c.req.header('User-Agent') || 'Unknown';
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'Unknown';
    const { device, browser, os } = parseUserAgent(userAgent);

    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30일

    const sessionData: SessionData = {
      id: sessionId,
      userId: auth.userId!,
      deviceInfo: {
        userAgent,
        ip,
        device,
        browser,
        os,
      },
      createdAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // KV에 세션 저장
    await kv.put(
      `${SESSION_PREFIX}${sessionId}`,
      JSON.stringify(sessionData),
      { expirationTtl: 30 * 24 * 60 * 60 } // 30일
    );

    // 사용자의 세션 목록에 추가
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${auth.userId}`;
    const existingSessionIds = await kv.get<string[]>(userSessionsKey, 'json') || [];
    existingSessionIds.push(sessionId);
    await kv.put(userSessionsKey, JSON.stringify(existingSessionIds));

    // D1에도 기록 (감사 로그용)
    await db
      .prepare(`
        INSERT INTO user_sessions (id, user_id, device_info, ip_address, is_active)
        VALUES (?, ?, ?, ?, 1)
      `)
      .bind(sessionId, auth.userId, userAgent, ip)
      .run();

    return c.json({ session: sessionData }, 201);
  } catch (error) {
    console.error('세션 생성 오류:', error);
    return c.json({ error: '세션 생성 중 오류가 발생했습니다' }, 500);
  }
});

// 세션 활성 상태 업데이트 (heartbeat)
sessions.post('/:id/heartbeat', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const kv = c.env.SESSIONS;
  const sessionId = c.req.param('id');

  try {
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    const sessionData = await kv.get<SessionData>(sessionKey, 'json');

    if (!sessionData) {
      return c.json({ error: '세션을 찾을 수 없습니다' }, 404);
    }

    if (sessionData.userId !== auth.userId) {
      return c.json({ error: '권한이 없습니다' }, 403);
    }

    // 마지막 활성 시간 업데이트
    sessionData.lastActiveAt = new Date().toISOString();
    await kv.put(sessionKey, JSON.stringify(sessionData));

    return c.json({ success: true });
  } catch (error) {
    console.error('세션 heartbeat 오류:', error);
    return c.json({ error: '세션 업데이트 중 오류가 발생했습니다' }, 500);
  }
});

// 특정 세션 종료
sessions.delete('/:id', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const kv = c.env.SESSIONS;
  const db = c.env.DB;
  const sessionId = c.req.param('id');

  try {
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    const sessionData = await kv.get<SessionData>(sessionKey, 'json');

    if (!sessionData) {
      return c.json({ error: '세션을 찾을 수 없습니다' }, 404);
    }

    if (sessionData.userId !== auth.userId && !auth.isAdmin) {
      return c.json({ error: '권한이 없습니다' }, 403);
    }

    // KV에서 세션 삭제
    await kv.delete(sessionKey);

    // 사용자의 세션 목록에서 제거
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${sessionData.userId}`;
    const existingSessionIds = await kv.get<string[]>(userSessionsKey, 'json') || [];
    const updatedSessionIds = existingSessionIds.filter(id => id !== sessionId);
    await kv.put(userSessionsKey, JSON.stringify(updatedSessionIds));

    // D1 기록 업데이트
    await db
      .prepare("UPDATE user_sessions SET is_active = 0, updated_at = datetime('now') WHERE id = ?")
      .bind(sessionId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('세션 종료 오류:', error);
    return c.json({ error: '세션 종료 중 오류가 발생했습니다' }, 500);
  }
});

// 현재 기기 외 모든 세션 종료
sessions.delete('/others', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const kv = c.env.SESSIONS;
  const db = c.env.DB;
  const currentSessionId = c.req.header('X-Session-ID');

  try {
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${auth.userId}`;
    const sessionIds = await kv.get<string[]>(userSessionsKey, 'json') || [];

    let revokedCount = 0;
    for (const sessionId of sessionIds) {
      if (sessionId !== currentSessionId) {
        await kv.delete(`${SESSION_PREFIX}${sessionId}`);
        revokedCount++;
      }
    }

    // 현재 세션만 유지
    if (currentSessionId) {
      await kv.put(userSessionsKey, JSON.stringify([currentSessionId]));
    } else {
      await kv.put(userSessionsKey, JSON.stringify([]));
    }

    // D1 기록 업데이트
    if (currentSessionId) {
      await db
        .prepare("UPDATE user_sessions SET is_active = 0, updated_at = datetime('now') WHERE user_id = ? AND id != ?")
        .bind(auth.userId, currentSessionId)
        .run();
    } else {
      await db
        .prepare("UPDATE user_sessions SET is_active = 0, updated_at = datetime('now') WHERE user_id = ?")
        .bind(auth.userId)
        .run();
    }

    return c.json({
      success: true,
      revokedCount,
      message: `${revokedCount}개의 세션이 종료되었습니다`
    });
  } catch (error) {
    console.error('다른 세션 종료 오류:', error);
    return c.json({ error: '세션 종료 중 오류가 발생했습니다' }, 500);
  }
});

export default sessions;
