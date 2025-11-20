/**
 * Generic CRUD Hook with React Query
 *
 * Provides type-safe, reusable CRUD operations for any Supabase table.
 *
 * Features:
 * - Paginated list with filters and search
 * - Single item by ID
 * - Create with optimistic update
 * - Update with optimistic update
 * - Delete with optimistic update
 * - Query key factory
 * - Error handling with toast notifications
 *
 * @example
 * const portfolioCRUD = useCRUD<PortfolioItem>({
 *   table: 'portfolio_items',
 *   queryKey: 'portfolio',
 *   orderBy: { column: 'created_at', ascending: false },
 * });
 *
 * const { data, isLoading } = portfolioCRUD.useList({
 *   filters: { published: true },
 *   search: 'MVP',
 *   searchColumns: ['title', 'summary'],
 * });
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PostgrestError } from '@supabase/supabase-js';

// ===================================================================
// Types
// ===================================================================

/**
 * Base entity with required fields
 */
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * CRUD hook options
 */
export interface UseCRUDOptions<T extends BaseEntity> {
  /** Supabase table name */
  table: string;

  /** Query key for React Query cache */
  queryKey: string;

  /** Columns to select (default: '*') */
  select?: string;

  /** Default ordering */
  orderBy?: { column: string; ascending: boolean };

  /** Global filters applied to all queries */
  filters?: Record<string, unknown>;

  /** Enable/disable queries globally */
  enabled?: boolean;
}

/**
 * List query parameters
 */
export interface ListParams {
  /** Page number (1-indexed) */
  page?: number;

  /** Items per page */
  perPage?: number;

  /** Filters to apply */
  filters?: Record<string, unknown>;

  /** Search term */
  search?: string;

  /** Columns to search in (requires search) */
  searchColumns?: string[];

  /** Custom ordering (overrides default) */
  orderBy?: { column: string; ascending: boolean };
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Create operation variables
 */
export type CreateVariables<T extends BaseEntity> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Update operation variables
 */
export interface UpdateVariables<T extends BaseEntity> {
  id: string;
  values: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;
}

// ===================================================================
// Generic CRUD Hook
// ===================================================================

/**
 * Create a generic CRUD hook for any Supabase table
 *
 * @template T - Entity type extending BaseEntity
 * @param options - CRUD configuration options
 * @returns Object with CRUD operation hooks
 */
export function useCRUD<T extends BaseEntity>(options: UseCRUDOptions<T>) {
  const queryClient = useQueryClient();

  // ===================================================================
  // 1. useList - Paginated list with filters
  // ===================================================================

  const useList = (params?: ListParams, queryOptions?: Partial<UseQueryOptions<PaginatedResponse<T> | null>>) => {
    return useQuery<PaginatedResponse<T> | null>({
      queryKey: [options.queryKey, 'list', params],
      queryFn: async () => {
        try {
          // Start with base query
          let query = supabase
            .from(options.table)
            .select(options.select || '*', { count: 'exact' });

          // Apply global filters
          if (options.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                query = query.eq(key, value);
              }
            });
          }

          // Apply query-specific filters
          if (params?.filters) {
            Object.entries(params.filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                query = query.eq(key, value);
              }
            });
          }

          // Apply search
          if (params?.search && params?.searchColumns && params.searchColumns.length > 0) {
            const searchQuery = params.searchColumns
              .map(col => `${col}.ilike.%${params.search}%`)
              .join(',');
            query = query.or(searchQuery);
          }

          // Apply ordering
          const orderBy = params?.orderBy || options.orderBy;
          if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending });
          }

          // Apply pagination
          if (params?.page && params?.perPage) {
            const from = (params.page - 1) * params.perPage;
            const to = from + params.perPage - 1;
            query = query.range(from, to);
          }

          const { data, error, count } = await query;

          if (error) {
            console.error(`[useCRUD] List query error (${options.table}):`, error);
            toast.error(`Failed to load ${options.table}: ${error.message}`);
            throw error;
          }

          return {
            data: (data || []) as T[],
            count: count || 0,
            page: params?.page || 1,
            perPage: params?.perPage || 20,
            totalPages: Math.ceil((count || 0) / (params?.perPage || 20)),
          };
        } catch (error) {
          console.error(`[useCRUD] List query exception (${options.table}):`, error);
          return null;
        }
      },
      enabled: options.enabled !== false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...queryOptions,
    });
  };

  // ===================================================================
  // 2. useGet - Single item by ID
  // ===================================================================

  const useGet = (id: string, queryOptions?: Partial<UseQueryOptions<T | null>>) => {
    return useQuery<T | null>({
      queryKey: [options.queryKey, 'detail', id],
      queryFn: async () => {
        try {
          const { data, error } = await supabase
            .from(options.table)
            .select(options.select || '*')
            .eq('id', id)
            .single();

          if (error) {
            console.error(`[useCRUD] Get query error (${options.table}):`, error);

            // Don't show toast for "not found" errors
            if (error.code !== 'PGRST116') {
              toast.error(`Failed to load item: ${error.message}`);
            }

            throw error;
          }

          return data as T;
        } catch (error) {
          console.error(`[useCRUD] Get query exception (${options.table}):`, error);
          return null;
        }
      },
      enabled: !!id && options.enabled !== false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...queryOptions,
    });
  };

  // ===================================================================
  // 3. useCreate - Insert with optimistic update
  // ===================================================================

  const useCreate = () => {
    return useMutation({
      mutationFn: async (values: CreateVariables<T>) => {
        const { data, error } = await supabase
          .from(options.table)
          .insert([values])
          .select(options.select || '*')
          .single();

        if (error) {
          console.error(`[useCRUD] Create mutation error (${options.table}):`, error);
          throw error;
        }

        return data as T;
      },
      onSuccess: (data) => {
        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: [options.queryKey, 'list'] });

        // Optimistically add to detail cache
        queryClient.setQueryData([options.queryKey, 'detail', data.id], data);

        toast.success('Item created successfully');
      },
      onError: (error: PostgrestError) => {
        toast.error(`Failed to create item: ${error.message}`);
      },
    });
  };

  // ===================================================================
  // 4. useUpdate - Update with optimistic update
  // ===================================================================

  const useUpdate = () => {
    return useMutation({
      mutationFn: async ({ id, values }: UpdateVariables<T>) => {
        const { data, error } = await supabase
          .from(options.table)
          .update(values)
          .eq('id', id)
          .select(options.select || '*')
          .single();

        if (error) {
          console.error(`[useCRUD] Update mutation error (${options.table}):`, error);
          throw error;
        }

        return data as T;
      },
      onMutate: async ({ id, values }: UpdateVariables<T>) => {
        // Cancel outgoing queries for this detail
        await queryClient.cancelQueries({ queryKey: [options.queryKey, 'detail', id] });

        // Snapshot previous value
        const previous = queryClient.getQueryData<T>([options.queryKey, 'detail', id]);

        // Optimistically update cache
        if (previous) {
          queryClient.setQueryData([options.queryKey, 'detail', id], {
            ...previous,
            ...values,
          });
        }

        return { previous };
      },
      onSuccess: (data) => {
        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: [options.queryKey, 'list'] });

        // Update detail cache with server response
        queryClient.setQueryData([options.queryKey, 'detail', data.id], data);

        toast.success('Item updated successfully');
      },
      onError: (error: PostgrestError, variables, context) => {
        // Rollback optimistic update on error
        if (context?.previous) {
          queryClient.setQueryData([options.queryKey, 'detail', variables.id], context.previous);
        }

        toast.error(`Failed to update item: ${error.message}`);
      },
    });
  };

  // ===================================================================
  // 5. useDelete - Delete with optimistic update
  // ===================================================================

  const useDelete = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase
          .from(options.table)
          .delete()
          .eq('id', id);

        if (error) {
          console.error(`[useCRUD] Delete mutation error (${options.table}):`, error);
          throw error;
        }

        return id;
      },
      onMutate: async (id: string) => {
        // Cancel queries for this item
        await queryClient.cancelQueries({ queryKey: [options.queryKey, 'detail', id] });

        // Snapshot previous value for rollback
        const previous = queryClient.getQueryData<T>([options.queryKey, 'detail', id]);

        // Optimistically remove from cache
        queryClient.removeQueries({ queryKey: [options.queryKey, 'detail', id] });

        return { previous };
      },
      onSuccess: (id) => {
        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: [options.queryKey, 'list'] });

        // Ensure detail query is removed
        queryClient.removeQueries({ queryKey: [options.queryKey, 'detail', id] });

        toast.success('Item deleted successfully');
      },
      onError: (error: PostgrestError, id, context) => {
        // Restore previous data on error
        if (context?.previous) {
          queryClient.setQueryData([options.queryKey, 'detail', id], context.previous);
        }

        toast.error(`Failed to delete item: ${error.message}`);
      },
    });
  };

  // ===================================================================
  // Return API
  // ===================================================================

  return {
    useList,
    useGet,
    useCreate,
    useUpdate,
    useDelete,
  };
}

// ===================================================================
// Query Key Factory
// ===================================================================

/**
 * Create query keys for CRUD operations
 *
 * @param baseKey - Base query key (usually table name)
 * @returns Query key factory functions
 */
export function createCRUDKeys(baseKey: string) {
  return {
    all: [baseKey] as const,
    lists: () => [baseKey, 'list'] as const,
    list: (params?: ListParams) =>
      params ? [baseKey, 'list', params] as const : [baseKey, 'list'] as const,
    details: () => [baseKey, 'detail'] as const,
    detail: (id: string) => [baseKey, 'detail', id] as const,
  };
}
