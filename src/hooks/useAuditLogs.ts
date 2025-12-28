/**
 * useAuditLogs Hook - v2.36.0 Enhanced
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 고도화된 감사 로그 조회 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callWorkersApi, realtimeApi } from '@/integrations/cloudflare/client';
import { useAuth } from './useAuth';
import { devLog } from '@/lib/errors';
import type {
  AuditLogEntry,
  AuditLogWithUser,
  AuditLogFilters,
  AuditLogPagination,
  AuditStatistics,
} from '@/types/audit.types';

// ============================================================================
// Query Keys
// ============================================================================

const QUERY_KEYS = {
  all: ['audit_log'] as const,
  list: (filters?: AuditLogFilters, pagination?: AuditLogPagination) =>
    [...QUERY_KEYS.all, 'list', filters, pagination] as const,
  detail: (id: string) => [...QUERY_KEYS.all, 'detail', id] as const,
  statistics: (startDate?: string, endDate?: string) =>
    [...QUERY_KEYS.all, 'statistics', startDate, endDate] as const,
  export: (filters?: AuditLogFilters) => [...QUERY_KEYS.all, 'export', filters] as const,
};

// ============================================================================
// 1. 기본 감사 로그 조회 훅
// ============================================================================

/**
 * 감사 로그 목록 조회
 *
 * @param filters 필터 옵션
 * @param pagination 페이지네이션 옵션
 * @returns 감사 로그 목록 쿼리 결과
 *
 * @example
 * ```typescript
 * const { data: logs, isLoading } = useAuditLogs({
 *   event_type: 'user.login',
 *   start_date: '2025-12-01',
 *   end_date: '2025-12-31'
 * }, { page: 0, pageSize: 50 });
 * ```
 */
export function useAuditLogs(
  filters: AuditLogFilters = {},
  pagination: AuditLogPagination = { page: 0, pageSize: 100 }
) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.list(filters, pagination),
    queryFn: async () => {
      const token = workersTokens?.accessToken;

      // URL 파라미터 구성
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('page_size', pagination.pageSize.toString());
      params.append('order_by', 'created_at:desc');

      if (filters.actor_id) params.append('actor_id', filters.actor_id);
      if (filters.actor_type) params.append('actor_type', filters.actor_type);
      if (filters.event_type) params.append('event_type', filters.event_type);
      if (filters.action) params.append('action', filters.action);
      if (filters.resource_type) params.append('resource_type', filters.resource_type);
      if (filters.resource_id) params.append('resource_id', filters.resource_id);
      if (filters.session_id) params.append('session_id', filters.session_id);
      if (filters.ip_address) params.append('ip_address', filters.ip_address);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const { data, error } = await callWorkersApi<{
        logs: AuditLogWithUser[];
        total: number;
      }>(`/api/v1/audit-logs?${params.toString()}`, { token });

      if (error) {
        devLog('Audit logs error:', error);
        return {
          logs: [] as AuditLogWithUser[],
          total: 0,
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalPages: 0,
        };
      }

      const total = data?.total || 0;
      return {
        logs: data?.logs || [],
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: total ? Math.ceil(total / pagination.pageSize) : 0,
      };
    },
    staleTime: 30 * 1000, // 30초 캐싱
  });
}

// ============================================================================
// 2. 단일 감사 로그 상세 조회
// ============================================================================

/**
 * 특정 감사 로그 상세 조회
 *
 * @param id 감사 로그 ID
 * @returns 감사 로그 상세 정보
 */
export function useAuditLog(id: string) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<AuditLogWithUser>(
        `/api/v1/audit-logs/${id}`,
        { token }
      );

      if (error) throw new Error(error);
      return data as AuditLogWithUser;
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1분 캐싱
  });
}

// ============================================================================
// 3. 감사 로그 통계 조회
// ============================================================================

/**
 * 감사 로그 통계 조회
 *
 * @param startDate 시작 날짜 (ISO 문자열)
 * @param endDate 종료 날짜 (ISO 문자열)
 * @returns 이벤트별 통계 데이터
 */
export function useAuditStatistics(startDate?: string, endDate?: string) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.statistics(startDate, endDate),
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();

      const { data, error } = await callWorkersApi<AuditStatistics[]>(
        `/api/v1/audit-logs/statistics?start_date=${start}&end_date=${end}`,
        { token }
      );

      if (error) {
        devLog('Audit statistics error:', error);
        return [] as AuditStatistics[];
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5분 캐싱
  });
}

// ============================================================================
// 4. 사용자별 감사 로그 조회
// ============================================================================

/**
 * 특정 사용자의 최근 활동 조회
 *
 * @param userId 사용자 ID
 * @param limit 조회 개수
 * @returns 사용자의 최근 감사 로그
 */
export function useUserAuditHistory(userId: string, limit = 50) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEYS.all, 'user-history', userId, limit],
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<AuditLogEntry[]>(
        `/api/v1/audit-logs?actor_id=${userId}&limit=${limit}&order_by=created_at:desc`,
        { token }
      );

      if (error) {
        devLog('User audit history error:', error);
        return [] as AuditLogEntry[];
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1분 캐싱
  });
}

// ============================================================================
// 5. 리소스별 감사 로그 조회
// ============================================================================

/**
 * 특정 리소스의 변경 이력 조회
 *
 * @param resourceType 리소스 타입
 * @param resourceId 리소스 ID
 * @returns 리소스 변경 이력
 */
export function useResourceAuditHistory(resourceType: string, resourceId: string) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEYS.all, 'resource-history', resourceType, resourceId],
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<AuditLogWithUser[]>(
        `/api/v1/audit-logs?resource_type=${resourceType}&resource_id=${resourceId}&order_by=created_at:desc`,
        { token }
      );

      if (error) {
        devLog('Resource audit history error:', error);
        return [] as AuditLogWithUser[];
      }

      return data || [];
    },
    enabled: !!(resourceType && resourceId),
    staleTime: 60 * 1000, // 1분 캐싱
  });
}

// ============================================================================
// 6. 실시간 감사 로그 구독
// ============================================================================

/**
 * 실시간 감사 로그 스트림 구독
 *
 * @param onNewLog 새 로그 콜백
 * @returns 최근 감사 로그 목록
 */
export function useRealtimeAuditLogs(
  onNewLog?: (log: AuditLogEntry) => void,
  limit = 20
) {
  const { workersTokens, user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...QUERY_KEYS.all, 'realtime', limit],
    queryFn: async () => {
      const token = workersTokens?.accessToken;

      // 최근 로그 조회
      const { data, error } = await callWorkersApi<AuditLogEntry[]>(
        `/api/v1/audit-logs?limit=${limit}&order_by=created_at:desc`,
        { token }
      );

      if (error) {
        devLog('Realtime audit logs error:', error);
        return [] as AuditLogEntry[];
      }

      // WebSocket 연결로 실시간 감사 로그 수신
      if (user) {
        const ws = realtimeApi.connect(`audit-logs-${user.id}`, user.id);

        ws.onmessage = (event) => {
          try {
            const newLog = JSON.parse(event.data) as AuditLogEntry;
            onNewLog?.(newLog);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
          } catch (e) {
            devLog('Audit log message parse error:', e);
          }
        };
      }

      return data || [];
    },
    staleTime: 10 * 1000, // 10초 캐싱
  });
}

// ============================================================================
// 7. 감사 로그 내보내기
// ============================================================================

/**
 * 감사 로그 내보내기 (JSON)
 *
 * @param filters 필터 옵션
 * @returns 내보내기용 감사 로그 데이터
 */
export function useAuditLogsExport(filters: AuditLogFilters = {}) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.export(filters),
    queryFn: async () => {
      const token = workersTokens?.accessToken;

      const params = new URLSearchParams();
      params.append('order_by', 'created_at:desc');
      params.append('limit', '10000'); // 내보내기용 대량 조회

      if (filters.actor_id) params.append('actor_id', filters.actor_id);
      if (filters.event_type) params.append('event_type', filters.event_type);
      if (filters.action) params.append('action', filters.action);
      if (filters.resource_type) params.append('resource_type', filters.resource_type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const { data, error } = await callWorkersApi<AuditLogWithUser[]>(
        `/api/v1/audit-logs/export?${params.toString()}`,
        { token }
      );

      if (error) throw new Error(error);
      return data || [];
    },
    enabled: false, // 수동으로만 실행
    staleTime: 0, // 캐싱 없음
  });
}

// ============================================================================
// 8. Mutation: 감사 로그 삭제 (관리자 전용)
// ============================================================================

/**
 * 감사 로그 삭제 (관리자 전용)
 *
 * @returns 삭제 Mutation
 */
export function useDeleteAuditLog() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (logId: string) => {
      const token = workersTokens?.accessToken;
      const { error } = await callWorkersApi(
        `/api/v1/audit-logs/${logId}`,
        {
          method: 'DELETE',
          token,
        }
      );

      if (error) throw new Error(error);
    },
    onSuccess: () => {
      // 모든 감사 로그 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Legacy Support: 기존 RBAC 테이블 호환성
// ============================================================================

/**
 * 기존 audit_logs 테이블 조회 (하위 호환성)
 * v2.36.0 이전 버전과의 호환성을 위해 유지
 */
export function useLegacyAuditLogs(
  filters: { user_id?: string; action?: string; resource?: string; start_date?: string; end_date?: string } = {},
  limit = 100
) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: ['audit_logs_legacy', filters, limit],
    queryFn: async () => {
      const token = workersTokens?.accessToken;

      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('order_by', 'created_at:desc');

      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.action) params.append('action', filters.action);
      if (filters.resource) params.append('resource', filters.resource);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const { data, error } = await callWorkersApi(
        `/api/v1/audit-logs/legacy?${params.toString()}`,
        { token }
      );

      if (error) {
        devLog('Legacy audit logs error:', error);
        return [];
      }

      return data || [];
    },
  });
}
