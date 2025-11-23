/**
 * MCP Sync Hooks
 *
 * MCP 상태 동기화 및 캐시 관리를 위한 React 훅
 * - useMCPSync: 전체 서비스 상태 동기화
 * - useMCPServiceSync: 단일 서비스 상태 동기화
 * - useMCPCache: 캐시 관리
 *
 * @module hooks/useMCPSync
 */

import { useEffect, useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cacheConfig } from '@/lib/react-query';
import type { ServiceId, HealthStatus, ServiceHealth } from '@/types/central-hub.types';
import type {
  MCPServiceState,
  MCPSyncResult,
  MCPServiceSyncResult,
  MCPCacheResult,
  UseMCPSyncOptions,
  UseMCPServiceSyncOptions,
  UseMCPCacheOptions,
  MCPRealtimePayload,
  DEFAULT_CACHE_TTL,
  DEFAULT_STALE_TIME,
  DEFAULT_GC_TIME,
  DEFAULT_REFRESH_INTERVAL,
  DEFAULT_RETRY_COUNT,
} from '@/types/mcp-sync.types';
import { createMCPSyncError } from '@/types/mcp-sync.types';

// ============================================================================
// Constants
// ============================================================================

/** 기본 TTL (5분) */
const CACHE_TTL = 5 * 60 * 1000;

/** 기본 stale time (5분) */
const STALE_TIME = 5 * 60 * 1000;

/** 기본 gc time (10분) */
const GC_TIME = 10 * 60 * 1000;

/** 기본 자동 갱신 간격 (30초) */
const REFRESH_INTERVAL = 30 * 1000;

/** 재시도 횟수 */
const RETRY_COUNT = 3;

// ============================================================================
// Query Keys
// ============================================================================

export const mcpSyncQueryKeys = {
  all: ['mcp-sync'] as const,
  states: () => [...mcpSyncQueryKeys.all, 'states'] as const,
  state: (serviceId: ServiceId) => [...mcpSyncQueryKeys.all, 'state', serviceId] as const,
  cache: () => [...mcpSyncQueryKeys.all, 'cache'] as const,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * ServiceHealth를 MCPServiceState로 변환
 */
function toMCPServiceState(health: ServiceHealth): MCPServiceState {
  return {
    service_name: health.service_id,
    status: health.status,
    last_heartbeat: health.updated_at,
    version: (health.metrics?.version as string) || '1.0.0',
    metrics: {
      response_time_ms: health.metrics?.response_time_ms || 0,
      error_rate: health.metrics?.error_rate || 0,
      request_count: health.metrics?.request_count || 0,
      uptime_percent: health.metrics?.uptime_percent || 100,
      memory_usage_mb: health.metrics?.memory_usage_mb || 0,
      cpu_usage_percent: health.metrics?.cpu_usage_percent || 0,
    },
  };
}

// ============================================================================
// useMCPSync Hook
// ============================================================================

/**
 * MCP 전체 서비스 상태 동기화 훅
 *
 * 모든 Minu 서비스의 상태를 조회하고 Realtime으로 동기화합니다.
 *
 * @param options - 동기화 옵션
 * @returns 동기화 결과 (states, isLoading, error, refresh, invalidate)
 *
 * @example
 * ```tsx
 * function ServiceDashboard() {
 *   const { states, isLoading, error, refresh, invalidate } = useMCPSync({
 *     autoRefresh: true,
 *     refreshInterval: 30000,
 *     enableRealtime: true,
 *   });
 *
 *   if (isLoading) return <div>로딩 중...</div>;
 *   if (error) return <div>에러: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {states.map((state) => (
 *         <ServiceCard key={state.service_name} state={state} />
 *       ))}
 *       <button onClick={refresh}>새로고침</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMCPSync(options: UseMCPSyncOptions = {}): MCPSyncResult {
  const {
    autoRefresh = true,
    refreshInterval = REFRESH_INTERVAL,
    enableRealtime = true,
    useCachedFirst = true,
  } = options;

  const queryClient = useQueryClient();

  // ========================================================================
  // 상태 조회 쿼리
  // ========================================================================

  const {
    data: states = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: mcpSyncQueryKeys.states(),
    queryFn: async (): Promise<MCPServiceState[]> => {
      const { data, error: queryError } = await supabase
        .from('service_health')
        .select('*')
        .order('service_id');

      if (queryError) {
        throw createMCPSyncError('MCP_SYNC_001', queryError.message);
      }

      return (data as ServiceHealth[]).map(toMCPServiceState);
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: RETRY_COUNT,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // ========================================================================
  // Realtime 구독
  // ========================================================================

  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel('mcp-sync-states')
      .on<ServiceHealth>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_health',
        },
        (payload) => {
          console.log('[MCP Sync] Realtime 이벤트:', payload.eventType);

          // 쿼리 캐시 무효화
          queryClient.invalidateQueries({
            queryKey: mcpSyncQueryKeys.states(),
          });

          // 개별 서비스 캐시도 무효화
          const newData = payload.new as ServiceHealth | undefined;
          if (newData?.service_id) {
            queryClient.invalidateQueries({
              queryKey: mcpSyncQueryKeys.state(newData.service_id),
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[MCP Sync] Realtime 채널 에러');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, queryClient]);

  // ========================================================================
  // Public API
  // ========================================================================

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: mcpSyncQueryKeys.all,
    });
  }, [queryClient]);

  return {
    states,
    isLoading,
    error: error as Error | null,
    refresh,
    invalidate,
  };
}

// ============================================================================
// useMCPServiceSync Hook
// ============================================================================

/**
 * MCP 단일 서비스 상태 동기화 훅
 *
 * 특정 Minu 서비스의 상태를 조회하고 Realtime으로 동기화합니다.
 *
 * @param options - 동기화 옵션 (serviceId 필수)
 * @returns 동기화 결과 (state, isLoading, error, refresh, invalidate)
 *
 * @example
 * ```tsx
 * function MinuFindStatus() {
 *   const { state, isLoading, error, refresh } = useMCPServiceSync({
 *     serviceId: 'minu-find',
 *     autoRefresh: true,
 *   });
 *
 *   if (isLoading) return <div>로딩 중...</div>;
 *   if (error) return <div>에러: {error.message}</div>;
 *   if (!state) return <div>서비스 정보 없음</div>;
 *
 *   return (
 *     <div>
 *       <p>상태: {state.status}</p>
 *       <p>버전: {state.version}</p>
 *       <button onClick={refresh}>새로고침</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMCPServiceSync(options: UseMCPServiceSyncOptions): MCPServiceSyncResult {
  const {
    serviceId,
    autoRefresh = true,
    refreshInterval = REFRESH_INTERVAL,
    enableRealtime = true,
  } = options;

  const queryClient = useQueryClient();

  // ========================================================================
  // 상태 조회 쿼리
  // ========================================================================

  const {
    data: state = null,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: mcpSyncQueryKeys.state(serviceId),
    queryFn: async (): Promise<MCPServiceState | null> => {
      const { data, error: queryError } = await supabase
        .from('service_health')
        .select('*')
        .eq('service_id', serviceId)
        .single();

      if (queryError) {
        // PGRST116: No rows returned (서비스가 없는 경우)
        if (queryError.code === 'PGRST116') {
          return null;
        }
        throw createMCPSyncError('MCP_SYNC_001', queryError.message);
      }

      return toMCPServiceState(data as ServiceHealth);
    },
    enabled: !!serviceId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: RETRY_COUNT,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // ========================================================================
  // Realtime 구독
  // ========================================================================

  useEffect(() => {
    if (!enableRealtime || !serviceId) return;

    const channel = supabase
      .channel(`mcp-sync-service-${serviceId}`)
      .on<ServiceHealth>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_health',
          filter: `service_id=eq.${serviceId}`,
        },
        (payload) => {
          console.log(`[MCP Sync] ${serviceId} Realtime 이벤트:`, payload.eventType);

          // 쿼리 캐시 무효화
          queryClient.invalidateQueries({
            queryKey: mcpSyncQueryKeys.state(serviceId),
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`[MCP Sync] ${serviceId} Realtime 채널 에러`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, serviceId, queryClient]);

  // ========================================================================
  // Public API
  // ========================================================================

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: mcpSyncQueryKeys.state(serviceId),
    });
  }, [queryClient, serviceId]);

  return {
    state,
    isLoading,
    error: error as Error | null,
    refresh,
    invalidate,
  };
}

// ============================================================================
// useMCPCache Hook
// ============================================================================

/**
 * MCP 캐시 관리 훅
 *
 * 서비스 상태 캐시를 관리하고, TTL 기반으로 자동 만료 처리합니다.
 *
 * @param options - 캐시 옵션
 * @returns 캐시 결과 (cachedStates, isCacheHit, lastUpdated, invalidate, refresh, isStale)
 *
 * @example
 * ```tsx
 * function CacheStatus() {
 *   const {
 *     cachedStates,
 *     isCacheHit,
 *     lastUpdated,
 *     isStale,
 *     refresh,
 *     invalidate,
 *   } = useMCPCache({
 *     ttl: 5 * 60 * 1000, // 5분
 *     autoRefresh: false,
 *   });
 *
 *   return (
 *     <div>
 *       <p>캐시 히트: {isCacheHit ? '예' : '아니오'}</p>
 *       <p>마지막 갱신: {lastUpdated?.toLocaleString()}</p>
 *       <p>만료됨: {isStale ? '예' : '아니오'}</p>
 *       <button onClick={refresh}>갱신</button>
 *       <button onClick={invalidate}>무효화</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMCPCache(options: UseMCPCacheOptions = {}): MCPCacheResult {
  const {
    ttl = CACHE_TTL,
    autoRefresh = false,
    refreshInterval = CACHE_TTL,
  } = options;

  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ========================================================================
  // 캐시 조회 쿼리
  // ========================================================================

  const {
    data: cachedStates = [],
    isLoading,
    isFetching,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: mcpSyncQueryKeys.cache(),
    queryFn: async (): Promise<MCPServiceState[]> => {
      const { data, error: queryError } = await supabase
        .from('service_health')
        .select('*')
        .order('service_id');

      if (queryError) {
        throw createMCPSyncError('MCP_SYNC_001', queryError.message);
      }

      setLastUpdated(new Date());
      return (data as ServiceHealth[]).map(toMCPServiceState);
    },
    staleTime: ttl,
    gcTime: ttl * 2,
    retry: RETRY_COUNT,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // ========================================================================
  // 캐시 상태 계산
  // ========================================================================

  const isCacheHit = useMemo(() => {
    return !isLoading && !isFetching && cachedStates.length > 0;
  }, [isLoading, isFetching, cachedStates.length]);

  const isStale = useMemo(() => {
    if (!dataUpdatedAt) return true;
    return Date.now() - dataUpdatedAt > ttl;
  }, [dataUpdatedAt, ttl]);

  // ========================================================================
  // Public API
  // ========================================================================

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: mcpSyncQueryKeys.cache(),
    });
    queryClient.invalidateQueries({
      queryKey: mcpSyncQueryKeys.states(),
    });
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await refetch();
    setLastUpdated(new Date());
  }, [refetch]);

  return {
    cachedStates,
    isCacheHit,
    lastUpdated,
    invalidate,
    refresh,
    isStale,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * 서비스 상태 변경 감지 훅
 *
 * 특정 서비스의 상태 변경을 감지하여 콜백을 실행합니다.
 *
 * @param serviceId - 감시할 서비스 ID
 * @param onStatusChange - 상태 변경 시 호출될 콜백
 *
 * @example
 * ```tsx
 * function StatusMonitor() {
 *   useMCPStatusChange('minu-find', (newStatus, oldStatus) => {
 *     if (oldStatus === 'healthy' && newStatus === 'unhealthy') {
 *       alert('Minu Find 서비스 장애 발생!');
 *     }
 *   });
 *
 *   return <div>상태 모니터링 중...</div>;
 * }
 * ```
 */
export function useMCPStatusChange(
  serviceId: ServiceId,
  onStatusChange: (newStatus: HealthStatus, oldStatus: HealthStatus | null) => void
) {
  const { state } = useMCPServiceSync({ serviceId, enableRealtime: true });
  const [prevStatus, setPrevStatus] = useState<HealthStatus | null>(null);

  useEffect(() => {
    if (!state) return;

    if (prevStatus !== null && prevStatus !== state.status) {
      onStatusChange(state.status, prevStatus);
    }

    setPrevStatus(state.status);
  }, [state, prevStatus, onStatusChange]);
}

/**
 * 모든 서비스 건강 상태 요약 훅
 *
 * @returns 전체 시스템 상태 요약
 *
 * @example
 * ```tsx
 * function SystemHealth() {
 *   const { healthyCount, unhealthyCount, overallStatus } = useMCPHealthSummary();
 *
 *   return (
 *     <div>
 *       <p>정상: {healthyCount}개</p>
 *       <p>장애: {unhealthyCount}개</p>
 *       <p>전체 상태: {overallStatus}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMCPHealthSummary() {
  const { states, isLoading, error } = useMCPSync();

  const summary = useMemo(() => {
    const result = {
      totalServices: states.length,
      healthyCount: 0,
      degradedCount: 0,
      unhealthyCount: 0,
      unknownCount: 0,
      overallStatus: 'unknown' as HealthStatus,
    };

    states.forEach((state) => {
      switch (state.status) {
        case 'healthy':
          result.healthyCount++;
          break;
        case 'degraded':
          result.degradedCount++;
          break;
        case 'unhealthy':
          result.unhealthyCount++;
          break;
        default:
          result.unknownCount++;
      }
    });

    // 전체 상태 결정
    if (result.unhealthyCount > 0) {
      result.overallStatus = 'unhealthy';
    } else if (result.degradedCount > 0) {
      result.overallStatus = 'degraded';
    } else if (result.healthyCount === result.totalServices && result.totalServices > 0) {
      result.overallStatus = 'healthy';
    }

    return result;
  }, [states]);

  return {
    ...summary,
    isLoading,
    error,
  };
}

export default useMCPSync;
