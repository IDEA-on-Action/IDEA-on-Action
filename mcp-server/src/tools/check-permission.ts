/**
 * Check Permission Tool
 *
 * MCP tool for checking user permissions based on subscription plan
 */

import { z } from 'zod';
import {
  fetchUserIntegrationData,
  hasPermission,
  FEATURE_REQUIREMENTS,
} from '../lib/supabase.js';

/**
 * Input schema for check_permission tool
 */
export const checkPermissionInputSchema = z.object({
  permission: z.string().min(1, 'Permission name is required'),
  user_id: z.string().uuid('Valid user ID is required').optional(),
});

export type CheckPermissionInput = z.infer<typeof checkPermissionInputSchema>;

/**
 * Output schema for check_permission tool
 */
export const checkPermissionOutputSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
});

export type CheckPermissionOutput = z.infer<typeof checkPermissionOutputSchema>;

/**
 * Tool metadata for check_permission
 */
export const CHECK_PERMISSION_METADATA = {
  name: 'check_permission',
  title: 'Check Permission',
  description:
    'Checks if a user has permission to access a specific feature based on their subscription plan',
};

/**
 * Available permissions list for documentation
 */
export const AVAILABLE_PERMISSIONS = Object.keys(FEATURE_REQUIREMENTS);

/**
 * Execute the check_permission tool
 *
 * @param input - Tool input containing permission name and optional user ID
 * @param contextUserId - User ID from authentication context (used if not in input)
 * @returns Tool output with allowed status and reason
 */
export async function executeCheckPermission(
  input: CheckPermissionInput,
  contextUserId?: string
): Promise<CheckPermissionOutput> {
  // Validate input
  const parsed = checkPermissionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      allowed: false,
      reason: parsed.error.errors[0]?.message ?? 'Invalid input',
    };
  }

  // Get user ID from input or context
  const userId = parsed.data.user_id ?? contextUserId;

  if (!userId) {
    return {
      allowed: false,
      reason: 'User ID is required - either in input or from authenticated context',
    };
  }

  // Fetch user's subscription data
  const userData = await fetchUserIntegrationData(userId);

  if (!userData) {
    return {
      allowed: false,
      reason: 'User not found or no subscription data available',
    };
  }

  // Check subscription status
  if (userData.subscription_status !== 'active') {
    return {
      allowed: false,
      reason: `Subscription is ${userData.subscription_status}. Active subscription required.`,
    };
  }

  // Check permission based on plan
  const result = hasPermission(userData.plan_name, parsed.data.permission);

  return {
    allowed: result.allowed,
    reason: result.reason,
  };
}

/**
 * Format the tool result for MCP response
 */
export function formatCheckPermissionResult(output: CheckPermissionOutput): {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: CheckPermissionOutput;
} {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(output, null, 2),
      },
    ],
    structuredContent: output,
  };
}

/**
 * Get list of all available permissions with their required plans
 */
export function getPermissionsList(): Array<{
  permission: string;
  requiredPlan: string;
}> {
  return Object.entries(FEATURE_REQUIREMENTS).map(([permission, plan]) => ({
    permission,
    requiredPlan: plan,
  }));
}
