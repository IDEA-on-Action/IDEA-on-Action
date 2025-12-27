/**
 * JWT 인증 미들웨어
 * Supabase Auth → Workers JWT 검증
 */

import { Context, Next } from 'hono';
import * as jose from 'jose';
import { AppType, AuthContext } from '../types';

// Re-export AuthContext for other modules
export type { AuthContext } from '../types';

/**
 * JWT 토큰 검증 및 사용자 정보 추출
 */
async function verifyToken(token: string, secret: string): Promise<AuthContext | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);

    return {
      userId: payload.sub || null,
      isAdmin: (payload.role === 'admin') || (payload.is_admin === true),
      permissions: (payload.permissions as string[]) || [],
    };
  } catch (error) {
    console.error('JWT 검증 실패:', error);
    return null;
  }
}

/**
 * 인증 미들웨어 (선택적 - 토큰 없어도 통과)
 */
export async function authMiddleware(c: Context<AppType>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const auth = await verifyToken(token, c.env.JWT_SECRET);

    if (auth) {
      c.set('auth', auth);
    }
  }

  await next();
}

/**
 * 인증 필수 미들웨어
 */
export async function requireAuth(c: Context<AppType>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: '인증이 필요합니다.', success: false }, 401);
  }

  const token = authHeader.slice(7);
  const auth = await verifyToken(token, c.env.JWT_SECRET);

  if (!auth || !auth.userId) {
    return c.json({ error: '유효하지 않은 토큰입니다.', success: false }, 401);
  }

  c.set('auth', auth);
  await next();
}

/**
 * 관리자 권한 필수 미들웨어
 */
export async function requireAdmin(c: Context<AppType>, next: Next) {
  const auth = c.get('auth') as AuthContext | undefined;

  if (!auth?.isAdmin) {
    return c.json({ error: '관리자 권한이 필요합니다.', success: false }, 403);
  }

  await next();
}

/**
 * 특정 권한 필수 미들웨어 생성
 */
export function requirePermission(permission: string) {
  return async (c: Context<AppType>, next: Next) => {
    const auth = c.get('auth') as AuthContext | undefined;

    if (!auth) {
      return c.json({ error: '인증이 필요합니다.', success: false }, 401);
    }

    // 관리자는 모든 권한 허용
    if (auth.isAdmin) {
      await next();
      return;
    }

    // 와일드카드 권한 체크 (예: "blog:*")
    const hasPermission = auth.permissions.some(p => {
      if (p === '*') return true;
      if (p === permission) return true;
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -1);
        return permission.startsWith(prefix);
      }
      return false;
    });

    if (!hasPermission) {
      return c.json({ error: '권한이 없습니다.', success: false }, 403);
    }

    await next();
  };
}

// Aliases for backward compatibility
export const optionalAuthMiddleware = authMiddleware;
export const adminOnlyMiddleware = requireAdmin;
