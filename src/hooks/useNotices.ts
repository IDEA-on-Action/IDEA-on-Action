/**
 * useNotices Hook
 * Phase 11 Week 2: Notices System
 *
 * Provides CRUD operations for notices
 *
 * @migration Supabase → Cloudflare Workers (읽기 전용 API 전환)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { noticesApi } from '@/integrations/cloudflare/client'
import { supabase } from '@/integrations/supabase/client'
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
// 3. CREATE NOTICE
// =====================================================
export function useCreateNotice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: NoticeInsert) => {
      const { data: notice, error } = await supabase
        .from('notices')
        .insert(data)
        .select()
        .single()

      if (error) throw error

      return notice as Notice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() })
    },
  })
}

// =====================================================
// 4. UPDATE NOTICE
// =====================================================
export function useUpdateNotice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: NoticeUpdate }) => {
      const { data: notice, error } = await supabase
        .from('notices')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return notice as Notice
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
    },
  })
}

// =====================================================
// 5. DELETE NOTICE
// =====================================================
export function useDeleteNotice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() })
    },
  })
}

// =====================================================
// 6. INCREMENT VIEW COUNT
// =====================================================
export function useIncrementNoticeViewCount() {
  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch current view count
      const { data: notice } = await supabase
        .from('notices')
        .select('view_count')
        .eq('id', id)
        .single()

      if (notice) {
        await supabase
          .from('notices')
          .update({ view_count: (notice.view_count || 0) + 1 })
          .eq('id', id)
      }
    },
  })
}
