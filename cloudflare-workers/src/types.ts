/**
 * Cloudflare Workers 타입 정의
 */

// Hono Context Variables
export interface Variables {
  auth: AuthContext | null;
}

// App 타입 (Hono에서 사용)
export type AppType = {
  Bindings: Env;
  Variables: Variables;
};

export interface Env {
  // KV Namespaces
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  RATE_LIMIT: KVNamespace;

  // D1 Database
  DB: D1Database;

  // R2 Storage
  MEDIA_BUCKET: R2Bucket;

  // Environment Variables
  ENVIRONMENT: string;
  API_VERSION: string;
  CORS_ORIGINS: string;

  // Secrets (wrangler secret으로 설정)
  JWT_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TOSS_SECRET_KEY: string;
  SLACK_WEBHOOK_URL: string;
  OPENAI_API_KEY: string;
  RESEND_API_KEY: string;
}

export interface AuthContext {
  userId: string | null;
  isAdmin: boolean;
  permissions: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
