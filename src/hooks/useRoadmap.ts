import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation, supabaseQuery } from '@/lib/react-query';
import type { Roadmap } from '@/types/v2';

/**
 * Hook to fetch all roadmap items
 */
export const useRoadmap = () => {
  return useSupabaseQuery<Roadmap[]>({
    queryKey: ['roadmap'],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const result = await supabase
            .from('roadmap')
            .select('*')
            .order('start_date', { ascending: true });
          return { data: result.data, error: result.error };
        },
        {
          table: 'roadmap',
          operation: '로드맵 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'roadmap',
    operation: '로드맵 조회',
    fallbackValue: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single roadmap item by quarter
 */
export const useRoadmapByQuarter = (quarter: string) => {
  return useSupabaseQuery<Roadmap>({
    queryKey: ['roadmap', quarter],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const result = await supabase
            .from('roadmap')
            .select('*')
            .eq('quarter', quarter)
            .maybeSingle();
          return { data: result.data, error: result.error };
        },
        {
          table: 'roadmap',
          operation: '로드맵 조회',
          fallbackValue: null,
        }
      );
    },
    table: 'roadmap',
    operation: '로드맵 조회',
    fallbackValue: null,
    enabled: !!quarter,
  });
};

/**
 * Hook to create a new roadmap item (Admin only)
 */
export const useCreateRoadmap = () => {
  const queryClient = useQueryClient();

  return useSupabaseMutation<Roadmap, Omit<Roadmap, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: async (roadmap: Omit<Roadmap, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('roadmap')
        .insert([roadmap])
        .select()
        .single();

      if (error) throw error;
      return data as Roadmap;
    },
    table: 'roadmap',
    operation: '로드맵 생성',
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

  return useSupabaseMutation<Roadmap, { id: number; updates: Partial<Roadmap> }>({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Roadmap> }) => {
      const { data, error } = await supabase
        .from('roadmap')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Roadmap;
    },
    table: 'roadmap',
    operation: '로드맵 수정',
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

  return useSupabaseMutation<number, number>({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('roadmap')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    table: 'roadmap',
    operation: '로드맵 삭제',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
    },
  });
};
