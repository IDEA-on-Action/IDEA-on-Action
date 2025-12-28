-- CMS-004: Create lab_items table and RLS policies
-- Purpose: Manage lab experiments and ideas with community participation

CREATE TABLE IF NOT EXISTS public.lab_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT NOT NULL,
  content TEXT,
  category TEXT NOT NULL CHECK (category IN ('experiment', 'idea', 'community', 'research')),
  status TEXT NOT NULL CHECK (status IN ('exploring', 'developing', 'testing', 'completed', 'archived')),
  tech_stack TEXT[] DEFAULT '{}',
  github_url TEXT,
  demo_url TEXT,
  contributors TEXT[] DEFAULT '{}',
  start_date DATE,
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.admins(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX idx_lab_slug ON public.lab_items(slug);
CREATE INDEX idx_lab_category ON public.lab_items(category);
CREATE INDEX idx_lab_status ON public.lab_items(status);
CREATE INDEX idx_lab_published ON public.lab_items(published);
CREATE INDEX idx_lab_created_at ON public.lab_items(created_at DESC);

-- Enable RLS
ALTER TABLE public.lab_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: 공개된 항목은 모든 사용자 조회 가능, 비공개는 관리자만
CREATE POLICY "Public can view published lab items"
  ON public.lab_items
  FOR SELECT
  USING (published = true OR auth.uid() IN (SELECT user_id FROM public.admins));

-- INSERT: 관리자만 가능
CREATE POLICY "Admins can create lab items"
  ON public.lab_items
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- UPDATE: 관리자만 가능
CREATE POLICY "Admins can update lab items"
  ON public.lab_items
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- DELETE: Admin 이상만 가능 (Editor 제외)
CREATE POLICY "Admins can delete lab items"
  ON public.lab_items
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.admins WHERE role IN ('super_admin', 'admin')
    )
  );

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_lab_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lab_items_updated_at
  BEFORE UPDATE ON public.lab_items
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_items_updated_at();

-- Comments
COMMENT ON TABLE public.lab_items IS 'Lab experiments and ideas with community participation';
COMMENT ON COLUMN public.lab_items.category IS 'Category: experiment, idea, community, research';
COMMENT ON COLUMN public.lab_items.status IS 'Status: exploring, developing, testing, completed, archived';
COMMENT ON COLUMN public.lab_items.contributors IS 'Array of contributor names or GitHub usernames';
COMMENT ON COLUMN public.lab_items.content IS 'Markdown content for detailed description';

-- Grant permissions
GRANT SELECT ON public.lab_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lab_items TO authenticated;
