/**
 * Permission Context Hook
 * CMS Phase 1 - Agent 2
 *
 * Fast Refresh 최적화를 위해 분리된 훅
 */

import { useContext } from 'react'
import { PermissionContext } from '@/contexts/permissionContextValue'
import type { PermissionContext as PermissionContextType } from '@/types/auth/permission.types'

/**
 * 권한 컨텍스트 훅
 */
export const usePermissionContext = (): PermissionContextType => {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissionContext는 PermissionProvider 내부에서 사용해야 합니다')
  }
  return context
}
