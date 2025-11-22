/**
 * Subscription Resource
 *
 * Provides the subscription://current resource for MCP
 * Returns current user's subscription status and plan information
 */

import { fetchUserIntegrationData } from '../lib/supabase.js';

/**
 * Subscription resource response structure (matches MCP spec)
 */
export interface SubscriptionResourceData {
  status: 'active' | 'inactive' | 'past_due';
  plan: {
    name: string;
    features: string[];
  };
  valid_until: string | null;
}

/**
 * Fetches subscription data for the subscription://current resource
 *
 * @param userId - The authenticated user's ID
 * @returns SubscriptionResourceData or null if user not found
 */
export async function getSubscriptionResource(
  userId: string
): Promise<SubscriptionResourceData | null> {
  const integrationData = await fetchUserIntegrationData(userId);

  if (!integrationData) {
    return null;
  }

  return {
    status: integrationData.subscription_status,
    plan: {
      name: integrationData.plan_name ?? 'Free',
      features: integrationData.plan_features ?? [],
    },
    valid_until: integrationData.valid_until,
  };
}

/**
 * Resource URI template for subscription resource
 */
export const SUBSCRIPTION_RESOURCE_URI = 'subscription://current';

/**
 * Resource metadata for subscription resource
 */
export const SUBSCRIPTION_RESOURCE_METADATA = {
  name: 'subscription://current',
  description: 'Current user subscription status and plan from IDEA on Action',
  mimeType: 'application/json',
};

/**
 * Formats subscription data for MCP resource response
 */
export function formatSubscriptionResourceResponse(
  data: SubscriptionResourceData
): { uri: string; text: string; mimeType: string } {
  return {
    uri: SUBSCRIPTION_RESOURCE_URI,
    text: JSON.stringify(data, null, 2),
    mimeType: 'application/json',
  };
}

/**
 * Checks if subscription is currently active
 */
export function isSubscriptionActive(data: SubscriptionResourceData): boolean {
  if (data.status !== 'active') {
    return false;
  }

  if (data.valid_until) {
    const validUntil = new Date(data.valid_until);
    return validUntil > new Date();
  }

  return true;
}

/**
 * Gets the subscription tier level (0-3)
 */
export function getSubscriptionTier(data: SubscriptionResourceData): number {
  const planName = data.plan.name.toLowerCase();

  switch (planName) {
    case 'enterprise':
      return 3;
    case 'pro':
      return 2;
    case 'basic':
      return 1;
    case 'trial':
    case 'free':
    default:
      return 0;
  }
}
