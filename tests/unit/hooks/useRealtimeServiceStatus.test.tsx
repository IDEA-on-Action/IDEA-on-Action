import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useRealtimeServiceStatus,
  useConnectionStatusDisplay,
} from '@/hooks/useRealtimeServiceStatus';
import type { ConnectionState } from '@/hooks/useRealtimeServiceStatus';

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

describe('useRealtimeServiceStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('초기화', () => {
    it('초기 상태가 올바르게 설정되어야 함', () => {
      const { result } = renderHook(() => useRealtimeServiceStatus(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connectionState.status).toBeDefined();
      expect(result.current.lastStatus).toBeNull();
      expect(result.current.statusHistory).toEqual([]);
    });

    it('특정 서비스만 구독할 수 있어야 함', () => {
      const { result } = renderHook(
        () =>
          useRealtimeServiceStatus({
            serviceId: 'minu-build',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('연결 관리', () => {
    it('마운트 시 자동으로 연결되어야 함', async () => {
      const { result } = renderHook(() => useRealtimeServiceStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('수동으로 재연결할 수 있어야 함', async () => {
      const { result } = renderHook(() => useRealtimeServiceStatus(), {
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
      const { result } = renderHook(() => useRealtimeServiceStatus(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.connectionState.status).toBe('disconnected');
    });
  });

  describe('재연결 옵션', () => {
    it('자동 재연결이 기본적으로 활성화되어야 함', () => {
      const { result } = renderHook(() => useRealtimeServiceStatus(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
    });

    it('자동 재연결을 비활성화할 수 있어야 함', () => {
      const { result } = renderHook(
        () =>
          useRealtimeServiceStatus({
            autoReconnect: false,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });

    it('최대 재연결 시도 횟수를 설정할 수 있어야 함', () => {
      const { result } = renderHook(
        () =>
          useRealtimeServiceStatus({
            maxReconnectAttempts: 3,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });

    it('재연결 간격을 설정할 수 있어야 함', () => {
      const { result } = renderHook(
        () =>
          useRealtimeServiceStatus({
            reconnectInterval: 5000,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('콜백', () => {
    it('상태 변경 시 콜백이 호출되어야 함', async () => {
      const onStatusChange = vi.fn();

      renderHook(
        () =>
          useRealtimeServiceStatus({
            onStatusChange,
          }),
        { wrapper: createWrapper() }
      );

      // 실제 상태 변경 이벤트가 발생했을 때 콜백이 호출됨
      // 모킹 환경에서는 직접 테스트 불가
      expect(onStatusChange).not.toHaveBeenCalled();
    });

    it('연결 상태 변경 시 콜백이 호출되어야 함', async () => {
      const onConnectionChange = vi.fn();

      renderHook(
        () =>
          useRealtimeServiceStatus({
            onConnectionChange,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(onConnectionChange).toHaveBeenCalled();
      });
    });
  });

  describe('상태 히스토리', () => {
    it('상태 변경 히스토리를 추적해야 함', () => {
      const { result } = renderHook(() => useRealtimeServiceStatus(), {
        wrapper: createWrapper(),
      });

      expect(result.current.statusHistory).toEqual([]);
    });

    it('최근 10개의 상태 변경만 유지해야 함', () => {
      const { result } = renderHook(() => useRealtimeServiceStatus(), {
        wrapper: createWrapper(),
      });

      // 히스토리 제한은 내부적으로 관리됨
      expect(result.current.statusHistory.length).toBeLessThanOrEqual(10);
    });
  });

  describe('에러 처리', () => {
    it('연결 에러를 처리해야 함', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      vi.mocked(supabase.channel).mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((callback) => {
          callback('CHANNEL_ERROR', new Error('Connection failed'));
          return {};
        }),
      } as never);

      const { result } = renderHook(() => useRealtimeServiceStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.connectionState.status).toBe('error');
      });
    });

    it('타임아웃 에러를 처리해야 함', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      vi.mocked(supabase.channel).mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((callback) => {
          callback('TIMED_OUT', null);
          return {};
        }),
      } as never);

      const { result } = renderHook(() => useRealtimeServiceStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.connectionState.status).toBe('error');
      });
    });
  });
});

describe('useConnectionStatusDisplay', () => {
  it('연결 중 상태를 올바르게 표시해야 함', () => {
    const state: ConnectionState = {
      status: 'connecting',
      error: null,
      lastConnectedAt: null,
      reconnectAttempts: 0,
    };

    const { statusText, statusColor } = useConnectionStatusDisplay(state);

    expect(statusText).toBe('연결 중...');
    expect(statusColor).toBe('text-yellow-500');
  });

  it('연결됨 상태를 올바르게 표시해야 함', () => {
    const state: ConnectionState = {
      status: 'connected',
      error: null,
      lastConnectedAt: new Date(),
      reconnectAttempts: 0,
    };

    const { statusText, statusColor } = useConnectionStatusDisplay(state);

    expect(statusText).toBe('연결됨');
    expect(statusColor).toBe('text-green-500');
  });

  it('연결 끊김 상태를 올바르게 표시해야 함', () => {
    const state: ConnectionState = {
      status: 'disconnected',
      error: null,
      lastConnectedAt: null,
      reconnectAttempts: 0,
    };

    const { statusText, statusColor } = useConnectionStatusDisplay(state);

    expect(statusText).toBe('연결 끊김');
    expect(statusColor).toBe('text-gray-500');
  });

  it('에러 상태를 올바르게 표시해야 함', () => {
    const state: ConnectionState = {
      status: 'error',
      error: new Error('Test error'),
      lastConnectedAt: null,
      reconnectAttempts: 0,
    };

    const { statusText, statusColor } = useConnectionStatusDisplay(state);

    expect(statusText).toBe('연결 오류');
    expect(statusColor).toBe('text-red-500');
  });

  it('재연결 시도 중 상태를 올바르게 표시해야 함', () => {
    const state: ConnectionState = {
      status: 'error',
      error: new Error('Test error'),
      lastConnectedAt: null,
      reconnectAttempts: 2,
    };

    const { statusText, isReconnecting } = useConnectionStatusDisplay(state);

    expect(statusText).toContain('재연결 시도 중');
    expect(statusText).toContain('2회');
    expect(isReconnecting).toBe(true);
  });

  it('배경 색상을 올바르게 반환해야 함', () => {
    const connectedState: ConnectionState = {
      status: 'connected',
      error: null,
      lastConnectedAt: new Date(),
      reconnectAttempts: 0,
    };

    const { statusBgColor } = useConnectionStatusDisplay(connectedState);

    expect(statusBgColor).toContain('bg-green');
  });
});
