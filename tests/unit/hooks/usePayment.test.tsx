/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePayment } from '@/hooks/usePayment';
import { paymentsApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  paymentsApi: {
    cancel: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
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

import { useAuth } from '@/hooks/useAuth';
import { useKakaoPay } from '@/hooks/payments/useKakaoPay';
import { useTossPay } from '@/hooks/payments/useTossPay';

describe('usePayment', () => {
  const mockAccessToken = 'mock-access-token';

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

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks to default state
    vi.mocked(useAuth).mockReturnValue({
      workersTokens: { accessToken: mockAccessToken, refreshToken: 'mock-refresh' },
    } as ReturnType<typeof useAuth>);

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
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-1', 'kakao', '고객 요청');
      });

      // Kakao 결제는 cancelKakaoPay를 호출
      expect(mockKakaoPayReturn.cancelKakaoPay).toHaveBeenCalledWith('payment-1', 0);
    });

    it('Toss Pay 결제를 취소해야 함', async () => {
      vi.mocked(paymentsApi.cancel).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-key-1', 'toss', '고객 요청');
      });

      // Toss 결제는 Workers API를 호출
      expect(paymentsApi.cancel).toHaveBeenCalledWith(mockAccessToken, {
        paymentKey: 'payment-key-1',
        cancelReason: '고객 요청',
      });
    });

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({
        workersTokens: null,
      } as any);

      const { result } = renderHook(() => usePayment(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelPayment('payment-1', 'toss', '고객 요청');
        })
      ).rejects.toThrow('로그인이 필요합니다.');
    });

    it('Toss 취소 API 에러 시 에러를 발생시켜야 함', async () => {
      vi.mocked(paymentsApi.cancel).mockResolvedValue({
        data: null,
        error: '취소 처리 실패',
        status: 400,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelPayment('payment-key-1', 'toss', '고객 요청');
        })
      ).rejects.toThrow('취소 처리 실패');
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
      // Kakao Pay 취소 실패 모킹
      mockKakaoPayReturn.cancelKakaoPay = vi.fn().mockRejectedValue(new Error('취소 실패'));

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
      const { result } = renderHook(() => usePayment(), { wrapper });

      // 모든 메서드가 정의되어 있어야 함
      expect(result.current.initiateKakaoPay).toBeDefined();
      expect(result.current.approveKakaoPay).toBeDefined();
      expect(result.current.initiateTossPay).toBeDefined();
      expect(result.current.confirmTossPay).toBeDefined();
      expect(result.current.cancelPayment).toBeDefined();
    });

    it('Kakao Pay와 Toss Pay 에러가 동시에 발생하면 첫 번째 에러를 반환해야 함', () => {
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

      const { result } = renderHook(() => usePayment(), { wrapper });

      // Kakao 에러가 우선
      expect(result.current.error).toEqual(kakaoError);
    });

    it('결제 프로세스 중 isProcessing이 true여야 함', () => {
      vi.mocked(useKakaoPay).mockReturnValue({
        ...mockKakaoPayReturn,
        isProcessing: true,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      expect(result.current.isProcessing).toBe(true);
    });

    it('여러 번 clearError를 호출해도 안전해야 함', () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      act(() => {
        result.current.clearError();
        result.current.clearError();
        result.current.clearError();
      });

      expect(mockKakaoPayReturn.clearError).toHaveBeenCalledTimes(3);
      expect(mockTossPayReturn.clearError).toHaveBeenCalledTimes(3);
    });

    it('cancelPayment에서 존재하지 않는 provider를 전달하면 아무것도 호출되지 않아야 함', async () => {
      vi.mocked(paymentsApi.cancel).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-1', 'invalid' as any, '사유');
      });

      // 잘못된 provider - 게이트웨이 메서드가 호출되지 않아야 함
      expect(mockKakaoPayReturn.cancelKakaoPay).not.toHaveBeenCalled();
      expect(mockTossPayReturn.cancelTossPay).not.toHaveBeenCalled();
      expect(paymentsApi.cancel).not.toHaveBeenCalled();
    });

    it('결제 금액이 0원일 때도 처리할 수 있어야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.initiateKakaoPay('order-1', 'ORD-001', 0, '무료 상품');
      });

      expect(mockKakaoPayReturn.initiateKakaoPay).toHaveBeenCalledWith(
        'order-1',
        'ORD-001',
        0,
        '무료 상품'
      );
    });

    it('결제 금액이 매우 큰 경우에도 처리할 수 있어야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      const largeAmount = 999999999;

      await act(async () => {
        await result.current.initiateTossPay('order-1', 'ORD-001', largeAmount, '고액 상품');
      });

      expect(mockTossPayReturn.initiateTossPay).toHaveBeenCalledWith(
        'order-1',
        'ORD-001',
        largeAmount,
        '고액 상품'
      );
    });

    it('주문 번호에 특수문자가 포함되어도 처리해야 함', async () => {
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

      expect(mockKakaoPayReturn.initiateKakaoPay).toHaveBeenCalledWith(
        'order-1',
        specialOrderNumber,
        10000,
        '테스트 상품'
      );
    });

    it('상품명에 이모지가 포함되어도 처리해야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      const itemNameWithEmoji = '🎁 선물 상품 🎉';

      await act(async () => {
        await result.current.initiateKakaoPay('order-1', 'ORD-001', 10000, itemNameWithEmoji);
      });

      expect(mockKakaoPayReturn.initiateKakaoPay).toHaveBeenCalledWith(
        'order-1',
        'ORD-001',
        10000,
        itemNameWithEmoji
      );
    });

    it('Toss 부분 환불 시나리오를 처리할 수 있어야 함', async () => {
      vi.mocked(paymentsApi.cancel).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-key-1', 'toss', '부분 환불 요청');
      });

      // Workers API로 취소 요청
      expect(paymentsApi.cancel).toHaveBeenCalledWith(mockAccessToken, {
        paymentKey: 'payment-key-1',
        cancelReason: '부분 환불 요청',
      });
    });

    it('여러 결제를 순차적으로 처리할 수 있어야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      // 첫 번째 결제
      await act(async () => {
        await result.current.initiateKakaoPay('order-1', 'ORD-001', 10000, '상품 1');
      });

      // 두 번째 결제
      await act(async () => {
        await result.current.initiateTossPay('order-2', 'ORD-002', 20000, '상품 2');
      });

      expect(mockKakaoPayReturn.initiateKakaoPay).toHaveBeenCalledTimes(1);
      expect(mockTossPayReturn.initiateTossPay).toHaveBeenCalledTimes(1);
    });
  });
});
