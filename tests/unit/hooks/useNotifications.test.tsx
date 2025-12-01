/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';

// Mock supabase client
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
  })),
}));

// Mock errors
vi.mock('@/lib/errors', () => ({
  handleSupabaseError: vi.fn((error, options) => options.fallbackValue),
  devError: vi.fn(),
  devLog: vi.fn(),
}));

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
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.isLoading).toBe(true);
    });

    it('필요한 모든 함수가 정의되어 있어야 함', () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(typeof result.current.markAsRead).toBe('function');
      expect(typeof result.current.markAllAsRead).toBe('function');
      expect(typeof result.current.deleteNotification).toBe('function');
      expect(typeof result.current.createNotification).toBe('function');
    });
  });

  describe('알림 조회', () => {
    it('알림 목록을 성공적으로 불러와야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockNotifications,
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      expect(result.current.notifications[0].title).toBe('주문 완료');
      expect(result.current.notifications[1].title).toBe('새 댓글');
    });

    it('읽지 않은 알림 개수를 올바르게 계산해야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockNotifications,
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(1);
      });
    });

    it('에러 발생 시 빈 배열을 반환해야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notifications).toEqual([]);
    });
  });

  describe('실시간 구독', () => {
    it('Realtime 채널을 생성해야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith('notifications');
      });

      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('컴포넌트 언마운트 시 채널을 제거해야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { unmount } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalled();
      });

      unmount();

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('알림 읽음 처리', () => {
    it('특정 알림을 읽음 처리할 수 있어야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockNotifications,
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      };

      mockFrom.eq.mockImplementation(function (this: any) {
        return this;
      });

      mockFrom.update.mockImplementation(function (this: any) {
        return {
          eq: vi.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        };
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        result.current.markAsRead('notif-1');
      });

      // mutation 완료 대기
      await waitFor(() => {
        // markAsRead는 mutation이므로 즉시 반환
        expect(mockFrom.update).toHaveBeenCalledWith({ read: true });
      });
    });

    it('모든 알림을 읽음 처리할 수 있어야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockNotifications,
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      };

      mockFrom.eq.mockImplementation(function (this: any) {
        return this;
      });

      mockFrom.update.mockImplementation(function (this: any) {
        return {
          eq: vi.fn().mockReturnThis(),
        };
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        result.current.markAllAsRead();
      });

      await waitFor(() => {
        expect(mockFrom.update).toHaveBeenCalledWith({ read: true });
      });
    });
  });

  describe('알림 삭제', () => {
    it('알림을 삭제할 수 있어야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockNotifications,
          error: null,
        }),
        delete: vi.fn().mockReturnThis(),
      };

      mockFrom.delete.mockImplementation(function (this: any) {
        return {
          eq: vi.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        };
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        result.current.deleteNotification('notif-1');
      });

      await waitFor(() => {
        expect(mockFrom.delete).toHaveBeenCalled();
      });
    });
  });

  describe('알림 생성', () => {
    it('새 알림을 생성할 수 있어야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'notif-new',
            user_id: 'user-456',
            type: 'system',
            title: '시스템 알림',
            message: '테스트 알림',
            link: null,
            read: false,
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

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
      expect(mockFrom.insert).toHaveBeenCalled();
    });

    it('알림 생성 실패 시 null을 반환해야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

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
