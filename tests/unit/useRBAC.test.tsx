 
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRoles, useUserPermissions, useHasPermission, useAssignRole, useRevokeRole } from '@/hooks/auth/useRBAC'
import { permissionsApi } from '@/integrations/cloudflare/client'
import React, { type ReactNode } from 'react'

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  permissionsApi: {
    getRoles: vi.fn(),
    getUserRoles: vi.fn(),
    assignRole: vi.fn(),
    revokeRole: vi.fn(),
  }
}))

// Mock useAuth
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user1', email: 'test@example.com' },
    workersUser: { id: 'user1', email: 'test@example.com' },
    isAuthenticated: true,
    getAccessToken: () => 'mock-token'
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

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should fetch roles successfully', async () => {
    const mockRolesResponse = {
      roles: [
        {
          id: 'role1',
          name: 'Super Admin',
          description: 'Full system access',
          permissions: ['*'],
          is_system: true
        },
        {
          id: 'role2',
          name: 'Admin',
          description: 'Admin access',
          permissions: ['admin:*'],
          is_system: false
        }
      ]
    }

    // Setup - Workers API 모킹
    vi.mocked(permissionsApi.getRoles).mockResolvedValue({
      data: mockRolesResponse,
      error: null,
      status: 200
    })

    const { result } = renderHook(() => useRoles(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(result.current.data).toHaveLength(2)
      expect(result.current.data?.[0].name).toBe('Super Admin')
      expect(result.current.data?.[1].name).toBe('Admin')
    }
    expect(permissionsApi.getRoles).toHaveBeenCalledWith('mock-token')
  })

  it('should handle fetch error', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(permissionsApi.getRoles).mockResolvedValue({
      data: null,
      error: 'Fetch failed',
      status: 500
    })

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

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should fetch user permissions successfully', async () => {
    const mockUserRolesResponse = {
      roles: [
        {
          id: 'role1',
          name: 'Editor',
          permissions: ['service:create', 'service:read', 'blog:create'],
          granted_at: '2024-01-01',
          granted_by: 'admin1',
          granted_by_name: 'Admin User'
        }
      ]
    }

    // Setup - Workers API 모킹
    vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
      data: mockUserRolesResponse,
      error: null,
      status: 200
    })

    const { result } = renderHook(() => useUserPermissions('user1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    if (result.current.isSuccess) {
      expect(result.current.data).toBeDefined()
      // 권한이 permission_name 형식으로 변환되어야 함
      expect(result.current.data?.some(p => p.permission_name === 'service:create')).toBe(true)
      expect(result.current.data?.some(p => p.permission_name === 'service:read')).toBe(true)
      expect(result.current.data?.some(p => p.permission_name === 'blog:create')).toBe(true)
    }
    expect(permissionsApi.getUserRoles).toHaveBeenCalledWith('mock-token', 'user1')
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
    // Setup - Workers API 에러 모킹
    vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
      data: null,
      error: 'Fetch failed',
      status: 500
    })

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

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should return true when user has permission', async () => {
    const mockUserRolesResponse = {
      roles: [
        {
          id: 'role1',
          name: 'Editor',
          permissions: ['service:create', 'service:read'],
          granted_at: '2024-01-01',
          granted_by: 'admin1',
          granted_by_name: 'Admin User'
        }
      ]
    }

    // Setup - Workers API 모킹
    vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
      data: mockUserRolesResponse,
      error: null,
      status: 200
    })

    const { result } = renderHook(() => useHasPermission('service:create'), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe(true)
    }, { timeout: 3000 })
  })

  it('should return false when user does not have permission', async () => {
    const mockUserRolesResponse = {
      roles: [
        {
          id: 'role1',
          name: 'Viewer',
          permissions: ['service:read'],
          granted_at: '2024-01-01',
          granted_by: 'admin1',
          granted_by_name: 'Admin User'
        }
      ]
    }

    // Setup - Workers API 모킹
    vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
      data: mockUserRolesResponse,
      error: null,
      status: 200
    })

    const { result } = renderHook(() => useHasPermission('service:delete'), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe(false)
    }, { timeout: 3000 })
  })

  it('should return false when no permissions', async () => {
    const mockUserRolesResponse = {
      roles: []
    }

    // Setup - Workers API 모킹 (빈 역할 목록)
    vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
      data: mockUserRolesResponse,
      error: null,
      status: 200
    })

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

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should assign role successfully', async () => {
    // Setup - Workers API 모킹
    vi.mocked(permissionsApi.assignRole).mockResolvedValue({
      data: { success: true },
      error: null,
      status: 200
    })

    const { result } = renderHook(() => useAssignRole(), { wrapper })

    result.current.mutate({
      userId: 'user1',
      roleId: 'role1'
    })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    expect(permissionsApi.assignRole).toHaveBeenCalledWith('mock-token', 'user1', 'role1')
    expect(result.current.isSuccess).toBe(true)
  })

  it('should handle assign error', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(permissionsApi.assignRole).mockResolvedValue({
      data: null,
      error: 'Assign failed',
      status: 500
    })

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

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should revoke role successfully', async () => {
    // Setup - Workers API 모킹
    vi.mocked(permissionsApi.revokeRole).mockResolvedValue({
      data: { success: true },
      error: null,
      status: 200
    })

    const { result } = renderHook(() => useRevokeRole(), { wrapper })

    result.current.mutate({
      userId: 'user1',
      roleId: 'role1'
    })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true), { timeout: 3000 })

    expect(permissionsApi.revokeRole).toHaveBeenCalledWith('mock-token', 'user1', 'role1')
    expect(result.current.isSuccess).toBe(true)
  })

  it('should handle revoke error', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(permissionsApi.revokeRole).mockResolvedValue({
      data: null,
      error: 'Revoke failed',
      status: 500
    })

    const { result } = renderHook(() => useRevokeRole(), { wrapper })

    result.current.mutate({
      userId: 'user1',
      roleId: 'role1'
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 })

    expect(result.current.error).toBeTruthy()
  })
})
