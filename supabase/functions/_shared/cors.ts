/**
 * CORS 설정
 *
 * 보안 강화를 위해 허용된 Origin만 접근 가능하도록 제한합니다.
 */

const ALLOWED_ORIGINS = {
  production: [
    'https://www.ideaonaction.ai',
    'https://ideaonaction.ai',
    'https://preview.ideaonaction.ai',
    'https://minu.best',
    'https://find.minu.best',
    'https://frame.minu.best',
    'https://build.minu.best',
    'https://keep.minu.best',
  ],
  development: [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  preview: /^https:\/\/.*\.vercel\.app$/,
}

/**
 * Origin 유효성 검증
 * @param origin - 요청 Origin
 * @returns 검증된 Origin 또는 null
 */
export function validateOrigin(origin: string | null): string | null {
  if (!origin) return null

  // Production origins
  if (ALLOWED_ORIGINS.production.includes(origin)) {
    return origin
  }

  // Development origins
  if (ALLOWED_ORIGINS.development.includes(origin)) {
    return origin
  }

  // Preview deployments (Vercel)
  if (ALLOWED_ORIGINS.preview.test(origin)) {
    return origin
  }

  return null
}

/**
 * 동적 CORS 헤더 생성
 * @param origin - 요청 Origin
 * @returns CORS 헤더 객체
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const validOrigin = validateOrigin(origin)

  return {
    'Access-Control-Allow-Origin': validOrigin || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24시간 캐시
  }
}

/**
 * 하위 호환성을 위한 기본 CORS 헤더
 * @deprecated getCorsHeaders() 사용을 권장합니다
 */
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
