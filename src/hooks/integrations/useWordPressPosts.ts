/**
 * useWordPressPosts Hook
 * Fetch blog posts from WordPress.com REST API
 */

import { useQuery } from '@tanstack/react-query'
import type {
  WordPressResponse,
  WordPressPost,
  UnifiedBlogPost,
} from '@/types/wordpress'
import { wordpressToUnified } from '@/types/wordpress'

const WORDPRESS_SITE = 'sinclairseod847ad553c-hfktq.wordpress.com'
const WORDPRESS_API_BASE = 'https://public-api.wordpress.com/rest/v1.1'

interface UseWordPressPostsOptions {
  number?: number // Posts per page (default: 20)
  offset?: number // Pagination offset (default: 0)
  category?: string // Filter by category slug
  tag?: string // Filter by tag slug
  search?: string // Search query
  orderBy?: 'date' | 'modified' | 'title' | 'comment_count'
  order?: 'ASC' | 'DESC'
}

/**
 * Fetch WordPress posts
 */
export function useWordPressPosts(options: UseWordPressPostsOptions = {}) {
  const {
    number = 20,
    offset = 0,
    category,
    tag,
    search,
    orderBy = 'date',
    order = 'DESC',
  } = options

  return useQuery({
    queryKey: ['wordpress-posts', { number, offset, category, tag, search, orderBy, order }],
    queryFn: async (): Promise<UnifiedBlogPost[]> => {
      const params = new URLSearchParams({
        number: number.toString(),
        offset: offset.toString(),
        order_by: orderBy,
        order: order,
      })

      if (category) params.append('category', category)
      if (tag) params.append('tag', tag)
      if (search) params.append('search', search)

      const url = `${WORDPRESS_API_BASE}/sites/${WORDPRESS_SITE}/posts/?${params.toString()}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.status} ${response.statusText}`)
      }

      const data: WordPressResponse = await response.json()

      // Convert WordPress posts to unified format
      return data.posts.map(wordpressToUnified)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Fetch a single WordPress post by ID
 */
export function useWordPressPost(postId: number | undefined) {
  return useQuery({
    queryKey: ['wordpress-post', postId],
    queryFn: async (): Promise<UnifiedBlogPost | null> => {
      if (!postId) throw new Error('Post ID is required')

      const url = `${WORDPRESS_API_BASE}/sites/${WORDPRESS_SITE}/posts/${postId}`

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`WordPress API error: ${response.status} ${response.statusText}`)
      }

      const data: WordPressPost = await response.json()

      return wordpressToUnified(data)
    },
    enabled: !!postId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  })
}

/**
 * Fetch WordPress categories
 */
export function useWordPressCategories() {
  return useQuery({
    queryKey: ['wordpress-categories'],
    queryFn: async (): Promise<Array<{ name: string; slug: string; count: number }>> => {
      const url = `${WORDPRESS_API_BASE}/sites/${WORDPRESS_SITE}/categories`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.status} ${response.statusText}`)
      }

      const data: {
        categories: Array<{
          name: string
          slug: string
          post_count: number
        }>
      } = await response.json()

      return data.categories.map(cat => ({
        name: cat.name,
        slug: cat.slug,
        count: cat.post_count,
      }))
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Fetch WordPress tags
 */
export function useWordPressTags() {
  return useQuery({
    queryKey: ['wordpress-tags'],
    queryFn: async (): Promise<Array<{ name: string; slug: string; count: number }>> => {
      const url = `${WORDPRESS_API_BASE}/sites/${WORDPRESS_SITE}/tags`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.status} ${response.statusText}`)
      }

      const data: {
        tags: Array<{
          name: string
          slug: string
          post_count: number
        }>
      } = await response.json()

      return data.tags.map(tag => ({
        name: tag.name,
        slug: tag.slug,
        count: tag.post_count,
      }))
    },
    staleTime: 15 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  })
}
