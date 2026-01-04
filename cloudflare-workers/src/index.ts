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
import { serviceKeyMiddleware } from './middleware/service-key';

// Handlers
import health from './handlers/health';
import slack from './handlers/notifications/slack';
import email from './handlers/notifications/email';

// API Handlers (Wave 2)
import users from './handlers/api/users';
import sessions from './handlers/api/sessions';
import teams from './handlers/api/teams';
import permissions from './handlers/api/permissions';

// API Handlers (Frontend Migration)
import services from './handlers/api/services';
import orders from './handlers/api/orders';
import cart from './handlers/api/cart';
import blog from './handlers/api/blog';
import notices from './handlers/api/notices';
import portfolio from './handlers/api/portfolio';
import roadmap from './handlers/api/roadmap';
import admin from './handlers/api/admin';

// OAuth Handlers (Wave 3)
import authorize from './handlers/oauth/authorize';
import token from './handlers/oauth/token';
import revoke from './handlers/oauth/revoke';

// OAuth Provider Handlers (Phase 2 Migration)
import googleOAuth from './handlers/oauth/google';
import githubOAuth from './handlers/oauth/github';
import kakaoOAuth from './handlers/oauth/kakao';
import microsoftOAuth from './handlers/oauth/microsoft';
import appleOAuth from './handlers/oauth/apple';

// 2FA Handler (Phase 2 Migration)
import twoFactorAuth from './handlers/auth/2fa';

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

// AI Handlers (Phase 11)
import claudeAI from './handlers/ai/claude';

// Webhook Handlers (Phase 12)
import webhookSend from './handlers/webhooks/send';

// Newsletter Handlers (Phase 12)
import newsletter from './handlers/notifications/newsletter';

// Cron Handlers (Phase 12)
import githubReleases, { syncGitHubReleases } from './handlers/cron/github-releases';

// Changelog Entries API (Phase 12)
import changelogEntries from './handlers/api/changelog-entries';
import weeklyRecap from './handlers/cron/weekly-recap';

// Monitoring Handlers (Phase 13)
import d1Monitoring from './handlers/monitoring/d1';

// Durable Objects
export { RealtimeRoom } from './durable-objects/RealtimeRoom';

// 메인 앱
const app = new Hono<AppType>();

// 글로벌 미들웨어
app.use('*', corsMiddleware);
app.use('*', serviceKeyMiddleware); // X-Service-Key 인증 (MCP Server 등)
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

// API v1 (Frontend Migration)
app.route('/api/v1/services', services);
app.route('/api/v1/orders', orders);
app.route('/api/v1/cart', cart);
app.route('/api/v1/blog', blog);
app.route('/api/v1/notices', notices);
app.route('/api/v1/portfolio', portfolio);
app.route('/api/v1/roadmap', roadmap);
app.route('/api/v1/changelog-entries', changelogEntries);

// Admin API (Service Key 인증)
app.route('/api/v1/admin', admin);

// OAuth 2.0 (Wave 3)
app.route('/oauth/authorize', authorize);
app.route('/oauth/token', token);
app.route('/oauth/revoke', revoke);

// OAuth Providers (Phase 2 Migration)
app.route('/oauth/google', googleOAuth);
app.route('/oauth/github', githubOAuth);
app.route('/oauth/kakao', kakaoOAuth);
app.route('/oauth/microsoft', microsoftOAuth);
app.route('/oauth/apple', appleOAuth);

// 2FA (Phase 2 Migration)
app.route('/auth/2fa', twoFactorAuth);

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

// AI (Phase 11)
app.route('/ai', claudeAI);

// Webhooks (Phase 12)
app.route('/webhooks', webhookSend);

// Newsletter (Phase 12)
app.route('/notifications/newsletter', newsletter);

// Cron Jobs (Phase 12)
app.route('/cron/github-releases', githubReleases);
app.route('/cron/weekly-recap', weeklyRecap);

// Monitoring (Phase 13)
app.route('/monitoring/d1', d1Monitoring);

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
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: AppType['Bindings'], ctx: ExecutionContext) {
    console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}, cron: ${event.cron}`);

    // 매일 00:00 UTC - 정기결제 처리
    if (event.cron === '0 0 * * *') {
      const { processSubscriptions } = await import('./handlers/cron/subscription-processor');
      ctx.waitUntil(processSubscriptions(env));
    }

    // 매시간 - GitHub 릴리즈 동기화
    if (event.cron === '0 * * * *') {
      ctx.waitUntil(syncGitHubReleases(env));
    }
  },
};
