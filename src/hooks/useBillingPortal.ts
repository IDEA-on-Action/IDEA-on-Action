/**
 * useBillingPortal Hook
 *
 * 결제 포털 관리 훅
 * - 현재 플랜, 결제 수단, 인보이스 조회
 * - 결제 포털 열기 (토스페이먼츠 빌링)
 * - 구독 취소, 플랜 변경
 *
 * @description
 * 사용자의 구독 및 결제 정보를 관리하는 통합 훅입니다.
 * 토스페이먼츠와 연동하여 결제 수단을 관리하고, 구독 플랜을 변경하거나
 * 취소할 수 있습니다. 인보이스 조회 및 다운로드 기능도 제공합니다.
 *
 * @module hooks/useBillingPortal
 *
 * @example
 * ```tsx
 * function BillingPage() {
 *   const {
 *     currentPlan,
 *     nextBillingDate,
 *     paymentMethod,
 *     invoices,
 *     isLoading,
 *     openPortal,
 *     cancelSubscription,
 *     changePlan,
 *   } = useBillingPortal();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <h2>현재 플랜: {currentPlan?.plan.plan_name}</h2>
 *       <p>다음 결제일: {nextBillingDate}</p>
 *       <Button onClick={openPortal}>결제 수단 관리</Button>
 *       <Button onClick={() => changePlan('pro-plan-id')}>
 *         Pro 플랜으로 변경
 *       </Button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import type { SubscriptionWithPlan } from '@/types/subscription.types'

// =====================================================
// Types
// =====================================================

/**
 * 인보이스 (청구서) 타입
 */
export interface Invoice {
  id: string
  invoice_number: string
  amount: number
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  billing_date: string // ISO 8601 date
  paid_at: string | null // ISO 8601 date
  pdf_url: string | null
  items: InvoiceItem[]
}

/**
 * 인보이스 항목
 */
export interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

/**
 * 결제 수단 타입
 */
export interface PaymentMethod {
  id: string
  type: 'card' | 'bank_transfer' | 'virtual_account'
  card_number?: string // 마스킹된 카드번호 (예: **** **** **** 1234)
  card_type?: string // 카드사 (예: 신한, 국민, 삼성)
  bank_name?: string // 은행명
  account_number?: string // 마스킹된 계좌번호
  is_default: boolean
  created_at: string
}

/**
 * 빌링 포털 데이터
 */
export interface BillingPortalData {
  currentPlan: SubscriptionWithPlan | null
  nextBillingDate: string | null
  paymentMethod: PaymentMethod | null
  invoices: Invoice[]
  isLoading: boolean
  error: Error | null
}

// =====================================================
// Query Keys
// =====================================================

export const billingKeys = {
  all: ['billing-portal'] as const,
  user: (userId: string) => [...billingKeys.all, 'user', userId] as const,
  invoices: (userId: string) => [...billingKeys.all, 'invoices', userId] as const,
  paymentMethods: (userId: string) =>
    [...billingKeys.all, 'payment-methods', userId] as const,
}

// =====================================================
// Hook
// =====================================================

/**
 * 결제 포털 훅
 *
 * @returns 현재 플랜, 결제 정보, 인보이스, 포털 관리 함수
 *
 * @example
 * ```tsx
 * function BillingPage() {
 *   const {
 *     currentPlan,
 *     nextBillingDate,
 *     paymentMethod,
 *     invoices,
 *     openPortal,
 *     cancelSubscription,
 *     changePlan,
 *   } = useBillingPortal()
 *
 *   return (
 *     <div>
 *       <h2>{currentPlan?.plan.plan_name} 플랜</h2>
 *       <p>다음 결제일: {nextBillingDate}</p>
 *       <Button onClick={openPortal}>결제 수단 관리</Button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useBillingPortal(): BillingPortalData & {
  openPortal: () => void
  cancelSubscription: () => Promise<void>
  changePlan: (planId: string) => Promise<void>
  refetch: () => void
} {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // 1. 현재 플랜 조회
  const {
    data: currentPlan,
    isLoading: isPlanLoading,
    error: planError,
    refetch: refetchPlan,
  } = useQuery({
    queryKey: billingKeys.user(user?.id || ''),
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
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
          ),
          billing_key:billing_keys (
            *
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // 구독이 없는 경우
          return null
        }
        throw error
      }

      return data as unknown as SubscriptionWithPlan
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2분 캐싱
  })

  // 2. 인보이스 목록 조회
  const {
    data: invoices,
    isLoading: isInvoicesLoading,
    error: invoicesError,
  } = useQuery({
    queryKey: billingKeys.invoices(user?.id || ''),
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('subscription_id', currentPlan?.id || '')
        .order('created_at', { ascending: false })
        .limit(12) // 최근 12개월

      if (error) throw error

      // 인보이스 형식으로 변환
      return data.map((payment) => ({
        id: payment.id,
        invoice_number: `INV-${payment.id.slice(0, 8).toUpperCase()}`,
        amount: payment.amount,
        status: payment.status as 'pending' | 'paid' | 'failed' | 'cancelled',
        billing_date: payment.created_at || '',
        paid_at: payment.status === 'success' ? payment.created_at : null,
        // PDF URL: Edge Function 또는 PDF 생성 서비스 URL
        // 예시: `/api/invoices/${payment.id}/pdf` 또는 Supabase Storage URL
        pdf_url: payment.status === 'success'
          ? `/api/invoices/${payment.id}/pdf`
          : null,
        items: [
          {
            description: currentPlan?.plan.plan_name || 'Subscription',
            quantity: 1,
            unit_price: payment.amount,
            total: payment.amount,
          },
        ],
      })) as Invoice[]
    },
    enabled: !!user && !!currentPlan,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })

  // 3. 결제 수단 조회
  const {
    data: paymentMethod,
    isLoading: isPaymentMethodLoading,
    error: paymentMethodError,
  } = useQuery({
    queryKey: billingKeys.paymentMethods(user?.id || ''),
    queryFn: async () => {
      if (!user || !currentPlan?.billing_key) return null

      const billingKey = currentPlan.billing_key

      return {
        id: billingKey.id,
        type: 'card' as const,
        card_number: billingKey.card_number || undefined,
        card_type: billingKey.card_type || undefined,
        is_default: billingKey.is_active || false,
        created_at: billingKey.created_at || '',
      } as PaymentMethod
    },
    enabled: !!user && !!currentPlan,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })

  // 4. 결제 포털 열기 (토스페이먼츠 빌링)
  const openPortal = () => {
    if (!currentPlan) {
      toast.error('활성 구독이 없습니다.')
      return
    }

    // 토스페이먼츠 빌링키 관리 페이지 열기
    // Note: 실제 구현 시 아래 코드 활성화
    // const openTossPaymentsBilling = async () => {
    //   const { loadTossPayments } = await import('@tosspayments/payment-sdk');
    //   const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
    //   const tossPayments = await loadTossPayments(clientKey);
    //   await tossPayments.requestBillingAuth({
    //     customerKey: user?.id,
    //     successUrl: `${window.location.origin}/billing/success`,
    //     failUrl: `${window.location.origin}/billing/fail`,
    //   });
    // };
    // openTossPaymentsBilling();

    toast.info('결제 포털 기능은 개발 중입니다.')
    console.log('Opening billing portal for subscription:', currentPlan.id)
  }

  // 5. 구독 취소 mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!user || !currentPlan) {
        throw new Error('활성 구독이 없습니다.')
      }

      // 구독 취소 (기간 종료 시 취소)
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', currentPlan.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('구독이 취소되었습니다. 현재 기간 종료 시 해지됩니다.')
      queryClient.invalidateQueries({ queryKey: billingKeys.user(user?.id || '') })
    },
    onError: (error: Error) => {
      console.error('Error cancelling subscription:', error)
      toast.error(`구독 취소 실패: ${error.message}`)
    },
  })

  // 6. 플랜 변경 mutation
  const changePlanMutation = useMutation({
    mutationFn: async (newPlanId: string) => {
      if (!user || !currentPlan) {
        throw new Error('활성 구독이 없습니다.')
      }

      // 플랜 변경
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          plan_id: newPlanId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentPlan.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('플랜이 변경되었습니다.')
      queryClient.invalidateQueries({ queryKey: billingKeys.user(user?.id || '') })
    },
    onError: (error: Error) => {
      console.error('Error changing plan:', error)
      toast.error(`플랜 변경 실패: ${error.message}`)
    },
  })

  // 7. 데이터 병합
  const isLoading = isPlanLoading || isInvoicesLoading || isPaymentMethodLoading
  const error = planError || invoicesError || paymentMethodError

  return {
    currentPlan: currentPlan || null,
    nextBillingDate: currentPlan?.next_billing_date || null,
    paymentMethod: paymentMethod || null,
    invoices: invoices || [],
    isLoading,
    error: error as Error | null,
    openPortal,
    cancelSubscription: cancelMutation.mutateAsync,
    changePlan: changePlanMutation.mutateAsync,
    refetch: refetchPlan,
  }
}

/**
 * 인보이스 PDF 다운로드 훅
 *
 * @returns PDF 다운로드 함수
 *
 * @example
 * ```tsx
 * const { downloadInvoice, isLoading } = useDownloadInvoice()
 *
 * <Button onClick={() => downloadInvoice(invoice.id)}>
 *   PDF 다운로드
 * </Button>
 * ```
 */
export function useDownloadInvoice() {
  const mutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      // Edge Function 또는 PDF 생성 서비스 호출
      // Note: 실제 구현 시 아래 코드 활성화
      // const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
      //   body: { invoice_id: invoiceId },
      // });
      // if (error) throw error;
      //
      // // PDF 다운로드
      // const link = document.createElement('a');
      // link.href = data.pdf_url;
      // link.download = `invoice-${invoiceId}.pdf`;
      // link.click();

      console.log('Downloading invoice:', invoiceId)
      toast.info('인보이스 PDF 생성 기능은 개발 중입니다.')
    },
    onError: (error: Error) => {
      console.error('Error downloading invoice:', error)
      toast.error(`인보이스 다운로드 실패: ${error.message}`)
    },
  })

  return {
    downloadInvoice: mutation.mutate,
    downloadInvoiceAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
  }
}

/**
 * 결제 수단 추가/변경 훅
 *
 * @returns 결제 수단 추가 함수
 *
 * @example
 * ```tsx
 * const { addPaymentMethod } = useAddPaymentMethod()
 *
 * const handleAddCard = async () => {
 *   await addPaymentMethod({ type: 'card' })
 * }
 * ```
 */
export function useAddPaymentMethod() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const mutation = useMutation({
    mutationFn: async (paymentMethodData: { type: 'card' | 'bank_transfer' }) => {
      if (!user) {
        throw new Error('로그인이 필요합니다.')
      }

      // 토스페이먼츠 빌링키 발급
      // Note: 실제 구현 시 아래 코드 활성화
      // const { loadTossPayments } = await import('@tosspayments/payment-sdk');
      // const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
      // const tossPayments = await loadTossPayments(clientKey);
      // const result = await tossPayments.requestBillingAuth({
      //   customerKey: user.id,
      //   successUrl: `${window.location.origin}/billing/payment-method/success`,
      //   failUrl: `${window.location.origin}/billing/payment-method/fail`,
      // });
      //
      // // 빌링키를 billing_keys 테이블에 저장
      // await supabase.from('billing_keys').insert({
      //   user_id: user.id,
      //   billing_key: result.billingKey,
      //   card_number: result.card?.number,
      //   card_type: result.card?.issuerCode,
      // });

      console.log('Adding payment method:', paymentMethodData)
      toast.info('결제 수단 추가 기능은 개발 중입니다.')
    },
    onSuccess: () => {
      toast.success('결제 수단이 추가되었습니다.')
      queryClient.invalidateQueries({ queryKey: billingKeys.paymentMethods(user?.id || '') })
    },
    onError: (error: Error) => {
      console.error('Error adding payment method:', error)
      toast.error(`결제 수단 추가 실패: ${error.message}`)
    },
  })

  return {
    addPaymentMethod: mutation.mutate,
    addPaymentMethodAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
  }
}
