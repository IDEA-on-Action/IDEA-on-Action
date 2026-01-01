/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBlogPosts, useCreateBlogPost, useUpdateBlogPost, useDeleteBlogPost } from '@/hooks/useBlogPosts'
import { blogApi } from '@/integrations/cloudflare/client'
import { useAuth } from '@/hooks/auth/useAuth'
import React, { type ReactNode } from 'react'

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  blogApi: {
    getPosts: vi.fn(),
    createPost: vi.fn(),
    updatePost: vi.fn(),
    deletePost: vi.fn(),
  },
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('useBlogPosts', () => {
  let queryClient: QueryClient

  const mockPosts = [
    {
      id: '1',
      title: 'Test Post 1',
      slug: 'test-post-1',
      content: 'Content 1',
      status: 'published',
      author_id: 'user1',
      category: { id: 'cat1', name: 'Tutorial', slug: 'tutorial' },
      tags: [],
    },
    {
      id: '2',
      title: 'Test Post 2',
      slug: 'test-post-2',
      content: 'Content 2',
      status: 'published',
      author_id: 'user1',
      category: { id: 'cat2', name: 'Guide', slug: 'guide' },
      tags: [],
    },
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
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

  it('블로그 포스트 목록을 성공적으로 조회해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(blogApi.getPosts).mockResolvedValue({
      data: { data: mockPosts },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useBlogPosts(), { wrapper })

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    }, { timeout: 3000 })

    expect(result.current.data).toBeDefined()
    expect(result.current.data?.length).toBe(2)
    expect(result.current.data?.[0]).toHaveProperty('title', 'Test Post 1')
    expect(result.current.data?.[0].category).toEqual({ id: 'cat1', name: 'Tutorial', slug: 'tutorial' })
    expect(blogApi.getPosts).toHaveBeenCalled()
  })

  it('상태 필터가 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    const publishedPosts = mockPosts.filter(p => p.status === 'published')
    vi.mocked(blogApi.getPosts).mockResolvedValue({
      data: { data: publishedPosts },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useBlogPosts({ filters: { status: 'published' } }), { wrapper })

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    }, { timeout: 3000 })

    expect(blogApi.getPosts).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'published' })
    )
  })

  it('API 에러 발생 시 빈 배열을 반환해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(blogApi.getPosts).mockResolvedValue({
      data: null,
      error: 'Fetch failed',
      status: 500,
    })

    // Execute
    const { result } = renderHook(() => useBlogPosts(), { wrapper })

    // Assert - 에러 시 빈 배열 반환
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('카테고리 필터가 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    const filteredPosts = mockPosts.filter(p => p.category?.id === 'cat1')
    vi.mocked(blogApi.getPosts).mockResolvedValue({
      data: { data: filteredPosts },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useBlogPosts({ filters: { category_id: 'cat1' } }), { wrapper })

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    }, { timeout: 3000 })

    expect(blogApi.getPosts).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'cat1' })
    )
  })

  it('로딩 상태가 올바르게 동작해야 함', async () => {
    // Setup - 지연된 응답 모킹
    vi.mocked(blogApi.getPosts).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: { data: mockPosts }, error: null, status: 200 })
          }, 100)
        })
    )

    // Execute
    const { result } = renderHook(() => useBlogPosts(), { wrapper })

    // Assert - 초기 로딩 상태
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()

    // Assert - 완료 후
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    }, { timeout: 3000 })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toEqual(mockPosts)
  })
})

describe('useCreateBlogPost', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()

    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      workersTokens: { accessToken: 'test-token', refreshToken: 'refresh-token' },
    } as any)
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('포스트를 성공적으로 생성해야 함', async () => {
    // Setup - Workers API 모킹
    const mockCreatedPost = {
      id: '1',
      title: 'New Post',
      slug: 'new-post',
      content: 'Content',
      status: 'draft',
    }

    vi.mocked(blogApi.createPost).mockResolvedValue({
      data: { data: mockCreatedPost },
      error: null,
      status: 201,
    })

    // Execute
    const { result } = renderHook(() => useCreateBlogPost(), { wrapper })

    result.current.mutate({
      title: 'New Post',
      slug: 'new-post',
      content: 'Content',
      status: 'draft',
    } as any)

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    }, { timeout: 3000 })

    expect(blogApi.createPost).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({
        title: 'New Post',
        slug: 'new-post',
        content: 'Content',
      })
    )
    expect(result.current.data).toEqual(mockCreatedPost)
  })

  it('인증 없이 생성 시도 시 에러가 발생해야 함', async () => {
    // Setup - 인증 없음
    vi.mocked(useAuth).mockReturnValue({
      workersTokens: null,
    } as any)

    // Execute
    const { result } = renderHook(() => useCreateBlogPost(), { wrapper })

    result.current.mutate({
      title: 'New Post',
      slug: 'new-post',
      content: 'Content',
    } as any)

    // Assert
    await waitFor(() => {
      expect(result.current.isError || result.current.isSuccess).toBe(true)
    }, { timeout: 3000 })

    expect(result.current.error).toBeTruthy()
  })

  it('API 에러 발생 시 에러 상태가 되어야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(blogApi.createPost).mockResolvedValue({
      data: null,
      error: 'Create failed',
      status: 500,
    })

    // Execute
    const { result } = renderHook(() => useCreateBlogPost(), { wrapper })

    result.current.mutate({
      title: 'New Post',
      slug: 'new-post',
      content: 'Content',
    } as any)

    // Assert
    await waitFor(() => {
      expect(result.current.isError || result.current.isSuccess).toBe(true)
    }, { timeout: 3000 })

    expect(result.current.error).toBeTruthy()
  })
})

describe('useUpdateBlogPost', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()

    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      workersTokens: { accessToken: 'test-token', refreshToken: 'refresh-token' },
    } as any)
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('포스트를 성공적으로 업데이트해야 함', async () => {
    // Setup - Workers API 모킹
    const mockUpdatedPost = {
      id: '1',
      title: 'Updated Post',
      slug: 'updated-post',
      content: 'Updated content',
    }

    vi.mocked(blogApi.updatePost).mockResolvedValue({
      data: { data: mockUpdatedPost },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useUpdateBlogPost(), { wrapper })

    result.current.mutate({
      id: '1',
      data: {
        title: 'Updated Post',
        slug: 'updated-post',
        content: 'Updated content',
      },
    } as any)

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    }, { timeout: 3000 })

    expect(blogApi.updatePost).toHaveBeenCalledWith(
      'test-token',
      '1',
      expect.objectContaining({
        title: 'Updated Post',
        slug: 'updated-post',
        content: 'Updated content',
      })
    )
  })

  it('인증 없이 업데이트 시도 시 에러가 발생해야 함', async () => {
    // Setup - 인증 없음
    vi.mocked(useAuth).mockReturnValue({
      workersTokens: null,
    } as any)

    // Execute
    const { result } = renderHook(() => useUpdateBlogPost(), { wrapper })

    result.current.mutate({
      id: '1',
      data: {
        title: 'Updated Post',
      },
    } as any)

    // Assert
    await waitFor(() => {
      expect(result.current.isError || result.current.isSuccess).toBe(true)
    }, { timeout: 3000 })

    expect(result.current.error).toBeTruthy()
  })
})

describe('useDeleteBlogPost', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()

    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      workersTokens: { accessToken: 'test-token', refreshToken: 'refresh-token' },
    } as any)
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('포스트를 성공적으로 삭제해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(blogApi.deletePost).mockResolvedValue({
      data: { success: true },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useDeleteBlogPost(), { wrapper })

    result.current.mutate('1')

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    }, { timeout: 3000 })

    expect(blogApi.deletePost).toHaveBeenCalledWith('test-token', '1')
  })

  it('인증 없이 삭제 시도 시 에러가 발생해야 함', async () => {
    // Setup - 인증 없음
    vi.mocked(useAuth).mockReturnValue({
      workersTokens: null,
    } as any)

    // Execute
    const { result } = renderHook(() => useDeleteBlogPost(), { wrapper })

    result.current.mutate('1')

    // Assert
    await waitFor(() => {
      expect(result.current.isError || result.current.isSuccess).toBe(true)
    }, { timeout: 3000 })

    expect(result.current.error).toBeTruthy()
  })

  it('API 에러 발생 시 에러 상태가 되어야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(blogApi.deletePost).mockResolvedValue({
      data: null,
      error: 'Delete failed',
      status: 500,
    })

    // Execute
    const { result } = renderHook(() => useDeleteBlogPost(), { wrapper })

    result.current.mutate('1')

    // Assert
    await waitFor(() => {
      expect(result.current.isError || result.current.isSuccess).toBe(true)
    }, { timeout: 3000 })

    expect(result.current.error).toBeTruthy()
  })
})
