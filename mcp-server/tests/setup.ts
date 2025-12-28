/**
 * 테스트 설정 파일
 *
 * Vitest 테스트 실행 전 공통 설정을 정의합니다.
 * - 환경 변수 모킹
 * - 공통 Mock 헬퍼
 * - 테스트 유틸리티 함수
 */

import { vi } from 'vitest';

/**
 * 테스트용 환경 변수 설정
 */
export function setupTestEnvironment(): void {
  // Workers API 환경 변수
  vi.stubEnv('WORKERS_API_URL', 'https://api.test.ideaonaction.ai');
  vi.stubEnv('WORKERS_API_SERVICE_KEY', 'test-workers-api-service-key-32-chars');

  // JWT 환경 변수 (토큰 검증용)
  vi.stubEnv('SUPABASE_JWT_SECRET', 'test-jwt-secret-key-32-characters-long');
}

/**
 * 환경 변수 정리
 */
export function cleanupTestEnvironment(): void {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
}

/**
 * Mock 사용자 데이터
 */
export const mockUser = {
  id: 'test-user-id-550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.png',
};

/**
 * Mock 구독 데이터 - 활성 Pro 플랜
 */
export const mockSubscription = {
  status: 'active' as const,
  planName: 'pro',
  validUntil: '2025-12-31T23:59:59.000Z',
};

/**
 * Mock 구독 데이터 - 기본 플랜
 */
export const mockBasicSubscription = {
  status: 'active' as const,
  planName: 'basic',
  validUntil: '2025-12-31T23:59:59.000Z',
};

/**
 * Mock 구독 데이터 - 만료됨
 */
export const mockExpiredSubscription = {
  status: 'inactive' as const,
  planName: 'pro',
  validUntil: '2023-01-01T00:00:00.000Z',
};

/**
 * Mock 구독 데이터 - Enterprise 플랜
 */
export const mockEnterpriseSubscription = {
  status: 'active' as const,
  planName: 'enterprise',
  validUntil: '2025-12-31T23:59:59.000Z',
};

/**
 * Mock 통합 데이터 (compass_integration_view)
 */
export const mockIntegrationData = {
  user_id: mockUser.id,
  email: mockUser.email,
  name: mockUser.name,
  avatar_url: mockUser.avatar_url,
  subscription_status: 'active' as const,
  plan_name: 'pro',
  plan_features: ['access_compass_pro', 'export_data', 'advanced_analytics'],
  valid_until: '2025-12-31T23:59:59.000Z',
};

/**
 * Mock 통합 데이터 - Basic 플랜 사용자
 */
export const mockBasicIntegrationData = {
  ...mockIntegrationData,
  plan_name: 'basic',
  plan_features: ['access_compass_basic'],
};

/**
 * Mock 통합 데이터 - Enterprise 플랜 사용자
 */
export const mockEnterpriseIntegrationData = {
  ...mockIntegrationData,
  plan_name: 'enterprise',
  plan_features: [
    'access_compass_enterprise',
    'team_collaboration',
    'priority_support',
    'custom_integrations',
    'api_access',
  ],
};

/**
 * Mock 통합 데이터 - Trial 사용자
 */
export const mockTrialIntegrationData = {
  ...mockIntegrationData,
  plan_name: 'trial',
  plan_features: [],
  subscription_status: 'active' as const,
};

/**
 * Mock 통합 데이터 - 비활성 구독 사용자
 */
export const mockInactiveIntegrationData = {
  ...mockIntegrationData,
  subscription_status: 'inactive' as const,
};

/**
 * JWT 페이로드 생성 헬퍼
 */
export function createMockJWTPayload(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: mockUser.id,
    email: mockUser.email,
    exp: now + 3600, // 1시간 후 만료
    iat: now,
    iss: 'https://test-project.supabase.co/auth/v1',
    aud: 'authenticated',
    role: 'authenticated',
    ...overrides,
  };
}

/**
 * 만료된 JWT 페이로드 생성 헬퍼
 */
export function createExpiredJWTPayload(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: mockUser.id,
    email: mockUser.email,
    exp: now - 3600, // 1시간 전 만료 (이미 만료됨)
    iat: now - 7200, // 2시간 전 발급
    iss: 'https://test-project.supabase.co/auth/v1',
    aud: 'authenticated',
    role: 'authenticated',
    ...overrides,
  };
}

/**
 * Workers API Mock 응답 생성
 */
export function createMockWorkersApiResponse<T>(data: T | null, error: string | null = null) {
  return {
    data,
    error,
    status: error ? 500 : 200,
  };
}

/**
 * Workers API fetch Mock 생성
 */
export function createMockFetch(responses: Map<string, { data: unknown; status: number }>) {
  return vi.fn().mockImplementation((url: string) => {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    const response = responses.get(path);
    if (response) {
      return Promise.resolve({
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: () => Promise.resolve(response.data),
      });
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not Found' }),
    });
  });
}

/**
 * 비동기 에러 테스트 헬퍼
 */
export async function expectAsyncError(
  fn: () => Promise<unknown>,
  errorMessage?: string
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (errorMessage && error instanceof Error) {
      if (!error.message.includes(errorMessage)) {
        throw new Error(`Expected error message to include "${errorMessage}", got "${error.message}"`);
      }
    }
  }
}

/**
 * Workers API 통합 데이터 엔드포인트 Mock
 */
export function setupIntegrationDataMock(integrationData = mockIntegrationData) {
  const responses = new Map([
    [
      `/api/v1/admin/users/${mockUser.id}/integration`,
      { data: integrationData, status: 200 },
    ],
  ]);

  global.fetch = createMockFetch(responses);
}
