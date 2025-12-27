/**
 * IDEA on Action - Cloudflare Workers API
 * 메인 라우터 (Hono Framework)
 * 
 * Supabase Edge Functions에서 마이그레이션
 */

import { Hono } from 'hono';
import { AppType } from './types';
import { corsMiddleware } from './middleware/cors';
import { authMiddleware } from './middleware/auth';

// Handlers
import health from './handlers/health';
import slack from './handlers/notifications/slack';
import email from './handlers/notifications/email';

// API Handlers (Wave 2)
import users from './handlers/api/users';
import sessions from './handlers/api/sessions';
import teams from './handlers/api/teams';
import permissions from './handlers/api/permissions';

// OAuth Handlers (Wave 3)
import authorize from './handlers/oauth/authorize';
import token from './handlers/oauth/token';
import revoke from './handlers/oauth/revoke';

// Payment Handlers (Wave 3)
import toss from './handlers/payments/toss';
import subscription from './handlers/payments/subscription';

// RAG Handlers (Wave 4)
import search from './handlers/rag/search';

// Storage Handlers (Phase 4)
import r2 from './handlers/storage/r2';

// Realtime Handlers (Phase 6)
import websocket from './handlers/realtime/websocket';

// Auth Handlers (Phase 5)
import login from './handlers/auth/login';

// MCP Handlers (Phase 7)
import mcpAuth from './handlers/mcp/auth';
import mcpEvents from './handlers/mcp/events';
import mcpRouter from './handlers/mcp/router';
import mcpSync from './handlers/mcp/sync';

// Minu SSO Handlers (Phase 8)
import minuOAuthCallback from './handlers/minu/oauth-callback';
import minuTokenExchange from './handlers/minu/token-exchange';
import minuWebhook from './handlers/minu/webhook';

// Cron Handlers (Phase 9)
import subscriptionProcessor from './handlers/cron/subscription-processor';

// Profile Sync Handlers (Phase 10)
import profileSync from './handlers/profile/sync';

// Durable Objects
export { RealtimeRoom } from './durable-objects/RealtimeRoom';

// 메인 앱
const app = new Hono<AppType>();

// 글로벌 미들웨어
app.use('*', corsMiddleware);
app.use('*', authMiddleware);

// 루트 엔드포인트
app.get('/', (c) => {
  return c.json({
    name: 'IDEA on Action API',
    version: c.env.API_VERSION || '2.39.1',
    environment: c.env.ENVIRONMENT || 'production',
    docs: 'https://docs.ideaonaction.ai/api',
  });
});

// Health Check
app.route('/health', health);

// Notifications
app.route('/notifications/slack', slack);
app.route('/notifications/email', email);

// API v1 (Wave 2)
app.route('/api/v1/users', users);
app.route('/api/v1/sessions', sessions);
app.route('/api/v1/teams', teams);
app.route('/api/v1/permissions', permissions);

// OAuth 2.0 (Wave 3)
app.route('/oauth/authorize', authorize);
app.route('/oauth/token', token);
app.route('/oauth/revoke', revoke);

// Payments (Wave 3)
app.route('/api/v1/payments', toss);
app.route('/api/v1/subscriptions', subscription);

// RAG (Wave 4)
app.route('/api/v1/rag/search', search);

// Storage (Phase 4)
app.route('/api/v1/storage', r2);

// Realtime (Phase 6)
app.route('/realtime', websocket);

// Auth (Phase 5)
app.route('/auth', login);

// MCP (Phase 7)
app.route('/mcp/auth', mcpAuth);
app.route('/mcp/events', mcpEvents);
app.route('/mcp/router', mcpRouter);
app.route('/mcp/sync', mcpSync);

// Minu SSO (Phase 8)
app.route('/minu/oauth', minuOAuthCallback);
app.route('/minu/token', minuTokenExchange);
app.route('/minu/webhook', minuWebhook);

// Cron Jobs (Phase 9)
app.route('/cron/subscriptions', subscriptionProcessor);

// Profile Sync (Phase 10)
app.route('/profile', profileSync);

// 404 핸들러
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: '요청한 엔드포인트를 찾을 수 없습니다.',
    path: new URL(c.req.url).pathname,
  }, 404);
});

// 에러 핸들러
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message || '서버 오류가 발생했습니다.',
    requestId: c.req.header('CF-Ray') || 'unknown',
  }, 500);
});

// Scheduled 이벤트 핸들러 (Cron)
import { processSubscriptions } from './handlers/cron/subscription-processor';

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: AppType['Bindings'], ctx: ExecutionContext) {
    console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);

    // 정기결제 처리
    ctx.waitUntil(processSubscriptions(env));
  },
};
