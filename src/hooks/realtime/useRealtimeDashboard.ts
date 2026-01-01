/**
 * Phase 14 Week 3: 실시간 대시보드 훅
 * Workers WebSocket 구독 및 자동 새로고침
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { realtimeApi, callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { devLog, devError } from '@/lib/errors'

// ============================================
// 타입 정의
// ============================================

export interface LiveOrder {
  id: string
  order_number: string
  user_id: string
  total_amount: number
  status: string
  created_at: string
  items_count: number
}

// ============================================
// 1. 실시간 대시보드 훅
// ============================================

/**
 * 실시간 대시보드 데이터 구독
 * Workers WebSocket을 통한 orders, analytics_events 변경 감지
 */
export function useRealtimeDashboard() {
  const queryClient = useQueryClient()
  const { user, workersTokens } = useAuth()
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // 최근 10개 주문 초기 로드 (Workers API 사용)
    const loadRecentOrders = async () => {
      const result = await callWorkersApi<{
        id: string
        order_number: string
        user_id: string
        total_amount: number
        status: string
        created_at: string
        items_count: number
      }[]>('/api/v1/orders/recent?limit=10', {
        token: workersTokens?.accessToken,
      })

      if (result.error) {
        devError(new Error(result.error), { operation: '최근 주문 로드', table: 'orders' })
        return
      }

      setLiveOrders(result.data || [])
    }

    loadRecentOrders()

    // Workers WebSocket 연결
    const ws = realtimeApi.connect('dashboard', user?.id)
    wsRef.current = ws

    ws.onopen = () => {
      devLog('Dashboard WebSocket 연결됨')
      // 주문 및 분석 이벤트 구독
      ws.send(JSON.stringify({ type: 'subscribe', channels: ['orders', 'analytics_events'] }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        devLog('Dashboard WebSocket 메시지:', data)

        // 주문 변경 처리
        if (data.type === 'order_change') {
          if (data.eventType === 'INSERT') {
            const newOrder = data.payload as LiveOrder
            setLiveOrders((prev) => [
              {
                id: newOrder.id,
                order_number: newOrder.order_number,
                user_id: newOrder.user_id,
                total_amount: newOrder.total_amount,
                status: newOrder.status,
                created_at: newOrder.created_at,
                items_count: newOrder.items_count || 1,
              },
              ...prev.slice(0, 9), // 최근 10개만 유지
            ])
          }

          // KPI 무효화 (자동 리페치)
          queryClient.invalidateQueries({ queryKey: ['kpis'] })
          queryClient.invalidateQueries({ queryKey: ['revenue-by-date'] })
          queryClient.invalidateQueries({ queryKey: ['total-revenue'] })
        }

        // 분석 이벤트 처리
        if (data.type === 'analytics_event') {
          devLog('Analytics event detected:', data.payload)

          // 이벤트 관련 쿼리 무효화
          queryClient.invalidateQueries({ queryKey: ['analytics-events'] })
          queryClient.invalidateQueries({ queryKey: ['event-counts'] })
          queryClient.invalidateQueries({ queryKey: ['bounce-rate'] })
        }
      } catch (e) {
        devError(e as Error, { operation: 'WebSocket 메시지 파싱' })
      }
    }

    ws.onerror = (error) => {
      devError(new Error('WebSocket 연결 오류'), { operation: 'Dashboard WebSocket' })
    }

    ws.onclose = () => {
      devLog('Dashboard WebSocket 연결 종료')
    }

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [queryClient, user?.id, workersTokens?.accessToken])

  return { liveOrders }
}

// ============================================
// 2. 자동 새로고침 훅
// ============================================

/**
 * 자동 새로고침 훅
 * 지정된 간격(기본 30초)마다 쿼리 무효화
 */
export function useAutoRefresh(interval = 30000) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = setInterval(() => {
      // KPI 및 매출 데이터 자동 새로고침
      queryClient.invalidateQueries({ queryKey: ['kpis'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-by-date'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-by-service'] })
      queryClient.invalidateQueries({ queryKey: ['total-revenue'] })

      devLog(`[Auto Refresh] Queries invalidated at ${new Date().toLocaleTimeString()}`)
    }, interval)

    return () => clearInterval(timer)
  }, [interval, queryClient])
}

// ============================================
// 3. 실시간 메트릭 훅
// ============================================

/**
 * 실시간 메트릭 훅
 * 현재 온라인 사용자, 활성 세션 등
 */
export function useRealtimeMetrics() {
  const { user, workersTokens } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [activeSessions, setActiveSessions] = useState(0)

  useEffect(() => {
    // Workers WebSocket Presence 사용 (온라인 사용자 추적)
    const ws = realtimeApi.connect('presence-online-users', user?.id)

    ws.onopen = () => {
      devLog('Presence WebSocket 연결됨')
      ws.send(JSON.stringify({ type: 'presence_join', timestamp: new Date().toISOString() }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'presence_sync') {
          setOnlineUsers(data.count || 0)
        }

        if (data.type === 'presence_join') {
          devLog('User joined:', data.userId)
        }

        if (data.type === 'presence_leave') {
          devLog('User left:', data.userId)
        }
      } catch (e) {
        devError(e as Error, { operation: 'Presence 메시지 파싱' })
      }
    }

    return () => {
      ws.close()
    }
  }, [user?.id])

  // 활성 세션 조회 (최근 30분 내 이벤트가 있는 세션)
  useEffect(() => {
    const fetchActiveSessions = async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

      const result = await callWorkersApi<{ session_id: string }[]>(
        `/api/v1/analytics/sessions/active?since=${thirtyMinutesAgo.toISOString()}`,
        { token: workersTokens?.accessToken }
      )

      if (result.error) {
        devError(new Error(result.error), { operation: '활성 세션 조회' })
        return
      }

      // 중복 제거
      const uniqueSessions = new Set((result.data || []).map((row) => row.session_id))
      setActiveSessions(uniqueSessions.size)
    }

    fetchActiveSessions()

    // 1분마다 갱신
    const timer = setInterval(fetchActiveSessions, 60000)

    return () => clearInterval(timer)
  }, [workersTokens?.accessToken])

  return { onlineUsers, activeSessions }
}
