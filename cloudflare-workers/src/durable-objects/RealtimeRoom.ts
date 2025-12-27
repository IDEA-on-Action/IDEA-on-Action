/**
 * RealtimeRoom Durable Object
 * Phase 6에서 완전 구현 예정
 * 현재는 스텁 클래스로 기존 배포와 호환성 유지
 */

export class RealtimeRoom {
  private state: DurableObjectState;
  private connections: Map<string, WebSocket>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.connections = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 내부 API 엔드포인트
    if (url.hostname === 'internal') {
      switch (url.pathname) {
        case '/broadcast':
          return this.handleBroadcast(request);
        case '/presence':
          return this.handlePresence();
        case '/stats':
          return this.handleStats();
        default:
          return new Response('Not Found', { status: 404 });
      }
    }

    // WebSocket 업그레이드
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const userId = url.searchParams.get('userId') || crypto.randomUUID();
    this.connections.set(userId, server);

    server.accept();

    server.addEventListener('message', (event) => {
      this.handleMessage(userId, event.data);
    });

    server.addEventListener('close', () => {
      this.connections.delete(userId);
      this.broadcastPresence();
    });

    server.addEventListener('error', () => {
      this.connections.delete(userId);
    });

    // 연결 알림
    this.broadcastPresence();

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private handleMessage(userId: string, data: string | ArrayBuffer) {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : null;
      if (!message) return;

      // 메시지 타입에 따른 처리
      switch (message.type) {
        case 'ping':
          this.sendToUser(userId, { type: 'pong' });
          break;
        case 'broadcast':
          this.broadcast(message.payload, userId);
          break;
        default:
          // 기본적으로 모든 사용자에게 브로드캐스트
          this.broadcast(message, userId);
      }
    } catch {
      console.error('메시지 처리 오류');
    }
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { channel: string; payload: unknown };
      this.broadcast({ channel: body.channel, ...body.payload as object });
      return new Response(JSON.stringify({ success: true, recipients: this.connections.size }));
    } catch {
      return new Response(JSON.stringify({ error: '브로드캐스트 실패' }), { status: 500 });
    }
  }

  private handlePresence(): Response {
    const users = Array.from(this.connections.keys());
    return new Response(JSON.stringify({ users, count: users.length }));
  }

  private handleStats(): Response {
    return new Response(JSON.stringify({
      connections: this.connections.size,
      uptime: Date.now(),
    }));
  }

  private broadcast(message: unknown, excludeUserId?: string) {
    const data = JSON.stringify(message);
    for (const [userId, ws] of this.connections) {
      if (userId !== excludeUserId) {
        try {
          ws.send(data);
        } catch {
          this.connections.delete(userId);
        }
      }
    }
  }

  private broadcastPresence() {
    const presence = {
      type: 'presence',
      users: Array.from(this.connections.keys()),
      count: this.connections.size,
    };
    this.broadcast(presence);
  }

  private sendToUser(userId: string, message: unknown) {
    const ws = this.connections.get(userId);
    if (ws) {
      try {
        ws.send(JSON.stringify(message));
      } catch {
        this.connections.delete(userId);
      }
    }
  }
}
