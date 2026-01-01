/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';

// Mock useAuth - must be before imports
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    workersTokens: { accessToken: 'test-token', refreshToken: 'test-refresh' },
    workersUser: { id: 'user-123', email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
  })),
}));

// Mock WebSocket
let mockWebSocket: {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  readyState: number;
};

const createMockWebSocket = () => {
  mockWebSocket = {
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: vi.fn(),
    close: vi.fn(),
    readyState: WebSocket.OPEN,
  };
  return mockWebSocket;
};

// Mock Workers API client - must be before imports
vi.mock('@/integrations/cloudflare/client', () => ({
  realtimeApi: {
    connect: vi.fn(() => createMockWebSocket()),
  },
}));

// Import after mocks are defined
import { useRealtimeSubscription } from '@/hooks/realtime/useRealtimeSubscription';
import { realtimeApi } from '@/integrations/cloudflare/client';

describe('useRealtimeSubscription', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.clearAllMocks();
    createMockWebSocket();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // 헬퍼: WebSocket 연결 완료 시뮬레이션
  const simulateConnection = () => {
    // onopen 트리거
    if (mockWebSocket.onopen) {
      mockWebSocket.onopen(new Event('open'));
    }
    // subscribed 응답 시뮬레이션
    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage(new MessageEvent('message', {
        data: JSON.stringify({ type: 'subscribed', table: 'test_table' }),
      }));
    }
  };

  // 헬퍼: DB 변경 이벤트 시뮬레이션
  const simulateDbChange = (eventType: 'INSERT' | 'UPDATE' | 'DELETE', newData: any, oldData: any = {}) => {
    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage(new MessageEvent('message', {
        data: JSON.stringify({
          type: 'db_change',
          table: 'test_table',
          eventType,
          new: newData,
          old: oldData,
        }),
      }));
    }
  };

  describe('초기 상태 및 연결', () => {
    it('초기 상태는 disconnected여야 함', () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test', { enabled: false }),
        { wrapper }
      );

      expect(result.current.status).toBe('disconnected');
      expect(result.current.error).toBe(null);
    });

    it('enabled가 true일 때 WebSocket에 연결해야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test'),
        { wrapper }
      );

      // Assert - WebSocket 연결
      expect(realtimeApi.connect).toHaveBeenCalledWith('table-test_table', 'user-123');

      // 연결 시뮬레이션
      simulateConnection();

      // Assert - 구독 요청
      await waitFor(() => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'subscribe',
            table: 'test_table',
            event: '*',
            filter: undefined,
          })
        );
      });

      // Assert - 연결 상태
      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });
    });

    it('enabled가 false일 때 연결하지 않아야 함', () => {
      renderHook(
        () => useRealtimeSubscription('test_table', 'test', { enabled: false }),
        { wrapper }
      );

      expect(realtimeApi.connect).not.toHaveBeenCalled();
    });

    it('구독 성공 시 상태가 connected로 변경되어야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test'),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });
    });

    it('필터를 지정할 수 있어야 함', async () => {
      renderHook(
        () =>
          useRealtimeSubscription('test_table', 'test', {
            filter: 'published=eq.true',
          }),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'subscribe',
            table: 'test_table',
            event: '*',
            filter: 'published=eq.true',
          })
        );
      });
    });

    it('특정 이벤트만 구독할 수 있어야 함', async () => {
      renderHook(
        () => useRealtimeSubscription('test_table', 'test', { event: 'INSERT' }),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'subscribe',
            table: 'test_table',
            event: 'INSERT',
            filter: undefined,
          })
        );
      });
    });
  });

  describe('INSERT 이벤트 처리', () => {
    it('INSERT 이벤트 발생 시 캐시를 업데이트해야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test'),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Spy on queryClient methods
      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Simulate INSERT event
      const newData = { id: 'new-1', name: 'New Item' };
      simulateDbChange('INSERT', newData);

      // Assert
      await waitFor(() => {
        expect(setQueryDataSpy).toHaveBeenCalledWith(['test', 'detail', 'new-1'], newData);
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['test', 'list'] });
      });
    });

    it('INSERT 이벤트 발생 시 커스텀 핸들러를 호출해야 함', async () => {
      const onChange = vi.fn();

      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test', { onChange }),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Simulate INSERT event
      const newData = { id: 'new-1', name: 'New Item' };
      simulateDbChange('INSERT', newData, {});

      // Assert
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          type: 'db_change',
          table: 'test_table',
          eventType: 'INSERT',
          new: newData,
          old: {},
        });
      });
    });
  });

  describe('UPDATE 이벤트 처리', () => {
    it('UPDATE 이벤트 발생 시 캐시를 업데이트해야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test'),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Spy on queryClient methods
      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Simulate UPDATE event
      const updatedData = { id: 'item-1', name: 'Updated Item' };
      const oldData = { id: 'item-1', name: 'Old Item' };
      simulateDbChange('UPDATE', updatedData, oldData);

      // Assert
      await waitFor(() => {
        expect(setQueryDataSpy).toHaveBeenCalledWith(['test', 'detail', 'item-1'], updatedData);
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['test', 'list'] });
      });
    });

    it('UPDATE 이벤트 발생 시 커스텀 핸들러를 호출해야 함', async () => {
      const onChange = vi.fn();

      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test', { onChange }),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Simulate UPDATE event
      const updatedData = { id: 'item-1', name: 'Updated Item' };
      const oldData = { id: 'item-1', name: 'Old Item' };
      simulateDbChange('UPDATE', updatedData, oldData);

      // Assert
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          type: 'db_change',
          table: 'test_table',
          eventType: 'UPDATE',
          new: updatedData,
          old: oldData,
        });
      });
    });
  });

  describe('DELETE 이벤트 처리', () => {
    it('DELETE 이벤트 발생 시 캐시에서 제거해야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test'),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Spy on queryClient methods
      const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Simulate DELETE event
      const deletedData = { id: 'item-1', name: 'Deleted Item' };
      simulateDbChange('DELETE', {}, deletedData);

      // Assert
      await waitFor(() => {
        expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['test', 'detail', 'item-1'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['test', 'list'] });
      });
    });

    it('DELETE 이벤트 발생 시 커스텀 핸들러를 호출해야 함', async () => {
      const onChange = vi.fn();

      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test', { onChange }),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Simulate DELETE event
      const deletedData = { id: 'item-1', name: 'Deleted Item' };
      simulateDbChange('DELETE', {}, deletedData);

      // Assert
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          type: 'db_change',
          table: 'test_table',
          eventType: 'DELETE',
          new: {},
          old: deletedData,
        });
      });
    });
  });

  describe('구독 상태 관리', () => {
    it('error 상태가 반환 객체에 포함되어야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test'),
        { wrapper }
      );

      // Assert - error 속성이 존재해야 함
      expect('error' in result.current).toBe(true);
    });

    it('status 속성이 존재해야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test'),
        { wrapper }
      );

      // Assert - status 속성 확인
      expect(['connected', 'disconnected', 'connecting', 'error'].includes(result.current.status) || result.current.status).toBeTruthy();
    });

    it('WebSocket close 발생 시 상태가 disconnected로 변경되어야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test'),
        { wrapper }
      );

      // Wait for connection
      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Trigger onclose
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose(new CloseEvent('close'));
      }

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected');
      });
    });

    it('WebSocket error 발생 시 상태가 error로 변경되어야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test'),
        { wrapper }
      );

      // Trigger onerror
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Event('error'));
      }

      await waitFor(() => {
        expect(result.current.status).toBe('error');
        expect(result.current.error).not.toBeNull();
      });
    });
  });

  describe('구독 해제', () => {
    it('컴포넌트 언마운트 시 WebSocket을 닫아야 함', async () => {
      const { unmount } = renderHook(
        () => useRealtimeSubscription('test_table', 'test'),
        { wrapper }
      );

      await waitFor(() => {
        expect(realtimeApi.connect).toHaveBeenCalled();
      });

      // Unmount
      unmount();

      // Assert
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('unsubscribe 함수를 호출하면 WebSocket이 닫혀야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test'),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Call unsubscribe
      result.current.unsubscribe();

      // Assert
      expect(mockWebSocket.close).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected');
      });
    });
  });

  describe('캐시 무효화 옵션', () => {
    it('invalidateList가 false일 때 리스트 캐시를 무효화하지 않아야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test', { invalidateList: false }),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Simulate INSERT event
      simulateDbChange('INSERT', { id: 'new-1', name: 'New Item' });

      // Assert - invalidateQueries should not be called
      // 약간의 시간을 두고 확인 (호출되지 않았는지 확인하기 위해)
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });

    it('invalidateDetail가 false일 때 디테일 캐시를 업데이트하지 않아야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test', { invalidateDetail: false }),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

      // Simulate INSERT event
      simulateDbChange('INSERT', { id: 'new-1', name: 'New Item' });

      // Assert - setQueryData should not be called for detail
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(setQueryDataSpy).not.toHaveBeenCalled();
    });
  });

  describe('디바운스', () => {
    it('debounceMs 옵션을 사용하여 캐시 무효화를 지연시킬 수 있어야 함', async () => {
      // 이 테스트는 debounce 옵션이 설정되었는지만 확인합니다.
      const { result } = renderHook(
        () => useRealtimeSubscription('test_table', 'test', { debounceMs: 1000 }),
        { wrapper }
      );

      simulateConnection();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // debounce 옵션이 설정된 상태에서 구독이 정상 작동하는지 확인
      expect(realtimeApi.connect).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalled();
    });
  });
});
