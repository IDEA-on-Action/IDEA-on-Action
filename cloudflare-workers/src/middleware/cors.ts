/**
 * CORS 미들웨어
 * Supabase _shared/cors.ts → Cloudflare Workers 마이그레이션
 */

import { Context, Next } from 'hono';
import { Env, AppType } from '../types';

// 허용된 도메인 목록
const ALLOWED_ORIGINS = [
  'https://www.ideaonaction.ai',
  'https://ideaonaction.ai',
  'https://preview.ideaonaction.ai',
  'https://idea-on-action.pages.dev',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
];

/**
 * Origin 유효성 검사
 */
function isAllowedOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return false;

  // 환경변수에서 추가 origin 가져오기
  const envOrigins = env.CORS_ORIGINS?.split(',') || [];
  const allOrigins = [...ALLOWED_ORIGINS, ...envOrigins];

  // 정확한 매칭
  if (allOrigins.includes(origin)) return true;

  // Cloudflare Pages 프리뷰 URL 패턴
  if (origin.match(/^https:\/\/[a-z0-9-]+\.idea-on-action\.pages\.dev$/)) {
    return true;
  }

  return false;
}

/**
 * CORS 헤더 생성
 */
export function getCorsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin, env) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, X-Request-ID, X-Session-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * CORS 미들웨어
 */
export async function corsMiddleware(c: Context<AppType>, next: Next) {
  const origin = c.req.header('Origin');
  const corsHeaders = getCorsHeaders(origin, c.env);

  // OPTIONS preflight
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // 응답에 CORS 헤더 추가
  await next();

  // 모든 응답에 CORS 헤더 적용
  Object.entries(corsHeaders).forEach(([key, value]) => {
    c.res.headers.set(key, value);
  });
}
