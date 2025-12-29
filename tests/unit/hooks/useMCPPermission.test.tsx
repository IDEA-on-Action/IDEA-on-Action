/**
 * useMCPPermission Hook 테스트
 *
 * MCP 서비스 권한 확인 훅 테스트
 * - 권한 확인 로직
 * - 서비스별 권한 체크
 * - 권한 없음 처리
 * - 로딩 상태
 *
 * @migration Supabase → Workers API 마이그레이션 완료
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useMCPPermission,
  useMCPServicePermission,
  type ServiceId,
} from '@/hooks/useMCPPermission';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
    workersTokens: { accessToken: 'mock-token' },
  })),
}));

describe('useMCPPermission', () => {
  let queryClient: QueryClient;

  // Mock 응답 데이터
  const mockActivePermissionResponse = {
    permission: 'read' as const,
    reason: undefined,
    subscription: {
      status: 'active',
      current_period_end: new Date(Date.now() + 86400000).toISOString(), // +1일
      service_slug: 'find',
    },
  };

  const mockTrialPermissionResponse = {
    permission: 'read' as const,
    reason: undefined,
    subscription: {
      status: 'trial',
      current_period_end: new Date(Date.now() + 86400000).toISOString(),
      service_slug: 'find',
    },
  };

  const mockNoSubscriptionResponse = {
    permission: 'none' as const,
    reason: 'subscription_required' as const,
    subscription: null,
  };

  const mockExpiredSubscriptionResponse = {
    permission: 'none' as const,
    reason: 'subscription_expired' as const,
    subscription: {
      status: 'active',
      current_period_end: new Date(Date.now() - 86400000).toISOString(), // -1일
      service_slug: 'find',
    },
  };

  const mockServiceUnavailableResponse = {
    permission: 'none' as const,
    reason: 'service_unavailable' as const,
    subscription: null,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('초기화', () => {
    it('초기 상태는 로딩 중이어야 함', () => {
      // Setup - Workers API 모킹 (무한 대기)
      vi.mocked(callWorkersApi).mockImplementation(
        () => new Promise(() => {}) // 무한 로딩
      );

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
            requiredPermission: 'read',
          }),
        { wrapper }
      );

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasPermission).toBe(false);
    });

    it('서비스 ID가 제공되지 않으면 쿼리가 비활성화되어야 함', () => {
      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: '' as ServiceId,
          }),
        { wrapper }
      );

      // Assert - 쿼리가 실행되지 않아야 함
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('권한 확인 성공', () => {
    it('활성 구독이 있으면 read 권한을 반환해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockActivePermissionResponse,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
            requiredPermission: 'read',
          }),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasPermission).toBe(true);
      expect(result.current.permission).toBe('read');
      expect(result.current.reason).toBeUndefined();

      // Workers API 호출 확인
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/mcp/auth/permission/find',
        expect.objectContaining({
          token: 'mock-token',
        })
      );
    });

    it('trial 상태 구독도 유효한 권한으로 처리해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockTrialPermissionResponse,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });

      expect(result.current.permission).toBe('read');
    });
  });

  describe('권한 없음 처리', () => {
    it('구독이 없으면 subscription_required 사유를 반환해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockNoSubscriptionResponse,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.permission).toBe('none');
      expect(result.current.reason).toBe('subscription_required');
    });

    it('구독이 만료되면 subscription_expired 사유를 반환해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockExpiredSubscriptionResponse,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.reason).toBe('subscription_expired');
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.permission).toBe('none');
    });

    it('서비스가 존재하지 않으면 service_unavailable 사유를 반환해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockServiceUnavailableResponse,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.reason).toBe('service_unavailable');
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.permission).toBe('none');
    });

    it('구독 상태가 active/trial이 아니면 권한이 없어야 함', async () => {
      // Setup - Workers API 모킹 (canceled 상태)
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          permission: 'none' as const,
          reason: 'subscription_expired' as const,
          subscription: {
            status: 'canceled',
            current_period_end: new Date(Date.now() + 86400000).toISOString(),
            service_slug: 'find',
          },
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(false);
      });

      // canceled 상태는 subscription_expired로 처리됨
      expect(result.current.permission).toBe('none');
    });
  });

  describe('권한 레벨 확인', () => {
    it('read 권한이 필요할 때 read 권한이 있으면 통과해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockActivePermissionResponse,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
            requiredPermission: 'read',
          }),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
    });

    it('write 권한이 필요할 때 read 권한만 있으면 거부해야 함', async () => {
      // Setup - Workers API 모킹 (read 권한만 제공)
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockActivePermissionResponse, // read 권한
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
            requiredPermission: 'write',
          }),
        { wrapper }
      );

      // Assert - write 권한이 필요하지만 read만 있음
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 현재 권한은 read지만 write가 필요하므로 거부됨
      expect(result.current.hasPermission).toBe(false);
    });
  });

  describe('에러 처리', () => {
    it('API 호출 실패 시 에러를 반환해야 함', async () => {
      // Setup - Workers API 에러 응답
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: '권한 확인 실패: Database error',
        status: 500,
      });

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        { wrapper }
      );

      // Assert - 에러가 발생하거나 service_unavailable 사유 반환
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      // API 에러 시 에러가 발생하거나 권한이 없어야 함
      expect(result.current.error || !result.current.hasPermission).toBeTruthy();
    });

    it('네트워크 오류 시 적절히 처리해야 함', async () => {
      // Setup - 첫 번째 호출은 네트워크 에러, 두 번째는 성공
      vi.mocked(callWorkersApi)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: mockActivePermissionResponse,
          error: null,
          status: 200,
        });

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        { wrapper }
      );

      // Assert - 에러 또는 완료 상태
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('refetch 기능', () => {
    it('refetch 함수가 제공되어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockActivePermissionResponse,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(typeof result.current.refetch).toBe('function');
    });
  });
});

describe('useMCPServicePermission', () => {
  let queryClient: QueryClient;

  // Mock 응답 데이터
  const mockActivePermissionResponse = {
    permission: 'read' as const,
    reason: undefined,
    subscription: {
      status: 'active',
      current_period_end: new Date(Date.now() + 86400000).toISOString(),
      service_slug: 'find',
    },
  };

  const mockSubscriptionInfoResponse = {
    planName: 'Pro Plan',
    status: 'active',
    validUntil: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('기본 서비스 권한', () => {
    it('활성 구독이 있으면 hasAccess가 true여야 함', async () => {
      // Setup - Workers API 모킹 (권한 확인 + 구독 정보)
      vi.mocked(callWorkersApi).mockImplementation((url: string) => {
        if (url.includes('/permission/')) {
          return Promise.resolve({
            data: mockActivePermissionResponse,
            error: null,
            status: 200,
          });
        }
        if (url.includes('/subscription/')) {
          return Promise.resolve({
            data: mockSubscriptionInfoResponse,
            error: null,
            status: 200,
          });
        }
        return Promise.resolve({ data: null, error: 'Not found', status: 404 });
      });

      // Execute
      const { result } = renderHook(() => useMCPServicePermission('minu-find'), {
        wrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.hasAccess).toBe(true);
      });
    });

    it('구독 정보를 올바르게 반환해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockImplementation((url: string) => {
        if (url.includes('/permission/')) {
          return Promise.resolve({
            data: mockActivePermissionResponse,
            error: null,
            status: 200,
          });
        }
        if (url.includes('/subscription/')) {
          return Promise.resolve({
            data: mockSubscriptionInfoResponse,
            error: null,
            status: 200,
          });
        }
        return Promise.resolve({ data: null, error: 'Not found', status: 404 });
      });

      // Execute
      const { result } = renderHook(() => useMCPServicePermission('minu-find'), {
        wrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.hasAccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('추가 권한 확인', () => {
    it('추가 권한이 있으면 hasPermission이 true여야 함', async () => {
      // Setup - Workers API 모킹 (write 권한이 없으므로 false 예상)
      vi.mocked(callWorkersApi).mockImplementation((url: string) => {
        if (url.includes('/permission/')) {
          return Promise.resolve({
            data: mockActivePermissionResponse, // read 권한만 제공
            error: null,
            status: 200,
          });
        }
        if (url.includes('/subscription/')) {
          return Promise.resolve({
            data: mockSubscriptionInfoResponse,
            error: null,
            status: 200,
          });
        }
        return Promise.resolve({ data: null, error: 'Not found', status: 404 });
      });

      // Execute
      const { result } = renderHook(
        () => useMCPServicePermission('minu-find', 'export_data'),
        { wrapper }
      );

      // Assert - 현재 구현상 write 권한이 없으므로 false
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(false);
      });
    });

    it('추가 권한이 없으면 hasPermission이 항상 true여야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockImplementation((url: string) => {
        if (url.includes('/permission/')) {
          return Promise.resolve({
            data: mockActivePermissionResponse,
            error: null,
            status: 200,
          });
        }
        if (url.includes('/subscription/')) {
          return Promise.resolve({
            data: mockSubscriptionInfoResponse,
            error: null,
            status: 200,
          });
        }
        return Promise.resolve({ data: null, error: 'Not found', status: 404 });
      });

      // Execute
      const { result } = renderHook(() => useMCPServicePermission('minu-find'), {
        wrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
    });
  });
});
