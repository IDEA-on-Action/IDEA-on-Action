/**
 * useMediaList Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * Provides media list operations with React Query integration.
 * Supports both pagination and infinite scroll modes.
 *
 * @example
 * // Pagination mode (default)
 * const { data, fetchNextPage, hasNextPage } = useMediaList({
 *   params: { page: 1, per_page: 20 },
 *   mode: 'pagination'
 * });
 *
 * // Infinite scroll mode
 * const { data, fetchNextPage, hasNextPage } = useMediaList({
 *   params: { per_page: 20 },
 *   mode: 'infinite'
 * });
 */

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import type { MediaItem, MediaSearchParams } from '@/types/cms/cms.types';

// =====================================================
// Constants
// =====================================================

const DEFAULT_PER_PAGE = 20;

// =====================================================
// Query Keys
// =====================================================

export const mediaListQueryKeys = {
  all: ['media-list'] as const,
  lists: () => [...mediaListQueryKeys.all, 'list'] as const,
  list: (params?: MediaSearchParams) => [...mediaListQueryKeys.lists(), params] as const,
  infinite: (params?: MediaSearchParams) => [...mediaListQueryKeys.all, 'infinite', params] as const,
};

// =====================================================
// Types
// =====================================================

export interface UseMediaListOptions {
  /**
   * Search and filter parameters
   */
  params?: MediaSearchParams;

  /**
   * Query mode: 'pagination' for regular pagination, 'infinite' for infinite scroll
   */
  mode?: 'pagination' | 'infinite';

  /**
   * Enable or disable the query
   */
  enabled?: boolean;

  /**
   * Stale time in milliseconds (default: 5 minutes)
   */
  staleTime?: number;
}

export interface MediaListResult {
  data: MediaItem[];
  count: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
}

// =====================================================
// Fetch Function
// =====================================================

async function fetchMediaList(
  token: string,
  params: MediaSearchParams,
  page: number = 1
): Promise<MediaListResult> {
  const result = await mediaApi.list(token, {
    search: params.search,
    mime_type: params.mime_type,
    date_from: params.date_from,
    date_to: params.date_to,
    sort_by: params.sort_by || 'created_at',
    sort_order: params.sort_order || 'desc',
    page,
    per_page: params.per_page || DEFAULT_PER_PAGE,
  });

  if (result.error) {
    console.error('[useMediaList] Query error:', result.error);
    throw new Error(result.error);
  }

  const responseData = result.data as {
    data: MediaItem[];
    count: number;
    page: number;
    perPage: number;
    totalPages: number;
  };

  const totalCount = responseData.count || 0;
  const perPage = responseData.perPage || DEFAULT_PER_PAGE;
  const totalPages = responseData.totalPages || Math.ceil(totalCount / perPage);

  return {
    data: responseData.data || [],
    count: totalCount,
    page: responseData.page || page,
    perPage,
    totalPages,
    hasNextPage: page < totalPages,
  };
}

// =====================================================
// Hook: Pagination Mode
// =====================================================

function useMediaListPagination(options: UseMediaListOptions & { token: string | undefined }) {
  const { params = {}, enabled = true, staleTime = 1000 * 60 * 5, token } = options;

  return useQuery({
    queryKey: mediaListQueryKeys.list(params),
    queryFn: () => {
      if (!token) throw new Error('인증이 필요합니다.');
      return fetchMediaList(token, params, params.page || 1);
    },
    enabled: enabled && !!token,
    staleTime,
  });
}

// =====================================================
// Hook: Infinite Scroll Mode
// =====================================================

function useMediaListInfinite(options: UseMediaListOptions & { token: string | undefined }) {
  const { params = {}, enabled = true, staleTime = 1000 * 60 * 5, token } = options;

  return useInfiniteQuery({
    queryKey: mediaListQueryKeys.infinite(params),
    queryFn: ({ pageParam = 1 }) => {
      if (!token) throw new Error('인증이 필요합니다.');
      return fetchMediaList(token, params, pageParam);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: enabled && !!token,
    staleTime,
  });
}

// =====================================================
// Main Hook
// =====================================================

export function useMediaList(options: UseMediaListOptions = {}) {
  const { mode = 'pagination' } = options;
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();
  const token = workersTokens?.accessToken;

  // Use the appropriate query hook based on mode
  const paginationQuery = useMediaListPagination({
    ...options,
    token,
    enabled: mode === 'pagination' && (options.enabled ?? true),
  });

  const infiniteQuery = useMediaListInfinite({
    ...options,
    token,
    enabled: mode === 'infinite' && (options.enabled ?? true),
  });

  // Invalidate queries
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: mediaListQueryKeys.lists() });
    queryClient.invalidateQueries({ queryKey: mediaListQueryKeys.infinite() });
  };

  // Return based on mode
  if (mode === 'infinite') {
    const allItems = infiniteQuery.data?.pages.flatMap((page) => page.data) || [];
    const lastPage = infiniteQuery.data?.pages[infiniteQuery.data.pages.length - 1];

    return {
      // Data
      mediaItems: allItems,
      totalCount: lastPage?.count || 0,
      currentPage: lastPage?.page || 1,
      totalPages: lastPage?.totalPages || 0,

      // State
      isLoading: infiniteQuery.isLoading,
      isFetching: infiniteQuery.isFetching,
      isFetchingNextPage: infiniteQuery.isFetchingNextPage,
      error: infiniteQuery.error,

      // Infinite scroll specific
      hasNextPage: infiniteQuery.hasNextPage,
      fetchNextPage: infiniteQuery.fetchNextPage,

      // Methods
      refetch: infiniteQuery.refetch,
      invalidate,
    };
  }

  // Pagination mode (default)
  return {
    // Data
    mediaItems: paginationQuery.data?.data || [],
    totalCount: paginationQuery.data?.count || 0,
    currentPage: paginationQuery.data?.page || 1,
    totalPages: paginationQuery.data?.totalPages || 0,

    // State
    isLoading: paginationQuery.isLoading,
    isFetching: paginationQuery.isFetching,
    isFetchingNextPage: false,
    error: paginationQuery.error,

    // Infinite scroll specific (disabled in pagination mode)
    hasNextPage: (paginationQuery.data?.page || 1) < (paginationQuery.data?.totalPages || 0),
    fetchNextPage: () => Promise.resolve(),

    // Methods
    refetch: paginationQuery.refetch,
    invalidate,
  };
}

export default useMediaList;
