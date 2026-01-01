/**
 * useServiceEvents Hook 테스트
 *
 * 서비스 이벤트 조회 훅 테스트
 * - 이벤트 목록 조회
 * - 필터링 동작
 * - 서비스별/프로젝트별 조회
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useServiceEvents,
  useServiceEventsByService,
  useServiceEventsByProject,
  useServiceEventStats,
  serviceEventKeys,
} from '@/hooks/services/useServiceEvents';
import { serviceEventsApi } from '@/integrations/cloudflare/client';
import type { ServiceEvent, ServiceEventFilter } from '@/types/services/central-hub.types';
import React from 'react';

// Mock Workers API
vi.mock('@/integrations/cloudflare/client', () => ({
  serviceEventsApi: {
    list: vi.fn(),
    getByService: vi.fn(),
    getByProject: vi.fn(),
    getStats: vi.fn(),
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

describe('useServiceEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('초기 상태 확인', () => {
    it('초기 로딩 상태여야 함', () => {
      // Setup
      vi.mocked(serviceEventsApi.list).mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useServiceEvents(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('올바른 query key를 사용해야 함', () => {
      // Assert
      expect(Array.isArray(serviceEventKeys.all)).toBe(true);
      expect(serviceEventKeys.all[0]).toBe('service-events');
    });
  });

  describe('데이터 조회 성공', () => {
    it('이벤트 목록을 성공적으로 조회해야 함', async () => {
      // Setup
      vi.mocked(serviceEventsApi.list).mockResolvedValue({
        data: mockEvents,
        error: null,
      });

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

    it('Workers API를 통해 데이터를 조회해야 함', async () => {
      // Setup
      vi.mocked(serviceEventsApi.list).mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useServiceEvents(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(serviceEventsApi.list).toHaveBeenCalled();
    });
  });

  describe('필터링 동작', () => {
    it('service_id 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceEventFilter = { service_id: 'mcp-gateway' };
      vi.mocked(serviceEventsApi.list).mockResolvedValue({
        data: [mockEvents[0]],
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useServiceEvents(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(serviceEventsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ service_id: 'mcp-gateway' })
      );
    });

    it('event_type 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceEventFilter = { event_type: 'connection' };
      vi.mocked(serviceEventsApi.list).mockResolvedValue({
        data: [mockEvents[0]],
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useServiceEvents(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(serviceEventsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'connection' })
      );
    });

    it('날짜 범위 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceEventFilter = {
        from_date: '2025-12-01T00:00:00Z',
        to_date: '2025-12-02T23:59:59Z',
      };
      vi.mocked(serviceEventsApi.list).mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useServiceEvents(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(serviceEventsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          from_date: filters.from_date,
          to_date: filters.to_date,
        })
      );
    });

    it('복합 필터를 적용해야 함', async () => {
      // Setup
      const filters: ServiceEventFilter = {
        service_id: 'mcp-gateway',
        event_type: 'connection',
        project_id: 'project-1',
        limit: 50,
      };
      vi.mocked(serviceEventsApi.list).mockResolvedValue({
        data: [mockEvents[0]],
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useServiceEvents(filters), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(serviceEventsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          service_id: 'mcp-gateway',
          event_type: 'connection',
          project_id: 'project-1',
          limit: 50,
        })
      );
    });
  });

  describe('에러 처리', () => {
    it('조회 실패 시 빈 배열을 반환해야 함', async () => {
      // Setup - 훅이 에러를 catch하고 빈 배열을 반환하므로 isSuccess가 true
      vi.mocked(serviceEventsApi.list).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      // Execute
      const { result } = renderHook(() => useServiceEvents(), {
        wrapper: createWrapper(),
      });

      // Assert - 훅은 에러를 내부적으로 처리하고 빈 배열 반환
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('로딩 상태', () => {
    it('데이터 로딩 완료 후 isLoading이 false여야 함', async () => {
      // Setup
      vi.mocked(serviceEventsApi.list).mockResolvedValue({
        data: mockEvents,
        error: null,
      });

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('특정 서비스의 이벤트만 조회해야 함', async () => {
    // Setup
    vi.mocked(serviceEventsApi.getByService).mockResolvedValue({
      data: [mockEvents[0]],
      error: null,
    });

    // Execute
    const { result } = renderHook(() => useServiceEventsByService('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(serviceEventsApi.getByService).toHaveBeenCalledWith('mcp-gateway', 50);
  });

  it('기본 limit 50을 적용해야 함', async () => {
    // Setup
    vi.mocked(serviceEventsApi.getByService).mockResolvedValue({
      data: [mockEvents[0]],
      error: null,
    });

    // Execute
    const { result } = renderHook(() => useServiceEventsByService('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(serviceEventsApi.getByService).toHaveBeenCalledWith('mcp-gateway', 50);
  });

  it('커스텀 limit을 적용해야 함', async () => {
    // Setup
    vi.mocked(serviceEventsApi.getByService).mockResolvedValue({
      data: [mockEvents[0]],
      error: null,
    });

    // Execute
    const { result } = renderHook(() => useServiceEventsByService('mcp-gateway', 100), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(serviceEventsApi.getByService).toHaveBeenCalledWith('mcp-gateway', 100);
  });
});

describe('useServiceEventsByProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('특정 프로젝트의 이벤트만 조회해야 함', async () => {
    // Setup
    vi.mocked(serviceEventsApi.getByProject).mockResolvedValue({
      data: [mockEvents[0], mockEvents[1]],
      error: null,
    });

    // Execute
    const { result } = renderHook(() => useServiceEventsByProject('project-1'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(serviceEventsApi.getByProject).toHaveBeenCalledWith('project-1', 50);
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('이벤트 유형별 통계를 조회해야 함', async () => {
    // Setup - getStats API가 통계 객체를 직접 반환
    const mockStats = {
      connection: 2,
      api_call: 1,
      error: 1,
    };
    vi.mocked(serviceEventsApi.getStats).mockResolvedValue({
      data: mockStats,
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

    expect(result.current.data).toMatchObject(mockStats);
    expect(serviceEventsApi.getStats).toHaveBeenCalledWith(undefined);
  });

  it('특정 서비스의 통계만 조회해야 함', async () => {
    // Setup
    const mockStats = { connection: 5, api_call: 10 };
    vi.mocked(serviceEventsApi.getStats).mockResolvedValue({
      data: mockStats,
      error: null,
    });

    // Execute
    const { result } = renderHook(() => useServiceEventStats('mcp-gateway'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(serviceEventsApi.getStats).toHaveBeenCalledWith('mcp-gateway');
    expect(result.current.data).toMatchObject(mockStats);
  });
});
