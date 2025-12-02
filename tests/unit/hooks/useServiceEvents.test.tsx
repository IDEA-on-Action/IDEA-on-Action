/**
 * useServiceEvents Hook 테스트
 *
 * 서비스 이벤트 조회 및 실시간 구독 훅 테스트
 * - 이벤트 목록 조회
 * - 필터링 동작
 * - 서비스별/프로젝트별 조회
 * - 실시간 구독
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useServiceEvents,
  useServiceEventsByService,
  useServiceEventsByProject,
  useServiceEventsRealtime,
  useServiceEventStats,
  serviceEventKeys,
} from '@/hooks/useServiceEvents';
import { supabase } from '@/integrations/supabase/client';
import type { ServiceEvent, ServiceEventFilter } from '@/types/central-hub.types';
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
const mockEvents: ServiceEvent[] = [
  {
    id: '1',
    service_id: 'mcp-gateway',
    event_type: 'connection',
    title: 'Service Connected',
    description: 'MCP Gateway connected successfully',
    metadata: { version: '1.0.0' },
    project_id: 'project-1',
    created_at: '2025-12-02T10:00:00Z',
  },
  {
    id: '2',
    service_id: 'minu-find',
    event_type: 'api_call',
    title: 'API Call',
    description: 'Search API called',
    metadata: { endpoint: '/search' },
    project_id: 'project-1',
    created_at: '2025-12-02T11:00:00Z',
  },
  {
    id: '3',
    service_id: 'mcp-gateway',
    event_type: 'error',
    title: 'Connection Error',
    description: 'Failed to connect',
    metadata: { error: 'timeout' },
    project_id: 'project-2',
    created_at: '2025-12-02T12:00:00Z',
  },
];

// Mock query 타입 정의
interface MockQuery {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  then?: ReturnType<typeof vi.fn>;
}

describe('useServiceEvents', () => {
  let mockQuery: MockQuery;

  beforeEach(() => {
    vi.clearAllMocks();

    // 완전한 체이닝 지원하는 mock 객체 생성
    const createMockQuery = () => {
      const query = {
        select: vi.fn(),
        order: vi.fn(),
        eq: vi.fn(),
        gte: vi.fn(),
        lte: vi.fn(),
        limit: vi.fn(),
        range: vi.fn(),
      };

      // 모든 메서드는 자기 자신을 반환하되, then을 가진 Promise처럼 동작
      query.select.mockReturnValue(query);
      query.order.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.gte.mockReturnValue(query);
      query.lte.mockReturnValue(query);
      query.limit.mockReturnValue(query);
      query.range.mockReturnValue(query);

      // then을 추가하여 Promise처럼 동작하도록
      const queryWithThen = query as MockQuery;
      queryWithThen.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockEvents, error: null }).then(onFulfilled);
      });

      return queryWithThen;
    };

    mockQuery = createMockQuery();
    vi.mocked(supabase.from).mockReturnValue(mockQuery as ReturnType<typeof supabase.from>);
  });

  describe('초기 상태 확인', () => {
    it('초기 로딩 상태여야 함', () => {
      // Execute
      const { result } = renderHook(() => useServiceEvents(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('올바른 query key를 사용해야 함', () => {
      // Execute
      const { result } = renderHook(() => useServiceEvents(), {
        wrapper: createWrapper(),
      });

      // Assert - queryKey가 배열이어야 함
      expect(Array.isArray(serviceEventKeys.all)).toBe(true);
      expect(serviceEventKeys.all[0]).toBe('service-events');
    });
  });

  describe('데이터 조회 성공', () => {
    it('이벤트 목록을 성공적으로 조회해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useServiceEvents(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEvents);
      expect(result.current.data?.length).toBe(3);
    });

    it('service_events 테이블에서 데이터를 조회해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useServiceEvents(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.from).toHaveBeenCalledWith('service_events');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('필터링 동작', () => {
    it('service_id 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceEventFilter = { service_id: 'mcp-gateway' };

      // Execute
      const { result } = renderHook(() => useServiceEvents(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('service_id', 'mcp-gateway');
    });

    it('event_type 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceEventFilter = { event_type: 'connection' };

      // Execute
      const { result } = renderHook(() => useServiceEvents(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('event_type', 'connection');
    });

    it('날짜 범위 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceEventFilter = {
        from_date: '2025-12-01T00:00:00Z',
        to_date: '2025-12-02T23:59:59Z',
      };

      // Execute
      const { result } = renderHook(() => useServiceEvents(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', filters.from_date);
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', filters.to_date);
    });

    it('limit과 offset을 적용해야 함', async () => {
      // Setup
      const filters: ServiceEventFilter = { limit: 10, offset: 20 };

      // Execute
      const { result } = renderHook(() => useServiceEvents(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // range 호출되었는지만 확인
      expect(mockQuery.range).toHaveBeenCalled();
    });

    it('복합 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceEventFilter = {
        service_id: 'mcp-gateway',
        event_type: 'connection',
        project_id: 'project-1',
        limit: 50,
      };

      // Execute
      const { result } = renderHook(() => useServiceEvents(filters), {
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
  });

  describe('에러 처리', () => {
    it('조회 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const error = new Error('Database error');
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useServiceEvents(), {
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
      const { result } = renderHook(() => useServiceEvents(), {
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
        new Promise((resolve) => setTimeout(() => resolve({ data: mockEvents, error: null }), 100))
      );

      // Execute
      const { result } = renderHook(() => useServiceEvents(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('데이터 로딩 완료 후 isLoading이 false여야 함', async () => {
      // Execute
      const { result } = renderHook(() => useServiceEvents(), {
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

describe('useServiceEventsByService', () => {
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockOrder: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockLimit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLimit = vi.fn().mockResolvedValue({ data: [mockEvents[0]], error: null });
    mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as ReturnType<typeof supabase.from>);
  });

  it('특정 서비스의 이벤트만 조회해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceEventsByService('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockEq).toHaveBeenCalledWith('service_id', 'mcp-gateway');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('기본 limit 50을 적용해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceEventsByService('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockLimit).toHaveBeenCalledWith(50);
  });

  it('커스텀 limit을 적용해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceEventsByService('mcp-gateway', 100), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockLimit).toHaveBeenCalledWith(100);
  });
});

describe('useServiceEventsByProject', () => {
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockOrder: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockLimit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLimit = vi.fn().mockResolvedValue({ data: [mockEvents[0], mockEvents[1]], error: null });
    mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as ReturnType<typeof supabase.from>);
  });

  it('특정 프로젝트의 이벤트만 조회해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceEventsByProject('project-1'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockEq).toHaveBeenCalledWith('project_id', 'project-1');
  });

  it('projectId가 없으면 쿼리를 비활성화해야 함', () => {
    // Execute
    const { result } = renderHook(() => useServiceEventsByProject(''), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useServiceEventStats', () => {
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEq = vi.fn().mockResolvedValue({
      data: [
        { event_type: 'connection', service_id: 'mcp-gateway' },
        { event_type: 'connection', service_id: 'mcp-gateway' },
        { event_type: 'api_call', service_id: 'minu-find' },
        { event_type: 'error', service_id: 'mcp-gateway' },
      ],
      error: null,
    });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq, data: null, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as ReturnType<typeof supabase.from>);
  });

  it('이벤트 유형별 통계를 계산해야 함', async () => {
    // Setup
    mockSelect.mockResolvedValue({
      data: [
        { event_type: 'connection', service_id: 'mcp-gateway' },
        { event_type: 'connection', service_id: 'mcp-gateway' },
        { event_type: 'api_call', service_id: 'minu-find' },
        { event_type: 'error', service_id: 'mcp-gateway' },
      ],
      error: null,
    });

    // Execute
    const { result } = renderHook(() => useServiceEventStats(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      connection: 2,
      api_call: 1,
      error: 1,
    });
  });

  it('특정 서비스의 통계만 조회해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useServiceEventStats('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockEq).toHaveBeenCalledWith('service_id', 'mcp-gateway');
  });
});

describe('useServiceEventsRealtime', () => {
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

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('실시간 채널을 구독해야 함', () => {
    // Execute
    renderHook(() => useServiceEventsRealtime(), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(supabase.channel).toHaveBeenCalledWith('service-events-all');
    expect(mockOn).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('서비스별 채널을 구독해야 함', () => {
    // Execute
    renderHook(() => useServiceEventsRealtime({ service_id: 'mcp-gateway' }), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(supabase.channel).toHaveBeenCalledWith('service-events-mcp-gateway');
  });

  it('프로젝트별 채널을 구독해야 함', () => {
    // Execute
    renderHook(() => useServiceEventsRealtime({ project_id: 'project-1' }), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(supabase.channel).toHaveBeenCalledWith('service-events-project-project-1');
  });

  it('언마운트 시 채널을 정리해야 함', () => {
    // Execute
    const { unmount } = renderHook(() => useServiceEventsRealtime(), {
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
