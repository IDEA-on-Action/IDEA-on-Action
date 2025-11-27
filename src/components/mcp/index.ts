/**
 * MCP 컴포넌트 모음
 *
 * @description Minu 서비스 권한 관리를 위한 컴포넌트 및 훅
 */

// 메인 컴포넌트
export { MCPProtected } from './MCPProtected';
export { MCPLoading } from './MCPLoading';
export { MCPFallback } from './MCPFallback';
export { MCPPermissionProvider } from './MCPPermissionContext';

// 훅 및 HOC (Fast Refresh 분리)
export { withMCPProtection, type MinuServiceId } from './MCPProtected.hoc';
export {
  MCPPermissionContext,
  useMCPPermissionContext,
  useMCPPermissionContextOptional,
  type MCPPermissionContextValue,
} from './MCPPermissionContext.hooks';

// 타입
export type { FallbackReason } from './MCPFallback';
