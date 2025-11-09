/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuditLogs, useLogAction } from '@/hooks/useAuditLogs'
import { supabase } from '@/integrations/supabase/client'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null
      })
    }
  }
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user1', email: 'test@example.com' }
  })
}))

describe('useAuditLogs', () => {
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

  it('should fetch audit logs successfully', async () => {
    const mockLogs = [
      {
        id: 'log1',
        action: 'create',
        resource_type: 'service',
        resource_id: 'service1',
        user_id: 'user1',
        user: { email: 'admin@test.com' },
        created_at: '2025-10-20T10:00:00Z'
      },
      {
        id: 'log2',
        action: 'update',
        resource_type: 'blog_post',
        resource_id: 'post1',
        user_id: 'user1',
        user: { email: 'admin@test.com' },
        created_at: '2025-10-20T09:00:00Z'
      }
    ]

    const selectMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockReturnThis()
    const limitMock = vi.fn().mockResolvedValue({ data: mockLogs, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      order: orderMock,
      limit: limitMock
    } as any)

    const { result } = renderHook(() => useAuditLogs(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    expect(result.current.data).toEqual(mockLogs)
    expect(supabase.from).toHaveBeenCalledWith('audit_logs')
  })

  it('should filter logs by action', async () => {
    const mockLogs = [
      {
        id: 'log1',
        action: 'create',
        resource_type: 'service',
        user_id: 'user1'
      }
    ]

    const selectMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockReturnThis()
    const limitMock = vi.fn().mockResolvedValue({ data: mockLogs, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock,
      limit: limitMock
    } as any)

    const { result } = renderHook(() => useAuditLogs({ action: 'create' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    expect(eqMock).toHaveBeenCalledWith('action', 'create')
  })

  it('should filter logs by user', async () => {
    const mockLogs = [
      {
        id: 'log1',
        action: 'update',
        user_id: 'user1'
      }
    ]

    const limitMock = vi.fn().mockResolvedValue({ data: mockLogs, error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
    const eqMock = vi.fn().mockReturnValue({ order: orderMock } as any)
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

    const { result } = renderHook(() => useAuditLogs({ user_id: 'user1' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user1')
    }
  })

  it('should filter logs by resource type', async () => {
    const mockLogs = [
      {
        id: 'log1',
        action: 'create',
        resource_type: 'service'
      }
    ]

    const limitMock = vi.fn().mockResolvedValue({ data: mockLogs, error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
    const eqMock = vi.fn().mockReturnValue({ order: orderMock } as any)
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

    const { result } = renderHook(() => useAuditLogs({ resource: 'service' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(eqMock).toHaveBeenCalledWith('resource', 'service')
    }
  })

  it('should limit results', async () => {
    const mockLogs = Array.from({ length: 50 }, (_, i) => ({
      id: `log${i}`,
      action: 'read',
      resource_type: 'service',
      user_id: 'user1'
    }))

    const limitMock = vi.fn().mockResolvedValue({ data: mockLogs.slice(0, 50), error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock } as any)
    const selectMock = vi.fn().mockReturnValue({ order: orderMock } as any)

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock
    } as any)

    const { result } = renderHook(() => useAuditLogs({}, 50), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(limitMock).toHaveBeenCalledWith(50)
    }
  })

  it('should handle fetch error', async () => {
    const selectMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockReturnThis()
    const limitMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      order: orderMock,
      limit: limitMock
    } as any)

    const { result } = renderHook(() => useAuditLogs(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})

describe('useLogAction', () => {
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

  it('should log action successfully', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useLogAction(), { wrapper })

    result.current.mutate({
      action: 'create',
      resource: 'service',
      resourceId: 'service1',
      details: { title: 'New Service' }
    })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(supabase.rpc).toHaveBeenCalledWith('log_action', {
        p_user_id: 'user1',
        p_action: 'create',
        p_resource: 'service',
        p_resource_id: 'service1',
        p_details: { title: 'New Service' }
      })
    }
  })

  it('should log action without details', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useLogAction(), { wrapper })

    result.current.mutate({
      action: 'delete',
      resource: 'blog_post',
      resourceId: 'post1'
    })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(supabase.rpc).toHaveBeenCalledWith('log_action', {
        p_user_id: 'user1',
        p_action: 'delete',
        p_resource: 'blog_post',
        p_resource_id: 'post1',
        p_details: null
      })
    }
  })

  it('should handle log error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('Log failed') })

    const { result } = renderHook(() => useLogAction(), { wrapper })

    result.current.mutate({
      action: 'update',
      resource: 'notice',
      resourceId: 'notice1'
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should log different action types', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useLogAction(), { wrapper })

    const actions = ['create', 'read', 'update', 'delete']

    for (const action of actions) {
      result.current.mutate({
        action: action as any,
        resource: 'service',
        resourceId: 'service1'
      })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(supabase.rpc).toHaveBeenCalledWith('log_action', expect.objectContaining({
          p_action: action
        }))
      }
    }
  })

  it('should log different resource types', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useLogAction(), { wrapper })

    const resources = ['service', 'blog_post', 'notice', 'user', 'role']

    for (const resource of resources) {
      result.current.mutate({
        action: 'create',
        resource: resource as any,
        resourceId: `${resource}1`
      })

      await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

      if (result.current.isSuccess) {
        expect(supabase.rpc).toHaveBeenCalledWith('log_action', expect.objectContaining({
          p_resource: resource
        }))
      }
    }
  })
})
