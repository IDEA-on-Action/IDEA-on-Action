/**
 * D1 데이터베이스 모니터링 훅
 * Cloudflare D1 성능 메트릭 조회
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import type {
  D1Metrics,
  D1TableStats,
  D1DatabaseHealth,
} from '@/types/shared/d1-monitoring.types';

// ============================================
// 쿼리 키
// ============================================

export const d1MonitoringKeys = {
  all: ['d1-monitoring'] as const,
  metrics: () => [...d1MonitoringKeys.all, 'metrics'] as const,
  tables: () => [...d1MonitoringKeys.all, 'tables'] as const,
  health: () => [...d1MonitoringKeys.all, 'health'] as const,
};

// ============================================
// API 응답 타입
// ============================================

interface D1MonitoringResponse {
  success: boolean;
  data?: D1Metrics;
  error?: string;
}

interface D1TablesResponse {
  success: boolean;
  data?: D1TableStats[];
  error?: string;
}

interface D1HealthResponse {
  success: boolean;
  data?: D1DatabaseHealth;
  error?: string;
}

// ============================================
// 메인 훅: D1 전체 메트릭
// ============================================

export interface UseD1MonitoringOptions {
  /** 자동 새로고침 간격 (ms) */
  refetchInterval?: number;
  /** 비활성화 여부 */
  enabled?: boolean;
}

export function useD1Monitoring(options: UseD1MonitoringOptions = {}) {
  const { refetchInterval = 30000, enabled = true } = options;

  const query = useQuery({
    queryKey: d1MonitoringKeys.metrics(),
    queryFn: async () => {
      const response = await callWorkersApi<D1MonitoringResponse>(
        '/monitoring/d1'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || response.data?.error || '메트릭 조회 실패');
      }

      return response.data.data;
    },
    refetchInterval,
    enabled,
    staleTime: 10000, // 10초간 캐시
  });

  return {
    metrics: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

// ============================================
// 테이블 통계 훅
// ============================================

export function useD1Tables(options: Pick<UseD1MonitoringOptions, 'enabled'> = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: d1MonitoringKeys.tables(),
    queryFn: async () => {
      const response = await callWorkersApi<D1TablesResponse>(
        '/monitoring/d1/tables'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || response.data?.error || '테이블 조회 실패');
      }

      return response.data.data;
    },
    enabled,
    staleTime: 60000, // 1분간 캐시
  });

  return {
    tables: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================
// 헬스 체크 훅
// ============================================

export function useD1Health(options: Pick<UseD1MonitoringOptions, 'refetchInterval' | 'enabled'> = {}) {
  const { refetchInterval = 10000, enabled = true } = options;

  const query = useQuery({
    queryKey: d1MonitoringKeys.health(),
    queryFn: async () => {
      const response = await callWorkersApi<D1HealthResponse>(
        '/monitoring/d1/health'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || response.data?.error || '헬스 체크 실패');
      }

      return response.data.data;
    },
    refetchInterval,
    enabled,
    staleTime: 5000, // 5초간 캐시
  });

  return {
    health: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================
// 리프레시 훅
// ============================================

export function useD1MonitoringRefresh() {
  const queryClient = useQueryClient();

  const refreshAll = async () => {
    await queryClient.invalidateQueries({
      queryKey: d1MonitoringKeys.all,
    });
  };

  const refreshMetrics = async () => {
    await queryClient.invalidateQueries({
      queryKey: d1MonitoringKeys.metrics(),
    });
  };

  const refreshTables = async () => {
    await queryClient.invalidateQueries({
      queryKey: d1MonitoringKeys.tables(),
    });
  };

  const refreshHealth = async () => {
    await queryClient.invalidateQueries({
      queryKey: d1MonitoringKeys.health(),
    });
  };

  return {
    refreshAll,
    refreshMetrics,
    refreshTables,
    refreshHealth,
  };
}
