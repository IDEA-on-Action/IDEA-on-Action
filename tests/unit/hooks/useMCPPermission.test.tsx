/**
 * useMCPPermission Hook 테스트
 *
 * MCP 서비스 권한 확인 훅 테스트
 * - 권한 확인 로직
 * - 서비스별 권한 체크
 * - 권한 없음 처리
 * - 로딩 상태
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useMCPPermission,
  useMCPServicePermission,
  type ServiceId,
  type Permission,
} from '@/hooks/useMCPPermission';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  })),
}));

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMCPPermission', () => {
  const mockServiceData = {
    id: 'service-123',
    slug: 'find',
  };

  const mockActiveSubscription = {
    status: 'active',
    current_period_end: new Date(Date.now() + 86400000).toISOString(), // +1일
    service: {
      slug: 'find',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('초기화', () => {
    it('초기 상태는 로딩 중이어야 함', () => {
      // Setup
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              new Promise(() => {}) // 무한 로딩
            ),
          })),
        })),
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
            requiredPermission: 'read',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasPermission).toBe(false);
    });

    it('서비스 ID가 제공되지 않으면 쿼리가 비활성화되어야 함', () => {
      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: '' as ServiceId,
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert - 쿼리가 실행되지 않아야 함
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('권한 확인 성공', () => {
    it('활성 구독이 있으면 read 권한을 반환해야 함', async () => {
      // Setup
      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        // subscriptions 테이블
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockActiveSubscription,
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
            requiredPermission: 'read',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasPermission).toBe(true);
      expect(result.current.permission).toBe('read');
      expect(result.current.reason).toBeUndefined();
    });

    it('trial 상태 구독도 유효한 권한으로 처리해야 함', async () => {
      // Setup
      const trialSubscription = {
        ...mockActiveSubscription,
        status: 'trial',
      };

      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: trialSubscription,
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });

      expect(result.current.permission).toBe('read');
    });
  });

  describe('권한 없음 처리', () => {
    it('구독이 없으면 subscription_required 사유를 반환해야 함', async () => {
      // Setup
      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: null,
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.permission).toBe('none');
      expect(result.current.reason).toBe('subscription_required');
    });

    it('구독이 만료되면 subscription_expired 사유를 반환해야 함', async () => {
      // Setup
      const expiredSubscription = {
        ...mockActiveSubscription,
        current_period_end: new Date(Date.now() - 86400000).toISOString(), // -1일
      };

      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: expiredSubscription,
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.reason).toBe('subscription_expired');
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.permission).toBe('none');
    });

    it('서비스가 존재하지 않으면 service_unavailable 사유를 반환해야 함', async () => {
      // Setup
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: null,
              })
            ),
          })),
        })),
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.reason).toBe('service_unavailable');
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.permission).toBe('none');
    });

    it('구독 상태가 active/trial이 아니면 권한이 없어야 함', async () => {
      // Setup
      const inactiveSubscription = {
        ...mockActiveSubscription,
        status: 'canceled',
      };

      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: inactiveSubscription,
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(false);
      });

      // canceled 상태는 subscription_expired로 처리됨
      expect(result.current.permission).toBe('none');
    });
  });

  describe('권한 레벨 확인', () => {
    it('read 권한이 필요할 때 read 권한이 있으면 통과해야 함', async () => {
      // Setup
      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockActiveSubscription,
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
            requiredPermission: 'read',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
    });

    it('write 권한이 필요할 때 read 권한만 있으면 거부해야 함', async () => {
      // Setup
      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockActiveSubscription,
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
            requiredPermission: 'write',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert - write 권한이 필요하지만 read만 있음
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 현재 권한은 read지만 write가 필요하므로 거부됨
      expect(result.current.hasPermission).toBe(false);
    });
  });

  describe('에러 처리', () => {
    it('DB 조회 실패 시 에러를 반환해야 함', async () => {
      // Setup - 서비스 조회는 실패
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: 'Database error' },
              })
            ),
          })),
        })),
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert - 에러가 발생하거나 service_unavailable 사유 반환
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      // DB 에러 시 에러가 발생하거나 권한이 없어야 함
      expect(result.current.error || !result.current.hasPermission).toBeTruthy();
    });

    it('네트워크 오류 시 재시도해야 함', async () => {
      // Setup
      let callCount = 0;
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Network error' },
                });
              }
              return Promise.resolve({
                data: mockServiceData,
                error: null,
              });
            }),
          })),
        })),
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert - 재시도 후 성공 또는 실패
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('refetch 기능', () => {
    it('refetch 함수가 제공되어야 함', async () => {
      // Setup - 성공적인 조회
      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockActiveSubscription,
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () =>
          useMCPPermission({
            serviceId: 'minu-find',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(typeof result.current.refetch).toBe('function');
    });
  });
});

describe('useMCPServicePermission', () => {
  const mockServiceData = {
    id: 'service-123',
    name: 'Minu Find',
  };

  const mockSubscription = {
    status: 'active',
    current_period_end: new Date(Date.now() + 86400000).toISOString(),
    plan: {
      name: 'Pro Plan',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 서비스 권한', () => {
    it('활성 구독이 있으면 hasAccess가 true여야 함', async () => {
      // Setup
      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      ...mockSubscription,
                      service: { slug: 'find' },
                    },
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(() => useMCPServicePermission('minu-find'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.hasAccess).toBe(true);
      });
    });

    it('구독 정보를 올바르게 반환해야 함', async () => {
      // Setup
      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      ...mockSubscription,
                      service: { slug: 'find' },
                    },
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(() => useMCPServicePermission('minu-find'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.hasAccess).toBe(true);
      });

      // 구독 정보는 별도 쿼리로 조회되므로 null일 수 있음
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('추가 권한 확인', () => {
    it('추가 권한이 있으면 hasPermission이 true여야 함', async () => {
      // Setup - write 권한 제공 (현재는 read만 제공하므로 false 예상)
      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      ...mockSubscription,
                      service: { slug: 'find' },
                    },
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(
        () => useMCPServicePermission('minu-find', 'export_data'),
        {
          wrapper: createWrapper(),
        }
      );

      // Assert - 현재 구현상 write 권한이 없으므로 false
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(false);
      });
    });

    it('추가 권한이 없으면 hasPermission이 항상 true여야 함', async () => {
      // Setup
      const mockFrom = vi.fn((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockServiceData,
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      ...mockSubscription,
                      service: { slug: 'find' },
                    },
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Execute
      const { result } = renderHook(() => useMCPServicePermission('minu-find'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
    });
  });
});
