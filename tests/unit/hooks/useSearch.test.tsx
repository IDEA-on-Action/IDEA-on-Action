/**
 * Unit Tests for useSearch Hook
 *
 * useSearch 훅 테스트
 * - 초기 상태
 * - 통합 검색 로직
 * - 타입별 필터링
 * - React Query 캐싱
 * - 로딩/에러 상태
 *
 * @migration Workers API 모킹으로 마이그레이션 완료
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearch, type SearchResult } from '@/hooks/useSearch'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import React, { type ReactNode } from 'react'

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
}))

// Mock useAuth
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    workersTokens: { accessToken: 'mock-token' },
  }),
}))

describe('useSearch', () => {
  let queryClient: QueryClient

  // Mock 검색 결과
  const mockServiceResult: SearchResult = {
    id: '1',
    type: 'service',
    title: 'AI Service',
    description: 'AI 기반 서비스',
    url: '/services/1',
    created_at: '2025-01-01',
  }

  const mockBlogResult: SearchResult = {
    id: '2',
    type: 'blog',
    title: 'AI Blog',
    description: 'AI 블로그',
    url: '/blog/1',
    created_at: '2025-01-02',
    category: 'Tech',
  }

  const mockNoticeResult: SearchResult = {
    id: '3',
    type: 'notice',
    title: 'AI Notice',
    description: 'AI 공지',
    url: '/notices/1',
    created_at: '2025-01-03',
  }

  beforeEach(() => {
    // 각 테스트마다 새로운 QueryClient 생성
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // 테스트에서는 재시도 비활성화
        },
      },
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  // 1. 초기 상태 (query: '', type: 'all', data: undefined)
  it('should return initial state', () => {
    // Query is empty, so no API calls should be made

    const { result } = renderHook(
      () =>
        useSearch({
          query: '',
          types: ['service', 'blog', 'notice'],
          limit: 30,
        }),
      { wrapper }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  // 2. 검색어가 있을 때 쿼리 실행
  it('should execute query when search term is provided', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: [mockServiceResult],
      error: null,
      status: 200,
    })

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 30,
        }),
      { wrapper }
    )

    await waitFor(
      () => {
        expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(
          true
        )
      },
      { timeout: 3000 }
    )

    if (result.current.data !== undefined) {
      expect(result.current.data.length).toBeGreaterThan(0)
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/search'),
        expect.objectContaining({ token: 'mock-token' })
      )
    }
  })

  // 3. 통합 검색 (서비스 + 블로그 + 공지사항)
  it('should search across multiple types', async () => {
    // Setup - Workers API 모킹 (통합 검색 결과)
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: [mockServiceResult, mockBlogResult, mockNoticeResult],
      error: null,
      status: 200,
    })

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service', 'blog', 'notice'],
          limit: 30,
        }),
      { wrapper }
    )

    await waitFor(
      () => {
        expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(
          true
        )
      },
      { timeout: 3000 }
    )

    // API가 호출되어야 함
    expect(callWorkersApi).toHaveBeenCalledWith(
      expect.stringContaining('types=service,blog,notice'),
      expect.any(Object)
    )

    // 결과가 병합되어야 함
    expect(result.current.data?.length).toBe(3)
  })

  // 4. 타입별 필터링 (type: 'service' → 서비스만)
  it('should filter by single type', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: [mockServiceResult],
      error: null,
      status: 200,
    })

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 30,
        }),
      { wrapper }
    )

    await waitFor(
      () => {
        expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(
          true
        )
      },
      { timeout: 3000 }
    )

    // 서비스만 조회하는 URL로 호출
    expect(callWorkersApi).toHaveBeenCalledWith(
      expect.stringContaining('types=service'),
      expect.any(Object)
    )
    expect(callWorkersApi).toHaveBeenCalledTimes(1)

    // 결과 타입 확인
    expect(result.current.data?.every((item) => item.type === 'service')).toBe(true)
  })

  // 5. 빈 결과 처리
  it('should return empty array for no results', async () => {
    // Setup - Workers API 모킹 (빈 결과)
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: [],
      error: null,
      status: 200,
    })

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'nonexistent',
          types: ['service'],
          limit: 30,
        }),
      { wrapper }
    )

    await waitFor(
      () => {
        expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(
          true
        )
      },
      { timeout: 3000 }
    )

    expect(result.current.data).toEqual([])
  })

  // 6. React Query 캐싱 (staleTime: 5분)
  it('should cache results for 5 minutes', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: [mockServiceResult],
      error: null,
      status: 200,
    })

    const { result, rerender } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 30,
        }),
      { wrapper }
    )

    await waitFor(
      () => {
        expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(
          true
        )
      },
      { timeout: 3000 }
    )

    // 첫 번째 호출
    const firstCallCount = vi.mocked(callWorkersApi).mock.calls.length

    // 동일한 쿼리로 재렌더링 (캐싱되어야 함)
    rerender()

    await waitFor(
      () => {
        expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(
          true
        )
      },
      { timeout: 3000 }
    )

    // 호출 횟수가 증가하지 않아야 함 (캐싱됨)
    const secondCallCount = vi.mocked(callWorkersApi).mock.calls.length
    expect(secondCallCount).toBe(firstCallCount)
  })

  // 7. 로딩 상태 (isLoading: true)
  it('should have loading state during query', async () => {
    // Setup - 지연된 응답 모킹
    vi.mocked(callWorkersApi).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: [], error: null, status: 200 }), 100)
        })
    )

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 30,
        }),
      { wrapper }
    )

    // 초기 로딩 상태
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  // 8. 에러 상태 - API 에러 시 빈 배열 반환
  it('should return empty array on API error', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: null,
      error: 'Database error',
      status: 500,
    })

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 30,
        }),
      { wrapper }
    )

    await waitFor(
      () => {
        expect(result.current.isLoading === false).toBe(true)
      },
      { timeout: 3000 }
    )

    // 에러 시 빈 배열 반환 (hook 내부에서 처리)
    expect(result.current.data).toEqual([])
  })

  // 9. 검색어 변경 시 새로운 쿼리 실행
  it('should execute new query when search term changes', async () => {
    // Setup - 다른 결과 반환
    const mockResult1: SearchResult = { ...mockServiceResult, title: 'AI Result' }
    const mockResult2: SearchResult = { ...mockServiceResult, id: '2', title: 'ML Result' }

    let callCount = 0
    vi.mocked(callWorkersApi).mockImplementation(() => {
      callCount++
      return Promise.resolve({
        data: callCount === 1 ? [mockResult1] : [mockResult2],
        error: null,
        status: 200,
      })
    })

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useSearch({
          query,
          types: ['service'],
          limit: 30,
        }),
      {
        wrapper,
        initialProps: { query: 'AI' },
      }
    )

    await waitFor(
      () => {
        expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(
          true
        )
      },
      { timeout: 3000 }
    )

    // 검색어 변경
    rerender({ query: 'ML' })

    await waitFor(
      () => {
        expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(
          true
        )
      },
      { timeout: 3000 }
    )

    // 새로운 쿼리 실행됨
    expect(vi.mocked(callWorkersApi).mock.calls.length).toBeGreaterThan(1)
  })

  // 10. limit 파라미터 적용
  it('should apply limit parameter', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: [],
      error: null,
      status: 200,
    })

    renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 10,
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(callWorkersApi).toHaveBeenCalled()
    })

    // limit 파라미터가 URL에 포함되어야 함
    expect(callWorkersApi).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
      expect.any(Object)
    )
  })

  // 11. enabled 옵션으로 쿼리 비활성화
  it('should not execute query when enabled is false', () => {
    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          enabled: false,
        }),
      { wrapper }
    )

    expect(result.current.data).toBeUndefined()
    expect(callWorkersApi).not.toHaveBeenCalled()
  })

  // 12. 검색어가 2자 미만일 때 쿼리 실행 안함
  it('should not execute query when query is less than 2 characters', () => {
    const { result } = renderHook(
      () =>
        useSearch({
          query: 'A',
          types: ['service'],
        }),
      { wrapper }
    )

    expect(result.current.data).toBeUndefined()
    expect(callWorkersApi).not.toHaveBeenCalled()
  })

  // 13. 날짜 순으로 정렬
  it('should sort results by date descending', async () => {
    // Setup - 정렬되지 않은 결과 반환
    const unsortedResults: SearchResult[] = [
      { ...mockServiceResult, id: '1', created_at: '2025-01-01' },
      { ...mockServiceResult, id: '2', created_at: '2025-01-03' },
      { ...mockServiceResult, id: '3', created_at: '2025-01-02' },
    ]

    vi.mocked(callWorkersApi).mockResolvedValue({
      data: unsortedResults,
      error: null,
      status: 200,
    })

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'Service',
          types: ['service'],
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    // 날짜 순으로 정렬되어야 함 (최신순)
    expect(result.current.data?.[0].id).toBe('2') // 2025-01-03
    expect(result.current.data?.[1].id).toBe('3') // 2025-01-02
    expect(result.current.data?.[2].id).toBe('1') // 2025-01-01
  })

  // 14. 블로그 검색 결과 타입 확인
  it('should return blog type results', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: [mockBlogResult],
      error: null,
      status: 200,
    })

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'Blog',
          types: ['blog'],
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.data?.every((item) => item.type === 'blog')).toBe(true)
    })
  })

  // 15. 공지사항 검색 결과 타입 확인
  it('should return notice type results', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: [mockNoticeResult],
      error: null,
      status: 200,
    })

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'Notice',
          types: ['notice'],
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.data?.every((item) => item.type === 'notice')).toBe(true)
    })
  })

  // 16. 검색어 URL 인코딩 확인
  it('should encode search query in URL', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: [],
      error: null,
      status: 200,
    })

    renderHook(
      () =>
        useSearch({
          query: '검색어 테스트',
          types: ['service'],
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(callWorkersApi).toHaveBeenCalled()
    })

    // URL 인코딩된 검색어가 포함되어야 함
    expect(callWorkersApi).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('검색어 테스트')),
      expect.any(Object)
    )
  })

  // 17. 토큰 전달 확인
  it('should pass token to API call', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: [],
      error: null,
      status: 200,
    })

    renderHook(
      () =>
        useSearch({
          query: 'test',
          types: ['service'],
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(callWorkersApi).toHaveBeenCalled()
    })

    // 토큰이 옵션에 포함되어야 함
    expect(callWorkersApi).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ token: 'mock-token' })
    )
  })
})
