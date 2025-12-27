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

  // Vectorize (RAG 검색)
  VECTORIZE: VectorizeIndex;

  // Durable Objects (실시간)
  REALTIME_ROOM: DurableObjectNamespace;

  // Environment Variables
  INTERNAL_API_KEY: string;
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

  // MCP Secrets
  MCP_JWT_SECRET: string;
  WEBHOOK_SECRET_MINU_FIND?: string;
  WEBHOOK_SECRET_MINU_FRAME?: string;
  WEBHOOK_SECRET_MINU_BUILD?: string;
  WEBHOOK_SECRET_MINU_KEEP?: string;
  WEBHOOK_SECRET_MINU_PORTAL?: string;

  // Minu API
  MINU_API_KEY?: string;
  MINU_API_BASE_URL?: string;
  WEBHOOK_SECRET_MINU?: string;

  // Minu SSO Secrets
  MINU_FIND_CLIENT_ID?: string;
  MINU_FIND_CLIENT_SECRET?: string;
  MINU_FRAME_CLIENT_ID?: string;
  MINU_FRAME_CLIENT_SECRET?: string;
  MINU_BUILD_CLIENT_ID?: string;
  MINU_BUILD_CLIENT_SECRET?: string;
  MINU_KEEP_CLIENT_ID?: string;
  MINU_KEEP_CLIENT_SECRET?: string;
  MINU_FIND_WEBHOOK_SECRET?: string;
  MINU_FRAME_WEBHOOK_SECRET?: string;
  MINU_BUILD_WEBHOOK_SECRET?: string;
  MINU_KEEP_WEBHOOK_SECRET?: string;
  MINU_WEBHOOK_SECRET?: string;
  OAUTH_ERROR_PAGE_URL?: string;

  // Dynamic access for webhook secrets
  [key: `WEBHOOK_SECRET_${string}`]: string | undefined;
  [key: `MINU_${string}_CLIENT_ID`]: string | undefined;
  [key: `MINU_${string}_CLIENT_SECRET`]: string | undefined;
  [key: `MINU_${string}_WEBHOOK_SECRET`]: string | undefined;
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
