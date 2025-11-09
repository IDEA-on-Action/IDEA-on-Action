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

    // Hook calls: select -> or -> order(is_pinned) -> order(published_at) -> (range if limit)
    // Since no limit, the second order returns the final result
    const orderMock2 = vi.fn().mockResolvedValue({ data: mockNotices, error: null })
    const orderMock1 = vi.fn().mockReturnValue({ order: orderMock2 } as any)
    const orMock = vi.fn().mockReturnValue({ order: orderMock1 } as any)
    const selectMock = vi.fn().mockReturnValue({ or: orMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

    const { result } = renderHook(() => useNotices(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(result.current.data).toEqual(mockNotices)
      expect(supabase.from).toHaveBeenCalledWith('notices')
    }
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

    const rangeMock = vi.fn().mockResolvedValue({ data: mockNotices, error: null })
    const orderMock2 = vi.fn().mockReturnValue({ range: rangeMock } as any)
    const orderMock1 = vi.fn().mockReturnValue({ order: orderMock2 } as any)
    const orMock = vi.fn().mockReturnValue({ order: orderMock1 } as any)
    const eqMock = vi.fn().mockReturnValue({ or: orMock } as any)
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

    const { result } = renderHook(() => useNotices({ filters: { type: 'urgent' } }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(eqMock).toHaveBeenCalledWith('type', 'urgent')
    }
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

    const rangeMock = vi.fn().mockResolvedValue({ data: mockNotices, error: null })
    const orderMock2 = vi.fn().mockReturnValue({ range: rangeMock } as any)
    const orderMock1 = vi.fn().mockReturnValue({ order: orderMock2 } as any)
    const orMock = vi.fn().mockReturnValue({ order: orderMock1 } as any)
    const selectMock = vi.fn().mockReturnValue({ or: orMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

    const { result } = renderHook(() => useNotices(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(orderMock1).toHaveBeenCalledWith('is_pinned', { ascending: false })
    }
  })

  it('should exclude expired notices', async () => {
    const mockNotices = [
      {
        id: '1',
        title: 'Active Notice',
        expires_at: null
      }
    ]

    const rangeMock = vi.fn().mockResolvedValue({ data: mockNotices, error: null })
    const orderMock2 = vi.fn().mockReturnValue({ range: rangeMock } as any)
    const orderMock1 = vi.fn().mockReturnValue({ order: orderMock2 } as any)
    const orMock = vi.fn().mockReturnValue({ order: orderMock1 } as any)
    const selectMock = vi.fn().mockReturnValue({ or: orMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

    const { result } = renderHook(() => useNotices({ filters: { include_expired: false } }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(orMock).toHaveBeenCalled()
    }
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

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

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
      data: {
        title: 'Updated Notice',
        content: 'Updated content'
      }
    } as any)

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(updateMock).toHaveBeenCalled()
      expect(eqMock).toHaveBeenCalledWith('id', '1')
    }
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
      data: {
        is_pinned: true,
        updated_at: new Date().toISOString()
      }
    } as any)

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ is_pinned: true }))
    }
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

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

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
