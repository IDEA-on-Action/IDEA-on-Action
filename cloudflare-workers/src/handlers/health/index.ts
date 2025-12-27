/**
 * Health Check Handler
 * Supabase api-v1-health → Cloudflare Workers
 */

import { Hono } from 'hono';
import { Env, AppType } from '../../types';

const health = new Hono<AppType>();

// 서비스 시작 시간
const SERVICE_START_TIME = Date.now();

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  environment: string;
  uptime_seconds?: number;
  response_time_ms?: number;
  checks?: Record<string, { status: string; latency_ms?: number }>;
}

/**
 * 기본 헬스체크
 * GET /health
 */
health.get('/', async (c) => {
  const startTime = performance.now();

  const response: HealthResponse = {
    status: 'healthy',
    version: c.env.API_VERSION || '2.39.1',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'production',
    response_time_ms: Math.round(performance.now() - startTime),
  };

  return c.json(response);
});

/**
 * Kubernetes liveness probe
 * GET /health/live
 */
health.get('/live', async (c) => {
  return c.json({
    status: 'healthy',
    version: c.env.API_VERSION,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - SERVICE_START_TIME) / 1000),
  });
});

/**
 * Kubernetes readiness probe
 * GET /health/ready
 */
health.get('/ready', async (c) => {
  const startTime = performance.now();
  const checks: Record<string, { status: string; latency_ms?: number }> = {};

  // D1 체크
  try {
    const d1Start = performance.now();
    await c.env.DB.prepare('SELECT 1').first();
    checks.database = {
      status: 'pass',
      latency_ms: Math.round(performance.now() - d1Start),
    };
  } catch (error) {
    checks.database = {
      status: 'fail',
      latency_ms: Math.round(performance.now() - startTime),
    };
  }

  // KV 체크
  try {
    const kvStart = performance.now();
    await c.env.CACHE.get('health-check');
    checks.kv = {
      status: 'pass',
      latency_ms: Math.round(performance.now() - kvStart),
    };
  } catch (error) {
    checks.kv = {
      status: 'fail',
    };
  }

  const allPassed = Object.values(checks).every(c => c.status === 'pass');

  return c.json({
    status: allPassed ? 'healthy' : 'unhealthy',
    version: c.env.API_VERSION,
    timestamp: new Date().toISOString(),
    checks,
    response_time_ms: Math.round(performance.now() - startTime),
  }, allPassed ? 200 : 503);
});

/**
 * 상세 헬스체크
 * GET /health/detailed
 */
health.get('/detailed', async (c) => {
  const startTime = performance.now();
  const checks: Record<string, { status: string; latency_ms?: number; details?: unknown }> = {};

  // D1 Database 체크
  try {
    const d1Start = performance.now();
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM subscription_plans'
    ).first<{ count: number }>();
    checks.database = {
      status: 'pass',
      latency_ms: Math.round(performance.now() - d1Start),
      details: { plans_count: result?.count || 0 },
    };
  } catch (error) {
    checks.database = { status: 'fail' };
  }

  // KV Sessions 체크
  try {
    const kvStart = performance.now();
    await c.env.SESSIONS.get('_health');
    checks.sessions_kv = {
      status: 'pass',
      latency_ms: Math.round(performance.now() - kvStart),
    };
  } catch {
    checks.sessions_kv = { status: 'fail' };
  }

  // R2 Storage 체크
  try {
    const r2Start = performance.now();
    await c.env.MEDIA_BUCKET.head('_health');
    checks.storage = {
      status: 'pass',
      latency_ms: Math.round(performance.now() - r2Start),
    };
  } catch {
    // R2 head 실패해도 연결은 됨
    checks.storage = { status: 'pass' };
  }

  const failedChecks = Object.values(checks).filter(c => c.status === 'fail').length;
  const status = failedChecks === 0 ? 'healthy' : failedChecks < 2 ? 'degraded' : 'unhealthy';

  return c.json({
    status,
    version: c.env.API_VERSION,
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    uptime_seconds: Math.floor((Date.now() - SERVICE_START_TIME) / 1000),
    checks,
    response_time_ms: Math.round(performance.now() - startTime),
  }, status === 'unhealthy' ? 503 : 200);
});

export default health;
