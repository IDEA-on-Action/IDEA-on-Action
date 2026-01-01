/**
 * Project Types React Query Hooks
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * Custom hooks for project type classification (portfolio, experiment, partner)
 * Created: 2025-11-25
 * Related types: src/types/project-types.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectTypesApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import type {
  ProjectType,
  ProjectTypeStats,
  ProjectTypeSlug,
} from '@/types/shared/project-types';

// ============================================================================
// Query Keys
// ============================================================================

export const projectTypeKeys = {
  all: ['project-types'] as const,
  list: () => ['project-types', 'list'] as const,
  detail: (id: string) => ['project-types', 'detail', id] as const,
  bySlug: (slug: ProjectTypeSlug) => ['project-types', 'by-slug', slug] as const,
  stats: () => ['project-types', 'stats'] as const,
};

// ============================================================================
// List & Detail Hooks
// ============================================================================

/**
 * Fetch all active project types
 */
export function useProjectTypes() {
  return useQuery({
    queryKey: projectTypeKeys.list(),
    queryFn: async () => {
      const result = await projectTypesApi.list();
      if (result.error) {
        console.error('Project types 조회 오류:', result.error);
        return [];
      }
      // Workers API에서 반환된 데이터에서 활성화된 것만 필터링
      const data = (result.data as ProjectType[]) || [];
      return data.filter((pt) => pt.is_active).sort((a, b) => a.display_order - b.display_order);
    },
    staleTime: 1000 * 60 * 60, // 1 hour - project types rarely change
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch a single project type by ID
 */
export function useProjectType(id: string) {
  return useQuery({
    queryKey: projectTypeKeys.detail(id),
    queryFn: async () => {
      const result = await projectTypesApi.getById(id);
      if (result.error) {
        console.error('Project type 상세 조회 오류:', result.error);
        return null;
      }
      return result.data as ProjectType;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Fetch a project type by slug
 */
export function useProjectTypeBySlug(slug: ProjectTypeSlug) {
  return useQuery({
    queryKey: projectTypeKeys.bySlug(slug),
    queryFn: async () => {
      const result = await projectTypesApi.getBySlug(slug);
      if (result.error) {
        console.error('Project type by slug 조회 오류:', result.error);
        return null;
      }
      return result.data as ProjectType;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Fetch project type statistics with portfolio counts
 */
export function useProjectTypeStats() {
  return useQuery({
    queryKey: projectTypeKeys.stats(),
    queryFn: async () => {
      const result = await projectTypesApi.getStats();
      if (result.error) {
        console.error('Project type stats 조회 오류:', result.error);
        return [];
      }
      return (result.data as ProjectTypeStats[]) || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// Admin Mutations (for future use)
// ============================================================================

/**
 * Update project type display order
 */
export function useUpdateProjectTypeOrder() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (
      items: Array<{ id: string; display_order: number }>
    ) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await projectTypesApi.updateOrder(workersTokens.accessToken, items);
      if (result.error) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectTypeKeys.all });
    },
  });
}

/**
 * Toggle project type active status
 */
export function useToggleProjectType() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await projectTypesApi.toggle(workersTokens.accessToken, id, isActive);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data as ProjectType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectTypeKeys.all });
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Get project type options for select/dropdown
 */
export function useProjectTypeOptions() {
  const { data: projectTypes, isLoading, error } = useProjectTypes();

  const options = (projectTypes || []).map((pt) => ({
    value: pt.id,
    label: pt.name_ko,
    slug: pt.slug,
    icon: pt.icon,
    color: pt.color,
  }));

  return {
    options,
    isLoading,
    error,
    getBySlug: (slug: ProjectTypeSlug) =>
      options.find((o) => o.slug === slug),
    getById: (id: string) => options.find((o) => o.value === id),
  };
}
