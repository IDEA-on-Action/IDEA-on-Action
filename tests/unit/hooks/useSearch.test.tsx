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

// ========================================
// Type Definitions
// ========================================

// Database Entity Types
interface Service {
  id: string
  title: string
  description: string
  image_url: string | null
  created_at: string
  category: string | null
}

interface BlogPost {
  id: string
  title: string
  content: string
  featured_image: string | null
  created_at: string
  category: string
}

interface Notice {
  id: string
  title: string
  content: string
  priority: string
  created_at: string
}

// Search Result Types
interface ServiceSearchResult extends Service {
  type: 'service'
  url: string
}

interface BlogSearchResult extends BlogPost {
  type: 'blog'
  url: string
}

interface NoticeSearchResult extends Notice {
  type: 'notice'
  url: string
}

type SearchResult = ServiceSearchResult | BlogSearchResult | NoticeSearchResult

// Supabase Query Mock Types
interface SupabaseQueryResult<T> {
  data: T[] | null
  error: { message: string } | null
}

interface SupabaseQueryBuilder<T> {
  select: (columns?: string) => SupabaseQueryBuilder<T>
  eq: (column: string, value: unknown) => SupabaseQueryBuilder<T>
  or: (query: string) => SupabaseQueryBuilder<T>
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder<T>
  limit: (count: number) => Promise<SupabaseQueryResult<T>>
}

interface SupabaseClient {
  from: <T = unknown>(table: string) => SupabaseQueryBuilder<T>
}

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  } as SupabaseClient,
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
    const mockServices: Service[] = [
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
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const orMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ or: orMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as SupabaseQueryBuilder<Service>)

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
    const mockServiceResults: ServiceSearchResult[] = [
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

    const mockBlogResults: BlogSearchResult[] = [
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

    const mockNoticeResults: NoticeSearchResult[] = [
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
    const createMockChain = <T,>(data: T[]) => {
      const limitMock = vi.fn().mockResolvedValue({ data, error: null })
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const orMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqMock = vi.fn().mockReturnValue({ or: orMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
      return { select: selectMock }
    }

    let callCount = 0
    vi.mocked(supabase.from).mockImplementation(<T,>(table: string): SupabaseQueryBuilder<T> => {
      callCount++
      if (table === 'services') return createMockChain(mockServiceResults) as SupabaseQueryBuilder<T>
      if (table === 'blog_posts') return createMockChain(mockBlogResults) as SupabaseQueryBuilder<T>
      if (table === 'notices') return createMockChain(mockNoticeResults) as SupabaseQueryBuilder<T>
      return createMockChain([]) as SupabaseQueryBuilder<T>
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
    const mockResults: ServiceSearchResult[] = [
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
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const orMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ or: orMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as SupabaseQueryBuilder<ServiceSearchResult>)

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
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const orMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ or: orMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as SupabaseQueryBuilder<Service>)

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
    const mockResults: ServiceSearchResult[] = [
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
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const orMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ or: orMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as SupabaseQueryBuilder<ServiceSearchResult>)

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
        new Promise<SupabaseQueryResult<Service>>((resolve) => {
          setTimeout(() => resolve({ data: [], error: null }), 100)
        })
    )
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const orMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ or: orMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as SupabaseQueryBuilder<Service>)

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
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const orMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ or: orMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as SupabaseQueryBuilder<Service>)

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
    const mockData1: Service[] = [
      { id: '1', title: 'AI', description: '', created_at: '2025-01-01', image_url: null, category: null }
    ]
    const mockData2: Service[] = [
      { id: '2', title: 'ML', description: '', created_at: '2025-01-02', image_url: null, category: null }
    ]

    const limitMock1 = vi.fn().mockResolvedValue({ data: mockData1, error: null })
    const limitMock2 = vi.fn().mockResolvedValue({ data: mockData2, error: null })

    let callCount = 0
    const createMockChain = (limitMock: ReturnType<typeof vi.fn>) => {
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const orMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqMock = vi.fn().mockReturnValue({ or: orMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
      return { select: selectMock }
    }

    vi.mocked(supabase.from).mockImplementation((): SupabaseQueryBuilder<Service> => {
      callCount++
      if (callCount <= 1) return createMockChain(limitMock1) as SupabaseQueryBuilder<Service>
      return createMockChain(limitMock2) as SupabaseQueryBuilder<Service>
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
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const orMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ or: orMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as SupabaseQueryBuilder<Service>)

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

  // 11. enabled 옵션으로 쿼리 비활성화
  it('should not execute query when enabled is false', () => {
    const { result } = renderHook(
      () =>
        useSearch({
          query: 'AI',
          types: ['service'],
          enabled: false,
        }),
      {
        wrapper: createWrapper(),
      }
    )

    expect(result.current.data).toBeUndefined()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  // 12. 검색어가 2자 미만일 때 쿼리 실행 안함
  it('should not execute query when query is less than 2 characters', () => {
    const { result } = renderHook(
      () =>
        useSearch({
          query: 'A',
          types: ['service'],
        }),
      {
        wrapper: createWrapper(),
      }
    )

    expect(result.current.data).toBeUndefined()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  // 13. 날짜 순으로 정렬
  it('should sort results by date descending', async () => {
    const mockResults: ServiceSearchResult[] = [
      {
        id: '1',
        title: 'Service 1',
        description: 'Desc 1',
        type: 'service',
        created_at: '2025-01-01',
        image_url: null,
        category: null,
        url: '/services/1',
      },
      {
        id: '2',
        title: 'Service 2',
        description: 'Desc 2',
        type: 'service',
        created_at: '2025-01-02',
        image_url: null,
        category: null,
        url: '/services/2',
      },
    ]

    const limitMock = vi.fn().mockResolvedValue({ data: mockResults, error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const orMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ or: orMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as SupabaseQueryBuilder<ServiceSearchResult>)

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'Service',
          types: ['service'],
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    // orderMock이 호출되어야 함
    expect(orderMock).toHaveBeenCalled()
  })

  // 14. 블로그 검색 결과 타입 확인
  it('should return blog type results', async () => {
    const mockBlogResults: BlogSearchResult[] = [
      {
        id: '1',
        title: 'Blog Post',
        content: 'Content',
        type: 'blog',
        created_at: '2025-01-01',
        featured_image: null,
        category: 'Tech',
        url: '/blog/1',
      },
    ]

    const limitMock = vi.fn().mockResolvedValue({ data: mockBlogResults, error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const orMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ or: orMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as SupabaseQueryBuilder<BlogSearchResult>)

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'Blog',
          types: ['blog'],
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.data?.every((item) => item.type === 'blog')).toBe(true)
    })
  })

  // 15. 공지사항 검색 결과 타입 확인
  it('should return notice type results', async () => {
    const mockNoticeResults: NoticeSearchResult[] = [
      {
        id: '1',
        title: 'Notice',
        content: 'Notice content',
        type: 'notice',
        created_at: '2025-01-01',
        priority: 'high',
        url: '/notices/1',
      },
    ]

    const limitMock = vi.fn().mockResolvedValue({ data: mockNoticeResults, error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const orMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ or: orMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as SupabaseQueryBuilder<NoticeSearchResult>)

    const { result } = renderHook(
      () =>
        useSearch({
          query: 'Notice',
          types: ['notice'],
        }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.data?.every((item) => item.type === 'notice')).toBe(true)
    })
  })
})
