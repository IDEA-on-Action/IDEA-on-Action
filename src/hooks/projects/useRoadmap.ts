/**
 * Roadmap React Query Hooks
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQueryClient } from '@tanstack/react-query';
import { useQuery, useMutation } from '@tanstack/react-query';
import { roadmapApi, callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Roadmap } from '@/types/shared/v2';

/**
 * Hook to fetch all roadmap items
 */
export const useRoadmap = () => {
  return useQuery({
    queryKey: ['roadmap'],
    queryFn: async () => {
      const { data, error } = await roadmapApi.list();
      if (error) throw new Error(error);
      return (data as Roadmap[]) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single roadmap item by quarter
 */
export const useRoadmapByQuarter = (quarter: string) => {
  return useQuery({
    queryKey: ['roadmap', quarter],
    queryFn: async () => {
      const { data, error } = await callWorkersApi<Roadmap>(
        `/api/v1/roadmap/quarter/${quarter}`
      );
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!quarter,
  });
};

/**
 * Hook to create a new roadmap item (Admin only)
 */
export const useCreateRoadmap = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (roadmap: Omit<Roadmap, 'id' | 'created_at' | 'updated_at'>) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다.');
      }

      const { data, error } = await roadmapApi.create(
        workersTokens.accessToken,
        roadmap as Record<string, unknown>
      );

      if (error) throw new Error(error);
      return data as Roadmap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
    },
  });
};

/**
 * Hook to update a roadmap item (Admin only)
 */
export const useUpdateRoadmap = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Roadmap> }) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다.');
      }

      const { data, error } = await roadmapApi.update(
        workersTokens.accessToken,
        String(id),
        updates as Record<string, unknown>
      );

      if (error) throw new Error(error);
      return data as Roadmap;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap', data.quarter] });
    },
  });
};

/**
 * Hook to delete a roadmap item (Admin only)
 */
export const useDeleteRoadmap = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (id: number) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다.');
      }

      const { error } = await roadmapApi.delete(
        workersTokens.accessToken,
        String(id)
      );

      if (error) throw new Error(error);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
    },
  });
};
