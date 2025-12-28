-- CMS-002: Create roadmap_items table and RLS policies
-- Purpose: Manage quarterly roadmap items with status and progress tracking

CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('service', 'platform', 'internal')),
  status TEXT NOT NULL CHECK (status IN ('planned', 'in-progress', 'completed', 'on-hold')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  priority INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.admins(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_roadmap_status ON public.roadmap_items(status);
CREATE INDEX idx_roadmap_published ON public.roadmap_items(published);
CREATE INDEX idx_roadmap_category ON public.roadmap_items(category);
CREATE INDEX idx_roadmap_created_by ON public.roadmap_items(created_by);
CREATE INDEX idx_roadmap_start_date ON public.roadmap_items(start_date DESC);

-- Enable RLS
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: 공개된 항목은 모든 사용자 조회 가능, 비공개는 관리자만
CREATE POLICY "Public can view published roadmap items"
  ON public.roadmap_items
  FOR SELECT
  USING (published = true OR auth.uid() IN (SELECT user_id FROM public.admins));

-- INSERT: 관리자만 가능
CREATE POLICY "Admins can create roadmap items"
  ON public.roadmap_items
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- UPDATE: 관리자만 가능
CREATE POLICY "Admins can update roadmap items"
  ON public.roadmap_items
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- DELETE: Admin 이상만 가능 (Editor 제외)
CREATE POLICY "Admins can delete roadmap items"
  ON public.roadmap_items
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.admins WHERE role IN ('super_admin', 'admin')
    )
  );

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_roadmap_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roadmap_items_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION update_roadmap_items_updated_at();

-- Comments
COMMENT ON TABLE public.roadmap_items IS 'Quarterly roadmap items with status and progress tracking';
COMMENT ON COLUMN public.roadmap_items.category IS 'Category: service (new features), platform (infrastructure), internal (team processes)';
COMMENT ON COLUMN public.roadmap_items.status IS 'Status: planned, in-progress, completed, on-hold';
COMMENT ON COLUMN public.roadmap_items.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN public.roadmap_items.priority IS 'Priority order for display (higher = more important)';

-- Grant permissions
GRANT SELECT ON public.roadmap_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.roadmap_items TO authenticated;
