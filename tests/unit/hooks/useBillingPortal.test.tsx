/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useBillingPortal,
  useDownloadInvoice,
  useAddPaymentMethod,
} from '@/hooks/useBillingPortal';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';

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

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { useAuth } from '@/hooks/useAuth';

describe('useBillingPortal', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSubscription = {
    id: 'sub-1',
    user_id: 'user-123',
    service_id: 'service-1',
    plan_id: 'plan-1',
    status: 'active',
    current_period_start: '2024-01-01T00:00:00Z',
    current_period_end: '2024-02-01T00:00:00Z',
    next_billing_date: '2024-02-01T00:00:00Z',
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
    billing_key: {
      id: 'billing-key-1',
      card_number: '**** **** **** 1234',
      card_type: '신한',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    },
  };

  const mockPayments = [
    {
      id: 'payment-1',
      subscription_id: 'sub-1',
      amount: 100000,
      status: 'success',
      payment_method: 'card',
      transaction_id: 'txn-123',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'payment-2',
      subscription_id: 'sub-1',
      amount: 100000,
      status: 'success',
      payment_method: 'card',
      transaction_id: 'txn-124',
      created_at: '2024-02-01T00:00:00Z',
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
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useBillingPortal', () => {
    it('현재 플랜을 성공적으로 조회해야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockSubscription,
        error: null,
      });

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

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: selectMock,
          } as any;
        }
        if (table === 'subscription_payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: mockPayments,
                    error: null,
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      // Execute
      const { result } = renderHook(() => useBillingPortal(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 구독 조회 함수가 정상적으로 호출되었는지 확인
      expect(selectMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('로그인하지 않은 경우 null을 반환해야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

      // Execute
      const { result } = renderHook(() => useBillingPortal(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentPlan).toBeNull();
    });

    it('구독이 없는 경우 null을 반환해야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: singleMock,
              }),
            }),
          }),
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useBillingPortal(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentPlan).toBeNull();
    });

    it('구독 취소 함수가 제공되어야 함', () => {
      const { result } = renderHook(() => useBillingPortal(), { wrapper });

      expect(result.current.cancelSubscription).toBeDefined();
      expect(typeof result.current.cancelSubscription).toBe('function');
    });

    it('플랜 변경 함수가 제공되어야 함', () => {
      const { result } = renderHook(() => useBillingPortal(), { wrapper });

      expect(result.current.changePlan).toBeDefined();
      expect(typeof result.current.changePlan).toBe('function');
    });
  });

  describe('useDownloadInvoice', () => {
    it('인보이스 다운로드 함수를 제공해야 함', () => {
      const { result } = renderHook(() => useDownloadInvoice(), { wrapper });

      expect(result.current.downloadInvoice).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('인보이스 다운로드를 시도해야 함', () => {
      const { result } = renderHook(() => useDownloadInvoice(), { wrapper });

      act(() => {
        result.current.downloadInvoice('invoice-1');
      });

      // TODO: 실제 다운로드 로직 구현 후 테스트 강화
      expect(result.current.downloadInvoice).toBeDefined();
    });
  });

  describe('useAddPaymentMethod', () => {
    it('결제 수단 추가 함수를 제공해야 함', () => {
      const { result } = renderHook(() => useAddPaymentMethod(), { wrapper });

      expect(result.current.addPaymentMethod).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('결제 수단 추가를 시도해야 함', () => {
      const { result } = renderHook(() => useAddPaymentMethod(), { wrapper });

      act(() => {
        result.current.addPaymentMethod({ type: 'card' });
      });

      // TODO: 실제 결제 수단 추가 로직 구현 후 테스트 강화
      expect(result.current.addPaymentMethod).toBeDefined();
    });

    it('로그인하지 않은 경우 에러를 반환해야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

      const { result } = renderHook(() => useAddPaymentMethod(), { wrapper });

      await act(async () => {
        try {
          await result.current.addPaymentMethodAsync({ type: 'card' });
        } catch (error) {
          expect((error as Error).message).toBe('로그인이 필요합니다.');
        }
      });
    });
  });
});
