/**
 * Enhanced Permission Management Hooks
 * CMS Phase 1 - Agent 2
 *
 * 기존 useRBAC 훅을 확장하여 더 세밀한 권한 제어 기능 제공
 *
 * Features:
 * - useCanAccess: 리소스 기반 권한 확인
 * - useCanAccessAny/All: 다중 권한 확인
 * - PermissionGate: 권한 기반 렌더링 컴포넌트
 * - usePermissionCache: 최적화된 권한 캐싱
 */

import React, { useMemo, type FC } from 'react'
import { usePermissionContext } from '@/contexts/PermissionContext'
import type {
  PermissionGateProps,
  PermissionCache,
  ResourcePermission,
  PermissionCheckOptions,
} from '@/types/permission.types'

/**
 * 리소스 기반 권한 확인 훅
 *
 * @param resource - 리소스 타입 (예: 'blog', 'service', 'user')
 * @param action - 액션 타입 (예: 'create', 'read', 'update', 'delete')
 * @param options - 권한 확인 옵션
 * @returns 권한 보유 여부
 *
 * @example
 * const canCreateBlog = useCanAccess('blog', 'create')
 * const canDeleteUser = useCanAccess('user', 'delete')
 */
export function useCanAccess(
  resource: string,
  action: string,
  options: PermissionCheckOptions = {}
): boolean {
  const { hasPermission, isAdmin, isSuperAdmin } = usePermissionContext()

  return useMemo(() => {
    // 슈퍼 관리자 바이패스
    if (options.bypassForSuperAdmin !== false && isSuperAdmin) {
      return true
    }

    // 관리자 바이패스
    if (options.bypassForAdmin !== false && isAdmin) {
      return true
    }

    // 권한명 형식: {resource}:{action} (예: 'blog:create')
    const permissionName = `${resource}:${action}`
    return hasPermission(permissionName)
  }, [resource, action, hasPermission, isAdmin, isSuperAdmin, options])
}

/**
 * 여러 권한 중 하나라도 보유 여부 확인 훅
 *
 * @param permissions - 권한 이름 배열 또는 리소스 권한 객체 배열
 * @param options - 권한 확인 옵션
 * @returns 하나라도 권한 보유 시 true
 *
 * @example
 * const canEdit = useCanAccessAny(['blog:update', 'blog:delete'])
 * const canManage = useCanAccessAny([
 *   { resource: 'blog', action: 'create' },
 *   { resource: 'blog', action: 'update' }
 * ])
 */
export function useCanAccessAny(
  permissions: string[] | ResourcePermission[],
  options: PermissionCheckOptions = {}
): boolean {
  const { hasAnyPermission, isAdmin, isSuperAdmin } = usePermissionContext()

  return useMemo(() => {
    // 슈퍼 관리자 바이패스
    if (options.bypassForSuperAdmin !== false && isSuperAdmin) {
      return true
    }

    // 관리자 바이패스
    if (options.bypassForAdmin !== false && isAdmin) {
      return true
    }

    // 권한 이름 배열 생성
    const permissionNames = permissions.map((p) =>
      typeof p === 'string' ? p : `${p.resource}:${p.action}`
    )

    return hasAnyPermission(permissionNames)
  }, [permissions, hasAnyPermission, isAdmin, isSuperAdmin, options])
}

/**
 * 모든 권한 보유 여부 확인 훅
 *
 * @param permissions - 권한 이름 배열 또는 리소스 권한 객체 배열
 * @param options - 권한 확인 옵션
 * @returns 모든 권한 보유 시 true
 *
 * @example
 * const canFullManage = useCanAccessAll(['blog:create', 'blog:update', 'blog:delete'])
 * const canFullControl = useCanAccessAll([
 *   { resource: 'user', action: 'create' },
 *   { resource: 'user', action: 'delete' }
 * ])
 */
export function useCanAccessAll(
  permissions: string[] | ResourcePermission[],
  options: PermissionCheckOptions = {}
): boolean {
  const { hasAllPermissions, isAdmin, isSuperAdmin } = usePermissionContext()

  return useMemo(() => {
    // 슈퍼 관리자 바이패스
    if (options.bypassForSuperAdmin !== false && isSuperAdmin) {
      return true
    }

    // 관리자 바이패스
    if (options.bypassForAdmin !== false && isAdmin) {
      return true
    }

    // 권한 이름 배열 생성
    const permissionNames = permissions.map((p) =>
      typeof p === 'string' ? p : `${p.resource}:${p.action}`
    )

    return hasAllPermissions(permissionNames)
  }, [permissions, hasAllPermissions, isAdmin, isSuperAdmin, options])
}

/**
 * 권한 캐시 훅
 *
 * @returns 권한 캐시 객체 (Set 기반 O(1) 조회)
 *
 * @example
 * const { permissions, refresh, isLoading } = usePermissionCache()
 * if (permissions.has('blog:create')) {
 *   // 블로그 작성 권한 있음
 * }
 */
export function usePermissionCache(): PermissionCache {
  const { permissions, refresh, isLoading } = usePermissionContext()

  const permissionSet = useMemo(() => {
    return new Set(permissions.map((p) => p.name))
  }, [permissions])

  return {
    permissions: permissionSet,
    refresh,
    isLoading,
  }
}

/**
 * 권한 기반 렌더링 게이트 컴포넌트
 *
 * @param permission - 확인할 권한 (단일 또는 배열)
 * @param mode - 권한 확인 모드 (any: 하나라도, all: 모두)
 * @param fallback - 권한 없을 때 표시할 내용
 * @param children - 권한 있을 때 표시할 내용
 *
 * @example
 * <PermissionGate permission="blog:create">
 *   <CreateBlogButton />
 * </PermissionGate>
 *
 * <PermissionGate permission={['blog:update', 'blog:delete']} mode="any" fallback={<NoAccess />}>
 *   <EditBlogForm />
 * </PermissionGate>
 */
export const PermissionGate: FC<PermissionGateProps> = ({
  permission,
  mode = 'any',
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissionContext()

  const hasAccess = useMemo(() => {
    // 단일 권한 확인
    if (typeof permission === 'string') {
      return hasPermission(permission)
    }

    // 다중 권한 확인
    if (mode === 'any') {
      return hasAnyPermission(permission)
    } else {
      return hasAllPermissions(permission)
    }
  }, [permission, mode, hasPermission, hasAnyPermission, hasAllPermissions])

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

/**
 * 역할 기반 권한 확인 훅
 *
 * @returns 역할 정보 객체
 *
 * @example
 * const { isAdmin, isSuperAdmin, role } = useRole()
 * if (isAdmin) {
 *   // 관리자 전용 기능
 * }
 */
export function useRole() {
  const { isAdmin, isSuperAdmin, role } = usePermissionContext()

  return {
    isAdmin,
    isSuperAdmin,
    role,
  }
}

/**
 * 특정 역할 보유 여부 확인 훅
 *
 * @param requiredRole - 필요한 역할
 * @returns 역할 보유 여부
 *
 * @example
 * const canAccess = useHasRole('super_admin')
 * const isEditor = useHasRole('editor')
 */
export function useHasRole(requiredRole: 'super_admin' | 'admin' | 'editor'): boolean {
  const { role } = usePermissionContext()

  return useMemo(() => {
    if (!role) return false

    // 슈퍼 관리자는 모든 역할 접근 가능
    if (role === 'super_admin') return true

    // 정확한 역할 매칭
    return role === requiredRole
  }, [role, requiredRole])
}
