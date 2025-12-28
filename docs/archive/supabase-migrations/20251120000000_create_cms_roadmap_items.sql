-- Migration: CMS Roadmap Items Table
-- Created: 2025-11-20
-- Purpose: Quarterly roadmap items with milestones, KPIs, and progress tracking

-- Drop existing table if exists (fresh start for CMS v2)
DROP TABLE IF EXISTS public.cms_roadmap_items CASCADE;

-- Create cms_roadmap_items table
CREATE TABLE public.cms_roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter TEXT NOT NULL, -- e.g., "Q1 2025", "Q2 2025"
  theme TEXT NOT NULL, -- Thematic goal for the quarter
  goal TEXT NOT NULL, -- Specific goal description
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  milestones JSONB DEFAULT '[]'::jsonb, -- Array of milestone objects: [{title, status, date}]
  kpis JSONB DEFAULT '[]'::jsonb, -- Array of KPI objects: [{name, target, current, unit}]
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  owner TEXT, -- Team member or department responsible
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_by UUID, -- References auth.users (soft reference)
  updated_by UUID, -- References auth.users (soft reference)

  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes
CREATE INDEX idx_cms_roadmap_quarter ON public.cms_roadmap_items(quarter);
CREATE INDEX idx_cms_roadmap_is_published ON public.cms_roadmap_items(is_published);
CREATE INDEX idx_cms_roadmap_risk_level ON public.cms_roadmap_items(risk_level);
CREATE INDEX idx_cms_roadmap_start_date ON public.cms_roadmap_items(start_date DESC);
CREATE INDEX idx_cms_roadmap_created_at ON public.cms_roadmap_items(created_at DESC);
CREATE INDEX idx_cms_roadmap_milestones ON public.cms_roadmap_items USING GIN (milestones);
CREATE INDEX idx_cms_roadmap_kpis ON public.cms_roadmap_items USING GIN (kpis);

-- Enable RLS
ALTER TABLE public.cms_roadmap_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- SELECT: Public can view published items, admins can view all
CREATE POLICY select_cms_roadmap_public
  ON public.cms_roadmap_items
  FOR SELECT
  USING (
    is_published = true
    OR public.is_admin_user(auth.uid())
  );

-- INSERT: Admins only
CREATE POLICY insert_cms_roadmap_admin
  ON public.cms_roadmap_items
  FOR INSERT
  WITH CHECK (
    public.is_admin_user(auth.uid())
  );

-- UPDATE: Admins only
CREATE POLICY update_cms_roadmap_admin
  ON public.cms_roadmap_items
  FOR UPDATE
  USING (
    public.is_admin_user(auth.uid())
  );

-- DELETE: Super admins and admins only (not editors)
CREATE POLICY delete_cms_roadmap_admin
  ON public.cms_roadmap_items
  FOR DELETE
  USING (
    public.can_admin_delete(auth.uid())
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp on every update
CREATE OR REPLACE FUNCTION update_cms_roadmap_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_roadmap_items_updated_at
  BEFORE UPDATE ON public.cms_roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cms_roadmap_items_updated_at();

-- Set created_by on insert
CREATE OR REPLACE FUNCTION set_cms_roadmap_items_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_roadmap_items_set_created_by
  BEFORE INSERT ON public.cms_roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION set_cms_roadmap_items_created_by();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.cms_roadmap_items IS 'CMS: Quarterly roadmap items with milestones, KPIs, and progress tracking';
COMMENT ON COLUMN public.cms_roadmap_items.quarter IS 'Quarter identifier (e.g., "Q1 2025", "Q2 2025")';
COMMENT ON COLUMN public.cms_roadmap_items.theme IS 'Thematic goal for the quarter';
COMMENT ON COLUMN public.cms_roadmap_items.goal IS 'Specific goal description';
COMMENT ON COLUMN public.cms_roadmap_items.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN public.cms_roadmap_items.milestones IS 'JSONB array of milestone objects: [{title, status, date}]';
COMMENT ON COLUMN public.cms_roadmap_items.kpis IS 'JSONB array of KPI objects: [{name, target, current, unit}]';
COMMENT ON COLUMN public.cms_roadmap_items.risk_level IS 'Risk level: low, medium, high';
COMMENT ON COLUMN public.cms_roadmap_items.owner IS 'Team member or department responsible';
COMMENT ON COLUMN public.cms_roadmap_items.is_published IS 'Public visibility flag';

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant SELECT to anonymous and authenticated users (RLS will filter)
GRANT SELECT ON public.cms_roadmap_items TO anon, authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (RLS will filter)
GRANT INSERT, UPDATE, DELETE ON public.cms_roadmap_items TO authenticated;
