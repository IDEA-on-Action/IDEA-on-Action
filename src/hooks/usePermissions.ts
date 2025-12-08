/**
 * usePermissions Hook
 *
 * RBAC 권한 확인 및 역할 관리를 위한 React Hook
 *
 * @module hooks/usePermissions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

// ============================================================================
// 타입 정의
// ============================================================================

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface CheckPermissionParams {
  organizationId: string
  resource: string
  action: string
}

export interface CheckPermissionResponse {
  allowed: boolean
  role: UserRole | null
  organization_id: string
  resource: string
  action: string
}

export interface RoleInfo {
  role: UserRole
  permissions: Record<string, string[]>
  description: string
}

export interface AssignRoleParams {
  userId: string
  organizationId: string
  role: UserRole
}

export interface RemoveRoleParams {
  userId: string
  organizationId: string
}

// ============================================================================
// Query Keys
// ============================================================================

const QUERY_KEYS = {
  permission: (params: CheckPermissionParams) => ['permission', params] as const,
  userRole: (userId: string | undefined, organizationId: string | undefined) =>
    ['userRole', userId, organizationId] as const,
  roles: ['roles'] as const,
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 권한 확인 Hook
 *
 * @param resource - 리소스 이름 (예: 'content', 'users', 'services')
 * @param action - 액션 이름 (예: 'read', 'create', 'update', 'delete')
 * @param organizationId - 조직 ID
 * @returns 권한 확인 결과
 *
 * @example
 * ```tsx
 * const { data, isLoading } = usePermissions('content', 'create', orgId)
 * if (data?.allowed) {
 *   // 권한 있음
 * }
 * ```
 */
export function usePermissions(
  resource: string,
  action: string,
  organizationId?: string
) {
  const { user } = useAuth()

  return useQuery({
    queryKey: QUERY_KEYS.permission({ organizationId: organizationId || '', resource, action }),
    queryFn: async () => {
      if (!organizationId || !user?.id) {
        return null
      }

      const { data, error } = await supabase.rpc('check_permission', {
        p_user_id: user.id,
        p_organization_id: organizationId,
        p_resource: resource,
        p_action: action,
      })

      if (error) {
        console.error('Check permission error:', error)
        throw error
      }

      // 역할도 함께 조회
      const { data: roleData } = await supabase.rpc('get_user_role', {
        p_user_id: user.id,
        p_organization_id: organizationId,
      })

      const response: CheckPermissionResponse = {
        allowed: Boolean(data),
        role: roleData as UserRole | null,
        organization_id: organizationId,
        resource,
        action,
      }

      return response
    },
    enabled: Boolean(organizationId && user?.id),
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * 사용자 역할 조회 Hook
 *
 * @param organizationId - 조직 ID
 * @param userId - 사용자 ID (생략 시 현재 사용자)
 * @returns 사용자 역할
 *
 * @example
 * ```tsx
 * const { data: role, isLoading } = useUserRole(orgId)
 * if (role === 'admin') {
 *   // 관리자
 * }
 * ```
 */
export function useUserRole(organizationId?: string, userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  return useQuery({
    queryKey: QUERY_KEYS.userRole(targetUserId, organizationId),
    queryFn: async () => {
      if (!organizationId || !targetUserId) {
        return null
      }

      const { data, error } = await supabase.rpc('get_user_role', {
        p_user_id: targetUserId,
        p_organization_id: organizationId,
      })

      if (error) {
        console.error('Get user role error:', error)
        throw error
      }

      return data as UserRole | null
    },
    enabled: Boolean(organizationId && targetUserId),
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * 역할 목록 조회 Hook
 *
 * @returns 모든 역할의 권한 정보
 *
 * @example
 * ```tsx
 * const { data: roles } = useRoles()
 * roles?.forEach(role => {
 *   console.log(role.role, role.description, role.permissions)
 * })
 * ```
 */
export function useRoles() {
  return useQuery({
    queryKey: QUERY_KEYS.roles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role, permissions')
        .order('role')

      if (error) {
        console.error('Get roles error:', error)
        throw error
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

      return roles
    },
    staleTime: 30 * 60 * 1000, // 30분 (권한 정보는 자주 변하지 않음)
  })
}

/**
 * 역할 할당 Mutation Hook
 *
 * @returns 역할 할당 mutation 함수
 *
 * @example
 * ```tsx
 * const assignRole = useAssignRole()
 * await assignRole.mutateAsync({
 *   userId: 'user-id',
 *   organizationId: 'org-id',
 *   role: 'admin'
 * })
 * ```
 */
export function useAssignRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: AssignRoleParams) => {
      const { userId, organizationId, role } = params

      const { data, error } = await supabase
        .from('organization_members')
        .upsert(
          {
            user_id: userId,
            organization_id: organizationId,
            role,
          },
          {
            onConflict: 'organization_id,user_id',
          }
        )
        .select()
        .single()

      if (error) {
        console.error('Assign role error:', error)
        throw error
      }

      return data
    },
    onSuccess: (_, variables) => {
      // 해당 사용자의 역할 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userRole(variables.userId, variables.organizationId),
      })

      // 권한 캐시도 무효화 (역할 변경으로 인한 권한 변경 가능)
      queryClient.invalidateQueries({
        queryKey: ['permission'],
      })
    },
  })
}

/**
 * 역할 제거 Mutation Hook
 *
 * @returns 역할 제거 mutation 함수
 *
 * @example
 * ```tsx
 * const removeRole = useRemoveRole()
 * await removeRole.mutateAsync({
 *   userId: 'user-id',
 *   organizationId: 'org-id'
 * })
 * ```
 */
export function useRemoveRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: RemoveRoleParams) => {
      const { userId, organizationId } = params

      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('Remove role error:', error)
        throw error
      }

      return { success: true }
    },
    onSuccess: (_, variables) => {
      // 해당 사용자의 역할 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userRole(variables.userId, variables.organizationId),
      })

      // 권한 캐시도 무효화
      queryClient.invalidateQueries({
        queryKey: ['permission'],
      })
    },
  })
}

/**
 * 조직 멤버 목록 조회 Hook
 *
 * @param organizationId - 조직 ID
 * @returns 조직 멤버 목록
 *
 * @example
 * ```tsx
 * const { data: members } = useOrganizationMembers(orgId)
 * members?.forEach(member => {
 *   console.log(member.user_id, member.role)
 * })
 * ```
 */
export function useOrganizationMembers(organizationId?: string) {
  return useQuery({
    queryKey: ['organizationMembers', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return []
      }

      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get organization members error:', error)
        throw error
      }

      return data
    },
    enabled: Boolean(organizationId),
  })
}

/**
 * 특정 리소스/액션에 대한 권한 확인 헬퍼 Hook
 *
 * @param resource - 리소스 이름
 * @param action - 액션 이름
 * @param organizationId - 조직 ID
 * @returns 권한 여부 (boolean)
 *
 * @example
 * ```tsx
 * const canCreateContent = useHasPermission('content', 'create', orgId)
 * if (canCreateContent) {
 *   // 컨텐츠 생성 가능
 * }
 * ```
 */
export function useHasPermission(
  resource: string,
  action: string,
  organizationId?: string
): boolean {
  const { data } = usePermissions(resource, action, organizationId)
  return data?.allowed || false
}

/**
 * 특정 역할인지 확인하는 헬퍼 Hook
 *
 * @param role - 확인할 역할
 * @param organizationId - 조직 ID
 * @returns 해당 역할 여부 (boolean)
 *
 * @example
 * ```tsx
 * const isAdmin = useIsRole('admin', orgId)
 * if (isAdmin) {
 *   // 관리자
 * }
 * ```
 */
export function useIsRole(role: UserRole, organizationId?: string): boolean {
  const { data: currentRole } = useUserRole(organizationId)
  return currentRole === role
}

/**
 * Owner 또는 Admin 역할인지 확인하는 헬퍼 Hook
 *
 * @param organizationId - 조직 ID
 * @returns Owner 또는 Admin 여부 (boolean)
 *
 * @example
 * ```tsx
 * const isAdminOrOwner = useIsAdminOrOwner(orgId)
 * if (isAdminOrOwner) {
 *   // 관리자급 권한
 * }
 * ```
 */
export function useIsAdminOrOwner(organizationId?: string): boolean {
  const { data: role } = useUserRole(organizationId)
  return role === 'owner' || role === 'admin'
}

// ============================================================================
// v2.36.0 Sprint 2: 향상된 권한 관리 Hook
// ============================================================================

/**
 * Minu 서비스 타입 (MinuService)
 */
export type MinuService = 'find' | 'frame' | 'build' | 'keep'

/**
 * 향상된 권한 관리 Hook
 *
 * v2.36.0에서 추가된 통합 권한 관리 인터페이스
 * - checkPermission: 리소스/액션 권한 확인
 * - getUserRole: 사용자 역할 조회
 * - canAccessService: 서비스 접근 권한 확인
 *
 * @param organizationId - 조직 ID (선택)
 * @returns 통합 권한 관리 인터페이스
 *
 * @example
 * ```tsx
 * function ProjectDashboard() {
 *   const { checkPermission, getUserRole, canAccessService, isLoading } = usePermissionsV2({
 *     organizationId: currentOrgId
 *   });
 *
 *   const canEdit = checkPermission('projects', 'write');
 *   const role = getUserRole();
 *   const hasMinuFind = canAccessService('find');
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <div>
 *       {canEdit && <EditButton />}
 *       {role === 'admin' && <AdminPanel />}
 *       {hasMinuFind && <MinuFindWidget />}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePermissionsV2(options: { organizationId?: string } = {}) {
  const { organizationId } = options
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // 사용자 역할 조회
  const { data: userRole, isLoading: isLoadingRole, error: roleError } = useUserRole(organizationId)

  // 역할 권한 매핑 조회
  const { data: roles, isLoading: isLoadingRoles } = useRoles()

  // 서비스 접근 권한 조회 (React Query 캐싱)
  const serviceAccessQuery = useQuery({
    queryKey: ['serviceAccess', user?.id],
    queryFn: async () => {
      if (!user?.id) return {}

      // 모든 서비스에 대한 구독 정보 조회
      const services: MinuService[] = ['find', 'frame', 'build', 'keep']
      const accessMap: Record<string, boolean> = {}

      for (const service of services) {
        const { data: serviceData } = await supabase
          .from('services')
          .select('id')
          .eq('slug', service)
          .maybeSingle()

        if (!serviceData) {
          accessMap[service] = false
          continue
        }

        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('user_id', user.id)
          .eq('service_id', serviceData.id)
          .maybeSingle()

        if (!subscriptionData) {
          accessMap[service] = false
          continue
        }

        const isActive = ['trial', 'active'].includes(subscriptionData.status)
        const isExpired = new Date(subscriptionData.current_period_end) < new Date()

        accessMap[service] = isActive && !isExpired
      }

      return accessMap
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
    gcTime: 10 * 60 * 1000,
  })

  /**
   * 리소스/액션 권한 확인
   */
  const checkPermission = (resource: string, action: string): boolean => {
    if (!userRole || !roles) return false

    const roleInfo = roles.find((r) => r.role === userRole)
    if (!roleInfo) return false

    const resourcePerms = roleInfo.permissions[resource]
    if (!resourcePerms) return false

    return resourcePerms.includes(action)
  }

  /**
   * 사용자 역할 조회
   */
  const getUserRole = (): UserRole | null => {
    return userRole || null
  }

  /**
   * 서비스 접근 가능 여부
   */
  const canAccessService = (service: MinuService): boolean => {
    const accessMap = serviceAccessQuery.data || {}
    return accessMap[service] || false
  }

  return {
    checkPermission,
    getUserRole,
    canAccessService,
    isLoading: isLoadingRole || isLoadingRoles || serviceAccessQuery.isLoading,
    error: roleError || serviceAccessQuery.error,
  }
}
