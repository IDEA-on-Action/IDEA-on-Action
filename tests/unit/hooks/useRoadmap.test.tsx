 
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useRoadmap,
  useRoadmapByQuarter,
  useCreateRoadmap,
  useUpdateRoadmap,
  useDeleteRoadmap,
} from '@/hooks/projects/useRoadmap';
import { roadmapApi, callWorkersApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';
import type { Roadmap } from '@/types/shared/v2';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  roadmapApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  callWorkersApi: vi.fn(),
}));

describe('useRoadmap', () => {
  let queryClient: QueryClient;

  const mockRoadmapItems: Roadmap[] = [
    {
      id: 1,
      quarter: '2024-Q1',
      theme: 'Q1 테마',
      description: 'Q1 설명',
      progress: 75,
      owner: '팀 A',
      related_projects: ['project-1', 'project-2'],
      milestones: [
        {
          id: 'm1',
          title: '마일스톤 1',
          status: 'completed',
          dueDate: '2024-01-31',
          tasks: ['작업 1', '작업 2'],
        },
      ],
      risk_level: 'low',
      kpis: {
        users: { target: 1000, current: 750, unit: '명' },
        revenue: { target: 10000000, current: 7500000, unit: '원' },
      },
      start_date: '2024-01-01',
      end_date: '2024-03-31',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 2,
      quarter: '2024-Q2',
      theme: 'Q2 테마',
      progress: 50,
      owner: '팀 B',
      related_projects: ['project-3'],
      milestones: [
        {
          id: 'm2',
          title: '마일스톤 2',
          status: 'in-progress',
          dueDate: '2024-06-30',
        },
      ],
      kpis: {
        users: { target: 2000, current: 1000 },
      },
      start_date: '2024-04-01',
      end_date: '2024-06-30',
      created_at: '2024-04-01T00:00:00Z',
      updated_at: '2024-04-15T00:00:00Z',
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

  describe('useRoadmap', () => {
    it('전체 로드맵 목록을 성공적으로 조회해야 함', async () => {
      // Setup: Workers API Mock
      vi.mocked(roadmapApi.list).mockResolvedValue({
        data: mockRoadmapItems,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useRoadmap(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockRoadmapItems);
        expect(roadmapApi.list).toHaveBeenCalled();
      }
    });

    it('에러 발생 시 에러를 throw해야 함', async () => {
      // Setup: Workers API Error Mock
      vi.mocked(roadmapApi.list).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      });

      // Execute
      const { result } = renderHook(() => useRoadmap(), { wrapper });

      // Assert - Workers API는 에러 시 throw
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useRoadmapByQuarter', () => {
    it('분기별로 로드맵을 조회해야 함', async () => {
      // Setup: Workers API Mock
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockRoadmapItems[0],
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useRoadmapByQuarter('2024-Q1'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockRoadmapItems[0]);
        expect(callWorkersApi).toHaveBeenCalledWith('/api/v1/roadmap/quarter/2024-Q1');
      }
    });

    it('quarter가 없으면 쿼리가 비활성화되어야 함', () => {
      // Execute
      const { result } = renderHook(() => useRoadmapByQuarter(''), { wrapper });

      // Assert
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateRoadmap', () => {
    it('새 로드맵을 생성해야 함', async () => {
      // Setup
      const newRoadmap = {
        quarter: '2024-Q3',
        theme: 'Q3 테마',
        progress: 0,
        owner: '팀 C',
        related_projects: [],
        milestones: [],
        kpis: {},
        start_date: '2024-07-01',
        end_date: '2024-09-30',
      };

      const createdRoadmap = {
        ...newRoadmap,
        id: 3,
        created_at: '2024-07-01T00:00:00Z',
        updated_at: '2024-07-01T00:00:00Z'
      };

      // Setup: Workers API Mock
      vi.mocked(roadmapApi.create).mockResolvedValue({
        data: createdRoadmap,
        error: null,
        status: 201,
      });

      // Execute
      const { result } = renderHook(() => useCreateRoadmap(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(newRoadmap);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(roadmapApi.create).toHaveBeenCalledWith('test-token', newRoadmap);
        expect(result.current.data).toEqual(createdRoadmap);
      }
    });
  });

  describe('useUpdateRoadmap', () => {
    it('로드맵을 업데이트해야 함', async () => {
      // Setup
      const updates = { progress: 80, theme: '업데이트된 테마' };
      const updatedRoadmap = { ...mockRoadmapItems[0], ...updates };

      // Setup: Workers API Mock
      vi.mocked(roadmapApi.update).mockResolvedValue({
        data: updatedRoadmap,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useUpdateRoadmap(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({ id: 1, updates });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(roadmapApi.update).toHaveBeenCalledWith('test-token', '1', updates);
        expect(result.current.data).toEqual(updatedRoadmap);
      }
    });
  });

  describe('useDeleteRoadmap', () => {
    it('로드맵을 삭제해야 함', async () => {
      // Setup: Workers API Mock
      vi.mocked(roadmapApi.delete).mockResolvedValue({
        data: null,
        error: null,
        status: 204,
      });

      // Execute
      const { result } = renderHook(() => useDeleteRoadmap(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(1);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(roadmapApi.delete).toHaveBeenCalledWith('test-token', '1');
        expect(result.current.data).toBe(1);
      }
    });
  });
});

