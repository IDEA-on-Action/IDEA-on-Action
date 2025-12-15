/**
 * Permission Context Value
 * CMS Phase 1 - Agent 2
 *
 * Fast Refresh 최적화를 위해 분리된 Context 정의
 */

import { createContext } from 'react'
import type { PermissionContext as PermissionContextType } from '@/types/permission.types'

/**
 * 권한 컨텍스트
 */
export const PermissionContext = createContext<PermissionContextType | null>(null)
