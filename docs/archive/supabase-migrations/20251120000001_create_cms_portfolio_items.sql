-- Migration: CMS Portfolio Items Table
-- Created: 2025-11-20
-- Purpose: Portfolio case studies with detailed project information, metrics, and team collaboration

-- Drop existing table if exists (fresh start for CMS v2)
DROP TABLE IF EXISTS public.cms_portfolio_items CASCADE;

-- Create cms_portfolio_items table
CREATE TABLE public.cms_portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'on_hold')),
  summary TEXT NOT NULL, -- Short description (1-2 sentences)
  description TEXT, -- Full markdown description
  metrics JSONB DEFAULT '{}'::jsonb, -- Project metrics: {users, revenue, satisfaction, etc.}
  tech_stack TEXT[] DEFAULT '{}', -- Array of technology names
  team_members TEXT[] DEFAULT '{}', -- Array of team member names
  links JSONB DEFAULT '{}'::jsonb, -- External links: {website, github, demo, docs}
  timeline JSONB DEFAULT '{}'::jsonb, -- Project timeline: {start, end, phases: [{name, start, end}]}
  tags TEXT[] DEFAULT '{}', -- Array of tag slugs
  thumbnail_url TEXT, -- Main thumbnail image
  gallery_urls TEXT[] DEFAULT '{}', -- Array of gallery image URLs
  is_featured BOOLEAN DEFAULT false, -- Pin to top of portfolio
  display_order INTEGER DEFAULT 0, -- Manual ordering
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_by UUID, -- References auth.users (soft reference)
  updated_by UUID -- References auth.users (soft reference)
);

-- Create indexes
CREATE UNIQUE INDEX idx_cms_portfolio_slug ON public.cms_portfolio_items(slug);
CREATE INDEX idx_cms_portfolio_status ON public.cms_portfolio_items(status);
CREATE INDEX idx_cms_portfolio_is_featured ON public.cms_portfolio_items(is_featured);
CREATE INDEX idx_cms_portfolio_is_published ON public.cms_portfolio_items(is_published);
CREATE INDEX idx_cms_portfolio_display_order ON public.cms_portfolio_items(display_order DESC);
CREATE INDEX idx_cms_portfolio_created_at ON public.cms_portfolio_items(created_at DESC);
CREATE INDEX idx_cms_portfolio_tags ON public.cms_portfolio_items USING GIN (tags);
CREATE INDEX idx_cms_portfolio_tech_stack ON public.cms_portfolio_items USING GIN (tech_stack);
CREATE INDEX idx_cms_portfolio_metrics ON public.cms_portfolio_items USING GIN (metrics);

-- Enable RLS
ALTER TABLE public.cms_portfolio_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- SELECT: Public can view published items, admins can view all
CREATE POLICY select_cms_portfolio_public
  ON public.cms_portfolio_items
  FOR SELECT
  USING (
    is_published = true
    OR public.is_admin_user(auth.uid())
  );

-- INSERT: Admins only
CREATE POLICY insert_cms_portfolio_admin
  ON public.cms_portfolio_items
  FOR INSERT
  WITH CHECK (
    public.is_admin_user(auth.uid())
  );

-- UPDATE: Admins only
CREATE POLICY update_cms_portfolio_admin
  ON public.cms_portfolio_items
  FOR UPDATE
  USING (
    public.is_admin_user(auth.uid())
  );

-- DELETE: Super admins and admins only (not editors)
CREATE POLICY delete_cms_portfolio_admin
  ON public.cms_portfolio_items
  FOR DELETE
  USING (
    public.can_admin_delete(auth.uid())
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp on every update
CREATE OR REPLACE FUNCTION update_cms_portfolio_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_portfolio_items_updated_at
  BEFORE UPDATE ON public.cms_portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cms_portfolio_items_updated_at();

-- Set created_by on insert
CREATE OR REPLACE FUNCTION set_cms_portfolio_items_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_portfolio_items_set_created_by
  BEFORE INSERT ON public.cms_portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION set_cms_portfolio_items_created_by();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.cms_portfolio_items IS 'CMS: Portfolio case studies with detailed project information';
COMMENT ON COLUMN public.cms_portfolio_items.slug IS 'URL-friendly unique identifier (e.g., project-name-2024)';
COMMENT ON COLUMN public.cms_portfolio_items.status IS 'Project status: planning, active, completed, on_hold';
COMMENT ON COLUMN public.cms_portfolio_items.summary IS 'Short description (1-2 sentences) for cards';
COMMENT ON COLUMN public.cms_portfolio_items.description IS 'Full markdown description for detail page';
COMMENT ON COLUMN public.cms_portfolio_items.metrics IS 'JSONB: {users: 1000, revenue: 50000, satisfaction: 4.8}';
COMMENT ON COLUMN public.cms_portfolio_items.tech_stack IS 'Array of technology names (e.g., ["React", "Node.js", "PostgreSQL"])';
COMMENT ON COLUMN public.cms_portfolio_items.team_members IS 'Array of team member names';
COMMENT ON COLUMN public.cms_portfolio_items.links IS 'JSONB: {website, github, demo, docs}';
COMMENT ON COLUMN public.cms_portfolio_items.timeline IS 'JSONB: {start, end, phases: [{name, start, end}]}';
COMMENT ON COLUMN public.cms_portfolio_items.tags IS 'Array of tag slugs for filtering';
COMMENT ON COLUMN public.cms_portfolio_items.is_featured IS 'Pin to top of portfolio page';
COMMENT ON COLUMN public.cms_portfolio_items.display_order IS 'Manual ordering (higher = top)';
COMMENT ON COLUMN public.cms_portfolio_items.is_published IS 'Public visibility flag';

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant SELECT to anonymous and authenticated users (RLS will filter)
GRANT SELECT ON public.cms_portfolio_items TO anon, authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (RLS will filter)
GRANT INSERT, UPDATE, DELETE ON public.cms_portfolio_items TO authenticated;
