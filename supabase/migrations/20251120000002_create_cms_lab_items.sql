-- Migration: CMS Lab Items Table
-- Created: 2025-11-20
-- Purpose: Lab bounty items with community participation, applicants, and contributors

-- Drop existing table if exists (fresh start for CMS v2)
DROP TABLE IF EXISTS public.cms_lab_items CASCADE;

-- Create cms_lab_items table
CREATE TABLE public.cms_lab_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'closed')),
  description TEXT NOT NULL, -- Full markdown description
  difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  reward TEXT, -- Reward description (e.g., "$500", "10% equity", "Free service")
  skills_required TEXT[] DEFAULT '{}', -- Array of required skills
  github_url TEXT, -- GitHub repository or issue URL
  applicants JSONB DEFAULT '[]'::jsonb, -- Array of applicant objects: [{user_id, name, applied_at, message}]
  contributors TEXT[] DEFAULT '{}', -- Array of contributor names
  tags TEXT[] DEFAULT '{}', -- Array of tag slugs
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_by UUID, -- References auth.users (soft reference)
  updated_by UUID -- References auth.users (soft reference)
);

-- Create indexes
CREATE UNIQUE INDEX idx_cms_lab_slug ON public.cms_lab_items(slug);
CREATE INDEX idx_cms_lab_status ON public.cms_lab_items(status);
CREATE INDEX idx_cms_lab_difficulty ON public.cms_lab_items(difficulty);
CREATE INDEX idx_cms_lab_is_published ON public.cms_lab_items(is_published);
CREATE INDEX idx_cms_lab_created_at ON public.cms_lab_items(created_at DESC);
CREATE INDEX idx_cms_lab_tags ON public.cms_lab_items USING GIN (tags);
CREATE INDEX idx_cms_lab_skills ON public.cms_lab_items USING GIN (skills_required);
CREATE INDEX idx_cms_lab_applicants ON public.cms_lab_items USING GIN (applicants);

-- Enable RLS
ALTER TABLE public.cms_lab_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- SELECT: Public can view published items, admins can view all
CREATE POLICY select_cms_lab_public
  ON public.cms_lab_items
  FOR SELECT
  USING (
    is_published = true
    OR public.is_admin_user(auth.uid())
  );

-- INSERT: Admins only
CREATE POLICY insert_cms_lab_admin
  ON public.cms_lab_items
  FOR INSERT
  WITH CHECK (
    public.is_admin_user(auth.uid())
  );

-- UPDATE: Admins can update all fields, authenticated users can update applicants (for applying)
CREATE POLICY update_cms_lab_admin
  ON public.cms_lab_items
  FOR UPDATE
  USING (
    public.is_admin_user(auth.uid())
    OR auth.uid() IS NOT NULL -- Authenticated users can apply (limited by trigger)
  );

-- DELETE: Super admins and admins only (not editors)
CREATE POLICY delete_cms_lab_admin
  ON public.cms_lab_items
  FOR DELETE
  USING (
    public.can_admin_delete(auth.uid())
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp on every update
CREATE OR REPLACE FUNCTION update_cms_lab_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());

  -- Only admins can update updated_by
  IF public.is_admin_user(auth.uid()) THEN
    NEW.updated_by = auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_lab_items_updated_at
  BEFORE UPDATE ON public.cms_lab_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cms_lab_items_updated_at();

-- Set created_by on insert
CREATE OR REPLACE FUNCTION set_cms_lab_items_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_lab_items_set_created_by
  BEFORE INSERT ON public.cms_lab_items
  FOR EACH ROW
  EXECUTE FUNCTION set_cms_lab_items_created_by();

-- Restrict authenticated users to only updating applicants field
CREATE OR REPLACE FUNCTION restrict_lab_user_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow admins to update everything
  IF public.is_admin_user(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-admins can only update applicants field
  IF OLD.id IS DISTINCT FROM NEW.id
    OR OLD.slug IS DISTINCT FROM NEW.slug
    OR OLD.title IS DISTINCT FROM NEW.title
    OR OLD.status IS DISTINCT FROM NEW.status
    OR OLD.description IS DISTINCT FROM NEW.description
    OR OLD.difficulty IS DISTINCT FROM NEW.difficulty
    OR OLD.reward IS DISTINCT FROM NEW.reward
    OR OLD.skills_required IS DISTINCT FROM NEW.skills_required
    OR OLD.github_url IS DISTINCT FROM NEW.github_url
    OR OLD.contributors IS DISTINCT FROM NEW.contributors
    OR OLD.tags IS DISTINCT FROM NEW.tags
    OR OLD.is_published IS DISTINCT FROM NEW.is_published
  THEN
    RAISE EXCEPTION 'Non-admin users can only update applicants field';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_lab_items_restrict_user_updates
  BEFORE UPDATE ON public.cms_lab_items
  FOR EACH ROW
  EXECUTE FUNCTION restrict_lab_user_updates();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.cms_lab_items IS 'CMS: Lab bounty items with community participation';
COMMENT ON COLUMN public.cms_lab_items.slug IS 'URL-friendly unique identifier (e.g., bounty-name-2024)';
COMMENT ON COLUMN public.cms_lab_items.status IS 'Bounty status: open, in_progress, completed, closed';
COMMENT ON COLUMN public.cms_lab_items.description IS 'Full markdown description';
COMMENT ON COLUMN public.cms_lab_items.difficulty IS 'Difficulty level: beginner, intermediate, advanced';
COMMENT ON COLUMN public.cms_lab_items.reward IS 'Reward description (e.g., "$500", "10% equity")';
COMMENT ON COLUMN public.cms_lab_items.skills_required IS 'Array of required skills (e.g., ["React", "Node.js"])';
COMMENT ON COLUMN public.cms_lab_items.github_url IS 'GitHub repository or issue URL';
COMMENT ON COLUMN public.cms_lab_items.applicants IS 'JSONB array: [{user_id, name, applied_at, message}]';
COMMENT ON COLUMN public.cms_lab_items.contributors IS 'Array of contributor names';
COMMENT ON COLUMN public.cms_lab_items.tags IS 'Array of tag slugs for filtering';
COMMENT ON COLUMN public.cms_lab_items.is_published IS 'Public visibility flag';

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant SELECT to anonymous and authenticated users (RLS will filter)
GRANT SELECT ON public.cms_lab_items TO anon, authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (RLS will filter)
GRANT INSERT, UPDATE, DELETE ON public.cms_lab_items TO authenticated;
