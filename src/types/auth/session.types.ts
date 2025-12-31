/**
 * Session Types
 *
 * 사용자 세션 및 다중 기기 관리 타입 정의
 *
 * @module types/session
 */

// ============================================================================
// Database Types
// ============================================================================

/**
 * 기기 타입
 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

/**
 * 기기 정보
 */
export interface DeviceInfo {
  /** 기기 타입 */
  type: DeviceType
  /** 운영 체제 */
  os?: string
  /** 브라우저 */
  browser?: string
  /** 앱 버전 */
  app_version?: string
  /** 기기 이름 (사용자 지정) */
  device_name?: string
}

/**
 * 사용자 세션 (DB 레코드)
 */
export interface UserSession {
  /** 세션 고유 ID */
  id: string
  /** 사용자 ID */
  user_id: string
  /** 리프레시 토큰 ID */
  refresh_token_id: string | null
  /** 기기 정보 */
  device_info: DeviceInfo | null
  /** IP 주소 */
  ip_address: string | null
  /** User Agent */
  user_agent: string | null
  /** 활성 여부 */
  is_active: boolean
  /** 마지막 활동 시간 */
  last_active_at: string
  /** 만료 시간 */
  expires_at: string | null
  /** 생성 시간 */
  created_at: string
  /** 수정 시간 */
  updated_at: string
}

/**
 * 세션 생성 요청
 */
export interface CreateSessionRequest {
  /** 사용자 ID */
  user_id: string
  /** 리프레시 토큰 ID */
  refresh_token_id?: string
  /** 기기 정보 */
  device_info?: DeviceInfo
  /** IP 주소 */
  ip_address?: string
  /** User Agent */
  user_agent?: string
  /** 만료 시간 (ISO 8601) */
  expires_at?: string
}

/**
 * 세션 업데이트 요청
 */
export interface UpdateSessionRequest {
  /** 세션 ID */
  session_id: string
  /** 기기 정보 */
  device_info?: DeviceInfo
  /** 활성 여부 */
  is_active?: boolean
  /** 마지막 활동 시간 */
  last_active_at?: string
  /** 만료 시간 */
  expires_at?: string
}

// ============================================================================
// Session Management Types
// ============================================================================

/**
 * 세션 상태
 */
export type SessionStatus = 'active' | 'expired' | 'revoked' | 'inactive'

/**
 * 세션 목록 아이템 (UI 표시용)
 */
export interface SessionListItem {
  /** 세션 ID */
  id: string
  /** 기기 정보 */
  device_info: DeviceInfo | null
  /** IP 주소 */
  ip_address: string | null
  /** 상태 */
  status: SessionStatus
  /** 마지막 활동 시간 */
  last_active_at: string
  /** 생성 시간 */
  created_at: string
  /** 현재 세션 여부 */
  is_current: boolean
}

/**
 * 세션 통계
 */
export interface SessionStatistics {
  /** 총 세션 수 */
  total_sessions: number
  /** 활성 세션 수 */
  active_sessions: number
  /** 만료된 세션 수 */
  expired_sessions: number
  /** 무효화된 세션 수 */
  revoked_sessions: number
  /** 기기별 세션 수 */
  sessions_by_device: Record<DeviceType, number>
}

// ============================================================================
// RBAC Types
// ============================================================================

/**
 * 사용자 역할
 */
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

/**
 * 리소스 타입
 */
export type ResourceType = 'projects' | 'services' | 'members' | 'settings' | 'billing'

/**
 * 액션 타입
 */
export type ActionType = 'read' | 'write' | 'delete' | 'manage'

/**
 * 권한 정의
 */
export interface Permission {
  /** 리소스 타입 */
  resource: ResourceType
  /** 액션 타입 */
  action: ActionType
}

/**
 * 역할별 권한 (DB 레코드)
 */
export interface RolePermissions {
  /** 역할 */
  role: UserRole
  /** 권한 JSON */
  permissions: Record<ResourceType, Record<ActionType, boolean>>
  /** 설명 */
  description: string | null
  /** 생성 시간 */
  created_at: string
  /** 수정 시간 */
  updated_at: string
}

/**
 * 조직 멤버 (DB 레코드)
 */
export interface OrganizationMember {
  /** 멤버 레코드 ID */
  id: string
  /** 조직 ID */
  organization_id: string
  /** 사용자 ID */
  user_id: string
  /** 역할 */
  role: UserRole
  /** 초대한 사용자 ID */
  invited_by: string | null
  /** 초대 일시 */
  invited_at: string
  /** 가입 일시 */
  joined_at: string | null
  /** 생성 시간 */
  created_at: string
  /** 수정 시간 */
  updated_at: string
}

/**
 * 사용자 커스텀 권한 (DB 레코드)
 */
export interface UserCustomPermission {
  /** 권한 레코드 ID */
  id: string
  /** 조직 ID */
  organization_id: string
  /** 사용자 ID */
  user_id: string
  /** 리소스 */
  resource: string
  /** 액션 */
  action: string
  /** 허용 여부 */
  allowed: boolean
  /** 권한 부여자 ID */
  granted_by: string | null
  /** 권한 부여 사유 */
  reason: string | null
  /** 생성 시간 */
  created_at: string
  /** 수정 시간 */
  updated_at: string
}

// ============================================================================
// Permission Check Types
// ============================================================================

/**
 * 권한 확인 요청
 */
export interface CheckPermissionRequest {
  /** 사용자 ID */
  user_id: string
  /** 조직 ID */
  organization_id: string
  /** 리소스 */
  resource: ResourceType | string
  /** 액션 */
  action: ActionType | string
}

/**
 * 권한 확인 결과
 */
export interface CheckPermissionResult {
  /** 권한 보유 여부 */
  allowed: boolean
  /** 사용자 역할 */
  role: UserRole | null
  /** 권한 출처 */
  source: 'role' | 'custom' | 'none'
  /** 상세 정보 */
  details?: string
}

/**
 * 사용자 권한 컨텍스트
 */
export interface UserPermissionContext {
  /** 사용자 ID */
  user_id: string
  /** 조직 ID */
  organization_id: string | null
  /** 역할 */
  role: UserRole | null
  /** 역할 기반 권한 */
  role_permissions: Record<ResourceType, Record<ActionType, boolean>> | null
  /** 커스텀 권한 */
  custom_permissions: UserCustomPermission[]
}

// ============================================================================
// Service Access Types
// ============================================================================

/**
 * Minu 서비스 ID (session 타입용)
 */
export type MinuService = 'find' | 'frame' | 'build' | 'keep'

/**
 * 서비스 접근 확인 요청
 */
export interface CheckServiceAccessRequest {
  /** 사용자 ID */
  user_id: string
  /** 서비스 slug */
  service_slug: string
}

/**
 * 서비스 접근 확인 결과
 */
export interface CheckServiceAccessResult {
  /** 접근 가능 여부 */
  allowed: boolean
  /** 구독 상태 */
  subscription_status: string | null
  /** 만료 일시 */
  expires_at: string | null
  /** 사유 */
  reason?: string
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * usePermissions 훅 옵션
 */
export interface UsePermissionsOptions {
  /** 조직 ID (선택) */
  organization_id?: string
  /** 자동 로드 여부 */
  enabled?: boolean
}

/**
 * usePermissions 훅 반환 타입
 */
export interface UsePermissionsResult {
  /**
   * 특정 권한 확인
   * @param resource 리소스 타입
   * @param action 액션 타입
   * @returns 권한 보유 여부
   */
  checkPermission: (resource: ResourceType | string, action: ActionType | string) => boolean

  /**
   * 사용자 역할 조회
   * @returns 사용자 역할 또는 null
   */
  getUserRole: () => UserRole | null

  /**
   * 서비스 접근 가능 여부
   * @param service Minu 서비스 ID
   * @returns 접근 가능 여부
   */
  canAccessService: (service: MinuService) => boolean

  /** 로딩 중 여부 */
  isLoading: boolean

  /** 에러 */
  error: Error | null

  /** 권한 컨텍스트 */
  permissionContext: UserPermissionContext | null

  /** 권한 정보 재조회 */
  refetch: () => void
}

/**
 * useSessionManagement 훅 반환 타입
 */
export interface UseSessionManagementResult {
  /** 현재 세션 목록 */
  sessions: SessionListItem[]

  /** 로딩 중 여부 */
  isLoading: boolean

  /** 에러 */
  error: Error | null

  /** 세션 통계 */
  statistics: SessionStatistics | null

  /**
   * 특정 세션 무효화
   * @param sessionId 세션 ID
   */
  revokeSession: (sessionId: string) => Promise<void>

  /**
   * 다른 모든 세션 무효화
   */
  revokeOtherSessions: () => Promise<void>

  /**
   * 모든 세션 무효화
   */
  revokeAllSessions: () => Promise<void>

  /**
   * 세션 목록 새로고침
   */
  refetch: () => void
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 역할 레벨 (권한 비교용)
 */
export const ROLE_LEVELS: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
}

/**
 * 기본 세션 만료 시간 (초)
 */
export const DEFAULT_SESSION_EXPIRATION = 30 * 24 * 60 * 60 // 30일

/**
 * 최대 활성 세션 수
 */
export const MAX_ACTIVE_SESSIONS = 5

/**
 * 세션 활동 업데이트 간격 (밀리초)
 */
export const SESSION_ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000 // 5분

// ============================================================================
// Helper Types
// ============================================================================

/**
 * 역할 비교 결과
 */
export type RoleComparison = 'higher' | 'equal' | 'lower'

/**
 * User Agent 파싱 결과
 */
export interface ParsedUserAgent {
  /** 브라우저 */
  browser: string
  /** 브라우저 버전 */
  browser_version: string
  /** 운영체제 */
  os: string
  /** OS 버전 */
  os_version: string
  /** 기기 타입 */
  device_type: DeviceType
}
