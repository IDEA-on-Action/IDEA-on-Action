-- =====================================================
-- Content Versions Table
-- CMS Phase 5: Version Control System
-- Created: 2025-11-23
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Create content_type enum
-- =====================================================
DO $$ BEGIN
  CREATE TYPE content_version_type AS ENUM ('blog', 'notice', 'page');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. Create content_versions table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content reference
  content_type content_version_type NOT NULL,
  content_id UUID NOT NULL,

  -- Version info
  version_number INTEGER NOT NULL DEFAULT 1,

  -- Snapshot of content at this version (JSONB for flexibility)
  content_snapshot JSONB NOT NULL,

  -- Metadata
  change_summary TEXT,
  is_auto_save BOOLEAN DEFAULT false,

  -- Audit fields
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Ensure unique version numbers per content
  CONSTRAINT unique_content_version UNIQUE (content_type, content_id, version_number)
);

-- =====================================================
-- 3. Create indexes for performance
-- =====================================================

-- Index for fetching versions by content
CREATE INDEX IF NOT EXISTS idx_content_versions_content_lookup
  ON public.content_versions(content_type, content_id, version_number DESC);

-- Index for fetching versions by user
CREATE INDEX IF NOT EXISTS idx_content_versions_created_by
  ON public.content_versions(created_by);

-- Index for fetching recent versions
CREATE INDEX IF NOT EXISTS idx_content_versions_created_at
  ON public.content_versions(created_at DESC);

-- Index for auto-save filtering
CREATE INDEX IF NOT EXISTS idx_content_versions_auto_save
  ON public.content_versions(content_type, content_id, is_auto_save)
  WHERE is_auto_save = true;

-- =====================================================
-- 4. Enable Row Level Security
-- =====================================================
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS Policies
-- =====================================================

-- Allow authenticated users to read versions
CREATE POLICY "Allow authenticated users to read content versions"
  ON public.content_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create versions
CREATE POLICY "Allow authenticated users to create content versions"
  ON public.content_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Only creator or admins can delete versions
CREATE POLICY "Allow version creators or admins to delete versions"
  ON public.content_versions
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- 6. Functions for version management
-- =====================================================

-- Function to get next version number (with search_path security)
CREATE OR REPLACE FUNCTION public.get_next_version_number(
  p_content_type content_version_type,
  p_content_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO v_max_version
  FROM public.content_versions
  WHERE content_type = p_content_type
    AND content_id = p_content_id;

  RETURN v_max_version + 1;
END;
$$;

-- Function to create a new version (with search_path security)
CREATE OR REPLACE FUNCTION public.create_content_version(
  p_content_type content_version_type,
  p_content_id UUID,
  p_content_snapshot JSONB,
  p_change_summary TEXT DEFAULT NULL,
  p_is_auto_save BOOLEAN DEFAULT false
)
RETURNS public.content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_version INTEGER;
  v_result public.content_versions;
BEGIN
  -- Get next version number
  v_next_version := public.get_next_version_number(p_content_type, p_content_id);

  -- Insert new version
  INSERT INTO public.content_versions (
    content_type,
    content_id,
    version_number,
    content_snapshot,
    change_summary,
    is_auto_save,
    created_by
  )
  VALUES (
    p_content_type,
    p_content_id,
    v_next_version,
    p_content_snapshot,
    p_change_summary,
    p_is_auto_save,
    auth.uid()
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to get version history (with pagination)
CREATE OR REPLACE FUNCTION public.get_version_history(
  p_content_type content_version_type,
  p_content_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_include_auto_saves BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  content_type content_version_type,
  content_id UUID,
  version_number INTEGER,
  content_snapshot JSONB,
  change_summary TEXT,
  is_auto_save BOOLEAN,
  created_by UUID,
  created_at TIMESTAMPTZ,
  creator_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cv.id,
    cv.content_type,
    cv.content_id,
    cv.version_number,
    cv.content_snapshot,
    cv.change_summary,
    cv.is_auto_save,
    cv.created_by,
    cv.created_at,
    u.email as creator_email
  FROM public.content_versions cv
  LEFT JOIN auth.users u ON cv.created_by = u.id
  WHERE cv.content_type = p_content_type
    AND cv.content_id = p_content_id
    AND (p_include_auto_saves OR cv.is_auto_save = false)
  ORDER BY cv.version_number DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get a specific version
CREATE OR REPLACE FUNCTION public.get_content_version(
  p_content_type content_version_type,
  p_content_id UUID,
  p_version_number INTEGER
)
RETURNS public.content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.content_versions;
BEGIN
  SELECT * INTO v_result
  FROM public.content_versions
  WHERE content_type = p_content_type
    AND content_id = p_content_id
    AND version_number = p_version_number;

  RETURN v_result;
END;
$$;

-- Function to get latest version
CREATE OR REPLACE FUNCTION public.get_latest_content_version(
  p_content_type content_version_type,
  p_content_id UUID,
  p_include_auto_saves BOOLEAN DEFAULT false
)
RETURNS public.content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.content_versions;
BEGIN
  SELECT * INTO v_result
  FROM public.content_versions
  WHERE content_type = p_content_type
    AND content_id = p_content_id
    AND (p_include_auto_saves OR is_auto_save = false)
  ORDER BY version_number DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- Function to cleanup old auto-saves (keep last N)
CREATE OR REPLACE FUNCTION public.cleanup_old_auto_saves(
  p_content_type content_version_type,
  p_content_id UUID,
  p_keep_count INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH versions_to_delete AS (
    SELECT id
    FROM public.content_versions
    WHERE content_type = p_content_type
      AND content_id = p_content_id
      AND is_auto_save = true
    ORDER BY version_number DESC
    OFFSET p_keep_count
  )
  DELETE FROM public.content_versions
  WHERE id IN (SELECT id FROM versions_to_delete);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Function to count versions
CREATE OR REPLACE FUNCTION public.count_content_versions(
  p_content_type content_version_type,
  p_content_id UUID,
  p_include_auto_saves BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.content_versions
  WHERE content_type = p_content_type
    AND content_id = p_content_id
    AND (p_include_auto_saves OR is_auto_save = false);

  RETURN v_count;
END;
$$;

-- =====================================================
-- 7. Grant permissions
-- =====================================================
GRANT USAGE ON TYPE content_version_type TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.content_versions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_version_number TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_content_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_version_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_content_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_auto_saves TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_content_versions TO authenticated;

-- =====================================================
-- 8. Comments
-- =====================================================
COMMENT ON TABLE public.content_versions IS 'Stores version history for CMS content (blog posts, notices, pages)';
COMMENT ON COLUMN public.content_versions.content_type IS 'Type of content (blog, notice, page)';
COMMENT ON COLUMN public.content_versions.content_id IS 'Reference to the original content ID';
COMMENT ON COLUMN public.content_versions.version_number IS 'Sequential version number starting from 1';
COMMENT ON COLUMN public.content_versions.content_snapshot IS 'Complete snapshot of content at this version';
COMMENT ON COLUMN public.content_versions.change_summary IS 'Optional description of changes in this version';
COMMENT ON COLUMN public.content_versions.is_auto_save IS 'Whether this version was created by auto-save';
COMMENT ON FUNCTION public.create_content_version IS 'Creates a new version with auto-incrementing version number';
COMMENT ON FUNCTION public.get_version_history IS 'Retrieves paginated version history for content';
COMMENT ON FUNCTION public.cleanup_old_auto_saves IS 'Removes old auto-save versions, keeping the most recent N';
