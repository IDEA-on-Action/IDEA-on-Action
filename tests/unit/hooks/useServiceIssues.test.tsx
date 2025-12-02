/**
 * useServiceIssues Hook 테스트
 *
 * 서비스 이슈 관리 훅 테스트
 * - 이슈 목록 조회
 * - 필터링 동작
 * - 이슈 상태 업데이트
 * - 실시간 구독
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
} from '@/hooks/useServiceIssues';
import { supabase } from '@/integrations/supabase/client';
import type { ServiceIssue, ServiceIssueFilter, IssueStatus } from '@/types/central-hub.types';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

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

// Mock query 타입 정의
interface MockIssueQuery {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  then?: ReturnType<typeof vi.fn>;
}

describe('useServiceIssues', () => {
  let mockQuery: MockIssueQuery;

  beforeEach(() => {
    vi.clearAllMocks();

    // 완전한 체이닝 지원하는 mock 객체 생성
    const createMockQuery = (): MockIssueQuery => {
      const query = {
        select: vi.fn(),
        order: vi.fn(),
        eq: vi.fn(),
        limit: vi.fn(),
        range: vi.fn(),
      };

      // 모든 메서드는 자기 자신을 반환
      query.select.mockReturnValue(query);
      query.order.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.limit.mockReturnValue(query);
      query.range.mockReturnValue(query);

      // then을 추가하여 Promise처럼 동작하도록
      const queryWithThen = query as MockIssueQuery;
      queryWithThen.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockIssues, error: null }).then(onFulfilled);
      });

      return queryWithThen;
    };

    mockQuery = createMockQuery();
    vi.mocked(supabase.from).mockReturnValue(mockQuery as ReturnType<typeof supabase.from>);
  });

  describe('초기 상태 확인', () => {
    it('초기 로딩 상태여야 함', () => {
      // Execute
      const { result } = renderHook(() => useServiceIssues(), {
        wrapper: createWrapper(),
      });

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
      // Execute
      const { result } = renderHook(() => useServiceIssues(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockIssues);
      expect(result.current.data?.length).toBe(3);
    });

    it('service_issues 테이블에서 데이터를 조회해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useServiceIssues(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.from).toHaveBeenCalledWith('service_issues');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('필터링 동작', () => {
    it('service_id 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceIssueFilter = { service_id: 'mcp-gateway' };

      // Execute
      const { result } = renderHook(() => useServiceIssues(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('service_id', 'mcp-gateway');
    });

    it('severity 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceIssueFilter = { severity: 'critical' };

      // Execute
      const { result } = renderHook(() => useServiceIssues(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('severity', 'critical');
    });

    it('status 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceIssueFilter = { status: 'open' };

      // Execute
      const { result } = renderHook(() => useServiceIssues(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'open');
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

      // Execute
      const { result } = renderHook(() => useServiceIssues(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 각 필터 메서드가 호출되었는지만 확인
      expect(mockQuery.eq).toHaveBeenCalled();
      expect(mockQuery.limit).toHaveBeenCalled();
    });

    it('limit과 offset을 적용해야 함', async () => {
      // Setup
      const filters: ServiceIssueFilter = { limit: 10, offset: 5 };

      // Execute
      const { result } = renderHook(() => useServiceIssues(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // range 호출되었는지만 확인
      expect(mockQuery.range).toHaveBeenCalled();
    });
  });

  describe('에러 처리', () => {
    it('조회 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const error = new Error('Database error');
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useServiceIssues(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });

    it('에러 반환 시 isError 상태가 true여야 함', async () => {
      // Setup
      const error = new Error('Query error');
      mockQuery.then = vi.fn((onFulfilled) => {
        const result = { data: null, error };
        return onFulfilled ? onFulfilled(result) : Promise.resolve(result);
      });

      // Execute
      const { result } = renderHook(() => useServiceIssues(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('로딩 상태', () => {
    it('데이터 로딩 중에는 isLoading이 true여야 함', () => {
      // Setup
      mockQuery.range.mockReturnValue(
        new Promise((resolve) => setTimeout(() => resolve({ data: mockIssues, error: null }), 100))
      );

      // Execute
      const { result } = renderHook(() => useServiceIssues(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('데이터 로딩 완료 후 isLoading이 false여야 함', async () => {
      // Execute
      const { result } = renderHook(() => useServiceIssues(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSuccess).toBe(true);
    });
  });
});

// useOpenIssues용 mock query 타입
interface MockOpenIssueQuery {
  select: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  then?: ReturnType<typeof vi.fn>;
}

describe('useOpenIssues', () => {
  let mockQuery: MockOpenIssueQuery;

  beforeEach(() => {
    vi.clearAllMocks();

    const openIssues = mockIssues.filter((issue) => ['open', 'in_progress'].includes(issue.status));

    // 완전한 체이닝 지원하는 mock 객체 생성
    const createMockQuery = (): MockOpenIssueQuery => {
      const query = {
        select: vi.fn(),
        in: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
      };

      // 모든 메서드는 자기 자신을 반환
      query.select.mockReturnValue(query);
      query.in.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.order.mockReturnValue(query);

      // then을 추가하여 Promise처럼 동작하도록
      const queryWithThen = query as MockOpenIssueQuery;
      queryWithThen.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: openIssues, error: null }).then(onFulfilled);
      });

      return queryWithThen;
    };

    mockQuery = createMockQuery();
    vi.mocked(supabase.from).mockReturnValue(mockQuery as ReturnType<typeof supabase.from>);
  });

  it('열린 이슈만 조회해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useOpenIssues(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQuery.in).toHaveBeenCalledWith('status', ['open', 'in_progress']);
    expect(result.current.data?.length).toBe(2); // open + in_progress 이슈만
  });

  it('severity 순서로 정렬해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useOpenIssues(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQuery.order).toHaveBeenCalledWith('severity', { ascending: true });
  });

  it('특정 서비스의 열린 이슈만 조회해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useOpenIssues('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQuery.eq).toHaveBeenCalledWith('service_id', 'mcp-gateway');
  });
});

describe('useServiceIssue', () => {
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn().mockResolvedValue({ data: mockIssues[0], error: null });
    mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as ReturnType<typeof supabase.from>);
  });

  it('특정 이슈를 조회해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceIssue('1'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockEq).toHaveBeenCalledWith('id', '1');
    expect(result.current.data).toEqual(mockIssues[0]);
  });

  it('issueId가 없으면 쿼리를 비활성화해야 함', () => {
    // Execute
    const { result } = renderHook(() => useServiceIssue(''), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useServiceIssueStats', () => {
  let mockSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect = vi.fn().mockResolvedValue({
      data: mockIssues.map((issue) => ({
        service_id: issue.service_id,
        severity: issue.severity,
        status: issue.status,
      })),
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as ReturnType<typeof supabase.from>);
  });

  it('이슈 통계를 계산해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceIssueStats(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.total).toBe(3);
    expect(result.current.data?.byStatus.open).toBe(1);
    expect(result.current.data?.byStatus.in_progress).toBe(1);
    expect(result.current.data?.byStatus.resolved).toBe(1);
  });

  it('severity별 통계를 계산해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceIssueStats(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.bySeverity.critical).toBe(1);
    expect(result.current.data?.bySeverity.warning).toBe(1);
    expect(result.current.data?.bySeverity.error).toBe(1);
  });

  it('열린 이슈 수를 계산해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceIssueStats(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.openCount).toBe(2); // open + in_progress
  });

  it('critical 이슈 수를 계산해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceIssueStats(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.criticalCount).toBe(1);
  });
});

describe('useUpdateIssueStatus', () => {
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn().mockResolvedValue({ data: mockIssues[0], error: null });
    mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as ReturnType<typeof supabase.from>);
  });

  it('이슈 상태를 업데이트해야 함', async () => {
    // Setup
    const { result } = renderHook(() => useUpdateIssueStatus(), {
      wrapper: createWrapper(),
    });

    // Execute
    await act(async () => {
      await result.current.mutateAsync({
        issueId: '1',
        status: 'in_progress',
      });
    });

    // Assert
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'in_progress' });
    expect(mockEq).toHaveBeenCalledWith('id', '1');
  });

  it('resolved 상태로 변경 시 resolved_at을 설정해야 함', async () => {
    // Setup
    const { result } = renderHook(() => useUpdateIssueStatus(), {
      wrapper: createWrapper(),
    });

    // Execute
    await act(async () => {
      await result.current.mutateAsync({
        issueId: '1',
        status: 'resolved',
        resolution: 'Fixed',
      });
    });

    // Assert
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.status).toBe('resolved');
    expect(updateCall.resolved_at).toBeTruthy();
    expect(updateCall.resolution).toBe('Fixed');
  });

  it('mutation 에러를 처리해야 함', async () => {
    // Setup
    const error = new Error('Update failed');
    mockSingle.mockResolvedValue({ data: null, error });

    const { result } = renderHook(() => useUpdateIssueStatus(), {
      wrapper: createWrapper(),
    });

    // Execute & Assert
    await expect(
      act(async () => {
        await result.current.mutateAsync({
          issueId: '1',
          status: 'resolved',
        });
      })
    ).rejects.toThrow();
  });
});

describe('useAssignIssue', () => {
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn().mockResolvedValue({ data: mockIssues[1], error: null });
    mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as ReturnType<typeof supabase.from>);
  });

  it('이슈 담당자를 할당해야 함', async () => {
    // Setup
    const { result } = renderHook(() => useAssignIssue(), {
      wrapper: createWrapper(),
    });

    // Execute
    await act(async () => {
      await result.current.mutateAsync({
        issueId: '1',
        assignedTo: 'user-123',
      });
    });

    // Assert
    expect(mockUpdate).toHaveBeenCalledWith({
      assigned_to: 'user-123',
      status: 'in_progress',
    });
    expect(mockEq).toHaveBeenCalledWith('id', '1');
  });

  it('할당 시 상태를 in_progress로 변경해야 함', async () => {
    // Setup
    const { result } = renderHook(() => useAssignIssue(), {
      wrapper: createWrapper(),
    });

    // Execute
    await act(async () => {
      await result.current.mutateAsync({
        issueId: '1',
        assignedTo: 'user-456',
      });
    });

    // Assert
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.status).toBe('in_progress');
    expect(updateCall.assigned_to).toBe('user-456');
  });
});

describe('useServiceIssuesRealtime', () => {
  let mockChannel: ReturnType<typeof vi.fn>;
  let mockOn: ReturnType<typeof vi.fn>;
  let mockSubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
    mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe });
    mockChannel = vi.fn().mockReturnValue({ on: mockOn });

    vi.mocked(supabase.channel).mockImplementation(mockChannel);
  });

  it('실시간 채널을 구독해야 함', () => {
    // Execute
    renderHook(() => useServiceIssuesRealtime(), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(supabase.channel).toHaveBeenCalledWith('service-issues-all');
    expect(mockOn).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('서비스별 채널을 구독해야 함', () => {
    // Execute
    renderHook(() => useServiceIssuesRealtime('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(supabase.channel).toHaveBeenCalledWith('service-issues-mcp-gateway');
  });

  it('언마운트 시 채널을 정리해야 함', () => {
    // Execute
    const { unmount } = renderHook(() => useServiceIssuesRealtime(), {
      wrapper: createWrapper(),
    });

    // Assert - 구독이 생성됨
    expect(mockSubscribe).toHaveBeenCalled();

    // Unmount
    unmount();

    // 채널 제거가 호출되어야 함
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
