/**
 * React Query Utilities
 *
 * 일관된 React Query 패턴 적용
 * - Query key 팩토리 함수
 * - 공통 query options
 * - Workers API 쿼리 래퍼
 * - 에러 핸들링 통합
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions, QueryKey, QueryClient } from '@tanstack/react-query'
import { servicesApi, blogApi } from '@/integrations/cloudflare/client'
import { handleApiError } from './errors'

// ===================================================================
// Optimized Cache Times (TASK-078)
// ===================================================================

/**
 * 최적화된 캐시 시간 설정
 *
 * staleTime: 데이터가 "신선한" 상태로 유지되는 시간
 * gcTime: 캐시에서 데이터가 제거되기까지의 시간 (이전 cacheTime)
 *
 * 권장 설정:
 * - 자주 변경되는 데이터: short (30초-1분)
 * - 일반 데이터: default (5분)
 * - 거의 변경되지 않는 데이터: long (10분-30분)
 */
export const cacheConfig = {
  // 짧은 캐시 (실시간성 필요: 알림, 채팅)
  short: {
    staleTime: 30 * 1000, // 30초
    gcTime: 2 * 60 * 1000, // 2분
  },
  // 기본 캐시 (일반 데이터: 목록, 상세)
  default: {
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  },
  // 긴 캐시 (거의 변경되지 않음: 서비스 정보, 카테고리)
  long: {
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
  },
  // 정적 데이터 (메타 정보, 설정)
  static: {
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
  },
}

/**
 * 도메인별 캐시 설정
 */
export const domainCacheConfig = {
  services: cacheConfig.long, // 서비스 정보는 자주 변경되지 않음
  servicePackages: cacheConfig.long,
  serviceCategories: cacheConfig.static,
  subscriptionPlans: cacheConfig.long,
  blogPosts: cacheConfig.default,
  notices: cacheConfig.default,
  notifications: cacheConfig.short, // 알림은 실시간성 필요
  orders: cacheConfig.default,
  cart: cacheConfig.short,
  profile: cacheConfig.default,
}

// ===================================================================
// Query Key Factories
// ===================================================================

/**
 * Query key 팩토리 생성
 * 
 * @example
 * const queryKeys = createQueryKeys('cart')
 * queryKeys.all() // ['cart']
 * queryKeys.list() // ['cart', 'list']
 * queryKeys.detail('123') // ['cart', 'detail', '123']
 */
export function createQueryKeys(baseKey: string) {
  return {
    all: [baseKey] as const,
    lists: () => [baseKey, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      filters ? [baseKey, 'list', filters] as const : [baseKey, 'list'] as const,
    details: () => [baseKey, 'detail'] as const,
    detail: (id: string | number) => [baseKey, 'detail', id] as const,
    detailBySlug: (slug: string) => [baseKey, 'detail', 'slug', slug] as const,
  }
}

// ===================================================================
// Common Query Options
// ===================================================================

/**
 * 공통 query options
 */
export const commonQueryOptions = {
  // 기본 staleTime (5분)
  defaultStaleTime: 1000 * 60 * 5,
  
  // 짧은 staleTime (30초)
  shortStaleTime: 30000,
  
  // 긴 staleTime (10분)
  longStaleTime: 1000 * 60 * 10,
  
  // 기본 retry 횟수
  defaultRetry: 1,
  
  // 네트워크 에러 시 retry 횟수
  networkRetry: 3,
}

// ===================================================================
// Workers API Query Wrapper
// ===================================================================

/**
 * Workers API 쿼리 결과 타입
 */
export interface WorkersQueryResult<T> {
  data: T | null
  error: string | null
  status: number
}

/**
 * API 쿼리 옵션
 */
export interface SupabaseQueryOptions<T> {
  table: string
  operation?: string
  fallbackValue?: T
  throwOnError?: boolean
}

/**
 * API 쿼리 래퍼
 *
 * @example
 * const { data, error } = await supabaseQuery(
 *   () => cartApi.get(token),
 *   { table: 'carts', operation: '장바구니 조회', fallbackValue: null }
 * )
 */
export async function supabaseQuery<T>(
  queryFn: () => Promise<SupabaseQueryResult<T>>,
  options: SupabaseQueryOptions<T>
): Promise<T | null> {
  const { table, operation, fallbackValue = null, throwOnError = false } = options

  try {
    const { data, error } = await queryFn()

    if (error) {
      const result = handleSupabaseError(error, {
        table,
        operation,
        fallbackValue,
      })

      if (throwOnError && result === null) {
        throw error
      }

      return result
    }

    return data
  } catch (error) {
    if (throwOnError) {
      throw error
    }
    return handleSupabaseError(error, { table, operation, fallbackValue })
  }
}

// ===================================================================
// React Query Hooks with Error Handling
// ===================================================================

/**
 * API 쿼리를 위한 useQuery 래퍼
 *
 * @example
 * const { data, isLoading } = useSupabaseQuery({
 *   queryKey: ['cart', userId],
 *   queryFn: () => cartApi.get(token),
 *   table: 'carts',
 *   operation: '장바구니 조회',
 *   enabled: !!userId,
 * })
 */
export function useSupabaseQuery<TData = unknown, TError = Error>(
  options: Omit<UseQueryOptions<TData | null, TError>, 'queryFn'> & {
    queryFn: () => Promise<TData | null>
    table: string
    operation?: string
    fallbackValue?: TData
  }
) {
  const { table, operation, fallbackValue, queryFn, ...queryOptions } = options

  return useQuery<TData | null, TError>({
    ...queryOptions,
    queryFn: async () => {
      try {
        const result = await queryFn()
        return result
      } catch (error) {
        return handleSupabaseError(error, {
          table,
          operation,
          fallbackValue,
        }) as TData | null
      }
    },
  })
}

/**
 * API 뮤테이션을 위한 useMutation 래퍼
 *
 * @example
 * const mutation = useSupabaseMutation({
 *   mutationFn: async (params) => {
 *     const { data, error } = await cartApi.add(token, params)
 *     if (error) throw new Error(error)
 *     return data
 *   },
 *   table: 'carts',
 *   operation: '장바구니 추가',
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: ['cart'] })
 *   },
 * })
 */
export function useSupabaseMutation<TData = unknown, TVariables = unknown, TError = Error>(
  options: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> & {
    mutationFn: (variables: TVariables) => Promise<TData>
    table: string
    operation?: string
  }
) {
  const { table, operation, mutationFn, ...mutationOptions } = options

  return useMutation<TData, TError, TVariables>({
    ...mutationOptions,
    mutationFn: async (variables: TVariables) => {
      try {
        return await mutationFn(variables)
      } catch (error) {
        handleApiError(error, {
          service: table,
          operation,
        })
        throw error
      }
    },
  })
}

// ===================================================================
// Query Key Helpers
// ===================================================================

/**
 * 사용자별 query key 생성
 */
export function createUserQueryKey(baseKey: string, userId?: string | null) {
  return userId ? [baseKey, userId] as const : [baseKey] as const
}

/**
 * 필터 기반 query key 생성
 */
export function createFilteredQueryKey(baseKey: string, filters?: Record<string, unknown>) {
  return filters ? [baseKey, filters] as const : [baseKey] as const
}

/**
 * 페이지네이션 query key 생성
 */
export function createPaginatedQueryKey(
  baseKey: string,
  page?: number,
  limit?: number
) {
  return [baseKey, page, limit].filter(Boolean) as QueryKey
}

// ===================================================================
// Prefetching Utilities (TASK-078)
// ===================================================================

/**
 * 서비스 상세 데이터 프리페치
 *
 * 서비스 목록 페이지에서 상세 페이지 데이터를 미리 로드
 * Workers API 사용 (Supabase 마이그레이션 완료)
 *
 * @example
 * ```tsx
 * const queryClient = useQueryClient();
 *
 * // 마우스 호버 시 프리페치
 * <ServiceCard
 *   onMouseEnter={() => prefetchServiceDetail(queryClient, service.slug)}
 * />
 * ```
 */
export async function prefetchServiceDetail(
  queryClient: QueryClient,
  slug: string
) {
  await queryClient.prefetchQuery({
    queryKey: ['services-platform', 'detail-slug', slug],
    queryFn: async () => {
      const { data, error } = await servicesApi.getBySlug(slug)
      if (error) throw new Error(error)
      return data
    },
    ...domainCacheConfig.services,
  })
}

/**
 * 블로그 게시물 상세 데이터 프리페치
 * Workers API 사용 (Supabase 마이그레이션 완료)
 */
export async function prefetchBlogPost(
  queryClient: QueryClient,
  slug: string
) {
  await queryClient.prefetchQuery({
    queryKey: ['blogPosts', 'slug', slug],
    queryFn: async () => {
      const { data, error } = await blogApi.getBySlug(slug)
      if (error) throw new Error(error)
      return data
    },
    ...domainCacheConfig.blogPosts,
  })
}

/**
 * 프리페치 훅 - 컴포넌트에서 사용
 */
export function usePrefetch() {
  const queryClient = useQueryClient()

  return {
    prefetchServiceDetail: (slug: string) =>
      prefetchServiceDetail(queryClient, slug),
    prefetchBlogPost: (slug: string) =>
      prefetchBlogPost(queryClient, slug),
  }
}

// ===================================================================
// Query Client 기본 설정 (TASK-078)
// ===================================================================

/**
 * React Query 기본 옵션
 * App.tsx 또는 main.tsx에서 QueryClient 생성 시 사용
 *
 * @example
 * ```tsx
 * const queryClient = new QueryClient({
 *   defaultOptions: defaultQueryClientOptions,
 * });
 * ```
 */
export const defaultQueryClientOptions = {
  queries: {
    staleTime: cacheConfig.default.staleTime,
    gcTime: cacheConfig.default.gcTime,
    retry: 1,
    refetchOnWindowFocus: false, // 성능 최적화: 창 포커스 시 자동 refetch 비활성화
    refetchOnReconnect: true,
    refetchOnMount: true,
  },
  mutations: {
    retry: 0,
  },
}
