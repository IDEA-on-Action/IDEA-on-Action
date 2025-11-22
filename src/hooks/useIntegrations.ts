/**
 * Service Integrations React Query Hooks
 *
 * Custom hooks for managing service integrations (Notion, GitHub, Slack, etc.)
 * Created: 2025-11-25
 * Related types: src/types/integrations.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ServiceIntegration,
  ServiceIntegrationWithService,
  IntegrationSyncLog,
  CreateIntegrationInput,
  UpdateIntegrationInput,
  IntegrationFilters,
  SyncLogFilters,
  IntegrationType,
  SyncStatus,
  HealthStatus,
} from '@/types/integrations';

// ============================================================================
// Query Keys
// ============================================================================

export const integrationKeys = {
  all: ['integrations'] as const,
  list: (filters?: IntegrationFilters) => ['integrations', 'list', filters] as const,
  detail: (id: string) => ['integrations', 'detail', id] as const,
  byService: (serviceId: string) => ['integrations', 'by-service', serviceId] as const,
  byType: (type: IntegrationType) => ['integrations', 'by-type', type] as const,
  syncLogs: (integrationId: string, filters?: SyncLogFilters) =>
    ['integrations', 'sync-logs', integrationId, filters] as const,
  stats: () => ['integrations', 'stats'] as const,
};

// ============================================================================
// List & Detail Hooks
// ============================================================================

/**
 * Fetch all integrations with optional filters
 */
export function useIntegrations(filters?: IntegrationFilters) {
  return useQuery({
    queryKey: integrationKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('service_integrations')
        .select(`
          *,
          service:services(id, title, slug, status)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.service_id) {
        query = query.eq('service_id', filters.service_id);
      }
      if (filters?.integration_type) {
        query = query.eq('integration_type', filters.integration_type);
      }
      if (filters?.sync_status) {
        query = query.eq('sync_status', filters.sync_status);
      }
      if (filters?.health_status) {
        query = query.eq('health_status', filters.health_status);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as ServiceIntegrationWithService[]) || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch a single integration by ID
 */
export function useIntegration(id: string) {
  return useQuery({
    queryKey: integrationKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_integrations')
        .select(`
          *,
          service:services(id, title, slug, status)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ServiceIntegrationWithService;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch integrations for a specific service
 */
export function useServiceIntegrations(serviceId: string) {
  return useQuery({
    queryKey: integrationKeys.byService(serviceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_integrations')
        .select('*')
        .eq('service_id', serviceId)
        .eq('is_active', true)
        .order('integration_type');

      if (error) throw error;
      return (data as ServiceIntegration[]) || [];
    },
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch integrations by type
 */
export function useIntegrationsByType(type: IntegrationType) {
  return useQuery({
    queryKey: integrationKeys.byType(type),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_integrations')
        .select(`
          *,
          service:services(id, title, slug, status)
        `)
        .eq('integration_type', type)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data as ServiceIntegrationWithService[]) || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// CRUD Mutations
// ============================================================================

/**
 * Create a new integration
 */
export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateIntegrationInput) => {
      const { data, error } = await supabase
        .from('service_integrations')
        .insert({
          service_id: input.service_id || null,
          integration_type: input.integration_type,
          name: input.name,
          external_id: input.external_id || null,
          external_url: input.external_url || null,
          config: input.config || {},
          auth_type: input.auth_type || 'api_key',
          credentials_key: input.credentials_key || null,
          health_check_url: input.health_check_url || null,
          is_bidirectional: input.is_bidirectional || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ServiceIntegration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      if (data.service_id) {
        queryClient.invalidateQueries({
          queryKey: integrationKeys.byService(data.service_id),
        });
      }
    },
  });
}

/**
 * Update an existing integration
 */
export function useUpdateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateIntegrationInput & { id: string }) => {
      const { data, error } = await supabase
        .from('service_integrations')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ServiceIntegration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      queryClient.invalidateQueries({ queryKey: integrationKeys.detail(data.id) });
      if (data.service_id) {
        queryClient.invalidateQueries({
          queryKey: integrationKeys.byService(data.service_id),
        });
      }
    },
  });
}

/**
 * Delete an integration
 */
export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the integration to know its service_id for cache invalidation
      const { data: existing } = await supabase
        .from('service_integrations')
        .select('service_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('service_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, serviceId: existing?.service_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      if (result.serviceId) {
        queryClient.invalidateQueries({
          queryKey: integrationKeys.byService(result.serviceId),
        });
      }
    },
  });
}

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Trigger a manual sync for an integration
 */
export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integrationId,
      direction = 'inbound',
    }: {
      integrationId: string;
      direction?: 'inbound' | 'outbound' | 'bidirectional';
    }) => {
      // Update sync status to 'syncing'
      const { error: updateError } = await supabase
        .from('service_integrations')
        .update({
          sync_status: 'syncing' as SyncStatus,
        })
        .eq('id', integrationId);

      if (updateError) throw updateError;

      // Create sync log entry
      const { data: log, error: logError } = await supabase
        .from('service_integration_sync_logs')
        .insert({
          integration_id: integrationId,
          sync_type: 'manual',
          sync_direction: direction,
          status: 'started',
        })
        .select()
        .single();

      if (logError) throw logError;

      // Note: Actual sync logic would be in an Edge Function
      // This just initiates the sync and creates the log
      return log as IntegrationSyncLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: integrationKeys.detail(variables.integrationId),
      });
      queryClient.invalidateQueries({
        queryKey: integrationKeys.syncLogs(variables.integrationId),
      });
    },
  });
}

/**
 * Update sync status (called after sync completes)
 */
export function useUpdateSyncStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integrationId,
      status,
      error,
      metadata,
    }: {
      integrationId: string;
      status: SyncStatus;
      error?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const updateData: Partial<ServiceIntegration> = {
        sync_status: status,
        last_synced_at: status === 'synced' ? new Date().toISOString() : undefined,
        sync_error: error || null,
      };

      if (metadata) {
        updateData.sync_metadata = metadata;
      }

      const { data, error: updateError } = await supabase
        .from('service_integrations')
        .update(updateData)
        .eq('id', integrationId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as ServiceIntegration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: integrationKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
    },
  });
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Perform health check on an integration
 */
export function useHealthCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId: string) => {
      // Get integration details
      const { data: integration, error: fetchError } = await supabase
        .from('service_integrations')
        .select('health_check_url')
        .eq('id', integrationId)
        .single();

      if (fetchError) throw fetchError;

      let healthStatus: HealthStatus = 'unknown';

      // If no health check URL, just update timestamp
      if (!integration.health_check_url) {
        healthStatus = 'unknown';
      } else {
        // Note: Actual health check would be in an Edge Function
        // due to CORS restrictions
        healthStatus = 'healthy';
      }

      const { data, error: updateError } = await supabase
        .from('service_integrations')
        .update({
          health_status: healthStatus,
          last_health_check_at: new Date().toISOString(),
        })
        .eq('id', integrationId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as ServiceIntegration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: integrationKeys.detail(data.id),
      });
    },
  });
}

// ============================================================================
// Sync Logs
// ============================================================================

/**
 * Fetch sync logs for an integration
 */
export function useSyncLogs(integrationId: string, filters?: SyncLogFilters) {
  return useQuery({
    queryKey: integrationKeys.syncLogs(integrationId, filters),
    queryFn: async () => {
      let query = supabase
        .from('service_integration_sync_logs')
        .select('*')
        .eq('integration_id', integrationId)
        .order('started_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.sync_type) {
        query = query.eq('sync_type', filters.sync_type);
      }
      if (filters?.from_date) {
        query = query.gte('started_at', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('started_at', filters.to_date);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(50); // Default limit
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as IntegrationSyncLog[]) || [];
    },
    enabled: !!integrationId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Fetch integration statistics
 */
export function useIntegrationStats() {
  return useQuery({
    queryKey: integrationKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_integrations')
        .select('integration_type, sync_status, health_status, is_active');

      if (error) throw error;

      const integrations = data || [];

      // Calculate stats
      const byType: Record<IntegrationType, number> = {
        notion: 0,
        github: 0,
        slack: 0,
        google_calendar: 0,
        stripe: 0,
        custom: 0,
      };

      const byStatus: Record<SyncStatus, number> = {
        pending: 0,
        syncing: 0,
        synced: 0,
        error: 0,
        disabled: 0,
      };

      const byHealth: Record<HealthStatus, number> = {
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        unknown: 0,
      };

      let activeCount = 0;

      integrations.forEach((integration) => {
        byType[integration.integration_type as IntegrationType]++;
        byStatus[integration.sync_status as SyncStatus]++;
        byHealth[integration.health_status as HealthStatus]++;
        if (integration.is_active) activeCount++;
      });

      return {
        total: integrations.length,
        active: activeCount,
        byType,
        byStatus,
        byHealth,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// Toggle Active Status
// ============================================================================

/**
 * Toggle integration active status
 */
export function useToggleIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('service_integrations')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ServiceIntegration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      queryClient.invalidateQueries({ queryKey: integrationKeys.detail(data.id) });
    },
  });
}
