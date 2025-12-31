/**
 * useTeams Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 팀 생성, 조회, 수정, 삭제 기능
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import { devError } from '@/lib/errors'
import type {
  Team,
  TeamWithMemberCount,
  CreateTeamInput,
  UpdateTeamInput,
  TeamError,
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
 */
export function useTeams(organizationId?: string): UseTeamsReturn {
  const queryClient = useQueryClient()
  const { user, workersTokens } = useAuth()

  // Query: 팀 목록 조회
  const {
    data: teams = [],
    isLoading,
    error: queryError,
  } = useQuery<TeamWithMemberCount[], Error>({
    queryKey: ['teams', organizationId],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      let url = '/api/v1/teams?order_by=created_at:desc'

      if (organizationId) {
        url += `&organization_id=${organizationId}`
      }

      const { data, error } = await callWorkersApi<TeamWithMemberCount[]>(url, { token })

      if (error) {
        devError(new Error(error), { service: 'Teams', operation: '팀 목록 조회' })
        throw new Error('팀 목록을 불러오는데 실패했습니다')
      }

      return data || []
    },
    enabled: true, // 항상 활성화
  })

  // Mutation: 팀 생성
  const createTeamMutation = useMutation<Team, Error, CreateTeamInput>({
    mutationFn: async (input: CreateTeamInput) => {
      if (!user) {
        throw new Error('로그인이 필요합니다')
      }

      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<Team>(
        '/api/v1/teams',
        {
          method: 'POST',
          token,
          body: {
            organization_id: input.organization_id,
            name: input.name,
            description: input.description || null,
            avatar_url: input.avatar_url || null,
            settings: input.settings || {},
            created_by: user.id,
          },
        }
      )

      if (error) {
        devError(new Error(error), { service: 'Teams', operation: '팀 생성' })
        throw new Error('팀 생성에 실패했습니다')
      }

      return data as Team
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  // Mutation: 팀 수정
  const updateTeamMutation = useMutation<Team, Error, { id: string; data: UpdateTeamInput }>({
    mutationFn: async ({ id, data: input }) => {
      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<Team>(
        `/api/v1/teams/${id}`,
        {
          method: 'PATCH',
          token,
          body: {
            name: input.name,
            description: input.description,
            avatar_url: input.avatar_url,
            settings: input.settings,
          },
        }
      )

      if (error) {
        devError(new Error(error), { service: 'Teams', operation: '팀 수정' })
        throw new Error('팀 수정에 실패했습니다')
      }

      return data as Team
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  // Mutation: 팀 삭제
  const deleteTeamMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const token = workersTokens?.accessToken
      const { error } = await callWorkersApi(
        `/api/v1/teams/${id}`,
        {
          method: 'DELETE',
          token,
        }
      )

      if (error) {
        devError(new Error(error), { service: 'Teams', operation: '팀 삭제' })
        throw new Error('팀 삭제에 실패했습니다')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  // Wrapper Functions
  const createTeam = async (data: CreateTeamInput): Promise<Team> => {
    return createTeamMutation.mutateAsync(data)
  }

  const updateTeam = async (id: string, data: UpdateTeamInput): Promise<Team> => {
    return updateTeamMutation.mutateAsync({ id, data })
  }

  const deleteTeam = async (id: string): Promise<void> => {
    return deleteTeamMutation.mutateAsync(id)
  }

  // Error Handling
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
 */
export function useTeam(teamId: string) {
  const { workersTokens } = useAuth()

  const {
    data: team,
    isLoading,
    error: queryError,
  } = useQuery<TeamWithMemberCount | null, Error>({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<TeamWithMemberCount>(
        `/api/v1/teams/${teamId}`,
        { token }
      )

      if (error) {
        if (error.includes('not found') || error.includes('404')) {
          return null
        }
        devError(new Error(error), { service: 'Teams', operation: '팀 조회' })
        throw new Error('팀 정보를 불러오는데 실패했습니다')
      }

      return data
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
