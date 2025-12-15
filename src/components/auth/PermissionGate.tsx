/**
 * Permission Gate Component
 * CMS Phase 1 - Agent 2
 *
 * 권한 기반 렌더링 게이트 컴포넌트
 */

import { useMemo, type FC } from 'react'
import { usePermissionContext } from '@/contexts/usePermissionContext'
import type { PermissionGateProps } from '@/types/permission.types'

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
