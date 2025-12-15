/**
 * 사용량 집계 헬퍼
 *
 * Minu 서비스에서 수신한 사용량 이벤트를 subscription_usage 테이블에 반영합니다.
 * 기존 increment_subscription_usage() DB 함수를 활용합니다.
 *
 * @see spec/events-package-spec.md
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * 서비스별 이벤트 타입 → feature_key 매핑
 */
const EVENT_TO_FEATURE_KEY: Record<string, Record<string, string>> = {
  // Minu Find
  'minu-find': {
    'agent.executed': 'find_ai_insights',
    'opportunity.searched': 'find_market_search',
    'api.usage_reported': 'common_api_calls_per_day',
  },
  // Minu Frame
  'minu-frame': {
    'agent.executed': 'frame_document_generate',
    'api.usage_reported': 'common_api_calls_per_day',
  },
  // Minu Build
  'minu-build': {
    'agent.executed': 'build_task_automation',
    'api.usage_reported': 'common_api_calls_per_day',
  },
  // Minu Keep
  'minu-keep': {
    'agent.executed': 'keep_report_generate',
    'api.usage_reported': 'common_api_calls_per_day',
  },
  // Minu Portal
  'minu-portal': {
    'api.usage_reported': 'common_api_calls_per_day',
  },
}

/**
 * 이벤트 타입에 해당하는 feature_key 조회
 */
function getFeatureKey(serviceId: string, eventType: string): string | null {
  const serviceMapping = EVENT_TO_FEATURE_KEY[serviceId]
  if (!serviceMapping) return null
  return serviceMapping[eventType] || null
}

/**
 * 사용량 카운트 업데이트
 *
 * @param supabase - Supabase 클라이언트 (service_role)
 * @param userId - 사용자 ID
 * @param eventType - 이벤트 타입 (agent.executed, opportunity.searched 등)
 * @param serviceId - 서비스 ID (minu-find, minu-frame 등)
 * @returns 업데이트 결과
 */
export async function updateUsageCount(
  supabase: SupabaseClient,
  userId: string,
  eventType: string,
  serviceId: string
): Promise<{ success: boolean; error?: string; limitExceeded?: boolean }> {
  try {
    // feature_key 매핑
    const featureKey = getFeatureKey(serviceId, eventType)
    if (!featureKey) {
      console.log(`No feature_key mapping for ${serviceId}:${eventType}`)
      return { success: true } // 매핑이 없으면 무시 (정상 처리)
    }

    // 사용자의 활성 구독 조회
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, plan_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (subError || !subscription) {
      console.log(`No active subscription for user: ${userId}`)
      return { success: true } // 구독이 없으면 무시
    }

    // increment_subscription_usage DB 함수 호출
    const { data, error } = await supabase.rpc('increment_subscription_usage', {
      p_subscription_id: subscription.id,
      p_feature_key: featureKey,
      p_increment: 1,
    })

    if (error) {
      // 제한 초과 에러 체크
      if (error.message?.includes('limit exceeded') || error.code === 'P0001') {
        console.warn(`Usage limit exceeded for user ${userId}, feature ${featureKey}`)
        return { success: false, error: 'limit_exceeded', limitExceeded: true }
      }
      throw error
    }

    console.log(`Usage updated: user=${userId}, feature=${featureKey}, result=${JSON.stringify(data)}`)
    return { success: true }
  } catch (error) {
    console.error('Error updating usage count:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 사용량 이벤트 배치 처리
 *
 * 여러 이벤트를 한 번에 처리할 때 사용
 */
export async function updateUsageCountBatch(
  supabase: SupabaseClient,
  events: Array<{ userId: string; eventType: string; serviceId: string }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] }

  for (const event of events) {
    const result = await updateUsageCount(
      supabase,
      event.userId,
      event.eventType,
      event.serviceId
    )

    if (result.success) {
      results.success++
    } else {
      results.failed++
      if (result.error) {
        results.errors.push(`${event.userId}:${event.eventType} - ${result.error}`)
      }
    }
  }

  return results
}

/**
 * 사용량 제한 체크 (이벤트 처리 전 선행 체크용)
 */
export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  eventType: string,
  serviceId: string
): Promise<{ allowed: boolean; currentUsage?: number; limit?: number }> {
  try {
    const featureKey = getFeatureKey(serviceId, eventType)
    if (!featureKey) {
      return { allowed: true } // 매핑이 없으면 허용
    }

    // 사용자의 활성 구독 조회
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, plan_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (subError || !subscription) {
      return { allowed: false } // 구독이 없으면 불허
    }

    // 현재 사용량 조회
    const { data: usage } = await supabase
      .rpc('get_current_usage', {
        p_subscription_id: subscription.id,
        p_feature_key: featureKey,
      })

    // 플랜 제한 조회
    const { data: feature } = await supabase
      .from('plan_features')
      .select('limit_value')
      .eq('plan_id', subscription.plan_id)
      .eq('feature_key', featureKey)
      .single()

    const currentUsage = usage?.used_count || 0
    const limit = feature?.limit_value

    // 제한이 없으면 (null = 무제한) 허용
    if (limit === null || limit === undefined) {
      return { allowed: true, currentUsage }
    }

    return {
      allowed: currentUsage < limit,
      currentUsage,
      limit,
    }
  } catch (error) {
    console.error('Error checking usage limit:', error)
    return { allowed: true } // 에러 시 허용 (fail-open)
  }
}
