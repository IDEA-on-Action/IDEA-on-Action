/**
 * Service Integrations React Query Hooks
 *
 * Custom hooks for managing service integrations (Notion, GitHub, Slack, etc.)
 * Created: 2025-11-25
 * Related types: src/types/integrations.ts
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
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
} from '@/types/integrations/integrations';

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
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: integrationKeys.list(filters),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters?.service_id) queryParams.set('service_id', filters.service_id);
      if (filters?.integration_type) queryParams.set('integration_type', filters.integration_type);
      if (filters?.sync_status) queryParams.set('sync_status', filters.sync_status);
      if (filters?.health_status) queryParams.set('health_status', filters.health_status);
      if (filters?.is_active !== undefined) queryParams.set('is_active', String(filters.is_active));

      const queryString = queryParams.toString();
      const { data, error } = await callWorkersApi<ServiceIntegrationWithService[]>(
        `/api/v1/integrations${queryString ? `?${queryString}` : ''}`,
        { token: workersTokens?.accessToken }
      );

      if (error) throw new Error(error);
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch a single integration by ID
 */
export function useIntegration(id: string) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: integrationKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await callWorkersApi<ServiceIntegrationWithService>(
        `/api/v1/integrations/${id}`,
        { token: workersTokens?.accessToken }
      );

      if (error) throw new Error(error);
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
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: integrationKeys.byService(serviceId),
    queryFn: async () => {
      const { data, error } = await callWorkersApi<ServiceIntegration[]>(
        `/api/v1/integrations?service_id=${serviceId}&is_active=true`,
        { token: workersTokens?.accessToken }
      );

      if (error) throw new Error(error);
      return data || [];
    },
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch integrations by type
 */
export function useIntegrationsByType(type: IntegrationType) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: integrationKeys.byType(type),
    queryFn: async () => {
      const { data, error } = await callWorkersApi<ServiceIntegrationWithService[]>(
        `/api/v1/integrations?integration_type=${type}&is_active=true`,
        { token: workersTokens?.accessToken }
      );

      if (error) throw new Error(error);
      return data || [];
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
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateIntegrationInput) => {
      const { data, error } = await callWorkersApi<ServiceIntegration>(
        '/api/v1/integrations',
        {
          method: 'POST',
          token: workersTokens?.accessToken,
          body: {
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
          },
        }
      );

      if (error) throw new Error(error);
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
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateIntegrationInput & { id: string }) => {
      const { data, error } = await callWorkersApi<ServiceIntegration>(
        `/api/v1/integrations/${id}`,
        {
          method: 'PATCH',
          token: workersTokens?.accessToken,
          body: input,
        }
      );

      if (error) throw new Error(error);
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
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the integration to know its service_id for cache invalidation
      const { data: existing } = await callWorkersApi<{ service_id: string | null }>(
        `/api/v1/integrations/${id}`,
        { token: workersTokens?.accessToken }
      );

      const { error } = await callWorkersApi(
        `/api/v1/integrations/${id}`,
        {
          method: 'DELETE',
          token: workersTokens?.accessToken,
        }
      );

      if (error) throw new Error(error);
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
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({
      integrationId,
      direction = 'inbound',
    }: {
      integrationId: string;
      direction?: 'inbound' | 'outbound' | 'bidirectional';
    }) => {
      const { data, error } = await callWorkersApi<IntegrationSyncLog>(
        `/api/v1/integrations/${integrationId}/sync`,
        {
          method: 'POST',
          token: workersTokens?.accessToken,
          body: { direction },
        }
      );

      if (error) throw new Error(error);
      return data as IntegrationSyncLog;
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
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({
      integrationId,
      status,
      error: syncError,
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
        sync_error: syncError || null,
      };

      if (metadata) {
        updateData.sync_metadata = metadata;
      }

      const { data, error } = await callWorkersApi<ServiceIntegration>(
        `/api/v1/integrations/${integrationId}`,
        {
          method: 'PATCH',
          token: workersTokens?.accessToken,
          body: updateData,
        }
      );

      if (error) throw new Error(error);
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
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (integrationId: string) => {
      const { data, error } = await callWorkersApi<ServiceIntegration>(
        `/api/v1/integrations/${integrationId}/health-check`,
        {
          method: 'POST',
          token: workersTokens?.accessToken,
        }
      );

      if (error) throw new Error(error);
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
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: integrationKeys.syncLogs(integrationId, filters),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.set('status', filters.status);
      if (filters?.sync_type) queryParams.set('sync_type', filters.sync_type);
      if (filters?.from_date) queryParams.set('from_date', filters.from_date);
      if (filters?.to_date) queryParams.set('to_date', filters.to_date);
      if (filters?.limit) queryParams.set('limit', String(filters.limit));
      else queryParams.set('limit', '50'); // Default limit

      const queryString = queryParams.toString();
      const { data, error } = await callWorkersApi<IntegrationSyncLog[]>(
        `/api/v1/integrations/${integrationId}/sync-logs${queryString ? `?${queryString}` : ''}`,
        { token: workersTokens?.accessToken }
      );

      if (error) throw new Error(error);
      return data || [];
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
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: integrationKeys.stats(),
    queryFn: async () => {
      const { data, error } = await callWorkersApi<{
        total: number;
        active: number;
        byType: Record<IntegrationType, number>;
        byStatus: Record<SyncStatus, number>;
        byHealth: Record<HealthStatus, number>;
      }>(
        '/api/v1/integrations/stats',
        { token: workersTokens?.accessToken }
      );

      if (error) throw new Error(error);
      return data;
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
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await callWorkersApi<ServiceIntegration>(
        `/api/v1/integrations/${id}`,
        {
          method: 'PATCH',
          token: workersTokens?.accessToken,
          body: { is_active: isActive },
        }
      );

      if (error) throw new Error(error);
      return data as ServiceIntegration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      queryClient.invalidateQueries({ queryKey: integrationKeys.detail(data.id) });
    },
  });
}
