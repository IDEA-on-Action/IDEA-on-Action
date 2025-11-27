/**
 * 기능별 접근 권한 확인 훅
 *
 * @description 구독 플랜과 기능 키를 기반으로 접근 권한 및 사용량 확인
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['feature_access', feature_key, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다.');

      // 1. 사용자의 활성 구독 조회
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans (
            id,
            plan_name,
            features
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (subError) throw subError;

      // 구독이 없으면 접근 불가
      if (!subscriptions || subscriptions.length === 0) {
        return {
          canAccess: false,
          remaining: 0,
          limit: 0,
          isUnlimited: false,
          currentPlan: undefined,
          requiredPlan: 'Basic',
        };
      }

      const subscription = subscriptions[0];
      const plan = subscription.plan as unknown as {
        id: string;
        plan_name: string;
        features: Record<string, unknown>;
      };

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

      // 3. 현재 사용량 조회 (subscription_usage 테이블)
      const { data: usage, error: usageError } = await supabase
        .from('subscription_usage')
        .select('usage_count')
        .eq('subscription_id', subscription.id)
        .eq('feature_key', feature_key)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        // PGRST116 = no rows, 정상 케이스 (아직 사용 안 함)
        throw usageError;
      }

      const usageCount = usage?.usage_count ?? 0;
      const remaining = Math.max(0, limit - usageCount);

      return {
        canAccess: remaining > 0,
        remaining,
        limit,
        isUnlimited: false,
        currentPlan: plan.plan_name,
      };
    },
    enabled: !!user && !!feature_key,
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
