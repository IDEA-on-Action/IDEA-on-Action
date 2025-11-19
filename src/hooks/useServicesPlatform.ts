/**
 * Services Platform React Query Hooks
 *
 * Custom hooks for fetching service packages, subscription plans, and service details
 * Created: 2025-11-19
 * Related types: src/types/services-platform.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ServicePackage,
  ServicePackageInsert,
  ServicePackageUpdate,
  SubscriptionPlan,
  SubscriptionPlanInsert,
  SubscriptionPlanUpdate,
  ServiceWithContent,
  ServiceDetail,
  ServiceDetailQueryResult,
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
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('service_id', serviceId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data as ServicePackage[]) || [];
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
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (error) throw error;
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

  return useMutation({
    mutationFn: async (payload: ServicePackageInsert) => {
      const { data, error } = await supabase
        .from('service_packages')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as ServicePackage;
    },
    onSuccess: (data) => {
      // Invalidate packages list for this service
      queryClient.invalidateQueries({
        queryKey: servicesKeys.packages(data.service_id),
      });
      // Invalidate service detail
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

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ServicePackageUpdate }) => {
      const { data, error } = await supabase
        .from('service_packages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_packages').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      // Invalidate all packages queries
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
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('service_id', serviceId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data as SubscriptionPlan[]) || [];
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
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data as SubscriptionPlan;
    },
    enabled: !!planId,
  });
}

/**
 * Create a new subscription plan
 */
export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubscriptionPlanInsert) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
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

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SubscriptionPlanUpdate }) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscription_plans').delete().eq('id', id);

      if (error) throw error;
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
      // Fetch service with content data
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (serviceError) throw serviceError;
      if (!service) return null;

      // Fetch packages
      const { data: packages, error: packagesError } = await supabase
        .from('service_packages')
        .select('*')
        .eq('service_id', serviceId)
        .order('display_order', { ascending: true });

      if (packagesError) throw packagesError;

      // Fetch plans
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('service_id', serviceId)
        .order('display_order', { ascending: true });

      if (plansError) throw plansError;

      return {
        ...(service as ServiceWithContent),
        packages: (packages as ServicePackage[]) || [],
        plans: (plans as SubscriptionPlan[]) || [],
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
      // First, get service ID by slug
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('slug', slug)
        .single();

      if (serviceError) throw serviceError;
      if (!service) return null;

      // Fetch packages
      const { data: packages, error: packagesError } = await supabase
        .from('service_packages')
        .select('*')
        .eq('service_id', service.id)
        .order('display_order', { ascending: true });

      if (packagesError) throw packagesError;

      // Fetch plans
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('service_id', service.id)
        .order('display_order', { ascending: true });

      if (plansError) throw plansError;

      return {
        ...(service as ServiceWithContent),
        packages: (packages as ServicePackage[]) || [],
        plans: (plans as SubscriptionPlan[]) || [],
      };
    },
    enabled: !!slug,
  });
}

/**
 * Fetch popular packages across all services
 * @returns Array of popular service packages
 */
export function usePopularPackages() {
  return useQuery({
    queryKey: ['services-platform', 'popular-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_packages')
        .select(`
          *,
          service:services(id, title, slug)
        `)
        .eq('is_popular', true)
        .order('display_order', { ascending: true })
        .limit(6);

      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Fetch popular subscription plans across all services
 * @returns Array of popular subscription plans
 */
export function usePopularPlans() {
  return useQuery({
    queryKey: ['services-platform', 'popular-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          service:services(id, title, slug)
        `)
        .eq('is_popular', true)
        .order('display_order', { ascending: true})
        .limit(6);

      if (error) throw error;
      return data || [];
    },
  });
}
