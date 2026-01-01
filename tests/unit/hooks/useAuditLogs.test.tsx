/**
 * useAuditLogs Hook 테스트
 *
 * 감사 로그 관리 훅 테스트 (Workers API 모킹)
 * - 로그 목록 조회
 * - 필터링 (사용자, 액션, 리소스, 날짜)
 * - 페이지네이션
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAuditLogs,
  useAuditLog,
  useAuditStatistics,
  useUserAuditHistory,
  useResourceAuditHistory,
} from '@/hooks/analytics/useAuditLogs';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import React from 'react';
import type { AuditLogFilters } from '@/types/audit.types';

// Mock Cloudflare Workers API
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
  realtimeApi: {
    connect: vi.fn(),
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
const mockAuditLogsWithUser = [
  {
    id: '1',
    actor_id: 'user-1',
    actor_type: 'user',
    event_type: 'project.create',
    action: 'create',
    resource_type: 'project',
    resource_id: 'project-1',
    metadata: { name: 'Test Project' },
    created_at: '2025-12-01T10:00:00Z',
    user_email: 'user1@example.com',
    user_name: 'User 1',
  },
  {
    id: '2',
    actor_id: 'user-2',
    actor_type: 'user',
    event_type: 'user.update',
    action: 'update',
    resource_type: 'user',
    resource_id: 'user-2',
    metadata: { role: 'admin' },
    created_at: '2025-12-01T11:00:00Z',
    user_email: 'user2@example.com',
    user_name: 'User 2',
  },
];

const mockStatistics = [
  { event_type: 'user.login', count: 150 },
  { event_type: 'project.create', count: 45 },
  { event_type: 'user.update', count: 30 },
];

describe('useAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Workers API 기본 응답 설정
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: {
        logs: mockAuditLogsWithUser,
        total: mockAuditLogsWithUser.length,
      },
      error: null,
      status: 200,
    });
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
        expect(result.current.isSuccess).toBe(true);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/audit-logs'),
        { token: 'test-token' }
      );
      expect(result.current.data?.logs).toEqual(mockAuditLogsWithUser);
      expect(result.current.data?.total).toBe(2);
    });

    it('사용자 필터가 적용되어야 함', async () => {
      const filters: AuditLogFilters = { actor_id: 'user-1' };

      const { result } = renderHook(() => useAuditLogs(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('actor_id=user-1'),
        { token: 'test-token' }
      );
    });

    it('액션 필터가 적용되어야 함', async () => {
      const filters: AuditLogFilters = { action: 'create' };

      const { result } = renderHook(() => useAuditLogs(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('action=create'),
        { token: 'test-token' }
      );
    });

    it('리소스 타입 필터가 적용되어야 함', async () => {
      const filters: AuditLogFilters = { resource_type: 'project' };

      const { result } = renderHook(() => useAuditLogs(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('resource_type=project'),
        { token: 'test-token' }
      );
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
        expect(result.current.isSuccess).toBe(true);
      });

      const callUrl = vi.mocked(callWorkersApi).mock.calls[0][0] as string;
      expect(callUrl).toContain('start_date=2025-12-01T00%3A00%3A00Z');
      expect(callUrl).toContain('end_date=2025-12-31T23%3A59%3A59Z');
    });

    it('페이지네이션이 적용되어야 함', async () => {
      const { result } = renderHook(
        () => useAuditLogs({}, { page: 1, pageSize: 50 }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callUrl = vi.mocked(callWorkersApi).mock.calls[0][0] as string;
      expect(callUrl).toContain('page=1');
      expect(callUrl).toContain('page_size=50');
    });
  });

  describe('단일 감사 로그 조회', () => {
    it('특정 로그를 조회해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValueOnce({
        data: mockAuditLogsWithUser[0],
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useAuditLog('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/audit-logs/1',
        { token: 'test-token' }
      );
      expect(result.current.data?.id).toBe('1');
    });
  });

  describe('감사 로그 통계 조회', () => {
    it('통계를 조회해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValueOnce({
        data: mockStatistics,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useAuditStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/audit-logs/statistics'),
        { token: 'test-token' }
      );
      expect(result.current.data).toEqual(mockStatistics);
    });
  });

  describe('사용자별 감사 로그 조회', () => {
    it('사용자의 최근 활동을 조회해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValueOnce({
        data: [mockAuditLogsWithUser[0]],
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useUserAuditHistory('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callUrl = vi.mocked(callWorkersApi).mock.calls[0][0] as string;
      expect(callUrl).toContain('actor_id=user-1');
      expect(callUrl).toContain('limit=50');
    });
  });

  describe('리소스별 감사 로그 조회', () => {
    it('리소스의 변경 이력을 조회해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValueOnce({
        data: [mockAuditLogsWithUser[0]],
        error: null,
        status: 200,
      });

      const { result } = renderHook(
        () => useResourceAuditHistory('project', 'project-1'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callUrl = vi.mocked(callWorkersApi).mock.calls[0][0] as string;
      expect(callUrl).toContain('resource_type=project');
      expect(callUrl).toContain('resource_id=project-1');
    });
  });

  describe('에러 처리', () => {
    it('조회 실패 시 빈 배열을 반환해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValueOnce({
        data: null,
        error: 'Database error',
        status: 500,
      });

      const { result } = renderHook(() => useAuditLogs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 에러 시 빈 배열 반환
      expect(result.current.data?.logs).toEqual([]);
      expect(result.current.data?.total).toBe(0);
    });

    it('통계 조회 실패 시 빈 배열을 반환해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValueOnce({
        data: null,
        error: 'Statistics error',
        status: 500,
      });

      const { result } = renderHook(() => useAuditStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });
});
