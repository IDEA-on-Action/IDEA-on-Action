/**
 * JWT 인증 미들웨어
 * Supabase Auth JWT 및 자체 JWT 검증
 */

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';
import type { Env } from '../index';

// JWT 페이로드 타입
export interface JWTPayload {
  sub: string; // user_id
  iss: string; // issuer
  aud: string | string[]; // audience
  exp: number; // expiration
  iat: number; // issued at
  scope?: string[]; // 권한 범위
  role?: string; // 사용자 역할
  email?: string;
  subscription?: {
    plan_id: string;
    plan_name: string;
    status: string;
    services: string[];
  };
}

// 인증 컨텍스트 타입
export interface AuthContext {
  userId: string;
  email?: string;
  role?: string;
  scope: string[];
  isAdmin: boolean;
  subscription?: JWTPayload['subscription'];
}

// 컨텍스트 확장
declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
    jwtPayload: JWTPayload;
  }
}

/**
 * JWT 검증 함수
 */
async function verifyJWT(
  token: string,
  secret: string,
  options?: {
    issuer?: string;
    audience?: string | string[];
  }
): Promise<JWTPayload> {
  const secretKey = new TextEncoder().encode(secret);

  const { payload } = await jose.jwtVerify(token, secretKey, {
    issuer: options?.issuer,
    audience: options?.audience,
  });

  return payload as JWTPayload;
}

/**
 * 관리자 여부 확인 (D1 조회)
 */
async function checkIsAdmin(db: D1Database, userId: string): Promise<boolean> {
  try {
    const result = await db
      .prepare('SELECT role FROM admins WHERE user_id = ? AND is_active = 1')
      .bind(userId)
      .first<{ role: string }>();

    return !!result && ['admin', 'super_admin'].includes(result.role);
  } catch {
    return false;
  }
}

/**
 * 인증 미들웨어
 */
export const authMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Missing Authorization header',
          code: 'AUTH_MISSING_HEADER',
        },
        401
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Invalid Authorization header format',
          code: 'AUTH_INVALID_FORMAT',
        },
        401
      );
    }

    const token = authHeader.substring(7);

    try {
      // JWT 검증
      const payload = await verifyJWT(token, c.env.JWT_SECRET, {
        issuer: 'https://www.ideaonaction.ai',
        audience: ['minu.best', 'supabase', 'idea-on-action'],
      });

      // 토큰 만료 확인
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return c.json(
          {
            error: 'Unauthorized',
            message: 'Token expired',
            code: 'AUTH_TOKEN_EXPIRED',
          },
          401
        );
      }

      // 관리자 여부 확인
      const isAdmin = await checkIsAdmin(c.env.DB, payload.sub);

      // 인증 컨텍스트 설정
      const authContext: AuthContext = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        scope: payload.scope || [],
        isAdmin,
        subscription: payload.subscription,
      };

      c.set('auth', authContext);
      c.set('jwtPayload', payload);

      await next();
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        return c.json(
          {
            error: 'Unauthorized',
            message: 'Token expired',
            code: 'AUTH_TOKEN_EXPIRED',
          },
          401
        );
      }

      if (error instanceof jose.errors.JWTInvalid) {
        return c.json(
          {
            error: 'Unauthorized',
            message: 'Invalid token',
            code: 'AUTH_INVALID_TOKEN',
          },
          401
        );
      }

      console.error('JWT verification error:', error);
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Token verification failed',
          code: 'AUTH_VERIFICATION_FAILED',
        },
        401
      );
    }
  }
);

/**
 * 선택적 인증 미들웨어 (인증 실패해도 진행)
 */
export const optionalAuthMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 인증 없이 진행
      c.set('auth', {
        userId: '',
        scope: [],
        isAdmin: false,
      });
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const payload = await verifyJWT(token, c.env.JWT_SECRET);
      const isAdmin = await checkIsAdmin(c.env.DB, payload.sub);

      c.set('auth', {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        scope: payload.scope || [],
        isAdmin,
        subscription: payload.subscription,
      });
      c.set('jwtPayload', payload);
    } catch {
      // 인증 실패해도 진행
      c.set('auth', {
        userId: '',
        scope: [],
        isAdmin: false,
      });
    }

    await next();
  }
);

/**
 * 관리자 전용 미들웨어
 */
export const adminOnlyMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c: Context<{ Bindings: Env }>, next: Next) => {
    const auth = c.get('auth');

    if (!auth || !auth.isAdmin) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'Admin access required',
          code: 'AUTH_ADMIN_REQUIRED',
        },
        403
      );
    }

    await next();
  }
);

/**
 * 스코프 검증 미들웨어
 */
export function requireScope(...requiredScopes: string[]) {
  return createMiddleware<{ Bindings: Env }>(
    async (c: Context<{ Bindings: Env }>, next: Next) => {
      const auth = c.get('auth');

      if (!auth) {
        return c.json(
          {
            error: 'Unauthorized',
            message: 'Authentication required',
            code: 'AUTH_REQUIRED',
          },
          401
        );
      }

      // 관리자는 모든 스코프 허용
      if (auth.isAdmin) {
        return next();
      }

      // 필수 스코프 확인
      const hasAllScopes = requiredScopes.every(
        (scope) =>
          auth.scope.includes(scope) || auth.scope.includes('*') // 와일드카드
      );

      if (!hasAllScopes) {
        return c.json(
          {
            error: 'Forbidden',
            message: `Required scopes: ${requiredScopes.join(', ')}`,
            code: 'AUTH_INSUFFICIENT_SCOPE',
          },
          403
        );
      }

      await next();
    }
  );
}
