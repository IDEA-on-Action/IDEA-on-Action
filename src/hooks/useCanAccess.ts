/**
 * useCanAccess Hook
 *
 * 기능 접근 권한 확인 훅
 * - feature_key를 받아 해당 기능 접근 가능 여부 반환
 * - subscription_plans.features에서 제한 확인
 * - React Query 사용 (5분 캐싱)
 * - 로그인 안 됨 → Free 플랜 기준 적용
 *
 * @description
 * 사용자의 구독 플랜에 따라 특정 기능에 대한 접근 권한을 확인합니다.
 * Free 플랜 사용자에게는 기본 제한이 적용되며, 유료 플랜 사용자는
 * subscription_plans.features에 정의된 제한을 따릅니다.
 *
 * @module hooks/useCanAccess
 *
 * @example
 * ```tsx
 * function ChatWidget() {
 *   const { canAccess, remaining, limit, isLoading } = useCanAccess('ai_chat_messages');
 *
 *   if (isLoading) return <Spinner />;
 *
 *   if (!canAccess) {
 *     return <UpgradePrompt feature="AI 채팅 메시지" />;
 *   }
 *
 *   return (
 *     <div>
 *       <Chat />
 *       {remaining !== null && (
 *         <p>남은 메시지: {remaining}/{limit}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

// =====================================================
// Types
// =====================================================

interface FeatureLimit {
  feature_key: string
  limit_value: number | null // null = unlimited
  used_count: number
}

interface CanAccessResult {
  canAccess: boolean
  remaining: number | null // null = unlimited
  limit: number | null // null = unlimited
  isLoading: boolean
  error: Error | null
}

// Free 플랜 기본 제한
const FREE_PLAN_LIMITS: Record<string, number | null> = {
  'ai_chat_messages': 10,
  'document_export': 5,
  'project_count': 1,
  'team_members': 1,
  'storage_mb': 100,
  'api_calls': null, // unlimited for free (기본 기능)
}

// =====================================================
// Query Keys
// =====================================================

export const canAccessKeys = {
  all: ['can-access'] as const,
  feature: (featureKey: string, userId?: string) =>
    [...canAccessKeys.all, featureKey, userId] as const,
}

// =====================================================
// Hook
// =====================================================

/**
 * 기능 접근 권한 확인 훅
 *
 * @param featureKey - 확인할 기능 키 (예: 'ai_chat_messages', 'document_export')
 * @returns CanAccessResult - 접근 가능 여부, 남은 횟수, 제한, 로딩 상태, 에러
 *
 * @example
 * ```tsx
 * const { canAccess, remaining, limit } = useCanAccess('ai_chat_messages')
 *
 * if (!canAccess) {
 *   return <UpgradePrompt feature="AI 채팅" />
 * }
 *
 * return <ChatWidget remainingMessages={remaining} />
 * ```
 */
export function useCanAccess(featureKey: string): CanAccessResult {
  const { user } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: canAccessKeys.feature(featureKey, user?.id),
    queryFn: async () => {
      // 로그인하지 않은 경우 Free 플랜 적용
      if (!user) {
        const freeLimit = FREE_PLAN_LIMITS[featureKey] ?? null
        return {
          canAccess: freeLimit === null || freeLimit > 0,
          remaining: freeLimit,
          limit: freeLimit,
          used_count: 0,
        }
      }

      try {
        // 1. 현재 사용자의 활성 구독 조회
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select(`
            id,
            plan:subscription_plans (
              id,
              plan_name,
              features
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // 구독이 없으면 Free 플랜 적용
        if (subError || !subscription) {
          const freeLimit = FREE_PLAN_LIMITS[featureKey] ?? null
          return {
            canAccess: freeLimit === null || freeLimit > 0,
            remaining: freeLimit,
            limit: freeLimit,
            used_count: 0,
          }
        }

        // 2. 플랜 features에서 제한 확인
        const features = subscription.plan?.features as Record<string, unknown> | null
        const limitValue = features?.[featureKey] as number | null | undefined

        // feature_key가 플랜에 없으면 무제한 허용
        if (limitValue === undefined) {
          return {
            canAccess: true,
            remaining: null,
            limit: null,
            used_count: 0,
          }
        }

        // 3. 현재 사용량 조회 (subscription_usage 테이블에서 조회)
        // get_current_usage 함수를 사용하여 현재 기간의 사용량 조회
        const { data: usageData, error: usageError } = await supabase
          .rpc('get_current_usage', {
            p_subscription_id: subscription.id,
            p_feature_key: featureKey,
          })
          .single()

        // 사용량 조회 실패 시 0으로 처리 (제한은 유지)
        const usedCount = usageError ? 0 : (usageData?.used_count ?? 0)

        // 4. 접근 가능 여부 계산
        const limit = limitValue === null ? null : limitValue
        const remaining = limit === null ? null : Math.max(0, limit - usedCount)
        const canAccess = limit === null || remaining > 0

        return {
          canAccess,
          remaining,
          limit,
          used_count: usedCount,
        }
      } catch (err) {
        console.error('Error checking feature access:', err)

        // 에러 시 Free 플랜으로 폴백
        const freeLimit = FREE_PLAN_LIMITS[featureKey] ?? null
        return {
          canAccess: freeLimit === null || freeLimit > 0,
          remaining: freeLimit,
          limit: freeLimit,
          used_count: 0,
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5분 캐싱
    gcTime: 10 * 60 * 1000, // 10분 가비지 컬렉션
    retry: 1,
  })

  return {
    canAccess: data?.canAccess ?? false,
    remaining: data?.remaining ?? 0,
    limit: data?.limit ?? 0,
    isLoading,
    error: error as Error | null,
  }
}

/**
 * 여러 기능의 접근 권한을 한 번에 확인하는 훅
 *
 * @param featureKeys - 확인할 기능 키 배열
 * @returns Record<string, CanAccessResult> - 기능별 접근 권한 맵
 *
 * @example
 * ```tsx
 * const permissions = useCanAccessMultiple(['ai_chat_messages', 'document_export'])
 *
 * if (!permissions.ai_chat_messages.canAccess) {
 *   return <UpgradePrompt />
 * }
 * ```
 */
export function useCanAccessMultiple(
  featureKeys: string[]
): Record<string, CanAccessResult> {
  const results: Record<string, CanAccessResult> = {}

  for (const key of featureKeys) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[key] = useCanAccess(key)
  }

  return results
}

/**
 * 기능 사용 가능 여부만 간단히 확인하는 훅
 *
 * @param featureKey - 확인할 기능 키
 * @returns boolean - 사용 가능 여부
 *
 * @example
 * ```tsx
 * const canChat = useHasAccess('ai_chat_messages')
 *
 * return (
 *   <Button disabled={!canChat}>
 *     AI 채팅 시작
 *   </Button>
 * )
 * ```
 */
export function useHasAccess(featureKey: string): boolean {
  const { canAccess } = useCanAccess(featureKey)
  return canAccess
}
