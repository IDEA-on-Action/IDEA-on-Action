/**
 * Permission Types
 * CMS Phase 1 - Enhanced Permission Management
 */

import type { ReactNode } from 'react'
import type { Permission } from './rbac'
import type { AdminRole } from './cms.types'

/**
 * 권한 컨텍스트 타입
 */
export interface PermissionContext {
  /** 사용자의 모든 권한 목록 */
  permissions: Permission[]
  /** 특정 권한 보유 여부 확인 */
  hasPermission: (name: string) => boolean
  /** 여러 권한 중 하나라도 보유 여부 확인 */
  hasAnyPermission: (names: string[]) => boolean
  /** 모든 권한 보유 여부 확인 */
  hasAllPermissions: (names: string[]) => boolean
  /** 관리자 여부 (admin 또는 editor) */
  isAdmin: boolean
  /** 슈퍼 관리자 여부 (super_admin) */
  isSuperAdmin: boolean
  /** 사용자 역할 */
  role: AdminRole | null
  /** 권한 새로고침 */
  refresh: () => void
  /** 로딩 상태 */
  isLoading: boolean
}

/**
 * 권한 게이트 컴포넌트 속성
 */
export interface PermissionGateProps {
  /** 확인할 권한 (단일 또는 배열) */
  permission: string | string[]
  /** 권한 확인 모드 (any: 하나라도, all: 모두) */
  mode?: 'any' | 'all'
  /** 권한 없을 때 표시할 내용 */
  fallback?: ReactNode
  /** 권한 있을 때 표시할 내용 */
  children: ReactNode
}

/**
 * 권한 캐시 반환 타입
 */
export interface PermissionCache {
  /** 캐시된 권한 목록 (Set for O(1) lookup) */
  permissions: Set<string>
  /** 권한 캐시 새로고침 */
  refresh: () => void
  /** 로딩 상태 */
  isLoading: boolean
}

/**
 * 리소스 기반 권한 확인을 위한 타입
 */
export interface ResourcePermission {
  /** 리소스 타입 (예: 'blog', 'service', 'user') */
  resource: string
  /** 액션 타입 (예: 'create', 'read', 'update', 'delete') */
  action: string
}

/**
 * 권한 확인 옵션
 */
export interface PermissionCheckOptions {
  /** 관리자 역할은 자동으로 모든 권한 허용 여부 */
  bypassForAdmin?: boolean
  /** 슈퍼 관리자 역할은 자동으로 모든 권한 허용 여부 */
  bypassForSuperAdmin?: boolean
}
