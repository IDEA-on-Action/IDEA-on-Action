/**
 * IDEA on Action API Server
 * Cloudflare Workers (Supabase Edge Functions 대체)
 *
 * Phase 2-6: 완전 마이그레이션
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

// 미들웨어
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rate-limit';

// Wave 1: 저위험 함수
import { healthHandler } from './handlers/api/health';

// Wave 2: 중위험 함수
import users from './handlers/api/users';
import sessions from './handlers/api/sessions';

// Wave 3: OAuth/결제
import authorize from './handlers/oauth/authorize';
import token from './handlers/oauth/token';
import toss from './handlers/payments/toss';

// Wave 4: RAG/AI
import search from './handlers/rag/search';

// Phase 4: Storage
import r2 from './handlers/storage/r2';

// Phase 5: Auth
import login from './handlers/auth/login';

// Phase 6: Realtime
import websocket from './handlers/realtime/websocket';

// 환경 변수 타입
export interface Env {
  // KV 네임스페이스
  SESSION_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
  CACHE_KV: KVNamespace;

  // D1 데이터베이스
  DB: D1Database;

  // R2 스토리지
  MEDIA_BUCKET: R2Bucket;

  // Vectorize
  VECTORIZE: VectorizeIndex;

  // Durable Objects
  REALTIME_ROOM: DurableObjectNamespace;

  // 환경 변수
  ENVIRONMENT: string;
  API_VERSION: string;
  ALLOWED_ORIGINS: string;

  // 시크릿
  JWT_SECRET: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TOSS_SECRET_KEY: string;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  RESEND_API_KEY: string;
  SLACK_WEBHOOK_URL: string;
  MINU_WEBHOOK_SECRET: string;
  INTERNAL_API_KEY: string;
}

// Hono 앱 생성
const app = new Hono<{ Bindings: Env }>();

// ============================================
// 글로벌 미들웨어
// ============================================

// 로깅
app.use('*', logger());

// Pretty JSON (개발 환경)
app.use('*', prettyJSON());

// 보안 헤더
app.use('*', secureHeaders());

// CORS 설정
app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS.split(',');

  return cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0];
      if (allowedOrigins.includes(origin)) return origin;
      // 개발 환경 localhost 허용
      if (origin.startsWith('http://localhost:')) return origin;
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400,
  })(c, next);
});

// Rate Limiting
app.use('/api/*', rateLimitMiddleware);

// ============================================
// API 라우트
// ============================================

// 헬스체크 (인증 불필요)
app.get('/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// ============================================
// Phase 5: 인증 (인증 불필요)
// ============================================
app.route('/auth', login);
app.route('/api/v1/auth', login);

// ============================================
// Wave 2: 중위험 함수
// ============================================

// 사용자 API
app.route('/api/v1/users', users);

// 세션 API
app.route('/api/v1/sessions', sessions);

// ============================================
// Wave 3: OAuth 2.0
// ============================================

// OAuth 인가
app.route('/oauth/authorize', authorize);

// OAuth 토큰
app.route('/oauth/token', token);

// ============================================
// Wave 3: 결제
// ============================================

// 토스페이먼츠
app.route('/api/v1/payments/toss', toss);

// ============================================
// Wave 4: RAG 검색
// ============================================

// RAG 검색
app.route('/api/v1/rag', search);

// ============================================
// Phase 4: 스토리지
// ============================================

// R2 스토리지
app.route('/api/v1/storage', r2);

// ============================================
// Phase 6: 실시간
// ============================================

// WebSocket/Realtime
app.route('/realtime', websocket);
app.route('/api/v1/realtime', websocket);

// ============================================
// 에러 핸들링
// ============================================

// 404 Not Found
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
      status: 404,
    },
    404
  );
});

// 글로벌 에러 핸들러
app.onError((err, c) => {
  console.error('Unhandled error:', err);

  const status = 'status' in err ? (err.status as number) : 500;
  const message = err.message || 'Internal Server Error';

  return c.json(
    {
      error: status === 500 ? 'Internal Server Error' : message,
      message: c.env.ENVIRONMENT === 'development' ? err.stack : undefined,
      status,
    },
    status
  );
});

// ============================================
// 내보내기
// ============================================

export default app;

// Durable Objects 클래스 내보내기 (Phase 6)
export { RealtimeRoom } from './realtime/room';
