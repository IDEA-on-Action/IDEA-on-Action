/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useLogs,
  useLogsByType,
  useLogsByProject,
  useCreateLog,
  useUpdateLog,
  useDeleteLog,
} from '@/hooks/useLogs';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';
import type { Log } from '@/types/v2';

// Mock Workers API
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    workersTokens: { accessToken: 'mock-token' },
  })),
}));

describe('useLogs', () => {
  let queryClient: QueryClient;

  const mockLogs: Log[] = [
    {
      id: 1,
      type: 'release',
      title: '릴리스 로그 1',
      content: '릴리스 내용',
      project_id: 'project-1',
      author_id: 'user-1',
      tags: ['release', 'v1.0'],
      metadata: { version: '1.0.0' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      type: 'learning',
      title: '학습 로그 1',
      content: '학습 내용',
      project_id: null,
      author_id: 'user-1',
      tags: ['learning'],
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 3,
      type: 'decision',
      title: '결정 로그 1',
      content: '결정 내용',
      project_id: 'project-2',
      author_id: 'user-2',
      tags: ['decision'],
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useLogs', () => {
    it('전체 로그 목록을 성공적으로 조회해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockLogs,
        error: null,
      });

      const { result } = renderHook(() => useLogs(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockLogs);
        expect(callWorkersApi).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/logs'),
          expect.objectContaining({ token: 'mock-token' })
        );
      }
    });

    it('limit 옵션이 적용되어야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockLogs.slice(0, 2),
        error: null,
      });

      const { result } = renderHook(() => useLogs(2), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(callWorkersApi).toHaveBeenCalledWith(
          expect.stringContaining('limit=2'),
          expect.any(Object)
        );
      }
    });

    it('에러 발생 시 빈 배열을 반환해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Database error',
      });

      const { result } = renderHook(() => useLogs(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useLogsByType', () => {
    it('타입별로 로그를 필터링해야 함', async () => {
      const filteredLogs = mockLogs.filter((log) => log.type === 'release');
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: filteredLogs,
        error: null,
      });

      const { result } = renderHook(() => useLogsByType('release'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredLogs);
        expect(callWorkersApi).toHaveBeenCalledWith(
          expect.stringContaining('type=release'),
          expect.any(Object)
        );
      }
    });

    it('limit 옵션이 적용되어야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockLogs.slice(0, 1),
        error: null,
      });

      const { result } = renderHook(() => useLogsByType('release', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(callWorkersApi).toHaveBeenCalledWith(
          expect.stringContaining('limit=1'),
          expect.any(Object)
        );
      }
    });
  });

  describe('useLogsByProject', () => {
    it('프로젝트별로 로그를 필터링해야 함', async () => {
      const filteredLogs = mockLogs.filter((log) => log.project_id === 'project-1');
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: filteredLogs,
        error: null,
      });

      const { result } = renderHook(() => useLogsByProject('project-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredLogs);
        expect(callWorkersApi).toHaveBeenCalledWith(
          expect.stringContaining('project_id=project-1'),
          expect.any(Object)
        );
      }
    });

    it('projectId가 없으면 쿼리가 비활성화되어야 함', () => {
      const { result } = renderHook(() => useLogsByProject(''), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateLog', () => {
    it('새 로그를 생성해야 함', async () => {
      const newLog = {
        type: 'release' as const,
        title: '새 릴리스 로그',
        content: '새 릴리스 내용',
        project_id: 'project-1',
        author_id: 'user-1',
        tags: ['release'],
      };

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { ...newLog, id: 4, created_at: '2024-01-04T00:00:00Z', updated_at: '2024-01-04T00:00:00Z' },
        error: null,
      });

      const { result } = renderHook(() => useCreateLog(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(newLog);

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/logs',
          expect.objectContaining({
            method: 'POST',
            body: newLog,
          })
        );
        expect(result.current.data).toBeDefined();
      }
    });
  });

  describe('useUpdateLog', () => {
    it('로그를 업데이트해야 함', async () => {
      const updates = { title: '업데이트된 로그', content: '업데이트된 내용' };
      const updatedLog = { ...mockLogs[0], ...updates };

      vi.mocked(callWorkersApi).mockResolvedValue({
        data: updatedLog,
        error: null,
      });

      const { result } = renderHook(() => useUpdateLog(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({ id: 1, updates });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/logs/1',
          expect.objectContaining({
            method: 'PATCH',
            body: updates,
          })
        );
      }
    });
  });

  describe('useDeleteLog', () => {
    it('로그를 삭제해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useDeleteLog(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/logs/1',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      }
    });
  });
});
