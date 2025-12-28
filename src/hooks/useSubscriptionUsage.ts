/**
 * useSubscriptionUsage Hook
 *
 * 구독 사용량 조회 및 관리 훅
 * - 현재 사용자의 구독 사용량 조회
 * - 사용량 증가 mutation 제공
 * - React Query 사용 (실시간 캐싱)
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionsApi, callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

// =====================================================
// Types
// =====================================================

/**
 * 사용량 데이터 타입
 */
export interface UsageData {
  feature_key: string
  feature_name: string // 기능 한글명
  used_count: number
  limit_value: number | null // null = unlimited
  period_start: string // ISO 8601 date
  period_end: string // ISO 8601 date
  percentage: number // 사용률 (0-100)
}

/**
 * 사용량 증가 요청
 */
export interface IncrementUsageRequest {
  feature_key: string
  increment_by?: number // 기본값: 1
}

/**
 * 사용량 초기화 요청 (관리자용)
 */
export interface ResetUsageRequest {
  user_id: string
  feature_key?: string // 지정하지 않으면 전체 초기화
}

// =====================================================
// Query Keys
// =====================================================

export const usageKeys = {
  all: ['subscription-usage'] as const,
  user: (userId: string) => [...usageKeys.all, 'user', userId] as const,
  feature: (userId: string, featureKey: string) =>
    [...usageKeys.all, 'user', userId, featureKey] as const,
}

// =====================================================
// Hooks
// =====================================================

/**
 * 구독 사용량 조회 훅
 *
 * @returns 사용량 데이터 배열, 총 사용량, 로딩 상태, 에러, refetch 함수
 *
 * @example
 * ```tsx
 * const { usage, totalUsed, isLoading, refetch } = useSubscriptionUsage()
 *
 * return (
 *   <div>
 *     <h3>사용량 현황</h3>
 *     {usage.map(item => (
 *       <UsageBar
 *         key={item.feature_key}
 *         label={item.feature_name}
 *         used={item.used_count}
 *         limit={item.limit_value}
 *         percentage={item.percentage}
 *       />
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useSubscriptionUsage() {
  const { user, workersTokens } = useAuth()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: usageKeys.user(user?.id || 'anonymous'),
    queryFn: async () => {
      if (!user || !workersTokens?.accessToken) {
        return {
          usage: [] as UsageData[],
          totalUsed: 0,
        }
      }

      try {
        // 1. 현재 활성 구독 조회
        const { data: subscription, error: subError } = await subscriptionsApi.getCurrent(workersTokens.accessToken)

        if (subError || !subscription) {
          return {
            usage: [] as UsageData[],
            totalUsed: 0,
          }
        }

        const subscriptionData = subscription as {
          id: string;
          current_period_start: string;
          current_period_end: string;
          plan: {
            id: string;
            plan_name: string;
            features: Record<string, unknown>;
          } | null;
        }

        // 2. 플랜 features에서 제한 목록 추출
        const features = subscriptionData.plan?.features
        if (!features) {
          return {
            usage: [] as UsageData[],
            totalUsed: 0,
          }
        }

        // 3. 각 feature별 사용량 조회
        const { data: usageRecords, error: usageError } = await callWorkersApi<Array<{
          feature_key: string;
          used_count: number;
        }>>(`/api/v1/subscriptions/${subscriptionData.id}/usage`, {
          token: workersTokens.accessToken,
        })

        if (usageError) {
          console.error('Error fetching usage:', usageError)
        }

        const usageMap = new Map(
          (usageRecords || []).map((record) => [record.feature_key, record.used_count])
        )

        const usageData: UsageData[] = Object.entries(features).map(([key, limitValue]) => {
          const used = usageMap.get(key) || 0
          const limit = typeof limitValue === 'number' ? limitValue : null
          const percentage = limit === null ? 0 : Math.round((used / limit) * 100)

          return {
            feature_key: key,
            feature_name: getFeatureName(key),
            used_count: used,
            limit_value: limit,
            period_start: subscriptionData.current_period_start,
            period_end: subscriptionData.current_period_end,
            percentage,
          }
        })

        const totalUsed = usageData.reduce((sum, item) => sum + item.used_count, 0)

        return {
          usage: usageData,
          totalUsed,
        }
      } catch (err) {
        console.error('Error fetching subscription usage:', err)
        throw err
      }
    },
    enabled: !!user && !!workersTokens?.accessToken,
    staleTime: 1 * 60 * 1000, // 1분 캐싱
    gcTime: 5 * 60 * 1000, // 5분 가비지 컬렉션
    retry: 2,
  })

  return {
    usage: data?.usage ?? [],
    totalUsed: data?.totalUsed ?? 0,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}

/**
 * 사용량 증가 mutation 훅
 *
 * @returns mutation 함수, 로딩 상태, 에러
 *
 * @example
 * ```tsx
 * const { incrementUsage, isLoading } = useIncrementUsage()
 *
 * const handleSendMessage = async () => {
 *   await incrementUsage({ feature_key: 'ai_chat_messages' })
 *   // ... 메시지 전송 로직
 * }
 * ```
 */
export function useIncrementUsage() {
  const queryClient = useQueryClient()
  const { user, workersTokens } = useAuth()

  const mutation = useMutation({
    mutationFn: async ({ feature_key, increment_by = 1 }: IncrementUsageRequest) => {
      if (!user || !workersTokens?.accessToken) {
        throw new Error('로그인이 필요합니다.')
      }

      // 활성 구독 조회
      const { data: subscription, error: subError } = await subscriptionsApi.getCurrent(workersTokens.accessToken)

      if (subError || !subscription) {
        throw new Error('활성 구독을 찾을 수 없습니다.')
      }

      const subscriptionId = (subscription as { id: string }).id

      // 사용량 증가 API 호출
      const { data, error } = await callWorkersApi<{
        success: boolean;
        error_message?: string;
      }>(`/api/v1/subscriptions/${subscriptionId}/usage/increment`, {
        method: 'POST',
        token: workersTokens.accessToken,
        body: {
          feature_key,
          increment_by,
        },
      })

      if (error) throw new Error(error)

      // 결과 검증
      if (!data?.success) {
        throw new Error(data?.error_message || '사용량 증가에 실패했습니다.')
      }

      return data
    },
    onSuccess: () => {
      // 사용량 쿼리 무효화 (리프레시)
      queryClient.invalidateQueries({ queryKey: usageKeys.user(user?.id || '') })
      toast.success('사용량이 업데이트되었습니다.')
    },
    onError: (error: Error) => {
      console.error('Error incrementing usage:', error)
      toast.error(`사용량 업데이트 실패: ${error.message}`)
    },
  })

  return {
    incrementUsage: mutation.mutate,
    incrementUsageAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  }
}

/**
 * 사용량 초기화 mutation 훅 (관리자용)
 *
 * @returns mutation 함수, 로딩 상태, 에러
 *
 * @example
 * ```tsx
 * const { resetUsage } = useResetUsage()
 *
 * const handleResetUser = () => {
 *   resetUsage({ user_id: 'user-uuid', feature_key: 'ai_chat_messages' })
 * }
 * ```
 */
export function useResetUsage() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  const mutation = useMutation({
    mutationFn: async ({ user_id, feature_key }: ResetUsageRequest) => {
      if (!workersTokens?.accessToken) {
        throw new Error('로그인이 필요합니다.')
      }

      // 관리자 전용 사용량 초기화 API 호출
      const { data, error } = await callWorkersApi<{
        success: boolean;
        message: string;
      }>('/api/v1/admin/subscriptions/reset-usage', {
        method: 'POST',
        token: workersTokens.accessToken,
        body: {
          user_id,
          feature_key,
        },
      })

      if (error) {
        if (error.includes('권한') || error.includes('403')) {
          throw new Error('관리자 권한이 필요합니다.')
        }
        throw new Error(error)
      }

      return data || { success: true, message: '사용량이 초기화되었습니다.' }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: usageKeys.user(variables.user_id) })
      toast.success('사용량이 초기화되었습니다.')
    },
    onError: (error: Error) => {
      console.error('Error resetting usage:', error)
      toast.error(`사용량 초기화 실패: ${error.message}`)
    },
  })

  return {
    resetUsage: mutation.mutate,
    resetUsageAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * feature_key를 한글 기능명으로 변환
 */
function getFeatureName(featureKey: string): string {
  const FEATURE_NAMES: Record<string, string> = {
    ai_chat_messages: 'AI 채팅 메시지',
    document_export: '문서 내보내기',
    project_count: '프로젝트 수',
    team_members: '팀 멤버 수',
    storage_mb: '저장공간 (MB)',
    api_calls: 'API 호출',
    rag_documents: 'RAG 문서 수',
    rag_search: 'RAG 검색',
    claude_tokens: 'Claude 토큰',
    image_analysis: '이미지 분석',
  }

  return FEATURE_NAMES[featureKey] || featureKey
}

/**
 * 특정 기능의 사용량만 조회하는 훅
 */
export function useFeatureUsage(featureKey: string) {
  const { usage, isLoading, error } = useSubscriptionUsage()

  const featureUsage = usage.find((item) => item.feature_key === featureKey)

  return {
    usage: featureUsage,
    isLoading,
    error,
  }
}
