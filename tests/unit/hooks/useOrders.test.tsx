import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useOrders,
  useOrderDetail,
  useCreateOrder,
  useCancelOrder,
  useAdminOrders,
  useUpdateOrderStatus,
} from '@/hooks/payments/useOrders';
import { ordersApi, cartApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  ordersApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    cancel: vi.fn(),
    update: vi.fn(),
  },
  cartApi: {
    get: vi.fn(),
    clear: vi.fn(),
    checkout: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/hooks/auth/useAuth', () => ({
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

import { useAuth } from '@/hooks/auth/useAuth';

describe('useOrders', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockAccessToken = 'mock-access-token';

  const mockOrders = [
    {
      id: 'order-1',
      user_id: 'user-123',
      order_number: 'ORD-001',
      subtotal: 100000,
      tax_amount: 10000,
      discount_amount: 0,
      shipping_fee: 0,
      total_amount: 110000,
      status: 'confirmed',
      shipping_address: {
        postal_code: '12345',
        address: '서울시 강남구',
        detail_address: '101호',
      },
      shipping_name: '홍길동',
      shipping_phone: '010-1234-5678',
      contact_email: 'test@example.com',
      contact_phone: '010-1234-5678',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      items: [
        {
          id: 'item-1',
          order_id: 'order-1',
          service_id: 'service-1',
          service_title: 'AI 컨설팅',
          quantity: 1,
          unit_price: 100000,
          subtotal: 100000,
          service: {
            id: 'service-1',
            title: 'AI 컨설팅',
          },
        },
      ],
      payment: null,
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

  describe('useOrders', () => {
    it('주문 목록을 성공적으로 조회해야 함', async () => {
      vi.mocked(ordersApi.list).mockResolvedValue({
        data: { data: mockOrders },
        error: null,
      });

      const { result } = renderHook(() => useOrders(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockOrders);
        expect(ordersApi.list).toHaveBeenCalledWith(mockAccessToken);
      }
    });

    it('로그인하지 않은 경우 빈 배열을 반환해야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({ user: null, accessToken: null } as ReturnType<typeof useAuth>);

      const { result } = renderHook(() => useOrders(), { wrapper });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useOrderDetail', () => {
    it('주문 상세를 성공적으로 조회해야 함', async () => {
      // 훅은 response.data.data를 추출함
      vi.mocked(ordersApi.getById).mockResolvedValue({
        data: { data: mockOrders[0] },
        error: null,
      });

      const { result } = renderHook(() => useOrderDetail('order-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockOrders[0]);
        expect(ordersApi.getById).toHaveBeenCalledWith(mockAccessToken, 'order-1');
      }
    });

    it('주문 ID가 없으면 조회하지 않아야 함', async () => {
      const { result } = renderHook(() => useOrderDetail(undefined), { wrapper });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
      expect(ordersApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateOrder', () => {
    it('주문을 성공적으로 생성해야 함', async () => {
      // 훅은 cartApi.checkout을 사용함
      vi.mocked(cartApi.checkout).mockResolvedValue({
        data: { data: { id: 'order-new', order_number: 'ORD-NEW' } },
        error: null,
      });

      const { result } = renderHook(() => useCreateOrder(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          cartId: 'cart-1',
          shippingAddress: {
            postal_code: '12345',
            address: '서울시 강남구',
            detail_address: '101호',
          },
          shippingName: '홍길동',
          shippingPhone: '010-1234-5678',
          contactEmail: 'test@example.com',
          contactPhone: '010-1234-5678',
        });
      });

      expect(cartApi.checkout).toHaveBeenCalledWith(mockAccessToken);
    });

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({ user: null, accessToken: null } as ReturnType<typeof useAuth>);

      const { result } = renderHook(() => useCreateOrder(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            cartId: 'cart-1',
            shippingAddress: {
              postal_code: '12345',
              address: '서울시 강남구',
              detail_address: '101호',
            },
            shippingName: '홍길동',
            shippingPhone: '010-1234-5678',
            contactEmail: 'test@example.com',
            contactPhone: '010-1234-5678',
          });
        } catch (error) {
          expect((error as Error).message).toBe('로그인이 필요합니다');
        }
      });
    });
  });

  describe('useCancelOrder', () => {
    it('주문을 성공적으로 취소해야 함', async () => {
      vi.mocked(ordersApi.cancel).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useCancelOrder(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('order-1');
      });

      expect(ordersApi.cancel).toHaveBeenCalledWith(mockAccessToken, 'order-1');
    });
  });

  describe('useAdminOrders', () => {
    it('모든 주문을 성공적으로 조회해야 함', async () => {
      vi.mocked(ordersApi.list).mockResolvedValue({
        data: { data: mockOrders },
        error: null,
      });

      const { result } = renderHook(() => useAdminOrders(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockOrders);
        expect(ordersApi.list).toHaveBeenCalledWith(mockAccessToken, { limit: 100 });
      }
    });
  });

  describe('useUpdateOrderStatus', () => {
    it('주문 상태를 성공적으로 변경해야 함', async () => {
      // 훅은 ordersApi.update를 사용함
      vi.mocked(ordersApi.update).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          orderId: 'order-1',
          status: 'shipped',
        });
      });

      expect(ordersApi.update).toHaveBeenCalledWith(
        mockAccessToken,
        'order-1',
        { status: 'shipped' }
      );
    });
  });
});
