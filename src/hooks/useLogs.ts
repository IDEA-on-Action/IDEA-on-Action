import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation, supabaseQuery } from '@/lib/react-query';
import type { Log } from '@/types/v2';

/**
 * Hook to fetch all logs
 */
export const useLogs = (limit?: number) => {
  return useSupabaseQuery<Log[]>({
    queryKey: ['logs', limit],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          let query = supabase
            .from('logs')
            .select('*')
            .order('created_at', { ascending: false });

          if (limit) {
            query = query.limit(limit);
          }

          const result = await query;
          return { data: result.data, error: result.error };
        },
        {
          table: 'logs',
          operation: 'Log 목록 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'logs',
    operation: 'Log 목록 조회',
    fallbackValue: [],
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Hook to fetch logs by type
 */
export const useLogsByType = (type?: Log['type'], limit?: number) => {
  return useSupabaseQuery<Log[]>({
    queryKey: ['logs', 'type', type, limit],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          let query = supabase
            .from('logs')
            .select('*')
            .order('created_at', { ascending: false });

          if (type) {
            query = query.eq('type', type);
          }

          if (limit) {
            query = query.limit(limit);
          }

          const result = await query;
          return { data: result.data, error: result.error };
        },
        {
          table: 'logs',
          operation: 'Log 타입별 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'logs',
    operation: 'Log 타입별 조회',
    fallbackValue: [],
    staleTime: 1 * 60 * 1000,
  });
};

/**
 * Hook to fetch logs by project
 */
export const useLogsByProject = (projectId: string, limit?: number) => {
  return useSupabaseQuery<Log[]>({
    queryKey: ['logs', 'project', projectId, limit],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          let query = supabase
            .from('logs')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

          if (limit) {
            query = query.limit(limit);
          }

          const result = await query;
          return { data: result.data, error: result.error };
        },
        {
          table: 'logs',
          operation: 'Log 프로젝트별 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'logs',
    operation: 'Log 프로젝트별 조회',
    fallbackValue: [],
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000,
  });
};

/**
 * Hook to create a new log (Admin only)
 */
export const useCreateLog = () => {
  const queryClient = useQueryClient();

  return useSupabaseMutation<Log, Omit<Log, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: async (log: Omit<Log, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('logs')
        .insert([log])
        .select()
        .single();

      if (error) throw error;
      return data as Log;
    },
    table: 'logs',
    operation: 'Log 생성',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};

/**
 * Hook to update a log (Admin only)
 */
export const useUpdateLog = () => {
  const queryClient = useQueryClient();

  return useSupabaseMutation<Log, { id: number; updates: Partial<Log> }>({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Log> }) => {
      const { data, error } = await supabase
        .from('logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Log;
    },
    table: 'logs',
    operation: 'Log 수정',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};

/**
 * Hook to delete a log (Admin only)
 */
export const useDeleteLog = () => {
  const queryClient = useQueryClient();

  return useSupabaseMutation<number, number>({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    table: 'logs',
    operation: 'Log 삭제',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};
