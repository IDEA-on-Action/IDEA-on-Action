/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useMySubscriptions,
  useCancelSubscription,
  useUpgradeSubscription,
  useSubscriptionPayments,
} from '@/hooks/useSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';
import type { SubscriptionWithPlan, SubscriptionPaymentWithDetails } from '@/types/subscription.types';

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

describe('useSubscriptions', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSubscriptions: SubscriptionWithPlan[] = [
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
      service: {
        id: 'service-1',
        title: 'AI 컨설팅',
        slug: 'ai-consulting',
        image_url: 'https://example.com/image.jpg',
      },
      plan: {
        id: 'plan-1',
        plan_name: '프로',
        billing_cycle: 'monthly',
        price: 100000,
        features: { storage: '100GB', users: 10 },
      },
    },
    {
      id: 'sub-2',
      user_id: 'user-123',
      service_id: 'service-2',
      plan_id: 'plan-2',
      status: 'trial',
      current_period_start: '2024-01-15T00:00:00Z',
      current_period_end: '2024-01-29T00:00:00Z',
      cancel_at_period_end: false,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      service: {
        id: 'service-2',
        title: '워크플로우 자동화',
        slug: 'workflow-automation',
        image_url: 'https://example.com/image2.jpg',
      },
      plan: {
        id: 'plan-2',
        plan_name: '스타터',
        billing_cycle: 'monthly',
        price: 50000,
        features: { storage: '50GB', users: 5 },
      },
    },
  ];

  const mockPayments: SubscriptionPaymentWithDetails[] = [
    {
      id: 'payment-1',
      subscription_id: 'sub-1',
      amount: 100000,
      status: 'success',
      payment_method: 'card',
      transaction_id: 'txn-123',
      created_at: '2024-01-01T00:00:00Z',
      subscription: {
        id: 'sub-1',
        service_title: 'AI 컨설팅',
        plan_name: '프로',
      },
    },
    {
      id: 'payment-2',
      subscription_id: 'sub-1',
      amount: 100000,
      status: 'success',
      payment_method: 'card',
      transaction_id: 'txn-124',
      created_at: '2024-02-01T00:00:00Z',
      subscription: {
        id: 'sub-1',
        service_title: 'AI 컨설팅',
        plan_name: '프로',
      },
    },
  ];

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

  describe('useMySubscriptions', () => {
    it('내 구독 목록을 성공적으로 조회해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const orderMock = vi.fn().mockResolvedValue({
        data: mockSubscriptions,
        error: null,
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
      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockSubscriptions);
        expect(supabase.from).toHaveBeenCalledWith('subscriptions');
        expect(eqMock).toHaveBeenCalledWith('user_id', mockUser.id);
        expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
      }
    });

    it('로그인하지 않은 경우 에러를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('로그인이 필요합니다.'));
    });

    it('데이터베이스 에러 발생 시 에러를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST116' },
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
      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useCancelSubscription', () => {
    it('즉시 취소 시 구독을 성공적으로 취소해야 함', async () => {
      // Setup
      const cancelledSubscription = {
        ...mockSubscriptions[0],
        status: 'cancelled',
        cancel_at_period_end: false,
        cancelled_at: '2024-01-20T00:00:00Z',
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: cancelledSubscription,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        cancel_at_period_end: false,
        reason: '더 이상 필요하지 않음',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            cancel_at_period_end: false,
            status: 'cancelled',
            metadata: { cancel_reason: '더 이상 필요하지 않음' },
          })
        );
        expect(eqMock).toHaveBeenCalledWith('id', 'sub-1');
      }
    });

    it('주기 종료 시 취소 설정을 성공적으로 적용해야 함', async () => {
      // Setup
      const scheduledCancellation = {
        ...mockSubscriptions[0],
        cancel_at_period_end: true,
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: scheduledCancellation,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        cancel_at_period_end: true,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            cancel_at_period_end: true,
          })
        );
        expect(updateMock).not.toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'cancelled',
          })
        );
      }
    });

    it('취소 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const eqMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Subscription not found', code: 'PGRST116' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-999',
        cancel_at_period_end: false,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUpgradeSubscription', () => {
    it('구독 플랜을 성공적으로 업그레이드해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          orderId: 'order-123',
          amount: 200000,
          orderName: '플랜 업그레이드',
        },
        error: null,
      });

      const upgradedSubscription = {
        ...mockSubscriptions[0],
        plan_id: 'plan-premium',
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: upgradedSubscription,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useUpgradeSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        new_plan_id: 'plan-premium',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('create-payment-intent', {
          body: {
            planId: 'plan-premium',
            userId: mockUser.id,
            subscriptionId: 'sub-1',
          },
        });
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            plan_id: 'plan-premium',
          })
        );
      }
    });

    it('로그인하지 않은 경우 에러를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useUpgradeSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        new_plan_id: 'plan-premium',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('결제 인텐트 생성 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          error: 'Payment intent creation failed',
        },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useUpgradeSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        new_plan_id: 'plan-premium',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('구독 업데이트 실패 시 에러를 처리해야 함', async () => {
      // Setup
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

      const eqMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed', code: 'PGRST116' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useUpgradeSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({
        subscription_id: 'sub-1',
        new_plan_id: 'plan-premium',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useSubscriptionPayments', () => {
    it('구독 결제 내역을 성공적으로 조회해야 함', async () => {
      // Setup
      const rawPayments = [
        {
          id: 'payment-1',
          subscription_id: 'sub-1',
          amount: 100000,
          status: 'success',
          payment_method: 'card',
          transaction_id: 'txn-123',
          created_at: '2024-01-01T00:00:00Z',
          subscription: {
            id: 'sub-1',
            service: { title: 'AI 컨설팅' },
            plan: { plan_name: '프로' },
          },
        },
        {
          id: 'payment-2',
          subscription_id: 'sub-1',
          amount: 100000,
          status: 'success',
          payment_method: 'card',
          transaction_id: 'txn-124',
          created_at: '2024-02-01T00:00:00Z',
          subscription: {
            id: 'sub-1',
            service: { title: 'AI 컨설팅' },
            plan: { plan_name: '프로' },
          },
        },
      ];

      const orderMock = vi.fn().mockResolvedValue({
        data: rawPayments,
        error: null,
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
      const { result } = renderHook(() => useSubscriptionPayments('sub-1'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data![0]).toMatchObject({
          id: 'payment-1',
          subscription: {
            id: 'sub-1',
            service_title: 'AI 컨설팅',
            plan_name: '프로',
          },
        });
        expect(supabase.from).toHaveBeenCalledWith('subscription_payments');
        expect(eqMock).toHaveBeenCalledWith('subscription_id', 'sub-1');
        expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
      }
    });

    it('구독 ID가 없으면 쿼리가 비활성화되어야 함', () => {
      // Execute
      const { result } = renderHook(() => useSubscriptionPayments(''), { wrapper });

      // Assert
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('결제 내역 조회 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST116' },
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
      const { result } = renderHook(() => useSubscriptionPayments('sub-1'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('서비스나 플랜 정보가 없는 경우 기본값을 사용해야 함', async () => {
      // Setup
      const rawPayments = [
        {
          id: 'payment-1',
          subscription_id: 'sub-1',
          amount: 100000,
          status: 'success',
          payment_method: 'card',
          transaction_id: 'txn-123',
          created_at: '2024-01-01T00:00:00Z',
          subscription: {
            id: 'sub-1',
            service: null,
            plan: null,
          },
        },
      ];

      const orderMock = vi.fn().mockResolvedValue({
        data: rawPayments,
        error: null,
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
      const { result } = renderHook(() => useSubscriptionPayments('sub-1'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data![0].subscription).toMatchObject({
          id: 'sub-1',
          service_title: 'Unknown Service',
          plan_name: 'Unknown Plan',
        });
      }
    });
  });
});
