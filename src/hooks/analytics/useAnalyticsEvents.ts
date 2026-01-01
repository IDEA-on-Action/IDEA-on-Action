/**
 * useAnalyticsEvents Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * Phase 14: 분석 이벤트 훅
 * 사용자 행동 분석, 퍼널 분석, 이탈률 계산
 */

import { useQuery } from '@tanstack/react-query'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { devLog } from '@/lib/errors'

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
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['analytics-events', filters, limit],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      let url = `/api/v1/analytics/events?limit=${limit}&order_by=created_at:desc`

      // 필터 적용
      if (filters?.eventName) {
        url += `&event_name=${encodeURIComponent(filters.eventName)}`
      }

      if (filters?.startDate) {
        url += `&start_date=${filters.startDate.toISOString()}`
      }

      if (filters?.endDate) {
        url += `&end_date=${filters.endDate.toISOString()}`
      }

      if (filters?.userId) {
        url += `&user_id=${filters.userId}`
      }

      if (filters?.sessionId) {
        url += `&session_id=${filters.sessionId}`
      }

      const { data, error } = await callWorkersApi<AnalyticsEvent[]>(url, { token })

      if (error) {
        devLog('Analytics events query error:', error)
        return []
      }

      return data || []
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
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['funnel-analysis', startDate, endDate],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const url = `/api/v1/analytics/funnel?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`

      const { data, error } = await callWorkersApi<{
        signup_count: number
        view_service_count: number
        add_to_cart_count: number
        checkout_count: number
        purchase_count: number
      }>(url, { token })

      // 에러 시 빈 데이터 반환
      if (error) {
        devLog('Funnel analysis not available:', error)
        return {
          signup: 0,
          viewService: 0,
          addToCart: 0,
          checkout: 0,
          purchase: 0,
          conversionRate: {
            signupToView: 0,
            viewToCart: 0,
            cartToCheckout: 0,
            checkoutToPurchase: 0,
          },
        } as FunnelData
      }

      // 전환율 계산
      const signup = data?.signup_count || 0
      const viewService = data?.view_service_count || 0
      const addToCart = data?.add_to_cart_count || 0
      const checkout = data?.checkout_count || 0
      const purchase = data?.purchase_count || 0

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
    retry: false,
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
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['bounce-rate', startDate, endDate],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const url = `/api/v1/analytics/bounce-rate?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`

      const { data, error } = await callWorkersApi<{
        total_sessions: number
        bounced_sessions: number
      }>(url, { token })

      // 에러 시 빈 데이터 반환
      if (error) {
        devLog('Bounce rate not available:', error)
        return {
          totalSessions: 0,
          bouncedSessions: 0,
          bounceRate: 0,
        } as BounceRateData
      }

      const totalSessions = data?.total_sessions || 0
      const bouncedSessions = data?.bounced_sessions || 0

      return {
        totalSessions,
        bouncedSessions,
        bounceRate: totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0,
      } as BounceRateData
    },
    staleTime: 10 * 60 * 1000, // 10분 캐싱
    retry: false,
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
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['event-counts', startDate, endDate, topN],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const url = `/api/v1/analytics/event-counts?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&limit=${topN}`

      const { data, error } = await callWorkersApi<EventCount[]>(url, { token })

      // 에러 시 빈 배열 반환
      if (error) {
        devLog('Event counts not available:', error)
        return [] as EventCount[]
      }

      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10분 캐싱
    retry: false,
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
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['session-timeline', sessionId],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const url = `/api/v1/analytics/sessions/${sessionId}/timeline`

      const { data, error } = await callWorkersApi<Array<{
        id: string
        event_name: string
        event_params: Record<string, unknown>
        page_url: string
        created_at: string
      }>>(url, { token })

      if (error) {
        devLog('Session timeline error:', error)
        return []
      }

      return data || []
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
export function useRealtimeEvents() {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['realtime-events'],
    queryFn: async () => {
      // 최근 10개 이벤트 조회
      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<AnalyticsEvent[]>(
        '/api/v1/analytics/events?limit=10&order_by=created_at:desc',
        { token }
      )

      if (error) {
        devLog('Realtime events error:', error)
        return []
      }

      return data || []
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
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['user-event-history', userId, limit],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<AnalyticsEvent[]>(
        `/api/v1/analytics/events?user_id=${userId}&limit=${limit}&order_by=created_at:desc`,
        { token }
      )

      if (error) {
        devLog('User event history error:', error)
        return []
      }

      return data || []
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })
}
