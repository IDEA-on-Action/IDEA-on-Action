/**
 * useSearch Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 통합 검색 기능 훅
 * - 서비스, 블로그, 공지사항 통합 검색
 * - 실시간 검색 지원
 * - 검색 결과 하이라이팅
 */

import { useQuery } from '@tanstack/react-query'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from './auth/useAuth'
import { devLog } from '@/lib/errors'

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
  const { workersTokens } = useAuth()
  const trimmedQuery = query.trim()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['search', trimmedQuery, types, limit],
    queryFn: async () => {
      if (!trimmedQuery || trimmedQuery.length < 2) {
        return []
      }

      const token = workersTokens?.accessToken
      const typesParam = types.join(',')
      const url = `/api/v1/search?q=${encodeURIComponent(trimmedQuery)}&types=${typesParam}&limit=${limit}`

      const { data, error } = await callWorkersApi<SearchResult[]>(url, { token })

      if (error) {
        devLog('Search error:', error)
        return []
      }

      // 날짜 순 정렬 (최신순)
      return (data || []).sort(
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
