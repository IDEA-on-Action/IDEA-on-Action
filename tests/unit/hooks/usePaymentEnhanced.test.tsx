/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * usePayment (payments/usePayment.ts) 확장 테스트
 *
 * 기존 usePayment.test.tsx에 추가로 더 많은 엣지 케이스와 시나리오를 테스트합니다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePayment } from '@/hooks/payments/usePayment';
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

// Mock devError
vi.mock('@/lib/errors', () => ({
  devError: vi.fn(),
}));

import { useKakaoPay } from '@/hooks/payments/useKakaoPay';
import { useTossPay } from '@/hooks/payments/useTossPay';
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

  describe('cancelPayment - 엣지 케이스', () => {
    it('결제 취소 시 DB 조회 에러가 발생하면 에러를 전파해야 함', async () => {
      const dbError = { message: 'Connection timeout', code: 'DB_ERROR' };

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: dbError,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      } as any);

      const { result } = renderHook(() => usePayment(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelPayment('payment-1', 'kakao', '고객 요청');
        })
      ).rejects.toThrow('결제 정보를 찾을 수 없습니다.');

      expect(devError).toHaveBeenCalled();
    });

    it('결제 데이터가 null일 때 에러를 발생시켜야 함', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      } as any);

      const { result } = renderHook(() => usePayment(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelPayment('payment-1', 'kakao', '고객 요청');
        })
      ).rejects.toThrow('결제 정보를 찾을 수 없습니다.');
    });

    it('payments 테이블 업데이트 실패 시 에러를 전파해야 함', async () => {
      const mockPaymentData = {
        id: 'payment-1',
        provider_transaction_id: 'tid-12345',
        amount: 10000,
        order_id: 'order-1',
      };

      const updateError = { message: 'Update failed', code: 'UPDATE_ERROR' };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockPaymentData,
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockRejectedValue(updateError),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelPayment('payment-1', 'kakao', '고객 요청');
        })
      ).rejects.toEqual(updateError);
    });

    it('orders 테이블 업데이트 실패 시 에러를 전파해야 함', async () => {
      const mockPaymentData = {
        id: 'payment-1',
        provider_transaction_id: 'tid-12345',
        amount: 10000,
        order_id: 'order-1',
      };

      const updateError = { message: 'Order update failed', code: 'UPDATE_ERROR' };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockPaymentData,
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any;
        }
        if (table === 'orders') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockRejectedValue(updateError),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      await expect(
        act(async () => {
          await result.current.cancelPayment('payment-1', 'kakao', '고객 요청');
        })
      ).rejects.toEqual(updateError);
    });

    it('알 수 없는 결제 제공자에 대해 아무 게이트웨이도 호출하지 않아야 함', async () => {
      const mockPaymentData = {
        id: 'payment-1',
        provider_transaction_id: 'tid-12345',
        amount: 10000,
        order_id: 'order-1',
      };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockPaymentData,
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any;
        }
        if (table === 'orders') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-1', 'unknown' as any, '고객 요청');
      });

      // Kakao Pay나 Toss Pay 취소가 호출되지 않아야 함
      expect(mockKakaoPayReturn.cancelKakaoPay).not.toHaveBeenCalled();
      expect(mockTossPayReturn.cancelTossPay).not.toHaveBeenCalled();
    });

    it('취소 사유가 빈 문자열일 때 처리되어야 함', async () => {
      const mockPaymentData = {
        id: 'payment-1',
        provider_transaction_id: 'tid-12345',
        amount: 10000,
        order_id: 'order-1',
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockPaymentData,
                  error: null,
                }),
              }),
            }),
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

      const { result } = renderHook(() => usePayment(), { wrapper });

      await act(async () => {
        await result.current.cancelPayment('payment-1', 'kakao', '');
      });

      expect(updateMock).toHaveBeenCalledWith({
        status: 'cancelled',
        failure_reason: '',
      });
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
