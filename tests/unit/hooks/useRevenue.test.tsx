/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useRevenueByDate,
  useRevenueByService,
  useKPIs,
  useTotalRevenue,
  useUserSpending
} from '@/hooks/useRevenue'
import { supabase } from '@/integrations/supabase/client'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}))

describe('useRevenue Hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  describe('useRevenueByDate', () => {
    it('should fetch revenue by date successfully', async () => {
      const mockData = [
        { period: '2025-11-01', revenue: 100000, order_count: 5, avg_order_value: 20000 },
        { period: '2025-11-02', revenue: 150000, order_count: 7, avg_order_value: 21428 }
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockData, error: null })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-02')

      const { result } = renderHook(
        () => useRevenueByDate(startDate, endDate, 'day'),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(supabase.rpc).toHaveBeenCalledWith('get_revenue_by_date', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_interval: 'day'
      })
    })

    it('should handle different intervals (week, month)', async () => {
      const mockData = [
        { period: '2025-W45', revenue: 500000, order_count: 25, avg_order_value: 20000 }
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockData, error: null })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-07')

      const { result } = renderHook(
        () => useRevenueByDate(startDate, endDate, 'week'),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(supabase.rpc).toHaveBeenCalledWith('get_revenue_by_date', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_interval: 'week'
      })
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '500' } as any
      })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-02')

      const { result } = renderHook(
        () => useRevenueByDate(startDate, endDate, 'day'),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useRevenueByService', () => {
    it('should fetch revenue by service successfully', async () => {
      const mockData = [
        {
          service_id: 'service1',
          service_name: 'AI 챗봇',
          revenue: 300000,
          order_count: 15,
          percentage: 60
        },
        {
          service_id: 'service2',
          service_name: '웹사이트 개발',
          revenue: 200000,
          order_count: 10,
          percentage: 40
        }
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockData, error: null })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(
        () => useRevenueByService(startDate, endDate),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(result.current.data?.[0].percentage).toBe(60)
      expect(result.current.data?.[1].percentage).toBe(40)
    })
  })

  describe('useKPIs', () => {
    it('should fetch KPIs successfully', async () => {
      const mockData = [{
        total_revenue: 1000000,
        total_orders: 50,
        avg_order_value: 20000,
        conversion_rate: 2.5,
        new_customers: 30,
        returning_customers: 20
      }]

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockData, error: null })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(
        () => useKPIs(startDate, endDate),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData[0])
      expect(result.current.data?.total_revenue).toBe(1000000)
      expect(result.current.data?.conversion_rate).toBe(2.5)
    })

    it('should return null for empty data', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(
        () => useKPIs(startDate, endDate),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeNull()
    })
  })

  describe('useTotalRevenue', () => {
    it('should calculate total revenue from orders', async () => {
      const mockOrders = [
        { total_amount: 100000 },
        { total_amount: 150000 },
        { total_amount: 200000 }
      ]

      const selectMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockResolvedValue({ data: mockOrders, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        in: inMock
      } as any)

      const { result } = renderHook(() => useTotalRevenue(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBe(450000)
      expect(supabase.from).toHaveBeenCalledWith('orders')
      expect(selectMock).toHaveBeenCalledWith('total_amount')
    })

    it('should handle empty orders', async () => {
      const selectMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockResolvedValue({ data: [], error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        in: inMock
      } as any)

      const { result } = renderHook(() => useTotalRevenue(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBe(0)
    })
  })

  describe('useUserSpending', () => {
    it('should calculate user spending metrics', async () => {
      const mockOrders = [
        { total_amount: 100000, created_at: '2025-11-01' },
        { total_amount: 150000, created_at: '2025-11-15' },
        { total_amount: 200000, created_at: '2025-11-30' }
      ]

      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockResolvedValue({ data: mockOrders, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        in: inMock
      } as any)

      const userId = 'user123'

      const { result } = renderHook(() => useUserSpending(userId), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.totalSpent).toBe(450000)
      expect(result.current.data?.orderCount).toBe(3)
      expect(result.current.data?.avgOrderValue).toBe(150000)
      expect(result.current.data?.ltv).toBe(450000)
    })

    it('should handle user with no orders', async () => {
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockResolvedValue({ data: [], error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        in: inMock
      } as any)

      const userId = 'user456'

      const { result } = renderHook(() => useUserSpending(userId), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.totalSpent).toBe(0)
      expect(result.current.data?.orderCount).toBe(0)
      expect(result.current.data?.avgOrderValue).toBe(0)
    })
  })
})
