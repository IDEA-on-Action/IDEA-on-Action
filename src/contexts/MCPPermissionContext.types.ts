/**
 * MCP 권한 Context 타입 정의
 *
 * @description
 * MCPPermissionContext에서 사용되는 타입들을 정의합니다.
 */

/**
 * MCP 서비스 ID 타입
 */
export type ServiceId = 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';

/**
 * 권한 레벨 타입
 */
export type Permission = 'none' | 'read' | 'write' | 'admin';

/**
 * Fallback 사유 타입
 */
export type FallbackReason =
  | 'subscription_required'
  | 'subscription_expired'
  | 'insufficient_permission'
  | 'service_unavailable';

/**
 * 권한 정보 인터페이스
 */
export interface PermissionInfo {
  /** 권한 레벨 */
  permission: Permission;
  /** Fallback 사유 (권한이 제한된 경우) */
  reason?: FallbackReason;
  /** 권한 확인 시각 */
  checkedAt: Date;
}

/**
 * MCP 권한 Context 값 인터페이스
 */
export interface MCPPermissionContextValue {
  /** 서비스별 권한 정보 Map */
  permissions: Map<ServiceId, PermissionInfo>;
  /** 특정 서비스의 권한 확인 */
  checkPermission: (serviceId: ServiceId) => Promise<PermissionInfo>;
  /** 특정 서비스의 캐시 무효화 */
  invalidateCache: (serviceId?: ServiceId) => void;
  /** 전체 캐시 무효화 */
  invalidateAll: () => void;
  /** 로딩 상태 */
  isLoading: boolean;
}

/**
 * 캐시 TTL (밀리초) - 5분
 */
export const CACHE_TTL = 5 * 60 * 1000;
