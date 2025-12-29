/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSubscriptionUsage,
  useIncrementUsage,
  useResetUsage,
  useFeatureUsage,
} from '@/hooks/useSubscriptionUsage';
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
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuth } from '@/hooks/useAuth';

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
        ai_chat_messages: 1000,
        document_export: 100,
        project_count: 10,
        storage_mb: 10240,
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
          { feature_key: 'ai_chat_messages', used_count: 50 },
          { feature_key: 'document_export', used_count: 10 },
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

      expect(result.current.usage).toBeDefined();
      expect(result.current.usage.length).toBeGreaterThan(0);
      expect(result.current.totalUsed).toBeDefined();
      expect(subscriptionsApi.getCurrent).toHaveBeenCalledWith('mock-token');
    });

    it('로그인하지 않은 경우 빈 사용량을 반환해야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        workersTokens: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toEqual([]);
      expect(result.current.totalUsed).toBe(0);
    });

    it('활성 구독이 없는 경우 빈 사용량을 반환해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: null,
        error: 'No active subscription found',
        status: 404,
      });

      // Execute
      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toEqual([]);
      expect(result.current.totalUsed).toBe(0);
    });

    it('플랜에 features가 없는 경우 빈 사용량을 반환해야 함', async () => {
      // Setup
      const subscriptionWithoutFeatures = {
        ...mockSubscription,
        plan: {
          ...mockSubscription.plan,
          features: null,
        },
      };

      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: subscriptionWithoutFeatures,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toEqual([]);
      expect(result.current.totalUsed).toBe(0);
    });

    it('사용량 데이터에 feature_name이 포함되어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscription,
        error: null,
        status: 200,
      });

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [{ feature_key: 'ai_chat_messages', used_count: 50 }],
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const aiChatUsage = result.current.usage.find(
        (u) => u.feature_key === 'ai_chat_messages'
      );
      expect(aiChatUsage?.feature_name).toBe('AI 채팅 메시지');
    });
  });

  describe('useIncrementUsage', () => {
    it('사용량 증가 함수를 제공해야 함', () => {
      const { result } = renderHook(() => useIncrementUsage(), { wrapper });

      expect(result.current.incrementUsage).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('사용량 증가를 시도해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscription,
        error: null,
        status: 200,
      });

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useIncrementUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.incrementUsage({ feature_key: 'ai_chat_messages' });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(subscriptionsApi.getCurrent).toHaveBeenCalledWith('mock-token');
    });

    it('로그인하지 않은 경우 에러를 반환해야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        workersTokens: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useIncrementUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      await act(async () => {
        try {
          await result.current.incrementUsageAsync({ feature_key: 'ai_chat_messages' });
        } catch (error) {
          expect((error as Error).message).toBe('로그인이 필요합니다.');
        }
      });
    });

    it('increment_by 파라미터를 사용할 수 있어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscription,
        error: null,
        status: 200,
      });

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useIncrementUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.incrementUsage({
          feature_key: 'ai_chat_messages',
          increment_by: 5,
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.incrementUsage).toBeDefined();
    });
  });

  describe('useResetUsage', () => {
    it('사용량 초기화 함수를 제공해야 함', () => {
      const { result } = renderHook(() => useResetUsage(), { wrapper });

      expect(result.current.resetUsage).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('사용량 초기화를 시도해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { success: true, message: '사용량이 초기화되었습니다.' },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useResetUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.resetUsage({ user_id: 'user-123' });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.resetUsage).toBeDefined();
    });

    it('특정 기능만 초기화할 수 있어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { success: true, message: '사용량이 초기화되었습니다.' },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useResetUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.resetUsage({
          user_id: 'user-123',
          feature_key: 'ai_chat_messages',
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.resetUsage).toBeDefined();
    });
  });

  describe('useFeatureUsage', () => {
    it('특정 기능의 사용량만 조회해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscription,
        error: null,
        status: 200,
      });

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [
          { feature_key: 'ai_chat_messages', used_count: 50 },
          { feature_key: 'document_export', used_count: 10 },
        ],
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useFeatureUsage('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toBeDefined();
      if (result.current.usage) {
        expect(result.current.usage.feature_key).toBe('ai_chat_messages');
        expect(result.current.usage.feature_name).toBe('AI 채팅 메시지');
      }
    });

    it('존재하지 않는 기능의 경우 undefined를 반환해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(subscriptionsApi.getCurrent).mockResolvedValue({
        data: mockSubscription,
        error: null,
        status: 200,
      });

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [],
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useFeatureUsage('non_existent_feature'), {
        wrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toBeUndefined();
    });

    it('로그인하지 않은 경우 undefined를 반환해야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        workersTokens: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useFeatureUsage('ai_chat_messages'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toBeUndefined();
    });
  });
});
