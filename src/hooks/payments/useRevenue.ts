/**
 * useRevenue Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * Phase 14 Week 2: 매출 분석 훅
 * 일/주/월별 매출, 서비스별 매출, KPI 조회
 */

import { useQuery } from '@tanstack/react-query'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import { devLog } from '@/lib/errors'

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
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['revenue-by-date', startDate, endDate, groupBy],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const url = `/api/v1/analytics/revenue/by-date?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&group_by=${groupBy}`

      const { data, error } = await callWorkersApi<Array<{
        date: string
        total: number | string
        count: number | string
      }>>(url, { token })

      if (error) {
        devLog('Revenue by date error:', error)
        return [] as RevenueByDate[]
      }

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
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['revenue-by-service', startDate, endDate],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const url = `/api/v1/analytics/revenue/by-service?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`

      const { data, error } = await callWorkersApi<Array<{
        service_id: string
        service_name: string
        total_revenue: number | string
        order_count: number | string
      }>>(url, { token })

      if (error) {
        devLog('Revenue by service error:', error)
        return [] as RevenueByService[]
      }

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
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['kpis', startDate, endDate],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const url = `/api/v1/analytics/kpis?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`

      const { data, error } = await callWorkersApi<{
        total_revenue: number | string
        order_count: number | string
        average_order_value: number | string
        conversion_rate: number | string
        new_customers: number | string
        returning_customers: number | string
      }>(url, { token })

      if (error) {
        devLog('KPIs error:', error)
        return {
          totalRevenue: 0,
          orderCount: 0,
          averageOrderValue: 0,
          conversionRate: 0,
          newCustomers: 0,
          returningCustomers: 0,
        } as KPIs
      }

      return {
        totalRevenue: Number(data?.total_revenue) || 0,
        orderCount: Number(data?.order_count) || 0,
        averageOrderValue: Number(data?.average_order_value) || 0,
        conversionRate: Number(data?.conversion_rate) || 0,
        newCustomers: Number(data?.new_customers) || 0,
        returningCustomers: Number(data?.returning_customers) || 0,
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
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['total-revenue', startDate, endDate],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const url = `/api/v1/analytics/revenue/total?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`

      const { data, error } = await callWorkersApi<{
        total_revenue: number
        order_count: number
        average_order_value: number
      }>(url, { token })

      if (error) {
        devLog('Total revenue error:', error)
        return {
          totalRevenue: 0,
          orderCount: 0,
          averageOrderValue: 0,
        }
      }

      return {
        totalRevenue: data?.total_revenue || 0,
        orderCount: data?.order_count || 0,
        averageOrderValue: data?.average_order_value || 0,
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
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['user-total-spent', userId],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const url = `/api/v1/users/${userId}/spending`

      const { data, error } = await callWorkersApi<{
        total_spent: number
        order_count: number
        last_order_date: string | null
      }>(url, { token })

      if (error) {
        devLog('User total spent error:', error)
        return {
          totalSpent: 0,
          orderCount: 0,
          lastOrderDate: null,
        }
      }

      return {
        totalSpent: data?.total_spent || 0,
        orderCount: data?.order_count || 0,
        lastOrderDate: data?.last_order_date || null,
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })
}
