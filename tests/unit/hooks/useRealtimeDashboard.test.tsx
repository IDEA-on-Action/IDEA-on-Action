/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useRealtimeMetrics,
  useRealtimeOrders,
  useAutoRefresh
} from '@/hooks/useRealtimeDashboard'
import { supabase } from '@/integrations/supabase/client'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn()
  }
}))

describe('useRealtimeDashboard Hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  describe('useRealtimeMetrics', () => {
    it('should fetch realtime metrics successfully', async () => {
      const mockOrders = [
        { total_amount: 100000, status: 'confirmed' },
        { total_amount: 150000, status: 'completed' }
      ]

      const mockEvents = [
        { event_name: 'view_item', session_id: 'session1' },
        { event_name: 'add_to_cart', session_id: 'session2' }
      ]

      const mockActiveUsers = [
        { user_id: 'user1' },
        { user_id: 'user2' },
        { user_id: 'user1' } // Duplicate
      ]

      const selectMock = vi.fn().mockReturnThis()
      const gteMock = vi.fn().mockReturnThis()
      const inMock = vi.fn()

      // First call (orders)
      inMock.mockResolvedValueOnce({ data: mockOrders, error: null })
      // Second call (events)
      inMock.mockResolvedValueOnce({ data: mockEvents, error: null })
      // Third call (active users)
      inMock.mockResolvedValueOnce({ data: mockActiveUsers, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        gte: gteMock,
        in: inMock
      } as any)

      const { result } = renderHook(() => useRealtimeMetrics(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.todayRevenue).toBe(250000)
      expect(result.current.data?.todayOrders).toBe(2)
      expect(result.current.data?.avgOrderValue).toBe(125000)
      expect(result.current.data?.activeUsers).toBe(2) // Unique users
    })

    it('should handle empty data gracefully', async () => {
      const selectMock = vi.fn().mockReturnThis()
      const gteMock = vi.fn().mockReturnThis()
      const inMock = vi.fn()

      inMock.mockResolvedValueOnce({ data: [], error: null }) // orders
      inMock.mockResolvedValueOnce({ data: [], error: null }) // events
      inMock.mockResolvedValueOnce({ data: [], error: null }) // active users

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        gte: gteMock,
        in: inMock
      } as any)

      const { result } = renderHook(() => useRealtimeMetrics(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.todayRevenue).toBe(0)
      expect(result.current.data?.todayOrders).toBe(0)
      expect(result.current.data?.avgOrderValue).toBe(0)
      expect(result.current.data?.conversionRate).toBe(0)
      expect(result.current.data?.activeUsers).toBe(0)
    })

    it('should calculate conversion rate correctly', async () => {
      const mockOrders = [
        { total_amount: 100000, status: 'confirmed' }
      ]

      const mockEvents = [
        { event_name: 'view_item', session_id: 'session1' },
        { event_name: 'view_item', session_id: 'session2' },
        { event_name: 'view_item', session_id: 'session3' },
        { event_name: 'view_item', session_id: 'session4' }
      ]

      const selectMock = vi.fn().mockReturnThis()
      const gteMock = vi.fn().mockReturnThis()
      const inMock = vi.fn()

      inMock.mockResolvedValueOnce({ data: mockOrders, error: null })
      inMock.mockResolvedValueOnce({ data: mockEvents, error: null })
      inMock.mockResolvedValueOnce({ data: [], error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        gte: gteMock,
        in: inMock
      } as any)

      const { result } = renderHook(() => useRealtimeMetrics(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // 1 order / 4 unique sessions = 25%
      expect(result.current.data?.conversionRate).toBe(25)
    })
  })

  describe('useRealtimeOrders', () => {
    it('should subscribe to realtime orders channel', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)

      renderHook(() => useRealtimeOrders(), { wrapper })

      expect(supabase.channel).toHaveBeenCalledWith('realtime-orders')
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        expect.any(Function)
      )
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    it('should invalidate queries on order change', async () => {
      const mockChannel = {
        on: vi.fn((event, config, callback) => {
          // Simulate order change event
          setTimeout(() => {
            callback({ eventType: 'INSERT', new: { id: 'order1' } })
          }, 100)
          return mockChannel
        }),
        subscribe: vi.fn()
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      renderHook(() => useRealtimeOrders(), { wrapper })

      // Fast-forward timers
      await vi.advanceTimersByTimeAsync(200)

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalled()
      })
    })

    it('should cleanup channel on unmount', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)

      const { unmount } = renderHook(() => useRealtimeOrders(), { wrapper })

      unmount()

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel)
    })
  })

  describe('useAutoRefresh', () => {
    it('should invalidate queries at specified interval', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const interval = 30000 // 30 seconds

      renderHook(() => useAutoRefresh(interval), { wrapper })

      // Initially no invalidation
      expect(invalidateSpy).not.toHaveBeenCalled()

      // Fast-forward to first interval
      await vi.advanceTimersByTimeAsync(interval)

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['realtime-metrics'] })
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['recent-orders'] })
      })

      // Fast-forward to second interval
      await vi.advanceTimersByTimeAsync(interval)

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledTimes(4) // 2 queries × 2 intervals
      })
    })

    it('should clear interval on unmount', async () => {
      const interval = 30000

      const { unmount } = renderHook(() => useAutoRefresh(interval), { wrapper })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      unmount()

      // Fast-forward timers after unmount
      await vi.advanceTimersByTimeAsync(interval)

      // Should not invalidate after unmount
      expect(invalidateSpy).not.toHaveBeenCalled()
    })

    it('should use default interval if not specified', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      renderHook(() => useAutoRefresh(), { wrapper })

      // Default is 30000ms
      await vi.advanceTimersByTimeAsync(30000)

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalled()
      })
    })
  })
})
