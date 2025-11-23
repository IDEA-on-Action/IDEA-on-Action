/**
 * MCP 컴포넌트 모음
 *
 * @description Minu 서비스 권한 관리를 위한 컴포넌트 및 훅
 */

// 메인 컴포넌트
export { MCPProtected, withMCPProtection } from './MCPProtected';
export { MCPLoading } from './MCPLoading';
export { MCPFallback } from './MCPFallback';
export { MCPPermissionProvider, useMCPPermissionContext, useMCPPermissionContextOptional } from './MCPPermissionContext';

// 타입
export type { MinuServiceId } from './MCPProtected';
export type { FallbackReason } from './MCPFallback';
