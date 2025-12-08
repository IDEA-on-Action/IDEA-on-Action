/**
 * useAuditLogs Hook - v2.36.0 Enhanced
 * 고도화된 감사 로그 조회 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  return useQuery({
    queryKey: QUERY_KEYS.list(filters, pagination),
    queryFn: async () => {
      // 기본 쿼리 구성
      let query = supabase
        .from('audit_log')
        .select(`
          *,
          actor:actor_id(id, email, raw_user_meta_data)
        `, { count: 'exact' });

      // 필터 적용
      if (filters.actor_id) {
        query = query.eq('actor_id', filters.actor_id);
      }

      if (filters.actor_type) {
        query = query.eq('actor_type', filters.actor_type);
      }

      if (filters.event_type) {
        query = query.eq('event_type', filters.event_type);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.resource_type) {
        query = query.eq('resource_type', filters.resource_type);
      }

      if (filters.resource_id) {
        query = query.eq('resource_id', filters.resource_id);
      }

      if (filters.session_id) {
        query = query.eq('session_id', filters.session_id);
      }

      if (filters.ip_address) {
        query = query.eq('ip_address', filters.ip_address);
      }

      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }

      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      // 정렬 및 페이지네이션
      query = query
        .order('created_at', { ascending: false })
        .range(
          pagination.page * pagination.pageSize,
          (pagination.page + 1) * pagination.pageSize - 1
        );

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        logs: data as AuditLogWithUser[],
        total: count || 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: count ? Math.ceil(count / pagination.pageSize) : 0,
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
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          *,
          actor:actor_id(id, email, raw_user_meta_data)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
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
  return useQuery({
    queryKey: QUERY_KEYS.statistics(startDate, endDate),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_audit_statistics', {
        p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate || new Date().toISOString(),
      });

      if (error) {
        console.warn('[useAuditStatistics] RPC function error:', error);
        return [] as AuditStatistics[];
      }

      return data as AuditStatistics[];
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
  return useQuery({
    queryKey: [...QUERY_KEYS.all, 'user-history', userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('actor_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AuditLogEntry[];
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
  return useQuery({
    queryKey: [...QUERY_KEYS.all, 'resource-history', resourceType, resourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          *,
          actor:actor_id(id, email)
        `)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AuditLogWithUser[];
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
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...QUERY_KEYS.all, 'realtime', limit],
    queryFn: async () => {
      // 최근 로그 조회
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Realtime 구독 설정 (한 번만)
      const channel = supabase
        .channel('audit_log_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_log',
          },
          (payload) => {
            const newLog = payload.new as AuditLogEntry;

            // 콜백 실행
            onNewLog?.(newLog);

            // 쿼리 무효화하여 새 데이터 가져오기
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
          }
        )
        .subscribe();

      // Cleanup
      return () => {
        channel.unsubscribe();
      };

      return data as AuditLogEntry[];
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
  return useQuery({
    queryKey: QUERY_KEYS.export(filters),
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select(`
          *,
          actor:actor_id(id, email)
        `);

      // 필터 적용 (동일한 로직)
      if (filters.actor_id) query = query.eq('actor_id', filters.actor_id);
      if (filters.event_type) query = query.eq('event_type', filters.event_type);
      if (filters.action) query = query.eq('action', filters.action);
      if (filters.resource_type) query = query.eq('resource_type', filters.resource_type);
      if (filters.start_date) query = query.gte('created_at', filters.start_date);
      if (filters.end_date) query = query.lte('created_at', filters.end_date);

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLogWithUser[];
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

  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase
        .from('audit_log')
        .delete()
        .eq('id', logId);

      if (error) throw error;
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
  return useQuery({
    queryKey: ['audit_logs_legacy', filters, limit],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:user_id(id, email)
        `);

      if (filters.user_id) query = query.eq('user_id', filters.user_id);
      if (filters.action) query = query.eq('action', filters.action);
      if (filters.resource) query = query.eq('resource', filters.resource);
      if (filters.start_date) query = query.gte('created_at', filters.start_date);
      if (filters.end_date) query = query.lte('created_at', filters.end_date);

      query = query.order('created_at', { ascending: false }).limit(limit);

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}
