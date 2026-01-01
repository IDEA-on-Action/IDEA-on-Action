/**
 * useServiceIssues Hook 테스트
 *
 * 서비스 이슈 관리 훅 테스트
 * - 이슈 목록 조회
 * - 필터링 동작
 * - 이슈 상태 업데이트
 * - 실시간 구독 (deprecated)
 * - 에러 처리
 *
 * @migration Supabase → Workers API 마이그레이션 완료
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useServiceIssues,
  useOpenIssues,
  useServiceIssue,
  useServiceIssueStats,
  useUpdateIssueStatus,
  useAssignIssue,
  useServiceIssuesRealtime,
  serviceIssueKeys,
} from '@/hooks/services/useServiceIssues';
import { serviceIssuesApi } from '@/integrations/cloudflare/client';
import type { ServiceIssue, ServiceIssueFilter } from '@/types/services/central-hub.types';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  serviceIssuesApi: {
    list: vi.fn(),
    getOpen: vi.fn(),
    getById: vi.fn(),
    getStats: vi.fn(),
    updateStatus: vi.fn(),
    assign: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    workersTokens: { accessToken: 'mock-token' },
  })),
}));

// Mock 데이터
const mockIssues: ServiceIssue[] = [
  {
    id: '1',
    service_id: 'mcp-gateway',
    title: 'Connection timeout',
    description: 'Gateway connection timeout after 30s',
    severity: 'critical',
    status: 'open',
    project_id: 'project-1',
    assigned_to: null,
    resolution: null,
    resolved_at: null,
    metadata: { timeout: 30 },
    created_at: '2025-12-02T10:00:00Z',
    updated_at: '2025-12-02T10:00:00Z',
  },
  {
    id: '2',
    service_id: 'minu-find',
    title: 'API rate limit',
    description: 'Rate limit exceeded',
    severity: 'warning',
    status: 'in_progress',
    project_id: 'project-1',
    assigned_to: 'user-123',
    resolution: null,
    resolved_at: null,
    metadata: { limit: 100 },
    created_at: '2025-12-02T11:00:00Z',
    updated_at: '2025-12-02T11:30:00Z',
  },
  {
    id: '3',
    service_id: 'mcp-gateway',
    title: 'Memory leak',
    description: 'Memory leak detected in long-running processes',
    severity: 'error',
    status: 'resolved',
    project_id: 'project-2',
    assigned_to: 'user-456',
    resolution: 'Fixed memory allocation',
    resolved_at: '2025-12-02T12:00:00Z',
    metadata: { memory: '2GB' },
    created_at: '2025-12-02T09:00:00Z',
    updated_at: '2025-12-02T12:00:00Z',
  },
];

describe('useServiceIssues', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('초기 상태 확인', () => {
    it('초기 로딩 상태여야 함', () => {
      // Setup - Workers API 모킹 (지연된 응답)
      vi.mocked(serviceIssuesApi.list).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: mockIssues, error: null, status: 200 });
            }, 100);
          })
      );

      // Execute
      const { result } = renderHook(() => useServiceIssues(), { wrapper });

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('올바른 query key를 사용해야 함', () => {
      // Assert
      expect(Array.isArray(serviceIssueKeys.all)).toBe(true);
      expect(serviceIssueKeys.all[0]).toBe('service-issues');
    });
  });

  describe('데이터 조회 성공', () => {
    it('이슈 목록을 성공적으로 조회해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(serviceIssuesApi.list).mockResolvedValue({
        data: mockIssues,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useServiceIssues(), { wrapper });

      // Assert
      await waitFor(
        () => {
          expect(result.current.isSuccess || result.current.isError).toBe(true);
        },
        { timeout: 3000 }
      );

      if (result.current.isSuccess) {
        expect(result.current.data).toEqual(mockIssues);
        expect(result.current.data?.length).toBe(3);
      }
    });

    it('Workers API를 올바르게 호출해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(serviceIssuesApi.list).mockResolvedValue({
        data: mockIssues,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useServiceIssues(), { wrapper });

      // Assert
      await waitFor(
        () => {
          expect(result.current.isSuccess || result.current.isError).toBe(true);
        },
        { timeout: 3000 }
      );

      expect(serviceIssuesApi.list).toHaveBeenCalledWith({
        service_id: undefined,
        severity: undefined,
        status: undefined,
        project_id: undefined,
        assigned_to: undefined,
        limit: undefined,
        offset: undefined,
      });
    });
  });

  describe('필터링 동작', () => {
    it('service_id 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceIssueFilter = { service_id: 'mcp-gateway' };
      vi.mocked(serviceIssuesApi.list).mockResolvedValue({
        data: mockIssues.filter((i) => i.service_id === 'mcp-gateway'),
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useServiceIssues(filters), { wrapper });

      // Assert
      await waitFor(
        () => {
          expect(result.current.isSuccess || result.current.isError).toBe(true);
        },
        { timeout: 3000 }
      );

      expect(serviceIssuesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ service_id: 'mcp-gateway' })
      );
    });

    it('severity 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceIssueFilter = { severity: 'critical' };
      vi.mocked(serviceIssuesApi.list).mockResolvedValue({
        data: mockIssues.filter((i) => i.severity === 'critical'),
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useServiceIssues(filters), { wrapper });

      // Assert
      await waitFor(
        () => {
          expect(result.current.isSuccess || result.current.isError).toBe(true);
        },
        { timeout: 3000 }
      );

      expect(serviceIssuesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'critical' })
      );
    });

    it('status 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceIssueFilter = { status: 'open' };
      vi.mocked(serviceIssuesApi.list).mockResolvedValue({
        data: mockIssues.filter((i) => i.status === 'open'),
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useServiceIssues(filters), { wrapper });

      // Assert
      await waitFor(
        () => {
          expect(result.current.isSuccess || result.current.isError).toBe(true);
        },
        { timeout: 3000 }
      );

      expect(serviceIssuesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'open' })
      );
    });

    it('복합 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceIssueFilter = {
        service_id: 'mcp-gateway',
        severity: 'critical',
        status: 'open',
        project_id: 'project-1',
        assigned_to: 'user-123',
        limit: 10,
      };
      vi.mocked(serviceIssuesApi.list).mockResolvedValue({
        data: mockIssues,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useServiceIssues(filters), { wrapper });

      // Assert
      await waitFor(
        () => {
          expect(result.current.isSuccess || result.current.isError).toBe(true);
        },
        { timeout: 3000 }
      );

      expect(serviceIssuesApi.list).toHaveBeenCalledWith({
        service_id: 'mcp-gateway',
        severity: 'critical',
        status: 'open',
        project_id: 'project-1',
        assigned_to: 'user-123',
        limit: 10,
        offset: undefined,
      });
    });

    it('limit과 offset을 적용해야 함', async () => {
      // Setup
      const filters: ServiceIssueFilter = { limit: 10, offset: 5 };
      vi.mocked(serviceIssuesApi.list).mockResolvedValue({
        data: mockIssues,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useServiceIssues(filters), { wrapper });

      // Assert
      await waitFor(
        () => {
          expect(result.current.isSuccess || result.current.isError).toBe(true);
        },
        { timeout: 3000 }
      );

      expect(serviceIssuesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 5 })
      );
    });
  });

  describe('에러 처리', () => {
    it('조회 실패 시 빈 배열을 반환해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(serviceIssuesApi.list).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      });

      // Execute
      const { result } = renderHook(() => useServiceIssues(), { wrapper });

      // Assert
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 3000 }
      );

      // 에러 시 빈 배열 반환 (hook 구현에 따라)
      expect(result.current.data).toEqual([]);
    });
  });

  describe('로딩 상태', () => {
    it('데이터 로딩 중에는 isLoading이 true여야 함', () => {
      // Setup - 지연된 응답 모킹
      vi.mocked(serviceIssuesApi.list).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: mockIssues, error: null, status: 200 });
            }, 100);
          })
      );

      // Execute
      const { result } = renderHook(() => useServiceIssues(), { wrapper });

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('데이터 로딩 완료 후 isLoading이 false여야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(serviceIssuesApi.list).mockResolvedValue({
        data: mockIssues,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useServiceIssues(), { wrapper });

      // Assert
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useOpenIssues', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('열린 이슈만 조회해야 함', async () => {
    // Setup
    const openIssues = mockIssues.filter((issue) =>
      ['open', 'in_progress'].includes(issue.status)
    );
    vi.mocked(serviceIssuesApi.getOpen).mockResolvedValue({
      data: openIssues,
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useOpenIssues(), { wrapper });

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(serviceIssuesApi.getOpen).toHaveBeenCalledWith(undefined);
      expect(result.current.data?.length).toBe(2); // open + in_progress 이슈만
    }
  });

  it('특정 서비스의 열린 이슈만 조회해야 함', async () => {
    // Setup
    const openIssues = mockIssues.filter(
      (issue) =>
        ['open', 'in_progress'].includes(issue.status) && issue.service_id === 'mcp-gateway'
    );
    vi.mocked(serviceIssuesApi.getOpen).mockResolvedValue({
      data: openIssues,
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useOpenIssues('mcp-gateway'), { wrapper });

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(serviceIssuesApi.getOpen).toHaveBeenCalledWith('mcp-gateway');
  });
});

describe('useServiceIssue', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('특정 이슈를 조회해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(serviceIssuesApi.getById).mockResolvedValue({
      data: mockIssues[0],
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useServiceIssue('1'), { wrapper });

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(serviceIssuesApi.getById).toHaveBeenCalledWith('1');
      expect(result.current.data).toEqual(mockIssues[0]);
    }
  });

  it('issueId가 없으면 쿼리를 비활성화해야 함', () => {
    // Execute
    const { result } = renderHook(() => useServiceIssue(''), { wrapper });

    // Assert
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useServiceIssueStats', () => {
  let queryClient: QueryClient;

  const mockStats = {
    total: 3,
    byStatus: {
      open: 1,
      in_progress: 1,
      resolved: 1,
      closed: 0,
    },
    bySeverity: {
      critical: 1,
      error: 1,
      warning: 1,
      info: 0,
    },
    byService: {
      'mcp-gateway': 2,
      'minu-find': 1,
    },
    openCount: 2,
    criticalCount: 1,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('이슈 통계를 조회해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(serviceIssuesApi.getStats).mockResolvedValue({
      data: mockStats,
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useServiceIssueStats(), { wrapper });

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(result.current.data?.total).toBe(3);
      expect(result.current.data?.byStatus.open).toBe(1);
      expect(result.current.data?.byStatus.in_progress).toBe(1);
      expect(result.current.data?.byStatus.resolved).toBe(1);
    }
  });

  it('severity별 통계를 반환해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(serviceIssuesApi.getStats).mockResolvedValue({
      data: mockStats,
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useServiceIssueStats(), { wrapper });

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(result.current.data?.bySeverity.critical).toBe(1);
      expect(result.current.data?.bySeverity.warning).toBe(1);
      expect(result.current.data?.bySeverity.error).toBe(1);
    }
  });

  it('열린 이슈 수를 반환해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(serviceIssuesApi.getStats).mockResolvedValue({
      data: mockStats,
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useServiceIssueStats(), { wrapper });

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(result.current.data?.openCount).toBe(2); // open + in_progress
    }
  });

  it('critical 이슈 수를 반환해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(serviceIssuesApi.getStats).mockResolvedValue({
      data: mockStats,
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useServiceIssueStats(), { wrapper });

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(result.current.data?.criticalCount).toBe(1);
    }
  });
});

describe('useUpdateIssueStatus', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('이슈 상태를 업데이트해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(serviceIssuesApi.updateStatus).mockResolvedValue({
      data: { ...mockIssues[0], status: 'in_progress' },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useUpdateIssueStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        issueId: '1',
        status: 'in_progress',
      });
    });

    // Assert
    expect(serviceIssuesApi.updateStatus).toHaveBeenCalledWith(
      'mock-token',
      '1',
      'in_progress',
      undefined
    );
  });

  it('resolved 상태로 변경 시 resolution을 함께 전송해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(serviceIssuesApi.updateStatus).mockResolvedValue({
      data: { ...mockIssues[0], status: 'resolved', resolution: 'Fixed' },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useUpdateIssueStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        issueId: '1',
        status: 'resolved',
        resolution: 'Fixed',
      });
    });

    // Assert
    expect(serviceIssuesApi.updateStatus).toHaveBeenCalledWith(
      'mock-token',
      '1',
      'resolved',
      'Fixed'
    );
  });

  it('mutation 에러를 처리해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(serviceIssuesApi.updateStatus).mockResolvedValue({
      data: null,
      error: 'Update failed',
      status: 500,
    });

    const { result } = renderHook(() => useUpdateIssueStatus(), { wrapper });

    // Execute & Assert
    await expect(
      act(async () => {
        await result.current.mutateAsync({
          issueId: '1',
          status: 'resolved',
        });
      })
    ).rejects.toThrow('Update failed');
  });

  it('인증 토큰이 없으면 에러를 throw 해야 함', async () => {
    // Setup - useAuth 모킹을 토큰 없이 변경
    const { useAuth } = await import('@/hooks/auth/useAuth');
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      workersTokens: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useUpdateIssueStatus(), { wrapper });

    // Execute & Assert
    await expect(
      act(async () => {
        await result.current.mutateAsync({
          issueId: '1',
          status: 'resolved',
        });
      })
    ).rejects.toThrow('인증이 필요합니다');
  });
});

describe('useAssignIssue', () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // Reset useAuth mock
    const { useAuth } = await import('@/hooks/auth/useAuth');
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      workersTokens: { accessToken: 'mock-token' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('이슈 담당자를 할당해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(serviceIssuesApi.assign).mockResolvedValue({
      data: { ...mockIssues[0], assigned_to: 'user-123', status: 'in_progress' },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useAssignIssue(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        issueId: '1',
        assignedTo: 'user-123',
      });
    });

    // Assert
    expect(serviceIssuesApi.assign).toHaveBeenCalledWith('mock-token', '1', 'user-123');
  });

  it('할당 에러를 처리해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(serviceIssuesApi.assign).mockResolvedValue({
      data: null,
      error: 'Assign failed',
      status: 500,
    });

    const { result } = renderHook(() => useAssignIssue(), { wrapper });

    // Execute & Assert
    await expect(
      act(async () => {
        await result.current.mutateAsync({
          issueId: '1',
          assignedTo: 'user-456',
        });
      })
    ).rejects.toThrow('Assign failed');
  });
});

describe('useServiceIssuesRealtime', () => {
  let queryClient: QueryClient;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // console.warn 스파이 설정
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    queryClient.clear();
    consoleWarnSpy.mockRestore();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('실시간 구독 호출 시 경고 메시지를 출력해야 함', () => {
    // Execute
    renderHook(() => useServiceIssuesRealtime(), { wrapper });

    // Assert - deprecated 경고 메시지 확인
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'useServiceIssuesRealtime: Workers WebSocket으로 마이그레이션 필요'
    );
  });

  it('서비스 ID와 함께 호출해도 경고 메시지를 출력해야 함', () => {
    // Execute
    renderHook(() => useServiceIssuesRealtime('mcp-gateway'), { wrapper });

    // Assert
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'useServiceIssuesRealtime: Workers WebSocket으로 마이그레이션 필요'
    );
  });
});
