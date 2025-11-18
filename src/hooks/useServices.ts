/**
 * useServices Hook
 *
 * Supabase에서 서비스 데이터를 조회하는 React Query 훅
 * - 전체 목록 조회
 * - 카테고리별 필터링
 * - 정렬 기능
 */

import { supabase } from '@/integrations/supabase/client'
import { useSupabaseQuery, supabaseQuery } from '@/lib/react-query'
import type { Service, ServiceWithCategory, ServiceCategory } from '@/types/database'

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
  return useSupabaseQuery<ServiceWithCategory[]>({
    queryKey: ['services', filters],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          let query = supabase
            .from('services')
            .select('*')

          // 상태 필터 (기본값: active - 토스 페이먼츠 심사용)
          const status = filters?.status || 'active'
          query = query.eq('status', status)

          // 카테고리 필터 (임시 비활성화 - category_id 컬럼이 존재하지 않음)
          // if (filters?.categoryId) {
          //   query = query.eq('category_id', filters.categoryId)
          // }

          // 정렬
          switch (filters?.sortBy) {
            case 'newest':
              query = query.order('created_at', { ascending: false })
              break
            case 'oldest':
              query = query.order('created_at', { ascending: true })
              break
            case 'price-asc':
              query = query.order('price', { ascending: true })
              break
            case 'price-desc':
              query = query.order('price', { ascending: false })
              break
            case 'popular':
              // metrics.users 기준 정렬 (JSONB 필드)
              query = query.order('metrics->users', { ascending: false })
              break
            default:
              query = query.order('created_at', { ascending: false })
          }

          const result = await query
          return { data: result.data, error: result.error }
        },
        {
          table: 'services',
          operation: '서비스 목록 조회',
          fallbackValue: [],
        }
      )
    },
    table: 'services',
    operation: '서비스 목록 조회',
    fallbackValue: [],
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
  })
}

/**
 * 단일 서비스 상세 조회 훅 (ID로 조회)
 */
export function useServiceDetail(serviceId: string) {
  return useSupabaseQuery<ServiceWithCategory>({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const result = await supabase
            .from('services')
            .select(`
              *,
              category:service_categories(*)
            `)
            .eq('id', serviceId)
            .single()
          return { data: result.data, error: result.error }
        },
        {
          table: 'services',
          operation: '서비스 상세 조회',
          fallbackValue: null,
        }
      )
    },
    table: 'services',
    operation: '서비스 상세 조회',
    fallbackValue: null,
    enabled: !!serviceId, // serviceId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 10, // 10분간 캐시 유지
  })
}

/**
 * 단일 서비스 상세 조회 훅 (slug로 조회)
 */
export function useServiceBySlug(slug: string) {
  return useSupabaseQuery<ServiceWithCategory>({
    queryKey: ['service', 'slug', slug],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const result = await supabase
            .from('services')
            .select(`
              *,
              category:service_categories(*)
            `)
            .eq('slug', slug)
            .single()
          return { data: result.data, error: result.error }
        },
        {
          table: 'services',
          operation: `서비스 조회 (slug: ${slug})`,
          fallbackValue: null,
        }
      )
    },
    table: 'services',
    operation: `서비스 조회 (slug: ${slug})`,
    fallbackValue: null,
    enabled: !!slug, // slug가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 10, // 10분간 캐시 유지
  })
}

/**
 * 서비스 카테고리 목록 조회 훅
 */
export function useServiceCategories() {
  return useSupabaseQuery<ServiceCategory[]>({
    queryKey: ['serviceCategories'],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const result = await supabase
            .from('service_categories')
            .select('*')
            .order('display_order', { ascending: true })
          return { data: result.data, error: result.error }
        },
        {
          table: 'service_categories',
          operation: '카테고리 조회',
          fallbackValue: [],
        }
      )
    },
    table: 'service_categories',
    operation: '카테고리 조회',
    fallbackValue: [],
    staleTime: 1000 * 60 * 30, // 30분간 캐시 유지 (카테고리는 자주 변경 안 됨)
  })
}

/**
 * 카테고리별 서비스 개수 조회 훅
 */
export function useServiceCounts() {
  return useSupabaseQuery<Array<{ id: string; name: string; slug: string; count: number }>>({
    queryKey: ['serviceCounts'],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          // 각 카테고리별 서비스 개수 집계
          const { data: categories, error: categoriesError } = await supabase
            .from('service_categories')
            .select('id, name, slug')
            .eq('is_active', true)

          if (categoriesError) {
            return { data: null, error: categoriesError }
          }

          if (!categories) {
            return { data: [], error: null }
          }

          const countsPromises = categories.map(async (category) => {
            const { count } = await supabase
              .from('services')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', category.id)
              .eq('status', 'active')

            return {
              ...category,
              count: count || 0,
            }
          })

          const counts = await Promise.all(countsPromises)
          return { data: counts, error: null }
        },
        {
          table: 'services',
          operation: '카테고리별 서비스 개수 조회',
          fallbackValue: [],
        }
      )
    },
    table: 'services',
    operation: '카테고리별 서비스 개수 조회',
    fallbackValue: [],
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
  })
}
