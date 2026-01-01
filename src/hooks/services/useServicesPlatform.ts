/**
 * Services Platform React Query Hooks
 *
 * Custom hooks for fetching service packages, subscription plans, and service details
 * Created: 2025-11-19
 * Related types: src/types/services-platform.ts
 *
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi, callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { domainCacheConfig } from '@/lib/react-query';
import type {
  ServicePackage,
  ServicePackageInsert,
  ServicePackageUpdate,
  SubscriptionPlan,
  SubscriptionPlanInsert,
  SubscriptionPlanUpdate,
  ServiceWithContent,
  ServiceDetail,
} from '@/types/services-platform';

// ============================================================================
// Query Keys
// ============================================================================

export const servicesKeys = {
  all: ['services-platform'] as const,
  packages: (serviceId?: string) =>
    serviceId ? ['services-platform', 'packages', serviceId] : ['services-platform', 'packages'],
  plans: (serviceId?: string) =>
    serviceId ? ['services-platform', 'plans', serviceId] : ['services-platform', 'plans'],
  detail: (serviceId: string) => ['services-platform', 'detail', serviceId] as const,
  detailBySlug: (slug: string) => ['services-platform', 'detail-slug', slug] as const,
};

// ============================================================================
// Basic Service Hooks
// ============================================================================

/**
 * Fetch all active services
 * @returns React Query result with services array
 */
export function useServices() {
  return useQuery({
    queryKey: servicesKeys.all,
    queryFn: async () => {
      const { data, error } = await servicesApi.list({ status: 'published' });

      if (error) throw new Error(error);
      return (data as ServiceWithContent[]) || [];
    },
    ...domainCacheConfig.services,
    refetchOnWindowFocus: false, // 성능 최적화
  });
}

/**
 * Fetch a single service by slug (basic info only)
 * @param slug - Service slug
 * @returns React Query result with service
 */
export function useServiceBySlug(slug: string) {
  return useQuery({
    queryKey: ['services-platform', 'service-slug', slug],
    queryFn: async () => {
      const { data, error } = await servicesApi.getBySlug(slug);

      if (error) {
        if (error.includes('not found') || error.includes('없')) {
          return null;
        }
        throw new Error(error);
      }
      return data as ServiceWithContent | null;
    },
    enabled: !!slug,
    ...domainCacheConfig.services,
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// Service Packages Hooks
// ============================================================================

/**
 * Fetch all service packages for a given service
 * @param serviceId - Service UUID
 * @returns React Query result with service packages array
 */
export function useServicePackages(serviceId: string) {
  return useQuery({
    queryKey: servicesKeys.packages(serviceId),
    queryFn: async () => {
      const { data, error } = await callWorkersApi<ServicePackage[]>(
        `/api/v1/services/${serviceId}/packages`
      );

      if (error) throw new Error(error);
      return data || [];
    },
    enabled: !!serviceId,
  });
}

/**
 * Fetch a single service package by ID
 * @param packageId - Package UUID
 */
export function useServicePackage(packageId: string) {
  return useQuery({
    queryKey: ['services-platform', 'package', packageId],
    queryFn: async () => {
      const { data, error } = await callWorkersApi<ServicePackage>(
        `/api/v1/packages/${packageId}`
      );

      if (error) throw new Error(error);
      return data as ServicePackage;
    },
    enabled: !!packageId,
  });
}

/**
 * Create a new service package
 */
export function useCreateServicePackage() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (payload: ServicePackageInsert) => {
      const { data, error } = await callWorkersApi<ServicePackage>(
        '/api/v1/packages',
        {
          method: 'POST',
          token: workersTokens?.accessToken,
          body: payload,
        }
      );

      if (error) throw new Error(error);
      return data as ServicePackage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: servicesKeys.packages(data.service_id),
      });
      queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(data.service_id),
      });
    },
  });
}

/**
 * Update an existing service package
 */
export function useUpdateServicePackage() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ServicePackageUpdate }) => {
      const { data, error } = await callWorkersApi<ServicePackage>(
        `/api/v1/packages/${id}`,
        {
          method: 'PATCH',
          token: workersTokens?.accessToken,
          body: updates,
        }
      );

      if (error) throw new Error(error);
      return data as ServicePackage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: servicesKeys.packages(data.service_id),
      });
      queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(data.service_id),
      });
    },
  });
}

/**
 * Delete a service package
 */
export function useDeleteServicePackage() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await callWorkersApi(
        `/api/v1/packages/${id}`,
        {
          method: 'DELETE',
          token: workersTokens?.accessToken,
        }
      );

      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: servicesKeys.packages(),
      });
    },
  });
}

// ============================================================================
// Subscription Plans Hooks
// ============================================================================

/**
 * Fetch all subscription plans for a given service
 * @param serviceId - Service UUID
 * @returns React Query result with subscription plans array
 */
export function useSubscriptionPlans(serviceId: string) {
  return useQuery({
    queryKey: servicesKeys.plans(serviceId),
    queryFn: async () => {
      const { data, error } = await callWorkersApi<SubscriptionPlan[]>(
        `/api/v1/services/${serviceId}/plans`
      );

      if (error) throw new Error(error);
      return data || [];
    },
    enabled: !!serviceId,
  });
}

/**
 * Fetch a single subscription plan by ID
 * @param planId - Plan UUID
 */
export function useSubscriptionPlan(planId: string) {
  return useQuery({
    queryKey: ['services-platform', 'plan', planId],
    queryFn: async () => {
      const { data, error } = await callWorkersApi<SubscriptionPlan>(
        `/api/v1/plans/${planId}`
      );

      if (error) throw new Error(error);
      return data as SubscriptionPlan;
    },
    enabled: !!planId,
  });
}

// ============================================================================
// Aliases for Convenience
// ============================================================================

/**
 * Alias for useServicePackage (for consistency with requirements)
 */
export const usePackageById = useServicePackage;

/**
 * Alias for useSubscriptionPlan (for consistency with requirements)
 */
export const usePlanById = useSubscriptionPlan;

/**
 * Alias for useSubscriptionPlans (for consistency with requirements)
 */
export const useServicePlans = useSubscriptionPlans;

/**
 * Create a new subscription plan
 */
export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (payload: SubscriptionPlanInsert) => {
      const { data, error } = await callWorkersApi<SubscriptionPlan>(
        '/api/v1/plans',
        {
          method: 'POST',
          token: workersTokens?.accessToken,
          body: payload,
        }
      );

      if (error) throw new Error(error);
      return data as SubscriptionPlan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: servicesKeys.plans(data.service_id),
      });
      queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(data.service_id),
      });
    },
  });
}

/**
 * Update an existing subscription plan
 */
export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SubscriptionPlanUpdate }) => {
      const { data, error } = await callWorkersApi<SubscriptionPlan>(
        `/api/v1/plans/${id}`,
        {
          method: 'PATCH',
          token: workersTokens?.accessToken,
          body: updates,
        }
      );

      if (error) throw new Error(error);
      return data as SubscriptionPlan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: servicesKeys.plans(data.service_id),
      });
      queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(data.service_id),
      });
    },
  });
}

/**
 * Delete a subscription plan
 */
export function useDeleteSubscriptionPlan() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await callWorkersApi(
        `/api/v1/plans/${id}`,
        {
          method: 'DELETE',
          token: workersTokens?.accessToken,
        }
      );

      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: servicesKeys.plans(),
      });
    },
  });
}

// ============================================================================
// Service Detail Hooks (Combined Query)
// ============================================================================

/**
 * Fetch complete service detail with packages and plans
 * @param serviceId - Service UUID
 * @returns Service detail with packages and plans
 */
export function useServiceDetail(serviceId: string) {
  return useQuery({
    queryKey: servicesKeys.detail(serviceId),
    queryFn: async (): Promise<ServiceDetail | null> => {
      const { data: service, error: serviceError } = await servicesApi.getById(serviceId);

      if (serviceError) throw new Error(serviceError);
      if (!service) return null;

      const { data: packages, error: packagesError } = await callWorkersApi<ServicePackage[]>(
        `/api/v1/services/${serviceId}/packages`
      );

      if (packagesError) throw new Error(packagesError);

      const { data: plans, error: plansError } = await callWorkersApi<SubscriptionPlan[]>(
        `/api/v1/services/${serviceId}/plans`
      );

      if (plansError) throw new Error(plansError);

      return {
        ...(service as ServiceWithContent),
        packages: packages || [],
        plans: plans || [],
      };
    },
    enabled: !!serviceId,
  });
}

/**
 * Fetch service detail by slug (URL-friendly identifier)
 * @param slug - Service slug (e.g., "mvp", "fullstack")
 * @returns Service detail with packages and plans
 */
export function useServiceDetailBySlug(slug: string) {
  return useQuery({
    queryKey: servicesKeys.detailBySlug(slug),
    queryFn: async (): Promise<ServiceDetail | null> => {
      const { data: service, error: serviceError } = await servicesApi.getBySlug(slug);

      if (serviceError) {
        if (serviceError.includes('not found') || serviceError.includes('없')) {
          return null;
        }
        throw new Error(serviceError);
      }
      if (!service) return null;

      const serviceData = service as ServiceWithContent;

      const { data: packages, error: packagesError } = await callWorkersApi<ServicePackage[]>(
        `/api/v1/services/${serviceData.id}/packages`
      );

      if (packagesError) throw new Error(packagesError);

      const { data: plans, error: plansError } = await callWorkersApi<SubscriptionPlan[]>(
        `/api/v1/services/${serviceData.id}/plans`
      );

      if (plansError) throw new Error(plansError);

      return {
        ...serviceData,
        packages: packages || [],
        plans: plans || [],
      };
    },
    enabled: !!slug,
  });
}

/**
 * Fetch popular packages for a specific service or all services
 * @param serviceId - Optional service UUID to filter by
 * @returns Array of popular service packages
 */
export function usePopularPackages(serviceId?: string) {
  return useQuery({
    queryKey: serviceId
      ? ['services-platform', 'popular-packages', serviceId]
      : ['services-platform', 'popular-packages'],
    queryFn: async () => {
      const endpoint = serviceId
        ? `/api/v1/packages/popular?service_id=${serviceId}`
        : '/api/v1/packages/popular?limit=6';

      const { data, error } = await callWorkersApi<ServicePackage[]>(endpoint);

      if (error) throw new Error(error);
      return data || [];
    },
    ...domainCacheConfig.servicePackages,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch popular subscription plans for a specific service or all services
 * @param serviceId - Optional service UUID to filter by
 * @returns Array of popular subscription plans
 */
export function usePopularPlans(serviceId?: string) {
  return useQuery({
    queryKey: serviceId
      ? ['services-platform', 'popular-plans', serviceId]
      : ['services-platform', 'popular-plans'],
    queryFn: async () => {
      const endpoint = serviceId
        ? `/api/v1/plans/popular?service_id=${serviceId}`
        : '/api/v1/plans/popular?limit=6';

      const { data, error } = await callWorkersApi<SubscriptionPlan[]>(endpoint);

      if (error) throw new Error(error);
      return data || [];
    },
    ...domainCacheConfig.subscriptionPlans,
    refetchOnWindowFocus: false,
  });
}
