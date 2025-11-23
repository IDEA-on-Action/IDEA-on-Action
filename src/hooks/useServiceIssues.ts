/**
 * useServiceIssues Hook
 *
 * 서비스 이슈 관리를 위한 React 훅
 *
 * @module hooks/useServiceIssues
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  ServiceIssue,
  ServiceIssueFilter,
  ServiceId,
  IssueSeverity,
  IssueStatus,
} from '@/types/central-hub.types';

// ============================================================================
// Query Keys
// ============================================================================

export const serviceIssueKeys = {
  all: ['service-issues'] as const,
  list: (filters?: ServiceIssueFilter) =>
    [...serviceIssueKeys.all, 'list', filters] as const,
  byService: (serviceId: ServiceId) =>
    [...serviceIssueKeys.all, 'service', serviceId] as const,
  byStatus: (status: IssueStatus) =>
    [...serviceIssueKeys.all, 'status', status] as const,
  detail: (id: string) => [...serviceIssueKeys.all, 'detail', id] as const,
  stats: () => [...serviceIssueKeys.all, 'stats'] as const,
};

// ============================================================================
// 이슈 목록 조회
// ============================================================================

/**
 * 서비스 이슈 목록 조회
 */
export function useServiceIssues(filters?: ServiceIssueFilter) {
  return useQuery({
    queryKey: serviceIssueKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('service_issues')
        .select('*')
        .order('created_at', { ascending: false });

      // 필터 적용
      if (filters?.service_id) {
        query = query.eq('service_id', filters.service_id);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
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
      return data as ServiceIssue[];
    },
  });
}

/**
 * 열린 이슈만 조회 (Open + In Progress)
 */
export function useOpenIssues(serviceId?: ServiceId) {
  return useQuery({
    queryKey: [...serviceIssueKeys.all, 'open', serviceId],
    queryFn: async () => {
      let query = supabase
        .from('service_issues')
        .select('*')
        .in('status', ['open', 'in_progress'])
        .order('severity', { ascending: true }) // critical 먼저
        .order('created_at', { ascending: false });

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ServiceIssue[];
    },
  });
}

/**
 * 이슈 상세 조회
 */
export function useServiceIssue(issueId: string) {
  return useQuery({
    queryKey: serviceIssueKeys.detail(issueId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_issues')
        .select('*')
        .eq('id', issueId)
        .single();

      if (error) throw error;
      return data as ServiceIssue;
    },
    enabled: !!issueId,
  });
}

// ============================================================================
// 이슈 통계
// ============================================================================

/**
 * 이슈 통계 조회
 */
export function useServiceIssueStats() {
  return useQuery({
    queryKey: serviceIssueKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_issues')
        .select('service_id, severity, status');

      if (error) throw error;

      // 통계 계산
      const stats = {
        total: data?.length || 0,
        byStatus: {} as Record<IssueStatus, number>,
        bySeverity: {} as Record<IssueSeverity, number>,
        byService: {} as Record<ServiceId, number>,
        openCount: 0,
        criticalCount: 0,
      };

      data?.forEach((issue) => {
        // 상태별
        const status = issue.status as IssueStatus;
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // 심각도별
        const severity = issue.severity as IssueSeverity;
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;

        // 서비스별
        const serviceId = issue.service_id as ServiceId;
        stats.byService[serviceId] = (stats.byService[serviceId] || 0) + 1;

        // 열린 이슈 카운트
        if (['open', 'in_progress'].includes(status)) {
          stats.openCount++;
        }

        // Critical 카운트
        if (severity === 'critical') {
          stats.criticalCount++;
        }
      });

      return stats;
    },
  });
}

// ============================================================================
// 이슈 수정
// ============================================================================

/**
 * 이슈 상태 업데이트
 */
export function useUpdateIssueStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      issueId,
      status,
      resolution,
    }: {
      issueId: string;
      status: IssueStatus;
      resolution?: string;
    }) => {
      const updateData: Partial<ServiceIssue> = { status };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        if (resolution) {
          updateData.resolution = resolution;
        }
      }

      const { data, error } = await supabase
        .from('service_issues')
        .update(updateData)
        .eq('id', issueId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceIssueKeys.all });
    },
  });
}

/**
 * 이슈 담당자 할당
 */
export function useAssignIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      issueId,
      assignedTo,
    }: {
      issueId: string;
      assignedTo: string;
    }) => {
      const { data, error } = await supabase
        .from('service_issues')
        .update({
          assigned_to: assignedTo,
          status: 'in_progress',
        })
        .eq('id', issueId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceIssueKeys.all });
    },
  });
}

// ============================================================================
// 실시간 구독
// ============================================================================

/**
 * 서비스 이슈 실시간 구독
 */
export function useServiceIssuesRealtime(serviceId?: ServiceId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channelName = serviceId
      ? `service-issues-${serviceId}`
      : 'service-issues-all';

    const channel = supabase
      .channel(channelName)
      .on<ServiceIssue>(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두
          schema: 'public',
          table: 'service_issues',
          filter: serviceId ? `service_id=eq.${serviceId}` : undefined,
        },
        (payload) => {
          console.log('Issue change:', payload.eventType, payload.new);

          // 관련 쿼리 무효화
          queryClient.invalidateQueries({
            queryKey: serviceIssueKeys.all,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceId, queryClient]);
}
