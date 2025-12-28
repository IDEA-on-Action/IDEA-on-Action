-- CMS-008: Create tags table and RLS policies
-- Purpose: Manage global tags used across all content types

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX idx_tags_name ON public.tags(name);
CREATE UNIQUE INDEX idx_tags_slug ON public.tags(slug);
CREATE INDEX idx_tags_usage_count ON public.tags(usage_count DESC);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: 모든 사용자 조회 가능
CREATE POLICY "Tags are viewable by everyone"
  ON public.tags
  FOR SELECT
  USING (true);

-- INSERT: 관리자만 가능 (자동 생성 시 서비스 계정 사용)
CREATE POLICY "Admins can create tags"
  ON public.tags
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- UPDATE: 관리자만 가능
CREATE POLICY "Admins can update tags"
  ON public.tags
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- DELETE: Admin 이상만 가능 (Editor 제외)
CREATE POLICY "Admins can delete tags"
  ON public.tags
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.admins WHERE role IN ('super_admin', 'admin')
    )
  );

-- Comments
COMMENT ON TABLE public.tags IS 'Global tags used across roadmap, portfolio, lab, and blog';
COMMENT ON COLUMN public.tags.usage_count IS 'Cached count of how many items use this tag';
COMMENT ON COLUMN public.tags.slug IS 'URL-friendly unique identifier';

-- Grant permissions
GRANT SELECT ON public.tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tags TO authenticated;
