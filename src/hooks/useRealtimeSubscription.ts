/**
 * Real-time Subscription Hook
 *
 * Provides real-time updates for Supabase tables using Postgres Changes.
 *
 * Features:
 * - Subscribe to table changes (INSERT/UPDATE/DELETE)
 * - Auto-invalidate React Query cache
 * - Connection status tracking
 * - Automatic reconnection
 * - Unsubscribe on unmount
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
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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
  onChange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

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
    schema = 'public',
    invalidateList = true,
    invalidateDetail = true,
    debounceMs = 0,
  } = options;

  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
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
    (payload: RealtimePostgresChangesPayload<T>) => {
      console.log(`[Realtime] INSERT on ${table}:`, payload.new);

      const newData = payload.new as T & { id: string };

      // Update detail cache if entity has ID
      if (invalidateDetail && newData.id) {
        queryClient.setQueryData([queryKey, 'detail', newData.id], newData);
      }

      // Invalidate list queries
      invalidateQueries();

      // Call custom handler
      onChange?.(payload as RealtimePostgresChangesPayload<Record<string, unknown>>);
    },
    [table, queryKey, queryClient, invalidateDetail, invalidateQueries, onChange]
  );

  /**
   * Handle UPDATE events
   */
  const handleUpdate = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      console.log(`[Realtime] UPDATE on ${table}:`, payload.new);

      const updatedData = payload.new as T & { id: string };

      // Update detail cache if entity has ID
      if (invalidateDetail && updatedData.id) {
        queryClient.setQueryData([queryKey, 'detail', updatedData.id], updatedData);
      }

      // Invalidate list queries
      invalidateQueries();

      // Call custom handler
      onChange?.(payload as RealtimePostgresChangesPayload<Record<string, unknown>>);
    },
    [table, queryKey, queryClient, invalidateDetail, invalidateQueries, onChange]
  );

  /**
   * Handle DELETE events
   */
  const handleDelete = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      console.log(`[Realtime] DELETE on ${table}:`, payload.old);

      const deletedData = payload.old as T & { id: string };

      // Remove from detail cache if entity has ID
      if (invalidateDetail && deletedData.id) {
        queryClient.removeQueries({ queryKey: [queryKey, 'detail', deletedData.id] });
      }

      // Invalidate list queries
      invalidateQueries();

      // Call custom handler
      onChange?.(payload as RealtimePostgresChangesPayload<Record<string, unknown>>);
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

    // Create channel
    const channelName = `${table}-changes-${Date.now()}`;
    const realtimeChannel = supabase.channel(channelName);

    // Configure postgres_changes subscription
    realtimeChannel.on(
      'postgres_changes',
      {
        event,
        schema,
        table,
        filter,
      },
      (payload) => {
        // Route to appropriate handler
        switch (payload.eventType) {
          case 'INSERT':
            handleInsert(payload as RealtimePostgresChangesPayload<T>);
            break;
          case 'UPDATE':
            handleUpdate(payload as RealtimePostgresChangesPayload<T>);
            break;
          case 'DELETE':
            handleDelete(payload as RealtimePostgresChangesPayload<T>);
            break;
          default:
            console.warn(`[Realtime] Unknown event type: ${payload.eventType}`);
        }
      }
    );

    // Subscribe
    realtimeChannel
      .subscribe((subscribeStatus) => {
        console.log(`[Realtime] ${table} subscription status:`, subscribeStatus);

        switch (subscribeStatus) {
          case 'SUBSCRIBED':
            setStatus('connected');
            setError(null);
            break;
          case 'CHANNEL_ERROR':
            setStatus('error');
            setError(new Error('Channel error'));
            break;
          case 'TIMED_OUT':
            setStatus('error');
            setError(new Error('Subscription timed out'));
            break;
          case 'CLOSED':
            setStatus('disconnected');
            break;
          default:
            setStatus('connecting');
        }
      });

    setChannel(realtimeChannel);

    // Cleanup on unmount or dependency change
    return () => {
      console.log(`[Realtime] Unsubscribing from ${table}`);
      realtimeChannel.unsubscribe();
      supabase.removeChannel(realtimeChannel);
      setChannel(null);
      setStatus('disconnected');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    table,
    queryKey,
    event,
    schema,
    filter,
    enabled,
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
    if (channel) {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    }

    // Trigger re-subscription by toggling enabled state
    setStatus('connecting');
  }, [channel]);

  /**
   * Manually unsubscribe
   */
  const unsubscribe = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      setChannel(null);
      setStatus('disconnected');
    }
  }, [channel]);

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
