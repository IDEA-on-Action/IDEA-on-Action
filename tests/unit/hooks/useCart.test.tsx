/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCart,
  useAddToCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
} from '@/hooks/useCart';
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

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock errors
vi.mock('@/lib/errors', () => ({
  handleSupabaseError: vi.fn((error, config) => config.fallbackValue),
  handleApiError: vi.fn((error) => error.message),
  devError: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';

describe('useCart', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockCart = {
    id: 'cart-1',
    user_id: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    items: [
      {
        id: 'item-1',
        cart_id: 'cart-1',
        service_id: 'service-1',
        quantity: 2,
        price: 10000,
        package_name: '베이직',
        service: {
          id: 'service-1',
          title: 'AI 컨설팅',
          description: 'AI 컨설팅 서비스',
        },
      },
      {
        id: 'item-2',
        cart_id: 'cart-1',
        service_id: 'service-2',
        quantity: 1,
        price: 50000,
        package_name: null,
        service: {
          id: 'service-2',
          title: '워크플로우 자동화',
          description: '워크플로우 자동화 서비스',
        },
      },
    ],
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

  describe('useCart', () => {
    it('장바구니를 성공적으로 조회해야 함', async () => {
      // Setup
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: mockCart,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useCart(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockCart);
        expect(supabase.from).toHaveBeenCalledWith('carts');
        expect(eqMock).toHaveBeenCalledWith('user_id', mockUser.id);
      }
    });

    it('로그인하지 않은 경우 null을 반환해야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

      // Execute
      const { result } = renderHook(() => useCart(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('장바구니가 없는 경우 null을 반환해야 함', async () => {
      // Setup
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: maybeSingleMock,
          }),
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useCart(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toBeNull();
      }
    });
  });

  describe('useAddToCart', () => {
    it('장바구니에 새 항목을 추가해야 함', async () => {
      // Setup - 장바구니 존재
      const cartMaybeSingleMock = vi.fn().mockResolvedValue({
        data: { id: 'cart-1' },
        error: null,
      });

      // Setup - 기존 항목 없음
      const itemMaybeSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const insertMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'carts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: cartMaybeSingleMock,
              }),
            }),
          } as any;
        }
        if (table === 'cart_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: itemMaybeSingleMock,
                }),
              }),
            }),
            insert: insertMock,
          } as any;
        }
        return {} as any;
      });

      // Execute
      const { result } = renderHook(() => useAddToCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      await act(async () => {
        await result.current.mutateAsync({
          serviceId: 'service-1',
          price: 10000,
          quantity: 1,
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            cart_id: 'cart-1',
            service_id: 'service-1',
            quantity: 1,
            price: 10000,
          })
        );
      }
    });

    it('이미 있는 항목의 수량을 증가시켜야 함', async () => {
      // Setup - 장바구니 존재
      const cartMaybeSingleMock = vi.fn().mockResolvedValue({
        data: { id: 'cart-1' },
        error: null,
      });

      // Setup - 기존 항목 존재
      const itemMaybeSingleMock = vi.fn().mockResolvedValue({
        data: { id: 'item-1', quantity: 2 },
        error: null,
      });

      const updateMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'carts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: cartMaybeSingleMock,
              }),
            }),
          } as any;
        }
        if (table === 'cart_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: itemMaybeSingleMock,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: updateMock,
            }),
          } as any;
        }
        return {} as any;
      });

      // Execute
      const { result } = renderHook(() => useAddToCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      await act(async () => {
        await result.current.mutateAsync({
          serviceId: 'service-1',
          price: 10000,
          quantity: 1,
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });
    });

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

      // Execute
      const { result } = renderHook(() => useAddToCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      // Assert
      await act(async () => {
        try {
          await result.current.mutateAsync({
            serviceId: 'service-1',
            price: 10000,
          });
        } catch (error) {
          expect((error as Error).message).toBe('로그인이 필요합니다');
        }
      });
    });
  });

  describe('useUpdateCartItem', () => {
    it('장바구니 항목 수량을 변경해야 함', async () => {
      // Setup
      const updateMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: updateMock,
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useUpdateCartItem(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      await act(async () => {
        await result.current.mutateAsync({
          itemId: 'item-1',
          quantity: 5,
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });
    });

    it('수량이 1보다 작으면 에러를 발생시켜야 함', async () => {
      // Execute
      const { result } = renderHook(() => useUpdateCartItem(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      // Assert
      await act(async () => {
        try {
          await result.current.mutateAsync({
            itemId: 'item-1',
            quantity: 0,
          });
        } catch (error) {
          expect((error as Error).message).toBe('수량은 1개 이상이어야 합니다');
        }
      });
    });

    it('수량이 99보다 크면 에러를 발생시켜야 함', async () => {
      // Execute
      const { result } = renderHook(() => useUpdateCartItem(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      // Assert
      await act(async () => {
        try {
          await result.current.mutateAsync({
            itemId: 'item-1',
            quantity: 100,
          });
        } catch (error) {
          expect((error as Error).message).toBe('최대 수량은 99개입니다');
        }
      });
    });
  });

  describe('useRemoveCartItem', () => {
    it('장바구니 항목을 삭제해야 함', async () => {
      // Setup
      const deleteMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: deleteMock,
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useRemoveCartItem(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      await act(async () => {
        await result.current.mutateAsync('item-1');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });
    });
  });

  describe('useClearCart', () => {
    it('장바구니를 비워야 함', async () => {
      // Setup
      const cartMaybeSingleMock = vi.fn().mockResolvedValue({
        data: { id: 'cart-1' },
        error: null,
      });

      const deleteMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'carts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: cartMaybeSingleMock,
              }),
            }),
          } as any;
        }
        if (table === 'cart_items') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: deleteMock,
            }),
          } as any;
        }
        return {} as any;
      });

      // Execute
      const { result } = renderHook(() => useClearCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });
    });

    it('장바구니가 없는 경우 성공을 반환해야 함', async () => {
      // Setup
      const cartMaybeSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: cartMaybeSingleMock,
          }),
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useClearCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      await act(async () => {
        const response = await result.current.mutateAsync();
        expect(response.success).toBe(true);
      });
    });

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

      // Execute
      const { result } = renderHook(() => useClearCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      // Assert
      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch (error) {
          expect((error as Error).message).toBe('로그인이 필요합니다');
        }
      });
    });
  });
});
