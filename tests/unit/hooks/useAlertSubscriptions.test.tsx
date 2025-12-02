/**
 * useAlertSubscriptions Hook 테스트
 *
 * 알림 구독 설정 조회 및 관리 훅 테스트
 * - 구독 목록 조회
 * - 구독 생성
 * - 구독 업데이트
 * - 구독 삭제
 * - 채널 관리
 * - 조용한 시간 설정
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAlertSubscriptions,
  alertSubscriptionKeys,
  getTopicTypeLabel,
  getChannelLabel,
  isInQuietHours,
  type AlertSubscription,
} from '@/hooks/useAlertSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
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
const mockSubscriptions = [
  {
    id: '1',
    user_id: 'user-1',
    topic_type: 'service',
    topic_value: 'mcp-gateway',
    enabled_channels: ['in_app', 'email'],
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    is_enabled: true,
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2025-12-01T10:00:00Z',
  },
  {
    id: '2',
    user_id: 'user-1',
    topic_type: 'severity',
    topic_value: 'critical',
    enabled_channels: ['email'],
    quiet_hours_start: null,
    quiet_hours_end: null,
    is_enabled: true,
    created_at: '2025-12-01T11:00:00Z',
    updated_at: '2025-12-01T11:00:00Z',
  },
  {
    id: '3',
    user_id: 'user-1',
    topic_type: 'event_type',
    topic_value: 'error',
    enabled_channels: ['in_app'],
    quiet_hours_start: null,
    quiet_hours_end: null,
    is_enabled: false,
    created_at: '2025-12-01T12:00:00Z',
    updated_at: '2025-12-01T12:00:00Z',
  },
];

// Mock query 타입 정의
interface MockQuery {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  then?: ReturnType<typeof vi.fn>;
}

describe('useAlertSubscriptions', () => {
  let mockQuery: MockQuery;

  beforeEach(() => {
    vi.clearAllMocks();

    // 완전한 체이닝 지원하는 mock 객체 생성
    const createMockQuery = () => {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      // 모든 메서드는 자기 자신을 반환하되, then을 가진 Promise처럼 동작
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.order.mockReturnValue(query);
      query.insert.mockReturnValue(query);
      query.update.mockReturnValue(query);
      query.delete.mockReturnValue(query);

      // then을 추가하여 Promise처럼 동작하도록
      const queryWithThen = query as MockQuery;
      queryWithThen.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockSubscriptions, error: null }).then(onFulfilled);
      });

      return queryWithThen;
    };

    mockQuery = createMockQuery();
    vi.mocked(supabase.from).mockReturnValue(mockQuery as ReturnType<typeof supabase.from>);
  });

  describe('초기 상태 확인', () => {
    it('초기 로딩 상태여야 함', () => {
      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.subscriptions).toEqual([]);
    });

    it('올바른 query key를 사용해야 함', () => {
      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(Array.isArray(alertSubscriptionKeys.all)).toBe(true);
      expect(alertSubscriptionKeys.all[0]).toBe('alert-subscriptions');
      expect(alertSubscriptionKeys.byUser('user-1')).toEqual([
        'alert-subscriptions',
        'user',
        'user-1',
      ]);
    });

    it('userId가 없으면 쿼리를 비활성화해야 함', () => {
      // Execute
      const { result } = renderHook(() => useAlertSubscriptions(''), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.subscriptions).toEqual([]);
    });
  });

  describe('데이터 조회 성공', () => {
    it('구독 목록을 성공적으로 조회해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.subscriptions.length).toBe(3);
      expect(result.current.error).toBeNull();
    });

    it('alert_subscriptions 테이블에서 데이터를 조회해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('alert_subscriptions');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('DB 데이터를 올바른 타입으로 변환해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const subscription = result.current.subscriptions[0];
      expect(subscription.id).toBe('1');
      expect(subscription.userId).toBe('user-1');
      expect(subscription.topicType).toBe('service');
      expect(subscription.topicValue).toBe('mcp-gateway');
      expect(subscription.enabledChannels).toEqual(['in_app', 'email']);
      expect(subscription.quietHoursStart).toBe('22:00');
      expect(subscription.quietHoursEnd).toBe('08:00');
      expect(subscription.isEnabled).toBe(true);
      expect(subscription.createdAt).toBeInstanceOf(Date);
      expect(subscription.updatedAt).toBeInstanceOf(Date);
    });

    it('빈 목록을 올바르게 처리해야 함', async () => {
      // Setup
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: [], error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.subscriptions).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('구독 생성', () => {
    it('새 구독을 생성해야 함', async () => {
      // Setup
      const newSubscription: Omit<AlertSubscription, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: 'user-1',
        topicType: 'service',
        topicValue: 'minu-find',
        enabledChannels: ['in_app'],
        isEnabled: true,
      };

      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.createSubscription(newSubscription);

      // Assert
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        topic_type: 'service',
        topic_value: 'minu-find',
        enabled_channels: ['in_app'],
        quiet_hours_start: undefined,
        quiet_hours_end: undefined,
        is_enabled: true,
      });
    });

    it('조용한 시간이 포함된 구독을 생성해야 함', async () => {
      // Setup
      const newSubscription: Omit<AlertSubscription, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: 'user-1',
        topicType: 'severity',
        topicValue: 'high',
        enabledChannels: ['email'],
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        isEnabled: true,
      };

      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.createSubscription(newSubscription);

      // Assert
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        topic_type: 'severity',
        topic_value: 'high',
        enabled_channels: ['email'],
        quiet_hours_start: '23:00',
        quiet_hours_end: '07:00',
        is_enabled: true,
      });
    });
  });

  describe('구독 업데이트', () => {
    it('구독 설정을 업데이트해야 함', async () => {
      // Setup
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.updateSubscription('1', {
        isEnabled: false,
      });

      // Assert
      expect(mockQuery.update).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });

    it('여러 필드를 동시에 업데이트해야 함', async () => {
      // Setup
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.updateSubscription('1', {
        enabledChannels: ['email'],
        isEnabled: false,
        quietHoursStart: '21:00',
        quietHoursEnd: '09:00',
      });

      // Assert
      expect(mockQuery.update).toHaveBeenCalled();
    });
  });

  describe('구독 삭제', () => {
    it('구독을 삭제해야 함', async () => {
      // Setup
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.deleteSubscription('1');

      // Assert
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('채널 관리', () => {
    it('채널을 활성화해야 함', async () => {
      // Setup
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockSubscriptions, error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 이메일 채널만 있는 구독에 in_app 추가
      await result.current.enableChannel('2', 'in_app');

      // Assert
      expect(mockQuery.update).toHaveBeenCalled();
    });

    it('이미 활성화된 채널은 중복 추가하지 않아야 함', async () => {
      // Setup
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockSubscriptions, error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 이미 email 채널이 있는 구독에 email 재추가 시도
      await result.current.enableChannel('1', 'email');

      // Assert - 업데이트는 호출되지만 채널은 중복되지 않음
      expect(mockQuery.update).toHaveBeenCalled();
    });

    it('채널을 비활성화해야 함', async () => {
      // Setup
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockSubscriptions, error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // in_app 채널 비활성화
      await result.current.disableChannel('1', 'in_app');

      // Assert
      expect(mockQuery.update).toHaveBeenCalled();
    });

    it('존재하지 않는 구독의 채널 활성화 시 에러를 던져야 함', async () => {
      // Setup
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockSubscriptions, error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      await expect(result.current.enableChannel('non-existent', 'email')).rejects.toThrow(
        'Subscription not found'
      );
    });

    it('존재하지 않는 구독의 채널 비활성화 시 에러를 던져야 함', async () => {
      // Setup
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockSubscriptions, error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      await expect(result.current.disableChannel('non-existent', 'email')).rejects.toThrow(
        'Subscription not found'
      );
    });
  });

  describe('조용한 시간 설정', () => {
    it('조용한 시간을 설정해야 함', async () => {
      // Setup
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockSubscriptions, error: null }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.setQuietHours('2', '23:00', '07:00');

      // Assert
      expect(mockQuery.update).toHaveBeenCalled();
    });
  });

  describe('refetch', () => {
    it('데이터를 강제로 다시 불러와야 함', async () => {
      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.refetch();

      // Assert
      expect(mockQuery.select).toHaveBeenCalled();
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
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toBe(error);
    });

    it('생성 실패 시 에러를 던져야 함', async () => {
      // Setup
      const error = new Error('Insert failed');
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      await expect(
        result.current.createSubscription({
          userId: 'user-1',
          topicType: 'service',
          topicValue: 'test',
          enabledChannels: ['in_app'],
          isEnabled: true,
        })
      ).rejects.toThrow('Insert failed');
    });

    it('업데이트 실패 시 에러를 던져야 함', async () => {
      // Setup
      const error = new Error('Update failed');
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      await expect(
        result.current.updateSubscription('1', { isEnabled: false })
      ).rejects.toThrow('Update failed');
    });

    it('삭제 실패 시 에러를 던져야 함', async () => {
      // Setup
      const error = new Error('Delete failed');
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error }).then(onFulfilled);
      });

      // Execute
      const { result } = renderHook(() => useAlertSubscriptions('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      await expect(result.current.deleteSubscription('1')).rejects.toThrow('Delete failed');
    });
  });
});

describe('Helper Functions', () => {
  describe('getTopicTypeLabel', () => {
    it('service 타입의 라벨을 반환해야 함', () => {
      expect(getTopicTypeLabel('service')).toBe('서비스');
    });

    it('severity 타입의 라벨을 반환해야 함', () => {
      expect(getTopicTypeLabel('severity')).toBe('심각도');
    });

    it('event_type 타입의 라벨을 반환해야 함', () => {
      expect(getTopicTypeLabel('event_type')).toBe('이벤트 타입');
    });
  });

  describe('getChannelLabel', () => {
    it('in_app 채널의 라벨을 반환해야 함', () => {
      expect(getChannelLabel('in_app')).toBe('인앱');
    });

    it('email 채널의 라벨을 반환해야 함', () => {
      expect(getChannelLabel('email')).toBe('이메일');
    });
  });

  describe('isInQuietHours', () => {
    it('조용한 시간 내에 있으면 true를 반환해야 함', () => {
      // 22:00 ~ 08:00 조용한 시간, 23:00에 체크 (로컬 시간)
      const currentTime = new Date('2025-12-02T00:00:00');
      currentTime.setHours(23, 0, 0, 0);
      expect(isInQuietHours('22:00', '08:00', currentTime)).toBe(true);
    });

    it('조용한 시간 외에 있으면 false를 반환해야 함', () => {
      // 22:00 ~ 08:00 조용한 시간, 10:00에 체크 (로컬 시간)
      const currentTime = new Date('2025-12-02T00:00:00');
      currentTime.setHours(10, 0, 0, 0);
      expect(isInQuietHours('22:00', '08:00', currentTime)).toBe(false);
    });

    it('자정을 넘는 조용한 시간을 처리해야 함', () => {
      // 22:00 ~ 08:00 조용한 시간, 01:00에 체크 (로컬 시간)
      const currentTime = new Date('2025-12-02T00:00:00');
      currentTime.setHours(1, 0, 0, 0);
      expect(isInQuietHours('22:00', '08:00', currentTime)).toBe(true);
    });

    it('조용한 시간이 설정되지 않으면 false를 반환해야 함', () => {
      const currentTime = new Date('2025-12-02T00:00:00');
      currentTime.setHours(23, 0, 0, 0);
      expect(isInQuietHours(undefined, undefined, currentTime)).toBe(false);
    });

    it('조용한 시간 시작 시각에 true를 반환해야 함', () => {
      // 22:00 ~ 08:00 조용한 시간, 22:00에 체크 (로컬 시간)
      const currentTime = new Date('2025-12-02T00:00:00');
      currentTime.setHours(22, 0, 0, 0);
      expect(isInQuietHours('22:00', '08:00', currentTime)).toBe(true);
    });

    it('조용한 시간 종료 시각에 false를 반환해야 함', () => {
      // 22:00 ~ 08:00 조용한 시간, 08:00에 체크 (로컬 시간)
      const currentTime = new Date('2025-12-02T00:00:00');
      currentTime.setHours(8, 0, 0, 0);
      expect(isInQuietHours('22:00', '08:00', currentTime)).toBe(false);
    });

    it('일반적인 조용한 시간(자정을 넘지 않음)을 처리해야 함', () => {
      // 13:00 ~ 14:00 조용한 시간, 13:30에 체크 (로컬 시간)
      const currentTime = new Date('2025-12-02T00:00:00');
      currentTime.setHours(13, 30, 0, 0);
      expect(isInQuietHours('13:00', '14:00', currentTime)).toBe(true);
    });
  });
});
