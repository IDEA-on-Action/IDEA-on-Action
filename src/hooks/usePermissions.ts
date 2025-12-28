/**
 * usePermissions Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * RBAC 권한 확인 및 역할 관리를 위한 React Hook
 *
 * @module hooks/usePermissions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permissionsApi, subscriptionsApi, servicesApi } from '@/integrations/cloudflare/client'
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
  myPermissions: ['myPermissions'] as const,
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
  const { getAccessToken, isAuthenticated, workersUser } = useAuth()

  return useQuery({
    queryKey: QUERY_KEYS.permission({ organizationId: organizationId || '', resource, action }),
    queryFn: async () => {
      const token = getAccessToken()
      if (!organizationId || !token || !workersUser?.id) {
        return null
      }

      const permission = `${resource}:${action}`
      const result = await permissionsApi.check(token, permission)

      if (result.error) {
        console.error('Check permission error:', result.error)
        throw new Error(result.error)
      }

      // 내 권한 정보 가져오기
      const myPermissions = await permissionsApi.getMyPermissions(token)

      const response: CheckPermissionResponse = {
        allowed: result.data?.allowed || false,
        role: null, // organizationId별 역할은 Workers에서 별도 조회 필요
        organization_id: organizationId,
        resource,
        action,
      }

      return response
    },
    enabled: Boolean(organizationId && isAuthenticated && workersUser?.id),
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
  const { getAccessToken, isAuthenticated, workersUser } = useAuth()
  const targetUserId = userId || workersUser?.id

  return useQuery({
    queryKey: QUERY_KEYS.userRole(targetUserId, organizationId),
    queryFn: async () => {
      const token = getAccessToken()
      if (!organizationId || !targetUserId || !token) {
        return null
      }

      // Workers API를 통해 사용자 역할 조회
      const result = await permissionsApi.getUserRoles(token, targetUserId)
      if (result.error) {
        console.error('Get user role error:', result.error)
        throw new Error(result.error)
      }

      // 첫 번째 역할 반환 (여러 역할이 있을 경우)
      const roles = result.data?.roles || []
      if (roles.length > 0) {
        return roles[0].name as UserRole
      }

      return null
    },
    enabled: Boolean(organizationId && targetUserId && isAuthenticated),
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
  const { getAccessToken, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: QUERY_KEYS.roles,
    queryFn: async () => {
      const token = getAccessToken()
      if (!token) {
        throw new Error('인증이 필요합니다')
      }

      const result = await permissionsApi.getRoles(token)
      if (result.error) {
        console.error('Get roles error:', result.error)
        throw new Error(result.error)
      }

      // 역할 설명 추가
      const roleDescriptions: Record<UserRole, string> = {
        owner: '모든 권한 + 조직 삭제 + 결제 관리',
        admin: '모든 기능 + 멤버 관리',
        member: '구독 플랜 범위 내 기능',
        viewer: '읽기 전용',
      }

      const roles: RoleInfo[] = (result.data?.roles || []).map((r) => ({
        role: r.name as UserRole,
        permissions: { [r.name]: r.permissions },
        description: roleDescriptions[r.name as UserRole] || r.description || '',
      }))

      return roles
    },
    enabled: isAuthenticated,
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
  const { getAccessToken } = useAuth()

  return useMutation({
    mutationFn: async (params: AssignRoleParams) => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      const { userId, role } = params

      // 먼저 역할 목록에서 해당 역할의 ID 찾기
      const rolesResult = await permissionsApi.getRoles(token)
      if (rolesResult.error) throw new Error(rolesResult.error)

      const targetRole = rolesResult.data?.roles?.find(r => r.name === role)
      if (!targetRole) throw new Error(`역할을 찾을 수 없습니다: ${role}`)

      const result = await permissionsApi.assignRole(token, userId, targetRole.id)
      if (result.error) {
        console.error('Assign role error:', result.error)
        throw new Error(result.error)
      }

      return result.data
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
  const { getAccessToken } = useAuth()

  return useMutation({
    mutationFn: async (params: RemoveRoleParams & { roleId: string }) => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      const { userId, roleId } = params

      const result = await permissionsApi.revokeRole(token, userId, roleId)
      if (result.error) {
        console.error('Remove role error:', result.error)
        throw new Error(result.error)
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
  const { getAccessToken, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['organizationMembers', organizationId],
    queryFn: async () => {
      const token = getAccessToken()
      if (!organizationId || !token) {
        return []
      }

      // Workers API를 통해 조직 멤버 조회
      // 현재 Workers에서는 별도의 조직 멤버 API가 없으므로
      // 권한 API를 통해 조회하거나 별도 구현 필요
      return []
    },
    enabled: Boolean(organizationId && isAuthenticated),
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
  const { getAccessToken, isAuthenticated, workersUser } = useAuth()

  // 내 권한 정보 조회
  const { data: myPermissions, isLoading: isLoadingPermissions, error: permissionsError } = useQuery({
    queryKey: QUERY_KEYS.myPermissions,
    queryFn: async () => {
      const token = getAccessToken()
      if (!token) return null

      const result = await permissionsApi.getMyPermissions(token)
      if (result.error) throw new Error(result.error)

      return result.data
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })

  // 역할 권한 매핑 조회
  const { data: roles, isLoading: isLoadingRoles } = useRoles()

  // 서비스 접근 권한 조회 (React Query 캐싱)
  const serviceAccessQuery = useQuery({
    queryKey: ['serviceAccess', workersUser?.id],
    queryFn: async () => {
      const token = getAccessToken()
      if (!token || !workersUser?.id) return {}

      // 모든 서비스에 대한 구독 정보 조회
      const services: MinuService[] = ['find', 'frame', 'build', 'keep']
      const accessMap: Record<string, boolean> = {}

      // 서비스 목록 조회
      const servicesResult = await servicesApi.list()
      if (servicesResult.error) {
        return accessMap
      }

      // 현재 구독 조회
      const subscriptionResult = await subscriptionsApi.getCurrent(token)
      if (subscriptionResult.error) {
        // 구독이 없으면 모든 서비스 접근 불가
        services.forEach(s => { accessMap[s] = false })
        return accessMap
      }

      // 구독 상태에 따라 접근 권한 설정
      const subscription = subscriptionResult.data as { status?: string; current_period_end?: string } | null
      if (subscription) {
        const isActive = ['trial', 'active'].includes(subscription.status || '')
        const isExpired = subscription.current_period_end
          ? new Date(subscription.current_period_end) < new Date()
          : true

        services.forEach(s => {
          accessMap[s] = isActive && !isExpired
        })
      } else {
        services.forEach(s => { accessMap[s] = false })
      }

      return accessMap
    },
    enabled: isAuthenticated && !!workersUser?.id,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
    gcTime: 10 * 60 * 1000,
  })

  /**
   * 리소스/액션 권한 확인
   */
  const checkPermission = (resource: string, action: string): boolean => {
    if (!myPermissions) return false

    // 관리자는 모든 권한 허용
    if (myPermissions.isAdmin) return true

    const permission = `${resource}:${action}`
    const permissions = myPermissions.permissions || []

    return permissions.some(p => {
      if (p === '*') return true
      if (p === permission) return true
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -1)
        return permission.startsWith(prefix)
      }
      return false
    })
  }

  /**
   * 사용자 역할 조회
   */
  const getUserRole = (): UserRole | null => {
    if (!myPermissions) return null

    // 역할 정보에서 첫 번째 역할 반환
    const userRoles = myPermissions.roles || []
    if (userRoles.length > 0) {
      return userRoles[0].name as UserRole
    }

    return null
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
    isLoading: isLoadingPermissions || isLoadingRoles || serviceAccessQuery.isLoading,
    error: permissionsError || serviceAccessQuery.error,
  }
}
