/**
 * MCP 권한 전역 Context
 *
 * @description 앱 전역에서 MCP 권한 캐시를 관리하는 Context Provider
 */

import React, { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mcpQueryKeys } from '@/hooks/useMCPClient';
import type { MinuServiceId } from '@/hooks/useMCPPermission';
import { MCPPermissionContext } from './useMCPPermission';

/**
 * 서비스 ID를 권한 키로 변환
 */
function serviceIdToPermission(serviceId: MinuServiceId): string {
  // minu-frame -> access_minu_frame
  return `access_${serviceId.replace('-', '_')}`;
}

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

// Re-export hooks from separate file to maintain backward compatibility
export {
  MCPPermissionContext,
  useMCPPermissionContext,
  useMCPPermissionContextOptional,
} from './useMCPPermission';
export type { MCPPermissionContextValue } from './useMCPPermission';

export default MCPPermissionProvider;
