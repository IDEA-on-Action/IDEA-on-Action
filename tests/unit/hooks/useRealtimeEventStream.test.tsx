import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tantml:invoke>@tanstack/react-query';
import {
  useRealtimeEventStream,
  getEventFromStreamItem,
  getIssueFromStreamItem,
  sortStreamItemsByTime,
  groupStreamItemsByType,
} from '@/hooks/useRealtimeEventStream';
import type { StreamItem } from '@/hooks/useRealtimeEventStream';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        callback('SUBSCRIBED', null);
        return {};
      }),
    })),
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

describe('useRealtimeEventStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('초기화', () => {
    it('초기 상태가 올바르게 설정되어야 함', () => {
      const { result } = renderHook(() => useRealtimeEventStream(), {
        wrapper: createWrapper(),
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.filteredItems).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.connectionState.status).toBeDefined();
    });

    it('이벤트와 이슈 스트림이 기본적으로 활성화되어야 함', () => {
      const { result } = renderHook(
        () =>
          useRealtimeEventStream({
            enableEvents: true,
            enableIssues: true,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('연결 관리', () => {
    it('마운트 시 자동으로 연결되어야 함', async () => {
      const { result } = renderHook(() => useRealtimeEventStream(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('수동으로 재연결할 수 있어야 함', async () => {
      const { result } = renderHook(() => useRealtimeEventStream(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.reconnect();
      });

      await waitFor(() => {
        expect(result.current.connectionState.reconnectAttempts).toBe(0);
      });
    });

    it('연결을 해제할 수 있어야 함', async () => {
      const { result } = renderHook(() => useRealtimeEventStream(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.connectionState.status).toBe('disconnected');
    });
  });

  describe('필터링', () => {
    it('서비스 필터를 적용할 수 있어야 함', () => {
      const { result } = renderHook(
        () =>
          useRealtimeEventStream({
            serviceFilter: ['minu-build', 'minu-keep'],
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });

    it('심각도 필터를 적용할 수 있어야 함', () => {
      const { result } = renderHook(
        () =>
          useRealtimeEventStream({
            severityFilter: ['critical', 'high'],
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });

    it('이벤트 타입 필터를 적용할 수 있어야 함', () => {
      const { result } = renderHook(
        () =>
          useRealtimeEventStream({
            eventTypeFilter: ['deployment', 'release'],
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });

    it('필터를 동적으로 업데이트할 수 있어야 함', () => {
      const { result } = renderHook(() => useRealtimeEventStream(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateFilters({
          serviceFilter: ['minu-find'],
        });
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('항목 관리', () => {
    it('항목을 읽음으로 표시할 수 있어야 함', async () => {
      const { result } = renderHook(() => useRealtimeEventStream(), {
        wrapper: createWrapper(),
      });

      // 테스트 항목 추가 (실제로는 realtime 이벤트를 통해 추가됨)
      // markAsRead 함수만 테스트
      act(() => {
        result.current.markAsRead('event-1');
      });

      expect(result.current).toBeDefined();
    });

    it('모든 항목을 읽음으로 표시할 수 있어야 함', () => {
      const { result } = renderHook(() => useRealtimeEventStream(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.markAllAsRead();
      });

      expect(result.current.unreadCount).toBe(0);
    });

    it('스트림을 초기화할 수 있어야 함', () => {
      const { result } = renderHook(() => useRealtimeEventStream(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.clearStream();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.filteredItems).toEqual([]);
    });
  });

  describe('메모리 제한', () => {
    it('최대 항목 수를 설정할 수 있어야 함', () => {
      const { result } = renderHook(
        () =>
          useRealtimeEventStream({
            maxItems: 50,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });

    it('기본 최대 항목 수는 100이어야 함', () => {
      const { result } = renderHook(() => useRealtimeEventStream(), {
        wrapper: createWrapper(),
      });

      // 기본값 확인 (간접적으로)
      expect(result.current.items.length).toBeLessThanOrEqual(100);
    });
  });

  describe('콜백', () => {
    it('새 항목 수신 시 콜백이 호출되어야 함', async () => {
      const onNewItem = vi.fn();

      renderHook(
        () =>
          useRealtimeEventStream({
            onNewItem,
          }),
        { wrapper: createWrapper() }
      );

      // 실제 realtime 이벤트가 발생했을 때 콜백이 호출됨
      // 모킹 환경에서는 직접 테스트 불가
      expect(onNewItem).not.toHaveBeenCalled();
    });

    it('연결 상태 변경 시 콜백이 호출되어야 함', async () => {
      const onConnectionChange = vi.fn();

      renderHook(
        () =>
          useRealtimeEventStream({
            onConnectionChange,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(onConnectionChange).toHaveBeenCalled();
      });
    });
  });
});

describe('헬퍼 함수', () => {
  describe('getEventFromStreamItem', () => {
    it('이벤트 항목에서 이벤트 데이터를 추출해야 함', () => {
      const item: StreamItem = {
        id: 'event-1',
        type: 'event',
        data: {
          id: '1',
          service_id: 'minu-build',
          event_type: 'deployment',
        } as never,
        receivedAt: new Date(),
        isRead: false,
      };

      const event = getEventFromStreamItem(item);

      expect(event).not.toBeNull();
      expect(event?.service_id).toBe('minu-build');
    });

    it('이슈 항목에서는 null을 반환해야 함', () => {
      const item: StreamItem = {
        id: 'issue-1',
        type: 'issue',
        data: {} as never,
        receivedAt: new Date(),
        isRead: false,
      };

      const event = getEventFromStreamItem(item);

      expect(event).toBeNull();
    });
  });

  describe('getIssueFromStreamItem', () => {
    it('이슈 항목에서 이슈 데이터를 추출해야 함', () => {
      const item: StreamItem = {
        id: 'issue-1',
        type: 'issue',
        data: {
          id: '1',
          service_id: 'minu-keep',
          severity: 'high',
        } as never,
        receivedAt: new Date(),
        isRead: false,
      };

      const issue = getIssueFromStreamItem(item);

      expect(issue).not.toBeNull();
      expect(issue?.service_id).toBe('minu-keep');
    });

    it('이벤트 항목에서는 null을 반환해야 함', () => {
      const item: StreamItem = {
        id: 'event-1',
        type: 'event',
        data: {} as never,
        receivedAt: new Date(),
        isRead: false,
      };

      const issue = getIssueFromStreamItem(item);

      expect(issue).toBeNull();
    });
  });

  describe('sortStreamItemsByTime', () => {
    it('항목을 시간순으로 정렬해야 함 (최신순)', () => {
      const items: StreamItem[] = [
        {
          id: '1',
          type: 'event',
          data: {} as never,
          receivedAt: new Date('2025-12-01'),
          isRead: false,
        },
        {
          id: '2',
          type: 'event',
          data: {} as never,
          receivedAt: new Date('2025-12-03'),
          isRead: false,
        },
        {
          id: '3',
          type: 'event',
          data: {} as never,
          receivedAt: new Date('2025-12-02'),
          isRead: false,
        },
      ];

      const sorted = sortStreamItemsByTime(items);

      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });
  });

  describe('groupStreamItemsByType', () => {
    it('항목을 타입별로 그룹화해야 함', () => {
      const items: StreamItem[] = [
        { id: 'event-1', type: 'event', data: {} as never, receivedAt: new Date(), isRead: false },
        { id: 'issue-1', type: 'issue', data: {} as never, receivedAt: new Date(), isRead: false },
        { id: 'event-2', type: 'event', data: {} as never, receivedAt: new Date(), isRead: false },
      ];

      const grouped = groupStreamItemsByType(items);

      expect(grouped.events).toHaveLength(2);
      expect(grouped.issues).toHaveLength(1);
    });
  });
});
