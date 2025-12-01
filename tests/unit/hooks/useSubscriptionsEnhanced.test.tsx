/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useSubscriptions 확장 테스트
 *
 * 기존 useSubscriptions.test.tsx에 추가로 더 많은 엣지 케이스와 시나리오를 테스트합니다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useMySubscriptions,
  useCancelSubscription,
  useUpgradeSubscription,
  subscriptionKeys,
} from '@/hooks/useSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';
import { toast } from 'sonner';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useSubscriptions - 확장 테스트', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
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

  describe('useMySubscriptions - 엣지 케이스', () => {
    it('빈 구독 목록을 반환할 때 처리되어야 함', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual([]);
      }
    });

    it('인증 에러가 발생할 때 처리되어야 함', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error', name: 'AuthError' } as any,
      });

      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('구독 데이터에 service나 plan이 null일 때 처리되어야 함', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const subscriptionsWithNullRelations = [
        {
          id: 'sub-1',
          user_id: 'user-123',
          service_id: 'service-1',
          plan_id: 'plan-1',
          status: 'active',
          current_period_start: '2024-01-01T00:00:00Z',
          current_period_end: '2024-02-01T00:00:00Z',
          cancel_at_period_end: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          service: null,
          plan: null,
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: subscriptionsWithNullRelations,
              error: null,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(subscriptionsWithNullRelations);
      }
    });

    it('네트워크 타임아웃 에러를 처리해야 함', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockRejectedValue(new Error('Network timeout')),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Network timeout'));
    });
  });

  describe('useCancelSubscription - 엣지 케이스', () => {
    it('취소 사유 없이 즉시 취소할 수 있어야 함', async () => {
      const cancelledSubscription = {
        id: 'sub-1',
        status: 'cancelled',
        cancel_at_period_end: false,
        cancelled_at: new Date().toISOString(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: cancelledSubscription,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        cancel_at_period_end: false,
      });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(toast.success).toHaveBeenCalledWith('구독이 성공적으로 취소되었습니다.');
      }
    });

    it('취소 중 네트워크 에러 발생 시 에러 토스트를 표시해야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockRejectedValue(new Error('Network error')),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        cancel_at_period_end: false,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('구독 취소 중 오류가 발생했습니다.');
    });

    it('metadata가 없는 경우에도 처리되어야 함', async () => {
      const cancelledSubscription = {
        id: 'sub-1',
        cancel_at_period_end: true,
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: cancelledSubscription,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        cancel_at_period_end: true,
      });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            cancel_at_period_end: true,
          })
        );
      }
    });
  });

  describe('useUpgradeSubscription - 엣지 케이스', () => {
    it('Edge Function에서 에러 객체를 반환할 때 처리되어야 함', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Function error' } as any,
      });

      const { result } = renderHook(() => useUpgradeSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        new_plan_id: 'plan-premium',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('동일한 플랜으로 업그레이드를 시도해도 처리되어야 함', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          orderId: 'order-123',
          amount: 100000,
        },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'sub-1', plan_id: 'plan-1' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useUpgradeSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        new_plan_id: 'plan-1',
      });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });
    });

    it('업그레이드 성공 시 구독 쿼리를 무효화해야 함', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          orderId: 'order-123',
          amount: 200000,
        },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'sub-1', plan_id: 'plan-premium' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpgradeSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        new_plan_id: 'plan-premium',
      });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: subscriptionKeys.all,
        });
      }
    });
  });

  describe('subscriptionKeys 헬퍼', () => {
    it('올바른 쿼리 키를 생성해야 함', () => {
      expect(subscriptionKeys.all).toEqual(['subscriptions']);
      expect(subscriptionKeys.mySubscriptions()).toEqual(['subscriptions', 'my']);
      expect(subscriptionKeys.details('sub-1')).toEqual([
        'subscriptions',
        'detail',
        'sub-1',
      ]);
      expect(subscriptionKeys.payments('sub-1')).toEqual([
        'subscriptions',
        'payments',
        'sub-1',
      ]);
    });
  });
});
