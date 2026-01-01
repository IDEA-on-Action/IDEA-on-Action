/**
 * 공통 테스트 유틸리티
 *
 * Workers API 마이그레이션 후 모든 테스트에서 사용할 공통 wrapper 및 mock 제공
 *
 * @usage
 * import { createTestWrapper, mockUseAuth, mockWorkersApi } from '@/tests/utils/test-utils';
 *
 * const wrapper = createTestWrapper();
 * render(<Component />, { wrapper });
 */

import React, { type ReactNode } from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// ============================================================================
// 타입 정의
// ============================================================================

export interface MockAuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export interface MockWorkersTokens {
  accessToken: string;
  refreshToken: string;
}

export interface MockAuthState {
  workersTokens: MockWorkersTokens | null;
  workersUser: MockAuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error?: string | null;
}

export interface TestWrapperOptions {
  /** 초기 라우트 경로 (기본: '/') */
  initialEntries?: MemoryRouterProps['initialEntries'];
  /** 인증 상태 오버라이드 */
  authState?: Partial<MockAuthState>;
  /** QueryClient 옵션 */
  queryClientOptions?: {
    retry?: boolean | number;
    staleTime?: number;
  };
}

// ============================================================================
// 기본 Mock 데이터
// ============================================================================

export const DEFAULT_MOCK_USER: MockAuthUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
};

export const DEFAULT_MOCK_TOKENS: MockWorkersTokens = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
};

export const DEFAULT_AUTH_STATE: MockAuthState = {
  workersTokens: DEFAULT_MOCK_TOKENS,
  workersUser: DEFAULT_MOCK_USER,
  isAuthenticated: true,
  loading: false,
  error: null,
};

export const UNAUTHENTICATED_STATE: MockAuthState = {
  workersTokens: null,
  workersUser: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const LOADING_AUTH_STATE: MockAuthState = {
  workersTokens: null,
  workersUser: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// ============================================================================
// QueryClient 생성
// ============================================================================

export function createTestQueryClient(options?: TestWrapperOptions['queryClientOptions']): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: options?.retry ?? false,
        staleTime: options?.staleTime ?? 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// ============================================================================
// 테스트 Wrapper 생성
// ============================================================================

/**
 * 테스트용 Wrapper 컴포넌트 생성
 *
 * @example
 * // 기본 사용
 * const wrapper = createTestWrapper();
 * render(<MyComponent />, { wrapper });
 *
 * @example
 * // 옵션 지정
 * const wrapper = createTestWrapper({
 *   initialEntries: ['/admin'],
 *   authState: { isAuthenticated: false },
 * });
 */
export function createTestWrapper(options?: TestWrapperOptions) {
  const queryClient = createTestQueryClient(options?.queryClientOptions);

  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter
        initialEntries={options?.initialEntries ?? ['/']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </MemoryRouter>
    );
  };
}

/**
 * renderHook용 Wrapper 생성 (함수 형태)
 */
export function createHookWrapper(options?: TestWrapperOptions) {
  const queryClient = createTestQueryClient(options?.queryClientOptions);

  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter
      initialEntries={options?.initialEntries ?? ['/']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
}

// ============================================================================
// useAuth Mock 헬퍼
// ============================================================================

/**
 * useAuth 훅 모킹을 위한 팩토리 함수
 *
 * @example
 * // 테스트 파일 상단에서 사용
 * vi.mock('@/hooks/auth/useAuth', () => ({
 *   useAuth: vi.fn(() => createMockAuthReturn()),
 * }));
 *
 * // 또는 동적으로 변경
 * vi.mocked(useAuth).mockReturnValue(createMockAuthReturn({ isAuthenticated: false }));
 */
export function createMockAuthReturn(overrides?: Partial<MockAuthState>) {
  const state = { ...DEFAULT_AUTH_STATE, ...overrides };

  return {
    // Workers 인증
    workersTokens: state.workersTokens,
    workersUser: state.workersUser,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,

    // Supabase 호환성 (레거시)
    user: state.workersUser ? {
      id: state.workersUser.id,
      email: state.workersUser.email,
    } : null,
    session: state.workersTokens ? {
      access_token: state.workersTokens.accessToken,
      refresh_token: state.workersTokens.refreshToken,
    } : null,

    // 메서드
    login: vi.fn(),
    logout: vi.fn(),
    signUp: vi.fn(),
    getAccessToken: vi.fn(() => state.workersTokens?.accessToken ?? null),
    refreshTokens: vi.fn(),
  };
}

/**
 * useAuth 모킹 설정 (vi.mock 호출용)
 *
 * @example
 * vi.mock('@/hooks/auth/useAuth', () => mockUseAuth());
 */
export function mockUseAuth(overrides?: Partial<MockAuthState>) {
  return {
    useAuth: vi.fn(() => createMockAuthReturn(overrides)),
  };
}

// ============================================================================
// Workers API Mock 헬퍼
// ============================================================================

/**
 * Workers API 클라이언트 모킹
 *
 * @example
 * vi.mock('@/integrations/cloudflare/client', () => mockWorkersApi());
 */
export function mockWorkersApi() {
  return {
    callWorkersApi: vi.fn(),

    // Auth API
    authApi: {
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      me: vi.fn(),
    },

    // Subscriptions API
    subscriptionsApi: {
      getPlans: vi.fn(),
      getHistory: vi.fn(),
      getCurrent: vi.fn(),
      cancel: vi.fn(),
      resume: vi.fn(),
      changePlan: vi.fn(),
      updatePayment: vi.fn(),
      create: vi.fn(),
    },

    // Payments API
    paymentsApi: {
      confirm: vi.fn(),
      cancel: vi.fn(),
      history: vi.fn(),
    },

    // Services API
    servicesApi: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },

    // Orders API
    ordersApi: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
    },

    // Blog API
    blogApi: {
      getPosts: vi.fn(),
      getPost: vi.fn(),
      createPost: vi.fn(),
      updatePost: vi.fn(),
      deletePost: vi.fn(),
      getCategories: vi.fn(),
      getTags: vi.fn(),
    },

    // Permissions API
    permissionsApi: {
      check: vi.fn(),
      getUserPermissions: vi.fn(),
      getRoles: vi.fn(),
    },

    // AI API
    aiApi: {
      chat: vi.fn(),
      stream: vi.fn(),
      vision: vi.fn(),
    },

    // Newsletter API
    newsletterApi: {
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      getSubscribers: vi.fn(),
    },

    // Projects API
    projectsApi: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },

    // Media API
    mediaApi: {
      upload: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
    },
  };
}

/**
 * 특정 API만 모킹 (부분 모킹용)
 */
export function mockApiResponse<T>(data: T, error: string | null = null) {
  return { data, error };
}

export function mockApiError(error: string) {
  return { data: null, error };
}

// ============================================================================
// 기타 공통 Mock
// ============================================================================

/**
 * sonner toast 모킹
 */
export function mockToast() {
  return {
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
    },
  };
}

/**
 * react-router-dom 네비게이션 모킹
 */
export function mockNavigation() {
  const navigate = vi.fn();
  const location = { pathname: '/', search: '', hash: '', state: null };

  return {
    useNavigate: () => navigate,
    useLocation: () => location,
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Navigate: ({ to }: { to: string }) => {
      navigate(to);
      return null;
    },
    // 테스트에서 접근용
    _navigate: navigate,
    _location: location,
  };
}

// ============================================================================
// 테스트 헬퍼 함수
// ============================================================================

/**
 * 비동기 작업 대기
 */
export async function waitForAsync(ms = 0): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * React Query 쿼리 완료 대기
 */
export async function waitForQueryToSettle(): Promise<void> {
  await waitForAsync(10);
}

// ============================================================================
// 타입 Export
// ============================================================================

export type { ReactNode };
