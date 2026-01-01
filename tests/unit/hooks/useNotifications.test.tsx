 
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
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

// Mock Workers API client - must be before imports
const mockWebSocket = {
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  close: vi.fn(),
};

vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
  realtimeApi: {
    connect: vi.fn(() => mockWebSocket),
  },
}));

// Mock errors
vi.mock('@/lib/errors', () => ({
  devError: vi.fn(),
  devLog: vi.fn(),
}));

// Import after mocks are defined
import { useNotifications } from '@/hooks/realtime/useNotifications';
import { callWorkersApi } from '@/integrations/cloudflare/client';

describe('useNotifications', () => {
  let queryClient: QueryClient;

  const mockNotifications = [
    {
      id: 'notif-1',
      user_id: 'user-123',
      type: 'order' as const,
      title: '주문 완료',
      message: '주문이 완료되었습니다.',
      link: '/orders/1',
      read: false,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'notif-2',
      user_id: 'user-123',
      type: 'comment' as const,
      title: '새 댓글',
      message: '댓글이 달렸습니다.',
      link: '/posts/1',
      read: true,
      created_at: '2024-01-02T00:00:00Z',
    },
  ];

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
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('초기 상태', () => {
    it('빈 알림 목록으로 초기화되어야 함', () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [],
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.isLoading).toBe(true);
    });

    it('필요한 모든 함수가 정의되어 있어야 함', () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [],
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(typeof result.current.markAsRead).toBe('function');
      expect(typeof result.current.markAllAsRead).toBe('function');
      expect(typeof result.current.deleteNotification).toBe('function');
      expect(typeof result.current.createNotification).toBe('function');
    });
  });

  describe('알림 조회', () => {
    it('알림 목록을 성공적으로 불러와야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockNotifications,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      expect(result.current.notifications[0].title).toBe('주문 완료');
      expect(result.current.notifications[1].title).toBe('새 댓글');
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/notifications?user_id=user-123'),
        expect.objectContaining({ token: 'test-token' })
      );
    });

    it('읽지 않은 알림 개수를 올바르게 계산해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockNotifications,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(1);
      });
    });

    it('에러 발생 시 빈 배열을 반환해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notifications).toEqual([]);
    });
  });

  describe('실시간 구독', () => {
    it('WebSocket 연결을 생성해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [],
        error: null,
        status: 200,
      });

      const { realtimeApi } = await import('@/integrations/cloudflare/client');

      renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(realtimeApi.connect).toHaveBeenCalledWith('notifications-user-123', 'user-123');
      });
    });

    it('컴포넌트 언마운트 시 WebSocket을 닫아야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: [],
        error: null,
        status: 200,
      });

      const { unmount } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(mockWebSocket.close).not.toHaveBeenCalled();
      });

      unmount();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('알림 읽음 처리', () => {
    it('특정 알림을 읽음 처리할 수 있어야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValueOnce({
        data: mockNotifications,
        error: null,
        status: 200,
      }).mockResolvedValueOnce({
        data: null,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        result.current.markAsRead('notif-1');
      });

      await waitFor(() => {
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/notifications/notif-1',
          expect.objectContaining({
            method: 'PATCH',
            token: 'test-token',
            body: { read: true },
          })
        );
      });
    });

    it('모든 알림을 읽음 처리할 수 있어야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValueOnce({
        data: mockNotifications,
        error: null,
        status: 200,
      }).mockResolvedValueOnce({
        data: null,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        result.current.markAllAsRead();
      });

      await waitFor(() => {
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/notifications/mark-all-read',
          expect.objectContaining({
            method: 'POST',
            token: 'test-token',
            body: { user_id: 'user-123' },
          })
        );
      });
    });
  });

  describe('알림 삭제', () => {
    it('알림을 삭제할 수 있어야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValueOnce({
        data: mockNotifications,
        error: null,
        status: 200,
      }).mockResolvedValueOnce({
        data: null,
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        result.current.deleteNotification('notif-1');
      });

      await waitFor(() => {
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/notifications/notif-1',
          expect.objectContaining({
            method: 'DELETE',
            token: 'test-token',
          })
        );
      });
    });
  });

  describe('알림 생성', () => {
    it('새 알림을 생성할 수 있어야 함', async () => {
      const createdNotification = {
        id: 'notif-new',
        user_id: 'user-456',
        type: 'system' as const,
        title: '시스템 알림',
        message: '테스트 알림',
        link: null,
        read: false,
        created_at: new Date().toISOString(),
      };

      vi.mocked(callWorkersApi).mockResolvedValueOnce({
        data: [],
        error: null,
        status: 200,
      }).mockResolvedValueOnce({
        data: createdNotification,
        error: null,
        status: 201,
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const notification = await result.current.createNotification('user-456', {
        type: 'system',
        title: '시스템 알림',
        message: '테스트 알림',
        link: null,
      });

      expect(notification).not.toBeNull();
      expect(notification?.title).toBe('시스템 알림');
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/notifications',
        expect.objectContaining({
          method: 'POST',
          token: 'test-token',
          body: expect.objectContaining({
            user_id: 'user-456',
            type: 'system',
            title: '시스템 알림',
            message: '테스트 알림',
          }),
        })
      );
    });

    it('알림 생성 실패 시 null을 반환해야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValueOnce({
        data: [],
        error: null,
        status: 200,
      }).mockResolvedValueOnce({
        data: null,
        error: 'Insert failed',
        status: 500,
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const notification = await result.current.createNotification('user-456', {
        type: 'system',
        title: '시스템 알림',
        message: '테스트 알림',
        link: null,
      });

      expect(notification).toBeNull();
    });
  });
});
