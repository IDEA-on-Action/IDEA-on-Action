/**
 * useRealtimeServiceStatus Hook
 *
 * Workers WebSocket을 활용한 서비스 상태 실시간 동기화 훅
 * service_health 테이블 변경을 실시간으로 감지하고 연결 상태를 관리합니다.
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 * @module hooks/useRealtimeServiceStatus
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import type { ServiceHealth, ServiceId, HealthStatus } from '@/types/central-hub.types';
import { serviceHealthKeys } from '@/hooks/useServiceHealth';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 연결 상태
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * 연결 상태 정보
 */
export interface ConnectionState {
  status: ConnectionStatus;
  error: Error | null;
  lastConnectedAt: Date | null;
  reconnectAttempts: number;
}

/**
 * 서비스 상태 변경 이벤트
 */
export interface ServiceStatusChange {
  serviceId: ServiceId;
  previousStatus: HealthStatus | null;
  currentStatus: HealthStatus;
  timestamp: Date;
}

/**
 * useRealtimeServiceStatus 옵션
 */
export interface UseRealtimeServiceStatusOptions {
  /** 특정 서비스만 구독 (미지정시 전체) */
  serviceId?: ServiceId;
  /** 자동 재연결 활성화 (기본: true) */
  autoReconnect?: boolean;
  /** 최대 재연결 시도 횟수 (기본: 5) */
  maxReconnectAttempts?: number;
  /** 재연결 간격 (ms, 기본: 3000) */
  reconnectInterval?: number;
  /** 상태 변경 콜백 */
  onStatusChange?: (change: ServiceStatusChange) => void;
  /** 연결 상태 변경 콜백 */
  onConnectionChange?: (state: ConnectionState) => void;
}

/**
 * useRealtimeServiceStatus 반환값
 */
export interface UseRealtimeServiceStatusReturn {
  /** 현재 연결 상태 */
  connectionState: ConnectionState;
  /** 연결 여부 */
  isConnected: boolean;
  /** 마지막 수신한 서비스 상태 */
  lastStatus: ServiceHealth | null;
  /** 상태 변경 히스토리 (최근 10개) */
  statusHistory: ServiceStatusChange[];
  /** 수동 재연결 */
  reconnect: () => void;
  /** 연결 해제 */
  disconnect: () => void;
}

// ============================================================================
// 상수
// ============================================================================

const DEFAULT_OPTIONS: Required<Omit<UseRealtimeServiceStatusOptions, 'serviceId' | 'onStatusChange' | 'onConnectionChange'>> = {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 3000,
};

const MAX_STATUS_HISTORY = 10;

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * 서비스 상태 실시간 구독 훅
 *
 * @example
 * ```tsx
 * // 전체 서비스 구독
 * const { connectionState, isConnected, lastStatus } = useRealtimeServiceStatus();
 *
 * // 특정 서비스만 구독
 * const { connectionState, isConnected } = useRealtimeServiceStatus({
 *   serviceId: 'minu-build',
 *   onStatusChange: (change) => {
 *     console.log(`${change.serviceId} 상태 변경: ${change.currentStatus}`);
 *   },
 * });
 * ```
 */
export function useRealtimeServiceStatus(
  options: UseRealtimeServiceStatusOptions = {}
): UseRealtimeServiceStatusReturn {
  const {
    serviceId,
    autoReconnect = DEFAULT_OPTIONS.autoReconnect,
    maxReconnectAttempts = DEFAULT_OPTIONS.maxReconnectAttempts,
    reconnectInterval = DEFAULT_OPTIONS.reconnectInterval,
    onStatusChange,
    onConnectionChange,
  } = options;

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousStatusRef = useRef<Map<ServiceId, HealthStatus>>(new Map());

  // 상태 관리
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    error: null,
    lastConnectedAt: null,
    reconnectAttempts: 0,
  });
  const [lastStatus, setLastStatus] = useState<ServiceHealth | null>(null);
  const [statusHistory, setStatusHistory] = useState<ServiceStatusChange[]>([]);

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

  // 상태 히스토리 추가 헬퍼
  const addStatusHistory = useCallback(
    (change: ServiceStatusChange) => {
      setStatusHistory((prev) => {
        const newHistory = [change, ...prev].slice(0, MAX_STATUS_HISTORY);
        return newHistory;
      });
      onStatusChange?.(change);
    },
    [onStatusChange]
  );

  // 채널 연결 해제
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    updateConnectionState({
      status: 'disconnected',
      error: null,
    });
  }, [updateConnectionState]);

  // WebSocket 연결
  const connect = useCallback(() => {
    // 기존 연결 정리
    if (wsRef.current) {
      wsRef.current.close();
    }

    updateConnectionState({ status: 'connecting' });

    // 채널 이름 생성
    const roomId = serviceId
      ? `service-status-${serviceId}`
      : 'service-status-all';

    // Workers WebSocket 연결
    const ws = realtimeApi.connect(roomId, user?.id);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[ServiceStatus] WebSocket 연결됨');
      // 서비스 상태 구독 요청
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'service_health',
        filter: serviceId || undefined,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 구독 확인 응답
        if (data.type === 'subscribed') {
          updateConnectionState({
            status: 'connected',
            error: null,
            lastConnectedAt: new Date(),
            reconnectAttempts: 0,
          });
          return;
        }

        // 서비스 상태 업데이트
        if (data.type === 'service_health_update') {
          const newStatus = data.payload as ServiceHealth;
          const currentServiceId = newStatus.service_id as ServiceId;

          // 이전 상태 조회
          const previousStatus = previousStatusRef.current.get(currentServiceId) ?? null;

          // 상태 변경 감지
          if (previousStatus !== newStatus.status) {
            const change: ServiceStatusChange = {
              serviceId: currentServiceId,
              previousStatus,
              currentStatus: newStatus.status,
              timestamp: new Date(),
            };
            addStatusHistory(change);
          }

          // 이전 상태 업데이트
          previousStatusRef.current.set(currentServiceId, newStatus.status);

          // 마지막 상태 업데이트
          setLastStatus(newStatus);

          // React Query 캐시 무효화
          queryClient.invalidateQueries({
            queryKey: serviceHealthKeys.all,
          });

          if (currentServiceId) {
            queryClient.invalidateQueries({
              queryKey: serviceHealthKeys.byService(currentServiceId),
            });
          }
        }
      } catch (e) {
        console.error('[ServiceStatus] WebSocket 메시지 파싱 에러:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('[ServiceStatus] WebSocket 에러:', error);
      updateConnectionState({
        status: 'error',
        error: new Error('WebSocket 연결 오류'),
      });

      // 자동 재연결
      if (autoReconnect) {
        setConnectionState((prev) => {
          if (prev.reconnectAttempts < maxReconnectAttempts) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectInterval);

            return {
              ...prev,
              reconnectAttempts: prev.reconnectAttempts + 1,
            };
          }
          return prev;
        });
      }
    };

    ws.onclose = () => {
      console.log('[ServiceStatus] WebSocket 연결 종료');
      updateConnectionState({ status: 'disconnected' });
    };
  }, [
    serviceId,
    user?.id,
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    queryClient,
    updateConnectionState,
    addStatusHistory,
  ]);

  // 수동 재연결
  const reconnect = useCallback(() => {
    updateConnectionState({ reconnectAttempts: 0 });
    connect();
  }, [connect, updateConnectionState]);

  // 마운트 시 연결, 언마운트 시 해제
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  return {
    connectionState,
    isConnected: connectionState.status === 'connected',
    lastStatus,
    statusHistory,
    reconnect,
    disconnect,
  };
}

// ============================================================================
// 헬퍼 훅
// ============================================================================

/**
 * 연결 상태 표시용 훅
 *
 * @example
 * ```tsx
 * const { statusText, statusColor, StatusIcon } = useConnectionStatusDisplay();
 * ```
 */
export function useConnectionStatusDisplay(connectionState: ConnectionState) {
  const getStatusText = (): string => {
    switch (connectionState.status) {
      case 'connecting':
        return '연결 중...';
      case 'connected':
        return '연결됨';
      case 'disconnected':
        return '연결 끊김';
      case 'error':
        return connectionState.reconnectAttempts > 0
          ? `재연결 시도 중 (${connectionState.reconnectAttempts}회)`
          : '연결 오류';
      default:
        return '알 수 없음';
    }
  };

  const getStatusColor = (): string => {
    switch (connectionState.status) {
      case 'connecting':
        return 'text-yellow-500';
      case 'connected':
        return 'text-green-500';
      case 'disconnected':
        return 'text-gray-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBgColor = (): string => {
    switch (connectionState.status) {
      case 'connecting':
        return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'connected':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'disconnected':
        return 'bg-gray-100 dark:bg-gray-900/30';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/30';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30';
    }
  };

  return {
    statusText: getStatusText(),
    statusColor: getStatusColor(),
    statusBgColor: getStatusBgColor(),
    isReconnecting: connectionState.status === 'error' && connectionState.reconnectAttempts > 0,
  };
}

export default useRealtimeServiceStatus;
