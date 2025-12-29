/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useRealtimeDashboard,
  useAutoRefresh,
  useRealtimeMetrics
} from '@/hooks/useRealtimeDashboard'

// Mock Cloudflare Workers API
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
  realtimeApi: {
    connect: vi.fn()
  }
}))

// Mock error logging
vi.mock('@/lib/errors', () => ({
  devLog: vi.fn(),
  devError: vi.fn()
}))

describe('useRealtimeDashboard Hooks', () => {
  let queryClient: QueryClient
  let mockWebSocket: any

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // WebSocket Mock 생성
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      readyState: 1, // OPEN
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
      const { callWorkersApi, realtimeApi } = await import('@/integrations/cloudflare/client')

      const mockOrders = [
        {
          id: 'order1',
          order_number: 'ORD-001',
          user_id: 'user1',
          total_amount: 100000,
          status: 'confirmed',
          created_at: '2025-11-09T12:00:00Z',
          items_count: 1
        }
      ]

      // callWorkersApi Mock 설정
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockOrders,
        error: null,
        status: 200
      })

      // WebSocket Mock 설정
      vi.mocked(realtimeApi.connect).mockReturnValue(mockWebSocket)

      const { result } = renderHook(() => useRealtimeDashboard(), { wrapper })

      // Wait for async loadRecentOrders to complete
      await waitFor(() => {
        expect(result.current.liveOrders.length).toBe(1)
      }, { timeout: 1000 })

      expect(callWorkersApi).toHaveBeenCalledWith('/api/v1/orders/recent?limit=10', {
        token: 'test-token'
      })
      expect(result.current.liveOrders[0]).toMatchObject({
        id: 'order1',
        order_number: 'ORD-001',
        items_count: 1
      })
    })

    it('should subscribe to realtime orders channel', async () => {
      const { callWorkersApi, realtimeApi } = await import('@/integrations/cloudflare/client')

      vi.mocked(callWorkersApi).mockResolvedValue({ data: [], error: null, status: 200 })
      vi.mocked(realtimeApi.connect).mockReturnValue(mockWebSocket)

      renderHook(() => useRealtimeDashboard(), { wrapper })

      expect(realtimeApi.connect).toHaveBeenCalledWith('dashboard', 'user-123')

      // onopen 핸들러 트리거
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'subscribe', channels: ['orders', 'analytics_events'] })
      )
    })

    it('should cleanup channels on unmount', async () => {
      const { callWorkersApi, realtimeApi } = await import('@/integrations/cloudflare/client')

      vi.mocked(callWorkersApi).mockResolvedValue({ data: [], error: null, status: 200 })
      vi.mocked(realtimeApi.connect).mockReturnValue(mockWebSocket)

      const { unmount } = renderHook(() => useRealtimeDashboard(), { wrapper })

      // Verify WebSocket connection
      expect(realtimeApi.connect).toHaveBeenCalledWith('dashboard', 'user-123')

      unmount()

      // Should close WebSocket
      expect(mockWebSocket.close).toHaveBeenCalledTimes(1)
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
    it('should initialize with zero values', async () => {
      const { callWorkersApi, realtimeApi } = await import('@/integrations/cloudflare/client')

      vi.mocked(callWorkersApi).mockResolvedValue({ data: [], error: null, status: 200 })
      vi.mocked(realtimeApi.connect).mockReturnValue(mockWebSocket)

      const { result } = renderHook(() => useRealtimeMetrics(), { wrapper })

      expect(result.current.onlineUsers).toBe(0)
      expect(result.current.activeSessions).toBe(0)
    })

    it('should subscribe to presence channel', async () => {
      const { callWorkersApi, realtimeApi } = await import('@/integrations/cloudflare/client')

      vi.mocked(callWorkersApi).mockResolvedValue({ data: [], error: null, status: 200 })
      vi.mocked(realtimeApi.connect).mockReturnValue(mockWebSocket)

      renderHook(() => useRealtimeMetrics(), { wrapper })

      expect(realtimeApi.connect).toHaveBeenCalledWith('presence-online-users', 'user-123')

      // onopen 핸들러 트리거
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('presence_join')
      )
    })

    it('should fetch active sessions from analytics_events', async () => {
      const { callWorkersApi, realtimeApi } = await import('@/integrations/cloudflare/client')

      const mockSessions = [
        { session_id: 'session1' },
        { session_id: 'session2' },
        { session_id: 'session1' } // Duplicate
      ]

      vi.mocked(callWorkersApi).mockResolvedValue({ data: mockSessions, error: null, status: 200 })
      vi.mocked(realtimeApi.connect).mockReturnValue(mockWebSocket)

      const { result } = renderHook(() => useRealtimeMetrics(), { wrapper })

      // Wait for the initial fetchActiveSessions to complete
      await waitFor(() => {
        expect(result.current.activeSessions).toBe(2) // Unique sessions
      }, { timeout: 3000 })

      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/sessions/active'),
        { token: 'test-token' }
      )
    })

    it('should cleanup channel on unmount', async () => {
      const { callWorkersApi, realtimeApi } = await import('@/integrations/cloudflare/client')

      vi.mocked(callWorkersApi).mockResolvedValue({ data: [], error: null, status: 200 })
      vi.mocked(realtimeApi.connect).mockReturnValue(mockWebSocket)

      const { unmount } = renderHook(() => useRealtimeMetrics(), { wrapper })

      unmount()

      // Should close WebSocket
      expect(mockWebSocket.close).toHaveBeenCalled()
    })
  })
})
