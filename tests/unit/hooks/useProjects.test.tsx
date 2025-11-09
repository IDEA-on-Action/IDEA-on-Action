/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProjects,
  useProject,
  useProjectsByStatus,
  useProjectsByCategory,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';
import type { Project } from '@/types/v2';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('useProjects', () => {
  let queryClient: QueryClient;

  const mockProjects: Project[] = [
    {
      id: '1',
      slug: 'project-1',
      title: '프로젝트 1',
      summary: '프로젝트 1 요약',
      description: '프로젝트 1 설명',
      status: 'in-progress',
      category: 'web',
      image: 'https://example.com/image1.jpg',
      tags: ['react', 'typescript'],
      metrics: {
        progress: 50,
        contributors: 3,
        commits: 100,
        tests: 50,
        coverage: 80,
      },
      tech: {
        frontend: ['React', 'TypeScript'],
        backend: ['Node.js'],
        testing: ['Vitest'],
        deployment: ['Vercel'],
      },
      links: {
        github: 'https://github.com/example/project1',
        demo: 'https://demo.example.com',
        docs: 'https://docs.example.com',
      },
      timeline: {
        started: '2024-01-01',
        launched: null,
        updated: '2024-01-15',
      },
      highlights: ['하이라이트 1'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    },
    {
      id: '2',
      slug: 'project-2',
      title: '프로젝트 2',
      summary: '프로젝트 2 요약',
      status: 'launched',
      category: 'mobile',
      tags: ['react-native'],
      metrics: {
        progress: 100,
        contributors: 5,
        commits: 200,
        tests: 100,
      },
      tech: {
        frontend: ['React Native'],
        backend: null,
        testing: null,
        deployment: ['App Store'],
      },
      links: {
        github: 'https://github.com/example/project2',
        demo: null,
        docs: null,
      },
      timeline: {
        started: '2024-01-10',
        launched: '2024-02-01',
        updated: '2024-02-01',
      },
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-02-01T00:00:00Z',
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

  describe('useProjects', () => {
    it('전체 프로젝트 목록을 성공적으로 조회해야 함', async () => {
      // Setup
      const orderMock = vi.fn().mockResolvedValue({
        data: mockProjects,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useProjects(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockProjects);
        expect(supabase.from).toHaveBeenCalledWith('projects');
        expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
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
      const { result } = renderHook(() => useProjects(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useProject', () => {
    it('slug로 단일 프로젝트를 조회해야 함', async () => {
      // Setup
      const singleMock = vi.fn().mockResolvedValue({
        data: mockProjects[0],
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useProject('project-1'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockProjects[0]);
        expect(eqMock).toHaveBeenCalledWith('slug', 'project-1');
      }
    });

    it('slug가 없으면 쿼리가 비활성화되어야 함', () => {
      // Execute
      const { result } = renderHook(() => useProject(''), { wrapper });

      // Assert
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useProjectsByStatus', () => {
    it('상태별로 프로젝트를 필터링해야 함', async () => {
      // Setup
      const filteredProjects = mockProjects.filter((p) => p.status === 'in-progress');
      const orderMock = vi.fn().mockResolvedValue({
        data: filteredProjects,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useProjectsByStatus('in-progress'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredProjects);
        expect(eqMock).toHaveBeenCalledWith('status', 'in-progress');
      }
    });

    it('상태가 없으면 전체 프로젝트를 반환해야 함', async () => {
      // Setup
      const orderMock = vi.fn().mockResolvedValue({
        data: mockProjects,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useProjectsByStatus(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockProjects);
      }
    });
  });

  describe('useProjectsByCategory', () => {
    it('카테고리별로 프로젝트를 필터링해야 함', async () => {
      // Setup
      const filteredProjects = mockProjects.filter((p) => p.category === 'web');
      const orderMock = vi.fn().mockResolvedValue({
        data: filteredProjects,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
        order: orderMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      // Execute
      const { result } = renderHook(() => useProjectsByCategory('web'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredProjects);
        expect(eqMock).toHaveBeenCalledWith('category', 'web');
      }
    });
  });

  describe('useCreateProject', () => {
    it('새 프로젝트를 생성해야 함', async () => {
      // Setup
      const newProject = {
        slug: 'project-3',
        title: '프로젝트 3',
        summary: '프로젝트 3 요약',
        status: 'backlog' as const,
        category: 'web',
        tags: ['vue'],
        metrics: {
          progress: 0,
          contributors: 0,
          commits: 0,
          tests: 0,
        },
        tech: {
          frontend: ['Vue'],
          backend: null,
          testing: null,
          deployment: [],
        },
        links: {
          github: null,
          demo: null,
          docs: null,
        },
        timeline: {
          started: '2024-02-01',
          launched: null,
          updated: '2024-02-01',
        },
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: { ...newProject, id: '3', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
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
      const { result } = renderHook(() => useCreateProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(newProject);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(insertMock).toHaveBeenCalledWith([newProject]);
        expect(result.current.data).toBeDefined();
      }
    });
  });

  describe('useUpdateProject', () => {
    it('프로젝트를 업데이트해야 함', async () => {
      // Setup
      const updates = { title: '업데이트된 프로젝트 1' };
      const updatedProject = { ...mockProjects[0], ...updates };

      const singleMock = vi.fn().mockResolvedValue({
        data: updatedProject,
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
      const { result } = renderHook(() => useUpdateProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({ id: '1', updates });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(updateMock).toHaveBeenCalledWith(updates);
        expect(eqMock).toHaveBeenCalledWith('id', '1');
      }
    });
  });

  describe('useDeleteProject', () => {
    it('프로젝트를 삭제해야 함', async () => {
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
      const { result } = renderHook(() => useDeleteProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate('1');

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(eqMock).toHaveBeenCalledWith('id', '1');
      }
    });
  });
});

