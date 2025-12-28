-- Migration: CMS Team Members Table
-- Created: 2025-11-20
-- Purpose: Team member profiles with skills, social links, and display ordering

-- Drop existing table if exists (fresh start for CMS v2)
DROP TABLE IF EXISTS public.cms_team_members CASCADE;

-- Create cms_team_members table
CREATE TABLE public.cms_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- Job title or role
  bio TEXT, -- Markdown biography
  avatar_url TEXT, -- Profile image URL
  skills TEXT[] DEFAULT '{}', -- Array of skill names
  social_links JSONB DEFAULT '{}'::jsonb, -- Social media links: {github, linkedin, twitter, website}
  display_order INTEGER DEFAULT 0, -- Manual ordering (higher = top)
  is_active BOOLEAN DEFAULT true, -- Show/hide member
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_by UUID, -- References auth.users (soft reference)
  updated_by UUID -- References auth.users (soft reference)
);

-- Create indexes
CREATE INDEX idx_cms_team_display_order ON public.cms_team_members(display_order DESC);
CREATE INDEX idx_cms_team_is_active ON public.cms_team_members(is_active);
CREATE INDEX idx_cms_team_created_at ON public.cms_team_members(created_at DESC);
CREATE INDEX idx_cms_team_skills ON public.cms_team_members USING GIN (skills);

-- Enable RLS
ALTER TABLE public.cms_team_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- SELECT: Public can view active members, admins can view all
CREATE POLICY select_cms_team_public
  ON public.cms_team_members
  FOR SELECT
  USING (
    is_active = true
    OR public.is_admin_user(auth.uid())
  );

-- INSERT: Admins only
CREATE POLICY insert_cms_team_admin
  ON public.cms_team_members
  FOR INSERT
  WITH CHECK (
    public.is_admin_user(auth.uid())
  );

-- UPDATE: Admins only
CREATE POLICY update_cms_team_admin
  ON public.cms_team_members
  FOR UPDATE
  USING (
    public.is_admin_user(auth.uid())
  );

-- DELETE: Super admins and admins only (not editors)
CREATE POLICY delete_cms_team_admin
  ON public.cms_team_members
  FOR DELETE
  USING (
    public.can_admin_delete(auth.uid())
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp on every update
CREATE OR REPLACE FUNCTION update_cms_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_team_members_updated_at
  BEFORE UPDATE ON public.cms_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_cms_team_members_updated_at();

-- Set created_by on insert
CREATE OR REPLACE FUNCTION set_cms_team_members_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_team_members_set_created_by
  BEFORE INSERT ON public.cms_team_members
  FOR EACH ROW
  EXECUTE FUNCTION set_cms_team_members_created_by();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.cms_team_members IS 'CMS: Team member profiles with skills and social links';
COMMENT ON COLUMN public.cms_team_members.name IS 'Full name of team member';
COMMENT ON COLUMN public.cms_team_members.role IS 'Job title or role (e.g., "Lead Developer", "Designer")';
COMMENT ON COLUMN public.cms_team_members.bio IS 'Markdown biography';
COMMENT ON COLUMN public.cms_team_members.avatar_url IS 'Profile image URL (Supabase Storage or external)';
COMMENT ON COLUMN public.cms_team_members.skills IS 'Array of skill names (e.g., ["React", "TypeScript", "Design"])';
COMMENT ON COLUMN public.cms_team_members.social_links IS 'JSONB: {github, linkedin, twitter, website}';
COMMENT ON COLUMN public.cms_team_members.display_order IS 'Manual ordering (higher = top)';
COMMENT ON COLUMN public.cms_team_members.is_active IS 'Show/hide member on public pages';

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant SELECT to anonymous and authenticated users (RLS will filter)
GRANT SELECT ON public.cms_team_members TO anon, authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (RLS will filter)
GRANT INSERT, UPDATE, DELETE ON public.cms_team_members TO authenticated;
