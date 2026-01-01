/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscriptionUsage } from '@/hooks/subscription/useSubscriptionUsage';
import { subscriptionsApi, callWorkersApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  subscriptionsApi: {
    getCurrent: vi.fn(),
  },
  callWorkersApi: vi.fn(),
}));

// Mock useAuth with workersTokens
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/auth/useAuth';

describe('useSubscriptionUsage', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockWorkersTokens = {
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: Date.now() + 3600000,
  };

  const mockSubscription = {
    id: 'sub-1',
    current_period_start: '2024-01-01T00:00:00Z',
    current_period_end: '2024-02-01T00:00:00Z',
    plan: {
      id: 'plan-1',
      plan_name: '프로',
      features: {
        api_calls: 1000,
        storage_gb: 100,
        team_members: 10,
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
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      workersTokens: mockWorkersTokens,
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useSubscriptionUsage', () => {
    it('구독 사용량을 성공적으로 조회해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscription,
        error: null,
        status: 200,
      });

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [
          { feature_key: 'api_calls', usage_count: 50 },
          { feature_key: 'storage_gb', usage_count: 10 },
        ],
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.features).toBeDefined();
      expect(result.current.data?.features.length).toBeGreaterThan(0);
      expect(subscriptionsApi.getCurrent).toHaveBeenCalledWith('mock-token');
    });

    it('로그인하지 않은 경우 쿼리가 비활성화되어야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        workersTokens: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      // Assert - enabled: false이므로 isLoading은 false이고 data는 undefined
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('활성 구독이 없는 경우 null을 반환해야 함', async () => {
      // Setup - 구독 없음
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: null,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('플랜에 features가 있으면 사용량 데이터를 반환해야 함', async () => {
      // Setup
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscription,
        error: null,
        status: 200,
      });

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [{ feature_key: 'api_calls', usage_count: 50 }],
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.features).toBeDefined();
      const apiCallsFeature = result.current.data?.features.find(
        (f) => f.feature_key === 'api_calls'
      );
      expect(apiCallsFeature).toBeDefined();
      expect(apiCallsFeature?.feature_name).toBe('API 호출');
      expect(apiCallsFeature?.usage_count).toBe(50);
      expect(apiCallsFeature?.limit).toBe(1000);
    });
  });
});
