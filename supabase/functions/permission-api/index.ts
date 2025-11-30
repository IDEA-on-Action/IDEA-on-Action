/**
 * Permission API Edge Function
 *
 * RBAC (역할 기반 접근 제어) API
 *
 * @endpoint GET /permissions/check - 권한 확인
 * @endpoint GET /roles - 역할 목록 조회
 * @endpoint POST /roles/assign - 역할 할당
 * @endpoint DELETE /roles/:user_id - 역할 제거
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

type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

interface CheckPermissionRequest {
  organization_id: string
  resource: string
  action: string
}

interface CheckPermissionResponse {
  allowed: boolean
  role: UserRole | null
  organization_id: string
  resource: string
  action: string
}

interface RoleInfo {
  role: UserRole
  permissions: Record<string, string[]>
  description: string
}

interface AssignRoleRequest {
  user_id: string
  organization_id: string
  role: UserRole
}

interface AssignRoleResponse {
  success: boolean
  user_id: string
  organization_id: string
  role: UserRole
  invited_by: string
}

interface RemoveRoleResponse {
  success: boolean
  user_id: string
  organization_id: string
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

// ============================================================================
// 핸들러 함수
// ============================================================================

/**
 * GET /permissions/check - 권한 확인
 *
 * Query Parameters:
 *   - organization_id: 조직 ID (required)
 *   - resource: 리소스 이름 (required)
 *   - action: 액션 이름 (required)
 */
async function handleCheckPermission(
  userId: string,
  url: URL,
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  request: Request
): Promise<Response> {
  const organizationId = url.searchParams.get('organization_id')
  const resource = url.searchParams.get('resource')
  const action = url.searchParams.get('action')

  // 유효성 검증
  const errors: Array<{ field: string; code: string; message: string }> = []

  if (!organizationId) {
    errors.push({
      field: 'organization_id',
      code: 'required',
      message: 'organization_id is required',
    })
  }

  if (!resource) {
    errors.push({
      field: 'resource',
      code: 'required',
      message: 'resource is required',
    })
  }

  if (!action) {
    errors.push({
      field: 'action',
      code: 'required',
      message: 'action is required',
    })
  }

  if (errors.length > 0) {
    return createValidationErrorResponse(
      '필수 파라미터가 누락되었습니다.',
      '/permissions/check',
      errors,
      request
    )
  }

  try {
    // 1. 사용자 역할 조회
    const { data: roleData, error: roleError } = await supabase
      .rpc('get_user_role', {
        p_user_id: userId,
        p_organization_id: organizationId,
      })

    if (roleError) {
      console.error('Get user role error:', roleError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '역할 조회 중 오류가 발생했습니다.',
        '/permissions/check',
        undefined,
        undefined,
        request
      )
    }

    const userRole = roleData as UserRole | null

    // 2. 권한 확인
    const { data: allowed, error: permError } = await supabase
      .rpc('check_permission', {
        p_user_id: userId,
        p_organization_id: organizationId,
        p_resource: resource,
        p_action: action,
      })

    if (permError) {
      console.error('Check permission error:', permError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '권한 확인 중 오류가 발생했습니다.',
        '/permissions/check',
        undefined,
        undefined,
        request
      )
    }

    const response: CheckPermissionResponse = {
      allowed: Boolean(allowed),
      role: userRole,
      organization_id: organizationId!,
      resource: resource!,
      action: action!,
    }

    return successResponse(response, requestId, request)
  } catch (error) {
    console.error('Check permission error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '권한 확인 중 오류가 발생했습니다.',
      '/permissions/check',
      undefined,
      undefined,
      request
    )
  }
}

/**
 * GET /roles - 역할 목록 조회
 */
async function handleGetRoles(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  request: Request
): Promise<Response> {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('role, permissions')
      .order('role')

    if (error) {
      console.error('Get roles error:', error)
      return createErrorResponse(
        'DATABASE_ERROR',
        '역할 목록 조회 중 오류가 발생했습니다.',
        '/roles',
        undefined,
        undefined,
        request
      )
    }

    // 역할 설명 추가
    const roleDescriptions: Record<UserRole, string> = {
      owner: '모든 권한 + 조직 삭제 + 결제 관리',
      admin: '모든 기능 + 멤버 관리',
      member: '구독 플랜 범위 내 기능',
      viewer: '읽기 전용',
    }

    const roles: RoleInfo[] = (data || []).map((r) => ({
      role: r.role as UserRole,
      permissions: r.permissions as Record<string, string[]>,
      description: roleDescriptions[r.role as UserRole] || '',
    }))

    return successResponse(roles, requestId, request)
  } catch (error) {
    console.error('Get roles error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '역할 목록 조회 중 오류가 발생했습니다.',
      '/roles',
      undefined,
      undefined,
      request
    )
  }
}

/**
 * POST /roles/assign - 역할 할당
 */
async function handleAssignRole(
  currentUserId: string,
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  try {
    const body: AssignRoleRequest = await req.json()
    const { user_id, organization_id, role } = body

    // 유효성 검증
    const errors: Array<{ field: string; code: string; message: string }> = []

    if (!user_id) {
      errors.push({
        field: 'user_id',
        code: 'required',
        message: 'user_id is required',
      })
    }

    if (!organization_id) {
      errors.push({
        field: 'organization_id',
        code: 'required',
        message: 'organization_id is required',
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
        '/roles/assign',
        errors,
        req
      )
    }

    // 권한 확인 (users:invite 권한 필요)
    const { data: canInvite, error: permError } = await supabase
      .rpc('check_permission', {
        p_user_id: currentUserId,
        p_organization_id: organization_id,
        p_resource: 'users',
        p_action: 'invite',
      })

    if (permError || !canInvite) {
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        '멤버를 초대할 권한이 없습니다.',
        '/roles/assign',
        undefined,
        undefined,
        req
      )
    }

    // 역할 할당 (UPSERT)
    const { error: insertError } = await supabase
      .from('organization_members')
      .upsert(
        {
          user_id,
          organization_id,
          role,
          invited_by: currentUserId,
        },
        {
          onConflict: 'organization_id,user_id',
        }
      )

    if (insertError) {
      console.error('Assign role error:', insertError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '역할 할당 중 오류가 발생했습니다.',
        '/roles/assign',
        undefined,
        undefined,
        req
      )
    }

    const response: AssignRoleResponse = {
      success: true,
      user_id,
      organization_id,
      role,
      invited_by: currentUserId,
    }

    return successResponse(response, requestId, req)
  } catch (error) {
    console.error('Assign role error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '역할 할당 중 오류가 발생했습니다.',
      '/roles/assign',
      undefined,
      undefined,
      req
    )
  }
}

/**
 * DELETE /roles/:user_id - 역할 제거
 *
 * Query Parameters:
 *   - organization_id: 조직 ID (required)
 */
async function handleRemoveRole(
  currentUserId: string,
  targetUserId: string,
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
      `/roles/${targetUserId}`,
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
    // 권한 확인 (users:remove 권한 필요)
    const { data: canRemove, error: permError } = await supabase
      .rpc('check_permission', {
        p_user_id: currentUserId,
        p_organization_id: organizationId,
        p_resource: 'users',
        p_action: 'remove',
      })

    if (permError || !canRemove) {
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        '멤버를 제거할 권한이 없습니다.',
        `/roles/${targetUserId}`,
        undefined,
        undefined,
        request
      )
    }

    // Owner 역할은 제거 불가 (RLS 정책에서도 방지되지만 명시적으로 확인)
    const { data: roleData } = await supabase
      .rpc('get_user_role', {
        p_user_id: targetUserId,
        p_organization_id: organizationId,
      })

    if (roleData === 'owner') {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Owner 역할은 제거할 수 없습니다.',
        `/roles/${targetUserId}`,
        400,
        undefined,
        request
      )
    }

    // 역할 제거
    const { error: deleteError } = await supabase
      .from('organization_members')
      .delete()
      .eq('user_id', targetUserId)
      .eq('organization_id', organizationId)

    if (deleteError) {
      console.error('Remove role error:', deleteError)
      return createErrorResponse(
        'DATABASE_ERROR',
        '역할 제거 중 오류가 발생했습니다.',
        `/roles/${targetUserId}`,
        undefined,
        undefined,
        request
      )
    }

    const response: RemoveRoleResponse = {
      success: true,
      user_id: targetUserId,
      organization_id: organizationId,
    }

    return successResponse(response, requestId, request)
  } catch (error) {
    console.error('Remove role error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '역할 제거 중 오류가 발생했습니다.',
      `/roles/${targetUserId}`,
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

  // URL 파싱
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)

  try {
    // GET /permissions/check
    if (req.method === 'GET' && pathParts.includes('permissions') && pathParts.includes('check')) {
      return await handleCheckPermission(userId, url, supabase, requestId, req)
    }

    // GET /roles
    if (req.method === 'GET' && pathParts[pathParts.length - 1] === 'roles') {
      return await handleGetRoles(supabase, requestId, req)
    }

    // POST /roles/assign
    if (req.method === 'POST' && pathParts.includes('roles') && pathParts.includes('assign')) {
      return await handleAssignRole(userId, req, supabase, requestId)
    }

    // DELETE /roles/:user_id
    if (req.method === 'DELETE' && pathParts.includes('roles')) {
      const targetUserId = pathParts[pathParts.length - 1]
      if (!targetUserId || targetUserId === 'roles') {
        return createErrorResponse(
          'INVALID_REQUEST',
          'user_id is required in path',
          req.url,
          400,
          undefined,
          req
        )
      }
      return await handleRemoveRole(userId, targetUserId, url, supabase, requestId, req)
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
