/**
 * useServiceEvents Hook
 *
 * 서비스 이벤트 조회 및 실시간 구독을 위한 React 훅
 *
 * @module hooks/useServiceEvents
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      let query = supabase
        .from('service_events')
        .select('*')
        .order('created_at', { ascending: false });

      // 필터 적용
      if (filters?.service_id) {
        query = query.eq('service_id', filters.service_id);
      }
      if (filters?.event_type) {
        query = query.eq('event_type', filters.event_type);
      }
      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 10) - 1
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ServiceEvent[];
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
      const { data, error } = await supabase
        .from('service_events')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ServiceEvent[];
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
      const { data, error } = await supabase
        .from('service_events')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ServiceEvent[];
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// 실시간 구독
// ============================================================================

/**
 * 서비스 이벤트 실시간 구독
 *
 * 새 이벤트가 발생하면 자동으로 쿼리를 갱신합니다.
 */
export function useServiceEventsRealtime(
  filters?: Pick<ServiceEventFilter, 'service_id' | 'project_id'>
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 채널 이름 생성
    const channelName = filters?.service_id
      ? `service-events-${filters.service_id}`
      : filters?.project_id
      ? `service-events-project-${filters.project_id}`
      : 'service-events-all';

    // Realtime 구독 설정
    const channel = supabase
      .channel(channelName)
      .on<ServiceEvent>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_events',
          filter: filters?.service_id
            ? `service_id=eq.${filters.service_id}`
            : filters?.project_id
            ? `project_id=eq.${filters.project_id}`
            : undefined,
        },
        (payload) => {
          console.log('New service event:', payload.new);

          // 관련 쿼리 무효화
          queryClient.invalidateQueries({
            queryKey: serviceEventKeys.all,
          });
        }
      )
      .subscribe();

    // 클린업
    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters?.service_id, filters?.project_id, queryClient]);
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
      let query = supabase
        .from('service_events')
        .select('event_type, service_id');

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 이벤트 유형별 카운트
      const stats: Record<EventType, number> = {} as Record<EventType, number>;
      data?.forEach((event) => {
        const type = event.event_type as EventType;
        stats[type] = (stats[type] || 0) + 1;
      });

      return stats;
    },
  });
}
