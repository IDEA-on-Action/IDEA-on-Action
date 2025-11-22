/**
 * User Resource
 *
 * Provides the user://current resource for MCP
 * Returns current authenticated user information
 */

import { fetchUserIntegrationData } from '../lib/supabase.js';

/**
 * User resource response structure (matches MCP spec)
 */
export interface UserResourceData {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

/**
 * Fetches user data for the user://current resource
 *
 * @param userId - The authenticated user's ID
 * @returns UserResourceData or null if user not found
 */
export async function getUserResource(
  userId: string
): Promise<UserResourceData | null> {
  const integrationData = await fetchUserIntegrationData(userId);

  if (!integrationData) {
    return null;
  }

  return {
    id: integrationData.user_id,
    email: integrationData.email,
    name: integrationData.name,
    avatar_url: integrationData.avatar_url,
  };
}

/**
 * Resource URI template for user resource
 */
export const USER_RESOURCE_URI = 'user://current';

/**
 * Resource metadata for user resource
 */
export const USER_RESOURCE_METADATA = {
  name: 'user://current',
  description: 'Current authenticated user information from IDEA on Action',
  mimeType: 'application/json',
};

/**
 * Formats user data for MCP resource response
 */
export function formatUserResourceResponse(
  data: UserResourceData
): { uri: string; text: string; mimeType: string } {
  return {
    uri: USER_RESOURCE_URI,
    text: JSON.stringify(data, null, 2),
    mimeType: 'application/json',
  };
}
