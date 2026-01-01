/**
 * useTeamMembers Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQueryClient } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { TeamMember, TeamMemberInsert, TeamMemberUpdate } from '@/types/cms.types';

/**
 * Hook to fetch all team members (ordered by priority DESC, then created_at DESC)
 */
export const useTeamMembers = () => {
  const { workersTokens } = useAuth();

  return useQuery<TeamMember[]>({
    queryKey: ['team-members'],
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<TeamMember[]>(
        '/api/v1/team-members?order_by=priority:desc,created_at:desc',
        { token }
      );

      if (error) {
        console.error('[useTeamMembers] 팀원 목록 조회 에러:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single team member by ID
 */
export const useTeamMember = (id: string) => {
  const { workersTokens } = useAuth();

  return useQuery<TeamMember | null>({
    queryKey: ['team-members', id],
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<TeamMember>(
        `/api/v1/team-members/${id}`,
        { token }
      );

      if (error) {
        console.error('[useTeamMember] 팀원 상세 조회 에러:', error);
        return null;
      }

      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch only active team members (public-facing)
 */
export const useActiveTeamMembers = () => {
  const { workersTokens } = useAuth();

  return useQuery<TeamMember[]>({
    queryKey: ['team-members', 'active'],
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<TeamMember[]>(
        '/api/v1/team-members?active=true&order_by=priority:desc,created_at:desc',
        { token }
      );

      if (error) {
        console.error('[useActiveTeamMembers] 활성 팀원 조회 에러:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to create a new team member (Admin only)
 */
export const useCreateTeamMember = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<TeamMember, Error, TeamMemberInsert>({
    mutationFn: async (member: TeamMemberInsert) => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<TeamMember>(
        '/api/v1/team-members',
        {
          method: 'POST',
          token,
          body: member,
        }
      );

      if (error) throw new Error(error);
      return data as TeamMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
};

/**
 * Hook to update a team member (Admin only)
 */
export const useUpdateTeamMember = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<TeamMember, Error, { id: string; updates: TeamMemberUpdate }>({
    mutationFn: async ({ id, updates }: { id: string; updates: TeamMemberUpdate }) => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<TeamMember>(
        `/api/v1/team-members/${id}`,
        {
          method: 'PATCH',
          token,
          body: updates,
        }
      );

      if (error) throw new Error(error);
      return data as TeamMember;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-members', data.id] });
    },
  });
};

/**
 * Hook to delete a team member (Admin only)
 */
export const useDeleteTeamMember = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<string, Error, string>({
    mutationFn: async (id: string) => {
      const token = workersTokens?.accessToken;
      const { error } = await callWorkersApi(
        `/api/v1/team-members/${id}`,
        {
          method: 'DELETE',
          token,
        }
      );

      if (error) throw new Error(error);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
};

/**
 * Hook to toggle team member active status (Admin only)
 */
export const useToggleTeamMemberActive = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation<TeamMember, Error, { id: string; active: boolean }>({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<TeamMember>(
        `/api/v1/team-members/${id}`,
        {
          method: 'PATCH',
          token,
          body: { active },
        }
      );

      if (error) throw new Error(error);
      return data as TeamMember;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-members', data.id] });
      queryClient.invalidateQueries({ queryKey: ['team-members', 'active'] });
    },
  });
};
