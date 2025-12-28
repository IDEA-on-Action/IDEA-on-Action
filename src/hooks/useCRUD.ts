/**
 * Generic CRUD Hook with React Query
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * Provides type-safe, reusable CRUD operations for any Cloudflare Workers API endpoint.
 *
 * Features:
 * - Paginated list with filters and search
 * - Single item by ID
 * - Create with optimistic update
 * - Update with optimistic update
 * - Delete with optimistic update
 * - Bulk delete with optimistic update
 * - Bulk update with optimistic update
 * - Export to CSV/JSON
 * - Import from CSV/JSON
 * - Count query
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
 *
 * const { mutate: bulkDelete } = portfolioCRUD.useBulkDelete();
 * bulkDelete(['id1', 'id2', 'id3']);
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { devLog } from '@/lib/errors';

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
  /** API endpoint base (e.g., 'portfolio_items' -> /api/v1/portfolio-items) */
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

/**
 * Bulk update operation variables
 */
export interface BulkUpdateVariables<T extends BaseEntity> {
  ids: string[];
  data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;
}

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Export operation parameters
 */
export interface ExportParams {
  format: ExportFormat;
  columns?: string[];
  filters?: Record<string, unknown>;
}

/**
 * Import operation result
 */
export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

// ===================================================================
// Helper: Convert table name to API endpoint
// ===================================================================

function tableToEndpoint(table: string): string {
  // portfolio_items -> portfolio-items
  return table.replace(/_/g, '-');
}

// ===================================================================
// Generic CRUD Hook
// ===================================================================

/**
 * Create a generic CRUD hook for any Cloudflare Workers API endpoint
 *
 * @template T - Entity type extending BaseEntity
 * @param options - CRUD configuration options
 * @returns Object with CRUD operation hooks
 */
export function useCRUD<T extends BaseEntity>(options: UseCRUDOptions<T>) {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();
  const endpoint = tableToEndpoint(options.table);

  // ===================================================================
  // 1. useList - Paginated list with filters
  // ===================================================================

  const useList = (params?: ListParams, queryOptions?: Partial<UseQueryOptions<PaginatedResponse<T> | null>>) => {
    return useQuery<PaginatedResponse<T> | null>({
      queryKey: [options.queryKey, 'list', params],
      queryFn: async () => {
        try {
          const token = workersTokens?.accessToken;
          const urlParams = new URLSearchParams();

          // Apply ordering
          const orderBy = params?.orderBy || options.orderBy;
          if (orderBy) {
            urlParams.append('order_by', `${orderBy.column}:${orderBy.ascending ? 'asc' : 'desc'}`);
          }

          // Apply pagination
          if (params?.page && params?.perPage) {
            urlParams.append('page', params.page.toString());
            urlParams.append('per_page', params.perPage.toString());
          }

          // Apply global filters
          if (options.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                urlParams.append(key, String(value));
              }
            });
          }

          // Apply query-specific filters
          if (params?.filters) {
            Object.entries(params.filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                urlParams.append(key, String(value));
              }
            });
          }

          // Apply search
          if (params?.search && params?.searchColumns && params.searchColumns.length > 0) {
            urlParams.append('search', params.search);
            urlParams.append('search_columns', params.searchColumns.join(','));
          }

          // Apply select
          if (options.select) {
            urlParams.append('select', options.select);
          }

          const { data, error } = await callWorkersApi<{
            data: T[];
            count: number;
          }>(`/api/v1/${endpoint}?${urlParams.toString()}`, { token });

          if (error) {
            devLog(`[useCRUD] List query error (${options.table}):`, error);
            toast.error(`Failed to load ${options.table}: ${error}`);
            return null;
          }

          const count = data?.count || 0;
          return {
            data: (data?.data || []) as T[],
            count,
            page: params?.page || 1,
            perPage: params?.perPage || 20,
            totalPages: Math.ceil(count / (params?.perPage || 20)),
          };
        } catch (error) {
          devLog(`[useCRUD] List query exception (${options.table}):`, error);
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
          const token = workersTokens?.accessToken;
          const urlParams = new URLSearchParams();
          if (options.select) {
            urlParams.append('select', options.select);
          }

          const url = options.select
            ? `/api/v1/${endpoint}/${id}?${urlParams.toString()}`
            : `/api/v1/${endpoint}/${id}`;

          const { data, error } = await callWorkersApi<T>(url, { token });

          if (error) {
            devLog(`[useCRUD] Get query error (${options.table}):`, error);
            // Don't show toast for "not found" errors
            if (!error.includes('not found')) {
              toast.error(`Failed to load item: ${error}`);
            }
            return null;
          }

          return data as T;
        } catch (error) {
          devLog(`[useCRUD] Get query exception (${options.table}):`, error);
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
        const token = workersTokens?.accessToken;
        const { data, error } = await callWorkersApi<T>(
          `/api/v1/${endpoint}`,
          {
            method: 'POST',
            token,
            body: values,
          }
        );

        if (error) {
          devLog(`[useCRUD] Create mutation error (${options.table}):`, error);
          throw new Error(error);
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
      onError: (error: Error) => {
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
        const token = workersTokens?.accessToken;
        const { data, error } = await callWorkersApi<T>(
          `/api/v1/${endpoint}/${id}`,
          {
            method: 'PATCH',
            token,
            body: values,
          }
        );

        if (error) {
          devLog(`[useCRUD] Update mutation error (${options.table}):`, error);
          throw new Error(error);
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
      onError: (error: Error, variables, context) => {
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
        const token = workersTokens?.accessToken;
        const { error } = await callWorkersApi(
          `/api/v1/${endpoint}/${id}`,
          {
            method: 'DELETE',
            token,
          }
        );

        if (error) {
          devLog(`[useCRUD] Delete mutation error (${options.table}):`, error);
          throw new Error(error);
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
      onError: (error: Error, id, context) => {
        // Restore previous data on error
        if (context?.previous) {
          queryClient.setQueryData([options.queryKey, 'detail', id], context.previous);
        }

        toast.error(`Failed to delete item: ${error.message}`);
      },
    });
  };

  // ===================================================================
  // 6. useBulkDelete - Delete multiple items
  // ===================================================================

  const useBulkDelete = () => {
    return useMutation({
      mutationFn: async (ids: string[]) => {
        if (!ids || ids.length === 0) {
          throw new Error('No IDs provided for bulk delete');
        }

        const token = workersTokens?.accessToken;
        const { error } = await callWorkersApi(
          `/api/v1/${endpoint}/bulk-delete`,
          {
            method: 'POST',
            token,
            body: { ids },
          }
        );

        if (error) {
          devLog(`[useCRUD] Bulk delete mutation error (${options.table}):`, error);
          throw new Error(error);
        }

        return ids;
      },
      onMutate: async (ids: string[]) => {
        // Cancel all detail queries for these items
        await Promise.all(
          ids.map(id => queryClient.cancelQueries({ queryKey: [options.queryKey, 'detail', id] }))
        );

        // Snapshot previous values for rollback
        const previous = ids.map(id => ({
          id,
          data: queryClient.getQueryData<T>([options.queryKey, 'detail', id]),
        }));

        // Optimistically remove from cache
        ids.forEach(id => {
          queryClient.removeQueries({ queryKey: [options.queryKey, 'detail', id] });
        });

        return { previous };
      },
      onSuccess: (ids) => {
        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: [options.queryKey, 'list'] });

        // Ensure all detail queries are removed
        ids.forEach(id => {
          queryClient.removeQueries({ queryKey: [options.queryKey, 'detail', id] });
        });

        toast.success(`${ids.length}개 항목이 삭제되었습니다.`);
      },
      onError: (error: Error, ids, context) => {
        // Restore previous data on error
        if (context?.previous) {
          context.previous.forEach(({ id, data }) => {
            if (data) {
              queryClient.setQueryData([options.queryKey, 'detail', id], data);
            }
          });
        }

        toast.error(`벌크 삭제 실패: ${error.message}`);
      },
    });
  };

  // ===================================================================
  // 7. useBulkUpdate - Update multiple items
  // ===================================================================

  const useBulkUpdate = () => {
    return useMutation({
      mutationFn: async ({ ids, data }: BulkUpdateVariables<T>) => {
        if (!ids || ids.length === 0) {
          throw new Error('No IDs provided for bulk update');
        }

        const token = workersTokens?.accessToken;
        const { data: updated, error } = await callWorkersApi<T[]>(
          `/api/v1/${endpoint}/bulk-update`,
          {
            method: 'POST',
            token,
            body: { ids, data },
          }
        );

        if (error) {
          devLog(`[useCRUD] Bulk update mutation error (${options.table}):`, error);
          throw new Error(error);
        }

        return (updated || []) as T[];
      },
      onMutate: async ({ ids, data }: BulkUpdateVariables<T>) => {
        // Cancel all detail queries for these items
        await Promise.all(
          ids.map(id => queryClient.cancelQueries({ queryKey: [options.queryKey, 'detail', id] }))
        );

        // Snapshot previous values
        const previous = ids.map(id => ({
          id,
          data: queryClient.getQueryData<T>([options.queryKey, 'detail', id]),
        }));

        // Optimistically update cache
        previous.forEach(({ id, data: prevData }) => {
          if (prevData) {
            queryClient.setQueryData([options.queryKey, 'detail', id], {
              ...prevData,
              ...data,
            });
          }
        });

        return { previous };
      },
      onSuccess: (updatedItems) => {
        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: [options.queryKey, 'list'] });

        // Update detail cache with server response
        updatedItems.forEach(item => {
          queryClient.setQueryData([options.queryKey, 'detail', item.id], item);
        });

        toast.success(`${updatedItems.length}개 항목이 업데이트되었습니다.`);
      },
      onError: (error: Error, { ids }, context) => {
        // Rollback optimistic updates on error
        if (context?.previous) {
          context.previous.forEach(({ id, data }) => {
            if (data) {
              queryClient.setQueryData([options.queryKey, 'detail', id], data);
            }
          });
        }

        toast.error(`벌크 업데이트 실패: ${error.message}`);
      },
    });
  };

  // ===================================================================
  // 8. useExport - Export data to CSV/JSON
  // ===================================================================

  const useExport = () => {
    return useMutation({
      mutationFn: async (params: ExportParams) => {
        const token = workersTokens?.accessToken;
        const urlParams = new URLSearchParams();

        if (params.columns) {
          urlParams.append('select', params.columns.join(','));
        }

        // Apply filters
        if (params.filters) {
          Object.entries(params.filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              urlParams.append(key, String(value));
            }
          });
        }

        const { data, error } = await callWorkersApi<T[]>(
          `/api/v1/${endpoint}?${urlParams.toString()}`,
          { token }
        );

        if (error) {
          devLog(`[useCRUD] Export error (${options.table}):`, error);
          throw new Error(error);
        }

        if (!data || data.length === 0) {
          throw new Error('내보낼 데이터가 없습니다.');
        }

        // Convert to requested format
        if (params.format === 'csv') {
          return convertToCSV(data);
        } else {
          return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        }
      },
      onSuccess: (blob, params) => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${options.table}-export-${new Date().toISOString().split('T')[0]}.${params.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`데이터가 ${params.format.toUpperCase()} 형식으로 내보내졌습니다.`);
      },
      onError: (error: Error) => {
        toast.error(`내보내기 실패: ${error.message}`);
      },
    });
  };

  // ===================================================================
  // 9. useImport - Import data from CSV/JSON
  // ===================================================================

  const useImport = () => {
    return useMutation({
      mutationFn: async (file: File): Promise<ImportResult> => {
        const text = await file.text();
        let records: unknown[];

        try {
          if (file.name.endsWith('.json')) {
            records = JSON.parse(text);
          } else if (file.name.endsWith('.csv')) {
            records = parseCSV(text);
          } else {
            throw new Error('지원하지 않는 파일 형식입니다. CSV 또는 JSON 파일만 가능합니다.');
          }
        } catch (error) {
          throw new Error(`파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }

        if (!Array.isArray(records) || records.length === 0) {
          throw new Error('유효한 데이터가 없습니다.');
        }

        // Import records one by one and collect results
        const token = workersTokens?.accessToken;
        const result: ImportResult = {
          success: 0,
          failed: 0,
          errors: [],
        };

        for (let i = 0; i < records.length; i++) {
          try {
            const { error } = await callWorkersApi(
              `/api/v1/${endpoint}`,
              {
                method: 'POST',
                token,
                body: records[i],
              }
            );

            if (error) {
              result.failed++;
              result.errors.push({ row: i + 1, error });
            } else {
              result.success++;
            }
          } catch (error) {
            result.failed++;
            result.errors.push({
              row: i + 1,
              error: error instanceof Error ? error.message : '알 수 없는 오류'
            });
          }
        }

        return result;
      },
      onSuccess: (result) => {
        // Invalidate list queries to show imported data
        queryClient.invalidateQueries({ queryKey: [options.queryKey, 'list'] });

        if (result.failed === 0) {
          toast.success(`${result.success}개 항목을 성공적으로 가져왔습니다.`);
        } else {
          toast.warning(
            `가져오기 완료: 성공 ${result.success}개, 실패 ${result.failed}개. 자세한 내용은 콘솔을 확인하세요.`
          );
          console.warn('[useCRUD] Import errors:', result.errors);
        }
      },
      onError: (error: Error) => {
        toast.error(`가져오기 실패: ${error.message}`);
      },
    });
  };

  // ===================================================================
  // 10. useCount - Count total records
  // ===================================================================

  const useCount = (filters?: Record<string, unknown>, queryOptions?: Partial<UseQueryOptions<number>>) => {
    return useQuery<number>({
      queryKey: [options.queryKey, 'count', filters],
      queryFn: async () => {
        try {
          const token = workersTokens?.accessToken;
          const urlParams = new URLSearchParams();
          urlParams.append('count_only', 'true');

          // Apply global filters
          if (options.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                urlParams.append(key, String(value));
              }
            });
          }

          // Apply query-specific filters
          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                urlParams.append(key, String(value));
              }
            });
          }

          const { data, error } = await callWorkersApi<{ count: number }>(
            `/api/v1/${endpoint}/count?${urlParams.toString()}`,
            { token }
          );

          if (error) {
            devLog(`[useCRUD] Count query error (${options.table}):`, error);
            return 0;
          }

          return data?.count ?? 0;
        } catch (error) {
          devLog(`[useCRUD] Count query exception (${options.table}):`, error);
          return 0;
        }
      },
      enabled: options.enabled !== false,
      staleTime: 1000 * 60, // 1 minute
      ...queryOptions,
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
    useBulkDelete,
    useBulkUpdate,
    useExport,
    useImport,
    useCount,
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

// ===================================================================
// Utility Functions
// ===================================================================

/**
 * Convert array of objects to CSV blob
 *
 * @param data - Array of objects to convert
 * @returns CSV blob
 */
function convertToCSV(data: unknown[]): Blob {
  if (!data || data.length === 0) {
    throw new Error('No data to convert to CSV');
  }

  // Get headers from first object
  const headers = Object.keys(data[0] as Record<string, unknown>);

  // Create CSV header row
  const csvRows = [headers.join(',')];

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = (row as Record<string, unknown>)[header];

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Convert to string and escape quotes
      const escaped = String(value).replace(/"/g, '""');

      // Wrap in quotes if contains comma, newline, or quote
      if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
        return `"${escaped}"`;
      }

      return escaped;
    });

    csvRows.push(values.join(','));
  }

  return new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Parse CSV text to array of objects
 *
 * @param text - CSV text content
 * @returns Array of parsed objects
 */
function parseCSV(text: string): unknown[] {
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const records: unknown[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length !== headers.length) {
      console.warn(`[parseCSV] Row ${i + 1} has ${values.length} values but expected ${headers.length}. Skipping.`);
      continue;
    }

    const record: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const value = values[j];

      // Try to parse as number
      if (value && !isNaN(Number(value))) {
        record[headers[j]] = Number(value);
      }
      // Try to parse as boolean
      else if (value === 'true' || value === 'false') {
        record[headers[j]] = value === 'true';
      }
      // Try to parse as null
      else if (value === '' || value === 'null' || value === 'NULL') {
        record[headers[j]] = null;
      }
      // Keep as string
      else {
        record[headers[j]] = value;
      }
    }

    records.push(record);
  }

  return records;
}

/**
 * Parse a single CSV line, handling quoted values
 *
 * @param line - CSV line to parse
 * @returns Array of values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last value
  values.push(current);

  return values;
}
