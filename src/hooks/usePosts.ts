/**
 * usePosts Hook
 *
 * 블로그 게시물 관련 React Query 훅
 * - 게시물 목록 조회 (필터링, 정렬)
 * - 게시물 상세 조회
 * - 게시물 생성/수정/삭제
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Post, PostInsert, PostUpdate, PostWithAuthor } from '@/types/database'

// ===================================================================
// Query Keys
// ===================================================================

export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: PostFilters) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (slug: string) => [...postKeys.details(), slug] as const,
}

// ===================================================================
// Types
// ===================================================================

export interface PostFilters {
  status?: 'draft' | 'published' | 'all'
  tag?: string
  category?: string
  search?: string
  limit?: number
}

// ===================================================================
// 게시물 목록 조회
// ===================================================================

export function usePosts(filters: PostFilters = {}) {
  const { status = 'published', tag, category, search, limit } = filters

  return useQuery({
    queryKey: postKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })

      // 상태 필터
      if (status !== 'all') {
        query = query.eq('status', status)
      }

      // 태그 필터
      if (tag) {
        query = query.contains('tags', [tag])
      }

      // 카테고리 필터
      if (category) {
        query = query.contains('categories', [category])
      }

      // 검색
      if (search) {
        query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)
      }

      // 개수 제한
      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching posts:', error)
        throw new Error(error.message)
      }

      return (data || []) as Post[]
    },
    staleTime: 1000 * 60 * 5, // 5분
  })
}

// ===================================================================
// 게시물 상세 조회 (slug 기반)
// ===================================================================

export function usePostBySlug(slug: string) {
  return useQuery({
    queryKey: postKeys.detail(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error) {
        console.error('Error fetching post:', error)
        throw new Error(error.message)
      }

      return data as Post
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10분
  })
}

// ===================================================================
// 게시물 생성
// ===================================================================

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PostInsert) => {
      // slug 생성 (title 기반)
      const slug = input.slug || generateSlug(input.title)

      const { data, error } = await supabase
        .from('posts')
        .insert({
          ...input,
          slug,
          published_at: input.status === 'published' ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating post:', error)
        throw new Error(error.message)
      }

      return data as Post
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all })
    },
  })
}

// ===================================================================
// 게시물 수정
// ===================================================================

export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PostUpdate }) => {
      // 발행 시 published_at 설정
      const updateData: PostUpdate = { ...updates }
      if (updates.status === 'published' && !updates.published_at) {
        updateData.published_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating post:', error)
        throw new Error(error.message)
      }

      return data as Post
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: postKeys.all })
      queryClient.setQueryData(postKeys.detail(data.slug), data)
    },
  })
}

// ===================================================================
// 게시물 삭제
// ===================================================================

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting post:', error)
        throw new Error(error.message)
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all })
    },
  })
}

// ===================================================================
// 태그/카테고리 목록 조회
// ===================================================================

export function usePostTags() {
  return useQuery({
    queryKey: ['post-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('tags')
        .eq('status', 'published')

      if (error) {
        console.error('Error fetching tags:', error)
        return []
      }

      // 모든 태그를 평탄화하고 중복 제거
      const allTags = data?.flatMap((post) => post.tags || []) || []
      return [...new Set(allTags)].sort()
    },
    staleTime: 1000 * 60 * 30, // 30분
  })
}

export function usePostCategories() {
  return useQuery({
    queryKey: ['post-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('categories')
        .eq('status', 'published')

      if (error) {
        console.error('Error fetching categories:', error)
        return []
      }

      // 모든 카테고리를 평탄화하고 중복 제거
      const allCategories = data?.flatMap((post) => post.categories || []) || []
      return [...new Set(allCategories)].sort()
    },
    staleTime: 1000 * 60 * 30, // 30분
  })
}

// ===================================================================
// Utility Functions
// ===================================================================

/**
 * 제목을 URL-friendly slug로 변환
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣-]/g, '') // 특수문자 제거 (한글 허용)
    .replace(/[\s_-]+/g, '-') // 공백/언더스코어를 하이픈으로
    .replace(/^-+|-+$/g, '') // 앞뒤 하이픈 제거
    .concat('-', Date.now().toString(36)) // 고유성을 위해 타임스탬프 추가
}

/**
 * 게시물 상태 한글 변환
 */
export function getPostStatusLabel(status: Post['status']): string {
  return status === 'published' ? '발행됨' : '임시저장'
}

/**
 * 읽기 시간 계산 (분)
 */
export function getReadingTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / wordsPerMinute))
}
