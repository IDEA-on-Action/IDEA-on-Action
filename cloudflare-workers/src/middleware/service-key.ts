/**
 * X-Service-Key 인증 미들웨어
 * MCP Server 등 내부 서비스 간 통신에 사용
 */

import { Context, Next } from 'hono';
import { AppType, AuthContext } from '../types';

/**
 * 서비스 키 검증 및 관리자 권한 부여
 *
 * X-Service-Key 헤더가 있으면 SERVICE_KEY와 비교하여 검증
 * 유효한 서비스 키는 관리자 권한으로 처리됨
 */
export async function serviceKeyMiddleware(c: Context<AppType>, next: Next) {
  const serviceKey = c.req.header('X-Service-Key');

  if (serviceKey && c.env.SERVICE_KEY) {
    // 타이밍 공격 방지를 위한 상수 시간 비교
    const isValid = secureCompare(serviceKey, c.env.SERVICE_KEY);

    if (isValid) {
      // 서비스 키가 유효하면 관리자 권한 부여
      const adminAuth: AuthContext = {
        userId: 'service-account',
        isAdmin: true,
        permissions: ['*'],
      };
      c.set('auth', adminAuth);
    }
  }

  await next();
}

/**
 * 서비스 키 필수 미들웨어
 *
 * 서비스 키가 없거나 유효하지 않으면 401 반환
 */
export async function requireServiceKey(c: Context<AppType>, next: Next) {
  const serviceKey = c.req.header('X-Service-Key');

  if (!serviceKey) {
    return c.json({
      error: 'Unauthorized',
      message: '서비스 키가 필요합니다.',
      success: false,
    }, 401);
  }

  if (!c.env.SERVICE_KEY) {
    console.error('[Service Key] SERVICE_KEY 환경 변수가 설정되지 않았습니다');
    return c.json({
      error: 'Internal Server Error',
      message: '서버 설정 오류',
      success: false,
    }, 500);
  }

  const isValid = secureCompare(serviceKey, c.env.SERVICE_KEY);

  if (!isValid) {
    return c.json({
      error: 'Forbidden',
      message: '유효하지 않은 서비스 키입니다.',
      success: false,
    }, 403);
  }

  // 서비스 키가 유효하면 관리자 권한 부여
  const adminAuth: AuthContext = {
    userId: 'service-account',
    isAdmin: true,
    permissions: ['*'],
  };
  c.set('auth', adminAuth);

  await next();
}

/**
 * 상수 시간 문자열 비교 (타이밍 공격 방지)
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
