/**
 * 기능별 접근 권한 확인 훅
 *
 * @description 구독 플랜과 기능 키를 기반으로 접근 권한 및 사용량 확인
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery } from '@tanstack/react-query';
import { subscriptionsApi, callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * 기능 접근 권한 결과
 */
export interface CanAccessResult {
  /** 접근 가능 여부 */
  canAccess: boolean;
  /** 남은 사용량 */
  remaining: number;
  /** 총 사용 제한 */
  limit: number;
  /** 무제한 여부 */
  isUnlimited: boolean;
  /** 로딩 중 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 현재 플랜 */
  currentPlan?: string;
  /** 필요한 플랜 */
  requiredPlan?: string;
}

/**
 * 기능별 접근 권한 확인 훅
 *
 * @param feature_key - 기능 키 (예: 'api_calls', 'storage_gb', 'team_members')
 *
 * @example
 * ```tsx
 * const { canAccess, remaining, limit, isUnlimited } = useCanAccess('api_calls');
 *
 * if (!canAccess) {
 *   return <UpgradePrompt feature_key="api_calls" />;
 * }
 * ```
 */
export function useCanAccess(feature_key: string): CanAccessResult {
  const { user, workersTokens } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['feature_access', feature_key, user?.id],
    queryFn: async () => {
      if (!user || !workersTokens?.accessToken) throw new Error('로그인이 필요합니다.');

      // 1. 사용자의 활성 구독 조회
      const { data: subscription, error: subError } = await subscriptionsApi.getCurrent(
        workersTokens.accessToken
      );

      if (subError) throw new Error(subError);

      // 구독이 없으면 접근 불가
      if (!subscription) {
        return {
          canAccess: false,
          remaining: 0,
          limit: 0,
          isUnlimited: false,
          currentPlan: undefined,
          requiredPlan: 'Basic',
        };
      }

      const subscriptionData = subscription as {
        id: string;
        plan: {
          id: string;
          plan_name: string;
          features: Record<string, unknown>;
        } | null;
      };

      const plan = subscriptionData.plan;
      if (!plan) {
        return {
          canAccess: false,
          remaining: 0,
          limit: 0,
          isUnlimited: false,
          currentPlan: undefined,
          requiredPlan: 'Basic',
        };
      }

      // 2. 플랜의 features에서 해당 기능 확인
      const featureValue = plan.features[feature_key];

      // 기능이 플랜에 없으면 접근 불가
      if (featureValue === undefined) {
        return {
          canAccess: false,
          remaining: 0,
          limit: 0,
          isUnlimited: false,
          currentPlan: plan.plan_name,
          requiredPlan: 'Pro',
        };
      }

      // 무제한(-1) 또는 true인 경우
      if (featureValue === -1 || featureValue === true) {
        return {
          canAccess: true,
          remaining: -1,
          limit: -1,
          isUnlimited: true,
          currentPlan: plan.plan_name,
        };
      }

      // boolean false인 경우
      if (featureValue === false) {
        return {
          canAccess: false,
          remaining: 0,
          limit: 0,
          isUnlimited: false,
          currentPlan: plan.plan_name,
          requiredPlan: 'Pro',
        };
      }

      // 숫자 제한인 경우 - 사용량 조회 필요
      const limit = Number(featureValue);
      if (isNaN(limit)) {
        return {
          canAccess: false,
          remaining: 0,
          limit: 0,
          isUnlimited: false,
          currentPlan: plan.plan_name,
        };
      }

      // 3. 현재 사용량 조회 (Workers API)
      const { data: usageData, error: usageError } = await callWorkersApi<{
        feature_key: string;
        usage_count: number;
      }>(`/api/v1/subscriptions/${subscriptionData.id}/usage/${feature_key}`, {
        token: workersTokens.accessToken,
      });

      if (usageError) {
        // 사용량 레코드가 없는 경우 (아직 사용 안 함)
        if (usageError.includes('not found') || usageError.includes('없')) {
          const remaining = limit;
          return {
            canAccess: remaining > 0,
            remaining,
            limit,
            isUnlimited: false,
            currentPlan: plan.plan_name,
          };
        }
        throw new Error(usageError);
      }

      const usageCount = usageData?.usage_count ?? 0;
      const remaining = Math.max(0, limit - usageCount);

      return {
        canAccess: remaining > 0,
        remaining,
        limit,
        isUnlimited: false,
        currentPlan: plan.plan_name,
      };
    },
    enabled: !!user && !!workersTokens?.accessToken && !!feature_key,
    staleTime: 1000 * 60, // 1분 캐싱
  });

  return {
    canAccess: data?.canAccess ?? false,
    remaining: data?.remaining ?? 0,
    limit: data?.limit ?? 0,
    isUnlimited: data?.isUnlimited ?? false,
    isLoading,
    error: error ? new Error(String(error)) : null,
    currentPlan: data?.currentPlan,
    requiredPlan: data?.requiredPlan,
  };
}

export default useCanAccess;
