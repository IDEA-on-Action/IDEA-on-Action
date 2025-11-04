/**
 * Phase 14 Week 2: 매출 분석 훅
 * 일/주/월별 매출, 서비스별 매출, KPI 조회
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// ============================================
// 타입 정의
// ============================================

export interface RevenueByDate {
  date: string
  total: number
  count: number
}

export interface RevenueByService {
  service_id: string
  service_name: string
  total_revenue: number
  order_count: number
}

export interface KPIs {
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  conversionRate: number
  newCustomers: number
  returningCustomers: number
}

// ============================================
// 1. 일/주/월별 매출 조회 훅
// ============================================

/**
 * 일/주/월별 매출 집계
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 * @param groupBy - 집계 단위 ('day' | 'week' | 'month')
 */
export function useRevenueByDate(
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day'
) {
  return useQuery({
    queryKey: ['revenue-by-date', startDate, endDate, groupBy],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_revenue_by_date', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        group_by: groupBy,
      })

      if (error) throw error

      return (data || []).map((item) => ({
        date: item.date,
        total: Number(item.total) || 0,
        count: Number(item.count) || 0,
      })) as RevenueByDate[]
    },
    staleTime: 10 * 60 * 1000, // 10분 캐싱 (무거운 쿼리)
  })
}

// ============================================
// 2. 서비스별 매출 조회 훅
// ============================================

/**
 * 서비스별 매출 집계
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 */
export function useRevenueByService(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['revenue-by-service', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_revenue_by_service', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })

      if (error) throw error

      return (data || []).map((item) => ({
        service_id: item.service_id,
        service_name: item.service_name,
        total_revenue: Number(item.total_revenue) || 0,
        order_count: Number(item.order_count) || 0,
      })) as RevenueByService[]
    },
    staleTime: 10 * 60 * 1000, // 10분 캐싱
  })
}

// ============================================
// 3. KPI 조회 훅
// ============================================

/**
 * 전체 KPI 조회
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 */
export function useKPIs(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['kpis', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_kpis', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })

      if (error) throw error

      const kpi = data?.[0]

      return {
        totalRevenue: Number(kpi?.total_revenue) || 0,
        orderCount: Number(kpi?.order_count) || 0,
        averageOrderValue: Number(kpi?.average_order_value) || 0,
        conversionRate: Number(kpi?.conversion_rate) || 0,
        newCustomers: Number(kpi?.new_customers) || 0,
        returningCustomers: Number(kpi?.returning_customers) || 0,
      } as KPIs
    },
    staleTime: 10 * 60 * 1000, // 10분 캐싱
  })
}

// ============================================
// 4. 총 매출 조회 훅 (간단 버전)
// ============================================

/**
 * 총 매출 조회 (간단 버전)
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 */
export function useTotalRevenue(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['total-revenue', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error) throw error

      const totalRevenue = data.reduce((sum, order) => sum + order.total_amount, 0)

      return {
        totalRevenue,
        orderCount: data.length,
        averageOrderValue: data.length > 0 ? totalRevenue / data.length : 0,
      }
    },
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })
}

// ============================================
// 5. 사용자별 총 지출 조회 훅
// ============================================

/**
 * 특정 사용자의 총 지출 조회
 * @param userId - 사용자 ID
 */
export function useUserTotalSpent(userId: string) {
  return useQuery({
    queryKey: ['user-total-spent', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) throw error

      const totalSpent = data.reduce((sum, order) => sum + order.total_amount, 0)

      return {
        totalSpent,
        orderCount: data.length,
        lastOrderDate: data[0]?.created_at || null,
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })
}
