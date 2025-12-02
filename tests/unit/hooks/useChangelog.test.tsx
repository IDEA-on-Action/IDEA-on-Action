/**
 * useChangelog Hook 테스트
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
} from '@/hooks/useChangelog';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
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

// Mock query 타입 정의
interface MockQuery {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then?: ReturnType<typeof vi.fn>;
}

describe('useChangelog', () => {
  let mockQuery: MockQuery;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock query 체이닝
    const createMockQuery = () => {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        single: vi.fn(),
      };

      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.order.mockReturnValue(query);
      query.limit.mockReturnValue(query);
      query.single.mockReturnValue(query);

      const queryWithThen = query as MockQuery;
      queryWithThen.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockChangelog, error: null }).then(onFulfilled);
      });

      return queryWithThen;
    };

    mockQuery = createMockQuery();
    vi.mocked(supabase.from).mockReturnValue(mockQuery as ReturnType<typeof supabase.from>);
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

      expect(supabase.from).toHaveBeenCalledWith('changelog_entries');
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.order).toHaveBeenCalledWith('released_at', { ascending: false });
    });

    it('프로젝트 ID로 필터링해야 함', async () => {
      const { result } = renderHook(() => useChangelog({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'project-1');
    });

    it('limit을 적용해야 함', async () => {
      const { result } = renderHook(() => useChangelog({ limit: 5 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.limit).toHaveBeenCalledWith(5);
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
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockChangelog[0], error: null }).then(onFulfilled);
      });
    });

    it('단일 항목을 조회해야 함', async () => {
      const { result } = renderHook(() => useChangelogEntry('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
      expect(mockQuery.single).toHaveBeenCalled();
    });

    it('ID가 없으면 쿼리를 비활성화해야 함', () => {
      const { result } = renderHook(() => useChangelogEntry(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
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
      // 프로젝트 조회 mock
      const projectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn((onFulfilled) => {
          return Promise.resolve({
            data: { id: 'project-1', slug: 'idea-on-action' },
            error: null,
          }).then(onFulfilled);
        }),
      };

      // changelog 조회 mock
      const changelogQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((onFulfilled) => {
          return Promise.resolve({ data: mockChangelog, error: null }).then(onFulfilled);
        }),
      };

      // from 호출에 따라 다른 query 반환
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'projects') {
          return projectQuery as ReturnType<typeof supabase.from>;
        }
        return changelogQuery as ReturnType<typeof supabase.from>;
      });
    });

    it('프로젝트 슬러그로 Changelog를 조회해야 함', async () => {
      const { result } = renderHook(() => useChangelogByProjectSlug('idea-on-action'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(supabase.from).toHaveBeenCalledWith('changelog_entries');
    });

    it('limit을 적용해야 함', async () => {
      const { result } = renderHook(() => useChangelogByProjectSlug('idea-on-action', 10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('슬러그가 없으면 쿼리를 비활성화해야 함', () => {
      const { result } = renderHook(() => useChangelogByProjectSlug(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('에러 처리', () => {
    it('조회 실패 시 에러를 처리해야 함', async () => {
      const error = new Error('Database error');
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error }).then(onFulfilled);
      });

      const { result } = renderHook(() => useChangelog(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('단일 항목 조회 실패 시 에러를 처리해야 함', async () => {
      const error = new Error('Not found');
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error }).then(onFulfilled);
      });

      const { result } = renderHook(() => useChangelogEntry('invalid-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });
});
