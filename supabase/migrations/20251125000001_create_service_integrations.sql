-- Migration: Service Integrations Table
-- Created: 2025-11-25
-- Purpose: External service integration settings for Notion, GitHub, Slack, etc.
-- Part of: Service Registry & Integration Platform

-- =====================================================
-- 1. INTEGRATION_TYPES ENUM (Reference Table)
-- =====================================================
-- Using CHECK constraint instead of enum for easier extensibility

-- =====================================================
-- 2. SERVICE_INTEGRATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to services (optional - can also be standalone integrations)
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,

  -- Integration type
  integration_type TEXT NOT NULL CHECK (integration_type IN (
    'notion',           -- Notion workspace/page integration
    'github',           -- GitHub repository integration
    'slack',            -- Slack channel integration
    'google_calendar',  -- Google Calendar integration
    'stripe',           -- Stripe payment integration
    'custom'            -- Custom webhook/API integration
  )),

  -- Integration identifier
  name TEXT NOT NULL,                    -- Display name (e.g., "Main Notion Workspace")
  external_id TEXT,                       -- External service ID (Notion page ID, GitHub repo, etc.)
  external_url TEXT,                      -- External URL for quick access

  -- Configuration (JSONB for flexibility)
  config JSONB DEFAULT '{}'::jsonb,       -- Type-specific configuration
  -- Notion: { workspace_id, page_id, database_id }
  -- GitHub: { owner, repo, branch, webhook_secret }
  -- Slack: { workspace_id, channel_id }
  -- Custom: { endpoint, method, headers }

  -- Authentication reference (stored in Vault, only reference here)
  auth_type TEXT DEFAULT 'api_key' CHECK (auth_type IN ('api_key', 'oauth2', 'webhook', 'none')),
  credentials_key TEXT,                   -- Key name in environment or Vault (e.g., "NOTION_API_KEY")

  -- Sync status
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN (
    'pending',     -- Never synced
    'syncing',     -- Currently syncing
    'synced',      -- Successfully synced
    'error',       -- Sync failed
    'disabled'     -- Sync disabled
  )),
  last_synced_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_error TEXT,                        -- Last error message if any
  sync_metadata JSONB DEFAULT '{}'::jsonb, -- Sync-related metadata (cursor, page token, etc.)

  -- Health check
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  last_health_check_at TIMESTAMPTZ,
  health_check_url TEXT,                  -- URL to check for health status

  -- Status flags
  is_active BOOLEAN DEFAULT true,
  is_bidirectional BOOLEAN DEFAULT false, -- Two-way sync or one-way

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,

  -- Unique constraint: one integration type per service
  UNIQUE(service_id, integration_type)
);

-- =====================================================
-- 3. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_service_integrations_service_id
  ON public.service_integrations(service_id);

CREATE INDEX IF NOT EXISTS idx_service_integrations_type
  ON public.service_integrations(integration_type);

CREATE INDEX IF NOT EXISTS idx_service_integrations_sync_status
  ON public.service_integrations(sync_status);

CREATE INDEX IF NOT EXISTS idx_service_integrations_health_status
  ON public.service_integrations(health_status);

CREATE INDEX IF NOT EXISTS idx_service_integrations_active
  ON public.service_integrations(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_service_integrations_next_sync
  ON public.service_integrations(next_sync_at)
  WHERE is_active = true AND sync_status != 'disabled';

-- JSONB indexes for config queries
CREATE INDEX IF NOT EXISTS idx_service_integrations_config
  ON public.service_integrations USING GIN (config);

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================
ALTER TABLE public.service_integrations ENABLE ROW LEVEL SECURITY;

-- SELECT: Admins can view all integrations
CREATE POLICY select_service_integrations_admin
  ON public.service_integrations
  FOR SELECT
  USING (
    public.is_admin_user(auth.uid())
  );

-- INSERT: Admins only
CREATE POLICY insert_service_integrations_admin
  ON public.service_integrations
  FOR INSERT
  WITH CHECK (
    public.is_admin_user(auth.uid())
  );

-- UPDATE: Admins only
CREATE POLICY update_service_integrations_admin
  ON public.service_integrations
  FOR UPDATE
  USING (
    public.is_admin_user(auth.uid())
  );

-- DELETE: Super admins and admins only
CREATE POLICY delete_service_integrations_admin
  ON public.service_integrations
  FOR DELETE
  USING (
    public.can_admin_delete(auth.uid())
  );

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Update updated_at timestamp on every update
CREATE OR REPLACE FUNCTION update_service_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_integrations_updated_at
  BEFORE UPDATE ON public.service_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_service_integrations_updated_at();

-- Set created_by on insert
CREATE OR REPLACE FUNCTION set_service_integrations_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_integrations_set_created_by
  BEFORE INSERT ON public.service_integrations
  FOR EACH ROW
  EXECUTE FUNCTION set_service_integrations_created_by();

-- =====================================================
-- 6. COMMENTS
-- =====================================================
COMMENT ON TABLE public.service_integrations IS 'External service integration settings (Notion, GitHub, Slack, etc.)';
COMMENT ON COLUMN public.service_integrations.service_id IS 'Optional reference to services table';
COMMENT ON COLUMN public.service_integrations.integration_type IS 'Type of integration: notion, github, slack, google_calendar, stripe, custom';
COMMENT ON COLUMN public.service_integrations.name IS 'Display name for the integration';
COMMENT ON COLUMN public.service_integrations.external_id IS 'External service identifier (Notion page ID, GitHub repo name, etc.)';
COMMENT ON COLUMN public.service_integrations.external_url IS 'Direct URL to external resource';
COMMENT ON COLUMN public.service_integrations.config IS 'JSONB configuration specific to integration type';
COMMENT ON COLUMN public.service_integrations.auth_type IS 'Authentication method: api_key, oauth2, webhook, none';
COMMENT ON COLUMN public.service_integrations.credentials_key IS 'Key name for credentials lookup (env var or Vault key)';
COMMENT ON COLUMN public.service_integrations.sync_status IS 'Current sync status: pending, syncing, synced, error, disabled';
COMMENT ON COLUMN public.service_integrations.sync_metadata IS 'Sync cursor, page tokens, and other sync state';
COMMENT ON COLUMN public.service_integrations.health_status IS 'Health check status: healthy, degraded, unhealthy, unknown';
COMMENT ON COLUMN public.service_integrations.is_bidirectional IS 'Whether sync is two-way (true) or one-way (false)';

-- =====================================================
-- 7. PERMISSIONS
-- =====================================================
GRANT SELECT ON public.service_integrations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_integrations TO authenticated;

-- =====================================================
-- 8. INTEGRATION SYNC HISTORY TABLE (Audit Log)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.service_integrations(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'scheduled', 'webhook', 'realtime')),
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('inbound', 'outbound', 'bidirectional')),

  -- Results
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
  items_processed INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_deleted INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  -- Error details
  error_message TEXT,
  error_details JSONB DEFAULT '{}'::jsonb,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER, -- Calculated on completion

  -- Metadata
  triggered_by UUID, -- User who triggered (null for scheduled)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for sync logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration_id
  ON public.service_integration_sync_logs(integration_id);

CREATE INDEX IF NOT EXISTS idx_sync_logs_status
  ON public.service_integration_sync_logs(status);

CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at
  ON public.service_integration_sync_logs(started_at DESC);

-- RLS for sync logs
ALTER TABLE public.service_integration_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_sync_logs_admin
  ON public.service_integration_sync_logs
  FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY insert_sync_logs_admin
  ON public.service_integration_sync_logs
  FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Grant permissions
GRANT SELECT, INSERT ON public.service_integration_sync_logs TO authenticated;

COMMENT ON TABLE public.service_integration_sync_logs IS 'Audit log for integration sync operations';
