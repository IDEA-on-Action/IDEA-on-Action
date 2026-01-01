/**
 * useRBAC Hook - Phase 10 Week 3
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permissionsApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/auth/useAuth'
import type { Role, Permission, UserRoleWithDetails } from '@/types/auth/rbac'

const QUERY_KEYS = {
  roles: ['roles'] as const,
  permissions: ['permissions'] as const,
  userRoles: (userId?: string) => ['user_roles', userId] as const,
  userPermissions: (userId?: string) => ['user_permissions', userId] as const,
}

export function useRoles() {
  const { getAccessToken, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: QUERY_KEYS.roles,
    queryFn: async () => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      const result = await permissionsApi.getRoles(token)
      if (result.error) throw new Error(result.error)

      // Workers API 응답을 Role 타입으로 변환
      const roles = (result.data?.roles || []).map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions,
        is_system: r.is_system,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as Role[]

      return roles
    },
    enabled: isAuthenticated,
  })
}

export function usePermissions() {
  const { getAccessToken, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: QUERY_KEYS.permissions,
    queryFn: async () => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      // Workers API에서는 역할 목록을 통해 권한 목록을 추출
      const result = await permissionsApi.getRoles(token)
      if (result.error) throw new Error(result.error)

      // 모든 역할에서 고유한 권한 추출
      const permissionSet = new Set<string>()
      ;(result.data?.roles || []).forEach(role => {
        role.permissions.forEach(p => permissionSet.add(p))
      })

      // Permission 타입으로 변환
      const permissions: Permission[] = Array.from(permissionSet).map((p, index) => {
        const [resource, action] = p.split(':')
        return {
          id: `perm-${index}`,
          name: p,
          resource: resource || p,
          action: action || 'all',
          description: `${resource}에 대한 ${action} 권한`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      })

      return permissions
    },
    enabled: isAuthenticated,
  })
}

export function useUserRoles(userId?: string) {
  const { getAccessToken, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: QUERY_KEYS.userRoles(userId),
    queryFn: async () => {
      const token = getAccessToken()
      if (!token || !userId) throw new Error('인증이 필요합니다')

      const result = await permissionsApi.getUserRoles(token, userId)
      if (result.error) throw new Error(result.error)

      // Workers API 응답을 UserRoleWithDetails 타입으로 변환
      const userRoles = (result.data?.roles || []).map(r => ({
        id: r.id,
        user_id: userId,
        role_id: r.id,
        assigned_by: r.granted_by,
        assigned_at: r.granted_at,
        role: {
          id: r.id,
          name: r.name,
          description: '',
          permissions: r.permissions,
          is_system: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        user: {
          id: userId,
          email: '', // Workers API에서 별도 조회 필요
        },
      })) as UserRoleWithDetails[]

      return userRoles
    },
    enabled: isAuthenticated && !!userId,
  })
}

export function useUserPermissions(userId?: string) {
  const { getAccessToken, isAuthenticated } = useAuth()

  return useQuery({
    queryKey: QUERY_KEYS.userPermissions(userId),
    queryFn: async () => {
      const token = getAccessToken()
      if (!token || !userId) return []

      const result = await permissionsApi.getUserRoles(token, userId)
      if (result.error) throw new Error(result.error)

      // 사용자의 모든 역할에서 권한 추출
      const permissions: Array<{ permission_name: string; resource: string; action: string }> = []
      ;(result.data?.roles || []).forEach(role => {
        role.permissions.forEach(p => {
          const [resource, action] = p.split(':')
          permissions.push({
            permission_name: p,
            resource: resource || p,
            action: action || 'all',
          })
        })
      })

      return permissions
    },
    enabled: isAuthenticated && !!userId,
  })
}

export function useHasPermission(permissionName: string) {
  const { workersUser } = useAuth()
  const { data: permissions = [] } = useUserPermissions(workersUser?.id)

  return permissions.some(p => p.permission_name === permissionName)
}

export function useAssignRole() {
  const queryClient = useQueryClient()
  const { getAccessToken, workersUser } = useAuth()

  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      const result = await permissionsApi.assignRole(token, userId, roleId)
      if (result.error) throw new Error(result.error)

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userRoles() })
    },
  })
}

export function useRevokeRole() {
  const queryClient = useQueryClient()
  const { getAccessToken } = useAuth()

  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const token = getAccessToken()
      if (!token) throw new Error('인증이 필요합니다')

      const result = await permissionsApi.revokeRole(token, userId, roleId)
      if (result.error) throw new Error(result.error)

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userRoles() })
    },
  })
}
