/**
 * useRealtimeEventStream Hook
 *
 * Workers WebSocket을 통한 service_events, service_issues 실시간 구독 훅
 * 필터링, 읽지 않은 항목 카운트, 메모리 제한 기능을 제공합니다.
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 * @module hooks/useRealtimeEventStream
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import type {
  ServiceEvent,
  ServiceIssue,
  ServiceId,
  EventType,
  IssueSeverity,
} from '@/types/services/central-hub.types';
import { serviceEventKeys } from '@/hooks/services/useServiceEvents';
import { serviceIssueKeys } from '@/hooks/services/useServiceIssues';
import type { ConnectionStatus, ConnectionState } from '@/hooks/realtime/useRealtimeServiceStatus';

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
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
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

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setChannelStates({ events: 'disconnected', issues: 'disconnected' });
  }, []);

  // WebSocket 연결 (이벤트 + 이슈 통합)
  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setChannelStates({ events: 'connecting', issues: 'connecting' });

    // Workers WebSocket 연결
    const ws = realtimeApi.connect('event-stream', user?.id);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[EventStream] WebSocket 연결됨');

      // 구독 요청 (이벤트 + 이슈)
      const channels: string[] = [];
      if (filters.enableEvents) channels.push('service_events');
      if (filters.enableIssues) channels.push('service_issues');

      ws.send(JSON.stringify({
        type: 'subscribe',
        channels,
        filters: {
          serviceFilter: filters.serviceFilter,
          severityFilter: filters.severityFilter,
          eventTypeFilter: filters.eventTypeFilter,
        },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 연결 확인 응답
        if (data.type === 'subscribed') {
          if (filters.enableEvents) {
            setChannelStates((prev) => ({ ...prev, events: 'connected' }));
          }
          if (filters.enableIssues) {
            setChannelStates((prev) => ({ ...prev, issues: 'connected' }));
          }
          return;
        }

        // 이벤트 수신
        if (data.type === 'service_event') {
          const event = data.payload as ServiceEvent;

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

        // 이슈 수신
        if (data.type === 'service_issue') {
          const issue = data.payload as ServiceIssue;
          const eventType = data.eventType;

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
      } catch (e) {
        console.error('[EventStream] WebSocket 메시지 파싱 에러:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('[EventStream] WebSocket 에러:', error);
      setChannelStates({ events: 'error', issues: 'error' });
      updateConnectionState({
        error: new Error('WebSocket 연결 오류'),
      });
    };

    ws.onclose = () => {
      console.log('[EventStream] WebSocket 연결 종료');
      setChannelStates({ events: 'disconnected', issues: 'disconnected' });
    };
  }, [
    user?.id,
    filters.enableEvents,
    filters.enableIssues,
    filters.serviceFilter,
    filters.severityFilter,
    filters.eventTypeFilter,
    matchesEventFilter,
    matchesIssueFilter,
    addItem,
    queryClient,
    updateConnectionState,
  ]);

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

  // 필터 변경 시 재연결
  useEffect(() => {
    // enableEvents 또는 enableIssues 변경 시 재연결
    if (wsRef.current && (filters.enableEvents || filters.enableIssues)) {
      // 구독 업데이트 요청
      const channels: string[] = [];
      if (filters.enableEvents) channels.push('service_events');
      if (filters.enableIssues) channels.push('service_issues');

      wsRef.current.send(JSON.stringify({
        type: 'update_subscription',
        channels,
        filters: {
          serviceFilter: filters.serviceFilter,
          severityFilter: filters.severityFilter,
          eventTypeFilter: filters.eventTypeFilter,
        },
      }));
    }
  }, [
    filters.enableEvents,
    filters.enableIssues,
    filters.serviceFilter,
    filters.severityFilter,
    filters.eventTypeFilter,
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
