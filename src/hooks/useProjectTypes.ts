/**
 * Project Types React Query Hooks
 *
 * Custom hooks for project type classification (portfolio, experiment, partner)
 * Created: 2025-11-25
 * Related types: src/types/project-types.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ProjectType,
  ProjectTypeStats,
  ProjectTypeSlug,
} from '@/types/project-types';

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
      const { data, error } = await supabase
        .from('project_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return (data as ProjectType[]) || [];
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
      const { data, error } = await supabase
        .from('project_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ProjectType;
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
      const { data, error } = await supabase
        .from('project_types')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data as ProjectType;
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
      const { data, error } = await supabase
        .from('project_type_stats')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return (data as ProjectTypeStats[]) || [];
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

  return useMutation({
    mutationFn: async (
      items: Array<{ id: string; display_order: number }>
    ) => {
      const updates = items.map(({ id, display_order }) =>
        supabase
          .from('project_types')
          .update({ display_order })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        throw new Error('Failed to update some project types');
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

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('project_types')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectType;
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
