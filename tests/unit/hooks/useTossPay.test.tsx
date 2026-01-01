/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTossPay } from '@/hooks/payments/useTossPay';
import { paymentsApi, ordersApi } from '@/integrations/cloudflare/client';
import * as tossPaymentsLib from '@/lib/payments/toss-payments';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  paymentsApi: {
    confirm: vi.fn(),
    cancel: vi.fn(),
  },
  ordersApi: {
    updateStatus: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(),
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

import { useAuth } from '@/hooks/auth/useAuth';

describe('useTossPay', () => {
  const mockWorkersUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockWorkersTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
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
    vi.mocked(useAuth).mockReturnValue({
      workersUser: mockWorkersUser,
      workersTokens: mockWorkersTokens,
    } as ReturnType<typeof useAuth>);
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
        customerEmail: mockWorkersUser.email,
        successUrl: 'http://localhost/success',
        failUrl: 'http://localhost/fail',
      });
    });

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({
        workersUser: null,
        workersTokens: null,
      } as ReturnType<typeof useAuth>);

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.initiateTossPay('order-1', 'ORD-001', 10000, '테스트 주문');
        } catch (e) {
          error = e as Error;
        }
      });

      // Assert
      expect(error).toBeDefined();
      expect(error?.message).toBe('로그인이 필요합니다.');
    });

    it('Toss Payments API 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(tossPaymentsLib.getTossPaymentRedirectUrls).mockReturnValue({
        successUrl: 'http://localhost/success',
        failUrl: 'http://localhost/fail',
      });

      vi.mocked(tossPaymentsLib.requestTossPayment).mockRejectedValue(
        new Error('Toss Payments API 오류')
      );

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.initiateTossPay('order-1', 'ORD-001', 10000, '테스트 주문');
        } catch (e) {
          error = e as Error;
        }
      });

      // Assert
      expect(error).toBeDefined();
      expect(error?.message).toBe('Toss Payments API 오류');
    });
  });

  describe('confirmTossPay - 결제 승인', () => {
    it('결제 승인 시 Workers API를 호출하고 결과를 반환해야 함', async () => {
      // Setup - Workers API confirm 응답
      vi.mocked(paymentsApi.confirm).mockResolvedValue({
        data: {
          success: true,
          payment: {
            paymentKey: 'payment-key-123',
            totalAmount: 10000,
            approvedAt: '2024-01-01T01:00:00Z',
          },
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.confirmTossPay('order-1', 'payment-key-123', 10000);
      });

      // Assert - Workers API 호출 확인
      expect(paymentsApi.confirm).toHaveBeenCalledWith(mockWorkersTokens.accessToken, {
        paymentKey: 'payment-key-123',
        orderId: 'order-1',
        amount: 10000,
      });

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

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({
        workersUser: mockWorkersUser,
        workersTokens: null,
      } as ReturnType<typeof useAuth>);

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.confirmTossPay('order-1', 'payment-key-123', 10000);
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).toBeDefined();
      expect(error?.message).toBe('로그인이 필요합니다.');
    });

    it('결제 승인 실패 시 주문 상태를 cancelled로 업데이트해야 함', async () => {
      // Setup
      vi.mocked(paymentsApi.confirm).mockResolvedValue({
        data: null,
        error: '승인 실패',
        status: 400,
      });

      vi.mocked(ordersApi.updateStatus).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.confirmTossPay('order-1', 'payment-key-123', 10000);
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).toBeDefined();
      expect(error?.message).toBe('승인 실패');

      // Assert - 주문 상태 업데이트 확인
      await waitFor(() => {
        expect(ordersApi.updateStatus).toHaveBeenCalledWith(
          mockWorkersTokens.accessToken,
          'order-1',
          'cancelled'
        );
      });
    });

    it('Workers API 에러 응답을 처리해야 함', async () => {
      // Setup
      vi.mocked(paymentsApi.confirm).mockResolvedValue({
        data: null,
        error: '결제 승인 중 오류 발생',
        status: 500,
      });

      vi.mocked(ordersApi.updateStatus).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.confirmTossPay('order-1', 'payment-key-123', 10000);
        } catch (e) {
          error = e as Error;
        }
      });

      // Assert
      expect(error).toBeDefined();
      expect(error?.message).toBe('결제 승인 중 오류 발생');
    });
  });

  describe('cancelTossPay - 결제 취소', () => {
    it('결제 전액 취소를 성공적으로 처리해야 함', async () => {
      // Setup
      vi.mocked(paymentsApi.cancel).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      await act(async () => {
        await result.current.cancelTossPay('payment-key-123', '고객 요청');
      });

      // Assert
      expect(paymentsApi.cancel).toHaveBeenCalledWith(mockWorkersTokens.accessToken, {
        paymentKey: 'payment-key-123',
        cancelReason: '고객 요청',
        cancelAmount: undefined,
      });
      expect(result.current.error).toBeNull();
    });

    it('결제 부분 취소를 성공적으로 처리해야 함', async () => {
      // Setup
      vi.mocked(paymentsApi.cancel).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      await act(async () => {
        await result.current.cancelTossPay('payment-key-123', '부분 환불', 5000);
      });

      // Assert
      expect(paymentsApi.cancel).toHaveBeenCalledWith(mockWorkersTokens.accessToken, {
        paymentKey: 'payment-key-123',
        cancelReason: '부분 환불',
        cancelAmount: 5000,
      });
      expect(result.current.error).toBeNull();
    });

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      // Setup
      vi.mocked(useAuth).mockReturnValue({
        workersUser: null,
        workersTokens: null,
      } as ReturnType<typeof useAuth>);

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.cancelTossPay('payment-key-123', '고객 요청');
        } catch (e) {
          error = e as Error;
        }
      });

      // Assert
      expect(error).toBeDefined();
      expect(error?.message).toBe('로그인이 필요합니다.');
    });

    it('결제 취소 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(paymentsApi.cancel).mockResolvedValue({
        data: null,
        error: '취소 실패',
        status: 400,
      });

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.cancelTossPay('payment-key-123', '고객 요청');
        } catch (e) {
          error = e as Error;
        }
      });

      // Assert
      expect(error).toBeDefined();
      expect(error?.message).toBe('취소 실패');
    });
  });

  describe('clearError', () => {
    it('clearError 메서드가 존재해야 함', () => {
      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      // Assert
      expect(typeof result.current.clearError).toBe('function');
    });

    it('clearError 호출 시 에러가 초기화되어야 함', () => {
      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      // clearError 호출
      act(() => {
        result.current.clearError();
      });

      // Assert - 에러가 null이어야 함
      expect(result.current.error).toBeNull();
    });
  });

  describe('로딩 상태', () => {
    it('결제 시작 완료 후 isProcessing이 false여야 함', async () => {
      // Setup
      vi.mocked(tossPaymentsLib.getTossPaymentRedirectUrls).mockReturnValue({
        successUrl: 'http://localhost/success',
        failUrl: 'http://localhost/fail',
      });

      vi.mocked(tossPaymentsLib.requestTossPayment).mockResolvedValue(undefined as any);

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      // 초기 상태 확인
      expect(result.current.isProcessing).toBe(false);

      // 결제 시작
      await act(async () => {
        await result.current.initiateTossPay('order-1', 'ORD-001', 10000, '테스트 주문');
      });

      // Assert - 처리 완료 후 false
      expect(result.current.isProcessing).toBe(false);
    });

    it('결제 취소 완료 후 isProcessing이 false여야 함', async () => {
      // Setup
      vi.mocked(paymentsApi.cancel).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useTossPay(), { wrapper });

      // 초기 상태 확인
      expect(result.current.isProcessing).toBe(false);

      // 결제 취소
      await act(async () => {
        await result.current.cancelTossPay('payment-key-123', '고객 요청');
      });

      // Assert - 처리 완료 후 false
      expect(result.current.isProcessing).toBe(false);
    });
  });
});
