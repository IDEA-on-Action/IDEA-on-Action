/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * usePayment (payments/usePayment.ts) 확장 테스트
 *
 * 기존 usePayment.test.tsx에 추가로 더 많은 엣지 케이스와 시나리오를 테스트합니다.
 *
 * @migration Supabase → Workers API 마이그레이션 완료
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePayment } from '@/hooks/payments/usePayment';
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
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    workersTokens: { accessToken: 'mock-token' },
  })),
}));

// Mock useKakaoPay
vi.mock('@/hooks/payments/useKakaoPay', () => ({
  useKakaoPay: vi.fn(),
}));

// Mock useTossPay
vi.mock('@/hooks/payments/useTossPay', () => ({
  useTossPay: vi.fn(),
}));

// Mock devError
vi.mock('@/lib/errors', () => ({
  devError: vi.fn(),
}));

import { useKakaoPay } from '@/hooks/payments/useKakaoPay';
import { useTossPay } from '@/hooks/payments/useTossPay';
import { useAuth } from '@/hooks/useAuth';
import { devError } from '@/lib/errors';

describe('usePayment - 확장 테스트', () => {
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

    vi.mocked(useKakaoPay).mockReturnValue(mockKakaoPayReturn);
    vi.mocked(useTossPay).mockReturnValue(mockTossPayReturn);

    // Reset useAuth mock
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      workersTokens: { accessToken: 'mock-token' },
    } as any);

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

  describe('상태 통합 테스트', () => {
    it('두 게이트웨이 모두 처리 중일 때 통합 상태가 처리 중이어야 함', () => {
      vi.mocked(useKakaoPay).mockReturnValue({
        ...mockKakaoPayReturn,
        isProcessing: true,
      });
      vi.mocked(useTossPay).mockReturnValue({
        ...mockTossPayReturn,
        isProcessing: true,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      expect(result.current.isProcessing).toBe(true);
    });

    it('Kakao Pay와 Toss Pay에 모두 에러가 있을 때 첫 번째 에러를 반환해야 함', () => {
      const kakaoError = {
        provider: 'kakao' as const,
        code: 'KAKAO_ERROR',
        message: '카카오 에러',
      };

      const tossError = {
        provider: 'toss' as const,
        code: 'TOSS_ERROR',
        message: '토스 에러',
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

      // Kakao Pay 에러가 먼저 확인됨
      expect(result.current.error).toEqual(kakaoError);
    });
  });

  describe('Kakao Pay 파라미터 검증', () => {
    it('initiateKakaoPay에 빈 orderId를 전달하면 처리되어야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.initiateKakaoPay('', 'ORD-001', 10000, '테스트 상품');
      });

      expect(mockKakaoPayReturn.initiateKakaoPay).toHaveBeenCalledWith(
        '',
        'ORD-001',
        10000,
        '테스트 상품'
      );
    });

    it('initiateKakaoPay에 0원 금액을 전달하면 처리되어야 함', async () => {
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

    it('approveKakaoPay에 특수문자가 포함된 pgToken을 전달하면 처리되어야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.approveKakaoPay(
          'order-1',
          'tid-123',
          'pg-token-!@#$%^&*()'
        );
      });

      expect(mockKakaoPayReturn.approveKakaoPay).toHaveBeenCalledWith(
        'order-1',
        'tid-123',
        'pg-token-!@#$%^&*()'
      );
    });
  });

  describe('Toss Pay 파라미터 검증', () => {
    it('initiateTossPay에 음수 금액을 전달하면 처리되어야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.initiateTossPay('order-1', 'ORD-001', -1000, '환불');
      });

      expect(mockTossPayReturn.initiateTossPay).toHaveBeenCalledWith(
        'order-1',
        'ORD-001',
        -1000,
        '환불'
      );
    });

    it('confirmTossPay에 매우 큰 금액을 전달하면 처리되어야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.confirmTossPay(
          'order-1',
          'payment-key-123',
          999999999999
        );
      });

      expect(mockTossPayReturn.confirmTossPay).toHaveBeenCalledWith(
        'order-1',
        'payment-key-123',
        999999999999
      );
    });

    it('initiateTossPay에 긴 주문명을 전달하면 처리되어야 함', async () => {
      const longOrderName = 'A'.repeat(1000);
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.initiateTossPay('order-1', 'ORD-001', 10000, longOrderName);
      });

      expect(mockTossPayReturn.initiateTossPay).toHaveBeenCalledWith(
        'order-1',
        'ORD-001',
        10000,
        longOrderName
      );
    });
  });

  describe('cancelPayment - Workers API 마이그레이션', () => {
    it('로그인 없이 결제 취소 시 에러를 throw 해야 함', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        workersTokens: null,
      } as any);

      const { result } = renderHook(() => usePayment(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelPayment('payment-1', 'toss', '고객 요청');
        })
      ).rejects.toThrow('로그인이 필요합니다.');
    });

    it('Toss Pay 결제 취소 시 Workers API를 호출해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(paymentsApi.cancel).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-key-123', 'toss', '고객 요청');
      });

      // Workers API 호출 확인
      expect(paymentsApi.cancel).toHaveBeenCalledWith('mock-token', {
        paymentKey: 'payment-key-123',
        cancelReason: '고객 요청',
      });
    });

    it('Toss Pay 결제 취소 API 에러 시 에러를 전파해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(paymentsApi.cancel).mockResolvedValue({
        data: null,
        error: '결제 취소에 실패했습니다.',
        status: 400,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelPayment('payment-key-123', 'toss', '고객 요청');
        })
      ).rejects.toThrow('결제 취소에 실패했습니다.');

      expect(devError).toHaveBeenCalled();
    });

    it('Kakao Pay 결제 취소 시 cancelKakaoPay를 호출해야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('tid-12345', 'kakao', '고객 요청');
      });

      // Kakao Pay 취소 함수 호출 확인
      expect(mockKakaoPayReturn.cancelKakaoPay).toHaveBeenCalledWith('tid-12345', 0);
      // Toss Pay 취소는 호출되지 않아야 함
      expect(paymentsApi.cancel).not.toHaveBeenCalled();
    });

    it('알 수 없는 결제 제공자에 대해 아무 게이트웨이도 호출하지 않아야 함', async () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-1', 'unknown' as any, '고객 요청');
      });

      // Kakao Pay나 Toss Pay 취소가 호출되지 않아야 함
      expect(mockKakaoPayReturn.cancelKakaoPay).not.toHaveBeenCalled();
      expect(paymentsApi.cancel).not.toHaveBeenCalled();
    });

    it('취소 사유가 빈 문자열일 때 처리되어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(paymentsApi.cancel).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-key-123', 'toss', '');
      });

      expect(paymentsApi.cancel).toHaveBeenCalledWith('mock-token', {
        paymentKey: 'payment-key-123',
        cancelReason: '',
      });
    });

    it('Kakao Pay 취소 중 에러 발생 시 에러를 전파해야 함', async () => {
      const cancelError = new Error('카카오페이 취소 실패');
      mockKakaoPayReturn.cancelKakaoPay = vi.fn().mockRejectedValue(cancelError);

      const { result } = renderHook(() => usePayment(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelPayment('tid-12345', 'kakao', '고객 요청');
        })
      ).rejects.toThrow('카카오페이 취소 실패');

      expect(devError).toHaveBeenCalled();
    });
  });

  describe('clearError 동작 검증', () => {
    it('clearError 호출 시 두 게이트웨이의 에러가 모두 초기화되어야 함', () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      act(() => {
        result.current.clearError();
      });

      expect(mockKakaoPayReturn.clearError).toHaveBeenCalledTimes(1);
      expect(mockTossPayReturn.clearError).toHaveBeenCalledTimes(1);
    });

    it('clearError를 여러 번 호출해도 안전해야 함', () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      act(() => {
        result.current.clearError();
        result.current.clearError();
        result.current.clearError();
      });

      expect(mockKakaoPayReturn.clearError).toHaveBeenCalledTimes(3);
      expect(mockTossPayReturn.clearError).toHaveBeenCalledTimes(3);
    });
  });

  describe('반환 인터페이스 검증', () => {
    it('usePayment가 모든 필수 메서드를 반환해야 함', () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      expect(result.current).toHaveProperty('isProcessing');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('initiateKakaoPay');
      expect(result.current).toHaveProperty('approveKakaoPay');
      expect(result.current).toHaveProperty('initiateTossPay');
      expect(result.current).toHaveProperty('confirmTossPay');
      expect(result.current).toHaveProperty('cancelPayment');
      expect(result.current).toHaveProperty('clearError');
    });

    it('모든 메서드가 함수여야 함', () => {
      const { result } = renderHook(() => usePayment(), { wrapper });

      expect(typeof result.current.initiateKakaoPay).toBe('function');
      expect(typeof result.current.approveKakaoPay).toBe('function');
      expect(typeof result.current.initiateTossPay).toBe('function');
      expect(typeof result.current.confirmTossPay).toBe('function');
      expect(typeof result.current.cancelPayment).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });
});
