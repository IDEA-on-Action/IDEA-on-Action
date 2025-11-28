/**
 * usePayments Hook
 *
 * 결제 관련 React Query 훅
 * - 결제 준비
 * - 결제 승인
 * - 결제 상태 조회
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  preparePayment,
  approvePayment,
  failPayment,
  getPaymentStatus,
  getPaymentByOrderId,
  type PaymentReadyRequest,
  type PaymentApproveRequest,
  type PaymentProvider,
} from '@/services/paymentService'
import type { Payment } from '@/types/database'

/**
 * 결제 준비 훅
 */
export function usePreparePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: preparePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}

/**
 * 결제 승인 훅
 */
export function useApprovePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: approvePayment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      if (data.payment.order_id) {
        queryClient.invalidateQueries({
          queryKey: ['order', data.payment.order_id],
        })
      }
    },
  })
}

/**
 * 결제 실패 처리 훅
 */
export function useFailPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason?: string }) =>
      failPayment(paymentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}

/**
 * 결제 상태 조회 훅
 */
export function usePaymentStatus(paymentId: string | null) {
  return useQuery<Payment | null>({
    queryKey: ['payment', paymentId],
    queryFn: () => (paymentId ? getPaymentStatus(paymentId) : null),
    enabled: !!paymentId,
    refetchInterval: (query) => {
      // pending 상태일 때만 3초마다 polling
      const data = query.state.data
      return data?.status === 'pending' ? 3000 : false
    },
  })
}

/**
 * 주문의 결제 정보 조회 훅
 */
export function useOrderPayment(orderId: string | null) {
  return useQuery<Payment | null>({
    queryKey: ['orderPayment', orderId],
    queryFn: () => (orderId ? getPaymentByOrderId(orderId) : null),
    enabled: !!orderId,
  })
}

/**
 * 결제 상태 한글 변환
 */
export function getPaymentStatusLabel(status: Payment['status']): string {
  const labels: Record<Payment['status'], string> = {
    pending: '결제 대기',
    completed: '결제 완료',
    failed: '결제 실패',
    refunded: '환불 완료',
  }
  return labels[status]
}

/**
 * 결제사 이름 한글 변환
 */
export function getProviderLabel(provider: PaymentProvider): string {
  const labels: Record<PaymentProvider, string> = {
    kakao: '카카오페이',
    toss: '토스페이',
    stripe: 'Stripe',
  }
  return labels[provider]
}
