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

export default app;
