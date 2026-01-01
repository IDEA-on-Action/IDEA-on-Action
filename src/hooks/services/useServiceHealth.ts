/**
 * useServiceHealth Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 서비스 헬스 상태 조회 및 모니터링을 위한 React 훅
 * 실시간 구독은 Workers WebSocket으로 대체 가능 (별도 구현 필요)
 *
 * @module hooks/useServiceHealth
 */

import { useQuery } from '@tanstack/react-query';
import { serviceHealthApi } from '@/integrations/cloudflare/client';
import type {
  ServiceHealth,
  ServiceId,
  HealthStatus,
} from '@/types/services/central-hub.types';

// ============================================================================
// Query Keys
// ============================================================================

export const serviceHealthKeys = {
  all: ['service-health'] as const,
  list: () => [...serviceHealthKeys.all, 'list'] as const,
  byService: (serviceId: ServiceId) =>
    [...serviceHealthKeys.all, 'service', serviceId] as const,
};

// ============================================================================
// 헬스 상태 조회
// ============================================================================

/**
 * 모든 서비스의 헬스 상태 조회
 */
export function useAllServiceHealth() {
  return useQuery({
    queryKey: serviceHealthKeys.list(),
    queryFn: async () => {
      const result = await serviceHealthApi.list();
      if (result.error) {
        console.error('서비스 헬스 조회 오류:', result.error);
        return [];
      }
      return (result.data as ServiceHealth[]) || [];
    },
    // 30초마다 자동 갱신
    refetchInterval: 30 * 1000,
  });
}

/**
 * 특정 서비스의 헬스 상태 조회
 */
export function useServiceHealth(serviceId: ServiceId) {
  return useQuery({
    queryKey: serviceHealthKeys.byService(serviceId),
    queryFn: async () => {
      const result = await serviceHealthApi.getByService(serviceId);
      if (result.error) {
        console.error('서비스별 헬스 조회 오류:', result.error);
        return null;
      }
      return result.data as ServiceHealth;
    },
    enabled: !!serviceId,
    // 30초마다 자동 갱신
    refetchInterval: 30 * 1000,
  });
}

// ============================================================================
// 헬스 상태 분석
// ============================================================================

/**
 * 전체 시스템 헬스 요약
 */
export function useSystemHealthSummary() {
  const { data: healthData, ...rest } = useAllServiceHealth();

  const summary = {
    totalServices: healthData?.length || 0,
    healthyCount: 0,
    degradedCount: 0,
    unhealthyCount: 0,
    unknownCount: 0,
    overallStatus: 'unknown' as HealthStatus,
    lastUpdated: null as string | null,
  };

  if (healthData) {
    healthData.forEach((service) => {
      switch (service.status) {
        case 'healthy':
          summary.healthyCount++;
          break;
        case 'degraded':
          summary.degradedCount++;
          break;
        case 'unhealthy':
          summary.unhealthyCount++;
          break;
        default:
          summary.unknownCount++;
      }

      // 가장 최근 업데이트 시간
      if (
        service.updated_at &&
        (!summary.lastUpdated || service.updated_at > summary.lastUpdated)
      ) {
        summary.lastUpdated = service.updated_at;
      }
    });

    // 전체 상태 결정
    if (summary.unhealthyCount > 0) {
      summary.overallStatus = 'unhealthy';
    } else if (summary.degradedCount > 0) {
      summary.overallStatus = 'degraded';
    } else if (summary.healthyCount === summary.totalServices) {
      summary.overallStatus = 'healthy';
    } else {
      summary.overallStatus = 'unknown';
    }
  }

  return { data: summary, ...rest };
}

/**
 * 서비스 연결 상태 확인 (마지막 ping이 5분 이내인지)
 */
export function useServiceConnectionStatus(serviceId: ServiceId) {
  const { data: health, ...rest } = useServiceHealth(serviceId);

  const isConnected = (() => {
    if (!health?.last_ping) return false;

    const lastPing = new Date(health.last_ping).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return now - lastPing < fiveMinutes;
  })();

  return {
    data: {
      ...health,
      isConnected,
      timeSinceLastPing: health?.last_ping
        ? Date.now() - new Date(health.last_ping).getTime()
        : null,
    },
    ...rest,
  };
}

// ============================================================================
// 실시간 구독 (Workers WebSocket으로 대체 - 별도 구현 필요)
// ============================================================================

/**
 * 서비스 헬스 실시간 구독
 *
 * NOTE: Supabase Realtime에서 Workers WebSocket으로 마이그레이션됨
 * 실시간 기능이 필요한 경우 realtimeApi.connect() 사용
 *
 * @deprecated Workers WebSocket 사용 권장
 */
export function useServiceHealthRealtime() {
  // Workers WebSocket으로 대체 필요
  // 현재는 빈 함수로 유지
  console.warn('useServiceHealthRealtime: Workers WebSocket으로 마이그레이션 필요');
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 헬스 상태에 따른 색상 반환
 */
export function getHealthStatusColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'text-green-500';
    case 'degraded':
      return 'text-yellow-500';
    case 'unhealthy':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * 헬스 상태에 따른 배경색 반환
 */
export function getHealthStatusBgColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'degraded':
      return 'bg-yellow-100 dark:bg-yellow-900/30';
    case 'unhealthy':
      return 'bg-red-100 dark:bg-red-900/30';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30';
  }
}

/**
 * 헬스 상태 라벨 반환
 */
export function getHealthStatusLabel(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return '정상';
    case 'degraded':
      return '저하됨';
    case 'unhealthy':
      return '장애';
    default:
      return '알 수 없음';
  }
}

/**
 * 마지막 ping 시간을 사람이 읽기 쉬운 형태로 반환
 */
export function formatLastPing(lastPing: string | null | undefined): string {
  if (!lastPing) return '없음';

  const diff = Date.now() - new Date(lastPing).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}시간 전`;
  } else if (minutes > 0) {
    return `${minutes}분 전`;
  } else {
    return `${seconds}초 전`;
  }
}
