/**
 * Newsletter Hook
 *
 * 뉴스레터 구독 관리
 * - 구독 신청
 * - 구독 확인
 * - 구독 취소
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
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
      const { data, error } = await supabase
        .from('newsletter_subscriptions')
        .insert({
          email,
          status: 'pending',
          metadata: {
            source: 'website',
            subscribed_from: window.location.pathname,
            user_agent: navigator.userAgent,
          },
        })
        .select()
        .single()

      if (error) {
        // 중복 이메일 처리
        if (error.code === '23505') {
          throw new Error('이미 구독 중인 이메일입니다.')
        }
        throw error
      }

      return data as NewsletterSubscription
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
      // 토큰으로 구독 확인 (실제로는 토큰 검증 로직 필요)
      const { data, error } = await supabase
        .from('newsletter_subscriptions')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', token)
        .select()
        .single()

      if (error) throw error

      return data as NewsletterSubscription
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
      const { data, error } = await supabase
        .from('newsletter_subscriptions')
        .update({
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('email', email)
        .select()
        .single()

      if (error) throw error

      return data as NewsletterSubscription
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
  return useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_subscriptions')
        .select('status')

      if (error) throw error

      // 상태별 카운트
      const stats = {
        total: data.length,
        pending: data.filter((s) => s.status === 'pending').length,
        confirmed: data.filter((s) => s.status === 'confirmed').length,
        unsubscribed: data.filter((s) => s.status === 'unsubscribed').length,
      }

      return stats
    },
    staleTime: 60 * 1000, // 1분
  })
}
