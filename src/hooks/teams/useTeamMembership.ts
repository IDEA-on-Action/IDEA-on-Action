/**
 * useTeamMembership Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 팀 멤버십 관리 및 초대 기능
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/useAuth'
import { devError } from '@/lib/errors'
import type {
  TeamMember,
  TeamMemberWithUser,
  UserRole,
  TeamInvitation,
  TeamError,
} from '@/types/team.types'

/**
 * useTeamMembership 훅 반환 타입
 */
export interface UseTeamMembershipReturn {
  /** 팀 멤버 목록 */
  members: TeamMemberWithUser[]
  /** 멤버 초대 */
  inviteMembers: (teamId: string, emails: string[], role: UserRole) => Promise<TeamInvitation[]>
  /** 멤버 제거 */
  removeMember: (teamId: string, userId: string) => Promise<void>
  /** 멤버 역할 변경 */
  updateMemberRole: (teamId: string, userId: string, role: UserRole) => Promise<TeamMember>
  /** 로딩 상태 */
  isLoading: boolean
  /** 에러 */
  error: TeamError | null
}

/**
 * useTeamMembership Hook
 */
export function useTeamMembership(teamId: string): UseTeamMembershipReturn {
  const queryClient = useQueryClient()
  const { user, workersTokens } = useAuth()

  // Query: 팀 멤버 목록 조회
  const {
    data: members = [],
    isLoading,
    error: queryError,
  } = useQuery<TeamMemberWithUser[], Error>({
    queryKey: ['team-membership', teamId],
    queryFn: async () => {
      const token = workersTokens?.accessToken

      // 1. 팀 멤버 조회
      const { data: teamMembers, error: teamMembersError } = await callWorkersApi<TeamMemberWithUser[]>(
        `/api/v1/teams/${teamId}/members`,
        { token }
      )

      if (teamMembersError) {
        devError(new Error(teamMembersError), { service: 'TeamMembership', operation: '멤버 목록 조회' })
        throw new Error('멤버 목록을 불러오는데 실패했습니다')
      }

      return teamMembers || []
    },
    enabled: !!teamId,
  })

  // Mutation: 멤버 초대
  const inviteMembersMutation = useMutation<
    TeamInvitation[],
    Error,
    { teamId: string; emails: string[]; role: UserRole }
  >({
    mutationFn: async ({ teamId, emails, role }) => {
      if (!user) {
        throw new Error('로그인이 필요합니다')
      }

      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<TeamInvitation[]>(
        `/api/v1/teams/${teamId}/invitations`,
        {
          method: 'POST',
          token,
          body: { emails, role },
        }
      )

      if (error) {
        devError(new Error(error), { service: 'TeamMembership', operation: '멤버 초대' })
        throw new Error('멤버 초대에 실패했습니다')
      }

      return data || []
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-membership'] })
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] })
    },
  })

  // Mutation: 멤버 제거
  const removeMemberMutation = useMutation<void, Error, { teamId: string; userId: string }>({
    mutationFn: async ({ teamId, userId }) => {
      const token = workersTokens?.accessToken
      const { error } = await callWorkersApi(
        `/api/v1/teams/${teamId}/members/${userId}`,
        {
          method: 'DELETE',
          token,
        }
      )

      if (error) {
        devError(new Error(error), { service: 'TeamMembership', operation: '멤버 제거' })
        throw new Error('멤버 제거에 실패했습니다')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-membership'] })
    },
  })

  // Mutation: 멤버 역할 변경
  const updateMemberRoleMutation = useMutation<
    TeamMember,
    Error,
    { teamId: string; userId: string; role: UserRole }
  >({
    mutationFn: async ({ teamId, userId, role }) => {
      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<TeamMember>(
        `/api/v1/teams/${teamId}/members/${userId}`,
        {
          method: 'PATCH',
          token,
          body: { role },
        }
      )

      if (error) {
        devError(new Error(error), { service: 'TeamMembership', operation: '역할 변경' })
        throw new Error('역할 변경에 실패했습니다')
      }

      return data as TeamMember
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-membership'] })
    },
  })

  // Wrapper Functions
  const inviteMembers = async (
    teamId: string,
    emails: string[],
    role: UserRole
  ): Promise<TeamInvitation[]> => {
    return inviteMembersMutation.mutateAsync({ teamId, emails, role })
  }

  const removeMember = async (teamId: string, userId: string): Promise<void> => {
    return removeMemberMutation.mutateAsync({ teamId, userId })
  }

  const updateMemberRole = async (
    teamId: string,
    userId: string,
    role: UserRole
  ): Promise<TeamMember> => {
    return updateMemberRoleMutation.mutateAsync({ teamId, userId, role })
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
    members,
    inviteMembers,
    removeMember,
    updateMemberRole,
    isLoading,
    error,
  }
}

/**
 * 팀 초대 목록 조회 Hook
 */
export function useTeamInvitations(teamId: string) {
  const { workersTokens } = useAuth()

  const {
    data: invitations = [],
    isLoading,
    error: queryError,
  } = useQuery<TeamInvitation[], Error>({
    queryKey: ['team-invitations', teamId],
    queryFn: async () => {
      const token = workersTokens?.accessToken
      const { data, error } = await callWorkersApi<TeamInvitation[]>(
        `/api/v1/teams/${teamId}/invitations?status=pending`,
        { token }
      )

      if (error) {
        devError(new Error(error), { service: 'TeamMembership', operation: '초대 목록 조회' })
        throw new Error('초대 목록을 불러오는데 실패했습니다')
      }

      return data || []
    },
    enabled: !!teamId,
  })

  const error: TeamError | null = queryError
    ? {
        code: 'TEAM_010',
        message: queryError.message,
        details: queryError.stack,
        timestamp: new Date().toISOString(),
      }
    : null

  return {
    invitations,
    isLoading,
    error,
  }
}

/**
 * 초대 수락 Hook
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  const { user, workersTokens } = useAuth()

  const acceptInvitationMutation = useMutation<void, Error, string>({
    mutationFn: async (token: string) => {
      if (!user) {
        throw new Error('로그인이 필요합니다')
      }

      const authToken = workersTokens?.accessToken
      const { error } = await callWorkersApi(
        '/api/v1/team-invitations/accept',
        {
          method: 'POST',
          token: authToken,
          body: { invitation_token: token },
        }
      )

      if (error) {
        devError(new Error(error), { service: 'TeamMembership', operation: '초대 수락' })
        throw new Error(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-membership'] })
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  return {
    acceptInvitation: acceptInvitationMutation.mutateAsync,
    isLoading: acceptInvitationMutation.isPending,
    error: acceptInvitationMutation.error
      ? ({
          code: 'TEAM_005',
          message: acceptInvitationMutation.error.message,
          details: acceptInvitationMutation.error.stack,
          timestamp: new Date().toISOString(),
        } as TeamError)
      : null,
  }
}
