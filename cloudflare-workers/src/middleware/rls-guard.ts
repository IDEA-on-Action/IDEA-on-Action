/**
 * RLS (Row Level Security) 가드 미들웨어
 * Supabase RLS 정책을 Workers 레벨에서 구현
 */

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { type Env, type AppType } from '../types';
import type { AuthContext } from './auth';

// RLS 정책 타입
type RLSOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

interface RLSPolicy {
  // WHERE 절 조건 (SQL 템플릿)
  condition: string;
  // 조건에 필요한 파라미터 생성 함수
  params: (auth: AuthContext) => (string | number | null)[];
}

// 테이블별 RLS 정책 정의
const RLS_POLICIES: Record<string, Partial<Record<RLSOperation, RLSPolicy>>> = {
  // ============================================
  // 사용자 관련 테이블
  // ============================================
  users: {
    SELECT: {
      condition: 'id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    UPDATE: {
      condition: 'id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    DELETE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
  },

  user_profiles: {
    SELECT: {
      condition: 'user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: 'user_id = ?',
      params: (auth) => [auth.userId || null],
    },
    UPDATE: {
      condition: 'user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
  },

  // ============================================
  // 서비스 관련 테이블
  // ============================================
  services: {
    SELECT: {
      // 공개된 서비스는 누구나, 비공개는 관리자만
      condition: "status = 'active' OR ? = 1",
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    UPDATE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    DELETE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
  },

  service_categories: {
    SELECT: {
      condition: 'is_active = 1 OR ? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    UPDATE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    DELETE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
  },

  // ============================================
  // 주문/결제 관련 테이블
  // ============================================
  orders: {
    SELECT: {
      condition: 'user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: 'user_id = ?',
      params: (auth) => [auth.userId || null],
    },
    UPDATE: {
      // 본인 주문 중 pending/confirmed만 수정 가능, 관리자는 모두 가능
      condition: "(user_id = ? AND status IN ('pending', 'confirmed')) OR ? = 1",
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    DELETE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
  },

  payments: {
    SELECT: {
      condition: 'user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: 'user_id = ?',
      params: (auth) => [auth.userId || null],
    },
    UPDATE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
  },

  // ============================================
  // 구독 관련 테이블
  // ============================================
  subscriptions: {
    SELECT: {
      condition: 'user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: 'user_id = ?',
      params: (auth) => [auth.userId || null],
    },
    UPDATE: {
      condition: 'user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
  },

  subscription_plans: {
    SELECT: {
      condition: 'is_active = 1 OR ? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    UPDATE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
  },

  // ============================================
  // CMS 관련 테이블
  // ============================================
  blog_posts: {
    SELECT: {
      condition: "status = 'published' OR author_id = ? OR ? = 1",
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    UPDATE: {
      condition: 'author_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    DELETE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
  },

  notices: {
    SELECT: {
      condition: "status = 'published' OR ? = 1",
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    UPDATE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    DELETE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
  },

  portfolio_items: {
    SELECT: {
      condition: "status = 'published' OR ? = 1",
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    UPDATE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    DELETE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
  },

  // ============================================
  // RAG 관련 테이블
  // ============================================
  rag_documents: {
    SELECT: {
      condition: 'is_public = 1 OR user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: 'user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    UPDATE: {
      condition: 'user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    DELETE: {
      condition: 'user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
  },

  // ============================================
  // OAuth 관련 테이블
  // ============================================
  oauth_clients: {
    SELECT: {
      condition: 'is_active = 1 OR ? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    INSERT: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    UPDATE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
    DELETE: {
      condition: '? = 1',
      params: (auth) => [auth.isAdmin ? 1 : 0],
    },
  },

  user_sessions: {
    SELECT: {
      condition: 'user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
    DELETE: {
      condition: 'user_id = ? OR ? = 1',
      params: (auth) => [auth.userId || null, auth.isAdmin ? 1 : 0],
    },
  },
};

/**
 * RLS 조건 가져오기
 */
export function getRLSCondition(
  table: string,
  operation: RLSOperation,
  auth: AuthContext
): { condition: string; params: (string | number | null)[] } | null {
  const tablePolicy = RLS_POLICIES[table];

  if (!tablePolicy) {
    // 정책이 없는 테이블은 관리자만 접근 가능
    return {
      condition: '? = 1',
      params: [auth.isAdmin ? 1 : 0],
    };
  }

  const operationPolicy = tablePolicy[operation];

  if (!operationPolicy) {
    // 해당 작업에 대한 정책이 없으면 거부
    return {
      condition: '0 = 1',
      params: [],
    };
  }

  return {
    condition: operationPolicy.condition,
    params: operationPolicy.params(auth),
  };
}

/**
 * RLS 쿼리 래퍼
 */
export function applyRLSToQuery(
  baseQuery: string,
  table: string,
  operation: RLSOperation,
  auth: AuthContext
): { query: string; params: (string | number | null)[] } {
  const rls = getRLSCondition(table, operation, auth);

  if (!rls) {
    return { query: baseQuery, params: [] };
  }

  // WHERE 절이 있는지 확인
  const hasWhere = /\bWHERE\b/i.test(baseQuery);

  if (hasWhere) {
    // 기존 WHERE에 AND로 추가
    return {
      query: `${baseQuery} AND (${rls.condition})`,
      params: rls.params,
    };
  } else {
    // WHERE 절 추가
    return {
      query: `${baseQuery} WHERE ${rls.condition}`,
      params: rls.params,
    };
  }
}

/**
 * RLS 가드 미들웨어
 */
export const rlsGuardMiddleware = createMiddleware<AppType>(
  async (c, next) => {
    const auth = c.get('auth');

    if (!auth) {
      // 인증 정보가 없으면 빈 컨텍스트 설정
      c.set('auth', {
        userId: null,
        permissions: [],
        isAdmin: false,
      });
    }

    await next();
  }
);

/**
 * RLS 권한 확인 유틸리티
 */
export function canAccess(
  table: string,
  operation: RLSOperation,
  auth: AuthContext,
  row?: Record<string, unknown>
): boolean {
  // 관리자는 항상 허용
  if (auth.isAdmin) {
    return true;
  }

  const tablePolicy = RLS_POLICIES[table];

  if (!tablePolicy || !tablePolicy[operation]) {
    return false;
  }

  // 행 수준 검사 (row가 제공된 경우)
  if (row && auth.userId) {
    // user_id 필드 확인
    if ('user_id' in row && row.user_id === auth.userId) {
      return true;
    }

    // author_id 필드 확인
    if ('author_id' in row && row.author_id === auth.userId) {
      return true;
    }

    // id 필드 확인 (users 테이블)
    if (table === 'users' && row.id === auth.userId) {
      return true;
    }
  }

  // 공개 리소스 확인
  if (operation === 'SELECT') {
    if ('status' in (row || {}) && row?.status === 'published') {
      return true;
    }
    if ('is_public' in (row || {}) && row?.is_public === 1) {
      return true;
    }
    if ('is_active' in (row || {}) && row?.is_active === 1) {
      return true;
    }
  }

  return false;
}

/**
 * 테이블별 RLS 정책 목록 조회 (디버깅용)
 */
export function listRLSPolicies(): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const [table, policies] of Object.entries(RLS_POLICIES)) {
    result[table] = Object.keys(policies) as string[];
  }

  return result;
}
