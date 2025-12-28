-- Migration: Project Types & Portfolio Extension
-- Created: 2025-11-25
-- Purpose: Hybrid project classification (portfolio, experiment, partner)
-- Part of: Service Registry & Integration Platform

-- =====================================================
-- 1. PROJECT_TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug IN ('portfolio', 'experiment', 'partner')),
  name TEXT NOT NULL,
  name_ko TEXT NOT NULL, -- Korean name
  description TEXT,
  description_ko TEXT, -- Korean description
  icon TEXT, -- Lucide icon name
  color TEXT, -- Badge color (e.g., 'blue', 'green', 'purple')
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_types_slug ON public.project_types(slug);
CREATE INDEX IF NOT EXISTS idx_project_types_display_order ON public.project_types(display_order);
CREATE INDEX IF NOT EXISTS idx_project_types_active ON public.project_types(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;

-- Everyone can view active project types
CREATE POLICY select_project_types_public
  ON public.project_types
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admins can modify
CREATE POLICY manage_project_types_admin
  ON public.project_types
  FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Grant permissions
GRANT SELECT ON public.project_types TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_types TO authenticated;

-- Comments
COMMENT ON TABLE public.project_types IS 'Project classification types: portfolio, experiment, partner';
COMMENT ON COLUMN public.project_types.slug IS 'URL-friendly identifier';
COMMENT ON COLUMN public.project_types.name IS 'Display name in English';
COMMENT ON COLUMN public.project_types.name_ko IS 'Display name in Korean';
COMMENT ON COLUMN public.project_types.icon IS 'Lucide icon name for UI';
COMMENT ON COLUMN public.project_types.color IS 'Badge/tag color';

-- =====================================================
-- 2. SEED PROJECT_TYPES DATA
-- =====================================================
INSERT INTO public.project_types (slug, name, name_ko, description, description_ko, icon, color, display_order) VALUES
  (
    'portfolio',
    'Portfolio',
    '포트폴리오',
    'Completed project showcase demonstrating our capabilities',
    '완성된 프로젝트 쇼케이스',
    'Briefcase',
    'blue',
    1
  ),
  (
    'experiment',
    'Experiment',
    '실험',
    'Lab experiments and innovative prototypes in progress',
    'Lab에서 진행 중인 실험 프로젝트',
    'FlaskConical',
    'green',
    2
  ),
  (
    'partner',
    'Partnership',
    '파트너십',
    'Collaborative projects with external partners',
    '외부 파트너와의 협업 프로젝트',
    'Handshake',
    'purple',
    3
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_ko = EXCLUDED.name_ko,
  description = EXCLUDED.description,
  description_ko = EXCLUDED.description_ko,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  display_order = EXCLUDED.display_order;

-- =====================================================
-- 3. EXTEND CMS_PORTFOLIO_ITEMS TABLE
-- =====================================================

-- Add new columns for integration support
ALTER TABLE public.cms_portfolio_items
  ADD COLUMN IF NOT EXISTS project_type_id UUID REFERENCES public.project_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notion_page_id TEXT,
  ADD COLUMN IF NOT EXISTS github_repo TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
  ADD COLUMN IF NOT EXISTS is_showcase BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_experimental BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS external_integrations JSONB DEFAULT '{}'::jsonb;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cms_portfolio_project_type
  ON public.cms_portfolio_items(project_type_id);

CREATE INDEX IF NOT EXISTS idx_cms_portfolio_visibility
  ON public.cms_portfolio_items(visibility);

CREATE INDEX IF NOT EXISTS idx_cms_portfolio_notion_page
  ON public.cms_portfolio_items(notion_page_id)
  WHERE notion_page_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cms_portfolio_github_repo
  ON public.cms_portfolio_items(github_repo)
  WHERE github_repo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cms_portfolio_showcase
  ON public.cms_portfolio_items(is_showcase)
  WHERE is_showcase = true;

-- Comments for new columns
COMMENT ON COLUMN public.cms_portfolio_items.project_type_id IS 'Reference to project_types (portfolio, experiment, partner)';
COMMENT ON COLUMN public.cms_portfolio_items.notion_page_id IS 'Notion page ID for integration sync';
COMMENT ON COLUMN public.cms_portfolio_items.github_repo IS 'GitHub repository name (owner/repo format)';
COMMENT ON COLUMN public.cms_portfolio_items.visibility IS 'Visibility: public (everyone), private (admins), unlisted (link only)';
COMMENT ON COLUMN public.cms_portfolio_items.is_showcase IS 'Featured in portfolio showcase';
COMMENT ON COLUMN public.cms_portfolio_items.is_experimental IS 'Marked as experimental/lab project';
COMMENT ON COLUMN public.cms_portfolio_items.client_name IS 'Client/partner name (for partner projects)';
COMMENT ON COLUMN public.cms_portfolio_items.client_logo_url IS 'Client/partner logo URL';
COMMENT ON COLUMN public.cms_portfolio_items.external_integrations IS 'JSONB: {notion: {synced_at}, github: {synced_at}}';

-- =====================================================
-- 4. PROJECT_TYPE_STATS VIEW
-- =====================================================
CREATE OR REPLACE VIEW public.project_type_stats AS
SELECT
  pt.id,
  pt.slug,
  pt.name,
  pt.name_ko,
  pt.icon,
  pt.color,
  pt.display_order,
  COUNT(cpi.id) AS total_count,
  COUNT(CASE WHEN cpi.is_published = true THEN 1 END) AS published_count,
  COUNT(CASE WHEN cpi.is_featured = true THEN 1 END) AS featured_count,
  COUNT(CASE WHEN cpi.status = 'active' THEN 1 END) AS active_count
FROM public.project_types pt
LEFT JOIN public.cms_portfolio_items cpi ON pt.id = cpi.project_type_id
WHERE pt.is_active = true
GROUP BY pt.id, pt.slug, pt.name, pt.name_ko, pt.icon, pt.color, pt.display_order
ORDER BY pt.display_order;

COMMENT ON VIEW public.project_type_stats IS 'Project types with portfolio item counts';

-- Grant view access
GRANT SELECT ON public.project_type_stats TO anon, authenticated;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Auto-update updated_at for project_types
CREATE TRIGGER update_project_types_updated_at
  BEFORE UPDATE ON public.project_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
