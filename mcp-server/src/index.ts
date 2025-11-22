#!/usr/bin/env node
/**
 * Minu MCP Server Entry Point (구 Compass Navigator)
 *
 * Starts the MCP server with the appropriate transport
 * based on command line arguments or environment variables.
 *
 * Usage:
 *   npm run dev:stdio  - Run with stdio transport (for CLI clients)
 *   npm run dev:http   - Run with HTTP transport (for web clients)
 */

// Load environment variables from .env file
import 'dotenv/config';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response, NextFunction } from 'express';
import { createServer, setCurrentUser } from './server.js';
import { verifyToken } from './lib/jwt.js';
import { validateEnvironment } from './lib/supabase.js';
import { createWebhookRouter, validateWebhookEnvironment } from './routes/index.js';

/**
 * Configuration from environment
 */
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? 'localhost';
const TRANSPORT = process.env.MCP_TRANSPORT ?? 'stdio';
const NODE_ENV = process.env.NODE_ENV ?? 'development';

/**
 * CORS allowed origins configuration
 * Default: localhost for development, ideaonaction.ai for production
 */
function getAllowedOrigins(): string[] {
  const corsOrigins = process.env.CORS_ORIGINS;

  if (corsOrigins) {
    return corsOrigins.split(',').map((origin) => origin.trim());
  }

  // Default origins based on environment
  if (NODE_ENV === 'production') {
    return ['https://www.ideaonaction.ai', 'https://ideaonaction.ai'];
  }

  return ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'];
}

/**
 * Check if origin is allowed for CORS
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * Parse command line arguments
 */
function parseArgs(): { transport: 'stdio' | 'http' } {
  const args = process.argv.slice(2);

  if (args.includes('--http')) {
    return { transport: 'http' };
  }

  if (args.includes('--stdio')) {
    return { transport: 'stdio' };
  }

  // Use environment variable or default to stdio
  return { transport: TRANSPORT === 'http' ? 'http' : 'stdio' };
}

/**
 * Start server with stdio transport
 * Used for CLI-based MCP clients
 */
async function startStdioServer(): Promise<void> {
  console.error('[MCP Server] Starting with stdio transport...');

  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error('[MCP Server] Connected via stdio');
  console.error('[MCP Server] Ready to accept requests');
}

/**
 * Start server with HTTP transport
 * Used for web-based MCP clients
 */
async function startHttpServer(): Promise<void> {
  console.log('[MCP Server] Starting with HTTP transport...');

  const app = express();
  app.use(express.json());

  // Security headers middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable strict transport security in production
    if (NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // Prevent XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; frame-ancestors 'none'"
    );

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (formerly Feature Policy)
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
  });

  // CORS middleware with dynamic origin validation
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin && isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, X-Client-Info, X-Requested-With'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours preflight cache

    if (req.method === 'OPTIONS') {
      res.sendStatus(204); // No Content for preflight
      return;
    }

    next();
  });

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'minu-mcp',
      version: '1.1.0',
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // Info endpoint
  app.get('/info', (_req: Request, res: Response) => {
    res.json({
      name: 'Minu MCP Server',
      version: '1.1.0',
      description:
        'MCP Server for Minu Platform integration with IDEA on Action',
      resources: ['user://current', 'subscription://current'],
      tools: [
        'verify_token',
        'check_permission',
        'authenticate',
        'list_permissions',
      ],
    });
  });

  // Authentication middleware for MCP endpoint
  const authMiddleware = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = await verifyToken(token);

      if (result.valid && result.userId) {
        setCurrentUser(result.userId);
      }
    }

    next();
  };

  // Create MCP server and transport
  const server = createServer();

  // MCP endpoint with streaming support
  app.post('/mcp', authMiddleware, async (req: Request, res: Response) => {
    try {
      // Create a new transport for each request
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () =>
          `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });

      // Connect the server to the transport
      await server.connect(transport);

      // Handle the request
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('[MCP Server] Request error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: req.body?.id ?? null,
      });
    }
  });

  // Mount webhook routes
  const webhookRouter = createWebhookRouter();
  app.use('/api/webhooks', webhookRouter);

  // Start the HTTP server
  app.listen(PORT, HOST, () => {
    console.log(`[MCP Server] HTTP server listening on http://${HOST}:${PORT}`);
    console.log(`[MCP Server] Environment: ${NODE_ENV}`);
    console.log(`[MCP Server] CORS origins: ${getAllowedOrigins().join(', ')}`);
    console.log('[MCP Server] Endpoints:');
    console.log(`  - POST http://${HOST}:${PORT}/mcp (MCP protocol)`);
    console.log(`  - GET  http://${HOST}:${PORT}/health (Health check)`);
    console.log(`  - GET  http://${HOST}:${PORT}/info (Server info)`);
    console.log(`  - POST http://${HOST}:${PORT}/api/webhooks/minu (Webhook)`);
  });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.error('[MCP Server] Minu MCP Server v1.1.0');

  // Validate environment on startup
  try {
    validateEnvironment();
    console.error('[MCP Server] Environment validated');
  } catch (error) {
    console.error('[MCP Server] Environment validation failed:', error);
    console.error('[MCP Server] Required environment variables:');
    console.error('  - SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
    console.error('  - SUPABASE_JWT_SECRET (for token verification)');
    process.exit(1);
  }

  // Validate webhook environment (non-fatal, just warns)
  validateWebhookEnvironment();

  const { transport } = parseArgs();

  try {
    if (transport === 'http') {
      await startHttpServer();
    } else {
      await startStdioServer();
    }
  } catch (error) {
    console.error('[MCP Server] Failed to start:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[MCP Server] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MCP Server] Shutting down...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('[MCP Server] Unhandled error:', error);
  process.exit(1);
});
