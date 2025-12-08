/**
 * useTeamMembership Hook
 *
 * 팀 멤버십 관리 및 초대 기능
 *
 * @description
 * 팀 멤버 조회, 초대, 제거, 역할 변경 기능을 제공합니다.
 * React Query를 사용하여 캐싱 및 상태 관리를 자동화합니다.
 *
 * @returns {UseTeamMembersReturn} 멤버 목록, 초대/제거 함수, 로딩/에러 상태
 *
 * @example
 * ```tsx
 * function TeamMembersPage({ teamId }: { teamId: string }) {
 *   const {
 *     members,
 *     inviteMembers,
 *     removeMember,
 *     updateMemberRole,
 *     isLoading,
 *     error
 *   } = useTeamMembership(teamId);
 *
 *   const handleInvite = async () => {
 *     try {
 *       await inviteMembers(teamId, ['user@example.com'], 'member');
 *       toast.success('초대 이메일이 발송되었습니다');
 *     } catch (error) {
 *       toast.error('초대 실패');
 *     }
 *   };
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <MemberList members={members} />
 *       <InviteButton onClick={handleInvite} />
 *     </div>
 *   );
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
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
 *
 * 팀 멤버십 관리 기능 제공
 */
export function useTeamMembership(teamId: string): UseTeamMembershipReturn {
  const queryClient = useQueryClient()

  // ============================================================================
  // Query: 팀 멤버 목록 조회
  // ============================================================================
  const {
    data: members = [],
    isLoading,
    error: queryError,
  } = useQuery<TeamMemberWithUser[], Error>({
    queryKey: ['team-membership', teamId],
    queryFn: async () => {
      // 1. 팀 멤버 조회
      const { data: teamMembers, error: teamMembersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .not('joined_at', 'is', null) // 가입한 멤버만
        .order('joined_at', { ascending: true })

      if (teamMembersError) {
        devError(teamMembersError, { service: 'TeamMembership', operation: '멤버 목록 조회' })
        throw new Error('멤버 목록을 불러오는데 실패했습니다')
      }

      // 2. 사용자 정보 조회
      const userIds = teamMembers.map((m) => m.user_id)

      if (userIds.length === 0) {
        return []
      }

      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds)

      if (usersError) {
        devError(usersError, { service: 'TeamMembership', operation: '사용자 정보 조회' })
        // 사용자 정보가 없어도 멤버 목록은 반환 (fallback)
      }

      // 3. auth.users에서 이메일 조회
      const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers()

      if (authUsersError) {
        devError(authUsersError, { service: 'TeamMembership', operation: '이메일 조회' })
      }

      const authUsersMap = new Map(authUsers?.users?.map((u) => [u.id, u.email]) || [])

      // 4. 매핑
      const membersWithUser: TeamMemberWithUser[] = teamMembers.map((member) => {
        const userProfile = users?.find((u) => u.user_id === member.user_id)
        const email = authUsersMap.get(member.user_id)

        return {
          ...member,
          user: {
            id: member.user_id,
            email: email || 'Unknown',
            display_name: userProfile?.display_name || null,
            avatar_url: userProfile?.avatar_url || null,
          },
        }
      })

      return membersWithUser
    },
    enabled: !!teamId,
  })

  // ============================================================================
  // Mutation: 멤버 초대
  // ============================================================================
  const inviteMembersMutation = useMutation<
    TeamInvitation[],
    Error,
    { teamId: string; emails: string[]; role: UserRole }
  >({
    mutationFn: async ({ teamId, emails, role }) => {
      // 1. 현재 사용자 확인
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('로그인이 필요합니다')
      }

      // 2. 초대 토큰 생성 (각 이메일별)
      const invitations: TeamInvitation[] = []

      for (const email of emails) {
        // 2-1. 초대 토큰 생성
        const { data: tokenData, error: tokenError } = await supabase.rpc(
          'generate_invitation_token',
          {}
        )

        if (tokenError) {
          devError(tokenError, { service: 'TeamMembership', operation: '토큰 생성' })
          throw new Error(`초대 토큰 생성 실패: ${email}`)
        }

        const token = tokenData as string

        // 2-2. 초대 생성
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

        const { data: invitation, error: invitationError } = await supabase
          .from('team_invitations')
          .insert({
            team_id: teamId,
            email: email.toLowerCase().trim(),
            role,
            token,
            invited_by: user.id,
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single()

        if (invitationError) {
          devError(invitationError, { service: 'TeamMembership', operation: '초대 생성' })
          throw new Error(`초대 생성 실패: ${email}`)
        }

        invitations.push(invitation as TeamInvitation)
      }

      return invitations
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-membership'] })
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] })
    },
  })

  // ============================================================================
  // Mutation: 멤버 제거
  // ============================================================================
  const removeMemberMutation = useMutation<void, Error, { teamId: string; userId: string }>({
    mutationFn: async ({ teamId, userId }) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)

      if (error) {
        devError(error, { service: 'TeamMembership', operation: '멤버 제거' })
        throw new Error('멤버 제거에 실패했습니다')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-membership'] })
    },
  })

  // ============================================================================
  // Mutation: 멤버 역할 변경
  // ============================================================================
  const updateMemberRoleMutation = useMutation<
    TeamMember,
    Error,
    { teamId: string; userId: string; role: UserRole }
  >({
    mutationFn: async ({ teamId, userId, role }) => {
      const { data, error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        devError(error, { service: 'TeamMembership', operation: '역할 변경' })
        throw new Error('역할 변경에 실패했습니다')
      }

      return data as TeamMember
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-membership'] })
    },
  })

  // ============================================================================
  // Wrapper Functions
  // ============================================================================

  /**
   * 멤버 초대
   */
  const inviteMembers = async (
    teamId: string,
    emails: string[],
    role: UserRole
  ): Promise<TeamInvitation[]> => {
    return inviteMembersMutation.mutateAsync({ teamId, emails, role })
  }

  /**
   * 멤버 제거
   */
  const removeMember = async (teamId: string, userId: string): Promise<void> => {
    return removeMemberMutation.mutateAsync({ teamId, userId })
  }

  /**
   * 멤버 역할 변경
   */
  const updateMemberRole = async (
    teamId: string,
    userId: string,
    role: UserRole
  ): Promise<TeamMember> => {
    return updateMemberRoleMutation.mutateAsync({ teamId, userId, role })
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
 *
 * @param teamId 팀 ID
 * @returns 초대 목록 및 로딩/에러 상태
 *
 * @example
 * ```tsx
 * function TeamInvitationsPage({ teamId }: { teamId: string }) {
 *   const { invitations, isLoading, error } = useTeamInvitations(teamId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <InvitationList invitations={invitations} />;
 * }
 * ```
 */
export function useTeamInvitations(teamId: string) {
  const {
    data: invitations = [],
    isLoading,
    error: queryError,
  } = useQuery<TeamInvitation[], Error>({
    queryKey: ['team-invitations', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .is('accepted_at', null) // 수락되지 않은 초대만
        .gt('expires_at', new Date().toISOString()) // 만료되지 않은 초대만
        .order('created_at', { ascending: false })

      if (error) {
        devError(error, { service: 'TeamMembership', operation: '초대 목록 조회' })
        throw new Error('초대 목록을 불러오는데 실패했습니다')
      }

      return data as TeamInvitation[]
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
 *
 * @returns 초대 수락 함수 및 로딩/에러 상태
 *
 * @example
 * ```tsx
 * function AcceptInvitationPage({ token }: { token: string }) {
 *   const { acceptInvitation, isLoading, error } = useAcceptInvitation();
 *
 *   const handleAccept = async () => {
 *     try {
 *       await acceptInvitation(token);
 *       toast.success('팀에 가입되었습니다');
 *       navigate('/teams');
 *     } catch (error) {
 *       toast.error('초대 수락 실패');
 *     }
 *   };
 *
 *   return <AcceptButton onClick={handleAccept} loading={isLoading} />;
 * }
 * ```
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  const acceptInvitationMutation = useMutation<void, Error, string>({
    mutationFn: async (token: string) => {
      // 1. 현재 사용자 확인
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('로그인이 필요합니다')
      }

      // 2. 초대 검증
      const { data: validation, error: validationError } = await supabase.rpc(
        'validate_invitation_token',
        { p_token: token }
      )

      if (validationError) {
        devError(validationError, { service: 'TeamMembership', operation: '초대 검증' })
        throw new Error('초대 검증에 실패했습니다')
      }

      const validationResult = (validation as { is_valid: boolean; email: string; team_id: string; role: string }[])[0]

      if (!validationResult || !validationResult.is_valid) {
        throw new Error('유효하지 않은 초대입니다')
      }

      // 3. 이메일 확인
      if (user.email?.toLowerCase() !== validationResult.email.toLowerCase()) {
        throw new Error('초대된 이메일과 로그인 계정이 일치하지 않습니다')
      }

      // 4. 팀 멤버 추가
      const { error: memberError } = await supabase.from('team_members').insert({
        team_id: validationResult.team_id,
        user_id: user.id,
        role: validationResult.role,
        invited_by: null,
        joined_at: new Date().toISOString(),
      })

      if (memberError) {
        devError(memberError, { service: 'TeamMembership', operation: '멤버 추가' })
        throw new Error('팀 가입에 실패했습니다')
      }

      // 5. 초대 수락 표시
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', validationResult.invitation_id)

      if (updateError) {
        devError(updateError, { service: 'TeamMembership', operation: '초대 수락 업데이트' })
        // 에러를 던지지 않음 (멤버는 이미 추가됨)
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
