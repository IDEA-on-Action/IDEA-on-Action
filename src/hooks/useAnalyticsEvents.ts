/**
 * Phase 14: 분석 이벤트 훅
 * 사용자 행동 분석, 퍼널 분석, 이탈률 계산
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// ============================================
// 타입 정의
// ============================================

export interface AnalyticsEvent {
  id: string
  user_id: string | null
  session_id: string
  event_name: string
  event_params: Record<string, unknown>
  page_url: string | null
  referrer: string | null
  user_agent: string | null
  ip_address: string | null
  created_at: string
}

export interface EventFilters {
  eventName?: string
  startDate?: Date
  endDate?: Date
  userId?: string
  sessionId?: string
}

export interface FunnelData {
  signup: number
  viewService: number
  addToCart: number
  checkout: number
  purchase: number
  conversionRate: {
    signupToView: number
    viewToCart: number
    cartToCheckout: number
    checkoutToPurchase: number
  }
}

export interface BounceRateData {
  totalSessions: number
  bouncedSessions: number
  bounceRate: number
}

export interface EventCount {
  event_name: string
  event_count: number
  unique_users: number
  unique_sessions: number
}

// ============================================
// 1. 이벤트 조회 훅
// ============================================

/**
 * 분석 이벤트 조회
 * 필터링 및 페이지네이션 지원
 */
export function useAnalyticsEvents(filters?: EventFilters, limit = 1000) {
  return useQuery({
    queryKey: ['analytics-events', filters, limit],
    queryFn: async () => {
      let query = supabase
        .from('analytics_events')
        .select('*')
        .order('created_at', { ascending: false })

      // 필터 적용
      if (filters?.eventName) {
        query = query.eq('event_name', filters.eventName)
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters?.sessionId) {
        query = query.eq('session_id', filters.sessionId)
      }

      query = query.limit(limit)

      const { data, error } = await query

      if (error) throw error
      return data as AnalyticsEvent[]
    },
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })
}

// ============================================
// 2. 퍼널 분석 훅
// ============================================

/**
 * 구매 퍼널 분석
 * 회원가입 → 서비스 조회 → 장바구니 → 결제 → 구매
 */
export function useFunnelAnalysis(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['funnel-analysis', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_funnel', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })

      if (error) throw error

      // 전환율 계산
      const signup = data[0]?.signup_count || 0
      const viewService = data[0]?.view_service_count || 0
      const addToCart = data[0]?.add_to_cart_count || 0
      const checkout = data[0]?.checkout_count || 0
      const purchase = data[0]?.purchase_count || 0

      return {
        signup,
        viewService,
        addToCart,
        checkout,
        purchase,
        conversionRate: {
          signupToView: signup > 0 ? (viewService / signup) * 100 : 0,
          viewToCart: viewService > 0 ? (addToCart / viewService) * 100 : 0,
          cartToCheckout: addToCart > 0 ? (checkout / addToCart) * 100 : 0,
          checkoutToPurchase: checkout > 0 ? (purchase / checkout) * 100 : 0,
        },
      } as FunnelData
    },
    staleTime: 10 * 60 * 1000, // 10분 캐싱 (무거운 쿼리)
  })
}

// ============================================
// 3. 이탈률 계산 훅
// ============================================

/**
 * 이탈률 계산
 * 이탈률 = (단일 이벤트 세션 / 전체 세션) * 100
 */
export function useBounceRate(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['bounce-rate', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_bounce_rate', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })

      if (error) throw error

      const totalSessions = data[0]?.total_sessions || 0
      const bouncedSessions = data[0]?.bounced_sessions || 0

      return {
        totalSessions,
        bouncedSessions,
        bounceRate: totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0,
      } as BounceRateData
    },
    staleTime: 10 * 60 * 1000, // 10분 캐싱
  })
}

// ============================================
// 4. 이벤트별 집계 훅
// ============================================

/**
 * 이벤트별 발생 횟수 집계
 * 상위 N개 이벤트 조회
 */
export function useEventCounts(startDate: Date, endDate: Date, topN = 20) {
  return useQuery({
    queryKey: ['event-counts', startDate, endDate, topN],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_event_counts', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })

      if (error) throw error

      // 상위 N개만 반환
      return (data as EventCount[]).slice(0, topN)
    },
    staleTime: 10 * 60 * 1000, // 10분 캐싱
  })
}

// ============================================
// 5. 세션 타임라인 훅
// ============================================

/**
 * 특정 세션의 이벤트 타임라인 조회
 * 디버깅 및 상세 분석용
 */
export function useSessionTimeline(sessionId: string) {
  return useQuery({
    queryKey: ['session-timeline', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_session_timeline', {
        p_session_id: sessionId,
      })

      if (error) throw error

      return data as Array<{
        id: string
        event_name: string
        event_params: Record<string, unknown>
        page_url: string
        created_at: string
      }>
    },
    enabled: !!sessionId, // sessionId가 있을 때만 실행
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })
}

// ============================================
// 6. 실시간 이벤트 스트림 훅 (Realtime)
// ============================================

/**
 * 실시간 이벤트 스트림 구독
 * 새로운 이벤트가 발생하면 자동 업데이트
 */
export function useRealtimeEvents(
  onNewEvent?: (event: AnalyticsEvent) => void
) {
  return useQuery({
    queryKey: ['realtime-events'],
    queryFn: async () => {
      // 최근 10개 이벤트 조회
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data as AnalyticsEvent[]
    },
    staleTime: 30 * 1000, // 30초 캐싱 (자주 업데이트)
  })
}

// ============================================
// 7. 사용자별 이벤트 히스토리 훅
// ============================================

/**
 * 특정 사용자의 이벤트 히스토리 조회
 * 사용자 행동 패턴 분석용
 */
export function useUserEventHistory(userId: string, limit = 100) {
  return useQuery({
    queryKey: ['user-event-history', userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as AnalyticsEvent[]
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })
}
