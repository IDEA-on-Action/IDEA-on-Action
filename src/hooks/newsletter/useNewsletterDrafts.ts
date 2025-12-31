/**
 * Newsletter Drafts Hooks
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 뉴스레터 드래프트 및 스케줄 발송 관리 훅
 *
 * @module useNewsletterDrafts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { newsletterApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

// ============================================
// 타입 정의
// ============================================

export type NewsletterDraftStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled'

export interface NewsletterDraft {
  id: string
  subject: string
  content: string
  preview?: string
  status: NewsletterDraftStatus
  scheduled_at?: string
  sent_at?: string
  segment_filter?: {
    status?: string
    topics?: string[]
  }
  created_at: string
  updated_at: string
  created_by?: string
  recipient_count: number
  sent_count: number
  failed_count: number
  error_message?: string
}

export interface CreateDraftRequest {
  subject: string
  content: string
  preview?: string
  scheduled_at?: string
  segment_filter?: {
    status?: string
    topics?: string[]
  }
}

export interface UpdateDraftRequest extends Partial<CreateDraftRequest> {
  id: string
}

export interface ScheduleDraftRequest {
  id: string
  scheduled_at: string
}

export interface SendDraftRequest {
  newsletter_id: string
  test_mode?: boolean
  test_email?: string
}

export interface NewsletterSendResult {
  success: boolean
  sent_count: number
  failed_count: number
  newsletter_id: string
  errors?: string[]
  message?: string
}

// ============================================
// 드래프트 목록 조회
// ============================================

export interface DraftFilters {
  status?: NewsletterDraftStatus | 'all'
  search?: string
  limit?: number
  offset?: number
}

/**
 * 뉴스레터 드래프트 목록 조회
 */
export function useNewsletterDrafts(filters?: DraftFilters) {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['newsletter-drafts', filters],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      if (!token) {
        throw new Error('인증이 필요합니다.')
      }

      const result = await newsletterApi.getDrafts(token, {
        status: filters?.status,
        search: filters?.search,
        limit: filters?.limit || 20,
        offset: filters?.offset || 0,
      })

      if (result.error) {
        console.error('Newsletter drafts query error:', result.error)
        throw new Error(`드래프트 목록 조회 실패: ${result.error}`)
      }

      const responseData = result.data as { data: NewsletterDraft[]; count: number }
      return {
        data: responseData.data as NewsletterDraft[],
        count: responseData.count,
      }
    },
    enabled: !!workersTokens?.accessToken,
    staleTime: 30 * 1000, // 30초
  })
}

// ============================================
// 단일 드래프트 조회
// ============================================

/**
 * 뉴스레터 드래프트 상세 조회
 */
export function useNewsletterDraft(id: string | undefined) {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['newsletter-draft', id],
    queryFn: async () => {
      if (!id) throw new Error('ID가 필요합니다')

      const token = workersTokens?.accessToken
      if (!token) {
        throw new Error('인증이 필요합니다.')
      }

      const result = await newsletterApi.getDraft(token, id)

      if (result.error) {
        console.error('Newsletter draft query error:', result.error)
        throw new Error(`드래프트 조회 실패: ${result.error}`)
      }

      return result.data as NewsletterDraft
    },
    enabled: !!id && !!workersTokens?.accessToken,
    staleTime: 60 * 1000, // 1분
  })
}

// ============================================
// 드래프트 생성
// ============================================

/**
 * 뉴스레터 드래프트 생성
 */
export function useCreateNewsletterDraft() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (request: CreateDraftRequest) => {
      const token = workersTokens?.accessToken
      if (!token) {
        throw new Error('인증이 필요합니다.')
      }

      const result = await newsletterApi.createDraft(token, {
        subject: request.subject,
        content: request.content,
        preview: request.preview || request.content.substring(0, 200),
        scheduled_at: request.scheduled_at,
        segment_filter: request.segment_filter || {},
      })

      if (result.error) {
        console.error('Create newsletter draft error:', result.error)
        throw new Error(`드래프트 생성 실패: ${result.error}`)
      }

      return result.data as NewsletterDraft
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-drafts'] })
      toast.success(
        data.status === 'scheduled'
          ? '뉴스레터가 예약되었습니다.'
          : '드래프트가 저장되었습니다.'
      )
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================
// 드래프트 수정
// ============================================

/**
 * 뉴스레터 드래프트 수정
 */
export function useUpdateNewsletterDraft() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (request: UpdateDraftRequest) => {
      const token = workersTokens?.accessToken
      if (!token) {
        throw new Error('인증이 필요합니다.')
      }

      const { id, ...updates } = request

      // preview 자동 생성
      if (updates.content && !updates.preview) {
        updates.preview = updates.content.substring(0, 200)
      }

      const result = await newsletterApi.updateDraft(token, id, updates)

      if (result.error) {
        console.error('Update newsletter draft error:', result.error)
        throw new Error(`드래프트 수정 실패: ${result.error}`)
      }

      return result.data as NewsletterDraft
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-drafts'] })
      queryClient.invalidateQueries({ queryKey: ['newsletter-draft', data.id] })
      toast.success('드래프트가 수정되었습니다.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================
// 드래프트 삭제
// ============================================

/**
 * 뉴스레터 드래프트 삭제
 */
export function useDeleteNewsletterDraft() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const token = workersTokens?.accessToken
      if (!token) {
        throw new Error('인증이 필요합니다.')
      }

      const result = await newsletterApi.deleteDraft(token, id)

      if (result.error) {
        console.error('Delete newsletter draft error:', result.error)
        throw new Error(`드래프트 삭제 실패: ${result.error}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-drafts'] })
      toast.success('드래프트가 삭제되었습니다.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================
// 발송 예약
// ============================================

/**
 * 뉴스레터 발송 예약
 */
export function useScheduleNewsletterDraft() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (request: ScheduleDraftRequest) => {
      const token = workersTokens?.accessToken
      if (!token) {
        throw new Error('인증이 필요합니다.')
      }

      const result = await newsletterApi.scheduleDraft(token, request.id, request.scheduled_at)

      if (result.error) {
        console.error('Schedule newsletter draft error:', result.error)
        throw new Error(`예약 설정 실패: ${result.error}`)
      }

      return result.data as NewsletterDraft
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-drafts'] })
      queryClient.invalidateQueries({ queryKey: ['newsletter-draft', data.id] })

      const scheduledDate = new Date(data.scheduled_at!).toLocaleString('ko-KR')
      toast.success(`${scheduledDate}에 발송 예약되었습니다.`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================
// 예약 취소
// ============================================

/**
 * 뉴스레터 예약 취소
 */
export function useCancelScheduledNewsletter() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const token = workersTokens?.accessToken
      if (!token) {
        throw new Error('인증이 필요합니다.')
      }

      const result = await newsletterApi.cancelSchedule(token, id)

      if (result.error) {
        console.error('Cancel scheduled newsletter error:', result.error)
        throw new Error(`예약 취소 실패: ${result.error}`)
      }

      return result.data as NewsletterDraft
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-drafts'] })
      queryClient.invalidateQueries({ queryKey: ['newsletter-draft', data.id] })
      toast.success('예약이 취소되었습니다.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================
// 즉시 발송 (Workers API 호출)
// ============================================

/**
 * 뉴스레터 즉시 발송
 */
export function useSendNewsletter() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (request: SendDraftRequest): Promise<NewsletterSendResult> => {
      const token = workersTokens?.accessToken
      if (!token) {
        throw new Error('인증이 필요합니다.')
      }

      const result = await newsletterApi.sendNewsletter(token, request)

      if (result.error) {
        console.error('Send newsletter error:', result.error)
        throw new Error(`발송 실패: ${result.error}`)
      }

      return result.data as NewsletterSendResult
    },
    onSuccess: (result, request) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-drafts'] })
      queryClient.invalidateQueries({ queryKey: ['newsletter-draft', request.newsletter_id] })

      if (request.test_mode) {
        toast.success(result.message || '테스트 이메일이 발송되었습니다.')
      } else {
        toast.success(
          `${result.sent_count}명에게 발송 완료${result.failed_count > 0 ? ` (${result.failed_count}명 실패)` : ''}`
        )
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================
// 통계
// ============================================

export interface NewsletterDraftStats {
  draft_count: number
  scheduled_count: number
  sent_count: number
  failed_count: number
  total_emails_sent: number
  total_recipients: number
}

/**
 * 뉴스레터 드래프트 통계
 */
export function useNewsletterDraftStats() {
  const { workersTokens } = useAuth()

  return useQuery({
    queryKey: ['newsletter-draft-stats'],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      if (!token) {
        throw new Error('인증이 필요합니다.')
      }

      const result = await newsletterApi.getDraftStats(token)

      if (result.error) {
        console.error('Newsletter draft stats error:', result.error)
        throw new Error(`통계 조회 실패: ${result.error}`)
      }

      return result.data as NewsletterDraftStats
    },
    enabled: !!workersTokens?.accessToken,
    staleTime: 60 * 1000, // 1분
  })
}
