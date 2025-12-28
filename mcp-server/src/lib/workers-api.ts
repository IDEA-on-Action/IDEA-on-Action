/**
 * Cloudflare Workers API 클라이언트 (MCP Server용)
 *
 * Node.js 환경에서 사용하는 Workers API 클라이언트
 * Supabase 직접 연결 대신 Workers API를 통해 데이터를 조회합니다.
 */

// 환경 변수
const WORKERS_API_URL = process.env.WORKERS_API_URL ?? 'https://api.ideaonaction.ai';
const WORKERS_API_SERVICE_KEY = process.env.WORKERS_API_SERVICE_KEY ?? '';

/**
 * API 응답 타입
 */
interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * API 호출 옵션
 */
interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
  useServiceKey?: boolean;
}

/**
 * 환경 변수 검증
 */
export function validateEnvironment(): void {
  if (!WORKERS_API_URL) {
    throw new Error('WORKERS_API_URL 환경 변수가 필요합니다');
  }
  if (!WORKERS_API_SERVICE_KEY) {
    throw new Error('WORKERS_API_SERVICE_KEY 환경 변수가 필요합니다');
  }
}

/**
 * Workers API 호출 헬퍼
 */
async function callWorkersApi<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    token,
    useServiceKey = false,
  } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // 인증 헤더 설정
  if (useServiceKey && WORKERS_API_SERVICE_KEY) {
    requestHeaders['X-Service-Key'] = WORKERS_API_SERVICE_KEY;
  } else if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${WORKERS_API_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: (data as { error?: string; message?: string }).error ||
          (data as { error?: string; message?: string }).message ||
          'API 오류가 발생했습니다',
        status: response.status,
      };
    }

    return {
      data: data as T,
      error: null,
      status: response.status,
    };
  } catch (error) {
    console.error('[Workers API] 호출 오류:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다',
      status: 0,
    };
  }
}

/**
 * compass_integration_view 데이터 타입
 */
export interface CompassIntegrationData {
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  subscription_status: 'active' | 'inactive' | 'past_due';
  plan_name: string | null;
  plan_features: string[] | null;
  valid_until: string | null;
}

/**
 * 사용자 통합 데이터 조회 (서비스 키 사용)
 *
 * Workers API의 /api/v1/admin/users/:userId/integration 엔드포인트를 호출합니다.
 */
export async function fetchUserIntegrationData(
  userId: string
): Promise<CompassIntegrationData | null> {
  const response = await callWorkersApi<CompassIntegrationData>(
    `/api/v1/admin/users/${userId}/integration`,
    { useServiceKey: true }
  );

  if (response.error) {
    console.error('[Workers API] 사용자 통합 데이터 조회 오류:', response.error);
    return null;
  }

  return response.data;
}

/**
 * 권한 레벨 정의
 */
export const PERMISSION_LEVELS: Record<string, number> = {
  trial: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
};

/**
 * 기능별 필요 플랜 매핑
 */
export const FEATURE_REQUIREMENTS: Record<string, string> = {
  access_compass_basic: 'basic',
  access_compass_pro: 'pro',
  access_compass_enterprise: 'enterprise',
  export_data: 'pro',
  advanced_analytics: 'pro',
  team_collaboration: 'enterprise',
  priority_support: 'enterprise',
  api_access: 'pro',
  custom_integrations: 'enterprise',
};

/**
 * 사용자 권한 확인
 */
export function hasPermission(
  userPlan: string | null,
  requiredPermission: string
): { allowed: boolean; reason?: string } {
  // 플랜 이름 정규화
  const normalizedPlan = (userPlan ?? 'trial').toLowerCase();

  // 필요한 플랜 조회
  const requiredPlan = FEATURE_REQUIREMENTS[requiredPermission];

  if (!requiredPlan) {
    // 알 수 없는 권한 - 기본적으로 거부
    return {
      allowed: false,
      reason: `알 수 없는 권한: ${requiredPermission}`,
    };
  }

  const userLevel = PERMISSION_LEVELS[normalizedPlan] ?? 0;
  const requiredLevel = PERMISSION_LEVELS[requiredPlan] ?? 0;

  if (userLevel >= requiredLevel) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `${requiredPlan} 플랜 이상이 필요합니다. 현재 플랜: ${normalizedPlan}`,
  };
}

/**
 * 사용자 API
 */
export const usersApi = {
  /**
   * 사용자 정보 조회 (인증된 사용자)
   */
  getMe: async (token: string) => {
    return callWorkersApi<{
      id: string;
      email: string;
      name: string | null;
      avatar_url: string | null;
      is_admin: boolean;
    }>('/api/v1/users/me', { token });
  },

  /**
   * 관리자용 사용자 정보 조회 (서비스 키 사용)
   */
  getById: async (userId: string) => {
    return callWorkersApi<{
      id: string;
      email: string;
      name: string | null;
      avatar_url: string | null;
      is_admin: boolean;
    }>(`/api/v1/admin/users/${userId}`, { useServiceKey: true });
  },
};

/**
 * 구독 API
 */
export const subscriptionsApi = {
  /**
   * 현재 사용자 구독 조회 (인증된 사용자)
   */
  getCurrent: async (token: string) => {
    return callWorkersApi<{
      id: string;
      user_id: string;
      plan_id: string;
      plan_name: string;
      status: string;
      valid_until: string | null;
      features: string[];
    }>('/api/v1/subscriptions/current', { token });
  },

  /**
   * 관리자용 사용자 구독 조회 (서비스 키 사용)
   */
  getByUserId: async (userId: string) => {
    return callWorkersApi<{
      id: string;
      user_id: string;
      plan_id: string;
      plan_name: string;
      status: string;
      valid_until: string | null;
      features: string[];
    }>(`/api/v1/admin/users/${userId}/subscription`, { useServiceKey: true });
  },
};

/**
 * 권한 API
 */
export const permissionsApi = {
  /**
   * 권한 확인 (서비스 키 사용)
   */
  check: async (userId: string, permission: string) => {
    return callWorkersApi<{ allowed: boolean; reason?: string }>(
      '/api/v1/admin/permissions/check',
      {
        method: 'POST',
        useServiceKey: true,
        body: { user_id: userId, permission },
      }
    );
  },
};

/**
 * 헬스 체크
 */
export const healthApi = {
  check: async () => {
    return callWorkersApi<{
      status: string;
      version: string;
      environment: string;
      timestamp: string;
    }>('/health');
  },
};

// 기본 내보내기
export default {
  users: usersApi,
  subscriptions: subscriptionsApi,
  permissions: permissionsApi,
  health: healthApi,
  call: callWorkersApi,
};
