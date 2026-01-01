/**
 * Permission Context Provider
 * CMS Phase 1 - Enhanced Permission Management
 *
 * 전역 권한 관리 컨텍스트
 * - 사용자 권한 캐싱
 * - 역할 기반 접근 제어
 * - 권한 확인 헬퍼 함수 제공
 */

import { useMemo, type FC, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { permissionsApi, adminsApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { PermissionContext } from '@/contexts/permissionContextValue'
import type { Permission } from '@/types/auth/rbac'
import type { AdminRole } from '@/types/cms.types'
import type { PermissionContext as PermissionContextType } from '@/types/auth/permission.types'

/**
 * 권한 프로바이더 속성
 */
interface PermissionProviderProps {
  children: ReactNode
}

/**
 * 권한 프로바이더 컴포넌트
 */
export const PermissionProvider: FC<PermissionProviderProps> = ({ children }) => {
  const { user, getAccessToken } = useAuth()

  // 사용자 권한 조회 (Workers API)
  const {
    data: permissions = [],
    isLoading: isLoadingPermissions,
    refetch: refetchPermissions,
  } = useQuery({
    queryKey: ['user_permissions', user?.id],
    queryFn: async () => {
      const token = getAccessToken()
      if (!user?.id || !token) return []

      const { data, error } = await permissionsApi.getMyPermissions(token)

      if (error) {
        console.error('권한 조회 실패:', error)
        return []
      }

      // Workers API 응답을 기존 형식으로 변환
      return (data?.permissions || []).map((p: string) => ({
        permission_name: p,
        resource: '*',
        action: '*',
      }))
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })

  // 사용자 역할 조회 (Workers API)
  const {
    data: adminData,
    isLoading: isLoadingAdmin,
    refetch: refetchAdmin,
  } = useQuery({
    queryKey: ['admin_role', user?.id],
    queryFn: async () => {
      const token = getAccessToken()
      if (!user?.id || !token) return null

      const { data, error } = await adminsApi.checkIsAdmin(token)

      if (error) {
        console.error('관리자 역할 조회 실패:', error)
        return null
      }

      if (!data?.isAdmin) return null
      return { user_id: user.id, role: (data.role || 'admin') as AdminRole }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })

  // 권한 확인 헬퍼 함수들
  const contextValue = useMemo<PermissionContextType>(() => {
    const permissionSet = new Set(permissions.map((p) => p.permission_name))
    const role = adminData?.role || null
    const isSuperAdmin = role === 'super_admin'
    const isAdmin = role === 'admin' || role === 'editor' || isSuperAdmin

    return {
      permissions: permissions.map(
        (p) =>
          ({
            id: '',
            name: p.permission_name,
            resource: p.resource,
            action: p.action,
            description: null,
            created_at: '',
          }) as Permission
      ),
      hasPermission: (name: string) => {
        // 슈퍼 관리자는 모든 권한 자동 허용
        if (isSuperAdmin) return true
        return permissionSet.has(name)
      },
      hasAnyPermission: (names: string[]) => {
        // 슈퍼 관리자는 모든 권한 자동 허용
        if (isSuperAdmin) return true
        return names.some((name) => permissionSet.has(name))
      },
      hasAllPermissions: (names: string[]) => {
        // 슈퍼 관리자는 모든 권한 자동 허용
        if (isSuperAdmin) return true
        return names.every((name) => permissionSet.has(name))
      },
      isAdmin,
      isSuperAdmin,
      role,
      refresh: () => {
        refetchPermissions()
        refetchAdmin()
      },
      isLoading: isLoadingPermissions || isLoadingAdmin,
    }
  }, [permissions, adminData, isLoadingPermissions, isLoadingAdmin, refetchPermissions, refetchAdmin])

  return <PermissionContext.Provider value={contextValue}>{children}</PermissionContext.Provider>
}
