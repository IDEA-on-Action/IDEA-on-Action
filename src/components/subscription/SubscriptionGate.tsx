/**
 * 구독 기반 기능 접근 제어 컴포넌트
 *
 * @description 자식 컴포넌트를 기능 접근 제어로 감싸는 HOC/컴포넌트
 */

import React from 'react';
import { useCanAccess } from '@/hooks/subscription/useCanAccess';
import { Skeleton } from '@/components/ui/skeleton';
import { UpgradePrompt } from './UpgradePrompt';

/**
 * SubscriptionGate 컴포넌트 Props
 */
interface SubscriptionGateProps {
  /** 기능 키 (예: 'api_calls', 'storage_gb') */
  feature_key: string;
  /** 접근 불가 시 표시할 커스텀 컴포넌트 */
  fallback?: React.ReactNode;
  /** 자식 컴포넌트 */
  children: React.ReactNode;
}

/**
 * 구독 기반 기능 접근 제어 컴포넌트
 *
 * useCanAccess 훅을 사용하여 접근 권한을 확인하고,
 * 접근 불가 시 fallback 또는 기본 UpgradePrompt를 표시합니다.
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <SubscriptionGate feature_key="api_calls">
 *   <APIConsole />
 * </SubscriptionGate>
 *
 * // 커스텀 Fallback
 * <SubscriptionGate
 *   feature_key="storage_gb"
 *   fallback={<CustomUpgradeMessage />}
 * >
 *   <FileUploader />
 * </SubscriptionGate>
 * ```
 */
export function SubscriptionGate({
  feature_key,
  fallback,
  children,
}: SubscriptionGateProps) {
  const {
    canAccess,
    isLoading,
    currentPlan,
    requiredPlan,
  } = useCanAccess(feature_key);

  // 로딩 중 - Skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    );
  }

  // 접근 불가 - Fallback 또는 UpgradePrompt
  if (!canAccess) {
    return (
      <>
        {fallback ?? (
          <UpgradePrompt
            feature_key={feature_key}
            currentPlan={currentPlan}
            requiredPlan={requiredPlan}
          />
        )}
      </>
    );
  }

  // 접근 가능 - children 렌더링
  return <>{children}</>;
}

// Re-export HOC from separate file to maintain backward compatibility
export * from './withSubscriptionGate';

export default SubscriptionGate;
