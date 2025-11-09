/**
 * useSearch Hook
 *
 * 통합 검색 기능 훅
 * - 서비스, 블로그, 공지사항 통합 검색
 * - 실시간 검색 지원
 * - 검색 결과 하이라이팅
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { devError } from '@/lib/errors'

// Types
export interface SearchResult {
  id: string
  type: 'service' | 'blog' | 'notice'
  title: string
  description: string
  excerpt?: string
  url: string
  image_url?: string
  created_at: string
  category?: string
  tags?: string[]
  status?: string
}

export interface UseSearchOptions {
  query: string
  types?: Array<'service' | 'blog' | 'notice'>
  limit?: number
  enabled?: boolean
}

export interface UseSearchReturn {
  data: SearchResult[] | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * 검색 결과 조회 훅
 */
export function useSearch({
  query,
  types = ['service', 'blog', 'notice'],
  limit = 20,
  enabled = true,
}: UseSearchOptions): UseSearchReturn {
  const trimmedQuery = query.trim()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['search', trimmedQuery, types, limit],
    queryFn: async () => {
      if (!trimmedQuery || trimmedQuery.length < 2) {
        return []
      }

      const results: SearchResult[] = []

      // 1. 서비스 검색
      if (types.includes('service')) {
        const { data: services, error: servicesError } = await supabase
          .from('services')
          .select(`
            id,
            title,
            description,
            image_url,
            created_at,
            category:service_categories(name)
          `)
          .eq('status', 'active')
          .or(`title.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%`)
          .order('created_at', { ascending: false })
          .limit(Math.ceil(limit / types.length))

        if (servicesError) {
          devError(servicesError, { operation: '서비스 검색', table: 'services' })
        }

        if (services) {
          results.push(
            ...services.map((service) => ({
              id: service.id,
              type: 'service' as const,
              title: service.title,
              description: service.description || '',
              url: `/services/${service.id}`,
              image_url: service.image_url || undefined,
              created_at: service.created_at,
              category: service.category?.name,
            }))
          )
        }
      }

      // 2. 블로그 검색
      if (types.includes('blog')) {
        const { data: posts, error: postsError } = await supabase
          .from('blog_posts')
          .select(`
            id,
            title,
            excerpt,
            content,
            featured_image,
            created_at,
            category:post_categories(name)
          `)
          .eq('status', 'published')
          .or(`title.ilike.%${trimmedQuery}%,excerpt.ilike.%${trimmedQuery}%,content.ilike.%${trimmedQuery}%`)
          .order('published_at', { ascending: false })
          .limit(Math.ceil(limit / types.length))

        if (postsError) {
          devError(postsError, { operation: '블로그 검색', table: 'blog_posts' })
        }

        if (posts) {
          results.push(
            ...posts.map((post) => ({
              id: post.id,
              type: 'blog' as const,
              title: post.title,
              description: post.excerpt || post.content?.substring(0, 200) || '',
              excerpt: post.excerpt,
              url: `/blog/${post.id}`,
              image_url: post.featured_image || undefined,
              created_at: post.created_at,
              category: post.category?.name,
            }))
          )
        }
      }

      // 3. 공지사항 검색
      if (types.includes('notice')) {
        const { data: notices, error: noticesError } = await supabase
          .from('notices')
          .select(`
            id,
            title,
            content,
            type,
            created_at
          `)
          .eq('status', 'published')
          .or(`title.ilike.%${trimmedQuery}%,content.ilike.%${trimmedQuery}%`)
          .order('published_at', { ascending: false })
          .limit(Math.ceil(limit / types.length))

        if (noticesError) {
          devError(noticesError, { operation: '공지사항 검색', table: 'notices' })
        }

        if (notices) {
          results.push(
            ...notices.map((notice) => ({
              id: notice.id,
              type: 'notice' as const,
              title: notice.title,
              description: notice.content?.substring(0, 200) || '',
              url: `/notices#${notice.id}`,
              created_at: notice.created_at,
              category: notice.type,
            }))
          )
        }
      }

      // 날짜 순 정렬 (최신순)
      return results.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    },
    enabled: enabled && trimmedQuery.length >= 2,
    staleTime: 1000 * 60 * 5, // 5분
  })

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
  }
}

/**
 * 검색어 하이라이팅 헬퍼 함수
 */
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm || !text) return text

  const regex = new RegExp(`(${searchTerm})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>')
}

/**
 * 검색 결과 타입별 아이콘 매핑
 */
export const searchResultTypeConfig = {
  service: {
    label: '서비스',
    icon: 'Package',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  blog: {
    label: '블로그',
    icon: 'FileText',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  notice: {
    label: '공지사항',
    icon: 'Bell',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
} as const
