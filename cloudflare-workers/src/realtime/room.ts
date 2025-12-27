/**
 * Durable Objects - 실시간 Room
 * Phase 6: Supabase Realtime → Durable Objects
 */

export interface Env {
  // Durable Object bindings
  REALTIME_ROOM: DurableObjectNamespace;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'broadcast' | 'presence' | 'ping';
  channel?: string;
  payload?: unknown;
  userId?: string;
}

interface PresenceState {
  onlineUsers: Map<string, {
    id: string;
    name?: string;
    avatarUrl?: string;
    lastSeen: number;
  }>;
}

interface ChannelSubscription {
  channels: Set<string>;
}

/**
 * RealtimeRoom Durable Object
 * 실시간 WebSocket 연결 및 메시지 브로드캐스트 관리
 */
export class RealtimeRoom {
  private state: DurableObjectState;
  private connections: Map<WebSocket, ChannelSubscription> = new Map();
  private presence: PresenceState = { onlineUsers: new Map() };
  private userSockets: Map<string, Set<WebSocket>> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket 업그레이드 처리
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // HTTP 요청 처리
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request);
    }

    if (url.pathname === '/presence' && request.method === 'GET') {
      return this.handleGetPresence();
    }

    if (url.pathname === '/stats' && request.method === 'GET') {
      return this.handleGetStats();
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // 연결 수락
    this.state.acceptWebSocket(server);

    // 초기 구독 정보
    this.connections.set(server, { channels: new Set() });

    // URL에서 사용자 정보 추출
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const userName = url.searchParams.get('name');
    const avatarUrl = url.searchParams.get('avatar');

    if (userId) {
      // Presence 등록
      this.presence.onlineUsers.set(userId, {
        id: userId,
        name: userName || undefined,
        avatarUrl: avatarUrl || undefined,
        lastSeen: Date.now(),
      });

      // 사용자별 소켓 추적
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(server);

      // 연결에 사용자 정보 저장
      server.serializeAttachment({ userId, userName, avatarUrl });

      // 입장 알림
      this.broadcastToChannel('presence', {
        type: 'presence_join',
        userId,
        name: userName,
        avatarUrl,
        timestamp: Date.now(),
      });
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const data = typeof message === 'string'
        ? JSON.parse(message) as WebSocketMessage
        : null;

      if (!data) return;

      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(ws, data.channel);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(ws, data.channel);
          break;

        case 'broadcast':
          if (data.channel && data.payload) {
            this.broadcastToChannel(data.channel, data.payload, ws);
          }
          break;

        case 'presence':
          this.handlePresenceUpdate(ws, data);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    } catch (error) {
      console.error('WebSocket 메시지 처리 오류:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '메시지 처리 중 오류가 발생했습니다',
      }));
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket 오류:', error);
    this.handleDisconnect(ws);
  }

  private handleSubscribe(ws: WebSocket, channel?: string): void {
    if (!channel) return;

    const subscription = this.connections.get(ws);
    if (subscription) {
      subscription.channels.add(channel);

      ws.send(JSON.stringify({
        type: 'subscribed',
        channel,
        timestamp: Date.now(),
      }));
    }
  }

  private handleUnsubscribe(ws: WebSocket, channel?: string): void {
    if (!channel) return;

    const subscription = this.connections.get(ws);
    if (subscription) {
      subscription.channels.delete(channel);

      ws.send(JSON.stringify({
        type: 'unsubscribed',
        channel,
        timestamp: Date.now(),
      }));
    }
  }

  private handlePresenceUpdate(ws: WebSocket, data: WebSocketMessage): void {
    const attachment = ws.deserializeAttachment() as { userId?: string } | null;
    const userId = attachment?.userId || data.userId;

    if (userId && this.presence.onlineUsers.has(userId)) {
      const user = this.presence.onlineUsers.get(userId)!;
      user.lastSeen = Date.now();

      // Presence 변경 브로드캐스트
      this.broadcastToChannel('presence', {
        type: 'presence_update',
        userId,
        lastSeen: user.lastSeen,
        payload: data.payload,
      });
    }
  }

  private handleDisconnect(ws: WebSocket): void {
    // 구독 정보 제거
    this.connections.delete(ws);

    // 사용자 정보 확인
    const attachment = ws.deserializeAttachment() as { userId?: string } | null;
    const userId = attachment?.userId;

    if (userId) {
      // 사용자 소켓에서 제거
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(ws);

        // 마지막 소켓이면 presence에서 제거
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          this.presence.onlineUsers.delete(userId);

          // 퇴장 알림
          this.broadcastToChannel('presence', {
            type: 'presence_leave',
            userId,
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  private broadcastToChannel(channel: string, payload: unknown, excludeWs?: WebSocket): void {
    const message = JSON.stringify({
      type: 'message',
      channel,
      payload,
      timestamp: Date.now(),
    });

    for (const [ws, subscription] of this.connections) {
      if (ws === excludeWs) continue;
      if (subscription.channels.has(channel) || channel === 'presence') {
        try {
          ws.send(message);
        } catch (error) {
          // 전송 실패한 연결 정리
          this.handleDisconnect(ws);
        }
      }
    }
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        channel: string;
        payload: unknown;
      };

      this.broadcastToChannel(body.channel, body.payload);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: '브로드캐스트 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private handleGetPresence(): Response {
    const users = Array.from(this.presence.onlineUsers.values());

    return new Response(JSON.stringify({ users }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private handleGetStats(): Response {
    return new Response(JSON.stringify({
      connections: this.connections.size,
      onlineUsers: this.presence.onlineUsers.size,
      channels: new Set(
        Array.from(this.connections.values())
          .flatMap(sub => Array.from(sub.channels))
      ).size,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 실시간 핸들러 (Workers에서 Durable Objects 접근)
 */
export async function handleRealtimeRequest(
  request: Request,
  env: Env,
  roomId: string
): Promise<Response> {
  const id = env.REALTIME_ROOM.idFromName(roomId);
  const room = env.REALTIME_ROOM.get(id);

  return room.fetch(request);
}
