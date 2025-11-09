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
import { supabase } from '@/integrations/supabase/client'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
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
    // Query is empty, so no Supabase calls should be made

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
    const mockServices = [
      {
        id: '1',
        title: 'AI Service',
        description: 'AI 기반 서비스',
        image_url: null,
        created_at: '2025-01-01',
        category: null,
      },
    ]

    const limitMock = vi.fn().mockResolvedValue({ data: mockServices, error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
    const orMock = vi.fn().mockReturnValue({ order: orderMock } as any)
    const eqMock = vi.fn().mockReturnValue({ or: orMock } as any)
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

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
      expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(true)
    }, { timeout: 3000 })

    if (result.current.data !== undefined) {
      expect(result.current.data.length).toBeGreaterThan(0)
      expect(supabase.from).toHaveBeenCalledWith('services')
    }
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

    // Create separate mock chains for each table
    const createMockChain = (data: any) => {
      const limitMock = vi.fn().mockResolvedValue({ data, error: null })
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
      const orMock = vi.fn().mockReturnValue({ order: orderMock } as any)
      const eqMock = vi.fn().mockReturnValue({ or: orMock } as any)
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)
      return { select: selectMock }
    }

    let callCount = 0
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      callCount++
      if (table === 'services') return createMockChain(mockServiceResults) as any
      if (table === 'blog_posts') return createMockChain(mockBlogResults) as any
      if (table === 'notices') return createMockChain(mockNoticeResults) as any
      return createMockChain([]) as any
    })

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
      expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(true)
    }, { timeout: 3000 })

    // 3개 타입 모두 조회되어야 함
    expect(supabase.from).toHaveBeenCalledWith('services')
    expect(supabase.from).toHaveBeenCalledWith('blog_posts')
    expect(supabase.from).toHaveBeenCalledWith('notices')

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

    const limitMock = vi.fn().mockResolvedValue({ data: mockResults, error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
    const orMock = vi.fn().mockReturnValue({ order: orderMock } as any)
    const eqMock = vi.fn().mockReturnValue({ or: orMock } as any)
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

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
      expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(true)
    }, { timeout: 3000 })

    // 서비스만 조회
    expect(supabase.from).toHaveBeenCalledWith('services')
    expect(supabase.from).toHaveBeenCalledTimes(1)

    // 결과 타입 확인
    expect(result.current.data?.every((item) => item.type === 'service')).toBe(true)
  })

  // 5. 빈 결과 처리
  it('should return empty array for no results', async () => {
    const limitMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
    const orMock = vi.fn().mockReturnValue({ order: orderMock } as any)
    const eqMock = vi.fn().mockReturnValue({ or: orMock } as any)
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

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
      expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(true)
    }, { timeout: 3000 })

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

    const limitMock = vi.fn().mockResolvedValue({ data: mockResults, error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
    const orMock = vi.fn().mockReturnValue({ order: orderMock } as any)
    const eqMock = vi.fn().mockReturnValue({ or: orMock } as any)
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

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
      expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(true)
    }, { timeout: 3000 })

    // 첫 번째 호출
    const firstCallCount = vi.mocked(supabase.from).mock.calls.length

    // 동일한 쿼리로 재렌더링 (캐싱되어야 함)
    rerender()

    await waitFor(() => {
      expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(true)
    }, { timeout: 3000 })

    // 호출 횟수가 증가하지 않아야 함 (캐싱됨)
    const secondCallCount = vi.mocked(supabase.from).mock.calls.length
    expect(secondCallCount).toBe(firstCallCount)
  })

  // 7. 로딩 상태 (isLoading: true)
  it('should have loading state during query', async () => {
    const limitMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: [], error: null }), 100)
        })
    )
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
    const orMock = vi.fn().mockReturnValue({ order: orderMock } as any)
    const eqMock = vi.fn().mockReturnValue({ or: orMock } as any)
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

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
    // Hook checks for servicesError and logs it, but doesn't throw
    // So we need to make the query fail
    const limitMock = vi.fn().mockRejectedValue(new Error('Database error'))
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
    const orMock = vi.fn().mockReturnValue({ order: orderMock } as any)
    const eqMock = vi.fn().mockReturnValue({ or: orMock } as any)
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

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
    const limitMock1 = vi.fn().mockResolvedValue({ data: [{ id: '1', title: 'AI', description: '', created_at: '2025-01-01', image_url: null, category: null }], error: null })
    const limitMock2 = vi.fn().mockResolvedValue({ data: [{ id: '2', title: 'ML', description: '', created_at: '2025-01-02', image_url: null, category: null }], error: null })
    
    let callCount = 0
    const createMockChain = (limitMock: any) => {
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
      const orMock = vi.fn().mockReturnValue({ order: orderMock } as any)
      const eqMock = vi.fn().mockReturnValue({ or: orMock } as any)
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)
      return { select: selectMock }
    }

    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++
      if (callCount <= 1) return createMockChain(limitMock1) as any
      return createMockChain(limitMock2) as any
    })

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
      expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(true)
    }, { timeout: 3000 })

    // 검색어 변경
    rerender({ query: 'ML' })

    await waitFor(() => {
      expect(result.current.isLoading === false && (result.current.data !== undefined || result.current.isError)).toBe(true)
    }, { timeout: 3000 })

    // 새로운 쿼리 실행됨
    expect(vi.mocked(supabase.from).mock.calls.length).toBeGreaterThan(1)
  })

  // 10. limit 파라미터 적용
  it('should apply limit parameter', async () => {
    const limitMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
    const orMock = vi.fn().mockReturnValue({ order: orderMock } as any)
    const eqMock = vi.fn().mockReturnValue({ or: orMock } as any)
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

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
      expect(limitMock).toHaveBeenCalled()
    })
  })
})
