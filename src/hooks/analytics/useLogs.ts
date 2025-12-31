/**
 * useLogs Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 로그 관련 React Query 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import { devLog } from '@/lib/errors';
import type { Log } from '@/types/v2';

// ============================================================================
// Query Keys
// ============================================================================

const QUERY_KEYS = {
  all: ['logs'] as const,
  list: (limit?: number) => [...QUERY_KEYS.all, 'list', limit] as const,
  byType: (type?: Log['type'], limit?: number) => [...QUERY_KEYS.all, 'type', type, limit] as const,
  byProject: (projectId: string, limit?: number) => [...QUERY_KEYS.all, 'project', projectId, limit] as const,
};

// ============================================================================
// 1. 전체 로그 조회
// ============================================================================

/**
 * Hook to fetch all logs
 */
export const useLogs = (limit?: number) => {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.list(limit),
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const params = new URLSearchParams();
      params.append('order_by', 'created_at:desc');
      if (limit) params.append('limit', limit.toString());

      const { data, error } = await callWorkersApi<Log[]>(
        `/api/v1/logs?${params.toString()}`,
        { token }
      );

      if (error) {
        devLog('Logs fetch error:', error);
        return [] as Log[];
      }

      return data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// ============================================================================
// 2. 타입별 로그 조회
// ============================================================================

/**
 * Hook to fetch logs by type
 */
export const useLogsByType = (type?: Log['type'], limit?: number) => {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.byType(type, limit),
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const params = new URLSearchParams();
      params.append('order_by', 'created_at:desc');
      if (type) params.append('type', type);
      if (limit) params.append('limit', limit.toString());

      const { data, error } = await callWorkersApi<Log[]>(
        `/api/v1/logs?${params.toString()}`,
        { token }
      );

      if (error) {
        devLog('Logs by type error:', error);
        return [] as Log[];
      }

      return data || [];
    },
    staleTime: 1 * 60 * 1000,
  });
};

// ============================================================================
// 3. 프로젝트별 로그 조회
// ============================================================================

/**
 * Hook to fetch logs by project
 */
export const useLogsByProject = (projectId: string, limit?: number) => {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.byProject(projectId, limit),
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      params.append('order_by', 'created_at:desc');
      if (limit) params.append('limit', limit.toString());

      const { data, error } = await callWorkersApi<Log[]>(
        `/api/v1/logs?${params.toString()}`,
        { token }
      );

      if (error) {
        devLog('Logs by project error:', error);
        return [] as Log[];
      }

      return data || [];
    },
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000,
  });
};

// ============================================================================
// 4. 로그 생성 (Admin only)
// ============================================================================

/**
 * Hook to create a new log (Admin only)
 */
export const useCreateLog = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (log: Omit<Log, 'id' | 'created_at' | 'updated_at'>) => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<Log>(
        '/api/v1/logs',
        {
          method: 'POST',
          token,
          body: log,
        }
      );

      if (error) throw new Error(error);
      return data as Log;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
};

// ============================================================================
// 5. 로그 수정 (Admin only)
// ============================================================================

/**
 * Hook to update a log (Admin only)
 */
export const useUpdateLog = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Log> }) => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<Log>(
        `/api/v1/logs/${id}`,
        {
          method: 'PATCH',
          token,
          body: updates,
        }
      );

      if (error) throw new Error(error);
      return data as Log;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
};

// ============================================================================
// 6. 로그 삭제 (Admin only)
// ============================================================================

/**
 * Hook to delete a log (Admin only)
 */
export const useDeleteLog = () => {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = workersTokens?.accessToken;
      const { error } = await callWorkersApi(
        `/api/v1/logs/${id}`,
        {
          method: 'DELETE',
          token,
        }
      );

      if (error) throw new Error(error);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
};
