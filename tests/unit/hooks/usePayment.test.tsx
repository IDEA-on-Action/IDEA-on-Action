/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePayment } from '@/hooks/usePayment';
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

// Mock useKakaoPay
vi.mock('@/hooks/payments/useKakaoPay', () => ({
  useKakaoPay: vi.fn(),
}));

// Mock useTossPay
vi.mock('@/hooks/payments/useTossPay', () => ({
  useTossPay: vi.fn(),
}));

// Mock payments library functions
vi.mock('@/lib/payments/kakao-pay', () => ({
  prepareKakaoPayment: vi.fn(),
  approveKakaoPayment: vi.fn(),
  cancelKakaoPayment: vi.fn(),
  getKakaoPayRedirectUrls: vi.fn(() => ({
    approval_url: 'http://localhost/success',
    cancel_url: 'http://localhost/cancel',
    fail_url: 'http://localhost/fail',
  })),
}));

vi.mock('@/lib/payments/toss-payments', () => ({
  requestTossPayment: vi.fn(),
  confirmTossPayment: vi.fn(),
  cancelTossPayment: vi.fn(),
  getTossPaymentRedirectUrls: vi.fn(() => ({
    successUrl: 'http://localhost/success',
    failUrl: 'http://localhost/fail',
  })),
}));

// Mock devError
vi.mock('@/lib/errors', () => ({
  devError: vi.fn(),
}));

import { useKakaoPay } from '@/hooks/payments/useKakaoPay';
import { useTossPay } from '@/hooks/payments/useTossPay';

describe('usePayment', () => {
  const mockKakaoPayReturn = {
    isProcessing: false,
    error: null,
    initiateKakaoPay: vi.fn(),
    approveKakaoPay: vi.fn(),
    cancelKakaoPay: vi.fn(),
    clearError: vi.fn(),
  };

  const mockTossPayReturn = {
    isProcessing: false,
    error: null,
    initiateTossPay: vi.fn(),
    confirmTossPay: vi.fn(),
    cancelTossPay: vi.fn(),
    clearError: vi.fn(),
  };

  const mockPaymentData = {
    id: 'payment-1',
    provider_transaction_id: 'tid-12345',
    amount: 10000,
    order_id: 'order-1',
    status: 'completed',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks to default state
    vi.mocked(useKakaoPay).mockReturnValue(mockKakaoPayReturn);
    vi.mocked(useTossPay).mockReturnValue(mockTossPayReturn);

    // Reset function mocks
    mockKakaoPayReturn.initiateKakaoPay = vi.fn();
    mockKakaoPayReturn.approveKakaoPay = vi.fn();
    mockKakaoPayReturn.cancelKakaoPay = vi.fn();
    mockKakaoPayReturn.clearError = vi.fn();
    mockTossPayReturn.initiateTossPay = vi.fn();
    mockTossPayReturn.confirmTossPay = vi.fn();
    mockTossPayReturn.cancelTossPay = vi.fn();
    mockTossPayReturn.clearError = vi.fn();
  });

  const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

  describe('초기 상태', () => {
    it('useKakaoPay와 useTossPay를 통합하여 상태를 제공해야 함', () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.initiateKakaoPay).toBeDefined();
      expect(result.current.approveKakaoPay).toBeDefined();
      expect(result.current.initiateTossPay).toBeDefined();
      expect(result.current.confirmTossPay).toBeDefined();
      expect(result.current.cancelPayment).toBeDefined();
      expect(result.current.clearError).toBeDefined();
    });

    it('Kakao Pay가 처리 중일 때 통합 상태가 처리 중이어야 함', () => {
      vi.mocked(useKakaoPay).mockReturnValue({
        ...mockKakaoPayReturn,
        isProcessing: true,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      expect(result.current.isProcessing).toBe(true);
    });

    it('Toss Pay가 처리 중일 때 통합 상태가 처리 중이어야 함', () => {
      vi.mocked(useTossPay).mockReturnValue({
        ...mockTossPayReturn,
        isProcessing: true,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      expect(result.current.isProcessing).toBe(true);
    });

    it('Kakao Pay에 에러가 있을 때 통합 에러로 표시되어야 함', () => {
      const mockError = {
        provider: 'kakao' as const,
        code: 'INITIATE_FAILED',
        message: '결제 시작 실패',
      };

      vi.mocked(useKakaoPay).mockReturnValue({
        ...mockKakaoPayReturn,
        error: mockError,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      expect(result.current.error).toEqual(mockError);
    });

    it('Toss Pay에 에러가 있을 때 통합 에러로 표시되어야 함', () => {
      const mockError = {
        provider: 'toss' as const,
        code: 'CONFIRM_FAILED',
        message: '결제 승인 실패',
      };

      vi.mocked(useTossPay).mockReturnValue({
        ...mockTossPayReturn,
        error: mockError,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('Kakao Pay 기능 위임', () => {
    it('initiateKakaoPay를 호출하면 useKakaoPay의 메서드가 호출되어야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.initiateKakaoPay('order-1', 'ORD-001', 10000, '테스트 상품');
      });

      expect(mockKakaoPayReturn.initiateKakaoPay).toHaveBeenCalledWith(
        'order-1',
        'ORD-001',
        10000,
        '테스트 상품'
      );
    });

    it('approveKakaoPay를 호출하면 useKakaoPay의 메서드가 호출되어야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.approveKakaoPay('order-1', 'tid-123', 'pg-token-456');
      });

      expect(mockKakaoPayReturn.approveKakaoPay).toHaveBeenCalledWith(
        'order-1',
        'tid-123',
        'pg-token-456'
      );
    });
  });

  describe('Toss Pay 기능 위임', () => {
    it('initiateTossPay를 호출하면 useTossPay의 메서드가 호출되어야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.initiateTossPay('order-1', 'ORD-001', 10000, '테스트 주문');
      });

      expect(mockTossPayReturn.initiateTossPay).toHaveBeenCalledWith(
        'order-1',
        'ORD-001',
        10000,
        '테스트 주문'
      );
    });

    it('confirmTossPay를 호출하면 useTossPay의 메서드가 호출되어야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.confirmTossPay('order-1', 'payment-key-123', 10000);
      });

      expect(mockTossPayReturn.confirmTossPay).toHaveBeenCalledWith(
        'order-1',
        'payment-key-123',
        10000
      );
    });
  });

  describe('cancelPayment - 공통 결제 취소', () => {
    it('Kakao Pay 결제를 취소해야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockPaymentData,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: selectMock,
            update: updateMock,
          } as any;
        }
        if (table === 'orders') {
          return {
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-1', 'kakao', '고객 요청');
      });

      // Assert
      expect(selectMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'payment-1');
      expect(mockKakaoPayReturn.cancelKakaoPay).toHaveBeenCalledWith(
        mockPaymentData.provider_transaction_id,
        mockPaymentData.amount
      );
    });

    it('Toss Pay 결제를 취소해야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockPaymentData,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: selectMock,
            update: updateMock,
          } as any;
        }
        if (table === 'orders') {
          return {
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-1', 'toss', '고객 요청');
      });

      // Assert
      expect(selectMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'payment-1');
      expect(mockTossPayReturn.cancelTossPay).toHaveBeenCalledWith(
        mockPaymentData.provider_transaction_id,
        '고객 요청',
        mockPaymentData.amount
      );
    });

    it('결제 정보를 찾을 수 없으면 에러를 발생시켜야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute & Assert
      const { result } = renderHook(() => usePayment(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelPayment('payment-1', 'kakao', '고객 요청');
        })
      ).rejects.toThrow('결제 정보를 찾을 수 없습니다.');
    });

    it('취소 후 payments 테이블 상태를 업데이트해야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockPaymentData,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const updateMock = vi.fn().mockReturnValue({
        eq: updateEqMock,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: selectMock,
            update: updateMock,
          } as any;
        }
        if (table === 'orders') {
          return {
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-1', 'kakao', '고객 요청');
      });

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        status: 'cancelled',
        failure_reason: '고객 요청',
      });
      expect(updateEqMock).toHaveBeenCalledWith('id', 'payment-1');
    });

    it('취소 후 orders 테이블 상태를 업데이트해야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockPaymentData,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      const orderUpdateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const updateMock = vi.fn().mockReturnValue({
        eq: orderUpdateEqMock,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: selectMock,
            update: updateMock,
          } as any;
        }
        if (table === 'orders') {
          return {
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-1', 'kakao', '고객 요청');
      });

      // Assert - orders 테이블 업데이트 확인
      const ordersUpdateCalls = vi
        .mocked(supabase.from)
        .mock.results.filter((r) => r.value.update);

      expect(ordersUpdateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('clearError', () => {
    it('clearError를 호출하면 모든 하위 훅의 에러를 초기화해야 함', () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      act(() => {
        result.current.clearError();
      });

      expect(mockKakaoPayReturn.clearError).toHaveBeenCalled();
      expect(mockTossPayReturn.clearError).toHaveBeenCalled();
    });
  });

  describe('에러 처리', () => {
    it('게이트웨이 취소 중 에러가 발생하면 전파되어야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockPaymentData,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Kakao Pay 취소 실패 모킹
      mockKakaoPayReturn.cancelKakaoPay = vi.fn().mockRejectedValue(new Error('취소 실패'));

      // Execute & Assert
      const { result } = renderHook(() => usePayment(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelPayment('payment-1', 'kakao', '고객 요청');
        })
      ).rejects.toThrow('취소 실패');
    });
  });

  describe('추가 결제 시나리오', () => {
    it('동시에 여러 결제 제공자를 사용할 수 있어야 함', () => {
      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      // Assert - 모든 메서드가 정의되어 있어야 함
      expect(result.current.initiateKakaoPay).toBeDefined();
      expect(result.current.approveKakaoPay).toBeDefined();
      expect(result.current.initiateTossPay).toBeDefined();
      expect(result.current.confirmTossPay).toBeDefined();
      expect(result.current.cancelPayment).toBeDefined();
    });

    it('Kakao Pay와 Toss Pay 에러가 동시에 발생하면 첫 번째 에러를 반환해야 함', () => {
      // Setup
      const kakaoError = {
        provider: 'kakao' as const,
        code: 'KAKAO_ERROR',
        message: 'Kakao 에러',
      };

      const tossError = {
        provider: 'toss' as const,
        code: 'TOSS_ERROR',
        message: 'Toss 에러',
      };

      vi.mocked(useKakaoPay).mockReturnValue({
        ...mockKakaoPayReturn,
        error: kakaoError,
      });

      vi.mocked(useTossPay).mockReturnValue({
        ...mockTossPayReturn,
        error: tossError,
      });

      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      // Assert - Kakao 에러가 우선
      expect(result.current.error).toEqual(kakaoError);
    });

    it('결제 프로세스 중 isProcessing이 true여야 함', () => {
      // Setup
      vi.mocked(useKakaoPay).mockReturnValue({
        ...mockKakaoPayReturn,
        isProcessing: true,
      });

      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      // Assert
      expect(result.current.isProcessing).toBe(true);
    });

    it('여러 번 clearError를 호출해도 안전해야 함', () => {
      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      act(() => {
        result.current.clearError();
        result.current.clearError();
        result.current.clearError();
      });

      // Assert
      expect(mockKakaoPayReturn.clearError).toHaveBeenCalledTimes(3);
      expect(mockTossPayReturn.clearError).toHaveBeenCalledTimes(3);
    });

    it('cancelPayment에서 존재하지 않는 provider를 전달하면 에러를 발생시켜야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockPaymentData,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        update: updateMock,
      } as any);

      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      // Assert - 잘못된 provider 전달
      // Note: TypeScript에서는 컴파일 에러가 나지만, 런타임 테스트
      await act(async () => {
        await result.current.cancelPayment('payment-1', 'invalid' as any, '사유');
      });

      // Assert - 게이트웨이 메서드가 호출되지 않아야 함
      expect(mockKakaoPayReturn.cancelKakaoPay).not.toHaveBeenCalled();
      expect(mockTossPayReturn.cancelTossPay).not.toHaveBeenCalled();
    });

    it('결제 금액이 0원일 때도 처리할 수 있어야 함', async () => {
      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.initiateKakaoPay('order-1', 'ORD-001', 0, '무료 상품');
      });

      // Assert
      expect(mockKakaoPayReturn.initiateKakaoPay).toHaveBeenCalledWith(
        'order-1',
        'ORD-001',
        0,
        '무료 상품'
      );
    });

    it('결제 금액이 매우 큰 경우에도 처리할 수 있어야 함', async () => {
      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      const largeAmount = 999999999;

      await act(async () => {
        await result.current.initiateTossPay('order-1', 'ORD-001', largeAmount, '고액 상품');
      });

      // Assert
      expect(mockTossPayReturn.initiateTossPay).toHaveBeenCalledWith(
        'order-1',
        'ORD-001',
        largeAmount,
        '고액 상품'
      );
    });

    it('주문 번호에 특수문자가 포함되어도 처리해야 함', async () => {
      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      const specialOrderNumber = 'ORD-2024-01-01-#123@456';

      await act(async () => {
        await result.current.initiateKakaoPay(
          'order-1',
          specialOrderNumber,
          10000,
          '테스트 상품'
        );
      });

      // Assert
      expect(mockKakaoPayReturn.initiateKakaoPay).toHaveBeenCalledWith(
        'order-1',
        specialOrderNumber,
        10000,
        '테스트 상품'
      );
    });

    it('상품명에 이모지가 포함되어도 처리해야 함', async () => {
      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      const itemNameWithEmoji = '🎁 선물 상품 🎉';

      await act(async () => {
        await result.current.initiateKakaoPay('order-1', 'ORD-001', 10000, itemNameWithEmoji);
      });

      // Assert
      expect(mockKakaoPayReturn.initiateKakaoPay).toHaveBeenCalledWith(
        'order-1',
        'ORD-001',
        10000,
        itemNameWithEmoji
      );
    });

    it('부분 환불 시나리오를 처리할 수 있어야 함', async () => {
      // Setup
      const partialRefundPayment = {
        ...mockPaymentData,
        amount: 10000,
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: partialRefundPayment,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: selectMock,
            update: updateMock,
          } as any;
        }
        if (table === 'orders') {
          return {
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-1', 'toss', '부분 환불 요청');
      });

      // Assert - Toss Pay 취소가 호출되어야 함
      expect(mockTossPayReturn.cancelTossPay).toHaveBeenCalledWith(
        partialRefundPayment.provider_transaction_id,
        '부분 환불 요청',
        partialRefundPayment.amount
      );
    });

    it('여러 결제를 순차적으로 처리할 수 있어야 함', async () => {
      // Execute
      const { result } = renderHook(() => usePayment(), { wrapper });

      // 첫 번째 결제
      await act(async () => {
        await result.current.initiateKakaoPay('order-1', 'ORD-001', 10000, '상품 1');
      });

      // 두 번째 결제
      await act(async () => {
        await result.current.initiateTossPay('order-2', 'ORD-002', 20000, '상품 2');
      });

      // Assert
      expect(mockKakaoPayReturn.initiateKakaoPay).toHaveBeenCalledTimes(1);
      expect(mockTossPayReturn.initiateTossPay).toHaveBeenCalledTimes(1);
    });
  });
});
