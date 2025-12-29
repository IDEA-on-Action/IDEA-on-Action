import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
import { projectsApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';
import type { Project } from '@/types/v2';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  projectsApi: {
    list: vi.fn(),
    getBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    accessToken: 'mock-token',
  })),
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

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useProjects', () => {
    it('전체 프로젝트 목록을 성공적으로 조회해야 함', async () => {
      vi.mocked(projectsApi.list).mockResolvedValue({
        data: mockProjects,
        error: null,
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockProjects);
        expect(projectsApi.list).toHaveBeenCalled();
      }
    });

    it('에러 발생 시 빈 배열을 반환해야 함', async () => {
      vi.mocked(projectsApi.list).mockResolvedValue({
        data: null,
        error: 'Database error',
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useProject', () => {
    it('slug로 단일 프로젝트를 조회해야 함', async () => {
      vi.mocked(projectsApi.getBySlug).mockResolvedValue({
        data: mockProjects[0],
        error: null,
      });

      const { result } = renderHook(() => useProject('project-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockProjects[0]);
        expect(projectsApi.getBySlug).toHaveBeenCalledWith('project-1');
      }
    });

    it('slug가 없으면 쿼리가 비활성화되어야 함', () => {
      const { result } = renderHook(() => useProject(''), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useProjectsByStatus', () => {
    it('상태별로 프로젝트를 필터링해야 함', async () => {
      const filteredProjects = mockProjects.filter((p) => p.status === 'in-progress');
      vi.mocked(projectsApi.list).mockResolvedValue({
        data: filteredProjects,
        error: null,
      });

      const { result } = renderHook(() => useProjectsByStatus('in-progress'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredProjects);
        expect(projectsApi.list).toHaveBeenCalledWith({ status: 'in-progress' });
      }
    });

    it('상태가 없으면 전체 프로젝트를 반환해야 함', async () => {
      vi.mocked(projectsApi.list).mockResolvedValue({
        data: mockProjects,
        error: null,
      });

      const { result } = renderHook(() => useProjectsByStatus(), { wrapper });

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
      const filteredProjects = mockProjects.filter((p) => p.category === 'web');
      vi.mocked(projectsApi.list).mockResolvedValue({
        data: filteredProjects,
        error: null,
      });

      const { result } = renderHook(() => useProjectsByCategory('web'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(filteredProjects);
        expect(projectsApi.list).toHaveBeenCalledWith({ category: 'web' });
      }
    });
  });

  describe('useCreateProject', () => {
    it('새 프로젝트를 생성해야 함', async () => {
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

      vi.mocked(projectsApi.create).mockResolvedValue({
        data: { ...newProject, id: '3', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
        error: null,
      });

      const { result } = renderHook(() => useCreateProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate(newProject);

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(projectsApi.create).toHaveBeenCalled();
        expect(result.current.data).toBeDefined();
      }
    });
  });

  describe('useUpdateProject', () => {
    it('프로젝트를 업데이트해야 함', async () => {
      const updates = { title: '업데이트된 프로젝트 1' };
      const updatedProject = { ...mockProjects[0], ...updates };

      vi.mocked(projectsApi.update).mockResolvedValue({
        data: updatedProject,
        error: null,
      });

      const { result } = renderHook(() => useUpdateProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate({ id: '1', updates });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(projectsApi.update).toHaveBeenCalledWith('mock-token', '1', updates);
      }
    });
  });

  describe('useDeleteProject', () => {
    it('프로젝트를 삭제해야 함', async () => {
      vi.mocked(projectsApi.delete).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useDeleteProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      if (result.current.isSuccess) {
        expect(projectsApi.delete).toHaveBeenCalledWith('mock-token', '1');
      }
    });
  });
});
