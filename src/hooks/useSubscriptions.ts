
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import {
  SubscriptionWithPlan,
  SubscriptionPaymentWithDetails,
  CancelSubscriptionRequest,
  UpgradeSubscriptionRequest
} from '@/types/subscription.types'
import { toast } from 'sonner'

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  mySubscriptions: () => [...subscriptionKeys.all, 'my'] as const,
  details: (id: string) => [...subscriptionKeys.all, 'detail', id] as const,
  payments: (id: string) => [...subscriptionKeys.all, 'payments', id] as const,
}

/**
 * 내 구독 목록 조회 훅
 */
export function useMySubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.mySubscriptions(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 먼저 구독 정보 조회 (billing_keys 조인 제외)
      const { data: subscriptionsData, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          service:services (
            id,
            title,
            slug,
            image_url
          ),
          plan:subscription_plans (
            id,
            plan_name,
            billing_cycle,
            price,
            features
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (subsError) throw subsError

      // 구독이 없으면 빈 배열 반환
      if (!subscriptionsData || subscriptionsData.length === 0) {
        return [] as SubscriptionWithPlan[]
      }

      // billing_key_id가 있는 구독들의 billing_key 조회
      const billingKeyIds = subscriptionsData
        .map(sub => sub.billing_key_id)
        .filter((id): id is string => id !== null)

      let billingKeysMap: Record<string, unknown> = {}

      if (billingKeyIds.length > 0) {
        const { data: billingKeys } = await supabase
          .from('billing_keys')
          .select('*')
          .in('id', billingKeyIds)

        if (billingKeys) {
          billingKeysMap = billingKeys.reduce((acc, key) => {
            acc[key.id] = key
            return acc
          }, {} as Record<string, unknown>)
        }
      }

      // 구독 데이터에 billing_key 매핑
      const data = subscriptionsData.map(sub => ({
        ...sub,
        billing_key: sub.billing_key_id ? billingKeysMap[sub.billing_key_id] || null : null
      }))

      // 타입 캐스팅 (Supabase 조인 쿼리 결과 매핑)
      return data as unknown as SubscriptionWithPlan[]
    }
  })
}

/**
 * 구독 취소 훅
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ subscription_id, cancel_at_period_end, reason }: CancelSubscriptionRequest) => {
      // 1. 구독 상태 업데이트
      // 1. 구독 상태 업데이트
      const status = cancel_at_period_end ? 'active' : 'cancelled'
      const updateData: {
        cancel_at_period_end: boolean
        metadata?: { cancel_reason: string }
        status?: string
        cancelled_at?: string
      } = {
        cancel_at_period_end,
        metadata: reason ? { cancel_reason: reason } : undefined
      }

      // 즉시 취소인 경우 status도 변경
      if (!cancel_at_period_end) {
        updateData.status = 'cancelled'
        updateData.cancelled_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscription_id)
        .select()
        .single()

      if (error) throw error
      return data
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
 * 구독 업그레이드/다운그레이드 훅
 */
export function useUpgradeSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ subscription_id, new_plan_id }: UpgradeSubscriptionRequest) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 1. Call Edge Function to create payment intent/order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          planId: new_plan_id,
          userId: user.id,
          subscriptionId: subscription_id // Pass subscription ID for context
        }
      })

      if (orderError) throw orderError
      if (orderData.error) throw new Error(orderData.error)

      // 2. Initialize Toss Payments (Client-side)
      // Note: In a real implementation, you would load the Toss Payments SDK here
      // and call requestPayment with the orderData.
      // For this refactoring step, we will simulate the successful payment flow
      // by calling the update logic directly, but acknowledging the integration point.

      console.log('Payment Order Created:', orderData)

      // SIMULATION: Assume payment success and update DB directly for now
      // In production: 
      // await tossPayments.requestPayment('CARD', { ...orderData })
      // AND/OR the success URL would trigger a webhook or another edge function.

      // For now, we'll just update the subscription plan directly as before, 
      // but now we have the infrastructure to switch to real payments easily.
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          plan_id: new_plan_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription_id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('구독 플랜이 변경되었습니다. (결제 연동 준비 완료)')
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
    },
    onError: (error) => {
      console.error('Error upgrading subscription:', error)
      toast.error(`구독 변경 실패: ${error.message}`)
    }
  })
}

/**
 * 구독 결제 내역 조회 훅
 */
export function useSubscriptionPayments(subscriptionId: string) {
  return useQuery({
    queryKey: subscriptionKeys.payments(subscriptionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select(`
          *,
          subscription:subscriptions (
            id,
            service:services (title),
            plan:subscription_plans (plan_name)
          )
        `)
        .eq('subscription_id', subscriptionId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // 데이터 매핑
      return data.map(payment => ({
        ...payment,
        subscription: {
          id: payment.subscription.id,
          service_title: payment.subscription.service?.title || 'Unknown Service',
          plan_name: payment.subscription.plan?.plan_name || 'Unknown Plan'
        }
      })) as SubscriptionPaymentWithDetails[]
    },
    enabled: !!subscriptionId
  })
}
