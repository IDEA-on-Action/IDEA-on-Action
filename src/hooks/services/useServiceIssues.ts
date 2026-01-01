/**
 * useServiceIssues Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 서비스 이슈 관리를 위한 React 훅
 * 실시간 구독은 Workers WebSocket으로 대체 가능 (별도 구현 필요)
 *
 * @module hooks/useServiceIssues
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceIssuesApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import type {
  ServiceIssue,
  ServiceIssueFilter,
  ServiceId,
  IssueSeverity,
  IssueStatus,
} from '@/types/services/central-hub.types';

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
      const result = await serviceIssuesApi.list({
        service_id: filters?.service_id,
        severity: filters?.severity,
        status: filters?.status,
        project_id: filters?.project_id,
        assigned_to: filters?.assigned_to,
        limit: filters?.limit,
        offset: filters?.offset,
      });
      if (result.error) {
        console.error('서비스 이슈 조회 오류:', result.error);
        return [];
      }
      return (result.data as ServiceIssue[]) || [];
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
      const result = await serviceIssuesApi.getOpen(serviceId);
      if (result.error) {
        console.error('열린 이슈 조회 오류:', result.error);
        return [];
      }
      return (result.data as ServiceIssue[]) || [];
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
      const result = await serviceIssuesApi.getById(issueId);
      if (result.error) {
        console.error('이슈 상세 조회 오류:', result.error);
        return null;
      }
      return result.data as ServiceIssue;
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
      const result = await serviceIssuesApi.getStats();
      if (result.error) {
        console.error('이슈 통계 조회 오류:', result.error);
        return {
          total: 0,
          byStatus: {} as Record<IssueStatus, number>,
          bySeverity: {} as Record<IssueSeverity, number>,
          byService: {} as Record<ServiceId, number>,
          openCount: 0,
          criticalCount: 0,
        };
      }
      return result.data as {
        total: number;
        byStatus: Record<IssueStatus, number>;
        bySeverity: Record<IssueSeverity, number>;
        byService: Record<ServiceId, number>;
        openCount: number;
        criticalCount: number;
      };
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
  const { workersTokens } = useAuth();

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
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await serviceIssuesApi.updateStatus(
        workersTokens.accessToken,
        issueId,
        status,
        resolution
      );
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
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
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({
      issueId,
      assignedTo,
    }: {
      issueId: string;
      assignedTo: string;
    }) => {
      if (!workersTokens?.accessToken) {
        throw new Error('인증이 필요합니다');
      }
      const result = await serviceIssuesApi.assign(
        workersTokens.accessToken,
        issueId,
        assignedTo
      );
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceIssueKeys.all });
    },
  });
}

// ============================================================================
// 실시간 구독 (Workers WebSocket으로 대체 - 별도 구현 필요)
// ============================================================================

/**
 * 서비스 이슈 실시간 구독
 *
 * NOTE: Supabase Realtime에서 Workers WebSocket으로 마이그레이션됨
 * 실시간 기능이 필요한 경우 realtimeApi.connect() 사용
 *
 * @deprecated Workers WebSocket 사용 권장
 */
export function useServiceIssuesRealtime(_serviceId?: ServiceId) {
  // Workers WebSocket으로 대체 필요
  // 현재는 빈 함수로 유지
  console.warn('useServiceIssuesRealtime: Workers WebSocket으로 마이그레이션 필요');
}
