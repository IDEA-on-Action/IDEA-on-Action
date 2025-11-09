import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation, supabaseQuery } from '@/lib/react-query';
import type { Project } from '@/types/v2';

/**
 * Hook to fetch all projects
 */
export const useProjects = () => {
  return useSupabaseQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const result = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });
          return { data: result.data, error: result.error };
        },
        {
          table: 'projects',
          operation: 'Project 목록 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'projects',
    operation: 'Project 목록 조회',
    fallbackValue: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single project by slug
 */
export const useProject = (slug: string) => {
  return useSupabaseQuery<Project>({
    queryKey: ['projects', slug],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          const result = await supabase
            .from('projects')
            .select('*')
            .eq('slug', slug)
            .single();
          return { data: result.data, error: result.error };
        },
        {
          table: 'projects',
          operation: 'Project 상세 조회',
          fallbackValue: null,
        }
      );
    },
    table: 'projects',
    operation: 'Project 상세 조회',
    fallbackValue: null,
    enabled: !!slug,
  });
};

/**
 * Hook to fetch projects by status
 */
export const useProjectsByStatus = (status?: Project['status']) => {
  return useSupabaseQuery<Project[]>({
    queryKey: ['projects', 'status', status],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          let query = supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

          if (status) {
            query = query.eq('status', status);
          }

          const result = await query;
          return { data: result.data, error: result.error };
        },
        {
          table: 'projects',
          operation: 'Project 상태별 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'projects',
    operation: 'Project 상태별 조회',
    fallbackValue: [],
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch projects by category
 */
export const useProjectsByCategory = (category?: string) => {
  return useSupabaseQuery<Project[]>({
    queryKey: ['projects', 'category', category],
    queryFn: async () => {
      return await supabaseQuery(
        async () => {
          let query = supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

          if (category) {
            query = query.eq('category', category);
          }

          const result = await query;
          return { data: result.data, error: result.error };
        },
        {
          table: 'projects',
          operation: 'Project 카테고리별 조회',
          fallbackValue: [],
        }
      );
    },
    table: 'projects',
    operation: 'Project 카테고리별 조회',
    fallbackValue: [],
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to create a new project (Admin only)
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useSupabaseMutation<Project, Omit<Project, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([project])
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    table: 'projects',
    operation: 'Project 생성',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

/**
 * Hook to update a project (Admin only)
 */
export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useSupabaseMutation<Project, { id: string; updates: Partial<Project> }>({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    table: 'projects',
    operation: 'Project 수정',
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', data.slug] });
    },
  });
};

/**
 * Hook to delete a project (Admin only)
 */
export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useSupabaseMutation<string, string>({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    table: 'projects',
    operation: 'Project 삭제',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};
