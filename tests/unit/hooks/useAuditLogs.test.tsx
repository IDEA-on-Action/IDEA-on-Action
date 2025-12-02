/**
 * useAuditLogs Hook 테스트
 *
 * 감사 로그 관리 훅 테스트
 * - 로그 목록 조회
 * - 필터링 (사용자, 액션, 리소스, 날짜)
 * - 로그 액션 기록
 * - 페이지네이션
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuditLogs, useLogAction } from '@/hooks/useAuditLogs';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';
import type { AuditLogFilters } from '@/types/rbac';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock 데이터
const mockAuditLogs = [
  {
    id: '1',
    user_id: 'user-1',
    action: 'create',
    resource: 'project',
    resource_id: 'project-1',
    details: { name: 'Test Project' },
    created_at: '2025-12-01T10:00:00Z',
    user: {
      id: 'user-1',
      email: 'user1@example.com',
    },
  },
  {
    id: '2',
    user_id: 'user-2',
    action: 'update',
    resource: 'user',
    resource_id: 'user-2',
    details: { role: 'admin' },
    created_at: '2025-12-01T11:00:00Z',
    user: {
      id: 'user-2',
      email: 'user2@example.com',
    },
  },
];

// Mock query 타입 정의
interface MockQuery {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then?: ReturnType<typeof vi.fn>;
}

describe('useAuditLogs', () => {
  let mockQuery: MockQuery;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock query 체이닝
    const createMockQuery = () => {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        gte: vi.fn(),
        lte: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
      };

      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.gte.mockReturnValue(query);
      query.lte.mockReturnValue(query);
      query.order.mockReturnValue(query);
      query.limit.mockReturnValue(query);

      const queryWithThen = query as MockQuery;
      queryWithThen.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockAuditLogs, error: null }).then(onFulfilled);
      });

      return queryWithThen;
    };

    mockQuery = createMockQuery();
    vi.mocked(supabase.from).mockReturnValue(mockQuery as ReturnType<typeof supabase.from>);
  });

  describe('초기 상태 확인', () => {
    it('초기 로딩 상태여야 함', () => {
      const { result } = renderHook(() => useAuditLogs(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('로그 목록 조회', () => {
    it('모든 감사 로그를 조회해야 함', async () => {
      const { result } = renderHook(() => useAuditLogs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(100);
    });

    it('사용자 필터가 적용되어야 함', async () => {
      const filters: AuditLogFilters = { user_id: 'user-1' };

      const { result } = renderHook(() => useAuditLogs(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('액션 필터가 적용되어야 함', async () => {
      const filters: AuditLogFilters = { action: 'create' };

      const { result } = renderHook(() => useAuditLogs(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('action', 'create');
    });

    it('리소스 필터가 적용되어야 함', async () => {
      const filters: AuditLogFilters = { resource: 'project' };

      const { result } = renderHook(() => useAuditLogs(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('resource', 'project');
    });

    it('날짜 범위 필터가 적용되어야 함', async () => {
      const filters: AuditLogFilters = {
        start_date: '2025-12-01T00:00:00Z',
        end_date: '2025-12-31T23:59:59Z',
      };

      const { result } = renderHook(() => useAuditLogs(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2025-12-01T00:00:00Z');
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', '2025-12-31T23:59:59Z');
    });

    it('커스텀 limit을 적용해야 함', async () => {
      const { result } = renderHook(() => useAuditLogs({}, 50), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('로그 액션 기록', () => {
    beforeEach(() => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as { data: { user: { id: string } }; error: null });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as { data: null; error: null });
    });

    it('액션을 기록해야 함', async () => {
      const { result } = renderHook(() => useLogAction(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        action: 'create',
        resource: 'project',
        resourceId: 'project-1',
        details: { name: 'New Project' },
      });

      expect(supabase.rpc).toHaveBeenCalledWith('log_action', {
        p_user_id: 'user-1',
        p_action: 'create',
        p_resource: 'project',
        p_resource_id: 'project-1',
        p_details: { name: 'New Project' },
      });
    });

    it('resource_id와 details 없이 기록할 수 있어야 함', async () => {
      const { result } = renderHook(() => useLogAction(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        action: 'login',
        resource: 'auth',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('log_action', {
        p_user_id: 'user-1',
        p_action: 'login',
        p_resource: 'auth',
        p_resource_id: null,
        p_details: null,
      });
    });
  });

  describe('에러 처리', () => {
    it('조회 실패 시 에러를 처리해야 함', async () => {
      const error = new Error('Database error');
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error }).then(onFulfilled);
      });

      const { result } = renderHook(() => useAuditLogs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('로그 기록 실패 시 에러를 던져야 함', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as { data: { user: { id: string } }; error: null });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC failed'),
      } as { data: null; error: Error });

      const { result } = renderHook(() => useLogAction(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          action: 'create',
          resource: 'project',
        })
      ).rejects.toThrow();
    });
  });
});
