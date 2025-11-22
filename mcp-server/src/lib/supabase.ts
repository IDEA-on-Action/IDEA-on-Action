/**
 * Supabase Client Utility
 *
 * Provides a configured Supabase client for the MCP server
 * to interact with the IDEA on Action database.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

/**
 * Validates that required environment variables are set
 */
export function validateEnvironment(): void {
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL environment variable is required');
  }
  if (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY) {
    throw new Error(
      'Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is required'
    );
  }
}

/**
 * Creates a Supabase client with service role key (admin access)
 * Use this for server-side operations that bypass RLS
 */
export function createServiceClient(): SupabaseClient {
  validateEnvironment();

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service client');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a Supabase client with anon key (public access)
 * Use this for client-side operations that respect RLS
 */
export function createAnonClient(): SupabaseClient {
  validateEnvironment();

  if (!SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is required for anon client');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Type definitions for compass_integration_view
 */
export interface CompassIntegrationData {
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  subscription_status: 'active' | 'inactive' | 'past_due';
  plan_name: string | null;
  plan_features: string[] | null;
  valid_until: string | null;
}

/**
 * Fetches user data from compass_integration_view
 */
export async function fetchUserIntegrationData(
  userId: string
): Promise<CompassIntegrationData | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('compass_integration_view')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user integration data:', error);
    return null;
  }

  return data as CompassIntegrationData;
}

/**
 * Permission levels based on subscription plans
 */
export const PERMISSION_LEVELS: Record<string, number> = {
  trial: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
};

/**
 * Feature to required plan mapping
 */
export const FEATURE_REQUIREMENTS: Record<string, string> = {
  access_compass_basic: 'basic',
  access_compass_pro: 'pro',
  access_compass_enterprise: 'enterprise',
  export_data: 'pro',
  advanced_analytics: 'pro',
  team_collaboration: 'enterprise',
  priority_support: 'enterprise',
  api_access: 'pro',
  custom_integrations: 'enterprise',
};

/**
 * Check if a user has permission for a specific feature
 */
export function hasPermission(
  userPlan: string | null,
  requiredPermission: string
): { allowed: boolean; reason?: string } {
  // Map common plan names to lowercase keys
  const normalizedPlan = (userPlan ?? 'trial').toLowerCase();

  // Get required plan for the permission
  const requiredPlan = FEATURE_REQUIREMENTS[requiredPermission];

  if (!requiredPlan) {
    // Unknown permission - deny by default
    return {
      allowed: false,
      reason: `Unknown permission: ${requiredPermission}`,
    };
  }

  const userLevel = PERMISSION_LEVELS[normalizedPlan] ?? 0;
  const requiredLevel = PERMISSION_LEVELS[requiredPlan] ?? 0;

  if (userLevel >= requiredLevel) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Requires ${requiredPlan} plan or higher. Current plan: ${normalizedPlan}`,
  };
}
