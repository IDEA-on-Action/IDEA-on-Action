
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useRAGHybridSearch,
  useMinuFindHybridSearch,
  useMinuFrameHybridSearch,
  useMinuBuildHybridSearch,
  useMinuKeepHybridSearch,
} from '@/hooks/useRAGHybridSearch';
import { ragApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  ragApi: {
    search: vi.fn(),
  },
}));

// Mock useAuth 훅
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    workersTokens: { accessToken: 'test-token', refreshToken: 'test-refresh' },
  }),
}));

describe('useRAGHybridSearch', () => {
  let queryClient: QueryClient;

  const mockHybridResults = [
    {
      id: 'embed-1',
      document_id: 'doc-1',
      title: '하이브리드 검색 문서',
      content: '전체 문서 내용',
      chunk_index: 0,
      chunk_content: '하이브리드 검색 결과입니다.',
      metadata: { type: 'guide' },
      keyword_score: 0.8,
      vector_score: 0.9,
      combined_score: 0.87,
      service_id: 'minu-find',
      project_id: 'project-1',
      source_type: 'document',
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'embed-2',
      document_id: 'doc-2',
      title: '또 다른 결과',
      content: '다른 문서 내용',
      chunk_index: 1,
      chunk_content: '관련 정보가 포함되어 있습니다.',
      metadata: {},
      keyword_score: 0.6,
      vector_score: 0.85,
      combined_score: 0.77,
      service_id: 'minu-find',
      project_id: null,
      source_type: 'article',
      created_at: '2025-01-01T01:00:00Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('초기 상태', () => {
    it('빈 결과 배열로 초기화되어야 함', () => {
      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      expect(result.current.results).toEqual([]);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('기본 가중치가 설정되어 있어야 함', () => {
      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      expect(result.current.currentWeights).toEqual({
        keyword: 0.3,
        vector: 0.7,
      });
    });

    it('필요한 함수들이 정의되어 있어야 함', () => {
      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      expect(typeof result.current.search).toBe('function');
      expect(typeof result.current.clearResults).toBe('function');
    });
  });

  describe('하이브리드 검색 실행', () => {
    it('Workers API로 하이브리드 검색을 실행해야 함', async () => {
      // Workers API 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      await act(async () => {
        await result.current.search('하이브리드 검색');
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2);
      });

      // Workers API 호출 확인
      expect(ragApi.search).toHaveBeenCalledWith('test-token', {
        query: '하이브리드 검색',
        limit: 10,
        threshold: 0.7,
        filters: {},
        searchType: 'hybrid',
        hybridWeight: 0.7,
      });
    });

    it('커스텀 가중치를 적용해야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(
        () =>
          useRAGHybridSearch({
            keywordWeight: 0.5,
            vectorWeight: 0.5,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.search('검색');
      });

      await waitFor(() => {
        expect(result.current.currentWeights).toEqual({
          keyword: 0.5,
          vector: 0.5,
        });
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          hybridWeight: 0.5,
        })
      );
    });

    it('가중치를 정규화해야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(
        () =>
          useRAGHybridSearch({
            keywordWeight: 1,
            vectorWeight: 2,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.search('검색');
      });

      await waitFor(() => {
        expect(result.current.currentWeights).toEqual({
          keyword: 1 / 3,
          vector: 2 / 3,
        });
      });
    });

    it('빈 검색어는 처리하지 않아야 함', async () => {
      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      await act(async () => {
        await result.current.search('   ');
      });

      expect(result.current.results).toEqual([]);
      expect(ragApi.search).not.toHaveBeenCalled();
    });

    it('프로젝트/서비스 필터를 적용해야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(
        () =>
          useRAGHybridSearch({
            projectId: 'project-1',
            serviceId: 'minu-find',
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.search('검색');
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          filters: {
            project_id: 'project-1',
            service_id: 'minu-find',
          },
        })
      );
    });

    it('최소 점수 필터를 적용해야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(
        () =>
          useRAGHybridSearch({
            minVectorScore: 0.8,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.search('검색');
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          threshold: 0.8,
        })
      );
    });
  });

  describe('검색 결과 처리', () => {
    it('DB 타입을 클라이언트 타입으로 변환해야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      await act(async () => {
        await result.current.search('검색');
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2);
      });

      const firstResult = result.current.results[0];
      expect(firstResult).toMatchObject({
        id: 'embed-1',
        documentId: 'doc-1',
        title: '하이브리드 검색 문서',
        chunkContent: '하이브리드 검색 결과입니다.',
        keywordScore: 0.8,
        vectorScore: 0.9,
        combinedScore: 0.87,
      });
      expect(firstResult.createdAt).toBeInstanceOf(Date);
    });

    it('빈 검색 결과를 처리해야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: [] },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      await act(async () => {
        await result.current.search('없는 검색');
      });

      await waitFor(() => {
        expect(result.current.results).toEqual([]);
      });

      expect(result.current.error).toBe(null);
    });

    it('clearResults로 검색 결과를 초기화할 수 있어야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      await act(async () => {
        await result.current.search('검색');
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2);
      });

      act(() => {
        result.current.clearResults();
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBe(null);
    });
  });

  describe('에러 처리', () => {
    it('API 에러 시 에러를 처리해야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: null,
        error: '검색 서비스 오류',
        status: 500,
      });

      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      await act(async () => {
        try {
          await result.current.search('검색');
        } catch {
          // 에러는 훅 내부에서 처리됨
        }
      });

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.message).toContain('검색에 실패했습니다');
      expect(result.current.results).toEqual([]);
    });

    it('응답 데이터가 없으면 에러를 던져야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: { success: false, error: { message: '데이터 없음' } },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      await act(async () => {
        try {
          await result.current.search('검색');
        } catch {
          // 에러는 훅 내부에서 처리됨
        }
      });

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.message).toContain('데이터 없음');
    });

    it('네트워크 에러를 처리해야 함', async () => {
      vi.mocked(ragApi.search).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      await act(async () => {
        try {
          await result.current.search('검색');
        } catch {
          // 에러는 훅 내부에서 처리됨
        }
      });

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });
    });
  });

  describe('로딩 상태', () => {
    it('검색 중 isSearching이 true여야 함', async () => {
      vi.mocked(ragApi.search).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { success: true, data: { results: mockHybridResults } },
                  error: null,
                  status: 200,
                }),
              50
            )
          )
      );

      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      // 검색 시작
      const searchPromise = result.current.search('검색');

      // 즉시 로딩 상태 확인
      await waitFor(
        () => {
          expect(result.current.isSearching).toBe(true);
        },
        { timeout: 100 }
      );

      // 검색 완료 대기
      await act(async () => {
        await searchPromise;
      });

      await waitFor(
        () => {
          expect(result.current.isSearching).toBe(false);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('서비스별 편의 훅', () => {
    it('useMinuFindHybridSearch가 serviceId를 자동 설정해야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMinuFindHybridSearch(), { wrapper });

      await act(async () => {
        await result.current.search('검색');
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          filters: expect.objectContaining({
            service_id: 'minu-find',
          }),
        })
      );
    });

    it('useMinuFrameHybridSearch가 serviceId를 자동 설정해야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMinuFrameHybridSearch(), { wrapper });

      await act(async () => {
        await result.current.search('검색');
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          filters: expect.objectContaining({
            service_id: 'minu-frame',
          }),
        })
      );
    });

    it('useMinuBuildHybridSearch가 serviceId를 자동 설정해야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMinuBuildHybridSearch(), { wrapper });

      await act(async () => {
        await result.current.search('검색');
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          filters: expect.objectContaining({
            service_id: 'minu-build',
          }),
        })
      );
    });

    it('useMinuKeepHybridSearch가 serviceId를 자동 설정해야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMinuKeepHybridSearch(), { wrapper });

      await act(async () => {
        await result.current.search('검색');
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          filters: expect.objectContaining({
            service_id: 'minu-keep',
          }),
        })
      );
    });
  });

  describe('동적 옵션 변경', () => {
    it('검색 시 가중치를 동적으로 변경할 수 있어야 함', async () => {
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: { results: mockHybridResults },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useRAGHybridSearch(), { wrapper });

      await act(async () => {
        await result.current.search('검색', {
          keywordWeight: 0.6,
          vectorWeight: 0.4,
        });
      });

      await waitFor(() => {
        expect(result.current.currentWeights).toEqual({
          keyword: 0.6,
          vector: 0.4,
        });
      });
    });
  });
});
