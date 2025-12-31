/**
 * Service Integrations TypeScript Type Definitions
 *
 * Types for external service integrations (Notion, GitHub, Slack, etc.)
 * Created: 2025-11-25
 * Related migrations:
 * - 20251125000001_create_service_integrations.sql
 */

// ============================================================================
// Integration Type Enum
// ============================================================================

/**
 * Supported integration types
 */
export type IntegrationType =
  | 'notion'           // Notion workspace/page integration
  | 'github'           // GitHub repository integration
  | 'slack'            // Slack channel integration
  | 'google_calendar'  // Google Calendar integration
  | 'stripe'           // Stripe payment integration
  | 'custom';          // Custom webhook/API integration

/**
 * Authentication types for integrations
 */
export type AuthType = 'api_key' | 'oauth2' | 'webhook' | 'none';

/**
 * Sync status values
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'disabled';

/**
 * Health status values
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// ============================================================================
// Configuration Types (per integration type)
// ============================================================================

/**
 * Notion integration configuration
 */
export interface NotionConfig {
  workspace_id?: string;
  page_id?: string;
  database_id?: string;
  parent_page_id?: string;
}

/**
 * GitHub integration configuration
 */
export interface GitHubConfig {
  owner: string;
  repo: string;
  branch?: string;
  webhook_secret?: string;
  sync_issues?: boolean;
  sync_releases?: boolean;
}

/**
 * Slack integration configuration
 */
export interface SlackConfig {
  workspace_id?: string;
  channel_id?: string;
  bot_token_key?: string; // Vault key reference
  notifications?: {
    on_sync?: boolean;
    on_error?: boolean;
    on_update?: boolean;
  };
}

/**
 * Google Calendar integration configuration
 */
export interface GoogleCalendarConfig {
  calendar_id?: string;
  sync_events?: boolean;
  event_prefix?: string;
}

/**
 * Stripe integration configuration
 */
export interface StripeConfig {
  product_id?: string;
  price_ids?: string[];
  webhook_endpoint_id?: string;
}

/**
 * Custom integration configuration
 */
export interface CustomConfig {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body_template?: string;
  response_mapping?: Record<string, string>;
}

/**
 * Union type for all config types
 */
export type IntegrationConfig =
  | NotionConfig
  | GitHubConfig
  | SlackConfig
  | GoogleCalendarConfig
  | StripeConfig
  | CustomConfig
  | Record<string, unknown>;

// ============================================================================
// Sync Metadata Types
// ============================================================================

/**
 * Sync metadata for cursor-based pagination
 */
export interface SyncMetadata {
  cursor?: string;
  page_token?: string;
  last_item_id?: string;
  last_modified?: string;
  total_items?: number;
  synced_items?: number;
}

// ============================================================================
// Main Integration Types
// ============================================================================

/**
 * Service Integration entity
 * Matches: public.service_integrations table
 */
export interface ServiceIntegration {
  id: string;
  service_id: string | null;

  // Integration info
  integration_type: IntegrationType;
  name: string;
  external_id: string | null;
  external_url: string | null;

  // Configuration
  config: IntegrationConfig;
  auth_type: AuthType;
  credentials_key: string | null;

  // Sync status
  sync_status: SyncStatus;
  last_synced_at: string | null;
  next_sync_at: string | null;
  sync_error: string | null;
  sync_metadata: SyncMetadata;

  // Health
  health_status: HealthStatus;
  last_health_check_at: string | null;
  health_check_url: string | null;

  // Flags
  is_active: boolean;
  is_bidirectional: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Integration with service details (joined query)
 */
export interface ServiceIntegrationWithService extends ServiceIntegration {
  service?: {
    id: string;
    title: string;
    slug?: string;
    status: string;
  };
}

// ============================================================================
// Sync Log Types
// ============================================================================

/**
 * Sync type
 */
export type SyncType = 'manual' | 'scheduled' | 'webhook' | 'realtime';

/**
 * Sync direction
 */
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';

/**
 * Sync log status
 */
export type SyncLogStatus = 'started' | 'completed' | 'failed' | 'cancelled';

/**
 * Integration sync log entry
 * Matches: public.service_integration_sync_logs table
 */
export interface IntegrationSyncLog {
  id: string;
  integration_id: string;

  // Sync details
  sync_type: SyncType;
  sync_direction: SyncDirection;

  // Results
  status: SyncLogStatus;
  items_processed: number;
  items_created: number;
  items_updated: number;
  items_deleted: number;
  items_failed: number;

  // Error details
  error_message: string | null;
  error_details: Record<string, unknown>;

  // Timing
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;

  // Metadata
  triggered_by: string | null;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Form/Input Types
// ============================================================================

/**
 * Create integration input
 */
export interface CreateIntegrationInput {
  service_id?: string;
  integration_type: IntegrationType;
  name: string;
  external_id?: string;
  external_url?: string;
  config?: IntegrationConfig;
  auth_type?: AuthType;
  credentials_key?: string;
  health_check_url?: string;
  is_bidirectional?: boolean;
}

/**
 * Update integration input
 */
export interface UpdateIntegrationInput {
  name?: string;
  external_id?: string;
  external_url?: string;
  config?: IntegrationConfig;
  auth_type?: AuthType;
  credentials_key?: string;
  health_check_url?: string;
  is_active?: boolean;
  is_bidirectional?: boolean;
  sync_status?: SyncStatus;
}

/**
 * Trigger sync input
 */
export interface TriggerSyncInput {
  integration_id: string;
  sync_type?: SyncType;
  sync_direction?: SyncDirection;
  force?: boolean;
}

// ============================================================================
// Filter/Query Types
// ============================================================================

/**
 * Integration list filters
 */
export interface IntegrationFilters {
  service_id?: string;
  integration_type?: IntegrationType;
  sync_status?: SyncStatus;
  health_status?: HealthStatus;
  is_active?: boolean;
}

/**
 * Sync log filters
 */
export interface SyncLogFilters {
  integration_id?: string;
  status?: SyncLogStatus;
  sync_type?: SyncType;
  from_date?: string;
  to_date?: string;
  limit?: number;
}

// ============================================================================
// UI/Display Types
// ============================================================================

/**
 * Integration type display info
 */
export interface IntegrationTypeInfo {
  type: IntegrationType;
  name: string;
  name_ko: string;
  icon: string;
  color: string;
  description: string;
  description_ko: string;
}

/**
 * Predefined integration type info
 */
export const INTEGRATION_TYPE_INFO: Record<IntegrationType, IntegrationTypeInfo> = {
  notion: {
    type: 'notion',
    name: 'Notion',
    name_ko: 'Notion',
    icon: 'FileText',
    color: 'gray',
    description: 'Sync with Notion workspaces and databases',
    description_ko: 'Notion 워크스페이스 및 데이터베이스 연동',
  },
  github: {
    type: 'github',
    name: 'GitHub',
    name_ko: 'GitHub',
    icon: 'Github',
    color: 'gray',
    description: 'Connect to GitHub repositories and issues',
    description_ko: 'GitHub 저장소 및 이슈 연동',
  },
  slack: {
    type: 'slack',
    name: 'Slack',
    name_ko: 'Slack',
    icon: 'MessageSquare',
    color: 'purple',
    description: 'Send notifications to Slack channels',
    description_ko: 'Slack 채널 알림 연동',
  },
  google_calendar: {
    type: 'google_calendar',
    name: 'Google Calendar',
    name_ko: 'Google 캘린더',
    icon: 'Calendar',
    color: 'blue',
    description: 'Sync with Google Calendar events',
    description_ko: 'Google 캘린더 일정 연동',
  },
  stripe: {
    type: 'stripe',
    name: 'Stripe',
    name_ko: 'Stripe',
    icon: 'CreditCard',
    color: 'indigo',
    description: 'Connect to Stripe for payments',
    description_ko: 'Stripe 결제 연동',
  },
  custom: {
    type: 'custom',
    name: 'Custom',
    name_ko: '커스텀',
    icon: 'Webhook',
    color: 'orange',
    description: 'Custom webhook or API integration',
    description_ko: '커스텀 웹훅/API 연동',
  },
};

/**
 * Sync status display info
 */
export const SYNC_STATUS_INFO: Record<SyncStatus, { label: string; label_ko: string; color: string }> = {
  pending: { label: 'Pending', label_ko: '대기 중', color: 'gray' },
  syncing: { label: 'Syncing', label_ko: '동기화 중', color: 'blue' },
  synced: { label: 'Synced', label_ko: '동기화 완료', color: 'green' },
  error: { label: 'Error', label_ko: '오류', color: 'red' },
  disabled: { label: 'Disabled', label_ko: '비활성화', color: 'gray' },
};

/**
 * Health status display info
 */
export const HEALTH_STATUS_INFO: Record<HealthStatus, { label: string; label_ko: string; color: string }> = {
  healthy: { label: 'Healthy', label_ko: '정상', color: 'green' },
  degraded: { label: 'Degraded', label_ko: '성능 저하', color: 'yellow' },
  unhealthy: { label: 'Unhealthy', label_ko: '비정상', color: 'red' },
  unknown: { label: 'Unknown', label_ko: '알 수 없음', color: 'gray' },
};
