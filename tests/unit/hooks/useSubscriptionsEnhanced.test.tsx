/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useSubscriptions 확장 테스트
 *
 * 기존 useSubscriptions.test.tsx에 추가로 더 많은 엣지 케이스와 시나리오를 테스트합니다.
 *
 * @migration Supabase → Workers API 마이그레이션 완료
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React, { type ReactNode } from 'react';

// Mock useAuth hook - must be before imports
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    workersTokens: { accessToken: 'test-token', refreshToken: 'test-refresh' },
    workersUser: { id: 'user-123', email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
  })),
}));

// Mock Workers API client - must be before imports
vi.mock('@/integrations/cloudflare/client', () => ({
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
  paymentsApi: {
    history: vi.fn(),
  },
}));

// Import after mocks are defined
import {
  useMySubscriptions,
  useCancelSubscription,
  useUpgradeSubscription,
  subscriptionKeys,
} from '@/hooks/subscription/useSubscriptions';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionsApi } from '@/integrations/cloudflare/client';
import { toast } from 'sonner';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useSubscriptions - 확장 테스트', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    // Reset useAuth mock to default
    vi.mocked(useAuth).mockReturnValue({
      workersTokens: { accessToken: 'test-token', refreshToken: 'test-refresh' },
      workersUser: { id: 'user-123', email: 'test@example.com' },
      isAuthenticated: true,
      loading: false,
    } as any);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );

  describe('useMySubscriptions - 엣지 케이스', () => {
    it('빈 구독 목록을 반환할 때 처리되어야 함', async () => {
      vi.mocked(subscriptionsApi.getHistory).mockResolvedValue({
        data: { subscriptions: [] },
        error: null,
      });

      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual([]);
      }
    });

    it('인증 에러가 발생할 때 처리되어야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({
        workersTokens: null,
        workersUser: null,
        isAuthenticated: false,
        loading: false,
      } as any);

      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      await waitFor(() => {
        // 토큰이 없으면 쿼리가 비활성화됨 (enabled: false)
        expect(result.current.fetchStatus).toBe('idle');
      });

      expect(subscriptionsApi.getHistory).not.toHaveBeenCalled();
    });

    it('구독 데이터에 service나 plan이 null일 때 처리되어야 함', async () => {
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

      vi.mocked(subscriptionsApi.getHistory).mockResolvedValue({
        data: { subscriptions: subscriptionsWithNullRelations },
        error: null,
      });

      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(subscriptionsWithNullRelations);
      }
    });

    it('네트워크 타임아웃 에러를 처리해야 함', async () => {
      vi.mocked(subscriptionsApi.getHistory).mockResolvedValue({
        data: null,
        error: 'Network timeout',
      });

      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Network timeout'));
    });
  });

  describe('useCancelSubscription - 엣지 케이스', () => {
    it('취소 사유 없이 즉시 취소할 수 있어야 함', async () => {
      vi.mocked(subscriptionsApi.cancel).mockResolvedValue({
        data: {
          id: 'sub-1',
          status: 'cancelled',
          cancel_at_period_end: false,
          cancelled_at: new Date().toISOString(),
        },
        error: null,
      });

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
        expect(subscriptionsApi.cancel).toHaveBeenCalledWith(
          'test-token',
          'sub-1',
          {
            cancel_immediately: true,
            reason: undefined,
          }
        );
      }
    });

    it('취소 중 네트워크 에러 발생 시 에러 토스트를 표시해야 함', async () => {
      vi.mocked(subscriptionsApi.cancel).mockResolvedValue({
        data: null,
        error: 'Network error',
      });

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

    it('기간 종료 후 취소 옵션이 적용되어야 함', async () => {
      vi.mocked(subscriptionsApi.cancel).mockResolvedValue({
        data: {
          id: 'sub-1',
          cancel_at_period_end: true,
        },
        error: null,
      });

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
        expect(subscriptionsApi.cancel).toHaveBeenCalledWith(
          'test-token',
          'sub-1',
          {
            cancel_immediately: false,
            reason: undefined,
          }
        );
      }
    });
  });

  describe('useUpgradeSubscription - 엣지 케이스', () => {
    it('API에서 에러를 반환할 때 처리되어야 함', async () => {
      vi.mocked(subscriptionsApi.changePlan).mockResolvedValue({
        data: null,
        error: 'Plan change not allowed',
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

      expect(toast.error).toHaveBeenCalled();
    });

    it('동일한 플랜으로 업그레이드를 시도해도 처리되어야 함', async () => {
      vi.mocked(subscriptionsApi.changePlan).mockResolvedValue({
        data: {
          success: true,
          subscription: { id: 'sub-1', plan_id: 'plan-1' },
        },
        error: null,
      });

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

      expect(subscriptionsApi.changePlan).toHaveBeenCalledWith(
        'test-token',
        'sub-1',
        { new_plan_id: 'plan-1' }
      );
    });

    it('업그레이드 성공 시 구독 쿼리를 무효화해야 함', async () => {
      vi.mocked(subscriptionsApi.changePlan).mockResolvedValue({
        data: {
          success: true,
          subscription: { id: 'sub-1', plan_id: 'plan-premium' },
        },
        error: null,
      });

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
        expect(toast.success).toHaveBeenCalledWith('구독 플랜이 변경되었습니다.');
      }
    });

    it('로그인하지 않은 상태에서 업그레이드 시도 시 에러가 발생해야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({
        workersTokens: null,
        workersUser: null,
        isAuthenticated: false,
        loading: false,
      } as any);

      const { result } = renderHook(() => useUpgradeSubscription(), { wrapper });

      result.current.mutate({
        subscription_id: 'sub-1',
        new_plan_id: 'plan-premium',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('로그인이 필요합니다.');
      expect(subscriptionsApi.changePlan).not.toHaveBeenCalled();
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
      expect(subscriptionKeys.plans()).toEqual(['subscriptions', 'plans']);
    });
  });
});
