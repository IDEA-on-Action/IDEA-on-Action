/**
 * useServiceEvents Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 서비스 이벤트 조회를 위한 React 훅
 * 실시간 구독은 Workers WebSocket으로 대체 가능 (별도 구현 필요)
 *
 * @module hooks/useServiceEvents
 */

import { useQuery } from '@tanstack/react-query';
import { serviceEventsApi } from '@/integrations/cloudflare/client';
import type {
  ServiceEvent,
  ServiceEventFilter,
  ServiceId,
  EventType,
} from '@/types/central-hub.types';

// ============================================================================
// Query Keys
// ============================================================================

export const serviceEventKeys = {
  all: ['service-events'] as const,
  list: (filters?: ServiceEventFilter) =>
    [...serviceEventKeys.all, 'list', filters] as const,
  byService: (serviceId: ServiceId) =>
    [...serviceEventKeys.all, 'service', serviceId] as const,
  byProject: (projectId: string) =>
    [...serviceEventKeys.all, 'project', projectId] as const,
};

// ============================================================================
// 이벤트 목록 조회
// ============================================================================

/**
 * 서비스 이벤트 목록 조회
 */
export function useServiceEvents(filters?: ServiceEventFilter) {
  return useQuery({
    queryKey: serviceEventKeys.list(filters),
    queryFn: async () => {
      const result = await serviceEventsApi.list({
        service_id: filters?.service_id,
        event_type: filters?.event_type,
        project_id: filters?.project_id,
        from_date: filters?.from_date,
        to_date: filters?.to_date,
        limit: filters?.limit,
        offset: filters?.offset,
      });
      if (result.error) {
        console.error('서비스 이벤트 조회 오류:', result.error);
        return [];
      }
      return (result.data as ServiceEvent[]) || [];
    },
  });
}

/**
 * 특정 서비스의 이벤트 조회
 */
export function useServiceEventsByService(serviceId: ServiceId, limit = 50) {
  return useQuery({
    queryKey: serviceEventKeys.byService(serviceId),
    queryFn: async () => {
      const result = await serviceEventsApi.getByService(serviceId, limit);
      if (result.error) {
        console.error('서비스별 이벤트 조회 오류:', result.error);
        return [];
      }
      return (result.data as ServiceEvent[]) || [];
    },
  });
}

/**
 * 특정 프로젝트의 이벤트 조회
 */
export function useServiceEventsByProject(projectId: string, limit = 50) {
  return useQuery({
    queryKey: serviceEventKeys.byProject(projectId),
    queryFn: async () => {
      const result = await serviceEventsApi.getByProject(projectId, limit);
      if (result.error) {
        console.error('프로젝트별 이벤트 조회 오류:', result.error);
        return [];
      }
      return (result.data as ServiceEvent[]) || [];
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// 실시간 구독 (Workers WebSocket으로 대체 - 별도 구현 필요)
// ============================================================================

/**
 * 서비스 이벤트 실시간 구독
 *
 * NOTE: Supabase Realtime에서 Workers WebSocket으로 마이그레이션됨
 * 실시간 기능이 필요한 경우 realtimeApi.connect() 사용
 *
 * @deprecated Workers WebSocket 사용 권장
 */
export function useServiceEventsRealtime(
  _filters?: Pick<ServiceEventFilter, 'service_id' | 'project_id'>
) {
  // Workers WebSocket으로 대체 필요
  // 현재는 빈 함수로 유지
  console.warn('useServiceEventsRealtime: Workers WebSocket으로 마이그레이션 필요');
}

// ============================================================================
// 이벤트 통계
// ============================================================================

/**
 * 서비스별 이벤트 통계
 */
export function useServiceEventStats(serviceId?: ServiceId) {
  return useQuery({
    queryKey: [...serviceEventKeys.all, 'stats', serviceId],
    queryFn: async () => {
      const result = await serviceEventsApi.getStats(serviceId);
      if (result.error) {
        console.error('이벤트 통계 조회 오류:', result.error);
        return {} as Record<EventType, number>;
      }
      return (result.data as Record<EventType, number>) || ({} as Record<EventType, number>);
    },
  });
}
