/**
 * MCP 서비스 권한 확인 훅
 *
 * @description 구독 상태와 권한을 통합 확인하는 훅
 * 기존 useCompassPermission을 래핑하여 서비스 단위 권한 관리 제공
 */

import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  useCompassPermission,
  useMinuSubscription,
  mcpQueryKeys,
} from '@/hooks/useMCPClient';

/**
 * Minu 서비스 ID 타입
 */
export type MinuServiceId =
  | 'minu-find'
  | 'minu-frame'
  | 'minu-build'
  | 'minu-keep';

/**
 * 서비스별 기본 권한 매핑
 */
const SERVICE_PERMISSIONS: Record<MinuServiceId, string> = {
  'minu-find': 'access_minu_find',
  'minu-frame': 'access_minu_frame',
  'minu-build': 'access_minu_build',
  'minu-keep': 'access_minu_keep',
};

/**
 * 구독 정보 타입 (정규화)
 */
export interface NormalizedSubscription {
  planName: string;
  status: string;
  validUntil: string;
}

/**
 * useMCPServicePermission 훅 반환 타입
 */
export interface UseMCPServicePermissionResult {
  /** 서비스 접근 가능 여부 */
  hasAccess: boolean;
  /** 추가 권한 보유 여부 */
  hasPermission: boolean;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 구독 정보 */
  subscription: NormalizedSubscription | null;
  /** 필요한 플랜 */
  requiredPlan?: string;
  /** 캐시 무효화 */
  invalidate: () => void;
}

/**
 * 서비스 단위 권한 확인 훅
 *
 * 구독 상태와 추가 권한을 동시에 확인합니다.
 * React Query를 통해 5분간 캐싱됩니다.
 *
 * @param serviceId - Minu 서비스 ID
 * @param additionalPermission - 추가로 확인할 권한 (선택)
 *
 * @example
 * ```tsx
 * // 기본 서비스 접근 권한 확인
 * const { hasAccess, isLoading, subscription } = useMCPServicePermission('minu-frame');
 *
 * // 추가 권한도 함께 확인
 * const { hasAccess, hasPermission } = useMCPServicePermission(
 *   'minu-build',
 *   'export_data'
 * );
 * ```
 */
export function useMCPServicePermission(
  serviceId: MinuServiceId,
  additionalPermission?: string
): UseMCPServicePermissionResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 구독 정보 조회
  const {
    subscription: mcpSubscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useMinuSubscription();

  // 서비스 기본 권한 확인
  const basePermission = SERVICE_PERMISSIONS[serviceId];
  const {
    hasPermission: hasBasePermission,
    isLoading: basePermissionLoading,
    requiredPlan: baseRequiredPlan,
  } = useCompassPermission(basePermission, {
    enabled: !!user && !!basePermission,
  });

  // 추가 권한 확인 (있는 경우)
  const {
    hasPermission: hasAdditionalPermission,
    isLoading: additionalPermissionLoading,
    requiredPlan: additionalRequiredPlan,
  } = useCompassPermission(additionalPermission ?? '', {
    enabled: !!user && !!additionalPermission,
  });

  // 로딩 상태 통합
  const isLoading = subscriptionLoading || basePermissionLoading ||
    (!!additionalPermission && additionalPermissionLoading);

  // 에러 상태 (구독 에러만 치명적)
  const error = subscriptionError ? new Error(String(subscriptionError)) : null;

  // 구독 정보 정규화
  const subscription = useMemo((): NormalizedSubscription | null => {
    if (!mcpSubscription) return null;
    return {
      planName: mcpSubscription.planName,
      status: mcpSubscription.status,
      validUntil: mcpSubscription.validUntil,
    };
  }, [mcpSubscription]);

  // 접근 권한 계산
  const hasAccess = useMemo(() => {
    // 로그인 필수
    if (!user) return false;
    // 구독 필수
    if (!subscription) return false;
    // 활성 구독 필수
    if (subscription.status !== 'active') return false;
    // 기본 권한 확인
    return hasBasePermission;
  }, [user, subscription, hasBasePermission]);

  // 추가 권한 계산
  const hasPermission = useMemo(() => {
    // 추가 권한 요청이 없으면 true
    if (!additionalPermission) return true;
    return hasAdditionalPermission;
  }, [additionalPermission, hasAdditionalPermission]);

  // 필요한 플랜 결정 (추가 권한 > 기본 권한)
  const requiredPlan = additionalRequiredPlan ?? baseRequiredPlan;

  // 캐시 무효화 함수
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: mcpQueryKeys.subscription() });
    queryClient.invalidateQueries({
      queryKey: mcpQueryKeys.permission(basePermission),
    });
    if (additionalPermission) {
      queryClient.invalidateQueries({
        queryKey: mcpQueryKeys.permission(additionalPermission),
      });
    }
  }, [queryClient, basePermission, additionalPermission]);

  return {
    hasAccess,
    hasPermission,
    isLoading,
    error,
    subscription,
    requiredPlan,
    invalidate,
  };
}

/**
 * 전역 MCP 권한 캐시 무효화 훅
 *
 * @example
 * ```tsx
 * const { invalidateAll, invalidateSubscription } = useInvalidateMCPCache();
 *
 * // 구독 변경 후 모든 캐시 무효화
 * await updateSubscription();
 * invalidateAll();
 * ```
 */
export function useInvalidateMCPCache() {
  const queryClient = useQueryClient();

  return {
    /** 모든 MCP 캐시 무효화 */
    invalidateAll: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['mcp'] });
    }, [queryClient]),

    /** 구독 정보 캐시만 무효화 */
    invalidateSubscription: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: mcpQueryKeys.subscription() });
    }, [queryClient]),

    /** 특정 권한 캐시만 무효화 */
    invalidatePermission: useCallback(
      (permission: string) => {
        queryClient.invalidateQueries({
          queryKey: mcpQueryKeys.permission(permission),
        });
      },
      [queryClient]
    ),
  };
}

export default useMCPServicePermission;
