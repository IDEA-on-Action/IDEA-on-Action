/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React, { type ReactNode } from 'react';
import type { SubscriptionWithPlan, SubscriptionPaymentWithDetails } from '@/types/subscription.types';

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
  useSubscriptionPayments,
  useCurrentSubscription,
  useResumeSubscription,
  useCreateSubscription,
  useSubscriptionPlans,
} from '@/hooks/useSubscriptions';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionsApi, paymentsApi } from '@/integrations/cloudflare/client';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useSubscriptions', () => {
  let queryClient: QueryClient;

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

  describe('useSubscriptionPlans', () => {
    it('구독 플랜 목록을 조회해야 함', async () => {
      const mockPlans = [{ id: 'plan-1', plan_name: '프로', price: 100000 }];
      vi.mocked(subscriptionsApi.getPlans).mockResolvedValue({
        data: { plans: mockPlans },
        error: null,
      });

      const { result } = renderHook(() => useSubscriptionPlans(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPlans);
    });
  });

  describe('useMySubscriptions', () => {
    it('내 구독 목록을 성공적으로 조회해야 함', async () => {
      vi.mocked(subscriptionsApi.getHistory).mockResolvedValue({
        data: { subscriptions: mockSubscriptions },
        error: null,
      });

      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSubscriptions);
      expect(subscriptionsApi.getHistory).toHaveBeenCalledWith('test-token');
    });

    it('로그인하지 않은 경우 쿼리가 비활성화되어야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({
        workersTokens: null,
        workersUser: null,
        isAuthenticated: false,
        loading: false,
      } as any);

      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle');
      });

      expect(subscriptionsApi.getHistory).not.toHaveBeenCalled();
    });

    it('API 에러 발생 시 에러를 반환해야 함', async () => {
      vi.mocked(subscriptionsApi.getHistory).mockResolvedValue({
        data: null,
        error: 'Database error',
      });

      const { result } = renderHook(() => useMySubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useCurrentSubscription', () => {
    it('현재 활성 구독을 조회해야 함', async () => {
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: { subscription: mockSubscriptions[0] },
        error: null,
      });

      const { result } = renderHook(() => useCurrentSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSubscriptions[0]);
    });
  });

  describe('useCancelSubscription', () => {
    it('구독을 성공적으로 취소해야 함', async () => {
      vi.mocked(subscriptionsApi.cancel).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      result.current.mutate({
        subscription_id: 'sub-1',
        cancel_at_period_end: false,
        reason: '더 이상 필요하지 않음',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(subscriptionsApi.cancel).toHaveBeenCalledWith(
        'test-token',
        'sub-1',
        {
          cancel_immediately: true,
          reason: '더 이상 필요하지 않음',
        }
      );
    });

    it('취소 실패 시 에러를 처리해야 함', async () => {
      vi.mocked(subscriptionsApi.cancel).mockResolvedValue({
        data: null,
        error: 'Subscription not found',
      });

      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      result.current.mutate({
        subscription_id: 'sub-999',
        cancel_at_period_end: false,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useResumeSubscription', () => {
    it('구독을 성공적으로 재개해야 함', async () => {
      vi.mocked(subscriptionsApi.resume).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useResumeSubscription(), { wrapper });

      result.current.mutate('sub-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(subscriptionsApi.resume).toHaveBeenCalledWith('test-token', 'sub-1');
    });
  });

  describe('useUpgradeSubscription', () => {
    it('구독 플랜을 성공적으로 변경해야 함', async () => {
      vi.mocked(subscriptionsApi.changePlan).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useUpgradeSubscription(), { wrapper });

      result.current.mutate({
        subscription_id: 'sub-1',
        new_plan_id: 'plan-premium',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(subscriptionsApi.changePlan).toHaveBeenCalledWith(
        'test-token',
        'sub-1',
        { new_plan_id: 'plan-premium' }
      );
    });
  });

  describe('useSubscriptionPayments', () => {
    it('결제 내역을 성공적으로 조회해야 함', async () => {
      vi.mocked(paymentsApi.history).mockResolvedValue({
        data: { payments: mockPayments },
        error: null,
      });

      const { result } = renderHook(() => useSubscriptionPayments('sub-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPayments);
      expect(paymentsApi.history).toHaveBeenCalledWith('test-token', { subscriptionId: 'sub-1' });
    });
  });

  describe('useCreateSubscription', () => {
    it('구독을 성공적으로 생성해야 함', async () => {
      vi.mocked(subscriptionsApi.create).mockResolvedValue({
        data: { success: true, subscription: mockSubscriptions[0] },
        error: null,
      });

      const { result } = renderHook(() => useCreateSubscription(), { wrapper });

      result.current.mutate({
        planId: 'plan-1',
        billingKeyId: 'billing-key-1',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(subscriptionsApi.create).toHaveBeenCalledWith(
        'test-token',
        {
          plan_id: 'plan-1',
          billing_key_id: 'billing-key-1',
        }
      );
    });
  });
});
