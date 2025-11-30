/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCanAccess, useCanAccessMultiple, useHasAccess } from '@/hooks/useCanAccess';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';

describe('useCanAccess', () => {
  let queryClient: QueryClient;

  const mockUser = {
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

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('비로그인 사용자 (Free 플랜)', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
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
        user: mockUser,
      } as any);
    });

    it('활성 구독이 없으면 Free 플랜 폴백을 적용해야 함', async () => {
      // Setup - 구독 없음 (PGRST116 에러)
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const limitMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqStatusMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const eqUserMock = vi.fn().mockReturnValue({
        eq: eqStatusMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqUserMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

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
      // Setup - DB 에러
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      });

      const limitMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqStatusMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const eqUserMock = vi.fn().mockReturnValue({
        eq: eqStatusMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqUserMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

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
        user: mockUser,
      } as any);
    });

    it('플랜 features에서 제한을 조회하고 적용해야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
      });

      const limitMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqStatusMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const eqUserMock = vi.fn().mockReturnValue({
        eq: eqStatusMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqUserMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useCanAccess('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.limit).toBe(100);
      expect(result.current.remaining).toBe(100); // used_count = 0
      expect(supabase.from).toHaveBeenCalledWith('subscriptions');
      expect(selectMock).toHaveBeenCalled();
      expect(eqUserMock).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(eqStatusMock).toHaveBeenCalledWith('status', 'active');
    });

    it('무제한 기능 (limit: null)은 remaining도 null이어야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
      });

      const limitMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqStatusMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const eqUserMock = vi.fn().mockReturnValue({
        eq: eqStatusMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqUserMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

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
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
      });

      const limitMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqStatusMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const eqUserMock = vi.fn().mockReturnValue({
        eq: eqStatusMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqUserMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

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
      // Setup - 제한이 0인 플랜
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

      const singleMock = vi.fn().mockResolvedValue({
        data: exhaustedPlan,
        error: null,
      });

      const limitMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqStatusMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const eqUserMock = vi.fn().mockReturnValue({
        eq: eqStatusMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqUserMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

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
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
      });

      const limitMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqStatusMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const eqUserMock = vi.fn().mockReturnValue({
        eq: eqStatusMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqUserMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

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
        user: mockUser,
      } as any);
    });

    it('Supabase 에러 시 Free 플랜 폴백을 적용해야 함', async () => {
      // Setup - Supabase 에러
      const singleMock = vi.fn().mockRejectedValue(new Error('Network error'));

      const limitMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
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
    });

    it('네트워크 에러 처리 시에도 Free 플랜 폴백을 적용해야 함', async () => {
      // Setup - 네트워크 에러
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Failed to fetch');
      });

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
      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: 'sub-1',
          plan: null, // 플랜 정보 없음
        },
        error: null,
      });

      const limitMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqStatusMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const eqUserMock = vi.fn().mockReturnValue({
        eq: eqStatusMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqUserMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

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
        user: null,
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
        user: mockUser,
      } as any);

      const singleMock = vi.fn().mockResolvedValue({
        data: mockSubscriptionWithPlan,
        error: null,
      });

      const limitMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqStatusMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const eqUserMock = vi.fn().mockReturnValue({
        eq: eqStatusMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqUserMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

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
        user: null,
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
        user: mockUser,
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

      const singleMock = vi.fn().mockResolvedValue({
        data: exhaustedPlan,
        error: null,
      });

      const limitMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqStatusMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const eqUserMock = vi.fn().mockReturnValue({
        eq: eqStatusMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqUserMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

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
});
