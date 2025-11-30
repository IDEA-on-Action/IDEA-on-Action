/**
 * Team API Edge Function
 *
 * 팀/조직 관리 API
 *
 * @endpoints
 *   - POST /teams - 팀 생성
 *   - GET /teams - 팀 목록 조회
 *   - GET /teams/:id - 팀 상세 조회
 *   - PUT /teams/:id - 팀 수정
 *   - DELETE /teams/:id - 팀 삭제
 *
 *   - GET /teams/:id/members - 멤버 목록
 *   - POST /teams/:id/members - 멤버 초대 (이메일)
 *   - PUT /teams/:id/members/:user_id - 멤버 역할 변경
 *   - DELETE /teams/:id/members/:user_id - 멤버 제거
 *
 *   - POST /teams/:id/invitations - 초대 생성
 *   - GET /invitations/:token - 초대 정보 조회
 *   - POST /invitations/:token/accept - 초대 수락
 *
 * @headers
 *   Authorization: Bearer <ACCESS_TOKEN>
 *   Content-Type: application/json
 *
 * @version 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createErrorResponse, createValidationErrorResponse } from '../_shared/problem-details.ts'

// ============================================================================
// 타입 정의
// ============================================================================

type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'

interface CreateTeamRequest {
  organization_id: string
  name: string
  description?: string
  avatar_url?: string
  settings?: Record<string, unknown>
}

interface UpdateTeamRequest {
  name?: string
  description?: string
  avatar_url?: string
  settings?: Record<string, unknown>
}

interface Team {
  id: string
  organization_id: string
  name: string
  description: string | null
  avatar_url: string | null
  settings: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  invited_by: string | null
  invited_at: string
  joined_at: string | null
  created_at: string
}

interface InviteMemberRequest {
  email: string
  role: TeamRole
}

interface UpdateMemberRoleRequest {
  role: TeamRole
}

interface TeamInvitation {
  id: string
  team_id: string
  email: string
  role: TeamRole
  token: string
  invited_by: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

interface CreateInvitationRequest {
  email: string
  role: TeamRole
  expires_in_hours?: number
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

function generateUUID(): string {
  return crypto.randomUUID()
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

async function verifySupabaseAuth(
  token: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ valid: boolean; userId?: string; email?: string; error?: string }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { valid: false, error: 'invalid_token' }
    }

    return { valid: true, userId: user.id, email: user.email }
  } catch (error) {
    console.error('Supabase auth verification error:', error)
    return { valid: false, error: 'auth_verification_failed' }
  }
}

function successResponse<T>(
  data: T,
  requestId: string,
  request?: Request
): Response {
  const origin = request?.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
    },
  })
}

function createdResponse<T>(
  data: T,
  requestId: string,
  request?: Request
): Response {
  const origin = request?.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
    },
  })
}

async function logAuditEvent(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  actorId: string,
  actorEmail: string | undefined,
  resourceType: string,
  resourceId: string,
  action: string,
  organizationId: string | null,
  changes?: Record<string, unknown>,
  metadata?: Record<string, unknown>,
  status: 'success' | 'failure' = 'success'
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      event_type: eventType,
      actor_id: actorId,
      actor_type: 'user',
      actor_email: actorEmail,
      resource_type: resourceType,
      resource_id: resourceId,
      organization_id: organizationId,
      action,
      changes,
      metadata,
      status,
    })
  } catch (error) {
    console.error('Failed to log audit event:', error)
    // 감사 로그 실패는 비즈니스 로직에 영향을 주지 않음
  }
}

// ============================================================================
// 핸들러 함수 - 팀 관리
// ============================================================================

/**
 * POST /teams - 팀 생성
 */
async function handleCreateTeam(
  userId: string,
  userEmail: string | undefined,
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    const body: CreateTeamRequest = await req.json()
    const { organization_id, name, description, avatar_url, settings } = body

    // 유효성 검증
    const errors: Array<{ field: string; code: string; message: string }> = []

    if (!organization_id) {
      errors.push({
        field: 'organization_id',
        code: 'required',
        message: 'organization_id is required',
      })
    }

    if (!name || name.trim().length === 0) {
      errors.push({
        field: 'name',
        code: 'required',
        message: 'name is required',
      })
    }

    if (name && name.length > 100) {
      errors.push({
        field: 'name',
        code: 'max_length',
        message: 'name must be 100 characters or less',
      })
    }

    if (errors.length > 0) {
      return createValidationErrorResponse(
        '요청 데이터가 유효하지 않습니다.',
        '/teams',
        errors,
        req
      )
    }

    // 권한 확인 (teams:create 권한 필요)
    const { data: canCreate, error: permError } = await supabase
      .rpc('check_permission', {
        p_user_id: userId,
        p_organization_id: organization_id,
        p_resource: 'teams',
        p_action: 'create',
      })

    if (permError || !canCreate) {
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        '팀을 생성할 권한이 없습니다.',
        '/teams',
        undefined,
        undefined,
        req
      )
    }

    // 팀 생성
    const { data: team, error: insertError } = await supabase
      .from('teams')
      .insert({
        organization_id,
        name: name.trim(),
        description: description?.trim() || null,
        avatar_url: avatar_url || null,
        settings: settings || {},
        created_by: userId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Create team error:', insertError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '팀 생성 중 오류가 발생했습니다.',
        '/teams',
        undefined,
        undefined,
        req
      )
    }

    // 감사 로그 기록
    await logAuditEvent(
      supabase,
      'team.create',
      userId,
      userEmail,
      'team',
      team.id,
      'create',
      organization_id,
      { after: team }
    )

    return createdResponse(team, requestId, req)
  } catch (error) {
    console.error('Create team error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '팀 생성 중 오류가 발생했습니다.',
      '/teams',
      undefined,
      undefined,
      req
    )
  }
}

/**
 * GET /teams - 팀 목록 조회
 *
 * Query Parameters:
 *   - organization_id: 조직 ID (required)
 */
async function handleGetTeams(
  userId: string,
  url: URL,
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  request: Request
): Promise<Response> {
  const organizationId = url.searchParams.get('organization_id')

  // 유효성 검증
  if (!organizationId) {
    return createValidationErrorResponse(
      '필수 파라미터가 누락되었습니다.',
      '/teams',
      [
        {
          field: 'organization_id',
          code: 'required',
          message: 'organization_id is required',
        },
      ],
      request
    )
  }

  try {
    // 조직 멤버인지 확인
    const { data: isMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single()

    if (!isMember) {
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        '해당 조직의 팀 목록을 조회할 권한이 없습니다.',
        '/teams',
        403,
        undefined,
        request
      )
    }

    // 팀 목록 조회 (RLS 정책이 자동으로 필터링)
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get teams error:', error)
      return createErrorResponse(
        'DATABASE_ERROR',
        '팀 목록 조회 중 오류가 발생했습니다.',
        '/teams',
        undefined,
        undefined,
        request
      )
    }

    return successResponse(teams || [], requestId, request)
  } catch (error) {
    console.error('Get teams error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '팀 목록 조회 중 오류가 발생했습니다.',
      '/teams',
      undefined,
      undefined,
      request
    )
  }
}

/**
 * GET /teams/:id - 팀 상세 조회
 */
async function handleGetTeam(
  userId: string,
  teamId: string,
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  request: Request
): Promise<Response> {
  try {
    const { data: team, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (error || !team) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '팀을 찾을 수 없습니다.',
        `/teams/${teamId}`,
        404,
        undefined,
        request
      )
    }

    return successResponse(team, requestId, request)
  } catch (error) {
    console.error('Get team error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '팀 조회 중 오류가 발생했습니다.',
      `/teams/${teamId}`,
      undefined,
      undefined,
      request
    )
  }
}

/**
 * PUT /teams/:id - 팀 수정
 */
async function handleUpdateTeam(
  userId: string,
  userEmail: string | undefined,
  teamId: string,
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    const body: UpdateTeamRequest = await req.json()
    const { name, description, avatar_url, settings } = body

    // 유효성 검증
    const errors: Array<{ field: string; code: string; message: string }> = []

    if (name !== undefined && name.trim().length === 0) {
      errors.push({
        field: 'name',
        code: 'invalid',
        message: 'name cannot be empty',
      })
    }

    if (name && name.length > 100) {
      errors.push({
        field: 'name',
        code: 'max_length',
        message: 'name must be 100 characters or less',
      })
    }

    if (errors.length > 0) {
      return createValidationErrorResponse(
        '요청 데이터가 유효하지 않습니다.',
        `/teams/${teamId}`,
        errors,
        req
      )
    }

    // 기존 팀 조회
    const { data: existingTeam, error: fetchError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (fetchError || !existingTeam) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '팀을 찾을 수 없습니다.',
        `/teams/${teamId}`,
        404,
        undefined,
        req
      )
    }

    // 권한 확인 (teams:update 권한 필요)
    const { data: canUpdate, error: permError } = await supabase
      .rpc('check_permission', {
        p_user_id: userId,
        p_organization_id: existingTeam.organization_id,
        p_resource: 'teams',
        p_action: 'update',
      })

    if (permError || !canUpdate) {
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        '팀을 수정할 권한이 없습니다.',
        `/teams/${teamId}`,
        undefined,
        undefined,
        req
      )
    }

    // 업데이트할 필드만 포함
    const updates: Partial<UpdateTeamRequest> = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (avatar_url !== undefined) updates.avatar_url = avatar_url || null
    if (settings !== undefined) updates.settings = settings

    // 팀 수정
    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single()

    if (updateError) {
      console.error('Update team error:', updateError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '팀 수정 중 오류가 발생했습니다.',
        `/teams/${teamId}`,
        undefined,
        undefined,
        req
      )
    }

    // 감사 로그 기록
    await logAuditEvent(
      supabase,
      'team.update',
      userId,
      userEmail,
      'team',
      teamId,
      'update',
      existingTeam.organization_id,
      { before: existingTeam, after: updatedTeam }
    )

    return successResponse(updatedTeam, requestId, req)
  } catch (error) {
    console.error('Update team error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '팀 수정 중 오류가 발생했습니다.',
      `/teams/${teamId}`,
      undefined,
      undefined,
      req
    )
  }
}

/**
 * DELETE /teams/:id - 팀 삭제
 */
async function handleDeleteTeam(
  userId: string,
  userEmail: string | undefined,
  teamId: string,
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  request: Request
): Promise<Response> {
  try {
    // 기존 팀 조회
    const { data: existingTeam, error: fetchError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (fetchError || !existingTeam) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '팀을 찾을 수 없습니다.',
        `/teams/${teamId}`,
        404,
        undefined,
        request
      )
    }

    // 권한 확인 (teams:delete 권한 필요)
    const { data: canDelete, error: permError } = await supabase
      .rpc('check_permission', {
        p_user_id: userId,
        p_organization_id: existingTeam.organization_id,
        p_resource: 'teams',
        p_action: 'delete',
      })

    if (permError || !canDelete) {
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        '팀을 삭제할 권한이 없습니다.',
        `/teams/${teamId}`,
        undefined,
        undefined,
        request
      )
    }

    // 팀 삭제
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (deleteError) {
      console.error('Delete team error:', deleteError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '팀 삭제 중 오류가 발생했습니다.',
        `/teams/${teamId}`,
        undefined,
        undefined,
        request
      )
    }

    // 감사 로그 기록
    await logAuditEvent(
      supabase,
      'team.delete',
      userId,
      userEmail,
      'team',
      teamId,
      'delete',
      existingTeam.organization_id,
      { before: existingTeam }
    )

    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request.headers.get('origin')),
    })
  } catch (error) {
    console.error('Delete team error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '팀 삭제 중 오류가 발생했습니다.',
      `/teams/${teamId}`,
      undefined,
      undefined,
      request
    )
  }
}

// ============================================================================
// 핸들러 함수 - 멤버 관리
// ============================================================================

/**
 * GET /teams/:id/members - 멤버 목록 조회
 */
async function handleGetTeamMembers(
  userId: string,
  teamId: string,
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  request: Request
): Promise<Response> {
  try {
    // 팀 존재 확인
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '팀을 찾을 수 없습니다.',
        `/teams/${teamId}/members`,
        404,
        undefined,
        request
      )
    }

    // 멤버 목록 조회 (RLS 정책이 자동으로 필터링)
    const { data: members, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Get team members error:', error)
      return createErrorResponse(
        'DATABASE_ERROR',
        '멤버 목록 조회 중 오류가 발생했습니다.',
        `/teams/${teamId}/members`,
        undefined,
        undefined,
        request
      )
    }

    return successResponse(members || [], requestId, request)
  } catch (error) {
    console.error('Get team members error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '멤버 목록 조회 중 오류가 발생했습니다.',
      `/teams/${teamId}/members`,
      undefined,
      undefined,
      request
    )
  }
}

/**
 * POST /teams/:id/members - 멤버 초대 (이메일)
 */
async function handleInviteTeamMember(
  userId: string,
  userEmail: string | undefined,
  teamId: string,
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    const body: InviteMemberRequest = await req.json()
    const { email, role } = body

    // 유효성 검증
    const errors: Array<{ field: string; code: string; message: string }> = []

    if (!email) {
      errors.push({
        field: 'email',
        code: 'required',
        message: 'email is required',
      })
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({
        field: 'email',
        code: 'invalid',
        message: 'email must be a valid email address',
      })
    }

    if (!role) {
      errors.push({
        field: 'role',
        code: 'required',
        message: 'role is required',
      })
    } else if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
      errors.push({
        field: 'role',
        code: 'invalid',
        message: 'role must be one of: owner, admin, member, viewer',
      })
    }

    if (errors.length > 0) {
      return createValidationErrorResponse(
        '요청 데이터가 유효하지 않습니다.',
        `/teams/${teamId}/members`,
        errors,
        req
      )
    }

    // 팀 조회
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '팀을 찾을 수 없습니다.',
        `/teams/${teamId}/members`,
        404,
        undefined,
        req
      )
    }

    // 권한 확인 (teams:invite 권한 필요)
    const { data: canInvite, error: permError } = await supabase
      .rpc('check_permission', {
        p_user_id: userId,
        p_organization_id: team.organization_id,
        p_resource: 'teams',
        p_action: 'invite',
      })

    if (permError || !canInvite) {
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        '멤버를 초대할 권한이 없습니다.',
        `/teams/${teamId}/members`,
        undefined,
        undefined,
        req
      )
    }

    // 사용자 조회 (이메일로)
    const { data: invitedUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!invitedUser) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '해당 이메일의 사용자를 찾을 수 없습니다.',
        `/teams/${teamId}/members`,
        404,
        undefined,
        req
      )
    }

    // 이미 멤버인지 확인
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', invitedUser.id)
      .single()

    if (existingMember) {
      return createErrorResponse(
        'RESOURCE_CONFLICT',
        '이미 팀 멤버입니다.',
        `/teams/${teamId}/members`,
        409,
        undefined,
        req
      )
    }

    // 멤버 추가
    const { data: member, error: insertError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: invitedUser.id,
        role,
        invited_by: userId,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Invite team member error:', insertError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '멤버 초대 중 오류가 발생했습니다.',
        `/teams/${teamId}/members`,
        undefined,
        undefined,
        req
      )
    }

    // 감사 로그 기록
    await logAuditEvent(
      supabase,
      'team.member.invite',
      userId,
      userEmail,
      'team_member',
      member.id,
      'create',
      team.organization_id,
      { after: member }
    )

    return createdResponse(member, requestId, req)
  } catch (error) {
    console.error('Invite team member error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '멤버 초대 중 오류가 발생했습니다.',
      `/teams/${teamId}/members`,
      undefined,
      undefined,
      req
    )
  }
}

/**
 * PUT /teams/:id/members/:user_id - 멤버 역할 변경
 */
async function handleUpdateTeamMemberRole(
  currentUserId: string,
  currentUserEmail: string | undefined,
  teamId: string,
  targetUserId: string,
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    const body: UpdateMemberRoleRequest = await req.json()
    const { role } = body

    // 유효성 검증
    const errors: Array<{ field: string; code: string; message: string }> = []

    if (!role) {
      errors.push({
        field: 'role',
        code: 'required',
        message: 'role is required',
      })
    } else if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
      errors.push({
        field: 'role',
        code: 'invalid',
        message: 'role must be one of: owner, admin, member, viewer',
      })
    }

    if (errors.length > 0) {
      return createValidationErrorResponse(
        '요청 데이터가 유효하지 않습니다.',
        `/teams/${teamId}/members/${targetUserId}`,
        errors,
        req
      )
    }

    // 팀 조회
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '팀을 찾을 수 없습니다.',
        `/teams/${teamId}/members/${targetUserId}`,
        404,
        undefined,
        req
      )
    }

    // 권한 확인 (teams:invite 권한 필요 - 멤버 관리 권한)
    const { data: canManage, error: permError } = await supabase
      .rpc('check_permission', {
        p_user_id: currentUserId,
        p_organization_id: team.organization_id,
        p_resource: 'teams',
        p_action: 'invite',
      })

    if (permError || !canManage) {
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        '멤버 역할을 변경할 권한이 없습니다.',
        `/teams/${teamId}/members/${targetUserId}`,
        undefined,
        undefined,
        req
      )
    }

    // 기존 멤버 조회
    const { data: existingMember, error: fetchError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)
      .single()

    if (fetchError || !existingMember) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '멤버를 찾을 수 없습니다.',
        `/teams/${teamId}/members/${targetUserId}`,
        404,
        undefined,
        req
      )
    }

    // owner 역할 변경 방지
    if (existingMember.role === 'owner') {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Owner 역할은 변경할 수 없습니다.',
        `/teams/${teamId}/members/${targetUserId}`,
        400,
        undefined,
        req
      )
    }

    // 역할 변경
    const { data: updatedMember, error: updateError } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', existingMember.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update team member role error:', updateError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '멤버 역할 변경 중 오류가 발생했습니다.',
        `/teams/${teamId}/members/${targetUserId}`,
        undefined,
        undefined,
        req
      )
    }

    // 감사 로그 기록
    await logAuditEvent(
      supabase,
      'team.member.update',
      currentUserId,
      currentUserEmail,
      'team_member',
      existingMember.id,
      'update',
      team.organization_id,
      { before: existingMember, after: updatedMember }
    )

    return successResponse(updatedMember, requestId, req)
  } catch (error) {
    console.error('Update team member role error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '멤버 역할 변경 중 오류가 발생했습니다.',
      `/teams/${teamId}/members/${targetUserId}`,
      undefined,
      undefined,
      req
    )
  }
}

/**
 * DELETE /teams/:id/members/:user_id - 멤버 제거
 */
async function handleRemoveTeamMember(
  currentUserId: string,
  currentUserEmail: string | undefined,
  teamId: string,
  targetUserId: string,
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  request: Request
): Promise<Response> {
  try {
    // 팀 조회
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '팀을 찾을 수 없습니다.',
        `/teams/${teamId}/members/${targetUserId}`,
        404,
        undefined,
        request
      )
    }

    // 권한 확인 (teams:remove 권한 필요)
    const { data: canRemove, error: permError } = await supabase
      .rpc('check_permission', {
        p_user_id: currentUserId,
        p_organization_id: team.organization_id,
        p_resource: 'teams',
        p_action: 'remove',
      })

    if (permError || !canRemove) {
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        '멤버를 제거할 권한이 없습니다.',
        `/teams/${teamId}/members/${targetUserId}`,
        undefined,
        undefined,
        request
      )
    }

    // 기존 멤버 조회
    const { data: existingMember, error: fetchError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)
      .single()

    if (fetchError || !existingMember) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '멤버를 찾을 수 없습니다.',
        `/teams/${teamId}/members/${targetUserId}`,
        404,
        undefined,
        request
      )
    }

    // owner 역할 제거 방지 (RLS 정책에서도 방지되지만 명시적으로 확인)
    if (existingMember.role === 'owner') {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Owner 역할은 제거할 수 없습니다.',
        `/teams/${teamId}/members/${targetUserId}`,
        400,
        undefined,
        request
      )
    }

    // 멤버 제거
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', existingMember.id)

    if (deleteError) {
      console.error('Remove team member error:', deleteError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '멤버 제거 중 오류가 발생했습니다.',
        `/teams/${teamId}/members/${targetUserId}`,
        undefined,
        undefined,
        request
      )
    }

    // 감사 로그 기록
    await logAuditEvent(
      supabase,
      'team.member.remove',
      currentUserId,
      currentUserEmail,
      'team_member',
      existingMember.id,
      'delete',
      team.organization_id,
      { before: existingMember }
    )

    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request.headers.get('origin')),
    })
  } catch (error) {
    console.error('Remove team member error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '멤버 제거 중 오류가 발생했습니다.',
      `/teams/${teamId}/members/${targetUserId}`,
      undefined,
      undefined,
      request
    )
  }
}

// ============================================================================
// 핸들러 함수 - 초대 관리
// ============================================================================

/**
 * POST /teams/:id/invitations - 초대 생성
 */
async function handleCreateInvitation(
  userId: string,
  userEmail: string | undefined,
  teamId: string,
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    const body: CreateInvitationRequest = await req.json()
    const { email, role, expires_in_hours = 72 } = body

    // 유효성 검증
    const errors: Array<{ field: string; code: string; message: string }> = []

    if (!email) {
      errors.push({
        field: 'email',
        code: 'required',
        message: 'email is required',
      })
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({
        field: 'email',
        code: 'invalid',
        message: 'email must be a valid email address',
      })
    }

    if (!role) {
      errors.push({
        field: 'role',
        code: 'required',
        message: 'role is required',
      })
    } else if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
      errors.push({
        field: 'role',
        code: 'invalid',
        message: 'role must be one of: owner, admin, member, viewer',
      })
    }

    if (errors.length > 0) {
      return createValidationErrorResponse(
        '요청 데이터가 유효하지 않습니다.',
        `/teams/${teamId}/invitations`,
        errors,
        req
      )
    }

    // 팀 조회
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '팀을 찾을 수 없습니다.',
        `/teams/${teamId}/invitations`,
        404,
        undefined,
        req
      )
    }

    // 권한 확인 (teams:invite 권한 필요)
    const { data: canInvite, error: permError } = await supabase
      .rpc('check_permission', {
        p_user_id: userId,
        p_organization_id: team.organization_id,
        p_resource: 'teams',
        p_action: 'invite',
      })

    if (permError || !canInvite) {
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        '초대를 생성할 권한이 없습니다.',
        `/teams/${teamId}/invitations`,
        undefined,
        undefined,
        req
      )
    }

    // 초대 토큰 생성
    const { data: token } = await supabase.rpc('generate_invitation_token')

    // 만료 시간 계산
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expires_in_hours)

    // 초대 생성
    const { data: invitation, error: insertError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email,
        role,
        token: token || crypto.randomUUID(),
        invited_by: userId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Create invitation error:', insertError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '초대 생성 중 오류가 발생했습니다.',
        `/teams/${teamId}/invitations`,
        undefined,
        undefined,
        req
      )
    }

    // 감사 로그 기록
    await logAuditEvent(
      supabase,
      'team.invitation.create',
      userId,
      userEmail,
      'team_invitation',
      invitation.id,
      'create',
      team.organization_id,
      { after: invitation }
    )

    return createdResponse(invitation, requestId, req)
  } catch (error) {
    console.error('Create invitation error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '초대 생성 중 오류가 발생했습니다.',
      `/teams/${teamId}/invitations`,
      undefined,
      undefined,
      req
    )
  }
}

/**
 * GET /invitations/:token - 초대 정보 조회
 */
async function handleGetInvitation(
  token: string,
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  request: Request
): Promise<Response> {
  try {
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .select('*, teams(*)')
      .eq('token', token)
      .single()

    if (error || !invitation) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '초대를 찾을 수 없습니다.',
        `/invitations/${token}`,
        404,
        undefined,
        request
      )
    }

    // 만료 여부 확인
    const expiresAt = new Date(invitation.expires_at)
    if (expiresAt < new Date()) {
      return createErrorResponse(
        'INVALID_REQUEST',
        '초대가 만료되었습니다.',
        `/invitations/${token}`,
        400,
        undefined,
        request
      )
    }

    // 이미 수락된 초대인지 확인
    if (invitation.accepted_at) {
      return createErrorResponse(
        'INVALID_REQUEST',
        '이미 수락된 초대입니다.',
        `/invitations/${token}`,
        400,
        undefined,
        request
      )
    }

    return successResponse(invitation, requestId, request)
  } catch (error) {
    console.error('Get invitation error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '초대 조회 중 오류가 발생했습니다.',
      `/invitations/${token}`,
      undefined,
      undefined,
      request
    )
  }
}

/**
 * POST /invitations/:token/accept - 초대 수락
 */
async function handleAcceptInvitation(
  userId: string,
  userEmail: string | undefined,
  token: string,
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  request: Request
): Promise<Response> {
  try {
    // 초대 조회
    const { data: invitation, error: fetchError } = await supabase
      .from('team_invitations')
      .select('*, teams(*)')
      .eq('token', token)
      .single()

    if (fetchError || !invitation) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        '초대를 찾을 수 없습니다.',
        `/invitations/${token}/accept`,
        404,
        undefined,
        request
      )
    }

    // 만료 여부 확인
    const expiresAt = new Date(invitation.expires_at)
    if (expiresAt < new Date()) {
      return createErrorResponse(
        'INVALID_REQUEST',
        '초대가 만료되었습니다.',
        `/invitations/${token}/accept`,
        400,
        undefined,
        request
      )
    }

    // 이미 수락된 초대인지 확인
    if (invitation.accepted_at) {
      return createErrorResponse(
        'INVALID_REQUEST',
        '이미 수락된 초대입니다.',
        `/invitations/${token}/accept`,
        400,
        undefined,
        request
      )
    }

    // 이메일 일치 확인
    if (userEmail !== invitation.email) {
      return createErrorResponse(
        'INVALID_REQUEST',
        '초대된 이메일과 일치하지 않습니다.',
        `/invitations/${token}/accept`,
        400,
        undefined,
        request
      )
    }

    // 이미 멤버인지 확인
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', invitation.team_id)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      return createErrorResponse(
        'RESOURCE_CONFLICT',
        '이미 팀 멤버입니다.',
        `/invitations/${token}/accept`,
        409,
        undefined,
        request
      )
    }

    // 초대 수락 처리
    const now = new Date().toISOString()

    // 1. 멤버 추가
    const { data: member, error: insertError } = await supabase
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: userId,
        role: invitation.role,
        invited_by: invitation.invited_by,
        joined_at: now,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Accept invitation error (insert member):', insertError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '초대 수락 중 오류가 발생했습니다.',
        `/invitations/${token}/accept`,
        undefined,
        undefined,
        request
      )
    }

    // 2. 초대 상태 업데이트
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({ accepted_at: now })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Accept invitation error (update invitation):', updateError)
      // 멤버는 이미 추가되었으므로 로그만 남기고 계속 진행
    }

    // 감사 로그 기록
    await logAuditEvent(
      supabase,
      'team.invitation.accept',
      userId,
      userEmail,
      'team_invitation',
      invitation.id,
      'update',
      invitation.teams.organization_id,
      { after: { ...invitation, accepted_at: now } }
    )

    return successResponse(
      {
        message: '초대를 수락했습니다.',
        member,
      },
      requestId,
      request
    )
  } catch (error) {
    console.error('Accept invitation error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '초대 수락 중 오류가 발생했습니다.',
      `/invitations/${token}/accept`,
      undefined,
      undefined,
      request
    )
  }
}

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = req.headers.get('x-request-id') || generateUUID()

  // 인증 토큰 검증
  const token = extractBearerToken(req.headers.get('authorization'))
  if (!token) {
    return createErrorResponse(
      'UNAUTHORIZED',
      'Authorization 헤더가 필요합니다.',
      req.url,
      undefined,
      undefined,
      req
    )
  }

  // Supabase 클라이언트 생성
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return createErrorResponse(
      'INTERNAL_ERROR',
      '서버 설정 오류입니다.',
      req.url,
      undefined,
      undefined,
      req
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Supabase Auth 토큰 검증
  const authResult = await verifySupabaseAuth(token, supabase)
  if (!authResult.valid || !authResult.userId) {
    return createErrorResponse(
      'UNAUTHORIZED',
      '유효하지 않은 토큰입니다.',
      req.url,
      undefined,
      undefined,
      req
    )
  }

  const userId = authResult.userId
  const userEmail = authResult.email

  // URL 파싱
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)

  try {
    // POST /teams
    if (req.method === 'POST' && pathParts.length === 1 && pathParts[0] === 'teams') {
      return await handleCreateTeam(userId, userEmail, req, supabase, requestId)
    }

    // GET /teams
    if (req.method === 'GET' && pathParts.length === 1 && pathParts[0] === 'teams') {
      return await handleGetTeams(userId, url, supabase, requestId, req)
    }

    // GET /teams/:id
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[0] === 'teams') {
      const teamId = pathParts[1]
      return await handleGetTeam(userId, teamId, supabase, requestId, req)
    }

    // PUT /teams/:id
    if (req.method === 'PUT' && pathParts.length === 2 && pathParts[0] === 'teams') {
      const teamId = pathParts[1]
      return await handleUpdateTeam(userId, userEmail, teamId, req, supabase, requestId)
    }

    // DELETE /teams/:id
    if (req.method === 'DELETE' && pathParts.length === 2 && pathParts[0] === 'teams') {
      const teamId = pathParts[1]
      return await handleDeleteTeam(userId, userEmail, teamId, supabase, requestId, req)
    }

    // GET /teams/:id/members
    if (req.method === 'GET' && pathParts.length === 3 && pathParts[0] === 'teams' && pathParts[2] === 'members') {
      const teamId = pathParts[1]
      return await handleGetTeamMembers(userId, teamId, supabase, requestId, req)
    }

    // POST /teams/:id/members
    if (req.method === 'POST' && pathParts.length === 3 && pathParts[0] === 'teams' && pathParts[2] === 'members') {
      const teamId = pathParts[1]
      return await handleInviteTeamMember(userId, userEmail, teamId, req, supabase, requestId)
    }

    // PUT /teams/:id/members/:user_id
    if (req.method === 'PUT' && pathParts.length === 4 && pathParts[0] === 'teams' && pathParts[2] === 'members') {
      const teamId = pathParts[1]
      const targetUserId = pathParts[3]
      return await handleUpdateTeamMemberRole(userId, userEmail, teamId, targetUserId, req, supabase, requestId)
    }

    // DELETE /teams/:id/members/:user_id
    if (req.method === 'DELETE' && pathParts.length === 4 && pathParts[0] === 'teams' && pathParts[2] === 'members') {
      const teamId = pathParts[1]
      const targetUserId = pathParts[3]
      return await handleRemoveTeamMember(userId, userEmail, teamId, targetUserId, supabase, requestId, req)
    }

    // POST /teams/:id/invitations
    if (req.method === 'POST' && pathParts.length === 3 && pathParts[0] === 'teams' && pathParts[2] === 'invitations') {
      const teamId = pathParts[1]
      return await handleCreateInvitation(userId, userEmail, teamId, req, supabase, requestId)
    }

    // GET /invitations/:token
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[0] === 'invitations') {
      const token = pathParts[1]
      return await handleGetInvitation(token, supabase, requestId, req)
    }

    // POST /invitations/:token/accept
    if (req.method === 'POST' && pathParts.length === 3 && pathParts[0] === 'invitations' && pathParts[2] === 'accept') {
      const token = pathParts[1]
      return await handleAcceptInvitation(userId, userEmail, token, supabase, requestId, req)
    }

    // 지원하지 않는 엔드포인트
    return createErrorResponse(
      'RESOURCE_NOT_FOUND',
      '요청한 엔드포인트를 찾을 수 없습니다.',
      req.url,
      undefined,
      undefined,
      req
    )
  } catch (error) {
    console.error('Unhandled error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      '서버 내부 오류가 발생했습니다.',
      req.url,
      undefined,
      undefined,
      req
    )
  }
})
