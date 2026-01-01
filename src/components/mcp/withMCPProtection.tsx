/**
 * MCP 권한 보호 HOC (Higher-Order Component)
 *
 * @description MCPProtected를 HOC 형태로 사용
 */

import React from 'react';
import { MCPProtected } from './MCPProtected';
import type { MinuServiceId } from '@/hooks/integrations/useMCPPermission';

/**
 * MCPProtected를 HOC 형태로 사용
 *
 * @example
 * ```tsx
 * const ProtectedMinuFrame = withMCPProtection(
 *   MinuFrameContent,
 *   'minu-frame'
 * );
 *
 * // 추가 권한 필요 시
 * const ProtectedExport = withMCPProtection(
 *   ExportComponent,
 *   'minu-build',
 *   'export_data'
 * );
 * ```
 */
export function withMCPProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  serviceId: MinuServiceId,
  requiredPermission?: string
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithMCPProtection = (props: P) => (
    <MCPProtected serviceId={serviceId} requiredPermission={requiredPermission}>
      <WrappedComponent {...props} />
    </MCPProtected>
  );

  WithMCPProtection.displayName = `withMCPProtection(${displayName})`;

  return WithMCPProtection;
}

export type { MinuServiceId };
