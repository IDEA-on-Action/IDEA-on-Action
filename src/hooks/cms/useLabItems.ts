/**
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */
import { useQueryClient } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { LabItem, LabItemInsert, LabItemUpdate, LabCategory, LabStatus } from '@/types/cms.types';

/**
 * Hook to fetch all lab items
 */
export const useLabItems = () => {
  return useQuery<LabItem[]>({
    queryKey: ['lab_items'],
    queryFn: async () => {
      const response = await callWorkersApi<LabItem[]>('/api/v1/lab');
      if (response.error) {
        console.error('Lab 목록 조회 실패:', response.error);
        return [];
      }
      // created_at DESC 정렬
      const items = response.data || [];
      return items.sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single lab item by ID
 */
export const useLabItem = (id: string) => {
  return useQuery<LabItem | null>({
    queryKey: ['lab_items', id],
    queryFn: async () => {
      const response = await callWorkersApi<LabItem>(`/api/v1/lab/${id}`);
      if (response.error) {
        console.error('Lab 상세 조회 실패:', response.error);
        return null;
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch a single lab item by slug
 */
export const useLabItemBySlug = (slug: string) => {
  return useQuery<LabItem | null>({
    queryKey: ['lab_items', 'slug', slug],
    queryFn: async () => {
      const response = await callWorkersApi<LabItem>(`/api/v1/lab/slug/${slug}`);
      if (response.error) {
        console.error('Lab slug 조회 실패:', response.error);
        return null;
      }
      return response.data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch lab items by category
 */
export const useLabItemsByCategory = (category?: LabCategory) => {
  return useQuery<LabItem[]>({
    queryKey: ['lab_items', 'category', category],
    queryFn: async () => {
      const query = category ? `?category=${category}` : '';
      const response = await callWorkersApi<LabItem[]>(`/api/v1/lab${query}`);
      if (response.error) {
        console.error('Lab 카테고리별 조회 실패:', response.error);
        return [];
      }
      // created_at DESC 정렬
      const items = response.data || [];
      return items.sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch lab items by status
 */
export const useLabItemsByStatus = (status?: LabStatus) => {
  return useQuery<LabItem[]>({
    queryKey: ['lab_items', 'status', status],
    queryFn: async () => {
      const query = status ? `?status=${status}` : '';
      const response = await callWorkersApi<LabItem[]>(`/api/v1/lab${query}`);
      if (response.error) {
        console.error('Lab 상태별 조회 실패:', response.error);
        return [];
      }
      // created_at DESC 정렬
      const items = response.data || [];
      return items.sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch published lab items
 */
export const usePublishedLabItems = () => {
  return useQuery<LabItem[]>({
    queryKey: ['lab_items', 'published'],
    queryFn: async () => {
      const response = await callWorkersApi<LabItem[]>('/api/v1/lab?published=true');
      if (response.error) {
        console.error('Lab published 조회 실패:', response.error);
        return [];
      }
      // created_at DESC 정렬
      const items = response.data || [];
      return items.sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to create a new lab item (Admin only)
 */
export const useCreateLabItem = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<LabItem, Error, LabItemInsert>({
    mutationFn: async (item: LabItemInsert) => {
      const response = await callWorkersApi<LabItem>('/api/v1/lab', {
        method: 'POST',
        token: workersTokens?.accessToken,
        body: item,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data as LabItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab_items'] });
    },
  });
};

/**
 * Hook to update a lab item (Admin only)
 */
export const useUpdateLabItem = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<LabItem, Error, { id: string; updates: LabItemUpdate }>({
    mutationFn: async ({ id, updates }: { id: string; updates: LabItemUpdate }) => {
      const response = await callWorkersApi<LabItem>(`/api/v1/lab/${id}`, {
        method: 'PATCH',
        token: workersTokens?.accessToken,
        body: updates,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data as LabItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lab_items'] });
      queryClient.invalidateQueries({ queryKey: ['lab_items', data.id] });
      queryClient.invalidateQueries({ queryKey: ['lab_items', 'slug', data.slug] });
    },
  });
};

/**
 * Hook to delete a lab item (Admin only)
 */
export const useDeleteLabItem = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<string, Error, string>({
    mutationFn: async (id: string) => {
      const response = await callWorkersApi(`/api/v1/lab/${id}`, {
        method: 'DELETE',
        token: workersTokens?.accessToken,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab_items'] });
    },
  });
};
