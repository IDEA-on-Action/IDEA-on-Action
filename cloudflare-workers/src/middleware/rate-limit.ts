/**
 * Rate Limiting 미들웨어
 * Cloudflare KV 기반 요청 제한
 */

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../index';

// Rate Limit 설정 타입
interface RateLimitConfig {
  // 윈도우 크기 (초)
  windowSec: number;
  // 윈도우당 최대 요청 수
  maxRequests: number;
  // 키 생성 함수
  keyGenerator?: (c: Context<{ Bindings: Env }>) => string;
  // 제한 초과 시 메시지
  message?: string;
  // 스킵 조건
  skip?: (c: Context<{ Bindings: Env }>) => boolean;
}

// Rate Limit 정보 타입
interface RateLimitInfo {
  count: number;
  resetAt: number;
}

// 기본 설정
const DEFAULT_CONFIG: RateLimitConfig = {
  windowSec: 60, // 1분
  maxRequests: 100, // 분당 100 요청
};

// 엔드포인트별 Rate Limit 설정
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // 인증 관련 (엄격)
  '/api/v1/auth/login': { windowSec: 60, maxRequests: 10 },
  '/api/v1/auth/signup': { windowSec: 60, maxRequests: 5 },
  '/api/v1/auth/forgot-password': { windowSec: 60, maxRequests: 3 },
  '/oauth/token': { windowSec: 60, maxRequests: 20 },

  // AI 관련 (비용 고려)
  '/api/v1/ai/chat': { windowSec: 60, maxRequests: 20 },
  '/api/v1/ai/vision': { windowSec: 60, maxRequests: 10 },
  '/api/v1/rag/search': { windowSec: 60, maxRequests: 30 },

  // 결제 관련
  '/api/v1/payments': { windowSec: 60, maxRequests: 20 },

  // 웹훅 (높은 제한)
  '/api/v1/webhooks': { windowSec: 60, maxRequests: 200 },

  // 기본
  default: DEFAULT_CONFIG,
};

/**
 * Rate Limit 키 생성
 */
function generateKey(c: Context<{ Bindings: Env }>, config: RateLimitConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(c);
  }

  // 기본: IP + 경로
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  const path = new URL(c.req.url).pathname;

  // 인증된 사용자는 user_id 사용
  const auth = c.get('auth');
  if (auth?.userId) {
    return `ratelimit:user:${auth.userId}:${path}`;
  }

  return `ratelimit:ip:${ip}:${path}`;
}

/**
 * 경로에 맞는 Rate Limit 설정 찾기
 */
function getConfigForPath(path: string): RateLimitConfig {
  // 정확한 경로 매칭
  if (RATE_LIMIT_CONFIGS[path]) {
    return RATE_LIMIT_CONFIGS[path];
  }

  // 접두사 매칭
  for (const [pattern, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
    if (pattern !== 'default' && path.startsWith(pattern)) {
      return config;
    }
  }

  return RATE_LIMIT_CONFIGS.default;
}

/**
 * Rate Limit 미들웨어
 */
export const rateLimitMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c: Context<{ Bindings: Env }>, next: Next) => {
    const path = new URL(c.req.url).pathname;
    const config = getConfigForPath(path);

    // 스킵 조건 확인
    if (config.skip?.(c)) {
      return next();
    }

    const key = generateKey(c, config);
    const now = Date.now();
    const windowStart = now - config.windowSec * 1000;

    try {
      // KV에서 현재 상태 조회
      const stored = await c.env.RATE_LIMIT_KV.get<RateLimitInfo>(key, 'json');

      let info: RateLimitInfo;

      if (!stored || stored.resetAt < now) {
        // 새 윈도우 시작
        info = {
          count: 1,
          resetAt: now + config.windowSec * 1000,
        };
      } else {
        // 기존 윈도우 업데이트
        info = {
          count: stored.count + 1,
          resetAt: stored.resetAt,
        };
      }

      // Rate Limit 헤더 추가
      const remaining = Math.max(0, config.maxRequests - info.count);
      const resetInSeconds = Math.ceil((info.resetAt - now) / 1000);

      c.res.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      c.res.headers.set('X-RateLimit-Remaining', remaining.toString());
      c.res.headers.set('X-RateLimit-Reset', resetInSeconds.toString());

      // 제한 초과 확인
      if (info.count > config.maxRequests) {
        c.res.headers.set('Retry-After', resetInSeconds.toString());

        return c.json(
          {
            error: 'Too Many Requests',
            message: config.message || `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: resetInSeconds,
          },
          429
        );
      }

      // KV에 상태 저장
      await c.env.RATE_LIMIT_KV.put(key, JSON.stringify(info), {
        expirationTtl: config.windowSec + 60, // 여유 시간 추가
      });

      await next();
    } catch (error) {
      // KV 오류 시 요청 허용 (fail-open)
      console.error('Rate limit error:', error);
      await next();
    }
  }
);

/**
 * 커스텀 Rate Limit 미들웨어 생성
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return createMiddleware<{ Bindings: Env }>(
    async (c: Context<{ Bindings: Env }>, next: Next) => {
      // 스킵 조건 확인
      if (config.skip?.(c)) {
        return next();
      }

      const key = generateKey(c, config);
      const now = Date.now();

      try {
        const stored = await c.env.RATE_LIMIT_KV.get<RateLimitInfo>(key, 'json');

        let info: RateLimitInfo;

        if (!stored || stored.resetAt < now) {
          info = {
            count: 1,
            resetAt: now + config.windowSec * 1000,
          };
        } else {
          info = {
            count: stored.count + 1,
            resetAt: stored.resetAt,
          };
        }

        const remaining = Math.max(0, config.maxRequests - info.count);
        const resetInSeconds = Math.ceil((info.resetAt - now) / 1000);

        c.res.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
        c.res.headers.set('X-RateLimit-Remaining', remaining.toString());
        c.res.headers.set('X-RateLimit-Reset', resetInSeconds.toString());

        if (info.count > config.maxRequests) {
          c.res.headers.set('Retry-After', resetInSeconds.toString());

          return c.json(
            {
              error: 'Too Many Requests',
              message: config.message || `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: resetInSeconds,
            },
            429
          );
        }

        await c.env.RATE_LIMIT_KV.put(key, JSON.stringify(info), {
          expirationTtl: config.windowSec + 60,
        });

        await next();
      } catch (error) {
        console.error('Rate limit error:', error);
        await next();
      }
    }
  );
}

/**
 * Rate Limit 리셋 (관리자용)
 */
export async function resetRateLimit(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(key);
}

/**
 * Rate Limit 상태 조회 (관리자용)
 */
export async function getRateLimitStatus(
  kv: KVNamespace,
  key: string
): Promise<RateLimitInfo | null> {
  return await kv.get<RateLimitInfo>(key, 'json');
}
