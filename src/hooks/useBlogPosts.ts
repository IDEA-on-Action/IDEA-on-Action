/**
 * useBlogPosts Hook
 * Phase 11 Week 1: Blog System
 *
 * Provides CRUD operations for blog posts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
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
} from '@/types/blog'
import { calculateReadingTime } from '@/types/blog'

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
// 1. FETCH POSTS (List with Relations)
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
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          author:author_id(id, email, raw_user_meta_data),
          category:category_id(id, name, slug),
          tags:post_tag_relations(tag:tag_id(id, name, slug))
        `)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id)
      }
      if (filters.author_id) {
        query = query.eq('author_id', filters.author_id)
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`)
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Apply pagination
      if (limit) {
        query = query.range(offset, offset + limit - 1)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform data to include tags as array
      const posts: BlogPostWithRelations[] = (data || []).map((post: unknown) => {
        const p = post as BlogPost & { tags?: Array<{ tag: PostTag }> }
        return {
          ...p,
          tags: p.tags?.map((t) => t.tag).filter(Boolean) || [],
        }
      })

      return posts
    },
  })
}

// =====================================================
// 2. FETCH POST BY ID (Detail with Relations)
// =====================================================
export function useBlogPost(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Post ID is required')

      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:author_id(id, email, raw_user_meta_data),
          category:category_id(id, name, slug, description),
          tags:post_tag_relations(tag:tag_id(id, name, slug))
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      // Transform data
      const d = data as BlogPost & { tags?: Array<{ tag: PostTag }> }
      const post: BlogPostWithRelations = {
        ...d,
        tags: d.tags?.map((t) => t.tag).filter(Boolean) || [],
      }

      return post
    },
    enabled: !!id,
  })
}

// =====================================================
// 3. FETCH POST BY SLUG (Public route)
// =====================================================
export function useBlogPostBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detailBySlug(slug || ''),
    queryFn: async () => {
      if (!slug) throw new Error('Post slug is required')

      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:author_id(id, email, raw_user_meta_data),
          category:category_id(id, name, slug, description),
          tags:post_tag_relations(tag:tag_id(id, name, slug))
        `)
        .eq('slug', slug)
        .single()

      if (error) throw error

      // Transform data
      const d = data as BlogPost & { tags?: Array<{ tag: PostTag }> }
      const post: BlogPostWithRelations = {
        ...d,
        tags: d.tags?.map((t) => t.tag).filter(Boolean) || [],
      }

      return post
    },
    enabled: !!slug,
  })
}

// =====================================================
// 4. CREATE POST
// =====================================================
export function useCreateBlogPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BlogPostInsert & { tag_ids?: string[] }) => {
      const { tag_ids, ...postData } = data

      // Calculate reading time if not provided
      if (!postData.read_time && postData.content) {
        postData.read_time = calculateReadingTime(postData.content)
      }

      // Insert blog post
      const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .insert(postData)
        .select()
        .single()

      if (postError) throw postError

      // Insert tag relations
      if (tag_ids && tag_ids.length > 0) {
        const relations = tag_ids.map(tag_id => ({
          post_id: post.id,
          tag_id,
        }))

        const { error: tagError } = await supabase
          .from('post_tag_relations')
          .insert(relations)

        if (tagError) throw tagError
      }

      return post as BlogPost
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() })
    },
  })
}

// =====================================================
// 5. UPDATE POST
// =====================================================
export function useUpdateBlogPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BlogPostUpdate & { tag_ids?: string[] } }) => {
      const { tag_ids, ...postData } = data

      // Calculate reading time if content changed
      if (postData.content) {
        postData.read_time = calculateReadingTime(postData.content)
      }

      // Update blog post
      const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', id)
        .select()
        .single()

      if (postError) throw postError

      // Update tag relations if provided
      if (tag_ids !== undefined) {
        // Delete existing relations
        await supabase
          .from('post_tag_relations')
          .delete()
          .eq('post_id', id)

        // Insert new relations
        if (tag_ids.length > 0) {
          const relations = tag_ids.map(tag_id => ({
            post_id: id,
            tag_id,
          }))

          const { error: tagError } = await supabase
            .from('post_tag_relations')
            .insert(relations)

          if (tagError) throw tagError
        }
      }

      return post as BlogPost
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
    },
  })
}

// =====================================================
// 6. DELETE POST
// =====================================================
export function useDeleteBlogPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_posts')
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
// 7. INCREMENT VIEW COUNT
// =====================================================
export function useIncrementViewCount() {
  return useMutation({
    mutationFn: async (id: string) => {
      // Use Supabase RPC for atomic increment
      const { error } = await supabase.rpc('increment_post_view_count', {
        post_id: id,
      })

      if (error) {
        // Fallback: manual increment
        const { data: post } = await supabase
          .from('blog_posts')
          .select('view_count')
          .eq('id', id)
          .single()

        if (post) {
          await supabase
            .from('blog_posts')
            .update({ view_count: (post.view_count || 0) + 1 })
            .eq('id', id)
        }
      }
    },
  })
}

// =====================================================
// 8. FETCH CATEGORIES
// =====================================================
export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_categories')
        .select('*')
        .order('name')

      if (error) throw error
      return data as PostCategory[]
    },
  })
}

// =====================================================
// 9. FETCH TAGS
// =====================================================
export function useTags() {
  return useQuery({
    queryKey: QUERY_KEYS.tags,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_tags')
        .select('*')
        .order('name')

      if (error) throw error
      return data as PostTag[]
    },
  })
}
