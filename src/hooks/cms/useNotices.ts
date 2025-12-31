/**
 * useNotices Hook
 * Phase 11 Week 2: Notices System
 *
 * Provides CRUD operations for notices
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { noticesApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import type {
  Notice,
  NoticeWithAuthor,
  NoticeInsert,
  NoticeUpdate,
  NoticeFilters,
  NoticeSortBy,
  NoticeSortOrder,
} from '@/types/notice'

// =====================================================
// QUERY KEYS
// =====================================================
const QUERY_KEYS = {
  all: ['notices'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (filters?: NoticeFilters) => [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
}

// =====================================================
// 1. FETCH NOTICES (List with Author) - Workers API
// =====================================================
interface UseNoticesOptions {
  filters?: NoticeFilters
  sortBy?: NoticeSortBy
  sortOrder?: NoticeSortOrder
  limit?: number
  offset?: number
}

export function useNotices(options: UseNoticesOptions = {}) {
  const {
    filters = {},
    sortBy = 'published_at',
    sortOrder = 'desc',
    limit,
    offset = 0,
  } = options

  return useQuery({
    queryKey: QUERY_KEYS.list({ ...filters, sortBy, sortOrder } as NoticeFilters),
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
    queryFn: async () => {
      // Workers API 호출
      const response = await noticesApi.list({
        type: filters.type,
        include_expired: filters.include_expired,
        limit,
        offset,
      })

      if (response.error) {
        console.error('[useNotices] API 오류:', response.error)
        return []
      }

      const result = response.data as { data: NoticeWithAuthor[] } | null
      return result?.data || []
    },
  })
}

// =====================================================
// 2. FETCH NOTICE BY ID (Detail with Author) - Workers API
// =====================================================
export function useNotice(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id || ''),
    staleTime: 1000 * 60 * 10, // 10분간 캐시 유지
    queryFn: async () => {
      if (!id) throw new Error('Notice ID is required')

      const response = await noticesApi.getById(id)

      if (response.error) {
        console.error('[useNotice] API 오류:', response.error)
        return null
      }

      const result = response.data as { data: NoticeWithAuthor } | null
      return result?.data || null
    },
    enabled: !!id,
  })
}

// =====================================================
// 3. CREATE NOTICE - Workers API
// =====================================================
export function useCreateNotice() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (data: NoticeInsert) => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('인증이 필요합니다')

      const response = await noticesApi.create(token, data as Record<string, unknown>)

      if (response.error) {
        throw new Error(response.error)
      }

      const result = response.data as { data: Notice } | null
      return result?.data as Notice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() })
    },
  })
}

// =====================================================
// 4. UPDATE NOTICE - Workers API
// =====================================================
export function useUpdateNotice() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: NoticeUpdate }) => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('인증이 필요합니다')

      const response = await noticesApi.update(token, id, data as Record<string, unknown>)

      if (response.error) {
        throw new Error(response.error)
      }

      const result = response.data as { data: Notice } | null
      return result?.data as Notice
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
    },
  })
}

// =====================================================
// 5. DELETE NOTICE - Workers API
// =====================================================
export function useDeleteNotice() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('인증이 필요합니다')

      const response = await noticesApi.delete(token, id)

      if (response.error) {
        throw new Error(response.error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() })
    },
  })
}

// =====================================================
// 6. INCREMENT VIEW COUNT - Workers API (상세 조회 시 자동 증가)
// =====================================================
export function useIncrementNoticeViewCount() {
  return useMutation({
    mutationFn: async (id: string) => {
      // Workers API 상세 조회 시 view_count가 자동으로 증가됨
      // 별도 API 호출 없이 상세 조회만 하면 됨
      const response = await noticesApi.getById(id)
      if (response.error) {
        console.warn('[useIncrementNoticeViewCount] 조회수 증가 실패:', response.error)
      }
    },
  })
}
