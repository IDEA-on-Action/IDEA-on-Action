import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { subscriptionsApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import {
  ServiceId,
  PermissionInfo,
  MCPPermissionContextValue,
  CACHE_TTL,
} from './MCPPermissionContext.types';

/**
 * MCP 권한 Context
 */
const MCPPermissionContext = createContext<MCPPermissionContextValue | undefined>(undefined);

/**
 * MCP 권한 Provider 컴포넌트
 *
 * @description
 * - 전역 권한 캐시 관리
 * - TTL 기반 캐시 만료 (5분)
 * - 구독 변경 시 자동 무효화
 *
 * @example
 * ```tsx
 * <MCPPermissionProvider>
 *   <App />
 * </MCPPermissionProvider>
 * ```
 */
export function MCPPermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Map<ServiceId, PermissionInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  /**
   * 특정 서비스의 권한 확인
   *
   * @description
   * 1. 캐시 확인 (TTL 체크)
   * 2. 캐시 미스 시 Supabase에서 조회
   * 3. 결과를 캐시에 저장
   *
   * @param serviceId - 확인할 서비스 ID
   * @returns 권한 정보
   */
  const checkPermission = useCallback(async (serviceId: ServiceId): Promise<PermissionInfo> => {
    // 1. 캐시 확인
    const cached = permissions.get(serviceId);
    if (cached) {
      const now = new Date().getTime();
      const cachedTime = cached.checkedAt.getTime();

      // TTL 체크 (5분 이내면 캐시 반환)
      if (now - cachedTime < CACHE_TTL) {
        return cached;
      }
    }

    // 2. 캐시 미스 - Workers API 조회
    setIsLoading(true);
    try {
      // Workers 인증 토큰 확인
      const stored = localStorage.getItem('workers_auth_tokens');
      const tokens = stored ? JSON.parse(stored) : null;
      const accessToken = tokens?.accessToken;

      if (!accessToken) {
        const noAuthInfo: PermissionInfo = {
          permission: 'none',
          reason: 'subscription_required',
          checkedAt: new Date(),
        };

        // 캐시 업데이트
        setPermissions(prev => new Map(prev).set(serviceId, noAuthInfo));
        return noAuthInfo;
      }

      // Workers API를 통해 서비스별 구독 확인
      const { data: subscriptions, error } = await subscriptionsApi.getActiveSubscriptions(accessToken);

      if (error) {
        console.error('[MCPPermissionContext] 구독 조회 오류:', error);
        const errorInfo: PermissionInfo = {
          permission: 'none',
          reason: 'service_unavailable',
          checkedAt: new Date(),
        };

        setPermissions(prev => new Map(prev).set(serviceId, errorInfo));
        return errorInfo;
      }

      // 구독이 없는 경우
      if (!subscriptions || subscriptions.length === 0) {
        const noSubInfo: PermissionInfo = {
          permission: 'none',
          reason: 'subscription_required',
          checkedAt: new Date(),
        };

        setPermissions(prev => new Map(prev).set(serviceId, noSubInfo));
        return noSubInfo;
      }

      // 서비스 ID를 기반으로 구독 찾기
      // 서비스 ID는 'minu-find', 'minu-frame', 'minu-build', 'minu-keep' 형식
      // 각 서비스는 subscription_plans의 features에 feature_key로 매핑됨
      const serviceToFeaturePrefix: Record<ServiceId, string> = {
        'minu-find': 'find_',
        'minu-frame': 'frame_',
        'minu-build': 'build_',
        'minu-keep': 'keep_',
      };

      const featurePrefix = serviceToFeaturePrefix[serviceId];

      // 구독 중 해당 서비스를 지원하는 플랜 찾기
      // plan.features는 plan_features 테이블의 feature_key를 포함
      const relevantSubscription = subscriptions.find(sub => {
        const planFeatures = sub.plan?.features;
        if (!planFeatures || typeof planFeatures !== 'object') {
          return false;
        }

        // features가 배열 형식일 경우
        if (Array.isArray(planFeatures)) {
          return planFeatures.some((feature: Record<string, unknown>) =>
            typeof feature.feature_key === 'string' &&
            feature.feature_key.startsWith(featurePrefix)
          );
        }

        // features가 객체 형식일 경우 (키가 feature_key)
        return Object.keys(planFeatures).some(key =>
          key.startsWith(featurePrefix)
        );
      }) || subscriptions[0]; // 매칭 실패 시 첫 번째 구독 사용 (폴백)

      if (!relevantSubscription) {
        const noSubInfo: PermissionInfo = {
          permission: 'none',
          reason: 'subscription_required',
          checkedAt: new Date(),
        };

        setPermissions(prev => new Map(prev).set(serviceId, noSubInfo));
        return noSubInfo;
      }

      // 구독 만료 체크
      const now = new Date();
      const endDate = new Date(relevantSubscription.current_period_end);

      if (now > endDate) {
        const expiredInfo: PermissionInfo = {
          permission: 'none',
          reason: 'subscription_expired',
          checkedAt: new Date(),
        };

        setPermissions(prev => new Map(prev).set(serviceId, expiredInfo));
        return expiredInfo;
      }

      // 권한 결정 (플랜 기반)
      // 플랜 이름을 기준으로 권한 레벨 매핑
      // Free -> read, Basic -> write, Pro -> admin, Enterprise -> admin
      const planName = relevantSubscription.plan?.plan_name?.toLowerCase() || '';

      let permission: PermissionInfo['permission'] = 'read'; // 기본값

      if (planName.includes('enterprise')) {
        permission = 'admin'; // Enterprise: 최고 권한
      } else if (planName.includes('pro')) {
        permission = 'admin'; // Pro: 고급 관리 권한
      } else if (planName.includes('basic')) {
        permission = 'write'; // Basic: 쓰기 권한
      } else if (planName.includes('free')) {
        permission = 'read'; // Free: 읽기 권한만
      }
      // 플랜 이름을 매칭하지 못한 경우 기본값 'read' 유지

      const permissionInfo: PermissionInfo = {
        permission,
        checkedAt: new Date(),
      };

      // 캐시 업데이트
      setPermissions(prev => new Map(prev).set(serviceId, permissionInfo));
      return permissionInfo;

    } catch (error) {
      console.error('[MCPPermissionContext] 권한 확인 오류:', error);
      const errorInfo: PermissionInfo = {
        permission: 'none',
        reason: 'service_unavailable',
        checkedAt: new Date(),
      };

      setPermissions(prev => new Map(prev).set(serviceId, errorInfo));
      return errorInfo;
    } finally {
      setIsLoading(false);
    }
  }, [permissions]);

  /**
   * 특정 서비스 또는 전체 캐시 무효화
   *
   * @param serviceId - 무효화할 서비스 ID (없으면 전체 무효화)
   */
  const invalidateCache = useCallback((serviceId?: ServiceId) => {
    if (serviceId) {
      // 특정 서비스만 무효화
      setPermissions(prev => {
        const next = new Map(prev);
        next.delete(serviceId);
        return next;
      });
    } else {
      // 전체 무효화
      setPermissions(new Map());
    }
  }, []);

  /**
   * 전체 캐시 무효화 (별도 API)
   */
  const invalidateAll = useCallback(() => {
    setPermissions(new Map());
  }, []);

  /**
   * 구독 변경 감지 및 자동 캐시 무효화
   *
   * @description
   * - React Query의 구독 캐시 변경을 감지
   * - 변경 시 권한 캐시 자동 무효화
   */
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // 구독 관련 쿼리 변경 감지
      if (
        event.type === 'updated' &&
        event.query.queryKey[0] === 'subscriptions'
      ) {
        console.log('[MCPPermissionContext] 구독 변경 감지 - 캐시 무효화');
        invalidateAll();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, invalidateAll]);

  /**
   * Context Value 메모이제이션
   */
  const value = useMemo<MCPPermissionContextValue>(
    () => ({
      permissions,
      checkPermission,
      invalidateCache,
      invalidateAll,
      isLoading,
    }),
    [permissions, checkPermission, invalidateCache, invalidateAll, isLoading]
  );

  return (
    <MCPPermissionContext.Provider value={value}>
      {children}
    </MCPPermissionContext.Provider>
  );
}

/**
 * MCP 권한 Context 훅
 *
 * @throws Context가 Provider 외부에서 사용된 경우
 * @returns MCP 권한 Context 값
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { checkPermission, permissions } = useMCPPermissionContext();
 *
 *   useEffect(() => {
 *     checkPermission('minu-find');
 *   }, []);
 *
 *   const minuFindPermission = permissions.get('minu-find');
 *   // ...
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMCPPermissionContext(): MCPPermissionContextValue {
  const context = useContext(MCPPermissionContext);

  if (context === undefined) {
    throw new Error(
      'useMCPPermissionContext must be used within MCPPermissionProvider'
    );
  }

  return context;
}
