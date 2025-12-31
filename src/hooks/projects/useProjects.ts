/**
 * useProjects Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import type { Project } from '@/types/v2';

/**
 * Hook to fetch all projects
 */
export const useProjects = () => {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const result = await projectsApi.list();
      if (result.error) {
        console.error('Projects 조회 오류:', result.error);
        return [];
      }
      return (result.data as Project[]) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single project by slug
 */
export const useProject = (slug: string) => {
  return useQuery<Project | null>({
    queryKey: ['projects', slug],
    queryFn: async () => {
      const result = await projectsApi.getBySlug(slug);
      if (result.error) {
        console.error('Project 상세 조회 오류:', result.error);
        return null;
      }
      return (result.data as Project) || null;
    },
    enabled: !!slug,
  });
};

/**
 * Hook to fetch projects by status
 */
export const useProjectsByStatus = (status?: Project['status']) => {
  return useQuery<Project[]>({
    queryKey: ['projects', 'status', status],
    queryFn: async () => {
      const result = await projectsApi.list({ status: status || undefined });
      if (result.error) {
        console.error('Projects 상태별 조회 오류:', result.error);
        return [];
      }
      return (result.data as Project[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch projects by category
 */
export const useProjectsByCategory = (category?: string) => {
  return useQuery<Project[]>({
    queryKey: ['projects', 'category', category],
    queryFn: async () => {
      const result = await projectsApi.list({ category: category || undefined });
      if (result.error) {
        console.error('Projects 카테고리별 조회 오류:', result.error);
        return [];
      }
      return (result.data as Project[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to create a new project (Admin only)
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<Project, Error, Omit<Project, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: async (project) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await projectsApi.create(workersTokens.accessToken, project);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data as Project;
    },
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
  const { workersTokens } = useAuth();

  return useMutation<Project, Error, { id: string; updates: Partial<Project> }>({
    mutationFn: async ({ id, updates }) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await projectsApi.update(workersTokens.accessToken, id, updates);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data as Project;
    },
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
  const { workersTokens } = useAuth();

  return useMutation<string, Error, string>({
    mutationFn: async (id) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await projectsApi.delete(workersTokens.accessToken, id);
      if (result.error) {
        throw new Error(result.error);
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};
