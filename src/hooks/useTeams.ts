/**
 * useTeams Hook
 *
 * 팀 생성, 조회, 수정, 삭제 기능
 *
 * @description
 * 사용자의 팀 목록을 관리하고 팀 CRUD 작업을 수행합니다.
 * React Query를 사용하여 캐싱 및 상태 관리를 자동화합니다.
 *
 * @returns {UseTeamsReturn} 팀 목록, CRUD 함수, 로딩/에러 상태
 *
 * @example
 * ```tsx
 * function TeamManagement() {
 *   const { teams, createTeam, updateTeam, deleteTeam, isLoading, error } = useTeams();
 *
 *   const handleCreateTeam = async () => {
 *     try {
 *       const newTeam = await createTeam({
 *         organization_id: 'org-123',
 *         name: 'Engineering Team',
 *         description: 'Development team'
 *       });
 *       toast.success('팀이 생성되었습니다');
 *     } catch (error) {
 *       toast.error('팀 생성 실패');
 *     }
 *   };
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       {teams.map(team => (
 *         <TeamCard key={team.id} team={team} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { devError } from '@/lib/errors'
import type {
  Team,
  TeamWithMemberCount,
  CreateTeamInput,
  UpdateTeamInput,
  TeamError,
  TEAM_ERROR_MESSAGES,
} from '@/types/team.types'

/**
 * useTeams 훅 반환 타입
 */
export interface UseTeamsReturn {
  /** 팀 목록 */
  teams: TeamWithMemberCount[]
  /** 팀 생성 */
  createTeam: (data: CreateTeamInput) => Promise<Team>
  /** 팀 수정 */
  updateTeam: (id: string, data: UpdateTeamInput) => Promise<Team>
  /** 팀 삭제 */
  deleteTeam: (id: string) => Promise<void>
  /** 로딩 상태 */
  isLoading: boolean
  /** 에러 */
  error: TeamError | null
}

/**
 * useTeams Hook
 *
 * 팀 관리 기능 제공
 */
export function useTeams(organizationId?: string): UseTeamsReturn {
  const queryClient = useQueryClient()

  // ============================================================================
  // Query: 팀 목록 조회
  // ============================================================================
  const {
    data: teams = [],
    isLoading,
    error: queryError,
  } = useQuery<TeamWithMemberCount[], Error>({
    queryKey: ['teams', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('teams_with_member_count')
        .select('*')
        .order('created_at', { ascending: false })

      // 조직 ID 필터링 (선택)
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query

      if (error) {
        devError(error, { service: 'Teams', operation: '팀 목록 조회' })
        throw new Error('팀 목록을 불러오는데 실패했습니다')
      }

      return data as TeamWithMemberCount[]
    },
    enabled: true, // 항상 활성화 (organizationId가 없으면 전체 조회)
  })

  // ============================================================================
  // Mutation: 팀 생성
  // ============================================================================
  const createTeamMutation = useMutation<Team, Error, CreateTeamInput>({
    mutationFn: async (input: CreateTeamInput) => {
      // 1. 현재 사용자 확인
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('로그인이 필요합니다')
      }

      // 2. 팀 생성
      const { data, error } = await supabase
        .from('teams')
        .insert({
          organization_id: input.organization_id,
          name: input.name,
          description: input.description || null,
          avatar_url: input.avatar_url || null,
          settings: input.settings || {},
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        devError(error, { service: 'Teams', operation: '팀 생성' })
        throw new Error('팀 생성에 실패했습니다')
      }

      return data as Team
    },
    onSuccess: () => {
      // 캐시 무효화 (팀 목록 새로고침)
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  // ============================================================================
  // Mutation: 팀 수정
  // ============================================================================
  const updateTeamMutation = useMutation<Team, Error, { id: string; data: UpdateTeamInput }>({
    mutationFn: async ({ id, data: input }) => {
      const { data, error } = await supabase
        .from('teams')
        .update({
          name: input.name,
          description: input.description,
          avatar_url: input.avatar_url,
          settings: input.settings,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        devError(error, { service: 'Teams', operation: '팀 수정' })
        throw new Error('팀 수정에 실패했습니다')
      }

      return data as Team
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  // ============================================================================
  // Mutation: 팀 삭제
  // ============================================================================
  const deleteTeamMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', id)

      if (error) {
        devError(error, { service: 'Teams', operation: '팀 삭제' })
        throw new Error('팀 삭제에 실패했습니다')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  // ============================================================================
  // Wrapper Functions
  // ============================================================================

  /**
   * 팀 생성
   */
  const createTeam = async (data: CreateTeamInput): Promise<Team> => {
    return createTeamMutation.mutateAsync(data)
  }

  /**
   * 팀 수정
   */
  const updateTeam = async (id: string, data: UpdateTeamInput): Promise<Team> => {
    return updateTeamMutation.mutateAsync({ id, data })
  }

  /**
   * 팀 삭제
   */
  const deleteTeam = async (id: string): Promise<void> => {
    return deleteTeamMutation.mutateAsync(id)
  }

  // ============================================================================
  // Error Handling
  // ============================================================================
  const error: TeamError | null = queryError
    ? {
        code: 'TEAM_010',
        message: queryError.message,
        details: queryError.stack,
        timestamp: new Date().toISOString(),
      }
    : null

  return {
    teams,
    createTeam,
    updateTeam,
    deleteTeam,
    isLoading,
    error,
  }
}

/**
 * 특정 팀 조회 Hook
 *
 * @param teamId 팀 ID
 * @returns 팀 정보 및 로딩/에러 상태
 *
 * @example
 * ```tsx
 * function TeamDetail({ teamId }: { teamId: string }) {
 *   const { team, isLoading, error } = useTeam(teamId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!team) return <NotFound />;
 *
 *   return <TeamInfo team={team} />;
 * }
 * ```
 */
export function useTeam(teamId: string) {
  const {
    data: team,
    isLoading,
    error: queryError,
  } = useQuery<TeamWithMemberCount | null, Error>({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams_with_member_count')
        .select('*')
        .eq('id', teamId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null
        }
        devError(error, { service: 'Teams', operation: '팀 조회' })
        throw new Error('팀 정보를 불러오는데 실패했습니다')
      }

      return data as TeamWithMemberCount
    },
    enabled: !!teamId,
  })

  const error: TeamError | null = queryError
    ? {
        code: 'TEAM_001',
        message: queryError.message,
        details: queryError.stack,
        timestamp: new Date().toISOString(),
      }
    : null

  return {
    team: team || null,
    isLoading,
    error,
  }
}
