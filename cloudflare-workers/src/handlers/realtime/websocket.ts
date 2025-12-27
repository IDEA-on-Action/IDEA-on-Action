/**
 * 실시간 WebSocket 라우터
 * Phase 6: Durable Objects 연동
 */

import { Hono } from 'hono';
import { AppType } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const websocket = new Hono<AppType>();

// GET /realtime/:roomId - WebSocket 연결
websocket.get('/:roomId', authMiddleware, async (c) => {
  const roomId = c.req.param('roomId');
  const auth = c.get('auth');

  // WebSocket 업그레이드 확인
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return c.json({ error: 'WebSocket 업그레이드가 필요합니다' }, 426);
  }

  // Durable Object로 요청 전달
  const id = c.env.REALTIME_ROOM.idFromName(roomId);
  const room = c.env.REALTIME_ROOM.get(id);

  // 사용자 정보를 URL 파라미터로 전달
  const url = new URL(c.req.url);
  if (auth?.userId) {
    url.searchParams.set('userId', auth.userId);
  }

  // 원래 요청의 헤더를 복사
  const request = new Request(url.toString(), {
    headers: c.req.raw.headers,
  });

  return room.fetch(request);
});

// POST /realtime/:roomId/broadcast - 브로드캐스트 (서버 사이드)
websocket.post('/:roomId/broadcast', async (c) => {
  const roomId = c.req.param('roomId');

  // API Key 또는 관리자 인증 확인
  const apiKey = c.req.header('X-API-Key');
  if (apiKey !== c.env.INTERNAL_API_KEY) {
    const auth = c.get('auth');
    if (!auth?.isAdmin) {
      return c.json({ error: '권한이 없습니다' }, 403);
    }
  }

  const body = await c.req.json<{
    channel: string;
    payload: unknown;
  }>();

  if (!body.channel || !body.payload) {
    return c.json({ error: 'channel과 payload는 필수입니다' }, 400);
  }

  const id = c.env.REALTIME_ROOM.idFromName(roomId);
  const room = c.env.REALTIME_ROOM.get(id);

  const response = await room.fetch(new Request('https://internal/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));

  const result = await response.json();
  return c.json(result, response.ok ? 200 : 500);
});

// GET /realtime/:roomId/presence - Presence 조회
websocket.get('/:roomId/presence', authMiddleware, async (c) => {
  const roomId = c.req.param('roomId');

  const id = c.env.REALTIME_ROOM.idFromName(roomId);
  const room = c.env.REALTIME_ROOM.get(id);

  const response = await room.fetch(new Request('https://internal/presence'));
  const result = await response.json();

  return c.json(result, response.ok ? 200 : 500);
});

// GET /realtime/:roomId/stats - 통계 조회
websocket.get('/:roomId/stats', async (c) => {
  const roomId = c.req.param('roomId');

  const id = c.env.REALTIME_ROOM.idFromName(roomId);
  const room = c.env.REALTIME_ROOM.get(id);

  const response = await room.fetch(new Request('https://internal/stats'));
  const result = await response.json();

  return c.json(result, response.ok ? 200 : 500);
});

// GET /realtime/rooms - 모든 룸 목록 (관리자용)
websocket.get('/rooms', async (c) => {
  const auth = c.get('auth');
  if (!auth?.isAdmin) {
    return c.json({ error: '관리자 권한이 필요합니다' }, 403);
  }

  // Note: Durable Objects는 모든 인스턴스를 직접 열거하는 API가 없음
  // KV에 활성 룸 목록을 저장하는 방식으로 구현 가능
  const kv = c.env.SESSIONS;

  try {
    const roomsData = await kv.get<string[]>('active_rooms', 'json');
    const rooms = roomsData || [];

    return c.json({ rooms });
  } catch {
    return c.json({ rooms: [] });
  }
});

// GET /realtime/status - 서비스 상태 확인
websocket.get('/status', async (c) => {
  return c.json({
    available: true,
    message: 'Realtime 서비스가 활성화되어 있습니다'
  });
});

export default websocket;
