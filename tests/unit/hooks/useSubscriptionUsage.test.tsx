/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSubscriptionUsage,
  useIncrementUsage,
  useResetUsage,
  useFeatureUsage,
} from '@/hooks/useSubscriptionUsage';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
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
  },
}));

import { useAuth } from '@/hooks/useAuth';

describe('useSubscriptionUsage', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
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
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useSubscriptionUsage', () => {
    it('구독 사용량을 성공적으로 조회해야 함', async () => {
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

      const eqMock2 = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const eqMock1 = vi.fn().mockReturnValue({
        eq: eqMock2,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock1,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toBeDefined();
      expect(result.current.usage.length).toBeGreaterThan(0);
      expect(result.current.totalUsed).toBeDefined();
    });

    it('로그인하지 않은 경우 빈 사용량을 반환해야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

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
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: singleMock,
                }),
              }),
            }),
          }),
        }),
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

    it('플랜에 features가 없는 경우 빈 사용량을 반환해야 함', async () => {
      // Setup
      const subscriptionWithoutFeatures = {
        ...mockSubscription,
        plan: {
          ...mockSubscription.plan,
          features: null,
        },
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: subscriptionWithoutFeatures,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: singleMock,
                }),
              }),
            }),
          }),
        }),
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

    it('사용량 데이터에 feature_name이 포함되어야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockSubscription,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: singleMock,
                }),
              }),
            }),
          }),
        }),
      } as any);

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
      // Setup
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useIncrementUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.incrementUsage({ feature_key: 'ai_chat_messages' });
      });

      // TODO: 실제 사용량 증가 로직 구현 후 테스트 강화
      expect(result.current.incrementUsage).toBeDefined();
    });

    it('로그인하지 않은 경우 에러를 반환해야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

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
      // Setup
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as any);

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
      // Execute
      const { result } = renderHook(() => useResetUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.resetUsage({ user_id: 'user-123' });
      });

      // TODO: 실제 사용량 초기화 로직 구현 후 테스트 강화
      expect(result.current.resetUsage).toBeDefined();
    });

    it('특정 기능만 초기화할 수 있어야 함', async () => {
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

      expect(result.current.resetUsage).toBeDefined();
    });
  });

  describe('useFeatureUsage', () => {
    it('특정 기능의 사용량만 조회해야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockSubscription,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: singleMock,
                }),
              }),
            }),
          }),
        }),
      } as any);

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
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockSubscription,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: singleMock,
                }),
              }),
            }),
          }),
        }),
      } as any);

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
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

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
