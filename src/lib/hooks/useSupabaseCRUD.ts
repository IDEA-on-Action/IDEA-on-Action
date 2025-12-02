/**
 * Generic Supabase CRUD Hooks
 * 
 * 공통 CRUD 패턴을 추출한 제네릭 훅
 * - useSupabaseList: 목록 조회
 * - useSupabaseDetail: 상세 조회
 * - useSupabaseCreate: 생성
 * - useSupabaseUpdate: 수정
 * - useSupabaseDelete: 삭제
 */

import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSupabaseQuery, useSupabaseMutation, supabaseQuery } from '@/lib/react-query'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

// ===================================================================
// Types
// ===================================================================

/**
 * PostgrestFilterBuilder 제네릭 타입
 * Supabase의 쿼리 빌더 타입으로, 테이블 스키마와 독립적으로 사용
 */
type FilterBuilder = PostgrestFilterBuilder<
  Record<string, unknown>,
  Record<string, unknown>,
  unknown[]
>

export interface SupabaseListOptions<T> {
  table: string
  queryKey: (string | number | boolean | undefined)[]
  select?: string
  /**
   * 쿼리 필터 함수
   * @param query - Supabase 쿼리 빌더
   * @returns 필터링된 쿼리 빌더
   * @example
   * filters: (q) => q.eq('status', 'active').gte('created_at', '2024-01-01')
   */
  filters?: (query: FilterBuilder) => FilterBuilder
  orderBy?: { column: string; ascending?: boolean }
  limit?: number
  enabled?: boolean
  staleTime?: number
  fallbackValue?: T[]
}

export interface SupabaseDetailOptions<T> {
  table: string
  queryKey: (string | number | boolean | undefined)[]
  select?: string
  id: string | number | undefined
  idColumn?: string
  enabled?: boolean
  staleTime?: number
  fallbackValue?: T | null
}

export interface SupabaseCreateOptions<TData, TVariables> {
  table: string
  queryKey: string[]
  transform?: (variables: TVariables) => unknown
  onSuccess?: (data: TData) => void
}

export interface SupabaseUpdateOptions<TData, TVariables> {
  table: string
  queryKey: string[]
  idColumn?: string
  transform?: (variables: TVariables) => unknown
  onSuccess?: (data: TData) => void
}

export interface SupabaseDeleteOptions {
  table: string
  queryKey: string[]
  idColumn?: string
  onSuccess?: () => void
}

// ===================================================================
// List Hook
// ===================================================================

/**
 * Generic hook for fetching a list of items from Supabase
 */
export function useSupabaseList<T = unknown>(options: SupabaseListOptions<T[]>) {
  const {
    table,
    queryKey,
    select = '*',
    filters,
    orderBy,
    limit,
    enabled = true,
    staleTime,
    fallbackValue = [],
  } = options

  return useSupabaseQuery<T[]>({
    queryKey,
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          let query = supabase.from(table).select(select)

          if (filters) {
            query = filters(query)
          }

          if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false })
          }

          if (limit) {
            query = query.limit(limit)
          }

          const result = await query
          return { data: result.data, error: result.error }
        },
        {
          table,
          operation: `${table} 목록 조회`,
          fallbackValue,
        }
      )
    },
    table,
    operation: `${table} 목록 조회`,
    fallbackValue,
    enabled,
    staleTime,
  })
}

// ===================================================================
// Detail Hook
// ===================================================================

/**
 * Generic hook for fetching a single item from Supabase
 */
export function useSupabaseDetail<T = unknown>(options: SupabaseDetailOptions<T>) {
  const {
    table,
    queryKey,
    select = '*',
    id,
    idColumn = 'id',
    enabled = true,
    staleTime,
    fallbackValue = null,
  } = options

  return useSupabaseQuery<T>({
    queryKey,
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const result = await supabase
            .from(table)
            .select(select)
            .eq(idColumn, id)
            .single()
          return { data: result.data, error: result.error }
        },
        {
          table,
          operation: `${table} 상세 조회`,
          fallbackValue,
        }
      )
    },
    table,
    operation: `${table} 상세 조회`,
    fallbackValue,
    enabled: enabled && !!id,
    staleTime,
  })
}

// ===================================================================
// Create Hook
// ===================================================================

/**
 * Generic hook for creating an item in Supabase
 */
export function useSupabaseCreate<TData = unknown, TVariables = unknown>(
  options: SupabaseCreateOptions<TData, TVariables>
) {
  const { table, queryKey, transform, onSuccess } = options
  const queryClient = useQueryClient()

  return useSupabaseMutation<TData, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const dataToInsert = transform ? transform(variables) : variables
      const { data, error } = await supabase
        .from(table)
        .insert([dataToInsert])
        .select()
        .single()

      if (error) throw error
      return data as TData
    },
    table,
    operation: `${table} 생성`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey })
      onSuccess?.(data)
    },
  })
}

// ===================================================================
// Update Hook
// ===================================================================

/**
 * Generic hook for updating an item in Supabase
 */
export function useSupabaseUpdate<TData = unknown, TVariables extends { id: string | number } = { id: string | number }>(
  options: SupabaseUpdateOptions<TData, TVariables>
) {
  const { table, queryKey, idColumn = 'id', transform, onSuccess } = options
  const queryClient = useQueryClient()

  return useSupabaseMutation<TData, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const { id, ...updates } = variables
      const dataToUpdate = transform ? transform(updates as TVariables) : updates
      const { data, error } = await supabase
        .from(table)
        .update(dataToUpdate)
        .eq(idColumn, id)
        .select()
        .single()

      if (error) throw error
      return data as TData
    },
    table,
    operation: `${table} 수정`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey })
      onSuccess?.(data)
    },
  })
}

// ===================================================================
// Delete Hook
// ===================================================================

/**
 * Generic hook for deleting an item from Supabase
 */
export function useSupabaseDelete<TId = string | number>(options: SupabaseDeleteOptions) {
  const { table, queryKey, idColumn = 'id', onSuccess } = options
  const queryClient = useQueryClient()

  return useSupabaseMutation<TId, TId>({
    mutationFn: async (id: TId) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(idColumn, id)

      if (error) throw error
      return id
    },
    table,
    operation: `${table} 삭제`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      onSuccess?.()
    },
  })
}

