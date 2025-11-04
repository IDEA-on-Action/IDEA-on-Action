/**
 * Phase 14 Week 3: 실시간 대시보드 훅
 * Supabase Realtime 구독 및 자동 새로고침
 */

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

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
 * orders, analytics_events 테이블 변경 감지
 */
export function useRealtimeDashboard() {
  const queryClient = useQueryClient()
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([])

  useEffect(() => {
    // 최근 10개 주문 초기 로드
    const loadRecentOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, user_id, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Failed to load recent orders:', error)
        return
      }

      // items_count 계산 (임시로 1로 설정, 실제로는 order_items 조인 필요)
      const ordersWithCount = data.map((order) => ({
        ...order,
        items_count: 1, // TODO: order_items 조인으로 실제 개수 계산
      }))

      setLiveOrders(ordersWithCount)
    }

    loadRecentOrders()

    // orders 테이블 실시간 구독
    const ordersChannel = supabase
      .channel('realtime-orders')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Orders change detected:', payload)

          // 새 주문 추가
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as any
            setLiveOrders((prev) => [
              {
                id: newOrder.id,
                order_number: newOrder.order_number,
                user_id: newOrder.user_id,
                total_amount: newOrder.total_amount,
                status: newOrder.status,
                created_at: newOrder.created_at,
                items_count: 1,
              },
              ...prev.slice(0, 9), // 최근 10개만 유지
            ])
          }

          // KPI 무효화 (자동 리페치)
          queryClient.invalidateQueries({ queryKey: ['kpis'] })
          queryClient.invalidateQueries({ queryKey: ['revenue-by-date'] })
          queryClient.invalidateQueries({ queryKey: ['total-revenue'] })
        }
      )
      .subscribe()

    // analytics_events 테이블 실시간 구독
    const eventsChannel = supabase
      .channel('realtime-analytics-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_events',
        },
        (payload) => {
          console.log('Analytics event detected:', payload)

          // 이벤트 관련 쿼리 무효화
          queryClient.invalidateQueries({ queryKey: ['analytics-events'] })
          queryClient.invalidateQueries({ queryKey: ['event-counts'] })
          queryClient.invalidateQueries({ queryKey: ['bounce-rate'] })
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(eventsChannel)
    }
  }, [queryClient])

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

      console.log(`[Auto Refresh] Queries invalidated at ${new Date().toLocaleTimeString()}`)
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
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [activeSessions, setActiveSessions] = useState(0)

  useEffect(() => {
    // Supabase Presence 사용 (온라인 사용자 추적)
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: 'user-presence',
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineUsers(Object.keys(state).length)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user
          await channel.track({
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 활성 세션 조회 (최근 30분 내 이벤트가 있는 세션)
  useEffect(() => {
    const fetchActiveSessions = async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

      const { data, error } = await supabase
        .from('analytics_events')
        .select('session_id')
        .gte('created_at', thirtyMinutesAgo.toISOString())

      if (error) {
        console.error('Failed to fetch active sessions:', error)
        return
      }

      // 중복 제거
      const uniqueSessions = new Set(data.map((row) => row.session_id))
      setActiveSessions(uniqueSessions.size)
    }

    fetchActiveSessions()

    // 1분마다 갱신
    const timer = setInterval(fetchActiveSessions, 60000)

    return () => clearInterval(timer)
  }, [])

  return { onlineUsers, activeSessions }
}
