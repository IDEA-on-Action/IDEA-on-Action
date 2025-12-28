-- CMS-003: Create portfolio_items table and RLS policies
-- Purpose: Manage portfolio case studies with detailed project information

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_logo TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('mvp', 'fullstack', 'design', 'operations')),
  thumbnail TEXT,
  images TEXT[] DEFAULT '{}',
  tech_stack TEXT[] DEFAULT '{}',
  project_url TEXT,
  github_url TEXT,
  duration TEXT,
  team_size INTEGER,
  start_date DATE,
  end_date DATE,
  challenges TEXT,
  solutions TEXT,
  outcomes TEXT,
  testimonial JSONB DEFAULT '{}',
  featured BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.admins(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX idx_portfolio_slug ON public.portfolio_items(slug);
CREATE INDEX idx_portfolio_published ON public.portfolio_items(published);
CREATE INDEX idx_portfolio_featured ON public.portfolio_items(featured);
CREATE INDEX idx_portfolio_project_type ON public.portfolio_items(project_type);
CREATE INDEX idx_portfolio_created_at ON public.portfolio_items(created_at DESC);

-- Enable RLS
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: 공개된 항목은 모든 사용자 조회 가능, 비공개는 관리자만
CREATE POLICY "Public can view published portfolio items"
  ON public.portfolio_items
  FOR SELECT
  USING (published = true OR auth.uid() IN (SELECT user_id FROM public.admins));

-- INSERT: 관리자만 가능
CREATE POLICY "Admins can create portfolio items"
  ON public.portfolio_items
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- UPDATE: 관리자만 가능
CREATE POLICY "Admins can update portfolio items"
  ON public.portfolio_items
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- DELETE: Admin 이상만 가능 (Editor 제외)
CREATE POLICY "Admins can delete portfolio items"
  ON public.portfolio_items
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.admins WHERE role IN ('super_admin', 'admin')
    )
  );

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_portfolio_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER portfolio_items_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_items_updated_at();

-- Comments
COMMENT ON TABLE public.portfolio_items IS 'Portfolio case studies with detailed project information';
COMMENT ON COLUMN public.portfolio_items.slug IS 'URL-friendly unique identifier (e.g., project-name-2024)';
COMMENT ON COLUMN public.portfolio_items.project_type IS 'Project type: mvp, fullstack, design, operations';
COMMENT ON COLUMN public.portfolio_items.testimonial IS 'JSON: {author, role, company, content, avatar}';
COMMENT ON COLUMN public.portfolio_items.featured IS 'Pin to top of portfolio page';
COMMENT ON COLUMN public.portfolio_items.tech_stack IS 'Array of technology names';

-- Grant permissions
GRANT SELECT ON public.portfolio_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
