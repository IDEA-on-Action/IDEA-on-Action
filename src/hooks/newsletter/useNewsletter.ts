/**
 * Newsletter Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 뉴스레터 구독 관리
 * - 구독 신청
 * - 구독 확인
 * - 구독 취소
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { newsletterApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { toast } from 'sonner'

export interface NewsletterSubscription {
  id: string
  email: string
  status: 'pending' | 'confirmed' | 'unsubscribed'
  subscribed_at: string
  confirmed_at: string | null
  unsubscribed_at: string | null
  preferences: Record<string, unknown>
  metadata: Record<string, unknown>
}

/**
 * 뉴스레터 구독 신청
 */
export function useSubscribeNewsletter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (email: string) => {
      // 이메일 유효성 검사
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error('유효한 이메일 주소를 입력해주세요.')
      }

      // 구독 신청
      const result = await newsletterApi.subscribe(email, {
        source: 'website',
        subscribed_from: window.location.pathname,
        user_agent: navigator.userAgent,
      })

      if (result.error) {
        // 중복 이메일 처리
        if (result.status === 409) {
          throw new Error('이미 구독 중인 이메일입니다.')
        }
        throw new Error(result.error)
      }

      return result.data as NewsletterSubscription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast.success('뉴스레터 구독 신청 완료!', {
        description: '확인 이메일을 발송했습니다. 이메일을 확인해주세요.',
      })
    },
    onError: (error: Error) => {
      toast.error('구독 신청 실패', {
        description: error.message,
      })
    },
  })
}

/**
 * 뉴스레터 구독 확인
 */
export function useConfirmNewsletter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (token: string) => {
      // 토큰으로 구독 확인
      const result = await newsletterApi.confirm(token)

      if (result.error) {
        throw new Error(result.error)
      }

      return result.data as NewsletterSubscription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast.success('구독 확인 완료!', {
        description: '이제 뉴스레터를 받아보실 수 있습니다.',
      })
    },
    onError: () => {
      toast.error('구독 확인 실패', {
        description: '유효하지 않은 링크입니다.',
      })
    },
  })
}

/**
 * 뉴스레터 구독 취소
 */
export function useUnsubscribeNewsletter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (email: string) => {
      const result = await newsletterApi.unsubscribe(email)

      if (result.error) {
        throw new Error(result.error)
      }

      return result.data as NewsletterSubscription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast.success('구독 취소 완료', {
        description: '언제든지 다시 구독하실 수 있습니다.',
      })
    },
    onError: () => {
      toast.error('구독 취소 실패', {
        description: '잠시 후 다시 시도해주세요.',
      })
    },
  })
}

/**
 * 뉴스레터 통계 조회 (관리자용)
 */
export function useNewsletterStats() {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      if (!token) {
        throw new Error('인증이 필요합니다.')
      }

      const result = await newsletterApi.getStats(token)

      if (result.error) {
        throw new Error(result.error)
      }

      return result.data as {
        total: number
        pending: number
        confirmed: number
        unsubscribed: number
      }
    },
    enabled: !!workersTokens?.accessToken,
    staleTime: 60 * 1000, // 1분
  })
}
