/**
 * SubscriptionGate HOC (Higher-Order Component)
 *
 * @description SubscriptionGate를 HOC 형태로 사용
 */

import React from 'react';
import { SubscriptionGate } from './SubscriptionGate';

/**
 * SubscriptionGate를 HOC 형태로 사용
 *
 * 컴포넌트를 SubscriptionGate로 감싸는 HOC입니다.
 *
 * @example
 * ```tsx
 * const ProtectedAPIConsole = withSubscriptionGate(
 *   APIConsole,
 *   'api_calls'
 * );
 *
 * // 사용
 * <ProtectedAPIConsole />
 * ```
 */
export function withSubscriptionGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature_key: string,
  fallback?: React.ReactNode
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithSubscriptionGate = (props: P) => (
    <SubscriptionGate feature_key={feature_key} fallback={fallback}>
      <WrappedComponent {...props} />
    </SubscriptionGate>
  );

  WithSubscriptionGate.displayName = `withSubscriptionGate(${displayName})`;

  return WithSubscriptionGate;
}
