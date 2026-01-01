/**
 * useBlogPosts Hook
 * Phase 11 Week 1: Blog System
 *
 * Provides CRUD operations for blog posts
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { blogApi, callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/auth/useAuth'
import type {
  BlogPost,
  BlogPostWithRelations,
  BlogPostInsert,
  BlogPostUpdate,
  BlogPostFilters,
  BlogPostSortBy,
  BlogPostSortOrder,
  PostCategory,
  PostTag,
} from '@/types/cms/blog'
import { calculateReadingTime } from '@/types/cms/blog'

// =====================================================
// QUERY KEYS
// =====================================================
const QUERY_KEYS = {
  all: ['blog_posts'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (filters?: BlogPostFilters) => [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
  detailBySlug: (slug: string) => [...QUERY_KEYS.details(), 'slug', slug] as const,
  categories: ['post_categories'] as const,
  tags: ['post_tags'] as const,
}

// =====================================================
// 1. FETCH POSTS (List with Relations) - Workers API
// =====================================================
interface UsePostsOptions {
  filters?: BlogPostFilters
  sortBy?: BlogPostSortBy
  sortOrder?: BlogPostSortOrder
  limit?: number
  offset?: number
}

export function useBlogPosts(options: UsePostsOptions = {}) {
  const {
    filters = {},
    sortBy = 'published_at',
    sortOrder = 'desc',
    limit,
    offset = 0,
  } = options

  return useQuery({
    queryKey: QUERY_KEYS.list({ ...filters, sortBy, sortOrder } as BlogPostFilters),
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
    queryFn: async () => {
      // Workers API 호출
      const response = await blogApi.getPosts({
        status: filters.status,
        category_id: filters.category_id,
        search: filters.search,
        limit,
        offset,
      })

      if (response.error) {
        console.error('[useBlogPosts] API 오류:', response.error)
        return []
      }

      const result = response.data as { data: BlogPostWithRelations[] } | null
      return result?.data || []
    },
  })
}

// =====================================================
// 2. FETCH POST BY ID (Detail with Relations) - Workers API
// =====================================================
export function useBlogPost(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id || ''),
    staleTime: 1000 * 60 * 10, // 10분간 캐시 유지 (CMS Phase 4 최적화)
    queryFn: async () => {
      if (!id) throw new Error('Post ID is required')

      // Workers API로 ID로 조회
      const response = await callWorkersApi(`/api/v1/blog/posts/id/${id}`)

      if (response.error) {
        console.error('[useBlogPost] API 오류:', response.error)
        return null
      }

      const result = response.data as { data: BlogPostWithRelations } | null
      return result?.data || null
    },
    enabled: !!id,
  })
}

// =====================================================
// 3. FETCH POST BY SLUG (Public route) - Workers API
// =====================================================
export function useBlogPostBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detailBySlug(slug || ''),
    staleTime: 1000 * 60 * 10, // 10분간 캐시 유지
    queryFn: async () => {
      if (!slug) throw new Error('Post slug is required')

      const response = await blogApi.getPost(slug)

      if (response.error) {
        console.error('[useBlogPostBySlug] API 오류:', response.error)
        return null
      }

      const result = response.data as { data: BlogPostWithRelations } | null
      return result?.data || null
    },
    enabled: !!slug,
  })
}

// =====================================================
// 4. CREATE POST - Workers API
// =====================================================
export function useCreateBlogPost() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (data: BlogPostInsert & { tag_ids?: string[] }) => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('인증이 필요합니다')

      const { tag_ids, ...postData } = data

      // Calculate reading time if not provided
      if (!postData.read_time && postData.content) {
        postData.read_time = calculateReadingTime(postData.content)
      }

      const response = await blogApi.createPost(token, { ...postData, tag_ids })

      if (response.error) {
        throw new Error(response.error)
      }

      const result = response.data as { data: BlogPost } | null
      return result?.data as BlogPost
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() })
    },
  })
}

// =====================================================
// 5. UPDATE POST - Workers API
// =====================================================
export function useUpdateBlogPost() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BlogPostUpdate & { tag_ids?: string[] } }) => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('인증이 필요합니다')

      const { tag_ids, ...postData } = data

      // Calculate reading time if content changed
      if (postData.content) {
        postData.read_time = calculateReadingTime(postData.content)
      }

      const response = await blogApi.updatePost(token, id, { ...postData, tag_ids })

      if (response.error) {
        throw new Error(response.error)
      }

      const result = response.data as { data: BlogPost } | null
      return result?.data as BlogPost
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
    },
  })
}

// =====================================================
// 6. DELETE POST - Workers API
// =====================================================
export function useDeleteBlogPost() {
  const queryClient = useQueryClient()
  const { workersTokens } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const token = workersTokens?.accessToken
      if (!token) throw new Error('인증이 필요합니다')

      const response = await blogApi.deletePost(token, id)

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
// 7. INCREMENT VIEW COUNT - Workers API (상세 조회 시 자동 증가)
// =====================================================
export function useIncrementViewCount() {
  return useMutation({
    mutationFn: async (slug: string) => {
      // Workers API 상세 조회 시 view_count가 자동으로 증가됨
      const response = await blogApi.getPost(slug)
      if (response.error) {
        console.warn('[useIncrementViewCount] 조회수 증가 실패:', response.error)
      }
    },
  })
}

// =====================================================
// 8. FETCH CATEGORIES - Workers API
// =====================================================
export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.categories,
    staleTime: 1000 * 60 * 30, // 30분간 캐시 유지
    queryFn: async () => {
      const response = await blogApi.getCategories()

      if (response.error) {
        console.error('[useCategories] API 오류:', response.error)
        return []
      }

      const result = response.data as { data: PostCategory[] } | null
      return result?.data || []
    },
  })
}

// =====================================================
// 9. FETCH TAGS - Workers API
// =====================================================
export function useTags() {
  return useQuery({
    queryKey: QUERY_KEYS.tags,
    staleTime: 1000 * 60 * 30, // 30분간 캐시 유지
    queryFn: async () => {
      const response = await blogApi.getTags()

      if (response.error) {
        console.error('[useTags] API 오류:', response.error)
        return []
      }

      const result = response.data as { data: PostTag[] } | null
      return result?.data || []
    },
  })
}
