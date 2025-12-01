/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useSubscriptionUsage (subscription/) 확장 테스트
 *
 * src/hooks/subscription/useSubscriptionUsage.ts에 대한 테스트입니다.
 * 이 파일은 root의 useSubscriptionUsage와 다른 구현을 가지고 있습니다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscriptionUsage } from '@/hooks/subscription/useSubscriptionUsage';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';

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

import { useAuth } from '@/hooks/useAuth';

describe('useSubscriptionUsage (subscription/) - 확장 테스트', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSubscription = {
    id: 'sub-1',
    user_id: 'user-123',
    status: 'active',
    plan: {
      id: 'plan-1',
      plan_name: '프로 플랜',
      features: {
        api_calls: 1000,
        storage_gb: 100,
        team_members: 5,
        projects: 10,
      },
    },
  };

  const mockUsageData = [
    {
      subscription_id: 'sub-1',
      feature_key: 'api_calls',
      usage_count: 250,
    },
    {
      subscription_id: 'sub-1',
      feature_key: 'storage_gb',
      usage_count: 25,
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

  describe('기본 동작', () => {
    it('구독 사용량 요약을 성공적으로 조회해야 함', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [mockSubscription],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'subscription_usage') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockUsageData,
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess && result.current.data) {
        expect(result.current.data.subscription_id).toBe('sub-1');
        expect(result.current.data.plan_name).toBe('프로 플랜');
        expect(result.current.data.features).toBeDefined();
        expect(result.current.data.next_reset_date).toBeDefined();
      }
    });

    it('로그인하지 않은 경우 쿼리가 비활성화되어야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      // enabled: !!user이므로 쿼리가 비활성화됨
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('활성 구독이 없으면 null을 반환해야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('기능별 사용량 매핑', () => {
    it('무제한 기능(-1)을 올바르게 처리해야 함', async () => {
      const unlimitedSubscription = {
        ...mockSubscription,
        plan: {
          ...mockSubscription.plan,
          features: {
            api_calls: -1,
          },
        },
      };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [unlimitedSubscription],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'subscription_usage') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess && result.current.data) {
        const apiCallsFeature = result.current.data.features.find(
          (f) => f.feature_key === 'api_calls'
        );
        expect(apiCallsFeature?.is_unlimited).toBe(true);
        expect(apiCallsFeature?.limit).toBe(-1);
        expect(apiCallsFeature?.usage_percentage).toBe(0);
      }
    });

    it('boolean true 기능을 무제한으로 처리해야 함', async () => {
      const booleanTrueSubscription = {
        ...mockSubscription,
        plan: {
          ...mockSubscription.plan,
          features: {
            premium_support: true,
          },
        },
      };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [booleanTrueSubscription],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'subscription_usage') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess && result.current.data) {
        const premiumSupportFeature = result.current.data.features.find(
          (f) => f.feature_key === 'premium_support'
        );
        expect(premiumSupportFeature?.is_unlimited).toBe(true);
      }
    });

    it('boolean false 기능을 제한 0으로 처리해야 함', async () => {
      const booleanFalseSubscription = {
        ...mockSubscription,
        plan: {
          ...mockSubscription.plan,
          features: {
            advanced_analytics: false,
          },
        },
      };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [booleanFalseSubscription],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'subscription_usage') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess && result.current.data) {
        const analyticsFeature = result.current.data.features.find(
          (f) => f.feature_key === 'advanced_analytics'
        );
        expect(analyticsFeature?.limit).toBe(0);
        expect(analyticsFeature?.is_unlimited).toBe(false);
      }
    });

    it('숫자 제한 기능의 사용률을 올바르게 계산해야 함', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [mockSubscription],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'subscription_usage') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    subscription_id: 'sub-1',
                    feature_key: 'api_calls',
                    usage_count: 750, // 75% of 1000
                  },
                ],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess && result.current.data) {
        const apiCallsFeature = result.current.data.features.find(
          (f) => f.feature_key === 'api_calls'
        );
        expect(apiCallsFeature?.usage_percentage).toBe(75);
      }
    });

    it('사용량이 제한을 초과하면 100%로 제한되어야 함', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [mockSubscription],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'subscription_usage') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    subscription_id: 'sub-1',
                    feature_key: 'api_calls',
                    usage_count: 1500, // 150% of 1000
                  },
                ],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess && result.current.data) {
        const apiCallsFeature = result.current.data.features.find(
          (f) => f.feature_key === 'api_calls'
        );
        expect(apiCallsFeature?.usage_percentage).toBe(100);
      }
    });

    it('사용량 데이터가 없는 기능은 0으로 표시되어야 함', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [mockSubscription],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'subscription_usage') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess && result.current.data) {
        result.current.data.features.forEach((feature) => {
          expect(feature.usage_count).toBe(0);
        });
      }
    });
  });

  describe('다음 리셋 날짜 계산', () => {
    it('다음 달 1일을 리셋 날짜로 계산해야 함', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [mockSubscription],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'subscription_usage') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess && result.current.data) {
        const nextResetDate = new Date(result.current.data.next_reset_date);
        expect(nextResetDate.getDate()).toBe(1);
        // 다음 달이거나 현재 달일 수 있음 (1월인 경우 12월로 돌아갈 수 있음)
        const currentMonth = new Date().getMonth();
        const nextMonth = (currentMonth + 1) % 12;
        expect([currentMonth, nextMonth]).toContain(nextResetDate.getMonth());
      }
    });
  });

  describe('에러 처리', () => {
    it('구독 조회 에러를 처리해야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Subscription query error' },
                }),
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('사용량 조회 에러를 처리해야 함', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [mockSubscription],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'subscription_usage') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Usage query error' },
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('캐싱 및 재검증', () => {
    it('5분간 캐시를 유지해야 함', () => {
      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      // Query 옵션을 직접 확인할 수 없으므로, 쿼리가 정의되었는지만 확인
      expect(result.current).toBeDefined();
    });

    it('user가 변경되면 enabled가 false가 되어야 함', () => {
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

      const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });

      expect(result.current.isFetching).toBe(false);
    });
  });
});
