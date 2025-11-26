/**
 * MCP 권한 기반 보호 컴포넌트 (HOC)
 *
 * @description 구독 상태와 권한을 확인하여 컴포넌트 접근을 제어
 * 로딩, 권한 없음, 에러 상태에 대한 일관된 UI 제공
 */

import React from 'react';
import {
  useMCPServicePermission,
  type MinuServiceId,
} from '@/hooks/useMCPPermission';
import { MCPLoading } from './MCPLoading';
import { MCPFallback, type FallbackReason } from './MCPFallback';

/**
 * MCPProtected 컴포넌트 Props
 */
interface MCPProtectedProps {
  /** 서비스 ID (minu-find, minu-frame, minu-build, minu-keep) */
  serviceId: MinuServiceId;

  /** 추가로 필요한 권한 (예: 'export_data', 'advanced_analytics') */
  requiredPermission?: string;

  /** 권한 없을 때 표시할 커스텀 컴포넌트 */
  fallback?: React.ReactNode;

  /** 로딩 중 표시할 커스텀 컴포넌트 */
  loadingFallback?: React.ReactNode;

  /** 자식 컴포넌트 */
  children: React.ReactNode;
}

/**
 * 구독 상태에 따른 Fallback 사유 결정
 */
function getFallbackReason(
  subscription: { status: string } | null,
  hasAccess: boolean
): FallbackReason {
  // 구독 없음
  if (!subscription) {
    return 'no_subscription';
  }

  // 만료됨
  if (subscription.status === 'expired' || subscription.status === 'past_due') {
    return 'expired';
  }

  // 플랜 부족
  if (!hasAccess) {
    return 'insufficient_plan';
  }

  // 기타 오류
  return 'service_error';
}

/**
 * MCP 권한 기반 보호 컴포넌트
 *
 * 서비스 접근 권한을 확인하고, 권한이 없는 경우 적절한 Fallback UI를 표시합니다.
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <MCPProtected serviceId="minu-frame">
 *   <MinuFrameContent />
 * </MCPProtected>
 *
 * // 추가 권한 확인
 * <MCPProtected
 *   serviceId="minu-build"
 *   requiredPermission="export_data"
 * >
 *   <ExportFeature />
 * </MCPProtected>
 *
 * // 커스텀 Fallback
 * <MCPProtected
 *   serviceId="minu-keep"
 *   fallback={<CustomUpgradePrompt />}
 *   loadingFallback={<CustomLoader />}
 * >
 *   <ProtectedContent />
 * </MCPProtected>
 * ```
 */
export function MCPProtected({
  serviceId,
  requiredPermission,
  fallback,
  loadingFallback,
  children,
}: MCPProtectedProps) {
  const {
    hasAccess,
    hasPermission,
    isLoading,
    error,
    subscription,
    requiredPlan,
  } = useMCPServicePermission(serviceId, requiredPermission);

  // 에러 발생 시 Fallback 표시
  if (error) {
    return fallback ?? (
      <MCPFallback
        serviceId={serviceId}
        reason="service_error"
        message="서비스 연결 중 문제가 발생했습니다."
      />
    );
  }

  // 로딩 중
  if (isLoading) {
    return <>{loadingFallback ?? <MCPLoading serviceId={serviceId} />}</>;
  }

  // 서비스 접근 권한 없음
  if (!hasAccess) {
    const reason = getFallbackReason(subscription, hasAccess);
    return fallback ?? (
      <MCPFallback
        serviceId={serviceId}
        reason={reason}
        requiredPlan={requiredPlan}
        currentPlan={subscription?.planName}
      />
    );
  }

  // 추가 권한 없음
  if (requiredPermission && !hasPermission) {
    return fallback ?? (
      <MCPFallback
        serviceId={serviceId}
        reason="insufficient_plan"
        requiredPlan={requiredPlan}
        currentPlan={subscription?.planName}
      />
    );
  }

  // 권한 있음 - children 렌더링
  return <>{children}</>;
}

// Re-export HOC from separate file to maintain backward compatibility
export * from './withMCPProtection';

export default MCPProtected;
