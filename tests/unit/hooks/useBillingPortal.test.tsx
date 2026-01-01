import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBillingPortal } from '@/hooks/subscription/useBillingPortal';
import React, { type ReactNode } from 'react';

// Mock useAuth
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    workersTokens: { accessToken: 'test-token' },
  })),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  subscriptionsApi: {
    changePlan: vi.fn(),
    cancel: vi.fn(),
    resume: vi.fn(),
    updatePayment: vi.fn(),
  },
  callWorkersApi: vi.fn(),
}));

describe('useBillingPortal', () => {
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
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useBillingPortal', () => {
    it('플랜 업그레이드 함수가 제공되어야 함', () => {
      const { result } = renderHook(() => useBillingPortal(), { wrapper });

      expect(result.current.upgradePlan).toBeDefined();
      expect(typeof result.current.upgradePlan).toBe('function');
      expect(result.current.upgradeLoading).toBe(false);
    });

    it('구독 취소 함수가 제공되어야 함', () => {
      const { result } = renderHook(() => useBillingPortal(), { wrapper });

      expect(result.current.cancelSubscription).toBeDefined();
      expect(typeof result.current.cancelSubscription).toBe('function');
      expect(result.current.cancelLoading).toBe(false);
    });

    it('구독 갱신 함수가 제공되어야 함', () => {
      const { result } = renderHook(() => useBillingPortal(), { wrapper });

      expect(result.current.renewSubscription).toBeDefined();
      expect(typeof result.current.renewSubscription).toBe('function');
      expect(result.current.renewLoading).toBe(false);
    });

    it('결제 수단 업데이트 함수가 제공되어야 함', () => {
      const { result } = renderHook(() => useBillingPortal(), { wrapper });

      expect(result.current.updatePaymentMethod).toBeDefined();
      expect(typeof result.current.updatePaymentMethod).toBe('function');
      expect(result.current.updatePaymentLoading).toBe(false);
    });
  });
});
