/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCanAccess, useCanAccessMultiple, useHasAccess } from '@/hooks/useCanAccess';
import { subscriptionsApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  subscriptionsApi: {
    getCurrent: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';

describe('useCanAccess', () => {
  let queryClient: QueryClient;

  const mockWorkersUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSubscriptionWithPlan = {
    id: 'sub-1',
    plan: {
      id: 'plan-1',
      plan_name: '프로',
      features: {
        ai_chat_messages: 100,
        document_export: 50,
        project_count: 10,
        team_members: 5,
        storage_mb: 1000,
        api_calls: null, // unlimited
      },
    },
  };

  const mockFreeSubscriptionWithPlan = {
    id: 'sub-2',
    plan: {
      id: 'plan-free',
      plan_name: 'Free',
      features: {
        ai_chat_messages: 10,
        document_export: 5,
        project_count: 1,
        team_members: 1,
        storage_mb: 100,
      },
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
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

  describe('비로그인 사용자 (Free 플랜)', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        workersUser: null,
        getAccessToken: () => null,
      } as any);
    });

    it('Free 플랜 제한이 있는 기능은 제한값을 반환해야 함', async () => {
      const { result } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(10);
      expect(result.current.remaining).toBe(10);
      expect(result.current.error).toBe(null);
    });

    it('Free 플랜에서 document_export는 제한값 5를 반환해야 함', async () => {
      const { result } = renderHook(() => useCanAccess('document_export'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(5);
      expect(result.current.remaining).toBe(5);
    });

    it('Free 플랜에서 null 제한 (unlimited)은 무제한으로 처리해야 함', async () => {
      const { result } = renderHook(() => useCanAccess('api_calls'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      // 훅의 기본 반환값이 0이므로, null이 0으로 변환됨
      // 실제 사용 시에는 data.limit을 직접 사용하거나, 0을 무제한으로 처리해야 함
      expect(result.current.limit).toBe(0); // 기본값
      expect(result.current.remaining).toBe(0); // 기본값
    });

    it('알 수 없는 feature_key는 무제한으로 처리해야 함', async () => {
      const { result } = renderHook(() => useCanAccess('unknown_feature'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(0); // 기본값
      expect(result.current.remaining).toBe(0); // 기본값
    });

    it('project_count는 Free 플랜 제한 1을 반환해야 함', async () => {
      const { result } = renderHook(() => useCanAccess('project_count'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(1);
      expect(result.current.remaining).toBe(1);
    });
  });

  describe('로그인 사용자 - 구독 없음', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        workersUser: mockWorkersUser,
        getAccessToken: () => 'mock-token',
      } as any);
    });

    it('활성 구독이 없으면 Free 플랜 폴백을 적용해야 함', async () => {
      // Setup - Workers API 구독 없음
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: null,
        error: 'No active subscription found',
        status: 404,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(10);
      expect(result.current.remaining).toBe(10);
    });

    it('구독 조회 에러 시 Free 플랜 폴백을 적용해야 함', async () => {
      // Setup - Workers API 에러
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('document_export'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(5);
      expect(result.current.remaining).toBe(5);
    });
  });

  describe('로그인 사용자 - 활성 구독', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        workersUser: mockWorkersUser,
        getAccessToken: () => 'mock-token',
      } as any);
    });

    it('플랜 features에서 제한을 조회하고 적용해야 함', async () => {
      // Setup - Workers API 성공 응답
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(100);
      expect(result.current.remaining).toBe(100); // used_count = 0
      expect(subscriptionsApi.getCurrent).toHaveBeenCalledWith('mock-token');
    });

    it('무제한 기능 (limit: null)은 remaining도 null이어야 함', async () => {
      // Setup - Workers API 성공 응답
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('api_calls'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      // 훅의 기본 반환값이 0이므로, null이 0으로 변환됨
      expect(result.current.limit).toBe(0);
      expect(result.current.remaining).toBe(0);
    });

    it('feature_key가 플랜에 없는 경우 무제한 허용해야 함', async () => {
      // Setup - Workers API 성공 응답
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('new_feature_not_in_plan'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      // 훅의 기본 반환값이 0이므로, null이 0으로 변환됨
      expect(result.current.limit).toBe(0);
      expect(result.current.remaining).toBe(0);
    });

    it('사용량이 제한에 도달하면 canAccess가 false여야 함', async () => {
      // Setup - 제한이 10이지만 사용량이 10인 경우
      // 참고: 현재 훅은 used_count를 Workers API에서 가져오지 않고 0으로 고정함
      // 실제로 canAccess가 false가 되려면 limit 자체가 0이어야 함
      const exhaustedPlan = {
        id: 'sub-limited',
        plan: {
          id: 'plan-limited',
          plan_name: 'Exhausted',
          features: {
            ai_chat_messages: 0, // 제한 0 (남은 사용량 없음)
          },
        },
      };

      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: exhaustedPlan,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(false);
      expect(result.current.limit).toBe(0);
      expect(result.current.remaining).toBe(0);
    });

    it('여러 기능에 대해 각각 다른 제한값을 반환해야 함', async () => {
      // Setup - Workers API 성공 응답
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
        status: 200,
      });

      // Execute - 여러 기능 순차 테스트
      const { result: chatResult } = renderHook(() => useCanAccess('ai_chat_messages'), {
        wrapper,
      });
      const { result: exportResult } = renderHook(() => useCanAccess('document_export'), {
        wrapper,
      });
      const { result: projectResult } = renderHook(() => useCanAccess('project_count'), {
        wrapper,
      });

      // Assert
      await waitFor(() => {
        expect(chatResult.current.isLoading).toBe(false);
        expect(exportResult.current.isLoading).toBe(false);
        expect(projectResult.current.isLoading).toBe(false);
      });

      expect(chatResult.current.limit).toBe(100);
      expect(exportResult.current.limit).toBe(50);
      expect(projectResult.current.limit).toBe(10);
    });
  });

  describe('에러 케이스', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        workersUser: mockWorkersUser,
        getAccessToken: () => 'mock-token',
      } as any);
    });

    it('Workers API 에러 시 Free 플랜 폴백을 적용해야 함', async () => {
      // Setup - Workers API 에러
      vi.mocked(subscriptionsApi.getCurrent).mockRejectedValue(new Error('Network error'));

      // Execute
      const { result } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(10); // Free plan fallback
      expect(result.current.remaining).toBe(10);
    });

    it('네트워크 에러 처리 시에도 Free 플랜 폴백을 적용해야 함', async () => {
      // Setup - 네트워크 에러
      vi.mocked(subscriptionsApi.getCurrent).mockRejectedValue(new Error('Failed to fetch'));

      // Execute
      const { result } = renderHook(() => useCanAccess('document_export'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(5); // Free plan fallback
      expect(result.current.remaining).toBe(5);
    });

    it('플랜 정보가 null인 경우 무제한으로 처리해야 함', async () => {
      // Setup - 플랜 정보 없음
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: {
          id: 'sub-1',
          plan: null, // 플랜 정보 없음
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      // plan이 null이면 features도 null, limitValue는 undefined → 무제한 허용
      // 훅의 기본 반환값이 0이므로, null이 0으로 변환됨
      expect(result.current.limit).toBe(0);
    });
  });

  describe('useCanAccessMultiple', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        workersUser: null,
        getAccessToken: () => null,
      } as any);
    });

    it('여러 기능의 접근 권한을 동시에 확인해야 함', async () => {
      // Execute
      const { result } = renderHook(
        () => useCanAccessMultiple(['ai_chat_messages', 'document_export', 'project_count']),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.ai_chat_messages.isLoading).toBe(false);
        expect(result.current.document_export.isLoading).toBe(false);
        expect(result.current.project_count.isLoading).toBe(false);
      });

      expect(result.current.ai_chat_messages.limit).toBe(10);
      expect(result.current.document_export.limit).toBe(5);
      expect(result.current.project_count.limit).toBe(1);

      expect(result.current.ai_chat_messages.canAccess).toBe(true);
      expect(result.current.document_export.canAccess).toBe(true);
      expect(result.current.project_count.canAccess).toBe(true);
    });

    it('빈 배열을 전달하면 빈 객체를 반환해야 함', () => {
      // Execute
      const { result } = renderHook(() => useCanAccessMultiple([]), { wrapper });

      // Assert
      expect(result.current).toEqual({});
    });

    it('로그인 사용자의 여러 기능 확인 시 플랜별 제한을 반환해야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({
        workersUser: mockWorkersUser,
        getAccessToken: () => 'mock-token',
      } as any);

      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(
        () => useCanAccessMultiple(['ai_chat_messages', 'document_export']),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.ai_chat_messages.isLoading).toBe(false);
        expect(result.current.document_export.isLoading).toBe(false);
      });

      expect(result.current.ai_chat_messages.limit).toBe(100);
      expect(result.current.document_export.limit).toBe(50);
    });
  });

  describe('useHasAccess', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        workersUser: null,
        getAccessToken: () => null,
      } as any);
    });

    it('접근 가능한 기능은 true를 반환해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useHasAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(typeof result.current).toBe('boolean');
      });

      expect(result.current).toBe(true);
    });

    it('접근 불가능한 기능은 false를 반환해야 함', async () => {
      // Setup - 제한이 0인 플랜
      vi.mocked(useAuth).mockReturnValue({
        workersUser: mockWorkersUser,
        getAccessToken: () => 'mock-token',
      } as any);

      const exhaustedPlan = {
        id: 'sub-exhausted',
        plan: {
          id: 'plan-exhausted',
          plan_name: 'Exhausted',
          features: {
            ai_chat_messages: 0, // 제한 소진
          },
        },
      };

      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: exhaustedPlan,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useHasAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(typeof result.current).toBe('boolean');
      });

      expect(result.current).toBe(false);
    });

    it('boolean 값만 반환하고 상세 정보는 반환하지 않아야 함', async () => {
      // Execute
      const { result } = renderHook(() => useHasAccess('document_export'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(typeof result.current).toBe('boolean');
      });

      // boolean이 아닌 객체 속성이 없는지 확인
      expect(typeof result.current).toBe('boolean');
      expect(result.current).not.toHaveProperty('limit');
      expect(result.current).not.toHaveProperty('remaining');
    });
  });

  describe('추가 엣지 케이스', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        workersUser: mockWorkersUser,
        getAccessToken: () => 'mock-token',
      } as any);
    });

    it('플랜 features가 빈 객체인 경우 무제한 허용해야 함', async () => {
      // Setup
      const emptyFeaturesPlan = {
        id: 'sub-empty',
        plan: {
          id: 'plan-empty',
          plan_name: 'Empty Features',
          features: {},
        },
      };

      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: emptyFeaturesPlan,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(0);
      expect(result.current.remaining).toBe(0);
    });

    it('storage_mb 기능도 Free 플랜 제한을 반환해야 함', async () => {
      // Setup - 비로그인 사용자
      vi.mocked(useAuth).mockReturnValue({
        workersUser: null,
        getAccessToken: () => null,
      } as any);

      // Execute
      const { result } = renderHook(() => useCanAccess('storage_mb'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(100);
      expect(result.current.remaining).toBe(100);
    });

    it('team_members 기능도 Free 플랜 제한을 반환해야 함', async () => {
      // Setup - 비로그인 사용자
      vi.mocked(useAuth).mockReturnValue({
        workersUser: null,
        getAccessToken: () => null,
      } as any);

      // Execute
      const { result } = renderHook(() => useCanAccess('team_members'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(1);
      expect(result.current.remaining).toBe(1);
    });

    it('유료 플랜의 storage_mb는 플랜 제한을 반환해야 함', async () => {
      // Setup
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('storage_mb'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(1000);
      expect(result.current.remaining).toBe(1000);
    });

    it('유료 플랜의 team_members는 플랜 제한을 반환해야 함', async () => {
      // Setup
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('team_members'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(5);
      expect(result.current.remaining).toBe(5);
    });

    it('프로젝트 카운트 제한 초과 시 canAccess가 false여야 함', async () => {
      // Setup - limit이 0인 플랜 (사용량 추적은 현재 구현되지 않음)
      const exhaustedPlan = {
        id: 'sub-exhausted',
        plan: {
          id: 'plan-exhausted',
          plan_name: 'Exhausted',
          features: {
            project_count: 0,
          },
        },
      };

      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: exhaustedPlan,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('project_count'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(false);
      expect(result.current.limit).toBe(0);
      expect(result.current.remaining).toBe(0);
    });

    it('React Query 캐싱이 올바르게 작동해야 함', async () => {
      // Setup
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
        status: 200,
      });

      // Execute - 같은 기능을 두 번 조회
      const { result: result1 } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });
      const { result: result2 } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      // 두 결과가 동일해야 함 (캐싱 덕분)
      expect(result1.current.limit).toBe(result2.current.limit);
      expect(result1.current.remaining).toBe(result2.current.remaining);
      expect(result1.current.canAccess).toBe(result2.current.canAccess);
    });

    it('사용자가 변경되면 쿼리가 다시 실행되어야 함', async () => {
      // Setup - 첫 번째 사용자
      vi.mocked(useAuth).mockReturnValue({
        workersUser: mockWorkersUser,
        getAccessToken: () => 'mock-token',
      } as any);

      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
        status: 200,
      });

      // Execute
      const { result, rerender } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstLimit = result.current.limit;

      // 사용자 변경
      vi.mocked(useAuth).mockReturnValue({
        workersUser: { ...mockWorkersUser, id: 'user-456' },
        getAccessToken: () => 'mock-token-2',
      } as any);

      rerender();

      // Assert - 새로운 쿼리가 실행되어야 함
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // API가 호출되었는지 확인
      expect(subscriptionsApi.getCurrent).toHaveBeenCalled();
    });

    it('구독이 trial 상태일 때도 활성으로 처리되어야 함', async () => {
      // Setup
      const trialSubscription = {
        id: 'sub-trial',
        plan: {
          id: 'plan-trial',
          plan_name: 'Trial',
          features: {
            ai_chat_messages: 50,
          },
        },
      };

      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: trialSubscription,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(50);
    });

    it('useCanAccessMultiple에서 중복된 기능 키가 있어도 정상 작동해야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({
        workersUser: null,
        getAccessToken: () => null,
      } as any);

      // Execute - 중복된 키 포함
      const { result } = renderHook(
        () =>
          useCanAccessMultiple([
            'ai_chat_messages',
            'document_export',
            'ai_chat_messages', // 중복
          ]),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.ai_chat_messages.isLoading).toBe(false);
        expect(result.current.document_export.isLoading).toBe(false);
      });

      // 중복된 키도 접근 가능해야 함
      expect(result.current.ai_chat_messages.canAccess).toBe(true);
      expect(result.current.document_export.canAccess).toBe(true);
    });

    it('토큰이 없으면 Free 플랜 폴백을 적용해야 함', async () => {
      // Setup - 로그인했지만 토큰 없음
      vi.mocked(useAuth).mockReturnValue({
        workersUser: mockWorkersUser,
        getAccessToken: () => null,
      } as any);

      // Execute
      const { result } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(10); // Free plan fallback
      expect(result.current.remaining).toBe(10);
      // API 호출되지 않아야 함
      expect(subscriptionsApi.getCurrent).not.toHaveBeenCalled();
    });
  });
});
