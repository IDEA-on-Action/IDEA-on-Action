/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useRealtimeDashboard,
  useAutoRefresh,
  useRealtimeMetrics
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

// Mock error logging
vi.mock('@/lib/errors', () => ({
  devLog: vi.fn(),
  devError: vi.fn()
}))

describe('useRealtimeDashboard Hooks', () => {
  let queryClient: QueryClient
  let ordersChannelMock: any
  let eventsChannelMock: any
  let presenceChannelMock: any

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Create separate channel mocks for each channel
    ordersChannelMock = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }

    eventsChannelMock = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }

    presenceChannelMock = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      presenceState: vi.fn(() => ({})),
      track: vi.fn()
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  describe('useRealtimeDashboard', () => {
    it('should load recent orders initially', async () => {
      // 훅에서 items:order_items(count) 조인을 사용하므로 items 배열 포함
      const mockOrders = [
        {
          id: 'order1',
          order_number: 'ORD-001',
          user_id: 'user1',
          total_amount: 100000,
          status: 'confirmed',
          created_at: '2025-11-09T12:00:00Z',
          items: [{ count: 1 }] // order_items 조인 결과
        }
      ]

      const selectMock = vi.fn().mockReturnThis()
      const orderMock = vi.fn().mockReturnThis()
      const limitMock = vi.fn().mockResolvedValue({ data: mockOrders, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        order: orderMock,
        limit: limitMock
      } as any)

      // Mock channel to return different mocks based on channel name
      vi.mocked(supabase.channel).mockImplementation((name) => {
        if (name === 'realtime-orders') return ordersChannelMock
        if (name === 'realtime-analytics-events') return eventsChannelMock
        return ordersChannelMock
      })

      const { result } = renderHook(() => useRealtimeDashboard(), { wrapper })

      // Wait for async loadRecentOrders to complete
      await waitFor(() => {
        expect(result.current.liveOrders.length).toBe(1)
      }, { timeout: 1000 })

      expect(supabase.from).toHaveBeenCalledWith('orders')
      expect(result.current.liveOrders[0]).toMatchObject({
        id: 'order1',
        order_number: 'ORD-001',
        items_count: 1
      })
    })

    it('should subscribe to realtime orders channel', () => {
      const selectMock = vi.fn().mockReturnThis()
      const orderMock = vi.fn().mockReturnThis()
      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        order: orderMock,
        limit: limitMock
      } as any)

      vi.mocked(supabase.channel).mockImplementation((name) => {
        if (name === 'realtime-orders') return ordersChannelMock
        if (name === 'realtime-analytics-events') return eventsChannelMock
        return ordersChannelMock
      })

      renderHook(() => useRealtimeDashboard(), { wrapper })

      expect(supabase.channel).toHaveBeenCalledWith('realtime-orders')
      expect(ordersChannelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'orders'
        }),
        expect.any(Function)
      )
    })

    it('should cleanup channels on unmount', () => {
      const selectMock = vi.fn().mockReturnThis()
      const orderMock = vi.fn().mockReturnThis()
      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        order: orderMock,
        limit: limitMock
      } as any)

      vi.mocked(supabase.channel).mockImplementation((name) => {
        if (name === 'realtime-orders') return ordersChannelMock
        if (name === 'realtime-analytics-events') return eventsChannelMock
        return ordersChannelMock
      })

      const { unmount } = renderHook(() => useRealtimeDashboard(), { wrapper })

      // Verify channels were created
      expect(supabase.channel).toHaveBeenCalledWith('realtime-orders')
      expect(supabase.channel).toHaveBeenCalledWith('realtime-analytics-events')

      unmount()

      // Should remove both channels (cleanup function called twice)
      expect(supabase.removeChannel).toHaveBeenCalledTimes(2)
    })
  })

  describe('useAutoRefresh', () => {
    it('should invalidate queries at specified interval', () => {
      vi.useFakeTimers()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const interval = 30000 // 30 seconds

      renderHook(() => useAutoRefresh(interval), { wrapper })

      // Initially no invalidation
      expect(invalidateSpy).not.toHaveBeenCalled()

      // Fast-forward to first interval
      vi.advanceTimersByTime(interval)

      // invalidateQueries is called synchronously after timer fires
      expect(invalidateSpy).toHaveBeenCalled()
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['kpis'] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['revenue-by-date'] })

      vi.useRealTimers()
    })

    it('should clear interval on unmount', () => {
      vi.useFakeTimers()
      const interval = 30000

      const { unmount } = renderHook(() => useAutoRefresh(interval), { wrapper })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      unmount()

      // Fast-forward timers after unmount
      vi.advanceTimersByTime(interval)

      // Should not invalidate after unmount
      expect(invalidateSpy).not.toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should use default interval if not specified', () => {
      vi.useFakeTimers()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      renderHook(() => useAutoRefresh(), { wrapper })

      // Default is 30000ms
      vi.advanceTimersByTime(30000)

      // Should use default interval
      expect(invalidateSpy).toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('useRealtimeMetrics', () => {
    it('should initialize with zero values', () => {
      const gteMock = vi.fn().mockResolvedValue({ data: [], error: null })
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock
      } as any)

      vi.mocked(supabase.channel).mockReturnValue(presenceChannelMock as any)

      const { result } = renderHook(() => useRealtimeMetrics(), { wrapper })

      expect(result.current.onlineUsers).toBe(0)
      expect(result.current.activeSessions).toBe(0)
    })

    it('should subscribe to presence channel', () => {
      const gteMock = vi.fn().mockResolvedValue({ data: [], error: null })
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock
      } as any)

      vi.mocked(supabase.channel).mockReturnValue(presenceChannelMock as any)

      renderHook(() => useRealtimeMetrics(), { wrapper })

      expect(supabase.channel).toHaveBeenCalledWith('online-users', expect.any(Object))
      expect(presenceChannelMock.on).toHaveBeenCalledWith(
        'presence',
        { event: 'sync' },
        expect.any(Function)
      )
    })

    it('should fetch active sessions from analytics_events', async () => {
      const mockEvents = [
        { session_id: 'session1' },
        { session_id: 'session2' },
        { session_id: 'session1' } // Duplicate
      ]

      const gteMock = vi.fn().mockResolvedValue({ data: mockEvents, error: null })
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock
      } as any)

      vi.mocked(supabase.channel).mockReturnValue(presenceChannelMock as any)

      const { result } = renderHook(() => useRealtimeMetrics(), { wrapper })

      // Wait for the initial fetchActiveSessions to complete
      await waitFor(() => {
        expect(result.current.activeSessions).toBe(2) // Unique sessions
      }, { timeout: 3000 })

      expect(supabase.from).toHaveBeenCalledWith('analytics_events')
    })

    it('should cleanup channel on unmount', () => {
      const gteMock = vi.fn().mockResolvedValue({ data: [], error: null })
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock
      } as any)

      vi.mocked(supabase.channel).mockReturnValue(presenceChannelMock as any)

      const { unmount } = renderHook(() => useRealtimeMetrics(), { wrapper })

      unmount()

      expect(supabase.removeChannel).toHaveBeenCalledWith(presenceChannelMock)
    })
  })
})
