-- Migration: CMS Blog Categories Table
-- Created: 2025-11-20
-- Purpose: Blog categories with color, icon, and post count tracking

-- Drop existing table if exists (fresh start for CMS v2)
DROP TABLE IF EXISTS public.cms_blog_categories CASCADE;

-- Create cms_blog_categories table
CREATE TABLE public.cms_blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  name TEXT NOT NULL,
  description TEXT, -- Category description
  color TEXT DEFAULT '#3b82f6', -- Hex color code (default: blue-500)
  icon TEXT DEFAULT 'folder', -- Lucide icon name
  post_count INTEGER DEFAULT 0 CHECK (post_count >= 0), -- Cached post count
  display_order INTEGER DEFAULT 0, -- Manual ordering
  is_active BOOLEAN DEFAULT true, -- Show/hide category
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_by UUID, -- References auth.users (soft reference)
  updated_by UUID -- References auth.users (soft reference)
);

-- Create indexes
CREATE UNIQUE INDEX idx_cms_blog_categories_slug ON public.cms_blog_categories(slug);
CREATE INDEX idx_cms_blog_categories_is_active ON public.cms_blog_categories(is_active);
CREATE INDEX idx_cms_blog_categories_display_order ON public.cms_blog_categories(display_order DESC);
CREATE INDEX idx_cms_blog_categories_post_count ON public.cms_blog_categories(post_count DESC);

-- Enable RLS
ALTER TABLE public.cms_blog_categories ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- SELECT: Public can view active categories, admins can view all
CREATE POLICY select_cms_blog_categories_public
  ON public.cms_blog_categories
  FOR SELECT
  USING (
    is_active = true
    OR public.is_admin_user(auth.uid())
  );

-- INSERT: Admins only
CREATE POLICY insert_cms_blog_categories_admin
  ON public.cms_blog_categories
  FOR INSERT
  WITH CHECK (
    public.is_admin_user(auth.uid())
  );

-- UPDATE: Admins only
CREATE POLICY update_cms_blog_categories_admin
  ON public.cms_blog_categories
  FOR UPDATE
  USING (
    public.is_admin_user(auth.uid())
  );

-- DELETE: Super admins and admins only (not editors)
CREATE POLICY delete_cms_blog_categories_admin
  ON public.cms_blog_categories
  FOR DELETE
  USING (
    public.can_admin_delete(auth.uid())
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp on every update
CREATE OR REPLACE FUNCTION update_cms_blog_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_blog_categories_updated_at
  BEFORE UPDATE ON public.cms_blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_cms_blog_categories_updated_at();

-- Set created_by on insert
CREATE OR REPLACE FUNCTION set_cms_blog_categories_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_blog_categories_set_created_by
  BEFORE INSERT ON public.cms_blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION set_cms_blog_categories_created_by();

-- Update post_count when blog_posts change
-- Note: This trigger will be added when blog_posts table schema is updated
-- For now, post_count must be manually updated or via application logic

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.cms_blog_categories IS 'CMS: Blog categories with color, icon, and post count tracking';
COMMENT ON COLUMN public.cms_blog_categories.slug IS 'URL-friendly unique identifier (e.g., web-development)';
COMMENT ON COLUMN public.cms_blog_categories.name IS 'Category display name';
COMMENT ON COLUMN public.cms_blog_categories.description IS 'Category description (optional)';
COMMENT ON COLUMN public.cms_blog_categories.color IS 'Hex color code for category badge (default: #3b82f6)';
COMMENT ON COLUMN public.cms_blog_categories.icon IS 'Lucide icon name (e.g., folder, tag, layers)';
COMMENT ON COLUMN public.cms_blog_categories.post_count IS 'Cached count of blog posts in this category';
COMMENT ON COLUMN public.cms_blog_categories.display_order IS 'Manual ordering (higher = top)';
COMMENT ON COLUMN public.cms_blog_categories.is_active IS 'Show/hide category on public pages';

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant SELECT to anonymous and authenticated users (RLS will filter)
GRANT SELECT ON public.cms_blog_categories TO anon, authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (RLS will filter)
GRANT INSERT, UPDATE, DELETE ON public.cms_blog_categories TO authenticated;
