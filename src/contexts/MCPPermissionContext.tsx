import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

    // 2. 캐시 미스 - DB 조회
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const noAuthInfo: PermissionInfo = {
          permission: 'none',
          reason: 'subscription_required',
          checkedAt: new Date(),
        };

        // 캐시 업데이트
        setPermissions(prev => new Map(prev).set(serviceId, noAuthInfo));
        return noAuthInfo;
      }

      // 서비스별 구독 확인
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans (
            id,
            plan_name,
            features
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

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
      // 예: 'minu-find' -> service slug에서 'minu-find' 포함
      // TODO: 실제 서비스 매핑 로직 구현 필요
      // 현재는 첫 번째 활성 구독 사용 (임시)
      const relevantSubscription = subscriptions[0];

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
      // TODO: 실제 플랜별 권한 매핑 로직 구현 필요
      const permissionInfo: PermissionInfo = {
        permission: 'read', // 기본 read 권한
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
