/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBlogPosts, useCreatePost, useUpdatePost, useDeletePost } from '@/hooks/useBlogPosts'
import { supabase } from '@/integrations/supabase/client'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('useBlogPosts', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should fetch blog posts successfully', async () => {
    const mockPosts = [
      {
        id: '1',
        title: 'Test Post 1',
        slug: 'test-post-1',
        content: 'Content 1',
        status: 'published',
        author: { id: 'user1', email: 'author@test.com' },
        category: { id: 'cat1', name: 'Tutorial', slug: 'tutorial' },
        tags: []
      },
      {
        id: '2',
        title: 'Test Post 2',
        slug: 'test-post-2',
        content: 'Content 2',
        status: 'published',
        author: { id: 'user1', email: 'author@test.com' },
        category: { id: 'cat2', name: 'Guide', slug: 'guide' },
        tags: []
      }
    ]

    const selectMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: mockPosts, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useBlogPosts(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockPosts)
    expect(supabase.from).toHaveBeenCalledWith('blog_posts')
  })

  it('should filter posts by status', async () => {
    const mockPosts = [
      {
        id: '1',
        title: 'Published Post',
        slug: 'published-post',
        status: 'published'
      }
    ]

    const selectMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: mockPosts, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useBlogPosts({ status: 'published' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(eqMock).toHaveBeenCalledWith('status', 'published')
  })

  it('should handle fetch error', async () => {
    const selectMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useBlogPosts(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should filter by category', async () => {
    const mockPosts = [
      {
        id: '1',
        title: 'Tutorial Post',
        category_id: 'cat1'
      }
    ]

    const selectMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: mockPosts, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useBlogPosts({ categoryId: 'cat1' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(eqMock).toHaveBeenCalledWith('category_id', 'cat1')
  })

  it('should sort posts by creation date', async () => {
    const mockPosts = [
      { id: '1', title: 'Post 1', created_at: '2025-10-20' },
      { id: '2', title: 'Post 2', created_at: '2025-10-19' }
    ]

    const selectMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: mockPosts, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useBlogPosts({ sortBy: 'created_at', sortOrder: 'desc' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
  })
})

describe('useCreatePost', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should create post successfully', async () => {
    const mockPost = {
      id: '1',
      title: 'New Post',
      slug: 'new-post',
      content: 'Content',
      status: 'draft'
    }

    const insertMock = vi.fn().mockReturnThis()
    const selectMock = vi.fn().mockReturnThis()
    const singleMock = vi.fn().mockResolvedValue({ data: mockPost, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock,
      select: selectMock,
      single: singleMock
    } as any)

    const { result } = renderHook(() => useCreatePost(), { wrapper })

    result.current.mutate({
      title: 'New Post',
      slug: 'new-post',
      content: 'Content',
      status: 'draft'
    } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(insertMock).toHaveBeenCalled()
    expect(result.current.data).toEqual(mockPost)
  })

  it('should handle create error', async () => {
    const insertMock = vi.fn().mockReturnThis()
    const selectMock = vi.fn().mockReturnThis()
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Create failed') })

    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock,
      select: selectMock,
      single: singleMock
    } as any)

    const { result } = renderHook(() => useCreatePost(), { wrapper })

    result.current.mutate({
      title: 'New Post',
      slug: 'new-post',
      content: 'Content'
    } as any)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})

describe('useUpdatePost', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should update post successfully', async () => {
    const mockPost = {
      id: '1',
      title: 'Updated Post',
      slug: 'updated-post',
      content: 'Updated content'
    }

    const updateMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const selectMock = vi.fn().mockReturnThis()
    const singleMock = vi.fn().mockResolvedValue({ data: mockPost, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
      eq: eqMock,
      select: selectMock,
      single: singleMock
    } as any)

    const { result } = renderHook(() => useUpdatePost(), { wrapper })

    result.current.mutate({
      id: '1',
      title: 'Updated Post',
      slug: 'updated-post',
      content: 'Updated content'
    } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(updateMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith('id', '1')
  })
})

describe('useDeletePost', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should delete post successfully', async () => {
    const deleteMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabase.from).mockReturnValue({
      delete: deleteMock,
      eq: eqMock
    } as any)

    const { result } = renderHook(() => useDeletePost(), { wrapper })

    result.current.mutate('1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith('id', '1')
  })

  it('should handle delete error', async () => {
    const deleteMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockResolvedValue({ error: new Error('Delete failed') })

    vi.mocked(supabase.from).mockReturnValue({
      delete: deleteMock,
      eq: eqMock
    } as any)

    const { result } = renderHook(() => useDeletePost(), { wrapper })

    result.current.mutate('1')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})
