/**
 * useRealtimeEventStream Hook
 *
 * service_events, service_issues 테이블의 실시간 구독 훅
 * 필터링, 읽지 않은 항목 카운트, 메모리 제한 기능을 제공합니다.
 *
 * @module hooks/useRealtimeEventStream
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type {
  ServiceEvent,
  ServiceIssue,
  ServiceId,
  EventType,
  IssueSeverity,
} from '@/types/central-hub.types';
import { serviceEventKeys } from './useServiceEvents';
import { serviceIssueKeys } from './useServiceIssues';
import type { ConnectionStatus, ConnectionState } from './useRealtimeServiceStatus';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 스트림 항목 타입
 */
export type StreamItemType = 'event' | 'issue';

/**
 * 스트림 항목
 */
export interface StreamItem {
  id: string;
  type: StreamItemType;
  data: ServiceEvent | ServiceIssue;
  receivedAt: Date;
  isRead: boolean;
}

/**
 * 스트림 필터 옵션
 */
export interface StreamFilterOptions {
  /** 서비스 필터 */
  serviceFilter?: ServiceId[];
  /** 심각도 필터 (이슈만 적용) */
  severityFilter?: IssueSeverity[];
  /** 이벤트 타입 필터 (이벤트만 적용) */
  eventTypeFilter?: EventType[];
  /** 이벤트 스트림 활성화 (기본: true) */
  enableEvents?: boolean;
  /** 이슈 스트림 활성화 (기본: true) */
  enableIssues?: boolean;
}

/**
 * useRealtimeEventStream 옵션
 */
export interface UseRealtimeEventStreamOptions extends StreamFilterOptions {
  /** 최대 보관 항목 수 (기본: 100) */
  maxItems?: number;
  /** 자동 재연결 활성화 (기본: true) */
  autoReconnect?: boolean;
  /** 새 항목 수신 콜백 */
  onNewItem?: (item: StreamItem) => void;
  /** 연결 상태 변경 콜백 */
  onConnectionChange?: (state: ConnectionState) => void;
}

/**
 * useRealtimeEventStream 반환값
 */
export interface UseRealtimeEventStreamReturn {
  /** 스트림 항목 목록 */
  items: StreamItem[];
  /** 필터링된 항목 목록 */
  filteredItems: StreamItem[];
  /** 읽지 않은 항목 수 */
  unreadCount: number;
  /** 연결 상태 */
  connectionState: ConnectionState;
  /** 연결 여부 */
  isConnected: boolean;
  /** 항목을 읽음으로 표시 */
  markAsRead: (itemId: string) => void;
  /** 모든 항목을 읽음으로 표시 */
  markAllAsRead: () => void;
  /** 스트림 초기화 */
  clearStream: () => void;
  /** 수동 재연결 */
  reconnect: () => void;
  /** 연결 해제 */
  disconnect: () => void;
  /** 필터 업데이트 */
  updateFilters: (filters: Partial<StreamFilterOptions>) => void;
}

// ============================================================================
// 상수
// ============================================================================

const DEFAULT_MAX_ITEMS = 100;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000;

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * 이벤트/이슈 실시간 스트림 훅
 *
 * @example
 * ```tsx
 * const {
 *   items,
 *   filteredItems,
 *   unreadCount,
 *   isConnected,
 *   markAsRead,
 *   markAllAsRead,
 * } = useRealtimeEventStream({
 *   serviceFilter: ['minu-build'],
 *   severityFilter: ['critical', 'high'],
 *   onNewItem: (item) => {
 *     if (item.type === 'issue') {
 *       showNotification('새 이슈 발생');
 *     }
 *   },
 * });
 * ```
 */
export function useRealtimeEventStream(
  options: UseRealtimeEventStreamOptions = {}
): UseRealtimeEventStreamReturn {
  const {
    maxItems = DEFAULT_MAX_ITEMS,
    autoReconnect = true,
    onNewItem,
    onConnectionChange,
    ...initialFilters
  } = options;

  const queryClient = useQueryClient();
  const eventChannelRef = useRef<RealtimeChannel | null>(null);
  const issueChannelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 상태 관리
  const [items, setItems] = useState<StreamItem[]>([]);
  const [filters, setFilters] = useState<StreamFilterOptions>({
    enableEvents: true,
    enableIssues: true,
    ...initialFilters,
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    error: null,
    lastConnectedAt: null,
    reconnectAttempts: 0,
  });

  // 연결 상태 추적 (이벤트와 이슈 채널 모두)
  const [channelStates, setChannelStates] = useState<{
    events: ConnectionStatus;
    issues: ConnectionStatus;
  }>({
    events: 'disconnected',
    issues: 'disconnected',
  });

  // 연결 상태 업데이트 헬퍼
  const updateConnectionState = useCallback(
    (updates: Partial<ConnectionState>) => {
      setConnectionState((prev) => {
        const newState = { ...prev, ...updates };
        onConnectionChange?.(newState);
        return newState;
      });
    },
    [onConnectionChange]
  );

  // 채널 상태에 따른 전체 연결 상태 계산
  useEffect(() => {
    const { events, issues } = channelStates;
    const enableEvents = filters.enableEvents !== false;
    const enableIssues = filters.enableIssues !== false;

    // 활성화된 채널들의 상태 확인
    const activeStatuses: ConnectionStatus[] = [];
    if (enableEvents) activeStatuses.push(events);
    if (enableIssues) activeStatuses.push(issues);

    if (activeStatuses.length === 0) {
      updateConnectionState({ status: 'disconnected' });
      return;
    }

    // 모든 채널이 연결되면 connected
    if (activeStatuses.every((s) => s === 'connected')) {
      updateConnectionState({
        status: 'connected',
        lastConnectedAt: new Date(),
        reconnectAttempts: 0,
        error: null,
      });
    }
    // 하나라도 에러면 error
    else if (activeStatuses.some((s) => s === 'error')) {
      updateConnectionState({ status: 'error' });
    }
    // 하나라도 connecting이면 connecting
    else if (activeStatuses.some((s) => s === 'connecting')) {
      updateConnectionState({ status: 'connecting' });
    }
    // 나머지는 disconnected
    else {
      updateConnectionState({ status: 'disconnected' });
    }
  }, [channelStates, filters.enableEvents, filters.enableIssues, updateConnectionState]);

  // 항목 추가 헬퍼 (메모리 제한 적용)
  const addItem = useCallback(
    (newItem: StreamItem) => {
      setItems((prev) => {
        // 중복 체크
        if (prev.some((item) => item.id === newItem.id)) {
          return prev;
        }

        // 새 항목을 맨 앞에 추가하고 최대 개수 유지
        const updated = [newItem, ...prev].slice(0, maxItems);
        return updated;
      });

      onNewItem?.(newItem);
    },
    [maxItems, onNewItem]
  );

  // 이벤트 필터 매칭 확인
  const matchesEventFilter = useCallback(
    (event: ServiceEvent): boolean => {
      // 서비스 필터
      if (
        filters.serviceFilter?.length &&
        !filters.serviceFilter.includes(event.service_id)
      ) {
        return false;
      }

      // 이벤트 타입 필터
      if (
        filters.eventTypeFilter?.length &&
        !filters.eventTypeFilter.includes(event.event_type)
      ) {
        return false;
      }

      return true;
    },
    [filters.serviceFilter, filters.eventTypeFilter]
  );

  // 이슈 필터 매칭 확인
  const matchesIssueFilter = useCallback(
    (issue: ServiceIssue): boolean => {
      // 서비스 필터
      if (
        filters.serviceFilter?.length &&
        !filters.serviceFilter.includes(issue.service_id)
      ) {
        return false;
      }

      // 심각도 필터
      if (
        filters.severityFilter?.length &&
        !filters.severityFilter.includes(issue.severity)
      ) {
        return false;
      }

      return true;
    },
    [filters.serviceFilter, filters.severityFilter]
  );

  // 연결 해제
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventChannelRef.current) {
      supabase.removeChannel(eventChannelRef.current);
      eventChannelRef.current = null;
    }

    if (issueChannelRef.current) {
      supabase.removeChannel(issueChannelRef.current);
      issueChannelRef.current = null;
    }

    setChannelStates({ events: 'disconnected', issues: 'disconnected' });
  }, []);

  // 이벤트 채널 연결
  const connectEventChannel = useCallback(() => {
    if (!filters.enableEvents) return;

    if (eventChannelRef.current) {
      supabase.removeChannel(eventChannelRef.current);
    }

    setChannelStates((prev) => ({ ...prev, events: 'connecting' }));

    const channel = supabase
      .channel('realtime-event-stream-events')
      .on<ServiceEvent>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_events',
        },
        (payload) => {
          const event = payload.new as ServiceEvent;

          if (matchesEventFilter(event)) {
            const streamItem: StreamItem = {
              id: `event-${event.id}`,
              type: 'event',
              data: event,
              receivedAt: new Date(),
              isRead: false,
            };
            addItem(streamItem);
          }

          // React Query 캐시 무효화
          queryClient.invalidateQueries({
            queryKey: serviceEventKeys.all,
          });
        }
      )
      .subscribe((status, err) => {
        switch (status) {
          case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
            setChannelStates((prev) => ({ ...prev, events: 'connected' }));
            break;
          case REALTIME_SUBSCRIBE_STATES.CLOSED:
            setChannelStates((prev) => ({ ...prev, events: 'disconnected' }));
            break;
          case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
          case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
            setChannelStates((prev) => ({ ...prev, events: 'error' }));
            updateConnectionState({
              error: err ? new Error(String(err)) : new Error('이벤트 채널 에러'),
            });
            break;
        }
      });

    eventChannelRef.current = channel;
  }, [filters.enableEvents, matchesEventFilter, addItem, queryClient, updateConnectionState]);

  // 이슈 채널 연결
  const connectIssueChannel = useCallback(() => {
    if (!filters.enableIssues) return;

    if (issueChannelRef.current) {
      supabase.removeChannel(issueChannelRef.current);
    }

    setChannelStates((prev) => ({ ...prev, issues: 'connecting' }));

    const channel = supabase
      .channel('realtime-event-stream-issues')
      .on<ServiceIssue>(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두
          schema: 'public',
          table: 'service_issues',
        },
        (payload) => {
          const issue = payload.new as ServiceIssue;
          const eventType = payload.eventType;

          // INSERT 또는 UPDATE 시에만 스트림에 추가
          if ((eventType === 'INSERT' || eventType === 'UPDATE') && matchesIssueFilter(issue)) {
            const streamItem: StreamItem = {
              id: `issue-${issue.id}-${eventType}-${Date.now()}`,
              type: 'issue',
              data: issue,
              receivedAt: new Date(),
              isRead: false,
            };
            addItem(streamItem);
          }

          // React Query 캐시 무효화
          queryClient.invalidateQueries({
            queryKey: serviceIssueKeys.all,
          });
        }
      )
      .subscribe((status, err) => {
        switch (status) {
          case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
            setChannelStates((prev) => ({ ...prev, issues: 'connected' }));
            break;
          case REALTIME_SUBSCRIBE_STATES.CLOSED:
            setChannelStates((prev) => ({ ...prev, issues: 'disconnected' }));
            break;
          case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
          case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
            setChannelStates((prev) => ({ ...prev, issues: 'error' }));
            updateConnectionState({
              error: err ? new Error(String(err)) : new Error('이슈 채널 에러'),
            });
            break;
        }
      });

    issueChannelRef.current = channel;
  }, [filters.enableIssues, matchesIssueFilter, addItem, queryClient, updateConnectionState]);

  // 전체 연결
  const connect = useCallback(() => {
    connectEventChannel();
    connectIssueChannel();
  }, [connectEventChannel, connectIssueChannel]);

  // 재연결 로직
  useEffect(() => {
    if (
      autoReconnect &&
      connectionState.status === 'error' &&
      connectionState.reconnectAttempts < MAX_RECONNECT_ATTEMPTS
    ) {
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionState((prev) => ({
          ...prev,
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));
        connect();
      }, RECONNECT_INTERVAL);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoReconnect, connectionState.status, connectionState.reconnectAttempts, connect]);

  // 수동 재연결
  const reconnect = useCallback(() => {
    setConnectionState((prev) => ({ ...prev, reconnectAttempts: 0 }));
    connect();
  }, [connect]);

  // 항목 읽음 표시
  const markAsRead = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isRead: true } : item
      )
    );
  }, []);

  // 모든 항목 읽음 표시
  const markAllAsRead = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
  }, []);

  // 스트림 초기화
  const clearStream = useCallback(() => {
    setItems([]);
  }, []);

  // 필터 업데이트
  const updateFilters = useCallback((newFilters: Partial<StreamFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // 필터링된 항목 (메모이제이션)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.type === 'event') {
        return matchesEventFilter(item.data as ServiceEvent);
      } else {
        return matchesIssueFilter(item.data as ServiceIssue);
      }
    });
  }, [items, matchesEventFilter, matchesIssueFilter]);

  // 읽지 않은 항목 수
  const unreadCount = useMemo(() => {
    return filteredItems.filter((item) => !item.isRead).length;
  }, [filteredItems]);

  // 마운트 시 연결
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 필터 변경 시 채널 재연결
  useEffect(() => {
    // enableEvents 또는 enableIssues 변경 시 해당 채널 재연결
    if (filters.enableEvents && channelStates.events === 'disconnected') {
      connectEventChannel();
    } else if (!filters.enableEvents && eventChannelRef.current) {
      supabase.removeChannel(eventChannelRef.current);
      eventChannelRef.current = null;
      setChannelStates((prev) => ({ ...prev, events: 'disconnected' }));
    }

    if (filters.enableIssues && channelStates.issues === 'disconnected') {
      connectIssueChannel();
    } else if (!filters.enableIssues && issueChannelRef.current) {
      supabase.removeChannel(issueChannelRef.current);
      issueChannelRef.current = null;
      setChannelStates((prev) => ({ ...prev, issues: 'disconnected' }));
    }
  }, [
    filters.enableEvents,
    filters.enableIssues,
    channelStates.events,
    channelStates.issues,
    connectEventChannel,
    connectIssueChannel,
  ]);

  return {
    items,
    filteredItems,
    unreadCount,
    connectionState,
    isConnected: connectionState.status === 'connected',
    markAsRead,
    markAllAsRead,
    clearStream,
    reconnect,
    disconnect,
    updateFilters,
  };
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 스트림 항목에서 이벤트 데이터 추출
 */
export function getEventFromStreamItem(item: StreamItem): ServiceEvent | null {
  if (item.type === 'event') {
    return item.data as ServiceEvent;
  }
  return null;
}

/**
 * 스트림 항목에서 이슈 데이터 추출
 */
export function getIssueFromStreamItem(item: StreamItem): ServiceIssue | null {
  if (item.type === 'issue') {
    return item.data as ServiceIssue;
  }
  return null;
}

/**
 * 스트림 항목 시간순 정렬 (최신순)
 */
export function sortStreamItemsByTime(items: StreamItem[]): StreamItem[] {
  return [...items].sort(
    (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime()
  );
}

/**
 * 스트림 항목 그룹화 (타입별)
 */
export function groupStreamItemsByType(items: StreamItem[]): {
  events: StreamItem[];
  issues: StreamItem[];
} {
  return items.reduce(
    (acc, item) => {
      if (item.type === 'event') {
        acc.events.push(item);
      } else {
        acc.issues.push(item);
      }
      return acc;
    },
    { events: [] as StreamItem[], issues: [] as StreamItem[] }
  );
}

export default useRealtimeEventStream;
