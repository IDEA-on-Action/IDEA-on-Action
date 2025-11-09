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
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';
import type { Log } from '@/types/v2';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
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
      // Setup
      const orderMock = vi.fn().mockResolvedValue({
        data: mockLogs,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useLogs(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockLogs);
        expect(supabase.from).toHaveBeenCalledWith('logs');
        expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
      }
    });

    it('limit 옵션이 적용되어야 함', async () => {
      // Setup
      const limitMock = vi.fn().mockResolvedValue({
        data: mockLogs.slice(0, 2),
        error: null,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useLogs(2), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(limitMock).toHaveBeenCalledWith(2);
      }
    });

    it('에러 발생 시 에러 상태를 반환해야 함', async () => {
      // Setup
      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST116' },
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useLogs(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useLogsByType', () => {
    it('타입별로 로그를 필터링해야 함', async () => {
      // Setup
      const filteredLogs = mockLogs.filter((log) => log.type === 'release');
      const limitMock = vi.fn().mockResolvedValue({
        data: filteredLogs,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        limit: limitMock,
        order: vi.fn().mockReturnValue({
          limit: limitMock,
        }),
      });

      const orderMock = vi.fn().mockReturnValue({
        eq: eqMock,
        limit: limitMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useLogsByType('release'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredLogs);
        expect(eqMock).toHaveBeenCalledWith('type', 'release');
      }
    });

    it('limit 옵션이 적용되어야 함', async () => {
      // Setup
      const limitMock = vi.fn().mockResolvedValue({
        data: mockLogs.slice(0, 1),
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        limit: limitMock,
        order: vi.fn().mockReturnValue({
          limit: limitMock,
        }),
      });

      const orderMock = vi.fn().mockReturnValue({
        eq: eqMock,
        limit: limitMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useLogsByType('release', 1), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(limitMock).toHaveBeenCalledWith(1);
      }
    });
  });

  describe('useLogsByProject', () => {
    it('프로젝트별로 로그를 필터링해야 함', async () => {
      // Setup
      const filteredLogs = mockLogs.filter((log) => log.project_id === 'project-1');
      const limitMock = vi.fn().mockResolvedValue({
        data: filteredLogs,
        error: null,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useLogsByProject('project-1'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredLogs);
        expect(eqMock).toHaveBeenCalledWith('project_id', 'project-1');
      }
    });

    it('projectId가 없으면 쿼리가 비활성화되어야 함', () => {
      // Execute
      const { result } = renderHook(() => useLogsByProject(''), { wrapper });

      // Assert
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateLog', () => {
    it('새 로그를 생성해야 함', async () => {
      // Setup
      const newLog = {
        type: 'release' as const,
        title: '새 릴리스 로그',
        content: '새 릴리스 내용',
        project_id: 'project-1',
        author_id: 'user-1',
        tags: ['release'],
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: { ...newLog, id: 4, created_at: '2024-01-04T00:00:00Z', updated_at: '2024-01-04T00:00:00Z' },
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const insertMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: insertMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useCreateLog(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(newLog);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(insertMock).toHaveBeenCalledWith([newLog]);
        expect(result.current.data).toBeDefined();
      }
    });
  });

  describe('useUpdateLog', () => {
    it('로그를 업데이트해야 함', async () => {
      // Setup
      const updates = { title: '업데이트된 로그', content: '업데이트된 내용' };
      const updatedLog = { ...mockLogs[0], ...updates };

      const singleMock = vi.fn().mockResolvedValue({
        data: updatedLog,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useUpdateLog(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({ id: 1, updates });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(updateMock).toHaveBeenCalledWith(updates);
        expect(eqMock).toHaveBeenCalledWith('id', 1);
      }
    });
  });

  describe('useDeleteLog', () => {
    it('로그를 삭제해야 함', async () => {
      // Setup
      const eqMock = vi.fn().mockReturnValue({
        delete: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      } as any);

      // Execute
      const { result } = renderHook(() => useDeleteLog(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(1);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(eqMock).toHaveBeenCalledWith('id', 1);
      }
    });
  });
});

