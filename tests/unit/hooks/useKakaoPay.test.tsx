/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useKakaoPay } from '@/hooks/payments/useKakaoPay';
import { supabase } from '@/integrations/supabase/client';
import * as kakaoPayLib from '@/lib/payments/kakao-pay';
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

// Mock kakao-pay library
vi.mock('@/lib/payments/kakao-pay', () => ({
  prepareKakaoPayment: vi.fn(),
  approveKakaoPayment: vi.fn(),
  cancelKakaoPayment: vi.fn(),
  getKakaoPayRedirectUrls: vi.fn(),
}));

// Mock devError
vi.mock('@/lib/errors', () => ({
  devError: vi.fn(),
}));

describe('useKakaoPay', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockOrder = {
    id: 'order-1',
    order_number: 'ORD-001',
    amount: 10000,
  };

  const mockKakaoReadyResponse = {
    tid: 'tid-12345',
    next_redirect_pc_url: 'https://kakao.com/pay/redirect',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockKakaoApproveResponse = {
    tid: 'tid-12345',
    aid: 'aid-67890',
    payment_method_type: 'CARD',
    amount: {
      total: 10000,
      tax_free: 0,
      vat: 909,
      point: 0,
    },
    card_info: {
      card_type: 'CREDIT',
      kakaopay_issuer_corp: '신한카드',
      approved_id: 'APPROVE-123',
    },
    approved_at: '2024-01-01T01:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset location
    delete (window as any).location;
    window.location = { href: '' } as any;

    // Reset sessionStorage
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

  describe('초기 상태', () => {
    it('초기 상태는 처리 중이 아니고 에러가 없어야 함', () => {
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.initiateKakaoPay).toBeDefined();
      expect(result.current.approveKakaoPay).toBeDefined();
      expect(result.current.cancelKakaoPay).toBeDefined();
      expect(result.current.clearError).toBeDefined();
    });
  });

  describe('initiateKakaoPay - 결제 시작', () => {
    it('결제 시작 시 Kakao Pay 준비 API를 호출하고 리다이렉트해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(kakaoPayLib.getKakaoPayRedirectUrls).mockReturnValue({
        approval_url: 'http://localhost/success',
        cancel_url: 'http://localhost/cancel',
        fail_url: 'http://localhost/fail',
      });

      vi.mocked(kakaoPayLib.prepareKakaoPayment).mockResolvedValue(
        mockKakaoReadyResponse as any
      );

      // Execute
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      await act(async () => {
        await result.current.initiateKakaoPay('order-1', 'ORD-001', 10000, '테스트 상품');
      });

      // Assert
      expect(kakaoPayLib.prepareKakaoPayment).toHaveBeenCalledWith({
        partner_order_id: 'ORD-001',
        partner_user_id: mockUser.id,
        item_name: '테스트 상품',
        quantity: 1,
        total_amount: 10000,
        tax_free_amount: 0,
        approval_url: 'http://localhost/success',
        cancel_url: 'http://localhost/cancel',
        fail_url: 'http://localhost/fail',
      });

      expect(sessionStorage.getItem('kakao_pay_tid_order-1')).toBe('tid-12345');
      expect(window.location.href).toBe('https://kakao.com/pay/redirect');
    });

    it('로그인하지 않은 경우 에러를 발생시켜야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      let error: any;
      try {
        await act(async () => {
          await result.current.initiateKakaoPay('order-1', 'ORD-001', 10000, '테스트 상품');
        });
      } catch (e) {
        error = e;
      }

      // Assert - 에러가 던져졌는지 확인
      expect(error).toBeDefined();
      expect(error.message).toBe('로그인이 필요합니다.');
    });

    it('Kakao Pay API 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(kakaoPayLib.getKakaoPayRedirectUrls).mockReturnValue({
        approval_url: 'http://localhost/success',
        cancel_url: 'http://localhost/cancel',
        fail_url: 'http://localhost/fail',
      });

      vi.mocked(kakaoPayLib.prepareKakaoPayment).mockRejectedValue(
        new Error('Kakao Pay API 오류')
      );

      // Execute
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      let error: any;
      try {
        await act(async () => {
          await result.current.initiateKakaoPay('order-1', 'ORD-001', 10000, '테스트 상품');
        });
      } catch (e) {
        error = e;
      }

      // Assert - 에러가 던져졌는지 확인
      expect(error).toBeDefined();
      expect(error.message).toBe('Kakao Pay API 오류');
    });
  });

  describe('approveKakaoPay - 결제 승인', () => {
    it('결제 승인 시 Kakao Pay 승인 API를 호출하고 DB에 저장해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

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

      vi.mocked(kakaoPayLib.approveKakaoPayment).mockResolvedValue(
        mockKakaoApproveResponse as any
      );

      // Execute
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.approveKakaoPay('order-1', 'tid-12345', 'pg-token-456');
      });

      // Assert - Kakao Pay 승인 호출
      expect(kakaoPayLib.approveKakaoPayment).toHaveBeenCalledWith({
        tid: 'tid-12345',
        partner_order_id: 'ORD-001',
        partner_user_id: mockUser.id,
        pg_token: 'pg-token-456',
      });

      // Assert - payments 테이블 삽입
      expect(insertMock).toHaveBeenCalledWith({
        order_id: 'order-1',
        amount: 10000,
        status: 'completed',
        provider: 'kakao',
        provider_transaction_id: 'tid-12345',
        payment_method: 'card',
        card_info: {
          cardType: 'CREDIT',
          issuer: '신한카드',
          approveNo: 'APPROVE-123',
        },
        metadata: mockKakaoApproveResponse,
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
        provider: 'kakao',
        transactionId: 'tid-12345',
        orderId: 'order-1',
        amount: 10000,
        paidAt: '2024-01-01T01:00:00Z',
      });
    });

    it('주문 정보를 찾을 수 없으면 에러를 발생시켜야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

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
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.approveKakaoPay('order-1', 'tid-12345', 'pg-token-456');
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).toBeDefined();
      expect(error?.message).toBe('주문 정보를 찾을 수 없습니다.');
    });

    it('결제 승인 실패 시 주문 상태를 cancelled로 업데이트해야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

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

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleMock,
              }),
            }),
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      vi.mocked(kakaoPayLib.approveKakaoPayment).mockRejectedValue(
        new Error('승인 실패')
      );

      // Execute
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      let error: any;
      try {
        await act(async () => {
          await result.current.approveKakaoPay('order-1', 'tid-12345', 'pg-token-456');
        });
      } catch (e) {
        error = e;
      }

      // Assert - 에러가 던져졌는지 확인
      expect(error).toBeDefined();
      expect(error.message).toBe('승인 실패');

      // Assert - 주문 상태 업데이트
      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith({ status: 'cancelled' });
      });
    });

    it('승인 성공 시 세션 스토리지를 정리해야 함', async () => {
      // Setup
      sessionStorage.setItem('kakao_pay_tid_order-1', 'tid-12345');

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

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

      vi.mocked(kakaoPayLib.approveKakaoPayment).mockResolvedValue(
        mockKakaoApproveResponse as any
      );

      // Execute
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      await act(async () => {
        await result.current.approveKakaoPay('order-1', 'tid-12345', 'pg-token-456');
      });

      // Assert
      expect(sessionStorage.getItem('kakao_pay_tid_order-1')).toBeNull();
    });
  });

  describe('cancelKakaoPay - 결제 취소', () => {
    it('결제 취소를 성공적으로 처리해야 함', async () => {
      // Setup
      vi.mocked(kakaoPayLib.cancelKakaoPayment).mockResolvedValue(undefined as any);

      // Execute
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      await act(async () => {
        await result.current.cancelKakaoPay('tid-12345', 10000);
      });

      // Assert
      expect(kakaoPayLib.cancelKakaoPayment).toHaveBeenCalledWith({
        tid: 'tid-12345',
        cancel_amount: 10000,
        cancel_tax_free_amount: 0,
      });
      expect(result.current.error).toBeNull();
    });

    it('결제 취소 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(kakaoPayLib.cancelKakaoPayment).mockRejectedValue(
        new Error('취소 실패')
      );

      // Execute
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      let error: any;
      try {
        await act(async () => {
          await result.current.cancelKakaoPay('tid-12345', 10000);
        });
      } catch (e) {
        error = e;
      }

      // Assert - 에러가 던져졌는지 확인
      expect(error).toBeDefined();
      expect(error.message).toBe('취소 실패');
    });
  });

  describe('clearError', () => {
    it('clearError 메서드가 정의되어 있어야 함', () => {
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      // Execute
      act(() => {
        result.current.clearError();
      });

      // Assert - clearError 메서드가 존재하고 호출 가능해야 함
      expect(result.current.clearError).toBeDefined();
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('로딩 상태', () => {
    it('결제 완료 후 isProcessing이 false여야 함', async () => {
      // Setup
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(kakaoPayLib.getKakaoPayRedirectUrls).mockReturnValue({
        approval_url: 'http://localhost/success',
        cancel_url: 'http://localhost/cancel',
        fail_url: 'http://localhost/fail',
      });

      vi.mocked(kakaoPayLib.prepareKakaoPayment).mockResolvedValue(
        mockKakaoReadyResponse as any
      );

      // Execute
      const { result } = renderHook(() => useKakaoPay(), { wrapper });

      // 초기 상태 확인
      expect(result.current.isProcessing).toBe(false);

      // 결제 시작
      await act(async () => {
        await result.current.initiateKakaoPay('order-1', 'ORD-001', 10000, '테스트 상품');
      });

      // Assert - 처리 완료 후 false
      expect(result.current.isProcessing).toBe(false);
    });
  });
});
