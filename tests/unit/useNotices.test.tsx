/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNotices, useCreateNotice, useUpdateNotice, useDeleteNotice } from '@/hooks/useNotices'
import { supabase } from '@/integrations/supabase/client'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('useNotices', () => {
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

  it('should fetch notices successfully', async () => {
    const mockNotices = [
      {
        id: '1',
        type: 'info',
        title: 'Test Notice 1',
        content: 'Content 1',
        is_pinned: true,
        author: { id: 'user1', email: 'author@test.com' }
      },
      {
        id: '2',
        type: 'warning',
        title: 'Test Notice 2',
        content: 'Content 2',
        is_pinned: false,
        author: { id: 'user1', email: 'author@test.com' }
      }
    ]

    const selectMock = vi.fn().mockReturnThis()
    const isNotMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: mockNotices, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      is: isNotMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useNotices(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockNotices)
    expect(supabase.from).toHaveBeenCalledWith('notices')
  })

  it('should filter notices by type', async () => {
    const mockNotices = [
      {
        id: '1',
        type: 'urgent',
        title: 'Urgent Notice',
        content: 'Urgent content'
      }
    ]

    const selectMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const isNotMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: mockNotices, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      is: isNotMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useNotices({ type: 'urgent' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(eqMock).toHaveBeenCalledWith('type', 'urgent')
  })

  it('should handle fetch error', async () => {
    const selectMock = vi.fn().mockReturnThis()
    const isNotMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      is: isNotMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useNotices(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should sort pinned notices first', async () => {
    const mockNotices = [
      { id: '1', title: 'Pinned', is_pinned: true, created_at: '2025-10-19' },
      { id: '2', title: 'Regular', is_pinned: false, created_at: '2025-10-20' }
    ]

    const selectMock = vi.fn().mockReturnThis()
    const isNotMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: mockNotices, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      is: isNotMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useNotices(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(orderMock).toHaveBeenCalledWith('is_pinned', { ascending: false })
  })

  it('should exclude expired notices', async () => {
    const mockNotices = [
      {
        id: '1',
        title: 'Active Notice',
        expires_at: null
      }
    ]

    const selectMock = vi.fn().mockReturnThis()
    const isNotMock = vi.fn().mockReturnThis()
    const gtMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: mockNotices, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      is: isNotMock,
      gt: gtMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useNotices({ includeExpired: false }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Should filter expired notices
    expect(isNotMock).toHaveBeenCalledWith('expires_at', null)
  })
})

describe('useCreateNotice', () => {
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

  it('should create notice successfully', async () => {
    const mockNotice = {
      id: '1',
      type: 'info',
      title: 'New Notice',
      content: 'Content'
    }

    const insertMock = vi.fn().mockReturnThis()
    const selectMock = vi.fn().mockReturnThis()
    const singleMock = vi.fn().mockResolvedValue({ data: mockNotice, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock,
      select: selectMock,
      single: singleMock
    } as any)

    const { result } = renderHook(() => useCreateNotice(), { wrapper })

    result.current.mutate({
      type: 'info',
      title: 'New Notice',
      content: 'Content'
    } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(insertMock).toHaveBeenCalled()
    expect(result.current.data).toEqual(mockNotice)
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

    const { result } = renderHook(() => useCreateNotice(), { wrapper })

    result.current.mutate({
      type: 'info',
      title: 'New Notice',
      content: 'Content'
    } as any)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})

describe('useUpdateNotice', () => {
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

  it('should update notice successfully', async () => {
    const mockNotice = {
      id: '1',
      title: 'Updated Notice',
      content: 'Updated content'
    }

    const updateMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const selectMock = vi.fn().mockReturnThis()
    const singleMock = vi.fn().mockResolvedValue({ data: mockNotice, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
      eq: eqMock,
      select: selectMock,
      single: singleMock
    } as any)

    const { result } = renderHook(() => useUpdateNotice(), { wrapper })

    result.current.mutate({
      id: '1',
      title: 'Updated Notice',
      content: 'Updated content'
    } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(updateMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith('id', '1')
  })

  it('should toggle pinned status', async () => {
    const mockNotice = {
      id: '1',
      is_pinned: true
    }

    const updateMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const selectMock = vi.fn().mockReturnThis()
    const singleMock = vi.fn().mockResolvedValue({ data: mockNotice, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
      eq: eqMock,
      select: selectMock,
      single: singleMock
    } as any)

    const { result } = renderHook(() => useUpdateNotice(), { wrapper })

    result.current.mutate({
      id: '1',
      is_pinned: true
    } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ is_pinned: true }))
  })
})

describe('useDeleteNotice', () => {
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

  it('should delete notice successfully', async () => {
    const deleteMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabase.from).mockReturnValue({
      delete: deleteMock,
      eq: eqMock
    } as any)

    const { result } = renderHook(() => useDeleteNotice(), { wrapper })

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

    const { result } = renderHook(() => useDeleteNotice(), { wrapper })

    result.current.mutate('1')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})
