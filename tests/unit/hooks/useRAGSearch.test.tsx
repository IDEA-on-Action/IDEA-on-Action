/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useRAGSearch,
  useMinuFindRAGSearch,
  useMinuFrameRAGSearch,
  useMinuBuildRAGSearch,
  useMinuKeepRAGSearch,
} from '@/hooks/ai/useRAGSearch';
import { ragApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  ragApi: {
    search: vi.fn(),
  },
}));

// Mock useAuth - setupTests.ts에서 전역 모킹됨, 여기서 오버라이드
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    workersTokens: { accessToken: 'test-token', refreshToken: 'test-refresh' },
    workersUser: { id: 'user-123', email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
  })),
}));

describe('useRAGSearch', () => {
  let queryClient: QueryClient;

  const mockSearchResults = {
    success: true,
    data: {
      results: [
        {
          id: 'embed-1',
          document_id: 'doc-1',
          document_title: '테스트 문서',
          chunk_content: '이것은 테스트 문서의 내용입니다.',
          chunk_index: 0,
          similarity: 0.95,
          metadata: { source: 'test' },
          service_id: 'minu-find',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'embed-2',
          document_id: 'doc-2',
          document_title: '또 다른 문서',
          chunk_content: '관련 내용이 포함된 문서입니다.',
          chunk_index: 0,
          similarity: 0.85,
          metadata: null,
          service_id: 'minu-find',
          created_at: '2025-01-01T01:00:00Z',
        },
      ],
      query: '테스트 검색',
      count: 2,
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
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

  describe('초기 상태', () => {
    it('빈 결과 배열로 초기화되어야 함', () => {
      const { result } = renderHook(() => useRAGSearch(), { wrapper });

      expect(result.current.results).toEqual([]);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('필요한 함수들이 정의되어 있어야 함', () => {
      const { result } = renderHook(() => useRAGSearch(), { wrapper });

      expect(typeof result.current.search).toBe('function');
      expect(typeof result.current.clearResults).toBe('function');
    });
  });

  describe('검색 실행', () => {
    it('검색을 실행하고 결과를 반환해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: mockSearchResults,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useRAGSearch(), { wrapper });

      let searchResults: any;
      await act(async () => {
        searchResults = await result.current.search('테스트 검색');
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2);
      });

      expect(searchResults).toHaveLength(2);
      expect(result.current.results[0].documentTitle).toBe('테스트 문서');
      expect(result.current.results[0].similarity).toBe(0.95);
      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          query: '테스트 검색',
        })
      );
    });

    it('빈 검색어는 처리하지 않아야 함', async () => {
      const { result } = renderHook(() => useRAGSearch(), { wrapper });

      await act(async () => {
        await result.current.search('   ');
      });

      expect(result.current.results).toEqual([]);
      expect(ragApi.search).not.toHaveBeenCalled();
    });

    it('검색 옵션을 적용해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: mockSearchResults,
        error: null,
        status: 200,
      });

      const { result } = renderHook(
        () =>
          useRAGSearch({
            serviceId: 'minu-find',
            limit: 10,
            threshold: 0.8,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.search('검색');
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          query: '검색',
          limit: 10,
          threshold: 0.8,
          filters: { service_id: 'minu-find' },
        })
      );
    });

    it('검색 중 isSearching이 true여야 함', async () => {
      // Setup - 지연된 응답 모킹
      vi.mocked(ragApi.search).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: mockSearchResults, error: null, status: 200 }), 50)
          )
      );

      const { result } = renderHook(() => useRAGSearch(), { wrapper });

      // 검색 시작
      const searchPromise = result.current.search('검색');

      // 즉시 로딩 상태 확인
      await waitFor(() => {
        expect(result.current.isSearching).toBe(true);
      }, { timeout: 100 });

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

  describe('검색 결과 처리', () => {
    it('빈 검색 결과를 올바르게 처리해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: true,
          data: {
            results: [],
            query: '없는 검색',
            count: 0,
          },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useRAGSearch(), { wrapper });

      await act(async () => {
        await result.current.search('없는 검색');
      });

      await waitFor(() => {
        expect(result.current.results).toEqual([]);
      });

      expect(result.current.error).toBe(null);
    });

    it('DB 타입을 클라이언트 타입으로 올바르게 변환해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: mockSearchResults,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useRAGSearch(), { wrapper });

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
        documentTitle: '테스트 문서',
        chunkContent: '이것은 테스트 문서의 내용입니다.',
        chunkIndex: 0,
        similarity: 0.95,
        serviceId: 'minu-find',
      });
      expect(firstResult.createdAt).toBeInstanceOf(Date);
    });

    it('clearResults로 검색 결과를 초기화할 수 있어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: mockSearchResults,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useRAGSearch(), { wrapper });

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
    it('API 에러 발생 시 에러 상태가 업데이트되어야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: null,
        error: 'API 에러',
        status: 500,
      });

      const { result } = renderHook(() => useRAGSearch(), { wrapper });

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

    it('success가 false인 응답을 에러로 처리해야 함', async () => {
      // Setup - Workers API 실패 응답 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: {
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: '잘못된 검색어',
          },
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useRAGSearch(), { wrapper });

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

      expect(result.current.error?.message).toContain('잘못된 검색어');
    });

    it('네트워크 에러를 올바르게 처리해야 함', async () => {
      // Setup - 네트워크 에러 모킹
      vi.mocked(ragApi.search).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRAGSearch(), { wrapper });

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

  describe('디바운스 기능', () => {
    it('디바운스 시간을 설정할 수 있어야 함', () => {
      const { result } = renderHook(() => useRAGSearch({ debounceMs: 500 }), { wrapper });

      expect(result.current).toBeDefined();
      // 디바운스는 내부적으로 작동하므로 직접 테스트하기 어려움
      // 실제 사용 시 여러 번 호출해도 마지막 호출만 실행되는지 확인 필요
    });
  });

  describe('서비스별 편의 훅', () => {
    it('useMinuFindRAGSearch가 serviceId를 자동 설정해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: mockSearchResults,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMinuFindRAGSearch(), { wrapper });

      await act(async () => {
        await result.current.search('검색');
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          filters: { service_id: 'minu-find' },
        })
      );
    });

    it('useMinuFrameRAGSearch가 serviceId를 자동 설정해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: mockSearchResults,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMinuFrameRAGSearch(), { wrapper });

      await act(async () => {
        await result.current.search('검색');
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          filters: { service_id: 'minu-frame' },
        })
      );
    });

    it('useMinuBuildRAGSearch가 serviceId를 자동 설정해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: mockSearchResults,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMinuBuildRAGSearch(), { wrapper });

      await act(async () => {
        await result.current.search('검색');
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          filters: { service_id: 'minu-build' },
        })
      );
    });

    it('useMinuKeepRAGSearch가 serviceId를 자동 설정해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(ragApi.search).mockResolvedValue({
        data: mockSearchResults,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useMinuKeepRAGSearch(), { wrapper });

      await act(async () => {
        await result.current.search('검색');
      });

      expect(ragApi.search).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          filters: { service_id: 'minu-keep' },
        })
      );
    });
  });
});
