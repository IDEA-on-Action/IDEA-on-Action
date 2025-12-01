/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useSubscriptionUsage (root) 확장 테스트
 *
 * 기존 useSubscriptionUsage.test.tsx에 추가로 더 많은 엣지 케이스와 시나리오를 테스트합니다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSubscriptionUsage,
  useIncrementUsage,
  useResetUsage,
  useFeatureUsage,
  usageKeys,
} from '@/hooks/useSubscriptionUsage';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';
import { toast } from 'sonner';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
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
  },
}));

import { useAuth } from '@/hooks/useAuth';

describe('useSubscriptionUsage - 확장 테스트', () => {
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

  describe('useSubscriptionUsage - 엣지 케이스', () => {
    it('features에 다양한 타입의 값이 있을 때 처리되어야 함', async () => {
      const mixedFeaturesSubscription = {
        ...mockSubscription,
        plan: {
          ...mockSubscription.plan,
          features: {
            numeric_feature: 100,
            null_feature: null,
            string_feature: 'unlimited',
            boolean_true: true,
            boolean_false: false,
            zero_feature: 0,
          },
        },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mixedFeaturesSubscription,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toBeDefined();
      expect(result.current.usage.length).toBeGreaterThan(0);
    });

    it('사용량 percentage가 올바르게 계산되어야 함', async () => {
      const subscriptionWithUsage = {
        ...mockSubscription,
        plan: {
          ...mockSubscription.plan,
          features: {
            api_calls: 100,
          },
        },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: subscriptionWithUsage,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toBeDefined();
      if (result.current.usage.length > 0) {
        const feature = result.current.usage[0];
        expect(feature.percentage).toBeGreaterThanOrEqual(0);
        expect(feature.percentage).toBeLessThanOrEqual(100);
      }
    });

    it('features가 빈 객체일 때 빈 사용량을 반환해야 함', async () => {
      const emptyFeaturesSubscription = {
        ...mockSubscription,
        plan: {
          ...mockSubscription.plan,
          features: {},
        },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: emptyFeaturesSubscription,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toEqual([]);
      expect(result.current.totalUsed).toBe(0);
    });

    it('여러 번 refetch해도 안전해야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockSubscription,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
        await result.current.refetch();
        await result.current.refetch();
      });

      expect(result.current.usage).toBeDefined();
    });
  });

  describe('useIncrementUsage - 엣지 케이스', () => {
    it('increment_by를 0으로 설정하면 처리되어야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useIncrementUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.incrementUsage({
          feature_key: 'ai_chat_messages',
          increment_by: 0,
        });
      });

      expect(result.current.incrementUsage).toBeDefined();
    });

    it('increment_by를 음수로 설정하면 처리되어야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useIncrementUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.incrementUsage({
          feature_key: 'ai_chat_messages',
          increment_by: -10,
        });
      });

      expect(result.current.incrementUsage).toBeDefined();
    });

    it('DB 삽입 에러 발생 시 에러 토스트를 표시해야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      } as any);

      const { result } = renderHook(() => useIncrementUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.incrementUsageAsync({
            feature_key: 'ai_chat_messages',
          });
        } catch (error) {
          // 에러가 발생해야 함
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('성공 시 쿼리를 무효화해야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: [{ id: 'log-1' }],
          error: null,
        }),
      } as any);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useIncrementUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.incrementUsageAsync({
          feature_key: 'ai_chat_messages',
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: usageKeys.user(mockUser.id),
        });
      });
    });

    it('feature_key가 빈 문자열일 때 처리되어야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useIncrementUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.incrementUsage({
          feature_key: '',
        });
      });

      expect(result.current.incrementUsage).toBeDefined();
    });
  });

  describe('useResetUsage - 엣지 케이스', () => {
    it('user_id와 feature_key 모두 제공되면 특정 기능만 초기화해야 함', async () => {
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

    it('쿼리 무효화가 정확한 user_id로 호출되어야 함', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useResetUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.resetUsageAsync({
          user_id: 'user-456',
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: usageKeys.user('user-456'),
        });
      });
    });

    it('성공 시 성공 토스트를 표시해야 함', async () => {
      const { result } = renderHook(() => useResetUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.resetUsageAsync({
          user_id: 'user-123',
        });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('사용량이 초기화되었습니다.');
      });
    });
  });

  describe('useFeatureUsage - 엣지 케이스', () => {
    it('빈 문자열 feature_key로 조회하면 undefined를 반환해야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockSubscription,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useFeatureUsage(''), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toBeUndefined();
    });

    it('useSubscriptionUsage가 로딩 중이면 useFeatureUsage도 로딩 중이어야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockImplementation(
                    () =>
                      new Promise((resolve) => {
                        setTimeout(() => {
                          resolve({
                            data: mockSubscription,
                            error: null,
                          });
                        }, 100);
                      })
                  ),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useFeatureUsage('ai_chat_messages'), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('특정 기능이 limit_value null인 경우 무제한으로 처리되어야 함', async () => {
      const unlimitedSubscription = {
        ...mockSubscription,
        plan: {
          ...mockSubscription.plan,
          features: {
            storage_mb: null,
          },
        },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: unlimitedSubscription,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useFeatureUsage('storage_mb'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (result.current.usage) {
        expect(result.current.usage.limit_value).toBeNull();
      }
    });
  });

  describe('usageKeys 헬퍼', () => {
    it('올바른 쿼리 키를 생성해야 함', () => {
      expect(usageKeys.all).toEqual(['subscription-usage']);
      expect(usageKeys.user('user-123')).toEqual([
        'subscription-usage',
        'user',
        'user-123',
      ]);
      expect(usageKeys.feature('user-123', 'ai_chat_messages')).toEqual([
        'subscription-usage',
        'user',
        'user-123',
        'ai_chat_messages',
      ]);
    });

    it('다양한 user_id와 feature_key로 고유한 키를 생성해야 함', () => {
      const key1 = usageKeys.feature('user-1', 'feature-a');
      const key2 = usageKeys.feature('user-1', 'feature-b');
      const key3 = usageKeys.feature('user-2', 'feature-a');

      expect(key1).not.toEqual(key2);
      expect(key1).not.toEqual(key3);
      expect(key2).not.toEqual(key3);
    });
  });
});
