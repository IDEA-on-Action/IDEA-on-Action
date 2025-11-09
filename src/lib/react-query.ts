/**
 * React Query Utilities
 *
 * 일관된 React Query 패턴 적용
 * - Query key 팩토리 함수
 * - 공통 query options
 * - Supabase 쿼리 래퍼
 * - 에러 핸들링 통합
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions, QueryKey } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { handleSupabaseError, handleApiError } from './errors'
import type { PostgrestError } from '@supabase/supabase-js'

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
// Supabase Query Wrapper
// ===================================================================

/**
 * Supabase 쿼리 결과 타입
 */
export interface SupabaseQueryResult<T> {
  data: T | null
  error: PostgrestError | null
}

/**
 * Supabase 쿼리 옵션
 */
export interface SupabaseQueryOptions<T> {
  table: string
  operation?: string
  fallbackValue?: T
  throwOnError?: boolean
}

/**
 * Supabase 쿼리 래퍼
 * 
 * @example
 * const { data, error } = await supabaseQuery(
 *   () => supabase.from('carts').select('*').eq('user_id', userId).maybeSingle(),
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
 * Supabase 쿼리를 위한 useQuery 래퍼
 * 
 * @example
 * const { data, isLoading } = useSupabaseQuery({
 *   queryKey: ['cart', userId],
 *   queryFn: () => supabaseQuery(
 *     () => supabase.from('carts').select('*').eq('user_id', userId).maybeSingle(),
 *     { table: 'carts', operation: '장바구니 조회', fallbackValue: null }
 *   ),
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
 * Supabase 뮤테이션을 위한 useMutation 래퍼
 * 
 * @example
 * const mutation = useSupabaseMutation({
 *   mutationFn: async (params) => {
 *     const { error } = await supabase.from('carts').insert(params)
 *     if (error) throw error
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

