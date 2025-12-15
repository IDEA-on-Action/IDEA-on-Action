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
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PermissionContext } from '@/contexts/permissionContextValue'
import type { Permission } from '@/types/rbac'
import type { AdminRole } from '@/types/cms.types'
import type { PermissionContext as PermissionContextType } from '@/types/permission.types'

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
  const { user } = useAuth()

  // 사용자 권한 조회
  const {
    data: permissions = [],
    isLoading: isLoadingPermissions,
    refetch: refetchPermissions,
  } = useQuery({
    queryKey: ['user_permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .rpc('get_user_permissions', { p_user_id: user.id })

      if (error) {
        console.error('권한 조회 실패:', error)
        return []
      }

      return (data || []) as Array<{ permission_name: string; resource: string; action: string }>
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  })

  // 사용자 역할 조회 (admins 테이블)
  const {
    data: adminData,
    isLoading: isLoadingAdmin,
    refetch: refetchAdmin,
  } = useQuery({
    queryKey: ['admin_role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const { data, error } = await supabase
        .from('admins')
        .select('user_id, role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('관리자 역할 조회 실패:', error)
        return null
      }

      return data as { user_id: string; role: AdminRole } | null
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
