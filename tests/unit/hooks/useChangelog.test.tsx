/**
 * useChangelog Hook 테스트
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * Changelog 관리 훅 테스트
 * - Changelog 목록 조회
 * - 단일 항목 조회
 * - 프로젝트별 필터링
 * - 프로젝트 슬러그로 조회
 * - 페이지네이션
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useChangelog,
  useChangelogEntry,
  useChangelogByProjectSlug,
  type ChangelogEntry,
} from '@/hooks/cms/useChangelog';
import * as cloudflareClient from '@/integrations/cloudflare/client';
import React from 'react';

// Mock Workers API
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
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
const mockChangelog: ChangelogEntry[] = [
  {
    id: '1',
    version: '2.30.0',
    title: '기술 부채 해소',
    description: 'TODO 구현 및 테스트 추가',
    changes: [
      { type: 'feature', description: 'TODO 4개 구현' },
      { type: 'feature', description: '테스트 31개 추가' },
    ],
    project_id: 'project-1',
    github_release_url: 'https://github.com/example/releases/v2.30.0',
    released_at: '2025-12-01T10:00:00Z',
    created_at: '2025-12-01T10:00:00Z',
    project: {
      id: 'project-1',
      title: 'IDEA on Action',
      slug: 'idea-on-action',
    },
  },
  {
    id: '2',
    version: '2.29.0',
    title: '병렬 작업 완료',
    description: 'pptx Skill 추가',
    changes: [
      { type: 'feature', description: 'pptx Skill 추가' },
      { type: 'feature', description: '테스트 54개 추가' },
    ],
    project_id: 'project-1',
    github_release_url: 'https://github.com/example/releases/v2.29.0',
    released_at: '2025-11-30T10:00:00Z',
    created_at: '2025-11-30T10:00:00Z',
    project: {
      id: 'project-1',
      title: 'IDEA on Action',
      slug: 'idea-on-action',
    },
  },
];

describe('useChangelog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 기본 성공 응답 설정
    vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
      data: mockChangelog,
      error: null,
      status: 200,
    });
  });

  describe('초기 상태 확인', () => {
    it('초기 로딩 상태여야 함', () => {
      const { result } = renderHook(() => useChangelog(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Changelog 목록 조회', () => {
    it('전체 Changelog를 조회해야 함', async () => {
      const { result } = renderHook(() => useChangelog(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/changelog-entries'),
        expect.objectContaining({ token: 'test-token' })
      );
      expect(result.current.data).toEqual(mockChangelog);
    });

    it('프로젝트 ID로 필터링해야 함', async () => {
      const { result } = renderHook(() => useChangelog({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('project_id=project-1'),
        expect.any(Object)
      );
    });

    it('limit을 적용해야 함', async () => {
      const { result } = renderHook(() => useChangelog({ limit: 5 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('limit=5'),
        expect.any(Object)
      );
    });

    it('프로젝트 정보를 포함해야 함', async () => {
      const { result } = renderHook(() => useChangelog(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.[0].project).toBeDefined();
      expect(result.current.data?.[0].project?.title).toBe('IDEA on Action');
    });
  });

  describe('단일 Changelog 항목 조회', () => {
    beforeEach(() => {
      vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
        data: mockChangelog[0],
        error: null,
        status: 200,
      });
    });

    it('단일 항목을 조회해야 함', async () => {
      const { result } = renderHook(() => useChangelogEntry('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/changelog-entries/1'),
        expect.any(Object)
      );
      expect(result.current.data).toEqual(mockChangelog[0]);
    });

    it('ID가 없으면 쿼리를 비활성화해야 함', () => {
      const { result } = renderHook(() => useChangelogEntry(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(cloudflareClient.callWorkersApi).not.toHaveBeenCalled();
    });

    it('프로젝트 정보를 포함해야 함', async () => {
      const { result } = renderHook(() => useChangelogEntry('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.project).toBeDefined();
    });
  });

  describe('프로젝트 슬러그로 Changelog 조회', () => {
    beforeEach(() => {
      // 이 블록에서만 사용할 mock 재설정
      vi.clearAllMocks();
    });

    it('프로젝트 슬러그로 Changelog를 조회해야 함', async () => {
      // 각 테스트마다 mock 설정
      vi.mocked(cloudflareClient.callWorkersApi)
        .mockResolvedValueOnce({
          data: { id: 'project-1', slug: 'idea-on-action' },
          error: null,
          status: 200,
        })
        .mockResolvedValueOnce({
          data: mockChangelog,
          error: null,
          status: 200,
        });

      const { result } = renderHook(() => useChangelogByProjectSlug('idea-on-action'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 프로젝트 조회 호출 확인
      expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/projects/by-slug/idea-on-action'),
        expect.any(Object)
      );
      // changelog 조회 호출 확인
      expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/changelog-entries'),
        expect.any(Object)
      );
      expect(result.current.data).toEqual(mockChangelog);
    });

    it('limit을 적용해야 함', async () => {
      vi.mocked(cloudflareClient.callWorkersApi)
        .mockResolvedValueOnce({
          data: { id: 'project-1', slug: 'idea-on-action' },
          error: null,
          status: 200,
        })
        .mockResolvedValueOnce({
          data: mockChangelog,
          error: null,
          status: 200,
        });

      const { result } = renderHook(() => useChangelogByProjectSlug('idea-on-action', 10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('슬러그가 없으면 쿼리를 비활성화해야 함', () => {
      const { result } = renderHook(() => useChangelogByProjectSlug(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(cloudflareClient.callWorkersApi).not.toHaveBeenCalled();
    });
  });

  describe('에러 처리', () => {
    it('조회 실패 시 빈 배열을 반환해야 함', async () => {
      // 이 테스트에서만 에러 응답으로 재설정
      vi.clearAllMocks();
      vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValueOnce({
        data: null,
        error: 'Database error',
        status: 500,
      });

      const { result } = renderHook(() => useChangelog(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 에러 발생 시 빈 배열 반환 (useChangelog 구현 참고)
      expect(result.current.data).toEqual([]);
    });

    it('단일 항목 조회 실패 시 에러를 처리해야 함', async () => {
      // 이 테스트에서만 에러 응답으로 재설정
      vi.clearAllMocks();
      vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValueOnce({
        data: null,
        error: 'Not found',
        status: 404,
      });

      const { result } = renderHook(() => useChangelogEntry('invalid-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 에러 발생 시 에러 throw (useChangelogEntry 구현 참고)
      expect(result.current.isError).toBe(true);
    });
  });
});
