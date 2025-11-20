-- Migration: CMS Activity Logs Table
-- Created: 2025-11-20
-- Purpose: Audit trail for all CMS operations with automatic logging triggers

-- Drop existing table if exists (fresh start for CMS v2)
DROP TABLE IF EXISTS public.cms_activity_logs CASCADE;

-- Create cms_activity_logs table
CREATE TABLE public.cms_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References auth.users (soft reference)
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'publish', 'unpublish')),
  table_name TEXT NOT NULL, -- Name of the table being modified
  record_id UUID NOT NULL, -- ID of the record being modified
  old_data JSONB, -- Previous state (NULL for create)
  new_data JSONB, -- New state (NULL for delete)
  ip_address TEXT, -- User's IP address
  user_agent TEXT, -- User's browser/client info
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Create indexes
CREATE INDEX idx_cms_activity_user_id ON public.cms_activity_logs(user_id);
CREATE INDEX idx_cms_activity_action ON public.cms_activity_logs(action);
CREATE INDEX idx_cms_activity_table_name ON public.cms_activity_logs(table_name);
CREATE INDEX idx_cms_activity_record_id ON public.cms_activity_logs(record_id);
CREATE INDEX idx_cms_activity_created_at ON public.cms_activity_logs(created_at DESC);
CREATE INDEX idx_cms_activity_table_record ON public.cms_activity_logs(table_name, record_id);

-- Enable RLS
ALTER TABLE public.cms_activity_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- SELECT: Admins can view their own logs, super admins can view all
CREATE POLICY select_cms_activity_own
  ON public.cms_activity_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
  );

-- INSERT: Authenticated users can create logs (via trigger only)
CREATE POLICY insert_cms_activity_authenticated
  ON public.cms_activity_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- UPDATE, DELETE: Not allowed (audit logs are immutable)
-- No policies = no one can update or delete

-- =====================================================
-- ACTIVITY LOGGING TRIGGER FUNCTION
-- =====================================================

-- Generic function to log CMS activity
CREATE OR REPLACE FUNCTION log_cms_activity()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  old_data_json JSONB;
  new_data_json JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
    old_data_json := NULL;
    new_data_json := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if is_published changed to determine publish/unpublish
    IF (NEW.is_published IS DISTINCT FROM OLD.is_published) THEN
      IF NEW.is_published = true THEN
        action_type := 'publish';
      ELSE
        action_type := 'unpublish';
      END IF;
    ELSE
      action_type := 'update';
    END IF;
    old_data_json := to_jsonb(OLD);
    new_data_json := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
    old_data_json := to_jsonb(OLD);
    new_data_json := NULL;
  END IF;

  -- Insert activity log
  INSERT INTO public.cms_activity_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
    -- ip_address and user_agent can be set via application logic
  ) VALUES (
    auth.uid(),
    action_type,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    old_data_json,
    new_data_json
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_cms_activity IS 'Automatically log CMS table operations (INSERT, UPDATE, DELETE)';

-- =====================================================
-- APPLY TRIGGERS TO ALL CMS TABLES
-- =====================================================

-- Roadmap Items
DROP TRIGGER IF EXISTS cms_roadmap_items_log_activity ON public.cms_roadmap_items;
CREATE TRIGGER cms_roadmap_items_log_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION log_cms_activity();

-- Portfolio Items
DROP TRIGGER IF EXISTS cms_portfolio_items_log_activity ON public.cms_portfolio_items;
CREATE TRIGGER cms_portfolio_items_log_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION log_cms_activity();

-- Lab Items
DROP TRIGGER IF EXISTS cms_lab_items_log_activity ON public.cms_lab_items;
CREATE TRIGGER cms_lab_items_log_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_lab_items
  FOR EACH ROW
  EXECUTE FUNCTION log_cms_activity();

-- Team Members
DROP TRIGGER IF EXISTS cms_team_members_log_activity ON public.cms_team_members;
CREATE TRIGGER cms_team_members_log_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_team_members
  FOR EACH ROW
  EXECUTE FUNCTION log_cms_activity();

-- Blog Categories
DROP TRIGGER IF EXISTS cms_blog_categories_log_activity ON public.cms_blog_categories;
CREATE TRIGGER cms_blog_categories_log_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION log_cms_activity();

-- Tags
DROP TRIGGER IF EXISTS cms_tags_log_activity ON public.cms_tags;
CREATE TRIGGER cms_tags_log_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_tags
  FOR EACH ROW
  EXECUTE FUNCTION log_cms_activity();

-- Media Library
DROP TRIGGER IF EXISTS cms_media_library_log_activity ON public.cms_media_library;
CREATE TRIGGER cms_media_library_log_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_media_library
  FOR EACH ROW
  EXECUTE FUNCTION log_cms_activity();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get recent activity for a specific user
CREATE OR REPLACE FUNCTION get_user_recent_activity(user_uuid UUID, limit_count INTEGER DEFAULT 50)
RETURNS SETOF cms_activity_logs
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to view their own activity, or super admins to view all
  IF user_uuid = auth.uid() OR public.is_super_admin(auth.uid()) THEN
    RETURN QUERY
    SELECT * FROM cms_activity_logs
    WHERE user_id = user_uuid
    ORDER BY created_at DESC
    LIMIT limit_count;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Cannot view other users'' activity';
  END IF;
END;
$$;

COMMENT ON FUNCTION get_user_recent_activity IS 'Get recent activity logs for a specific user (security definer)';

-- Get recent activity for a specific table/record
CREATE OR REPLACE FUNCTION get_record_activity(table_name_param TEXT, record_id_param UUID)
RETURNS SETOF cms_activity_logs
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can view record activity
  IF public.is_admin_user(auth.uid()) THEN
    RETURN QUERY
    SELECT * FROM cms_activity_logs
    WHERE table_name = table_name_param
      AND record_id = record_id_param
    ORDER BY created_at DESC;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
END;
$$;

COMMENT ON FUNCTION get_record_activity IS 'Get activity logs for a specific record (admin only)';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.cms_activity_logs IS 'CMS: Audit trail for all CMS operations (immutable)';
COMMENT ON COLUMN public.cms_activity_logs.user_id IS 'User who performed the action (auth.users)';
COMMENT ON COLUMN public.cms_activity_logs.action IS 'Action type: create, update, delete, publish, unpublish';
COMMENT ON COLUMN public.cms_activity_logs.table_name IS 'Name of the CMS table being modified';
COMMENT ON COLUMN public.cms_activity_logs.record_id IS 'UUID of the record being modified';
COMMENT ON COLUMN public.cms_activity_logs.old_data IS 'Previous state as JSONB (NULL for create)';
COMMENT ON COLUMN public.cms_activity_logs.new_data IS 'New state as JSONB (NULL for delete)';
COMMENT ON COLUMN public.cms_activity_logs.ip_address IS 'User''s IP address (optional, set by application)';
COMMENT ON COLUMN public.cms_activity_logs.user_agent IS 'User''s browser/client info (optional)';

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users (RLS will filter)
GRANT SELECT ON public.cms_activity_logs TO authenticated;

-- Grant INSERT to authenticated users (RLS will filter)
GRANT INSERT ON public.cms_activity_logs TO authenticated;

-- No UPDATE or DELETE permissions (audit logs are immutable)
