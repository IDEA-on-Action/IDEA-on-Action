/**
 * MCP 권한 Context 훅
 *
 * @description MCPPermissionProvider 내부에서 사용하는 훅들
 */

import { createContext, useContext } from 'react';

/**
 * MCP 권한 Context 값
 */
export interface MCPPermissionContextValue {
  /** 모든 MCP 캐시 무효화 */
  invalidateAll: () => void;
  /** 특정 서비스 권한 캐시 무효화 */
  invalidateService: (serviceId: string) => void;
  /** 구독 정보 캐시 무효화 */
  invalidateSubscription: () => void;
  /** 특정 권한 캐시 무효화 */
  invalidatePermission: (permission: string) => void;
}

/**
 * MCP 권한 Context
 * MCPPermissionProvider에서 사용
 */
export const MCPPermissionContext = createContext<MCPPermissionContextValue | null>(null);

/**
 * MCP 권한 Context 사용 훅
 *
 * MCPPermissionProvider 내부에서만 사용 가능합니다.
 *
 * @example
 * ```tsx
 * function SubscriptionManager() {
 *   const { invalidateAll, invalidateSubscription } = useMCPPermissionContext();
 *
 *   const handleUpgrade = async () => {
 *     await upgradeSubscription();
 *     // 구독 변경 후 캐시 무효화
 *     invalidateAll();
 *   };
 *
 *   return <button onClick={handleUpgrade}>업그레이드</button>;
 * }
 * ```
 */
export function useMCPPermissionContext(): MCPPermissionContextValue {
  const context = useContext(MCPPermissionContext);

  if (!context) {
    throw new Error(
      'useMCPPermissionContext must be used within MCPPermissionProvider'
    );
  }

  return context;
}

/**
 * Optional MCP 권한 Context 사용 훅
 *
 * Provider 없이도 사용 가능 (기능 없이 빈 함수 반환)
 */
export function useMCPPermissionContextOptional(): MCPPermissionContextValue | null {
  return useContext(MCPPermissionContext);
}
