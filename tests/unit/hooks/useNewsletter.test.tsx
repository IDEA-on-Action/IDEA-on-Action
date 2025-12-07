import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import {
  useSubscribeNewsletter,
  useConfirmNewsletter,
  useUnsubscribeNewsletter,
  useNewsletterStats,
} from '@/hooks/useNewsletter'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(),
      update: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
      eq: vi.fn(),
    })),
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

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue(mockChain),
      } as any)

      const { result } = renderHook(() => useSubscribeNewsletter(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('test@example.com')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

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
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key' },
        }),
      }

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue(mockChain),
      } as any)

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

      const mockChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue(mockChain),
      } as any)

      const { result } = renderHook(() => useConfirmNewsletter(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('valid-token')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith(
        '구독 확인 완료!',
        expect.any(Object)
      )
    })

    it('잘못된 토큰은 에러를 발생시켜야 함', async () => {
      const mockChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid token' },
        }),
      }

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue(mockChain),
      } as any)

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

      const mockChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue(mockChain),
      } as any)

      const { result } = renderHook(() => useUnsubscribeNewsletter(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('test@example.com')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith(
        '구독 취소 완료',
        expect.any(Object)
      )
    })

    it('존재하지 않는 이메일은 에러를 발생시켜야 함', async () => {
      const mockChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue(mockChain),
      } as any)

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
    it('뉴스레터 통계를 올바르게 계산해야 함', async () => {
      const mockData = [
        { status: 'pending' },
        { status: 'pending' },
        { status: 'confirmed' },
        { status: 'confirmed' },
        { status: 'confirmed' },
        { status: 'unsubscribed' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      } as any)

      const { result } = renderHook(() => useNewsletterStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual({
        total: 6,
        pending: 2,
        confirmed: 3,
        unsubscribed: 1,
      })
    })

    it('빈 데이터는 0으로 통계를 계산해야 함', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any)

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
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      } as any)

      const { result } = renderHook(() => useNewsletterStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })
})
