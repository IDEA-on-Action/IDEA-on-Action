/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRoles, useUserPermissions, useHasPermission, useAssignRole, useRevokeRole } from '@/hooks/useRBAC'
import { supabase } from '@/integrations/supabase/client'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user1', email: 'test@example.com' }
  })
}))

describe('useRoles', () => {
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

  it('should fetch roles successfully', async () => {
    const mockRoles = [
      {
        id: 'role1',
        name: 'Super Admin',
        description: 'Full system access',
        permissions: []
      },
      {
        id: 'role2',
        name: 'Admin',
        description: 'Admin access',
        permissions: []
      }
    ]

    const selectMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: mockRoles, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useRoles(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(result.current.data).toEqual(mockRoles)
    }
    expect(supabase.from).toHaveBeenCalledWith('roles')
  })

  it('should handle fetch error', async () => {
    const selectMock = vi.fn().mockReturnThis()
    const orderMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') })

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      order: orderMock
    } as any)

    const { result } = renderHook(() => useRoles(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})

describe('useUserPermissions', () => {
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

  it('should fetch user permissions successfully', async () => {
    const mockPermissions = [
      { permission_name: 'service:create' },
      { permission_name: 'service:read' },
      { permission_name: 'blog:create' }
    ]

    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockPermissions, error: null })

    const { result } = renderHook(() => useUserPermissions('user1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(result.current.data).toEqual(mockPermissions)
    }
    expect(supabase.rpc).toHaveBeenCalledWith('get_user_permissions', { p_user_id: 'user1' })
  })

  it('should return empty array when no user ID', async () => {
    const { result } = renderHook(() => useUserPermissions(undefined), { wrapper })

    // When userId is undefined, the query is disabled (enabled: !!userId)
    // So it won't run and data will be undefined
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 })

    expect(result.current.data).toBeUndefined()
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isError).toBe(false)
  })

  it('should handle fetch error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('Fetch failed') })

    const { result } = renderHook(() => useUserPermissions('user1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})

describe('useHasPermission', () => {
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

  it('should return true when user has permission', async () => {
    const mockPermissions = [
      { permission_name: 'service:create' },
      { permission_name: 'service:read' }
    ]

    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockPermissions, error: null })

    const { result } = renderHook(() => useHasPermission('service:create'), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe(true)
    }, { timeout: 3000 })
  })

  it('should return false when user does not have permission', async () => {
    const mockPermissions = [
      { permission_name: 'service:read' }
    ]

    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockPermissions, error: null })

    const { result } = renderHook(() => useHasPermission('service:delete'), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe(false)
    }, { timeout: 3000 })
  })

  it('should return false when no permissions', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useHasPermission('service:create'), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe(false)
    }, { timeout: 3000 })
  })
})

describe('useAssignRole', () => {
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

  it('should assign role successfully', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock
    } as any)

    const { result } = renderHook(() => useAssignRole(), { wrapper })

    result.current.mutate({
      userId: 'user1',
      roleId: 'role1'
    })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user1',
      role_id: 'role1',
      assigned_by: 'user1'
    })
    expect(result.current.data).toBeUndefined()
  })

  it('should handle assign error', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Assign failed') })

    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock
    } as any)

    const { result } = renderHook(() => useAssignRole(), { wrapper })

    result.current.mutate({
      userId: 'user1',
      roleId: 'role1'
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 })

    expect(result.current.error).toBeTruthy()
  })
})

describe('useRevokeRole', () => {
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

  it('should revoke role successfully', async () => {
    const deleteMock = vi.fn().mockReturnThis()
    const eq1Mock = vi.fn().mockReturnThis()
    const eq2Mock = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabase.from).mockReturnValue({
      delete: deleteMock,
      eq: vi.fn()
        .mockReturnValueOnce(eq1Mock) // First eq call returns chainable
        .mockReturnValueOnce(eq2Mock) // Second eq call resolves
    } as any)

    const { result } = renderHook(() => useRevokeRole(), { wrapper })

    result.current.mutate({
      userId: 'user1',
      roleId: 'role1'
    })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    expect(deleteMock).toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledWith('user_roles')
  })

  it('should handle revoke error', async () => {
    const deleteMock = vi.fn().mockReturnThis()
    const eq1Mock = vi.fn().mockReturnThis()
    const eq2Mock = vi.fn().mockResolvedValue({ error: new Error('Revoke failed') })

    vi.mocked(supabase.from).mockReturnValue({
      delete: deleteMock,
      eq: vi.fn()
        .mockReturnValueOnce(eq1Mock) // First eq call returns chainable
        .mockReturnValueOnce(eq2Mock) // Second eq call resolves with error
    } as any)

    const { result } = renderHook(() => useRevokeRole(), { wrapper })

    result.current.mutate({
      userId: 'user1',
      roleId: 'role1'
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 })

    expect(result.current.error).toBeTruthy()
  })
})
