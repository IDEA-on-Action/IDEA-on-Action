/**
 * useAlertSubscriptions Hook
 *
 * 사용자별 알림 구독 설정 조회 및 관리를 위한 React 훅
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 * @module hooks/useAlertSubscriptions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';

// ============================================================================
// Types
// ============================================================================

export interface AlertSubscription {
  id: string;
  userId: string;
  topicType: 'service' | 'severity' | 'event_type';
  topicValue: string;
  enabledChannels: ('in_app' | 'email')[];
  quietHoursStart?: string; // HH:mm
  quietHoursEnd?: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UseAlertSubscriptionsReturn {
  subscriptions: AlertSubscription[];
  isLoading: boolean;
  error: Error | null;
  updateSubscription: (
    id: string,
    settings: Partial<AlertSubscription>
  ) => Promise<void>;
  createSubscription: (
    subscription: Omit<AlertSubscription, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  enableChannel: (subscriptionId: string, channel: string) => Promise<void>;
  disableChannel: (subscriptionId: string, channel: string) => Promise<void>;
  setQuietHours: (
    subscriptionId: string,
    start: string,
    end: string
  ) => Promise<void>;
  refetch: () => Promise<void>;
}

// ============================================================================
// Query Keys
// ============================================================================

export const alertSubscriptionKeys = {
  all: ['alert-subscriptions'] as const,
  byUser: (userId: string) =>
    [...alertSubscriptionKeys.all, 'user', userId] as const,
};

// ============================================================================
// 구독 설정 조회
// ============================================================================

/**
 * 사용자별 알림 구독 설정 조회
 */
export function useAlertSubscriptions(
  userId: string
): UseAlertSubscriptionsReturn {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  // 구독 목록 조회
  const {
    data: subscriptions = [],
    isLoading,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: alertSubscriptionKeys.byUser(userId),
    queryFn: async () => {
      const { data, error } = await callWorkersApi<Array<{
        id: string;
        user_id: string;
        topic_type: string;
        topic_value: string;
        enabled_channels: string[];
        quiet_hours_start: string | null;
        quiet_hours_end: string | null;
        is_enabled: boolean;
        created_at: string;
        updated_at: string;
      }>>(`/api/v1/alert-subscriptions?user_id=${userId}`, {
        token: workersTokens?.accessToken,
      });

      if (error) throw new Error(error);

      // DB 데이터를 타입에 맞게 변환
      return (
        data?.map((item) => ({
          id: item.id,
          userId: item.user_id,
          topicType: item.topic_type as 'service' | 'severity' | 'event_type',
          topicValue: item.topic_value,
          enabledChannels: item.enabled_channels as ('in_app' | 'email')[],
          quietHoursStart: item.quiet_hours_start,
          quietHoursEnd: item.quiet_hours_end,
          isEnabled: item.is_enabled,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
        })) || []
      );
    },
    enabled: !!userId && !!workersTokens?.accessToken,
  });

  // ============================================================================
  // Mutations
  // ============================================================================

  // 구독 업데이트
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      settings,
    }: {
      id: string;
      settings: Partial<AlertSubscription>;
    }) => {
      const updateData: Record<string, unknown> = {};

      if (settings.topicType) updateData.topic_type = settings.topicType;
      if (settings.topicValue) updateData.topic_value = settings.topicValue;
      if (settings.enabledChannels)
        updateData.enabled_channels = settings.enabledChannels;
      if (settings.quietHoursStart !== undefined)
        updateData.quiet_hours_start = settings.quietHoursStart;
      if (settings.quietHoursEnd !== undefined)
        updateData.quiet_hours_end = settings.quietHoursEnd;
      if (settings.isEnabled !== undefined)
        updateData.is_enabled = settings.isEnabled;

      updateData.updated_at = new Date().toISOString();

      const { error } = await callWorkersApi(`/api/v1/alert-subscriptions/${id}`, {
        method: 'PATCH',
        token: workersTokens?.accessToken,
        body: updateData,
      });

      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: alertSubscriptionKeys.byUser(userId),
      });
    },
  });

  // 구독 생성
  const createMutation = useMutation({
    mutationFn: async (
      subscription: Omit<AlertSubscription, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      const { error } = await callWorkersApi('/api/v1/alert-subscriptions', {
        method: 'POST',
        token: workersTokens?.accessToken,
        body: {
          user_id: subscription.userId,
          topic_type: subscription.topicType,
          topic_value: subscription.topicValue,
          enabled_channels: subscription.enabledChannels,
          quiet_hours_start: subscription.quietHoursStart,
          quiet_hours_end: subscription.quietHoursEnd,
          is_enabled: subscription.isEnabled,
        },
      });

      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: alertSubscriptionKeys.byUser(userId),
      });
    },
  });

  // 구독 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await callWorkersApi(`/api/v1/alert-subscriptions/${id}`, {
        method: 'DELETE',
        token: workersTokens?.accessToken,
      });

      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: alertSubscriptionKeys.byUser(userId),
      });
    },
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * 특정 구독의 채널 활성화
   */
  const enableChannel = async (subscriptionId: string, channel: string) => {
    const subscription = subscriptions.find((s) => s.id === subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updatedChannels = [...subscription.enabledChannels];
    if (!updatedChannels.includes(channel as 'in_app' | 'email')) {
      updatedChannels.push(channel as 'in_app' | 'email');
    }

    await updateMutation.mutateAsync({
      id: subscriptionId,
      settings: { enabledChannels: updatedChannels },
    });
  };

  /**
   * 특정 구독의 채널 비활성화
   */
  const disableChannel = async (subscriptionId: string, channel: string) => {
    const subscription = subscriptions.find((s) => s.id === subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updatedChannels = subscription.enabledChannels.filter(
      (c) => c !== channel
    );

    await updateMutation.mutateAsync({
      id: subscriptionId,
      settings: { enabledChannels: updatedChannels },
    });
  };

  /**
   * 조용한 시간 설정
   */
  const setQuietHours = async (
    subscriptionId: string,
    start: string,
    end: string
  ) => {
    await updateMutation.mutateAsync({
      id: subscriptionId,
      settings: {
        quietHoursStart: start,
        quietHoursEnd: end,
      },
    });
  };

  /**
   * 쿼리 강제 갱신
   */
  const refetch = async () => {
    await refetchQuery();
  };

  // ============================================================================
  // Return
  // ============================================================================

  return {
    subscriptions,
    isLoading,
    error: error as Error | null,
    updateSubscription: async (id: string, settings: Partial<AlertSubscription>) => {
      await updateMutation.mutateAsync({ id, settings });
    },
    createSubscription: async (subscription: Omit<AlertSubscription, 'id' | 'createdAt' | 'updatedAt'>) => {
      await createMutation.mutateAsync(subscription);
    },
    deleteSubscription: async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    enableChannel,
    disableChannel,
    setQuietHours,
    refetch,
  };
}

// ============================================================================
// Helper Functions (Export)
// ============================================================================

/**
 * 토픽 타입에 따른 라벨 반환
 */
export function getTopicTypeLabel(
  topicType: 'service' | 'severity' | 'event_type'
): string {
  switch (topicType) {
    case 'service':
      return '서비스';
    case 'severity':
      return '심각도';
    case 'event_type':
      return '이벤트 타입';
    default:
      return '알 수 없음';
  }
}

/**
 * 채널에 따른 라벨 반환
 */
export function getChannelLabel(channel: 'in_app' | 'email'): string {
  switch (channel) {
    case 'in_app':
      return '인앱';
    case 'email':
      return '이메일';
    default:
      return '알 수 없음';
  }
}

/**
 * 조용한 시간 체크
 */
export function isInQuietHours(
  quietHoursStart?: string,
  quietHoursEnd?: string,
  currentTime: Date = new Date()
): boolean {
  if (!quietHoursStart || !quietHoursEnd) return false;

  const [startHour, startMin] = quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = quietHoursEnd.split(':').map(Number);

  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();

  const currentMinutes = currentHour * 60 + currentMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // 자정을 넘는 경우 처리
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
