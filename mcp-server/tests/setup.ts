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
  vi.stubEnv('SUPABASE_URL', 'https://test-project.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key-32-chars-long');
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-anon-key-32-characters-long');
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
 * Supabase 클라이언트 Mock 생성
 */
export function createMockSupabaseClient(data: unknown = null, error: unknown = null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: data ? { user: data } : null,
        error,
      }),
    },
  };
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
