/**
 * 헬스체크 핸들러
 * Wave 1: 저위험 함수
 */

import { Context } from 'hono';
import type { Env } from '../../types';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  timestamp: string;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    latency?: number;
    message?: string;
  }[];
  uptime?: number;
}

/**
 * D1 연결 확인
 */
async function checkD1(db: D1Database): Promise<{ ok: boolean; latency: number; error?: string }> {
  const start = Date.now();
  try {
    await db.prepare('SELECT 1').first();
    return { ok: true, latency: Date.now() - start };
  } catch (error) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * KV 연결 확인
 */
async function checkKV(kv: KVNamespace): Promise<{ ok: boolean; latency: number; error?: string }> {
  const start = Date.now();
  try {
    await kv.get('health-check');
    return { ok: true, latency: Date.now() - start };
  } catch (error) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * R2 연결 확인
 */
async function checkR2(
  bucket: R2Bucket
): Promise<{ ok: boolean; latency: number; error?: string }> {
  const start = Date.now();
  try {
    await bucket.head('health-check');
    return { ok: true, latency: Date.now() - start };
  } catch (error) {
    // R2는 파일이 없어도 연결은 성공
    const latency = Date.now() - start;
    if (error instanceof Error && error.message.includes('not found')) {
      return { ok: true, latency };
    }
    return {
      ok: false,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 헬스체크 핸들러
 */
export async function healthHandler(c: Context<{ Bindings: Env }>) {
  const checks: HealthCheckResult['checks'] = [];

  // D1 체크
  const d1Check = await checkD1(c.env.DB);
  checks.push({
    name: 'd1',
    status: d1Check.ok ? 'pass' : 'fail',
    latency: d1Check.latency,
    message: d1Check.error,
  });

  // KV 체크
  const kvCheck = await checkKV(c.env.SESSIONS);
  checks.push({
    name: 'kv',
    status: kvCheck.ok ? 'pass' : 'fail',
    latency: kvCheck.latency,
    message: kvCheck.error,
  });

  // R2 체크
  const r2Check = await checkR2(c.env.MEDIA_BUCKET);
  checks.push({
    name: 'r2',
    status: r2Check.ok ? 'pass' : 'fail',
    latency: r2Check.latency,
    message: r2Check.error,
  });

  // 전체 상태 결정
  const failedChecks = checks.filter((check) => check.status === 'fail');
  const warnChecks = checks.filter((check) => check.status === 'warn');

  let overallStatus: HealthCheckResult['status'];
  if (failedChecks.length > 0) {
    overallStatus = 'unhealthy';
  } else if (warnChecks.length > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    version: c.env.API_VERSION || 'v1',
    environment: c.env.ENVIRONMENT || 'production',
    timestamp: new Date().toISOString(),
    checks,
  };

  // HTTP 상태 코드 결정
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return c.json(result, httpStatus);
}

/**
 * 간단한 헬스체크 (빠른 응답)
 */
export async function pingHandler(c: Context<{ Bindings: Env }>) {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

/**
 * 상세 헬스체크 (디버깅용)
 */
export async function detailedHealthHandler(c: Context<{ Bindings: Env }>) {
  const result = await healthHandler(c);

  // 추가 정보
  const detailed = {
    ...result,
    runtime: {
      platform: 'cloudflare-workers',
      region: c.req.header('cf-ipcountry') || 'unknown',
      colo: c.req.header('cf-ray')?.split('-')[1] || 'unknown',
    },
    request: {
      method: c.req.method,
      path: c.req.path,
      ip: c.req.header('cf-connecting-ip'),
      userAgent: c.req.header('user-agent'),
    },
  };

  return c.json(detailed);
}
