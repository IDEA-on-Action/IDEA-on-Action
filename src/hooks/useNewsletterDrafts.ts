/**
 * Newsletter Drafts Hooks
 *
 * 뉴스레터 드래프트 및 스케줄 발송 관리 훅
 *
 * @module useNewsletterDrafts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
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
  return useQuery({
    queryKey: ['newsletter-drafts', filters],
    queryFn: async () => {
      let query = supabase
        .from('newsletter_drafts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // 상태 필터
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      // 검색 (제목)
      if (filters?.search) {
        query = query.ilike('subject', `%${filters.search}%`)
      }

      // 페이지네이션
      const limit = filters?.limit || 20
      const offset = filters?.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Newsletter drafts query error:', error)
        throw new Error(`드래프트 목록 조회 실패: ${error.message}`)
      }

      return {
        data: data as NewsletterDraft[],
        count,
      }
    },
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
  return useQuery({
    queryKey: ['newsletter-draft', id],
    queryFn: async () => {
      if (!id) throw new Error('ID가 필요합니다')

      const { data, error } = await supabase
        .from('newsletter_drafts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Newsletter draft query error:', error)
        throw new Error(`드래프트 조회 실패: ${error.message}`)
      }

      return data as NewsletterDraft
    },
    enabled: !!id,
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

  return useMutation({
    mutationFn: async (request: CreateDraftRequest) => {
      // 현재 사용자 ID 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const insertData = {
        subject: request.subject,
        content: request.content,
        preview: request.preview || request.content.substring(0, 200),
        status: request.scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: request.scheduled_at,
        segment_filter: request.segment_filter || {},
        created_by: user?.id,
      }

      const { data, error } = await supabase
        .from('newsletter_drafts')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Create newsletter draft error:', error)
        throw new Error(`드래프트 생성 실패: ${error.message}`)
      }

      return data as NewsletterDraft
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

  return useMutation({
    mutationFn: async (request: UpdateDraftRequest) => {
      const { id, ...updates } = request

      // preview 자동 생성
      if (updates.content && !updates.preview) {
        updates.preview = updates.content.substring(0, 200)
      }

      const { data, error } = await supabase
        .from('newsletter_drafts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Update newsletter draft error:', error)
        throw new Error(`드래프트 수정 실패: ${error.message}`)
      }

      return data as NewsletterDraft
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('newsletter_drafts')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Delete newsletter draft error:', error)
        throw new Error(`드래프트 삭제 실패: ${error.message}`)
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

  return useMutation({
    mutationFn: async (request: ScheduleDraftRequest) => {
      const { data, error } = await supabase
        .from('newsletter_drafts')
        .update({
          status: 'scheduled',
          scheduled_at: request.scheduled_at,
        })
        .eq('id', request.id)
        .select()
        .single()

      if (error) {
        console.error('Schedule newsletter draft error:', error)
        throw new Error(`예약 설정 실패: ${error.message}`)
      }

      return data as NewsletterDraft
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('newsletter_drafts')
        .update({
          status: 'cancelled',
          scheduled_at: null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Cancel scheduled newsletter error:', error)
        throw new Error(`예약 취소 실패: ${error.message}`)
      }

      return data as NewsletterDraft
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
// 즉시 발송 (Edge Function 호출)
// ============================================

/**
 * 뉴스레터 즉시 발송
 */
export function useSendNewsletter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: SendDraftRequest): Promise<NewsletterSendResult> => {
      const { data, error } = await supabase.functions.invoke('newsletter-send', {
        body: request,
      })

      if (error) {
        console.error('Send newsletter error:', error)
        throw new Error(`발송 실패: ${error.message}`)
      }

      return data as NewsletterSendResult
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
  return useQuery({
    queryKey: ['newsletter-draft-stats'],
    queryFn: async () => {
      // newsletter_stats 뷰 조회
      const { data, error } = await supabase
        .from('newsletter_stats')
        .select('*')
        .single()

      if (error) {
        // 뷰가 없는 경우 직접 계산
        const { data: drafts, error: draftsError } = await supabase
          .from('newsletter_drafts')
          .select('status, sent_count, recipient_count')

        if (draftsError) {
          console.error('Newsletter draft stats error:', draftsError)
          throw new Error(`통계 조회 실패: ${draftsError.message}`)
        }

        return {
          draft_count: drafts.filter((d) => d.status === 'draft').length,
          scheduled_count: drafts.filter((d) => d.status === 'scheduled').length,
          sent_count: drafts.filter((d) => d.status === 'sent').length,
          failed_count: drafts.filter((d) => d.status === 'failed').length,
          total_emails_sent: drafts.reduce((sum, d) => sum + (d.sent_count || 0), 0),
          total_recipients: drafts.reduce((sum, d) => sum + (d.recipient_count || 0), 0),
        } as NewsletterDraftStats
      }

      return data as NewsletterDraftStats
    },
    staleTime: 60 * 1000, // 1분
  })
}
