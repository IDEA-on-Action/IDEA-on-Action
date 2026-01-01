/**
 * useSubscriptions Hook
 *
 * 구독 관련 데이터를 조회 및 관리하는 React Query 훅
 * - 내 구독 목록 조회
 * - 구독 취소
 * - 구독 업그레이드/다운그레이드
 * - 결제 내역 조회
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionsApi, paymentsApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/auth/useAuth'
import {
  SubscriptionWithPlan,
  CancelSubscriptionRequest,
  UpgradeSubscriptionRequest
} from '@/types/subscription.types'
import { toast } from 'sonner'

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  mySubscriptions: () => [...subscriptionKeys.all, 'my'] as const,
  details: (id: string) => [...subscriptionKeys.all, 'detail', id] as const,
  payments: (id: string) => [...subscriptionKeys.all, 'payments', id] as const,
  plans: () => [...subscriptionKeys.all, 'plans'] as const,
}

/**
 * 구독 플랜 목록 조회 훅
 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans(),
    staleTime: 1000 * 60 * 30, // 30분간 캐시 유지
    queryFn: async () => {
      const response = await subscriptionsApi.getPlans()

      if (response.error) {
        console.error('[useSubscriptionPlans] API 오류:', response.error)
        return []
      }

      const result = response.data as { plans: unknown[] } | null
      return result?.plans || []
    }
  })
}

/**
 * 내 구독 목록 조회 훅
 */
export function useMySubscriptions() {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: subscriptionKeys.mySubscriptions(),
    queryFn: async () => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('로그인이 필요합니다.')

      const response = await subscriptionsApi.getHistory(token)

      if (response.error) {
        console.error('[useMySubscriptions] API 오류:', response.error)
        throw new Error(response.error)
      }

      const result = response.data as { subscriptions: SubscriptionWithPlan[] } | null
      return result?.subscriptions || []
    },
    enabled: !!workersTokens?.accessToken
  })
}

/**
 * 현재 활성 구독 조회 훅
 */
export function useCurrentSubscription() {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: [...subscriptionKeys.mySubscriptions(), 'current'],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('로그인이 필요합니다.')

      const response = await subscriptionsApi.getCurrent(token)

      if (response.error) {
        console.error('[useCurrentSubscription] API 오류:', response.error)
        return null
      }

      const result = response.data as { subscription: SubscriptionWithPlan | null } | null
      return result?.subscription || null
    },
    enabled: !!workersTokens?.accessToken
  })
}

/**
 * 구독 취소 훅
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async ({ subscription_id, cancel_at_period_end, reason }: CancelSubscriptionRequest) => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('로그인이 필요합니다.')

      const response = await subscriptionsApi.cancel(token, subscription_id, {
        cancel_immediately: !cancel_at_period_end,
        reason,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      return response.data
    },
    onSuccess: () => {
      toast.success('구독이 성공적으로 취소되었습니다.')
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
    },
    onError: (error) => {
      console.error('Error cancelling subscription:', error)
      toast.error('구독 취소 중 오류가 발생했습니다.')
    }
  })
}

/**
 * 구독 재개 훅
 */
export function useResumeSubscription() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('로그인이 필요합니다.')

      const response = await subscriptionsApi.resume(token, subscriptionId)

      if (response.error) {
        throw new Error(response.error)
      }

      return response.data
    },
    onSuccess: () => {
      toast.success('구독이 재개되었습니다.')
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
    },
    onError: (error) => {
      console.error('Error resuming subscription:', error)
      toast.error('구독 재개 중 오류가 발생했습니다.')
    }
  })
}

/**
 * 구독 업그레이드/다운그레이드 훅
 */
export function useUpgradeSubscription() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async ({ subscription_id, new_plan_id }: UpgradeSubscriptionRequest) => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('로그인이 필요합니다.')

      const response = await subscriptionsApi.changePlan(token, subscription_id, {
        new_plan_id,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      return response.data
    },
    onSuccess: () => {
      toast.success('구독 플랜이 변경되었습니다.')
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
    },
    onError: (error) => {
      console.error('Error upgrading subscription:', error)
      toast.error(`구독 변경 실패: ${error.message}`)
    }
  })
}

/**
 * 구독 결제 수단 변경 훅
 */
export function useUpdateSubscriptionPayment() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async ({ subscriptionId, billingKeyId }: { subscriptionId: string; billingKeyId: string }) => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('로그인이 필요합니다.')

      const response = await subscriptionsApi.updatePayment(token, subscriptionId, {
        billing_key_id: billingKeyId,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      return response.data
    },
    onSuccess: () => {
      toast.success('결제 수단이 변경되었습니다.')
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
    },
    onError: (error) => {
      console.error('Error updating payment method:', error)
      toast.error('결제 수단 변경 중 오류가 발생했습니다.')
    }
  })
}

/**
 * 구독 결제 내역 조회 훅
 */
export function useSubscriptionPayments(subscriptionId: string) {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: subscriptionKeys.payments(subscriptionId),
    queryFn: async () => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('로그인이 필요합니다.')

      // Workers API에서 결제 내역 조회
      const response = await paymentsApi.history(token, { subscriptionId })

      if (response.error) {
        console.error('[useSubscriptionPayments] API 오류:', response.error)
        return []
      }

      const result = response.data as { payments: unknown[] } | null
      return result?.payments || []
    },
    enabled: !!subscriptionId && !!workersTokens?.accessToken
  })
}

/**
 * 구독 생성 훅
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async ({ planId, billingKeyId }: { planId: string; billingKeyId: string }) => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('로그인이 필요합니다.')

      const response = await subscriptionsApi.create(token, {
        plan_id: planId,
        billing_key_id: billingKeyId,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      return response.data
    },
    onSuccess: () => {
      toast.success('구독이 시작되었습니다.')
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
    },
    onError: (error) => {
      console.error('Error creating subscription:', error)
      toast.error(`구독 생성 실패: ${error.message}`)
    }
  })
}
