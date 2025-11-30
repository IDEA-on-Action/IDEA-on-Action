/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTossPay } from '@/hooks/payments/useTossPay';
import { supabase } from '@/integrations/supabase/client';
import * as tossPaymentsLib from '@/lib/payments/toss-payments';
import React, { type ReactNode } from 'react';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock toss-payments library
vi.mock('@/lib/payments/toss-payments', () => ({
  requestTossPayment: vi.fn(),
  confirmTossPayment: vi.fn(),
  cancelTossPayment: vi.fn(),
  getTossPaymentRedirectUrls: vi.fn(),
}));

// Mock devError
vi.mock('@/lib/errors', () => ({
  devError: vi.fn(),
}));

describe('useTossPay', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockOrder = {
    id: 'order-1',
    order_number: 'ORD-001',
    amount: 10000,
  };

  const mockTossConfirmResponse = {
    paymentKey: 'payment-key-123',
    orderId: 'ORD-001',
    status: 'DONE',
    totalAmount: 10000,
    method: 'card',
    card: {
      cardType: 'CREDIT',
      number: '1234****',
      company: '신한카드',
      approvedNo: 'APPROVE-123',
    },
    approvedAt: '2024-01-01T01:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

  describe('초기 상태', () => {
    it('초기 상태는 처리 중이 아니고 에러가 없어야 함', () => {
      const { result } = renderHook(() => useTossPay(), { wrapper });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.initiateTossPay).toBeDefined();
      expect(result.current.confirmTossPay).toBeDefined();
      expect(result.current.cancelTossPay).toBeDefined();
      expect(result.current.clearError).toBeDefined();
    });
  });

  describe('initiateTossPay - 결제 시작', () => {
    it('결제 시작 시 Toss Payments 요청 API를 호출해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(tossPaymentsLib.getTossPaymentRedirectUrls).mockReturnValue({
        successUrl: 'http://localhost/success',
        failUrl: 'http://localhost/fail',
      });

      vi.mocked(tossPaymentsLib.requestTossPayment).mockResolvedValue(undefined as any);

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      await act(async () => {
        await result.current.initiateTossPay('order-1', 'ORD-001', 10000, '테스트 주문');
      });

      // Assert
      expect(tossPaymentsLib.requestTossPayment).toHaveBeenCalledWith({
        orderId: 'ORD-001',
        orderName: '테스트 주문',
        amount: 10000,
        customerEmail: mockUser.email,
        successUrl: 'http://localhost/success',
        failUrl: 'http://localhost/fail',
      });
    });

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      await expect(
        act(async () => {
          await result.current.initiateTossPay('order-1', 'ORD-001', 10000, '테스트 주문');
        })
      ).rejects.toThrow('로그인이 필요합니다.');

      // Assert
      expect(result.current.error).toEqual({
        provider: 'toss',
        code: 'INITIATE_FAILED',
        message: '로그인이 필요합니다.',
        orderId: 'order-1',
      });
    });

    it('Toss Payments API 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(tossPaymentsLib.getTossPaymentRedirectUrls).mockReturnValue({
        successUrl: 'http://localhost/success',
        failUrl: 'http://localhost/fail',
      });

      vi.mocked(tossPaymentsLib.requestTossPayment).mockRejectedValue(
        new Error('Toss Payments API 오류')
      );

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      await expect(
        act(async () => {
          await result.current.initiateTossPay('order-1', 'ORD-001', 10000, '테스트 주문');
        })
      ).rejects.toThrow('Toss Payments API 오류');

      // Assert
      expect(result.current.error).toEqual({
        provider: 'toss',
        code: 'INITIATE_FAILED',
        message: 'Toss Payments API 오류',
        orderId: 'order-1',
      });
    });
  });

  describe('confirmTossPay - 결제 승인', () => {
    it('결제 승인 시 Toss Payments 승인 API를 호출하고 DB에 저장해야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      const insertMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const orderUpdateEqMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: orderUpdateEqMock,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: selectMock,
            update: updateMock,
          } as any;
        }
        if (table === 'payments') {
          return {
            insert: insertMock,
          } as any;
        }
        return {} as any;
      });

      vi.mocked(tossPaymentsLib.confirmTossPayment).mockResolvedValue(
        mockTossConfirmResponse as any
      );

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.confirmTossPay('order-1', 'payment-key-123', 10000);
      });

      // Assert - Toss Payments 승인 호출
      expect(tossPaymentsLib.confirmTossPayment).toHaveBeenCalledWith({
        paymentKey: 'payment-key-123',
        orderId: 'ORD-001',
        amount: 10000,
      });

      // Assert - payments 테이블 삽입
      expect(insertMock).toHaveBeenCalledWith({
        order_id: 'order-1',
        amount: 10000,
        status: 'completed',
        provider: 'toss',
        provider_transaction_id: 'payment-key-123',
        payment_method: 'card',
        card_info: {
          cardType: 'CREDIT',
          cardNumber: '1234****',
          issuer: '신한카드',
          approveNo: 'APPROVE-123',
        },
        metadata: mockTossConfirmResponse,
        paid_at: '2024-01-01T01:00:00Z',
      });

      // Assert - orders 테이블 업데이트
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed',
        })
      );

      // Assert - 반환값 확인
      expect(paymentResult).toEqual({
        success: true,
        provider: 'toss',
        transactionId: 'payment-key-123',
        orderId: 'order-1',
        amount: 10000,
        paidAt: '2024-01-01T01:00:00Z',
      });
    });

    it('주문 정보를 찾을 수 없으면 에러를 발생시켜야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      await expect(
        act(async () => {
          await result.current.confirmTossPay('order-1', 'payment-key-123', 10000);
        })
      ).rejects.toThrow('주문 정보를 찾을 수 없습니다.');
    });

    it('결제 승인 실패 시 주문 상태를 cancelled로 업데이트해야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      const orderUpdateEqMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: orderUpdateEqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
        update: updateMock,
      } as any);

      vi.mocked(tossPaymentsLib.confirmTossPayment).mockRejectedValue(
        new Error('승인 실패')
      );

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      await expect(
        act(async () => {
          await result.current.confirmTossPay('order-1', 'payment-key-123', 10000);
        })
      ).rejects.toThrow('승인 실패');

      // Assert - 주문 상태 업데이트
      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith({ status: 'cancelled' });
      });
    });

    it('카드 정보가 없는 경우에도 정상 처리되어야 함', async () => {
      // Setup
      const responseWithoutCard = {
        ...mockTossConfirmResponse,
        card: null,
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleMock,
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any;
        }
        if (table === 'payments') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as any;
        }
        return {} as any;
      });

      vi.mocked(tossPaymentsLib.confirmTossPayment).mockResolvedValue(
        responseWithoutCard as any
      );

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.confirmTossPay('order-1', 'payment-key-123', 10000);
      });

      // Assert
      expect(paymentResult).toEqual({
        success: true,
        provider: 'toss',
        transactionId: 'payment-key-123',
        orderId: 'order-1',
        amount: 10000,
        paidAt: '2024-01-01T01:00:00Z',
      });
    });
  });

  describe('cancelTossPay - 결제 취소', () => {
    it('결제 전액 취소를 성공적으로 처리해야 함', async () => {
      // Setup
      vi.mocked(tossPaymentsLib.cancelTossPayment).mockResolvedValue(undefined as any);

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      await act(async () => {
        await result.current.cancelTossPay('payment-key-123', '고객 요청');
      });

      // Assert
      expect(tossPaymentsLib.cancelTossPayment).toHaveBeenCalledWith({
        paymentKey: 'payment-key-123',
        cancelReason: '고객 요청',
        cancelAmount: undefined,
      });
      expect(result.current.error).toBeNull();
    });

    it('결제 부분 취소를 성공적으로 처리해야 함', async () => {
      // Setup
      vi.mocked(tossPaymentsLib.cancelTossPayment).mockResolvedValue(undefined as any);

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      await act(async () => {
        await result.current.cancelTossPay('payment-key-123', '부분 환불', 5000);
      });

      // Assert
      expect(tossPaymentsLib.cancelTossPayment).toHaveBeenCalledWith({
        paymentKey: 'payment-key-123',
        cancelReason: '부분 환불',
        cancelAmount: 5000,
      });
      expect(result.current.error).toBeNull();
    });

    it('결제 취소 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(tossPaymentsLib.cancelTossPayment).mockRejectedValue(
        new Error('취소 실패')
      );

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelTossPay('payment-key-123', '고객 요청');
        })
      ).rejects.toThrow('취소 실패');

      // Assert
      expect(result.current.error).toEqual({
        provider: 'toss',
        code: 'CANCEL_FAILED',
        message: '취소 실패',
      });
    });
  });

  describe('clearError', () => {
    it('에러를 초기화해야 함', async () => {
      // Setup - 에러 상태 만들기
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useTossPay(), { wrapper });

      // 에러 발생
      await expect(
        act(async () => {
          await result.current.initiateTossPay('order-1', 'ORD-001', 10000, '테스트 주문');
        })
      ).rejects.toThrow();

      expect(result.current.error).not.toBeNull();

      // Execute - 에러 초기화
      act(() => {
        result.current.clearError();
      });

      // Assert
      expect(result.current.error).toBeNull();
    });
  });

  describe('로딩 상태', () => {
    it('결제 시작 중 isProcessing이 true여야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(tossPaymentsLib.getTossPaymentRedirectUrls).mockReturnValue({
        successUrl: 'http://localhost/success',
        failUrl: 'http://localhost/fail',
      });

      let resolvePayment: any;
      const paymentPromise = new Promise((resolve) => {
        resolvePayment = resolve;
      });

      vi.mocked(tossPaymentsLib.requestTossPayment).mockReturnValue(paymentPromise as any);

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      const initiatePromise = act(async () => {
        await result.current.initiateTossPay('order-1', 'ORD-001', 10000, '테스트 주문');
      });

      // Assert - 처리 중
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true);
      });

      // Resolve payment
      resolvePayment(undefined);
      await initiatePromise;

      // Assert - 처리 완료
      expect(result.current.isProcessing).toBe(false);
    });

    it('결제 취소 중 isProcessing이 true여야 함', async () => {
      // Setup
      let resolveCancel: any;
      const cancelPromise = new Promise((resolve) => {
        resolveCancel = resolve;
      });

      vi.mocked(tossPaymentsLib.cancelTossPayment).mockReturnValue(cancelPromise as any);

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      const cancelTossPromise = act(async () => {
        await result.current.cancelTossPay('payment-key-123', '고객 요청');
      });

      // Assert - 처리 중
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true);
      });

      // Resolve cancel
      resolveCancel(undefined);
      await cancelTossPromise;

      // Assert - 처리 완료
      expect(result.current.isProcessing).toBe(false);
    });
  });
});
