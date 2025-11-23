/**
 * MCP 권한 전역 Context
 *
 * @description 앱 전역에서 MCP 권한 캐시를 관리하는 Context Provider
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mcpQueryKeys } from '@/hooks/useMCPClient';
import type { MinuServiceId } from '@/hooks/useMCPPermission';

/**
 * 서비스 ID를 권한 키로 변환
 */
function serviceIdToPermission(serviceId: MinuServiceId): string {
  // minu-frame -> access_minu_frame
  return `access_${serviceId.replace('-', '_')}`;
}

/**
 * MCP 권한 Context 값
 */
interface MCPPermissionContextValue {
  /** 모든 MCP 캐시 무효화 */
  invalidateAll: () => void;
  /** 특정 서비스 권한 캐시 무효화 */
  invalidateService: (serviceId: MinuServiceId) => void;
  /** 구독 정보 캐시 무효화 */
  invalidateSubscription: () => void;
  /** 특정 권한 캐시 무효화 */
  invalidatePermission: (permission: string) => void;
}

const MCPPermissionContext = createContext<MCPPermissionContextValue | null>(null);

/**
 * MCP 권한 Provider
 *
 * 앱 최상위에 배치하여 전역 권한 캐시를 관리합니다.
 * QueryClientProvider 내부에 배치해야 합니다.
 *
 * @example
 * ```tsx
 * // App.tsx 또는 main.tsx
 * <QueryClientProvider client={queryClient}>
 *   <MCPPermissionProvider>
 *     <App />
 *   </MCPPermissionProvider>
 * </QueryClientProvider>
 * ```
 */
export function MCPPermissionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // 모든 MCP 캐시 무효화
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mcp'] });
  }, [queryClient]);

  // 특정 서비스 권한 캐시 무효화
  const invalidateService = useCallback(
    (serviceId: MinuServiceId) => {
      const permission = serviceIdToPermission(serviceId);
      queryClient.invalidateQueries({
        queryKey: mcpQueryKeys.permission(permission),
      });
    },
    [queryClient]
  );

  // 구독 정보 캐시 무효화
  const invalidateSubscription = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: mcpQueryKeys.subscription() });
  }, [queryClient]);

  // 특정 권한 캐시 무효화
  const invalidatePermission = useCallback(
    (permission: string) => {
      queryClient.invalidateQueries({
        queryKey: mcpQueryKeys.permission(permission),
      });
    },
    [queryClient]
  );

  const value = useMemo(
    () => ({
      invalidateAll,
      invalidateService,
      invalidateSubscription,
      invalidatePermission,
    }),
    [invalidateAll, invalidateService, invalidateSubscription, invalidatePermission]
  );

  return (
    <MCPPermissionContext.Provider value={value}>
      {children}
    </MCPPermissionContext.Provider>
  );
}

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

export default MCPPermissionProvider;
