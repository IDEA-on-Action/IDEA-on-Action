/**
 * Rate Limiting 미들웨어
 * Cloudflare KV 기반 Rate Limiter
 */

import { Context, Next } from 'hono';
import { AppType } from '../types';

interface RateLimitConfig {
  windowMs: number;      // 시간 윈도우 (밀리초)
  maxRequests: number;   // 최대 요청 수
  keyPrefix?: string;    // KV 키 프리픽스
}

interface RateLimitData {
  count: number;
  resetAt: number;
}

// 기본 Rate Limit 설정
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,   // 1분
  maxRequests: 100,      // 분당 100회
  keyPrefix: 'ratelimit',
};

// 엔드포인트별 Rate Limit 설정
const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  '/auth/login': { windowMs: 60 * 1000, maxRequests: 5 },       // 로그인: 분당 5회
  '/auth/register': { windowMs: 60 * 1000, maxRequests: 3 },    // 회원가입: 분당 3회
  '/api/v1/payments': { windowMs: 60 * 1000, maxRequests: 10 }, // 결제: 분당 10회
  '/api/v1/rag/search': { windowMs: 60 * 1000, maxRequests: 30 }, // RAG: 분당 30회
};

/**
 * Rate Limit 키 생성
 */
function getRateLimitKey(c: Context<AppType>, prefix: string): string {
  // IP 주소 또는 사용자 ID 기반
  const ip = c.req.header('CF-Connecting-IP') || 
             c.req.header('X-Forwarded-For')?.split(',')[0] || 
             'unknown';
  const userId = c.get('auth')?.userId;

  const identifier = userId || ip;
  const path = new URL(c.req.url).pathname;

  return `${prefix}:${path}:${identifier}`;
}

/**
 * Rate Limit 체크 및 업데이트
 */
async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const existing = await kv.get<RateLimitData>(key, 'json');

  // 새 윈도우 또는 기존 윈도우 만료
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs;
    await kv.put(key, JSON.stringify({ count: 1, resetAt }), {
      expirationTtl: Math.ceil(config.windowMs / 1000) + 60,
    });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  // 기존 윈도우 내 요청
  const newCount = existing.count + 1;
  const allowed = newCount <= config.maxRequests;

  if (allowed) {
    await kv.put(key, JSON.stringify({ count: newCount, resetAt: existing.resetAt }), {
      expirationTtl: Math.ceil((existing.resetAt - now) / 1000) + 60,
    });
  }

  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - newCount),
    resetAt: existing.resetAt,
  };
}

/**
 * Rate Limit 미들웨어
 */
export async function rateLimitMiddleware(c: Context<AppType>, next: Next) {
  const path = new URL(c.req.url).pathname;

  // 엔드포인트별 설정 또는 기본값
  const config = ENDPOINT_LIMITS[path] || DEFAULT_CONFIG;
  const key = getRateLimitKey(c, config.keyPrefix || 'ratelimit');

  const { allowed, remaining, resetAt } = await checkRateLimit(
    c.env.RATE_LIMIT,
    key,
    config
  );

  // Rate Limit 헤더 설정
  c.header('X-RateLimit-Limit', config.maxRequests.toString());
  c.header('X-RateLimit-Remaining', remaining.toString());
  c.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());

  if (!allowed) {
    return c.json(
      {
        error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        success: false,
        retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
      },
      429
    );
  }

  await next();
}

/**
 * 커스텀 Rate Limit 미들웨어 생성
 */
export function createRateLimiter(config: Partial<RateLimitConfig>) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async (c: Context<AppType>, next: Next) => {
    const key = getRateLimitKey(c, finalConfig.keyPrefix || 'ratelimit');
    const { allowed, remaining, resetAt } = await checkRateLimit(
      c.env.RATE_LIMIT,
      key,
      finalConfig
    );

    c.header('X-RateLimit-Limit', finalConfig.maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());

    if (!allowed) {
      return c.json({ error: '요청 한도 초과', success: false }, 429);
    }

    await next();
  };
}
