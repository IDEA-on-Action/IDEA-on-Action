/**
 * useRoadmapItems Hook
 *
 * Cloudflare Workers API에서 로드맵 데이터를 조회하는 React Query 훅
 * - 전체 목록 조회
 * - 카테고리/상태별 필터링
 * - 공개 로드맵 조회
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roadmapApi } from '@/integrations/cloudflare/client';
import { useAuth } from './useAuth';
import type { RoadmapItem } from '@/types/v2';

// =====================================================
// QUERY KEYS
// =====================================================
const QUERY_KEYS = {
  all: ['roadmap-items'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
  category: (category: string | undefined) => [...QUERY_KEYS.all, 'category', category] as const,
  status: (status: string | undefined) => [...QUERY_KEYS.all, 'status', status] as const,
  published: () => [...QUERY_KEYS.all, 'published'] as const,
};

// =====================================================
// 1. FETCH ROADMAP ITEMS - Workers API
// =====================================================
/**
 * Hook to fetch all roadmap items
 */
export const useRoadmapItems = () => {
  return useQuery<RoadmapItem[]>({
    queryKey: QUERY_KEYS.lists(),
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    queryFn: async () => {
      const response = await roadmapApi.list();

      if (response.error) {
        console.error('[useRoadmapItems] API 오류:', response.error);
        return [];
      }

      const result = response.data as { data: RoadmapItem[] } | null;
      return result?.data || [];
    },
  });
};

// =====================================================
// 2. FETCH ROADMAP ITEM BY ID - Workers API
// =====================================================
/**
 * Hook to fetch a single roadmap item by ID
 */
export const useRoadmapItem = (id: string) => {
  return useQuery<RoadmapItem | null>({
    queryKey: QUERY_KEYS.detail(id),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!id) return null;

      const response = await roadmapApi.getById(id);

      if (response.error) {
        console.error('[useRoadmapItem] API 오류:', response.error);
        return null;
      }

      const result = response.data as { data: RoadmapItem } | null;
      return result?.data || null;
    },
    enabled: !!id,
  });
};

// =====================================================
// 3. FETCH ROADMAP ITEMS BY CATEGORY - Workers API
// =====================================================
/**
 * Hook to fetch roadmap items by category
 */
export const useRoadmapItemsByCategory = (category?: RoadmapItem['category']) => {
  return useQuery<RoadmapItem[]>({
    queryKey: QUERY_KEYS.category(category),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (category) {
        const response = await roadmapApi.getByCategory(category);

        if (response.error) {
          console.error('[useRoadmapItemsByCategory] API 오류:', response.error);
          return [];
        }

        const result = response.data as { data: RoadmapItem[] } | null;
        return result?.data || [];
      }

      // category가 없으면 전체 조회
      const response = await roadmapApi.list();

      if (response.error) {
        console.error('[useRoadmapItemsByCategory] API 오류:', response.error);
        return [];
      }

      const result = response.data as { data: RoadmapItem[] } | null;
      return result?.data || [];
    },
  });
};

// =====================================================
// 4. FETCH ROADMAP ITEMS BY STATUS - Workers API
// =====================================================
/**
 * Hook to fetch roadmap items by status
 */
export const useRoadmapItemsByStatus = (status?: RoadmapItem['status']) => {
  return useQuery<RoadmapItem[]>({
    queryKey: QUERY_KEYS.status(status),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (status) {
        const response = await roadmapApi.getByStatus(status);

        if (response.error) {
          console.error('[useRoadmapItemsByStatus] API 오류:', response.error);
          return [];
        }

        const result = response.data as { data: RoadmapItem[] } | null;
        return result?.data || [];
      }

      // status가 없으면 전체 조회
      const response = await roadmapApi.list();

      if (response.error) {
        console.error('[useRoadmapItemsByStatus] API 오류:', response.error);
        return [];
      }

      const result = response.data as { data: RoadmapItem[] } | null;
      return result?.data || [];
    },
  });
};

// =====================================================
// 5. FETCH PUBLISHED ROADMAP ITEMS - Workers API
// =====================================================
/**
 * Hook to fetch only published roadmap items (public-facing)
 */
export const usePublishedRoadmapItems = () => {
  return useQuery<RoadmapItem[]>({
    queryKey: QUERY_KEYS.published(),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await roadmapApi.getPublished();

      if (response.error) {
        console.error('[usePublishedRoadmapItems] API 오류:', response.error);
        return [];
      }

      const result = response.data as { data: RoadmapItem[] } | null;
      return result?.data || [];
    },
  });
};

// =====================================================
// CRUD MUTATIONS (Admin only) - Workers API
// =====================================================

/**
 * Hook to create a new roadmap item (Admin only)
 */
export const useCreateRoadmapItem = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (item: Omit<RoadmapItem, 'id' | 'created_at' | 'updated_at'>) => {
      const token = workersTokens?.accessToken;
      if (!token) throw new Error('인증이 필요합니다');

      // Validate progress is 0-100
      if (item.progress < 0 || item.progress > 100) {
        throw new Error('Progress must be between 0 and 100');
      }

      const response = await roadmapApi.create(token, item as Record<string, unknown>);

      if (response.error) {
        throw new Error(response.error);
      }

      const result = response.data as { data: RoadmapItem } | null;
      return result?.data as RoadmapItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
};

/**
 * Hook to update a roadmap item (Admin only)
 */
export const useUpdateRoadmapItem = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RoadmapItem> }) => {
      const token = workersTokens?.accessToken;
      if (!token) throw new Error('인증이 필요합니다');

      // Validate progress if provided
      if (updates.progress !== undefined && (updates.progress < 0 || updates.progress > 100)) {
        throw new Error('Progress must be between 0 and 100');
      }

      const response = await roadmapApi.update(token, id, updates as Record<string, unknown>);

      if (response.error) {
        throw new Error(response.error);
      }

      const result = response.data as { data: RoadmapItem } | null;
      return result?.data as RoadmapItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      if (data) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) });
      }
    },
  });
};

/**
 * Hook to delete a roadmap item (Admin only)
 */
export const useDeleteRoadmapItem = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = workersTokens?.accessToken;
      if (!token) throw new Error('인증이 필요합니다');

      const response = await roadmapApi.delete(token, id);

      if (response.error) {
        throw new Error(response.error);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
};
