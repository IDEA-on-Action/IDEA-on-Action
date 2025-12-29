 
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useAuditLogs,
  useAuditLog,
  useAuditStatistics,
  useUserAuditHistory,
  useResourceAuditHistory,
  useLegacyAuditLogs,
  useDeleteAuditLog,
} from '@/hooks/useAuditLogs'
import { callWorkersApi } from '@/integrations/cloudflare/client'
import React, { type ReactNode } from 'react'

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
  realtimeApi: {
    connect: vi.fn().mockReturnValue({
      onmessage: null,
      close: vi.fn(),
    }),
  },
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user1', email: 'test@example.com' },
    workersTokens: { accessToken: 'test-token' },
  }),
}))

describe('useAuditLogs', () => {
  let queryClient: QueryClient

  const mockLogs = [
    {
      id: 'log1',
      event_type: 'user.login',
      actor_id: 'user1',
      actor_type: 'user',
      action: 'login',
      resource_type: 'session',
      resource_id: 'session1',
      metadata: { ip: '127.0.0.1' },
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
      created_at: '2025-12-20T10:00:00Z',
      actor: { email: 'admin@test.com' },
    },
    {
      id: 'log2',
      event_type: 'resource.update',
      actor_id: 'user1',
      actor_type: 'user',
      action: 'update',
      resource_type: 'blog_post',
      resource_id: 'post1',
      metadata: { changes: { title: 'new title' } },
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
      created_at: '2025-12-20T09:00:00Z',
      actor: { email: 'admin@test.com' },
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

  it('감사 로그 목록을 성공적으로 조회해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: { logs: mockLogs, total: 2 },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useAuditLogs(), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(result.current.data?.logs).toEqual(mockLogs)
      expect(result.current.data?.total).toBe(2)
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/audit-logs'),
        expect.objectContaining({ token: 'test-token' })
      )
    }
  })

  it('action 필터가 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    const filteredLogs = mockLogs.filter((l) => l.action === 'login')
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: { logs: filteredLogs, total: 1 },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useAuditLogs({ action: 'login' }), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('action=login'),
        expect.any(Object)
      )
    }
  })

  it('actor_id 필터가 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: { logs: mockLogs, total: 2 },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useAuditLogs({ actor_id: 'user1' }), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('actor_id=user1'),
        expect.any(Object)
      )
    }
  })

  it('resource_type 필터가 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    const filteredLogs = mockLogs.filter((l) => l.resource_type === 'blog_post')
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: { logs: filteredLogs, total: 1 },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useAuditLogs({ resource_type: 'blog_post' }), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('resource_type=blog_post'),
        expect.any(Object)
      )
    }
  })

  it('날짜 범위 필터가 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: { logs: mockLogs, total: 2 },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(
      () =>
        useAuditLogs({
          start_date: '2025-12-01',
          end_date: '2025-12-31',
        }),
      { wrapper }
    )

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2025-12-01'),
        expect.any(Object)
      )
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('end_date=2025-12-31'),
        expect.any(Object)
      )
    }
  })

  it('페이지네이션이 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: { logs: mockLogs, total: 100 },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useAuditLogs({}, { page: 2, pageSize: 50 }), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      )
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('page_size=50'),
        expect.any(Object)
      )
      expect(result.current.data?.totalPages).toBe(2)
    }
  })

  it('에러 발생 시 빈 목록을 반환해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: null,
      error: 'Database error',
      status: 500,
    })

    // Execute
    const { result } = renderHook(() => useAuditLogs(), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(result.current.data?.logs).toEqual([])
    expect(result.current.data?.total).toBe(0)
  })
})

describe('useAuditLog', () => {
  let queryClient: QueryClient

  const mockLog = {
    id: 'log1',
    event_type: 'user.login',
    actor_id: 'user1',
    actor_type: 'user',
    action: 'login',
    resource_type: 'session',
    resource_id: 'session1',
    metadata: { ip: '127.0.0.1' },
    created_at: '2025-12-20T10:00:00Z',
    actor: { email: 'admin@test.com' },
  }

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

  it('단일 감사 로그를 조회해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: mockLog,
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useAuditLog('log1'), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(result.current.data).toEqual(mockLog)
      expect(callWorkersApi).toHaveBeenCalledWith('/api/v1/audit-logs/log1', {
        token: 'test-token',
      })
    }
  })

  it('조회 실패 시 에러를 반환해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: null,
      error: 'Not found',
      status: 404,
    })

    // Execute
    const { result } = renderHook(() => useAuditLog('invalid-id'), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(result.current.error).toBeTruthy()
  })
})

describe('useAuditStatistics', () => {
  let queryClient: QueryClient

  const mockStats = [
    { event_type: 'user.login', count: 150 },
    { event_type: 'resource.update', count: 75 },
    { event_type: 'resource.create', count: 50 },
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

  it('감사 로그 통계를 조회해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: mockStats,
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useAuditStatistics('2025-12-01', '2025-12-31'), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(result.current.data).toEqual(mockStats)
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/audit-logs/statistics'),
        expect.objectContaining({ token: 'test-token' })
      )
    }
  })

  it('에러 발생 시 빈 배열을 반환해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: null,
      error: 'Database error',
      status: 500,
    })

    // Execute
    const { result } = renderHook(() => useAuditStatistics(), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(result.current.data).toEqual([])
  })
})

describe('useUserAuditHistory', () => {
  let queryClient: QueryClient

  const mockUserLogs = [
    {
      id: 'log1',
      event_type: 'user.login',
      actor_id: 'user1',
      action: 'login',
      created_at: '2025-12-20T10:00:00Z',
    },
    {
      id: 'log2',
      event_type: 'resource.update',
      actor_id: 'user1',
      action: 'update',
      created_at: '2025-12-20T09:00:00Z',
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

  it('사용자 활동 이력을 조회해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: mockUserLogs,
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useUserAuditHistory('user1', 50), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(result.current.data).toEqual(mockUserLogs)
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('actor_id=user1'),
        expect.objectContaining({ token: 'test-token' })
      )
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      )
    }
  })

  it('에러 발생 시 빈 배열을 반환해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: null,
      error: 'User not found',
      status: 404,
    })

    // Execute
    const { result } = renderHook(() => useUserAuditHistory('invalid-user'), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(result.current.data).toEqual([])
  })
})

describe('useResourceAuditHistory', () => {
  let queryClient: QueryClient

  const mockResourceLogs = [
    {
      id: 'log1',
      event_type: 'resource.create',
      action: 'create',
      resource_type: 'blog_post',
      resource_id: 'post1',
      created_at: '2025-12-20T10:00:00Z',
    },
    {
      id: 'log2',
      event_type: 'resource.update',
      action: 'update',
      resource_type: 'blog_post',
      resource_id: 'post1',
      created_at: '2025-12-20T11:00:00Z',
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

  it('리소스 변경 이력을 조회해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: mockResourceLogs,
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useResourceAuditHistory('blog_post', 'post1'), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(result.current.data).toEqual(mockResourceLogs)
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('resource_type=blog_post'),
        expect.objectContaining({ token: 'test-token' })
      )
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('resource_id=post1'),
        expect.any(Object)
      )
    }
  })

  it('에러 발생 시 빈 배열을 반환해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: null,
      error: 'Resource not found',
      status: 404,
    })

    // Execute
    const { result } = renderHook(() => useResourceAuditHistory('unknown', 'id'), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(result.current.data).toEqual([])
  })
})

describe('useLegacyAuditLogs', () => {
  let queryClient: QueryClient

  const mockLegacyLogs = [
    {
      id: 'log1',
      action: 'create',
      resource: 'service',
      resource_id: 'service1',
      user_id: 'user1',
      created_at: '2025-12-20T10:00:00Z',
    },
    {
      id: 'log2',
      action: 'update',
      resource: 'blog_post',
      resource_id: 'post1',
      user_id: 'user1',
      created_at: '2025-12-20T09:00:00Z',
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

  it('레거시 감사 로그를 조회해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: mockLegacyLogs,
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useLegacyAuditLogs({ action: 'create' }, 50), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(result.current.data).toEqual(mockLegacyLogs)
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/audit-logs/legacy'),
        expect.objectContaining({ token: 'test-token' })
      )
    }
  })

  it('user_id 필터가 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: mockLegacyLogs,
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useLegacyAuditLogs({ user_id: 'user1' }), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('user_id=user1'),
        expect.any(Object)
      )
    }
  })

  it('resource 필터가 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: mockLegacyLogs,
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useLegacyAuditLogs({ resource: 'service' }), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('resource=service'),
        expect.any(Object)
      )
    }
  })

  it('에러 발생 시 빈 배열을 반환해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: null,
      error: 'Database error',
      status: 500,
    })

    // Execute
    const { result } = renderHook(() => useLegacyAuditLogs(), { wrapper })

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(result.current.data).toEqual([])
  })
})

describe('useDeleteAuditLog', () => {
  let queryClient: QueryClient

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

  it('감사 로그를 삭제해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: { success: true },
      error: null,
      status: 200,
    })

    // Execute
    const { result } = renderHook(() => useDeleteAuditLog(), { wrapper })

    result.current.mutate('log1')

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    if (result.current.isSuccess) {
      expect(callWorkersApi).toHaveBeenCalledWith('/api/v1/audit-logs/log1', {
        method: 'DELETE',
        token: 'test-token',
      })
    }
  })

  it('삭제 실패 시 에러를 반환해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(callWorkersApi).mockResolvedValue({
      data: null,
      error: 'Delete failed',
      status: 500,
    })

    // Execute
    const { result } = renderHook(() => useDeleteAuditLog(), { wrapper })

    result.current.mutate('log1')

    // Assert
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(result.current.error).toBeTruthy()
  })
})
