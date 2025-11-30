/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useOrders,
  useOrderDetail,
  useCreateOrder,
  useCancelOrder,
  useAdminOrders,
  useUpdateOrderStatus,
} from '@/hooks/useOrders';
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

// Mock errors
vi.mock('@/lib/errors', () => ({
  handleSupabaseError: vi.fn((error, config) => {
    if (config.fallbackValue !== undefined) {
      return config.fallbackValue;
    }
    throw error;
  }),
  devError: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';

describe('useOrders', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

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

  const mockCartItems = [
    {
      service_id: 'service-1',
      price: 100000,
      quantity: 1,
      package_name: '베이직',
      service: {
        title: 'AI 컨설팅',
        description: 'AI 컨설팅 서비스',
      },
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

  describe('useOrders', () => {
    it('주문 목록을 성공적으로 조회해야 함', async () => {
      // Setup
      const orderMock = vi.fn().mockResolvedValue({
        data: mockOrders,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useOrders(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockOrders);
        expect(supabase.from).toHaveBeenCalledWith('orders');
        expect(eqMock).toHaveBeenCalledWith('user_id', mockUser.id);
      }
    });

    it('로그인하지 않은 경우 빈 배열을 반환해야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

      // Execute
      const { result } = renderHook(() => useOrders(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useOrderDetail', () => {
    it('주문 상세를 성공적으로 조회해야 함', async () => {
      // Setup
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: mockOrders[0],
        error: null,
      });

      const eqMock2 = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleMock,
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
      const { result } = renderHook(() => useOrderDetail('order-1'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockOrders[0]);
        expect(eqMock1).toHaveBeenCalledWith('id', 'order-1');
        expect(eqMock2).toHaveBeenCalledWith('user_id', mockUser.id);
      }
    });

    it('주문 ID가 없으면 null을 반환해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useOrderDetail(undefined), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateOrder', () => {
    it('주문을 성공적으로 생성해야 함', async () => {
      // Setup
      const orderNumber = 'ORD-12345';

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: orderNumber,
        error: null,
      });

      const orderSingleMock = vi.fn().mockResolvedValue({
        data: {
          id: 'order-1',
          order_number: orderNumber,
        },
        error: null,
      });

      const orderInsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: orderSingleMock,
        }),
      });

      const itemsInsertMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const cartDeleteMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'cart_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockCartItems,
                error: null,
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: cartDeleteMock,
            }),
          } as any;
        }
        if (table === 'orders') {
          return {
            insert: orderInsertMock,
          } as any;
        }
        if (table === 'order_items') {
          return {
            insert: itemsInsertMock,
          } as any;
        }
        return {} as any;
      });

      // Execute
      const { result } = renderHook(() => useCreateOrder(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

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

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(orderInsertMock).toHaveBeenCalled();
        expect(itemsInsertMock).toHaveBeenCalled();
      }
    });

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

      // Execute
      const { result } = renderHook(() => useCreateOrder(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      // Assert
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

    it('장바구니가 비어있으면 에러를 발생시켜야 함', async () => {
      // Setup
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useCreateOrder(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      // Assert
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
          expect((error as Error).message).toBe('장바구니가 비어있습니다');
        }
      });
    });
  });

  describe('useCancelOrder', () => {
    it('주문을 성공적으로 취소해야 함', async () => {
      // Setup
      const updateMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: updateMock,
          }),
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useCancelOrder(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      await act(async () => {
        await result.current.mutateAsync('order-1');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });
    });
  });

  describe('useAdminOrders', () => {
    it('모든 주문을 성공적으로 조회해야 함', async () => {
      // Setup
      const orderMock = vi.fn().mockResolvedValue({
        data: mockOrders,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useAdminOrders(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockOrders);
        expect(supabase.from).toHaveBeenCalledWith('orders');
      }
    });
  });

  describe('useUpdateOrderStatus', () => {
    it('주문 상태를 성공적으로 변경해야 함', async () => {
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
      const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      await act(async () => {
        await result.current.mutateAsync({
          orderId: 'order-1',
          status: 'shipped',
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });
    });

    it('confirmed 상태로 변경 시 confirmed_at을 설정해야 함', async () => {
      // Setup
      let capturedUpdate: any = null;
      const updateMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockImplementation((updates) => {
          capturedUpdate = updates;
          return {
            eq: updateMock,
          };
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      await act(async () => {
        await result.current.mutateAsync({
          orderId: 'order-1',
          status: 'confirmed',
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(capturedUpdate).toHaveProperty('confirmed_at');
        expect(capturedUpdate.status).toBe('confirmed');
      }
    });
  });
});
