/**
 * CORS 미들웨어
 * Supabase Edge Functions의 cors.ts 대체
 */

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../index';

// CORS 설정 타입
interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

// 기본 허용 오리진
const DEFAULT_ALLOWED_ORIGINS = [
  // 프로덕션
  'https://www.ideaonaction.ai',
  'https://ideaonaction.ai',
  // 프리뷰
  'https://preview.ideaonaction.ai',
  // Cloudflare Pages
  'https://idea-on-action.pages.dev',
  // Vercel (마이그레이션 기간)
  'https://vite-react-shadcn-ts.vercel.app',
  // Minu 서비스
  'https://find.minu.best',
  'https://frame.minu.best',
  'https://build.minu.best',
  'https://keep.minu.best',
];

// 개발 환경 오리진 패턴
const DEV_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^https:\/\/.*\.pages\.dev$/,
  /^https:\/\/.*--idea-on-action\.netlify\.app$/,
];

/**
 * 오리진 허용 여부 확인
 */
function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
  isDevelopment: boolean
): boolean {
  if (!origin) return false;

  // 명시적 허용 목록 확인
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // 개발 환경에서는 localhost 허용
  if (isDevelopment) {
    for (const pattern of DEV_ORIGIN_PATTERNS) {
      if (pattern.test(origin)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * CORS 미들웨어 생성
 */
export function createCorsMiddleware(options: CorsOptions = {}) {
  const {
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Client-Info',
      'apikey',
      'x-client-info',
    ],
    exposedHeaders = ['X-Request-ID', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials = true,
    maxAge = 86400,
  } = options;

  return createMiddleware<{ Bindings: Env }>(
    async (c: Context<{ Bindings: Env }>, next: Next) => {
      const origin = c.req.header('Origin');
      const isDevelopment = c.env.ENVIRONMENT === 'development';

      // 환경 변수에서 허용 오리진 가져오기
      const envOrigins = c.env.ALLOWED_ORIGINS
        ? c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : [];

      const allowedOrigins = [
        ...DEFAULT_ALLOWED_ORIGINS,
        ...envOrigins,
        ...(options.allowedOrigins || []),
      ];

      // 허용된 오리진인지 확인
      const isAllowed = isOriginAllowed(origin, allowedOrigins, isDevelopment);
      const responseOrigin = isAllowed ? origin : null;

      // Preflight 요청 (OPTIONS)
      if (c.req.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': responseOrigin || '',
            'Access-Control-Allow-Methods': allowedMethods.join(', '),
            'Access-Control-Allow-Headers': allowedHeaders.join(', '),
            'Access-Control-Expose-Headers': exposedHeaders.join(', '),
            'Access-Control-Allow-Credentials': credentials ? 'true' : 'false',
            'Access-Control-Max-Age': maxAge.toString(),
            Vary: 'Origin',
          },
        });
      }

      // 다음 핸들러 실행
      await next();

      // 응답에 CORS 헤더 추가
      if (responseOrigin) {
        c.res.headers.set('Access-Control-Allow-Origin', responseOrigin);
        c.res.headers.set('Access-Control-Allow-Credentials', credentials ? 'true' : 'false');
        c.res.headers.set('Access-Control-Expose-Headers', exposedHeaders.join(', '));
        c.res.headers.set('Vary', 'Origin');
      }
    }
  );
}

/**
 * 기본 CORS 미들웨어
 */
export const corsMiddleware = createCorsMiddleware();

/**
 * CORS 헤더 직접 생성 (레거시 호환)
 */
export function getCorsHeaders(
  origin: string | null,
  options: CorsOptions = {}
): Record<string, string> {
  const {
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders = ['X-Request-ID', 'X-RateLimit-Remaining'],
    credentials = true,
    maxAge = 86400,
  } = options;

  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders.join(', '),
    'Access-Control-Expose-Headers': exposedHeaders.join(', '),
    'Access-Control-Allow-Credentials': credentials ? 'true' : 'false',
    'Access-Control-Max-Age': maxAge.toString(),
    Vary: 'Origin',
  };
}

/**
 * OPTIONS 응답 생성 (레거시 호환)
 */
export function corsOptionsResponse(origin: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
