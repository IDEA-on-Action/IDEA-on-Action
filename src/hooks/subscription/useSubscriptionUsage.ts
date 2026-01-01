/**
 * 구독 사용량 조회 훅
 *
 * @description 현재 구독의 기능별 사용량 및 제한 조회
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery } from '@tanstack/react-query';
import { subscriptionsApi, callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';

/**
 * 기능별 사용량 정보
 */
export interface FeatureUsage {
  /** 기능 키 */
  feature_key: string;
  /** 기능 이름 (한글) */
  feature_name: string;
  /** 사용량 */
  usage_count: number;
  /** 제한 */
  limit: number;
  /** 무제한 여부 */
  is_unlimited: boolean;
  /** 사용률 (0~100) */
  usage_percentage: number;
}

/**
 * 구독 사용량 요약
 */
export interface SubscriptionUsageSummary {
  /** 구독 ID */
  subscription_id: string;
  /** 플랜 이름 */
  plan_name: string;
  /** 기능별 사용량 */
  features: FeatureUsage[];
  /** 다음 리셋 날짜 */
  next_reset_date: string;
}

/**
 * 기능 키 → 한글 이름 매핑
 */
const FEATURE_NAMES: Record<string, string> = {
  api_calls: 'API 호출',
  storage_gb: '저장 공간 (GB)',
  team_members: '팀 멤버',
  projects: '프로젝트',
  exports: '데이터 내보내기',
  ai_queries: 'AI 쿼리',
};

/**
 * 구독 사용량 조회 훅
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useSubscriptionUsage();
 *
 * data?.features.forEach(feature => {
 *   console.log(`${feature.feature_name}: ${feature.usage_count} / ${feature.limit}`);
 * });
 * ```
 */
export function useSubscriptionUsage() {
  const { user, workersTokens } = useAuth();

  return useQuery({
    queryKey: ['subscription_usage', user?.id],
    queryFn: async (): Promise<SubscriptionUsageSummary | null> => {
      if (!user || !workersTokens?.accessToken) throw new Error('로그인이 필요합니다.');

      // 1. 활성 구독 조회
      const { data: subscription, error: subError } = await subscriptionsApi.getCurrent(
        workersTokens.accessToken
      );

      if (subError) throw new Error(subError);
      if (!subscription) return null;

      const subscriptionData = subscription as {
        id: string;
        plan: {
          id: string;
          plan_name: string;
          features: Record<string, unknown>;
        } | null;
      };

      const plan = subscriptionData.plan;
      if (!plan) return null;

      // 2. 사용량 조회 (Workers API)
      const { data: usageData, error: usageError } = await callWorkersApi<Array<{
        feature_key: string;
        usage_count: number;
      }>>(`/api/v1/subscriptions/${subscriptionData.id}/usage`, {
        token: workersTokens.accessToken,
      });

      if (usageError) {
        console.error('Error fetching usage data:', usageError);
      }

      // 3. 기능별 사용량 매핑
      const features: FeatureUsage[] = Object.entries(plan.features).map(
        ([feature_key, featureValue]) => {
          const usage = usageData?.find((u) => u.feature_key === feature_key);
          const usageCount = usage?.usage_count ?? 0;

          // 무제한 또는 true
          if (featureValue === -1 || featureValue === true) {
            return {
              feature_key,
              feature_name: FEATURE_NAMES[feature_key] ?? feature_key,
              usage_count: usageCount,
              limit: -1,
              is_unlimited: true,
              usage_percentage: 0,
            };
          }

          // false
          if (featureValue === false) {
            return {
              feature_key,
              feature_name: FEATURE_NAMES[feature_key] ?? feature_key,
              usage_count: 0,
              limit: 0,
              is_unlimited: false,
              usage_percentage: 0,
            };
          }

          // 숫자 제한
          const limit = Number(featureValue);
          const percentage = limit > 0 ? Math.min(100, (usageCount / limit) * 100) : 0;

          return {
            feature_key,
            feature_name: FEATURE_NAMES[feature_key] ?? feature_key,
            usage_count: usageCount,
            limit,
            is_unlimited: false,
            usage_percentage: Math.round(percentage),
          };
        }
      );

      // 4. 다음 리셋 날짜 계산 (매월 1일)
      const now = new Date();
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      return {
        subscription_id: subscriptionData.id,
        plan_name: plan.plan_name,
        features,
        next_reset_date: nextReset.toISOString(),
      };
    },
    enabled: !!user && !!workersTokens?.accessToken,
    staleTime: 1000 * 60 * 5, // 5분 캐싱
  });
}

export default useSubscriptionUsage;
