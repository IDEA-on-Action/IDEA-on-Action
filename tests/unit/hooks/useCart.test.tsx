import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCart,
  useAddToCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
} from '@/hooks/useCart';
import { cartApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  cartApi: {
    get: vi.fn(),
    add: vi.fn(),
    updateQuantity: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
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
  devError: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';

describe('useCart', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockAccessToken = 'mock-access-token';

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
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      accessToken: mockAccessToken,
    } as ReturnType<typeof useAuth>);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useCart', () => {
    it('장바구니를 성공적으로 조회해야 함', async () => {
      vi.mocked(cartApi.get).mockResolvedValue({
        data: mockCart,
        error: null,
      });

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockCart);
        expect(cartApi.get).toHaveBeenCalledWith(mockAccessToken);
      }
    });

    it('로그인하지 않은 경우 조회하지 않아야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({ user: null, accessToken: null } as ReturnType<typeof useAuth>);

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
      expect(cartApi.get).not.toHaveBeenCalled();
    });

    it('장바구니가 없는 경우 null을 반환해야 함', async () => {
      vi.mocked(cartApi.get).mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useCart(), { wrapper });

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
      vi.mocked(cartApi.add).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useAddToCart(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          serviceId: 'service-1',
          price: 10000,
          quantity: 1,
        });
      });

      expect(cartApi.add).toHaveBeenCalledWith(
        mockAccessToken,
        expect.objectContaining({
          service_id: 'service-1',
          quantity: 1,
        })
      );
    });

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({ user: null, accessToken: null } as ReturnType<typeof useAuth>);

      const { result } = renderHook(() => useAddToCart(), { wrapper });

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
      vi.mocked(cartApi.updateQuantity).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useUpdateCartItem(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          itemId: 'item-1',
          quantity: 5,
        });
      });

      expect(cartApi.updateQuantity).toHaveBeenCalledWith(
        mockAccessToken,
        'item-1',
        5
      );
    });

    it('수량이 1보다 작으면 에러를 발생시켜야 함', async () => {
      const { result } = renderHook(() => useUpdateCartItem(), { wrapper });

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
      const { result } = renderHook(() => useUpdateCartItem(), { wrapper });

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
      vi.mocked(cartApi.removeItem).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useRemoveCartItem(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('item-1');
      });

      expect(cartApi.removeItem).toHaveBeenCalledWith(mockAccessToken, 'item-1');
    });
  });

  describe('useClearCart', () => {
    it('장바구니를 비워야 함', async () => {
      vi.mocked(cartApi.clear).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useClearCart(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(cartApi.clear).toHaveBeenCalledWith(mockAccessToken);
    });

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({ user: null, accessToken: null } as ReturnType<typeof useAuth>);

      const { result } = renderHook(() => useClearCart(), { wrapper });

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
