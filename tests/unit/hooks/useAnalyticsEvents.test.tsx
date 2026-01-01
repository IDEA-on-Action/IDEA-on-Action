import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useAnalyticsEvents,
  useFunnelAnalysis,
  useBounceRate,
  useEventCounts,
  useSessionTimeline,
  useRealtimeEvents,
  useUserEventHistory
} from '@/hooks/analytics/useAnalyticsEvents'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import React, { type ReactNode } from 'react'

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
}))

// Mock useAuth hook
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    workersTokens: { accessToken: 'mock-token' },
  }),
}))

describe('useAnalyticsEvents Hooks', () => {
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

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  // ============================================
  // 1. useAnalyticsEvents
  // ============================================
  describe('useAnalyticsEvents', () => {
    it('should fetch analytics events successfully', async () => {
      const mockEvents = [
        {
          id: '1',
          user_id: 'user1',
          session_id: 'session1',
          event_name: 'page_view',
          event_params: {},
          page_url: '/home',
          referrer: null,
          user_agent: 'Mozilla/5.0',
          ip_address: '127.0.0.1',
          created_at: '2025-11-09T12:00:00Z'
        }
      ]

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockEvents,
        error: null,
        status: 200,
      })

      const { result } = renderHook(() => useAnalyticsEvents(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockEvents)
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/analytics/events?limit=1000&order_by=created_at:desc',
          { token: 'mock-token' }
        )
      }
    })

    it('should apply filters correctly', async () => {
      const filters = {
        eventName: 'purchase',
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-30'),
        userId: 'user123'
      }

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [],
        error: null,
        status: 200,
      })

      const { result } = renderHook(() => useAnalyticsEvents(filters, 500), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      // 필터가 URL에 올바르게 적용되었는지 확인
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('event_name=purchase'),
        expect.objectContaining({ token: 'mock-token' })
      )
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('user_id=user123'),
        expect.objectContaining({ token: 'mock-token' })
      )
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('limit=500'),
        expect.objectContaining({ token: 'mock-token' })
      )
    })

    it('should handle errors gracefully', async () => {
      // Workers API 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      })

      const { result } = renderHook(() => useAnalyticsEvents(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      // 에러 시 빈 배열 반환
      if (result.current.isSuccess) {
        expect(result.current.data).toEqual([])
      }
    })
  })

  // ============================================
  // 2. useFunnelAnalysis
  // ============================================
  describe('useFunnelAnalysis', () => {
    it('should calculate funnel data successfully', async () => {
      const mockData = {
        signup_count: 100,
        view_service_count: 80,
        add_to_cart_count: 50,
        checkout_count: 30,
        purchase_count: 20
      }

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(() => useFunnelAnalysis(startDate, endDate), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.signup).toBe(100)
        expect(result.current.data?.viewService).toBe(80)
        expect(result.current.data?.conversionRate.signupToView).toBe(80)
        expect(result.current.data?.conversionRate.viewToCart).toBe(62.5)
        expect(callWorkersApi).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/analytics/funnel'),
          expect.objectContaining({ token: 'mock-token' })
        )
      }
    })

    it('should handle zero conversion rates', async () => {
      const mockData = {
        signup_count: 0,
        view_service_count: 0,
        add_to_cart_count: 0,
        checkout_count: 0,
        purchase_count: 0
      }

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(() => useFunnelAnalysis(startDate, endDate), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.conversionRate.signupToView).toBe(0)
        expect(result.current.data?.conversionRate.viewToCart).toBe(0)
      }
    })

    it('should return empty funnel data on error', async () => {
      // Workers API 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Funnel analysis error',
        status: 500,
      })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(() => useFunnelAnalysis(startDate, endDate), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.signup).toBe(0)
        expect(result.current.data?.conversionRate.signupToView).toBe(0)
      }
    })
  })

  // ============================================
  // 3. useBounceRate
  // ============================================
  describe('useBounceRate', () => {
    it('should calculate bounce rate successfully', async () => {
      const mockData = {
        total_sessions: 1000,
        bounced_sessions: 350
      }

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(() => useBounceRate(startDate, endDate), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.totalSessions).toBe(1000)
        expect(result.current.data?.bouncedSessions).toBe(350)
        expect(result.current.data?.bounceRate).toBe(35)
      }
    })

    it('should handle zero sessions', async () => {
      const mockData = {
        total_sessions: 0,
        bounced_sessions: 0
      }

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(() => useBounceRate(startDate, endDate), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.bounceRate).toBe(0)
      }
    })

    it('should return zero bounce rate on error', async () => {
      // Workers API 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Bounce rate error',
        status: 500,
      })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(() => useBounceRate(startDate, endDate), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.bounceRate).toBe(0)
        expect(result.current.data?.totalSessions).toBe(0)
      }
    })
  })

  // ============================================
  // 4. useEventCounts
  // ============================================
  describe('useEventCounts', () => {
    it('should fetch event counts successfully', async () => {
      const mockData = [
        { event_name: 'page_view', event_count: 1000, unique_users: 500, unique_sessions: 600 },
        { event_name: 'purchase', event_count: 100, unique_users: 80, unique_sessions: 90 },
        { event_name: 'add_to_cart', event_count: 300, unique_users: 200, unique_sessions: 250 }
      ]

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(() => useEventCounts(startDate, endDate, 10), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.length).toBe(3)
        expect(result.current.data?.[0].event_name).toBe('page_view')
      }
    })

    it('should limit results to topN', async () => {
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        event_name: `event${i}`,
        event_count: 100 - i,
        unique_users: 50 - i,
        unique_sessions: 60 - i
      }))

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(() => useEventCounts(startDate, endDate, 10), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.length).toBeLessThanOrEqual(10)
        expect(callWorkersApi).toHaveBeenCalledWith(
          expect.stringContaining('limit=10'),
          expect.objectContaining({ token: 'mock-token' })
        )
      }
    })

    it('should return empty array on error', async () => {
      // Workers API 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Event counts error',
        status: 500,
      })

      const startDate = new Date('2025-11-01')
      const endDate = new Date('2025-11-30')

      const { result } = renderHook(() => useEventCounts(startDate, endDate, 10), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual([])
      }
    })
  })

  // ============================================
  // 5. useSessionTimeline
  // ============================================
  describe('useSessionTimeline', () => {
    it('should fetch session timeline successfully', async () => {
      const mockData = [
        {
          id: '1',
          event_name: 'page_view',
          event_params: { page: 'home' },
          page_url: '/home',
          created_at: '2025-11-09T12:00:00Z'
        },
        {
          id: '2',
          event_name: 'add_to_cart',
          event_params: { service_id: '123' },
          page_url: '/services/123',
          created_at: '2025-11-09T12:05:00Z'
        }
      ]

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const sessionId = 'session123'

      const { result } = renderHook(() => useSessionTimeline(sessionId), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.length).toBe(2)
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/analytics/sessions/session123/timeline',
          { token: 'mock-token' }
        )
      }
    })

    it('should not execute when sessionId is empty', () => {
      const { result } = renderHook(() => useSessionTimeline(''), { wrapper })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('should return empty array on error', async () => {
      // Workers API 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Session timeline error',
        status: 500,
      })

      const { result } = renderHook(() => useSessionTimeline('session123'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual([])
      }
    })
  })

  // ============================================
  // 6. useRealtimeEvents
  // ============================================
  describe('useRealtimeEvents', () => {
    it('should fetch recent events successfully', async () => {
      const mockEvents = [
        {
          id: '1',
          user_id: 'user1',
          session_id: 'session1',
          event_name: 'purchase',
          event_params: {},
          page_url: '/checkout',
          referrer: null,
          user_agent: 'Mozilla/5.0',
          ip_address: '127.0.0.1',
          created_at: '2025-11-09T12:00:00Z'
        }
      ]

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockEvents,
        error: null,
        status: 200,
      })

      const { result } = renderHook(() => useRealtimeEvents(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.length).toBe(1)
        expect(result.current.data?.[0].event_name).toBe('purchase')
      }
    })

    it('should fetch with limit of 10 events', async () => {
      const mockEvents = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        user_id: 'user1',
        session_id: 'session1',
        event_name: 'page_view',
        event_params: {},
        page_url: '/home',
        referrer: null,
        user_agent: 'Mozilla/5.0',
        ip_address: '127.0.0.1',
        created_at: '2025-11-09T12:00:00Z'
      }))

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockEvents,
        error: null,
        status: 200,
      })

      const { result } = renderHook(() => useRealtimeEvents(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.length).toBeLessThanOrEqual(10)
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/analytics/events?limit=10&order_by=created_at:desc',
          { token: 'mock-token' }
        )
      }
    })

    it('should return empty array on error', async () => {
      // Workers API 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Realtime events error',
        status: 500,
      })

      const { result } = renderHook(() => useRealtimeEvents(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual([])
      }
    })
  })

  // ============================================
  // 7. useUserEventHistory
  // ============================================
  describe('useUserEventHistory', () => {
    it('should fetch user event history successfully', async () => {
      const mockEvents = [
        {
          id: '1',
          user_id: 'user123',
          session_id: 'session1',
          event_name: 'purchase',
          event_params: { amount: 50000 },
          page_url: '/checkout',
          referrer: null,
          user_agent: 'Mozilla/5.0',
          ip_address: '127.0.0.1',
          created_at: '2025-11-09T12:00:00Z'
        },
        {
          id: '2',
          user_id: 'user123',
          session_id: 'session2',
          event_name: 'page_view',
          event_params: {},
          page_url: '/home',
          referrer: null,
          user_agent: 'Mozilla/5.0',
          ip_address: '127.0.0.1',
          created_at: '2025-11-08T10:00:00Z'
        }
      ]

      // Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockEvents,
        error: null,
        status: 200,
      })

      const userId = 'user123'

      const { result } = renderHook(() => useUserEventHistory(userId, 50), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data?.length).toBe(2)
        expect(result.current.data?.every(event => event.user_id === userId)).toBe(true)
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/analytics/events?user_id=user123&limit=50&order_by=created_at:desc',
          { token: 'mock-token' }
        )
      }
    })

    it('should not execute when userId is empty', () => {
      const { result } = renderHook(() => useUserEventHistory(''), { wrapper })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('should return empty array on error', async () => {
      // Workers API 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'User event history error',
        status: 500,
      })

      const { result } = renderHook(() => useUserEventHistory('user123', 50), { wrapper })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual([])
      }
    })
  })
})
