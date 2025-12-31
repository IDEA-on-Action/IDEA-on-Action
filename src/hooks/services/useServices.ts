/**
 * useServices Hook
 *
 * Cloudflare Workers API에서 서비스 데이터를 조회하는 React Query 훅
 * - 전체 목록 조회
 * - 카테고리별 필터링
 * - 정렬 기능
 *
 * @migration Supabase → Cloudflare Workers
 */

import { useQuery } from '@tanstack/react-query'
import { servicesApi } from '@/integrations/cloudflare/client'
import type { ServiceWithCategory, ServiceCategory } from '@/types/database'

// 정렬 옵션 타입
export type ServiceSortBy = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'popular'

// 필터 옵션 타입
export interface ServiceFilters {
  categoryId?: string
  status?: 'active' | 'draft' | 'archived'
  sortBy?: ServiceSortBy
}

/**
 * 서비스 목록 조회 훅
 */
export function useServices(filters?: ServiceFilters) {
  return useQuery<ServiceWithCategory[]>({
    queryKey: ['services', filters],
    queryFn: async () => {
      const response = await servicesApi.list({
        status: filters?.status || 'active',
        category_id: filters?.categoryId,
        sort_by: filters?.sortBy,
      })

      if (response.error) {
        console.error('[useServices] API 오류:', response.error)
        return []
      }

      // API 응답에서 data 배열 추출
      const result = response.data as { data: ServiceWithCategory[] } | null
      return result?.data || []
    },
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
  })
}

/**
 * 단일 서비스 상세 조회 훅 (ID로 조회)
 */
export function useServiceDetail(serviceId: string) {
  return useQuery<ServiceWithCategory | null>({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      const response = await servicesApi.getById(serviceId)

      if (response.error) {
        console.error('[useServiceDetail] API 오류:', response.error)
        return null
      }

      const result = response.data as { data: ServiceWithCategory } | null
      return result?.data || null
    },
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 10,
  })
}

/**
 * 단일 서비스 상세 조회 훅 (slug로 조회)
 */
export function useServiceBySlug(slug: string) {
  return useQuery<ServiceWithCategory | null>({
    queryKey: ['service', 'slug', slug],
    queryFn: async () => {
      const response = await servicesApi.getBySlug(slug)

      if (response.error) {
        console.error('[useServiceBySlug] API 오류:', response.error)
        return null
      }

      const result = response.data as { data: ServiceWithCategory } | null
      return result?.data || null
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  })
}

/**
 * 서비스 카테고리 목록 조회 훅
 */
export function useServiceCategories() {
  return useQuery<ServiceCategory[]>({
    queryKey: ['serviceCategories'],
    queryFn: async () => {
      const response = await servicesApi.getCategories()

      if (response.error) {
        console.error('[useServiceCategories] API 오류:', response.error)
        return []
      }

      const result = response.data as { data: ServiceCategory[] } | null
      return result?.data || []
    },
    staleTime: 1000 * 60 * 30,
  })
}

/**
 * 카테고리별 서비스 개수 조회 훅
 */
export function useServiceCounts() {
  return useQuery<Array<{ id: string; name: string; slug: string; count: number }>>({
    queryKey: ['serviceCounts'],
    queryFn: async () => {
      // 카테고리 목록 조회 (이미 서비스 개수 포함)
      const response = await servicesApi.getCategories()

      if (response.error) {
        console.error('[useServiceCounts] API 오류:', response.error)
        return []
      }

      const result = response.data as { data: Array<{ id: string; name: string; slug: string; service_count?: number }> } | null
      return (result?.data || []).map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: category.service_count || 0,
      }))
    },
    staleTime: 1000 * 60 * 5,
  })
}
