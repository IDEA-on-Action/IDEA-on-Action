/**
 * useNewsletter Hook 테스트
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as cloudflareClient from '@/integrations/cloudflare/client'
import {
  useSubscribeNewsletter,
  useConfirmNewsletter,
  useUnsubscribeNewsletter,
  useNewsletterStats,
} from '@/hooks/useNewsletter'
import { toast } from 'sonner'

// Mock Workers API
vi.mock('@/integrations/cloudflare/client', () => ({
  newsletterApi: {
    subscribe: vi.fn(),
    confirm: vi.fn(),
    unsubscribe: vi.fn(),
    getStats: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useNewsletter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useSubscribeNewsletter', () => {
    it('유효한 이메일로 구독 신청이 성공해야 함', async () => {
      const mockData = {
        id: '123',
        email: 'test@example.com',
        status: 'pending',
        subscribed_at: new Date().toISOString(),
        confirmed_at: null,
        unsubscribed_at: null,
        preferences: {},
        metadata: {},
      }

      vi.mocked(cloudflareClient.newsletterApi.subscribe).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const { result } = renderHook(() => useSubscribeNewsletter(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('test@example.com')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(cloudflareClient.newsletterApi.subscribe).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(Object)
      )
      expect(toast.success).toHaveBeenCalledWith(
        '뉴스레터 구독 신청 완료!',
        expect.any(Object)
      )
    })

    it('잘못된 이메일 형식은 에러를 발생시켜야 함', async () => {
      const { result } = renderHook(() => useSubscribeNewsletter(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('invalid-email')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalled()
    })

    it('중복 이메일은 에러 메시지를 표시해야 함', async () => {
      vi.mocked(cloudflareClient.newsletterApi.subscribe).mockResolvedValue({
        data: null,
        error: '이미 구독 중인 이메일입니다.',
        status: 409,
      })

      const { result } = renderHook(() => useSubscribeNewsletter(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('duplicate@example.com')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalled()
    })
  })

  describe('useConfirmNewsletter', () => {
    it('유효한 토큰으로 구독 확인이 성공해야 함', async () => {
      const mockData = {
        id: '123',
        email: 'test@example.com',
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      }

      vi.mocked(cloudflareClient.newsletterApi.confirm).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const { result } = renderHook(() => useConfirmNewsletter(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('valid-token')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(cloudflareClient.newsletterApi.confirm).toHaveBeenCalledWith('valid-token')
      expect(toast.success).toHaveBeenCalledWith(
        '구독 확인 완료!',
        expect.any(Object)
      )
    })

    it('잘못된 토큰은 에러를 발생시켜야 함', async () => {
      vi.mocked(cloudflareClient.newsletterApi.confirm).mockResolvedValue({
        data: null,
        error: 'Invalid token',
        status: 400,
      })

      const { result } = renderHook(() => useConfirmNewsletter(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('invalid-token')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalled()
    })
  })

  describe('useUnsubscribeNewsletter', () => {
    it('구독 취소가 성공해야 함', async () => {
      const mockData = {
        id: '123',
        email: 'test@example.com',
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      }

      vi.mocked(cloudflareClient.newsletterApi.unsubscribe).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const { result } = renderHook(() => useUnsubscribeNewsletter(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('test@example.com')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(cloudflareClient.newsletterApi.unsubscribe).toHaveBeenCalledWith('test@example.com')
      expect(toast.success).toHaveBeenCalledWith(
        '구독 취소 완료',
        expect.any(Object)
      )
    })

    it('존재하지 않는 이메일은 에러를 발생시켜야 함', async () => {
      vi.mocked(cloudflareClient.newsletterApi.unsubscribe).mockResolvedValue({
        data: null,
        error: 'Not found',
        status: 404,
      })

      const { result } = renderHook(() => useUnsubscribeNewsletter(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('nonexistent@example.com')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalled()
    })
  })

  describe('useNewsletterStats', () => {
    it('뉴스레터 통계를 올바르게 조회해야 함', async () => {
      const mockData = {
        total: 6,
        pending: 2,
        confirmed: 3,
        unsubscribed: 1,
      }

      vi.mocked(cloudflareClient.newsletterApi.getStats).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const { result } = renderHook(() => useNewsletterStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(cloudflareClient.newsletterApi.getStats).toHaveBeenCalledWith('test-token')
      expect(result.current.data).toEqual({
        total: 6,
        pending: 2,
        confirmed: 3,
        unsubscribed: 1,
      })
    })

    it('빈 데이터는 0으로 통계를 계산해야 함', async () => {
      const mockData = {
        total: 0,
        pending: 0,
        confirmed: 0,
        unsubscribed: 0,
      }

      vi.mocked(cloudflareClient.newsletterApi.getStats).mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
      })

      const { result } = renderHook(() => useNewsletterStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual({
        total: 0,
        pending: 0,
        confirmed: 0,
        unsubscribed: 0,
      })
    })

    it('데이터베이스 에러를 처리해야 함', async () => {
      vi.mocked(cloudflareClient.newsletterApi.getStats).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      })

      const { result } = renderHook(() => useNewsletterStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })
})
