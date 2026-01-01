/**
 * 결제 포털 훅
 *
 * @description 구독 플랜 변경, 결제 수단 관리, 구독 취소 등
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi, callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';
import type {
  CancelSubscriptionRequest,
  UpgradeSubscriptionRequest,
} from '@/types/subscription.types';

/**
 * 결제 포털 훅 반환 타입
 */
export interface UseBillingPortalResult {
  /** 플랜 업그레이드/다운그레이드 */
  upgradePlan: (request: UpgradeSubscriptionRequest) => Promise<void>;
  upgradeLoading: boolean;

  /** 구독 취소 */
  cancelSubscription: (request: CancelSubscriptionRequest) => Promise<void>;
  cancelLoading: boolean;

  /** 구독 갱신 (만료된 구독 재활성화) */
  renewSubscription: (subscriptionId: string) => Promise<void>;
  renewLoading: boolean;

  /** 결제 수단 업데이트 */
  updatePaymentMethod: (subscriptionId: string, billingKeyId: string) => Promise<void>;
  updatePaymentLoading: boolean;
}

/**
 * 결제 포털 훅
 *
 * @example
 * ```tsx
 * const { upgradePlan, cancelSubscription, upgradeLoading } = useBillingPortal();
 *
 * // 플랜 업그레이드
 * await upgradePlan({
 *   subscription_id: 'sub_123',
 *   new_plan_id: 'plan_pro',
 * });
 * ```
 */
export function useBillingPortal(): UseBillingPortalResult {
  const { user, workersTokens } = useAuth();
  const queryClient = useQueryClient();

  // 플랜 업그레이드/다운그레이드
  const upgradeMutation = useMutation({
    mutationFn: async ({ subscription_id, new_plan_id, prorate }: UpgradeSubscriptionRequest) => {
      if (!user || !workersTokens?.accessToken) throw new Error('로그인이 필요합니다.');

      const { data, error } = await subscriptionsApi.changePlan(
        workersTokens.accessToken,
        subscription_id,
        { new_plan_id }
      );

      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      toast.success('플랜이 변경되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['feature_access'] });
    },
    onError: (error) => {
      console.error('Error upgrading plan:', error);
      toast.error('플랜 변경 중 오류가 발생했습니다.');
    },
  });

  // 구독 취소
  const cancelMutation = useMutation({
    mutationFn: async ({
      subscription_id,
      cancel_at_period_end,
      reason,
    }: CancelSubscriptionRequest) => {
      if (!user || !workersTokens?.accessToken) throw new Error('로그인이 필요합니다.');

      const { data, error } = await subscriptionsApi.cancel(
        workersTokens.accessToken,
        subscription_id,
        {
          cancel_immediately: !cancel_at_period_end,
          reason,
        }
      );

      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (_, variables) => {
      const message = variables.cancel_at_period_end
        ? '현재 주기 종료 시 구독이 취소됩니다.'
        : '구독이 즉시 취소되었습니다.';
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (error) => {
      console.error('Error cancelling subscription:', error);
      toast.error('구독 취소 중 오류가 발생했습니다.');
    },
  });

  // 구독 갱신
  const renewMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      if (!user || !workersTokens?.accessToken) throw new Error('로그인이 필요합니다.');

      // 만료된 구독을 다시 활성화
      const { data, error } = await subscriptionsApi.resume(
        workersTokens.accessToken,
        subscriptionId
      );

      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      toast.success('구독이 갱신되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['feature_access'] });
    },
    onError: (error) => {
      console.error('Error renewing subscription:', error);
      toast.error('구독 갱신 중 오류가 발생했습니다.');
    },
  });

  // 결제 수단 업데이트
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ subscriptionId, billingKeyId }: { subscriptionId: string; billingKeyId: string }) => {
      if (!user || !workersTokens?.accessToken) throw new Error('로그인이 필요합니다.');

      const { data, error } = await subscriptionsApi.updatePayment(
        workersTokens.accessToken,
        subscriptionId,
        { billing_key_id: billingKeyId }
      );

      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      toast.success('결제 수단이 업데이트되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (error) => {
      console.error('Error updating payment method:', error);
      toast.error('결제 수단 업데이트 중 오류가 발생했습니다.');
    },
  });

  return {
    upgradePlan: upgradeMutation.mutateAsync,
    upgradeLoading: upgradeMutation.isPending,

    cancelSubscription: cancelMutation.mutateAsync,
    cancelLoading: cancelMutation.isPending,

    renewSubscription: renewMutation.mutateAsync,
    renewLoading: renewMutation.isPending,

    updatePaymentMethod: (subscriptionId: string, billingKeyId: string) =>
      updatePaymentMutation.mutateAsync({ subscriptionId, billingKeyId }),
    updatePaymentLoading: updatePaymentMutation.isPending,
  };
}

export default useBillingPortal;
