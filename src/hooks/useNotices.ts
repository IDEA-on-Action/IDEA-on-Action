/**
 * useNotices Hook
 * Phase 11 Week 2: Notices System
 *
 * Provides CRUD operations for notices
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
// 1. FETCH NOTICES (List with Author)
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
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지 (CMS Phase 4 최적화)
    queryFn: async () => {
      // Note: auth.users 테이블은 FK 조인이 불가능하므로 author 정보는 별도 조회 필요
      let query = supabase
        .from('notices')
        .select('*')

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.type) {
        query = query.eq('type', filters.type)
      }
      if (filters.author_id) {
        query = query.eq('author_id', filters.author_id)
      }
      if (filters.is_pinned !== undefined) {
        query = query.eq('is_pinned', filters.is_pinned)
      }

      // Exclude expired notices unless explicitly requested
      if (!filters.include_expired) {
        query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      }

      // Apply sorting
      // Pinned notices always come first
      if (sortBy === 'published_at') {
        query = query.order('is_pinned', { ascending: false })
        query = query.order(sortBy, { ascending: sortOrder === 'asc', nullsFirst: false })
      } else {
        query = query.order('is_pinned', { ascending: false })
        query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      }

      // Apply pagination
      if (limit) {
        query = query.range(offset, offset + limit - 1)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []) as NoticeWithAuthor[]
    },
  })
}

// =====================================================
// 2. FETCH NOTICE BY ID (Detail with Author)
// =====================================================
export function useNotice(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id || ''),
    staleTime: 1000 * 60 * 10, // 10분간 캐시 유지 (CMS Phase 4 최적화)
    queryFn: async () => {
      if (!id) throw new Error('Notice ID is required')

      // Note: auth.users 테이블은 FK 조인이 불가능하므로 author 정보는 별도 조회 필요
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data as NoticeWithAuthor
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
