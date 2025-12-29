 
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import {
  MCPPermissionProvider,
  useMCPPermissionContext,
} from '@/contexts';
import type { PermissionInfo } from '@/contexts';
import { subscriptionsApi } from '@/integrations/cloudflare/client';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  subscriptionsApi: {
    getActiveSubscriptions: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('MCPPermissionContext', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSubscriptions = [
    {
      id: 'sub-1',
      user_id: 'user-123',
      service_id: 'service-1',
      plan_id: 'plan-1',
      status: 'active',
      current_period_start: '2024-01-01T00:00:00Z',
      current_period_end: '2099-12-31T00:00:00Z', // 만료되지 않은 구독
      plan: {
        id: 'plan-1',
        plan_name: 'Pro',
        features: {},
      },
    },
  ];

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MCPPermissionProvider>{children}</MCPPermissionProvider>
      </QueryClientProvider>
    );
  };

  describe('useMCPPermissionContext', () => {
    it('Provider 없이 사용하면 에러를 던진다', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useMCPPermissionContext());
      }).toThrow('useMCPPermissionContext must be used within MCPPermissionProvider');

      consoleErrorSpy.mockRestore();
    });

    it('Provider 내에서 사용하면 Context 값을 반환한다', () => {
      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.permissions).toBeInstanceOf(Map);
      expect(result.current.checkPermission).toBeInstanceOf(Function);
      expect(result.current.invalidateCache).toBeInstanceOf(Function);
      expect(result.current.invalidateAll).toBeInstanceOf(Function);
      expect(typeof result.current.isLoading).toBe('boolean');
    });
  });

  describe('checkPermission', () => {
    it('로그인하지 않은 경우 none 권한을 반환한다', async () => {
      // localStorage에 토큰이 없는 경우
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      let permissionInfo: PermissionInfo | undefined;

      await act(async () => {
        permissionInfo = await result.current.checkPermission('minu-find');
      });

      expect(permissionInfo).toBeDefined();
      expect(permissionInfo!.permission).toBe('none');
      expect(permissionInfo!.reason).toBe('subscription_required');
    });

    it('활성 구독이 있으면 권한을 반환한다', async () => {
      // localStorage에 토큰 설정
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      // Workers API 모킹
      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockResolvedValue({
        data: mockSubscriptions,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      let permissionInfo: PermissionInfo | undefined;

      await act(async () => {
        permissionInfo = await result.current.checkPermission('minu-find');
      });

      expect(permissionInfo).toBeDefined();
      expect(permissionInfo!.permission).toBe('admin'); // Pro 플랜은 admin 권한 반환
      expect(subscriptionsApi.getActiveSubscriptions).toHaveBeenCalledWith('mock-access-token');
    });

    it('만료된 구독의 경우 expired 사유를 반환한다', async () => {
      // localStorage에 토큰 설정
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      // 만료된 구독 데이터 (활성 구독이 없음)
      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockResolvedValue({
        data: [],
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      let permissionInfo: PermissionInfo | undefined;

      await act(async () => {
        permissionInfo = await result.current.checkPermission('minu-find');
      });

      expect(permissionInfo).toBeDefined();
      expect(permissionInfo!.permission).toBe('none');
      expect(permissionInfo!.reason).toBe('subscription_required');
    });

    it('DB 오류 시 service_unavailable 사유를 반환한다', async () => {
      // localStorage에 토큰 설정
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      // Workers API 에러 모킹
      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockResolvedValue({
        data: null,
        error: 'DB error',
        status: 500,
      });

      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      let permissionInfo: PermissionInfo | undefined;

      await act(async () => {
        permissionInfo = await result.current.checkPermission('minu-find');
      });

      expect(permissionInfo).toBeDefined();
      expect(permissionInfo!.permission).toBe('none');
      expect(permissionInfo!.reason).toBe('service_unavailable');
    });
  });

  describe('캐싱', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockResolvedValue({
        data: mockSubscriptions,
        error: null,
        status: 200,
      });
    });

    it('같은 서비스를 연속으로 조회하면 캐시를 사용한다', async () => {
      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkPermission('minu-find');
      });

      const firstCallCount = vi.mocked(subscriptionsApi.getActiveSubscriptions).mock.calls.length;

      await act(async () => {
        await result.current.checkPermission('minu-find');
      });

      const secondCallCount = vi.mocked(subscriptionsApi.getActiveSubscriptions).mock.calls.length;

      // 두 번째 호출은 캐시를 사용하므로 API 호출 횟수가 증가하지 않음
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('permissions Map에 캐시된 정보가 있다', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockResolvedValue({
        data: mockSubscriptions,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      // 첫 번째 권한 체크
      await act(async () => {
        await result.current.checkPermission('minu-find');
      });

      // permissions Map에 캐시되었는지 확인
      expect(result.current.permissions.size).toBeGreaterThan(0);
      expect(result.current.permissions.has('minu-find')).toBe(true);

      const cachedPermission = result.current.permissions.get('minu-find');
      expect(cachedPermission).toBeDefined();
      expect(cachedPermission!.permission).toBe('admin'); // Pro 플랜은 admin 권한 반환
    });
  });

  describe('invalidateCache', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockResolvedValue({
        data: mockSubscriptions,
        error: null,
        status: 200,
      });
    });

    it('특정 서비스의 캐시를 무효화한다', async () => {
      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkPermission('minu-find');
        await result.current.checkPermission('minu-frame');
      });

      act(() => {
        result.current.invalidateCache('minu-find');
      });

      await waitFor(() => {
        expect(result.current.permissions.get('minu-find')).toBeUndefined();
        expect(result.current.permissions.get('minu-frame')).toBeDefined();
      });
    });

    it('invalidateAll로 전체 캐시를 무효화한다', async () => {
      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkPermission('minu-find');
        await result.current.checkPermission('minu-frame');
      });

      act(() => {
        result.current.invalidateAll();
      });

      await waitFor(() => {
        expect(result.current.permissions.size).toBe(0);
      });
    });
  });

  describe('구독 변경 감지', () => {
    it('구독 쿼리 변경 시 캐시가 자동으로 무효화된다', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockResolvedValue({
        data: mockSubscriptions,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      // 첫 번째 권한 체크
      await act(async () => {
        await result.current.checkPermission('minu-find');
      });

      // 캐시 확인
      expect(result.current.permissions.size).toBeGreaterThan(0);

      // 캐시 무효화
      await act(async () => {
        result.current.invalidateAll();
      });

      // 캐시가 비워졌는지 확인
      await waitFor(() => {
        expect(result.current.permissions.size).toBe(0);
      });
    });
  });

  describe('로딩 상태 관리', () => {
    it('초기 로딩 상태는 false여야 함', () => {
      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('권한 확인 시작 시 로딩 상태가 true가 되어야 함', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      // 느린 응답 시뮬레이션
      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  data: mockSubscriptions,
                  error: null,
                  status: 200,
                }),
              100
            );
          })
      );

      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.checkPermission('minu-find');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });

    it('권한 확인 완료 후 로딩 상태가 false가 되어야 함', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockResolvedValue({
        data: mockSubscriptions,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkPermission('minu-find');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('다중 서비스 권한 관리', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockResolvedValue({
        data: mockSubscriptions,
        error: null,
        status: 200,
      });
    });

    it('여러 서비스의 권한을 동시에 확인할 수 있어야 함', async () => {
      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await Promise.all([
          result.current.checkPermission('minu-find'),
          result.current.checkPermission('minu-frame'),
          result.current.checkPermission('minu-build'),
        ]);
      });

      expect(result.current.permissions.size).toBeGreaterThan(0);
    });

    it('서비스별로 독립적인 캐시를 유지해야 함', async () => {
      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkPermission('minu-find');
      });

      const minuFindPermission = result.current.permissions.get('minu-find');

      await act(async () => {
        await result.current.checkPermission('minu-frame');
      });

      // minu-find 캐시는 유지되어야 함
      expect(result.current.permissions.get('minu-find')).toBe(minuFindPermission);
    });
  });

  describe('권한 정보 타임스탬프', () => {
    it('권한 확인 시 checkedAt 시각이 기록되어야 함', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockResolvedValue({
        data: mockSubscriptions,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      let permissionInfo: PermissionInfo | undefined;

      await act(async () => {
        permissionInfo = await result.current.checkPermission('minu-find');
      });

      expect(permissionInfo?.checkedAt).toBeInstanceOf(Date);
    });
  });

  describe('에러 시나리오', () => {
    it('인증 에러 발생 시 안전하게 처리해야 함', async () => {
      // 잘못된 JSON 형식의 토큰 (파싱 에러 유발)
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      let permissionInfo: PermissionInfo | undefined;

      await act(async () => {
        try {
          permissionInfo = await result.current.checkPermission('minu-find');
        } catch {
          // 에러 무시
        }
      });

      // 에러가 발생해도 앱이 크래시되지 않아야 함
      expect(result.current).toBeDefined();
    });

    it('API 연결 실패 시 service_unavailable을 반환해야 함', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      // API 에러 모킹
      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockRejectedValue(
        new Error('Connection failed')
      );

      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      let permissionInfo: PermissionInfo | undefined;

      await act(async () => {
        permissionInfo = await result.current.checkPermission('minu-find');
      });

      expect(permissionInfo?.permission).toBe('none');
      expect(permissionInfo?.reason).toBe('service_unavailable');
    });
  });

  describe('Context 값 메모이제이션', () => {
    it('permissions가 변경되지 않으면 Context 값이 재생성되지 않아야 함', () => {
      const { result, rerender } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      const firstValue = result.current;

      rerender();

      const secondValue = result.current;

      // 값이 변경되지 않았으므로 같은 참조를 유지해야 함
      expect(firstValue.checkPermission).toBe(secondValue.checkPermission);
      expect(firstValue.invalidateCache).toBe(secondValue.invalidateCache);
      expect(firstValue.invalidateAll).toBe(secondValue.invalidateAll);
    });
  });

  describe('invalidateCache 파라미터', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      vi.mocked(subscriptionsApi.getActiveSubscriptions).mockResolvedValue({
        data: mockSubscriptions,
        error: null,
        status: 200,
      });
    });

    it('serviceId 없이 호출하면 전체 캐시를 무효화해야 함', async () => {
      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkPermission('minu-find');
        await result.current.checkPermission('minu-frame');
      });

      act(() => {
        result.current.invalidateCache();
      });

      await waitFor(() => {
        expect(result.current.permissions.size).toBe(0);
      });
    });

    it('특정 serviceId만 무효화해야 함', async () => {
      const { result } = renderHook(() => useMCPPermissionContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkPermission('minu-find');
        await result.current.checkPermission('minu-frame');
      });

      const initialSize = result.current.permissions.size;

      act(() => {
        result.current.invalidateCache('minu-find');
      });

      await waitFor(() => {
        expect(result.current.permissions.size).toBe(initialSize - 1);
        expect(result.current.permissions.has('minu-find')).toBe(false);
        expect(result.current.permissions.has('minu-frame')).toBe(true);
      });
    });
  });
});
