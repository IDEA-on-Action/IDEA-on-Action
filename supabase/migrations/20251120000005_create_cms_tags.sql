-- Migration: CMS Tags Table
-- Created: 2025-11-20
-- Purpose: Global tags with usage tracking and categorization

-- Drop existing table if exists (fresh start for CMS v2)
DROP TABLE IF EXISTS public.cms_tags CASCADE;

-- Create cms_tags table
CREATE TABLE public.cms_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  name TEXT NOT NULL,
  description TEXT, -- Tag description (optional)
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0), -- Cached usage count
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'technical', 'business')),
  is_active BOOLEAN DEFAULT true, -- Show/hide tag
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_by UUID, -- References auth.users (soft reference)
  updated_by UUID -- References auth.users (soft reference)
);

-- Create indexes
CREATE UNIQUE INDEX idx_cms_tags_slug ON public.cms_tags(slug);
CREATE INDEX idx_cms_tags_category ON public.cms_tags(category);
CREATE INDEX idx_cms_tags_usage_count ON public.cms_tags(usage_count DESC);
CREATE INDEX idx_cms_tags_is_active ON public.cms_tags(is_active);
CREATE INDEX idx_cms_tags_created_at ON public.cms_tags(created_at DESC);

-- Enable RLS
ALTER TABLE public.cms_tags ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- SELECT: Public can view active tags, admins can view all
CREATE POLICY select_cms_tags_public
  ON public.cms_tags
  FOR SELECT
  USING (
    is_active = true
    OR public.is_admin_user(auth.uid())
  );

-- INSERT: Admins only
CREATE POLICY insert_cms_tags_admin
  ON public.cms_tags
  FOR INSERT
  WITH CHECK (
    public.is_admin_user(auth.uid())
  );

-- UPDATE: Admins only
CREATE POLICY update_cms_tags_admin
  ON public.cms_tags
  FOR UPDATE
  USING (
    public.is_admin_user(auth.uid())
  );

-- DELETE: Super admins and admins only (not editors)
CREATE POLICY delete_cms_tags_admin
  ON public.cms_tags
  FOR DELETE
  USING (
    public.can_admin_delete(auth.uid())
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp on every update
CREATE OR REPLACE FUNCTION update_cms_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_tags_updated_at
  BEFORE UPDATE ON public.cms_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_cms_tags_updated_at();

-- Set created_by on insert
CREATE OR REPLACE FUNCTION set_cms_tags_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_tags_set_created_by
  BEFORE INSERT ON public.cms_tags
  FOR EACH ROW
  EXECUTE FUNCTION set_cms_tags_created_by();

-- Update usage_count when tags are used in other tables
-- Note: This will be implemented via application logic or separate triggers
-- on portfolio_items, lab_items, and other tables that reference tags

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.cms_tags IS 'CMS: Global tags with usage tracking and categorization';
COMMENT ON COLUMN public.cms_tags.slug IS 'URL-friendly unique identifier (kebab-case, e.g., web-development)';
COMMENT ON COLUMN public.cms_tags.name IS 'Tag display name';
COMMENT ON COLUMN public.cms_tags.description IS 'Tag description (optional)';
COMMENT ON COLUMN public.cms_tags.usage_count IS 'Cached count of items using this tag';
COMMENT ON COLUMN public.cms_tags.category IS 'Tag category: general, technical, business';
COMMENT ON COLUMN public.cms_tags.is_active IS 'Show/hide tag on public pages';

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant SELECT to anonymous and authenticated users (RLS will filter)
GRANT SELECT ON public.cms_tags TO anon, authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (RLS will filter)
GRANT INSERT, UPDATE, DELETE ON public.cms_tags TO authenticated;
