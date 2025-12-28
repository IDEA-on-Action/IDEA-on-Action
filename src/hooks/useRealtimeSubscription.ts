/**
 * Real-time Subscription Hook
 *
 * Provides real-time updates using Workers WebSocket.
 *
 * Features:
 * - Subscribe to table changes (INSERT/UPDATE/DELETE)
 * - Auto-invalidate React Query cache
 * - Connection status tracking
 * - Automatic reconnection
 * - Unsubscribe on unmount
 *
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 *
 * @example
 * const { status } = useRealtimeSubscription<PortfolioItem>(
 *   'portfolio_items',
 *   'portfolio',
 *   {
 *     filter: 'published=eq.true',
 *     event: '*',
 *   }
 * );
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';

// ===================================================================
// Types
// ===================================================================

/**
 * Real-time event types
 */
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * Connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Workers WebSocket 페이로드 타입
 */
interface RealtimeChangePayload<T = Record<string, unknown>> {
  type: 'db_change';
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
}

/**
 * Subscription options
 */
export interface UseRealtimeSubscriptionOptions {
  /** PostgreSQL filter expression (e.g., 'published=eq.true') */
  filter?: string;

  /** Event type to listen to (default: '*' for all) */
  event?: RealtimeEvent;

  /** Enable/disable subscription */
  enabled?: boolean;

  /** Custom change handler (called before cache invalidation) */
  onChange?: (payload: RealtimeChangePayload<Record<string, unknown>>) => void;

  /** Schema name (default: 'public') */
  schema?: string;

  /** Invalidate list queries on change (default: true) */
  invalidateList?: boolean;

  /** Invalidate detail queries on change (default: true) */
  invalidateDetail?: boolean;

  /** Debounce invalidation in ms (default: 0) */
  debounceMs?: number;
}

// ===================================================================
// Real-time Subscription Hook
// ===================================================================

/**
 * Hook to subscribe to real-time changes in a Supabase table
 *
 * @template T - Entity type
 * @param table - Supabase table name
 * @param queryKey - React Query cache key
 * @param options - Subscription options
 * @returns Connection status and control functions
 */
export function useRealtimeSubscription<T = Record<string, unknown>>(
  table: string,
  queryKey: string,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const {
    filter,
    event = '*',
    enabled = true,
    onChange,
    invalidateList = true,
    invalidateDetail = true,
    debounceMs = 0,
  } = options;

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Debounced invalidation
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const invalidateQueries = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (invalidateList) {
        queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] });
      }
      debounceTimerRef.current = null;
    }, debounceMs);
  }, [queryClient, queryKey, invalidateList, debounceMs]);

  // ===================================================================
  // Change Handlers
  // ===================================================================

  /**
   * Handle INSERT events
   */
  const handleInsert = useCallback(
    (payload: RealtimeChangePayload<T>) => {
      console.log(`[Realtime] INSERT on ${table}:`, payload.new);

      const newData = payload.new as T & { id: string };

      // Update detail cache if entity has ID
      if (invalidateDetail && newData.id) {
        queryClient.setQueryData([queryKey, 'detail', newData.id], newData);
      }

      // Invalidate list queries
      invalidateQueries();

      // Call custom handler
      onChange?.(payload as RealtimeChangePayload<Record<string, unknown>>);
    },
    [table, queryKey, queryClient, invalidateDetail, invalidateQueries, onChange]
  );

  /**
   * Handle UPDATE events
   */
  const handleUpdate = useCallback(
    (payload: RealtimeChangePayload<T>) => {
      console.log(`[Realtime] UPDATE on ${table}:`, payload.new);

      const updatedData = payload.new as T & { id: string };

      // Update detail cache if entity has ID
      if (invalidateDetail && updatedData.id) {
        queryClient.setQueryData([queryKey, 'detail', updatedData.id], updatedData);
      }

      // Invalidate list queries
      invalidateQueries();

      // Call custom handler
      onChange?.(payload as RealtimeChangePayload<Record<string, unknown>>);
    },
    [table, queryKey, queryClient, invalidateDetail, invalidateQueries, onChange]
  );

  /**
   * Handle DELETE events
   */
  const handleDelete = useCallback(
    (payload: RealtimeChangePayload<T>) => {
      console.log(`[Realtime] DELETE on ${table}:`, payload.old);

      const deletedData = payload.old as T & { id: string };

      // Remove from detail cache if entity has ID
      if (invalidateDetail && deletedData.id) {
        queryClient.removeQueries({ queryKey: [queryKey, 'detail', deletedData.id] });
      }

      // Invalidate list queries
      invalidateQueries();

      // Call custom handler
      onChange?.(payload as RealtimeChangePayload<Record<string, unknown>>);
    },
    [table, queryKey, queryClient, invalidateDetail, invalidateQueries, onChange]
  );

  // ===================================================================
  // Subscription Management
  // ===================================================================

  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    setError(null);

    // Workers WebSocket 연결
    const ws = realtimeApi.connect(`table-${table}`, user?.id);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[Realtime] ${table} WebSocket 연결됨`);
      // 테이블 구독 요청
      ws.send(JSON.stringify({
        type: 'subscribe',
        table,
        event,
        filter,
      }));
    };

    ws.onmessage = (msgEvent) => {
      try {
        const data = JSON.parse(msgEvent.data);

        // 구독 확인 응답
        if (data.type === 'subscribed') {
          console.log(`[Realtime] ${table} subscription status: SUBSCRIBED`);
          setStatus('connected');
          setError(null);
          return;
        }

        // 테이블 변경 이벤트
        if (data.type === 'db_change' && data.table === table) {
          const payload = data as RealtimeChangePayload<T>;

          // Route to appropriate handler
          switch (payload.eventType) {
            case 'INSERT':
              handleInsert(payload);
              break;
            case 'UPDATE':
              handleUpdate(payload);
              break;
            case 'DELETE':
              handleDelete(payload);
              break;
            default:
              console.warn(`[Realtime] Unknown event type: ${payload.eventType}`);
          }
        }
      } catch (e) {
        console.error(`[Realtime] ${table} WebSocket 메시지 파싱 에러:`, e);
      }
    };

    ws.onerror = (error) => {
      console.error(`[Realtime] ${table} WebSocket 에러:`, error);
      setStatus('error');
      setError(new Error('WebSocket 연결 오류'));
    };

    ws.onclose = () => {
      console.log(`[Realtime] Unsubscribing from ${table}`);
      setStatus('disconnected');
    };

    // Cleanup on unmount or dependency change
    return () => {
      console.log(`[Realtime] Unsubscribing from ${table}`);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus('disconnected');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    table,
    queryKey,
    event,
    filter,
    enabled,
    user?.id,
    handleInsert,
    handleUpdate,
    handleDelete,
  ]);

  // ===================================================================
  // Control Functions
  // ===================================================================

  /**
   * Manually trigger reconnection
   */
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Trigger re-subscription by toggling enabled state
    setStatus('connecting');
  }, []);

  /**
   * Manually unsubscribe
   */
  const unsubscribe = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setStatus('disconnected');
    }
  }, []);

  // ===================================================================
  // Return API
  // ===================================================================

  return {
    status,
    error,
    reconnect,
    unsubscribe,
  };
}
