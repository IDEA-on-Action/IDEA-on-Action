/**
 * Unit Tests for useSearch Hook
 *
 * useSearch 훅 테스트
 * - 초기 상태
 * - 통합 검색 로직
 * - 타입별 필터링
 * - React Query 캐싱
 * - 로딩/에러 상태
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearch } from '@/hooks/useSearch'
import * as supabaseModule from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. 초기 상태 (query: '', type: 'all', data: undefined)
  it('should return initial state', () => {
    const mockSupabase = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    vi.mocked(supabaseModule.supabase.from).mockReturnValue(mockSupabase as unknown as ReturnType<typeof supabaseModule.supabase.from>)

    const { result } = renderHook(
      () =>
        useSearch({
          query: '',
          types: ['service', 'blog', 'notice'],
          limit: 30,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  // 2. 검색어가 있을 때 쿼리 실행
  it('should execute query when search term is provided', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'AI Service',
        description: 'AI 기반 서비스',
        type: 'service',
        created_at: '2025-01-01',
        image_url: null,
        category: null,
        url: '/services/1',
      },
    ]

    const mockSupabase = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockResults, error: null }),
    }

    vi.mocked(supabaseModule.supabase.from).mockReturnValue(mockSupabase as unknown as ReturnType<typeof supabaseModule.supabase.from>)

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 30,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockResults)
    expect(supabaseModule.supabase.from).toHaveBeenCalledWith('services')
  })

  // 3. 통합 검색 (서비스 + 블로그 + 공지사항)
  it('should search across multiple types', async () => {
    const mockServiceResults = [
      {
        id: '1',
        title: 'AI Service',
        description: 'AI 서비스',
        type: 'service',
        created_at: '2025-01-01',
        image_url: null,
        category: null,
        url: '/services/1',
      },
    ]

    const mockBlogResults = [
      {
        id: '1',
        title: 'AI Blog',
        content: 'AI 블로그',
        type: 'blog',
        created_at: '2025-01-02',
        featured_image: null,
        category: 'Tech',
        url: '/blog/1',
      },
    ]

    const mockNoticeResults = [
      {
        id: '1',
        title: 'AI Notice',
        content: 'AI 공지',
        type: 'notice',
        created_at: '2025-01-03',
        priority: 'normal',
        url: '/notices/1',
      },
    ]

    const mockSupabase = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn()
        .mockResolvedValueOnce({ data: mockServiceResults, error: null })
        .mockResolvedValueOnce({ data: mockBlogResults, error: null })
        .mockResolvedValueOnce({ data: mockNoticeResults, error: null }),
    }

    vi.mocked(supabaseModule.supabase.from).mockReturnValue(mockSupabase as unknown as ReturnType<typeof supabaseModule.supabase.from>)

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service', 'blog', 'notice'],
          limit: 30,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 3개 타입 모두 조회되어야 함
    expect(supabaseModule.supabase.from).toHaveBeenCalledWith('services')
    expect(supabaseModule.supabase.from).toHaveBeenCalledWith('blog_posts')
    expect(supabaseModule.supabase.from).toHaveBeenCalledWith('notices')

    // 결과가 병합되어야 함
    expect(result.current.data?.length).toBeGreaterThan(0)
  })

  // 4. 타입별 필터링 (type: 'service' → 서비스만)
  it('should filter by single type', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'AI Service',
        description: 'AI 서비스',
        type: 'service',
        created_at: '2025-01-01',
        image_url: null,
        category: null,
        url: '/services/1',
      },
    ]

    const mockSupabase = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockResults, error: null }),
    }

    vi.mocked(supabaseModule.supabase.from).mockReturnValue(mockSupabase as unknown as ReturnType<typeof supabaseModule.supabase.from>)

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 30,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 서비스만 조회
    expect(supabaseModule.supabase.from).toHaveBeenCalledWith('services')
    expect(supabaseModule.supabase.from).toHaveBeenCalledTimes(1)

    // 결과 타입 확인
    expect(result.current.data?.every((item) => item.type === 'service')).toBe(true)
  })

  // 5. 빈 결과 처리
  it('should return empty array for no results', async () => {
    const mockSupabase = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    vi.mocked(supabaseModule.supabase.from).mockReturnValue(mockSupabase as unknown as ReturnType<typeof supabaseModule.supabase.from>)

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'nonexistent',
          types: ['service'],
          limit: 30,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  // 6. React Query 캐싱 (staleTime: 5분)
  it('should cache results for 5 minutes', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'AI Service',
        description: 'AI 서비스',
        type: 'service',
        created_at: '2025-01-01',
        image_url: null,
        category: null,
        url: '/services/1',
      },
    ]

    const mockSupabase = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockResults, error: null }),
    }

    vi.mocked(supabaseModule.supabase.from).mockReturnValue(mockSupabase as unknown as ReturnType<typeof supabaseModule.supabase.from>)

    const { result, rerender } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 30,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 첫 번째 호출
    const firstCallCount = vi.mocked(supabaseModule.supabase.from).mock.calls.length

    // 동일한 쿼리로 재렌더링 (캐싱되어야 함)
    rerender()

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 호출 횟수가 증가하지 않아야 함 (캐싱됨)
    const secondCallCount = vi.mocked(supabaseModule.supabase.from).mock.calls.length
    expect(secondCallCount).toBe(firstCallCount)
  })

  // 7. 로딩 상태 (isLoading: true)
  it('should have loading state during query', async () => {
    const mockSupabase = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: [], error: null }), 100)
          })
      ),
    }

    vi.mocked(supabaseModule.supabase.from).mockReturnValue(mockSupabase as unknown as ReturnType<typeof supabaseModule.supabase.from>)

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 30,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    // 초기 로딩 상태
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  // 8. 에러 상태 (isError: true)
  it('should handle error state', async () => {
    const mockSupabase = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    }

    vi.mocked(supabaseModule.supabase.from).mockReturnValue(mockSupabase as unknown as ReturnType<typeof supabaseModule.supabase.from>)

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 30,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.data).toBeUndefined()
  })

  // 9. 검색어 변경 시 새로운 쿼리 실행
  it('should execute new query when search term changes', async () => {
    const mockSupabase = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn()
        .mockResolvedValueOnce({ data: [{ id: '1', title: 'AI' }], error: null })
        .mockResolvedValueOnce({ data: [{ id: '2', title: 'ML' }], error: null }),
    }

    vi.mocked(supabaseModule.supabase.from).mockReturnValue(mockSupabase as unknown as ReturnType<typeof supabaseModule.supabase.from>)

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useSearch({
          query,
          types: ['service'],
          limit: 30,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { query: 'AI' },
      }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 검색어 변경
    rerender({ query: 'ML' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 새로운 쿼리 실행됨
    expect(vi.mocked(supabaseModule.supabase.from).mock.calls.length).toBeGreaterThan(1)
  })

  // 10. limit 파라미터 적용
  it('should apply limit parameter', async () => {
    const mockSupabase = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    vi.mocked(supabaseModule.supabase.from).mockReturnValue(mockSupabase as unknown as ReturnType<typeof supabaseModule.supabase.from>)

    renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          limit: 10,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(mockSupabase.limit).toHaveBeenCalledWith(10)
    })
  })
})
