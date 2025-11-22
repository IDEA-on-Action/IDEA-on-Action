/**
 * Compass Navigator MCP Server
 *
 * Main server configuration and setup for the MCP server
 * that provides integration between Compass Navigator and IDEA on Action.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Import resources
import {
  getUserResource,
  USER_RESOURCE_METADATA,
  formatUserResourceResponse,
} from './resources/user.js';
import {
  getSubscriptionResource,
  SUBSCRIPTION_RESOURCE_METADATA,
  formatSubscriptionResourceResponse,
} from './resources/subscription.js';

// Import tools
import {
  executeVerifyToken,
  VERIFY_TOKEN_METADATA,
  formatVerifyTokenResult,
} from './tools/verify-token.js';
import {
  executeCheckPermission,
  CHECK_PERMISSION_METADATA,
  formatCheckPermissionResult,
  AVAILABLE_PERMISSIONS,
} from './tools/check-permission.js';

// Import utilities
import { verifyToken } from './lib/jwt.js';

/**
 * Server configuration
 */
export interface ServerConfig {
  name: string;
  version: string;
}

const DEFAULT_CONFIG: ServerConfig = {
  name: 'compass-navigator-mcp',
  version: '1.0.0',
};

/**
 * Current authenticated user context
 * Set by authentication middleware or token verification
 */
let currentUserId: string | null = null;

/**
 * Sets the current user context
 */
export function setCurrentUser(userId: string | null): void {
  currentUserId = userId;
}

/**
 * Gets the current user context
 */
export function getCurrentUser(): string | null {
  return currentUserId;
}

/**
 * Creates and configures the MCP server
 */
export function createServer(config: Partial<ServerConfig> = {}): McpServer {
  const serverConfig = { ...DEFAULT_CONFIG, ...config };

  const server = new McpServer({
    name: serverConfig.name,
    version: serverConfig.version,
  });

  // Register resources
  registerResources(server);

  // Register tools
  registerTools(server);

  return server;
}

/**
 * Registers all MCP resources
 */
function registerResources(server: McpServer): void {
  // user://current resource
  server.resource(
    'user-current',
    'user://current',
    {
      title: 'Current User',
      description: USER_RESOURCE_METADATA.description,
      mimeType: USER_RESOURCE_METADATA.mimeType,
    },
    async () => {
      const userId = getCurrentUser();

      if (!userId) {
        return {
          contents: [
            {
              uri: 'user://current',
              text: JSON.stringify({ error: 'No authenticated user' }),
              mimeType: 'application/json',
            },
          ],
        };
      }

      const userData = await getUserResource(userId);

      if (!userData) {
        return {
          contents: [
            {
              uri: 'user://current',
              text: JSON.stringify({ error: 'User not found' }),
              mimeType: 'application/json',
            },
          ],
        };
      }

      const formatted = formatUserResourceResponse(userData);
      return {
        contents: [formatted],
      };
    }
  );

  // subscription://current resource
  server.resource(
    'subscription-current',
    'subscription://current',
    {
      title: 'Current Subscription',
      description: SUBSCRIPTION_RESOURCE_METADATA.description,
      mimeType: SUBSCRIPTION_RESOURCE_METADATA.mimeType,
    },
    async () => {
      const userId = getCurrentUser();

      if (!userId) {
        return {
          contents: [
            {
              uri: 'subscription://current',
              text: JSON.stringify({ error: 'No authenticated user' }),
              mimeType: 'application/json',
            },
          ],
        };
      }

      const subscriptionData = await getSubscriptionResource(userId);

      if (!subscriptionData) {
        return {
          contents: [
            {
              uri: 'subscription://current',
              text: JSON.stringify({ error: 'Subscription data not found' }),
              mimeType: 'application/json',
            },
          ],
        };
      }

      const formatted = formatSubscriptionResourceResponse(subscriptionData);
      return {
        contents: [formatted],
      };
    }
  );
}

/**
 * Registers all MCP tools
 */
function registerTools(server: McpServer): void {
  // verify_token tool
  server.tool(
    VERIFY_TOKEN_METADATA.name,
    VERIFY_TOKEN_METADATA.description,
    {
      token: z.string().describe('The Supabase JWT token to verify'),
    },
    async ({ token }) => {
      const result = await executeVerifyToken({ token });

      // If verification succeeds, update the current user context
      if (result.valid && result.user_id) {
        setCurrentUser(result.user_id);
      }

      return formatVerifyTokenResult(result);
    }
  );

  // check_permission tool
  server.tool(
    CHECK_PERMISSION_METADATA.name,
    CHECK_PERMISSION_METADATA.description,
    {
      permission: z
        .string()
        .describe(
          `The permission to check. Available: ${AVAILABLE_PERMISSIONS.join(', ')}`
        ),
      user_id: z
        .string()
        .uuid()
        .optional()
        .describe('Optional user ID. If not provided, uses the authenticated user context'),
    },
    async ({ permission, user_id }) => {
      const result = await executeCheckPermission(
        { permission, user_id },
        getCurrentUser() ?? undefined
      );
      return formatCheckPermissionResult(result);
    }
  );

  // authenticate tool - sets user context from token
  server.tool(
    'authenticate',
    'Authenticates a user with a Supabase JWT token and sets the user context for subsequent requests',
    {
      token: z.string().describe('The Supabase JWT token'),
    },
    async ({ token }) => {
      const result = await verifyToken(token);

      if (result.valid && result.userId) {
        setCurrentUser(result.userId);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                message: 'Authentication successful',
                user_id: result.userId,
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: result.error ?? 'Authentication failed',
            }),
          },
        ],
      };
    }
  );

  // list_permissions tool - lists all available permissions
  server.tool(
    'list_permissions',
    'Lists all available permissions and their required subscription plans',
    {},
    async () => {
      const permissions = AVAILABLE_PERMISSIONS.map((perm) => ({
        permission: perm,
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                permissions,
                message: 'Use check_permission tool to verify access',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}

/**
 * Export for testing
 */
export { registerResources, registerTools };
