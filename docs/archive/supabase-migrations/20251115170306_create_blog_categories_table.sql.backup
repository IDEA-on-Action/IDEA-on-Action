-- CMS-007: Create blog_categories table and RLS policies
-- Purpose: Manage blog post categories with color and icon

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'folder',
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX idx_blog_category_slug ON public.blog_categories(slug);
CREATE INDEX idx_blog_category_name ON public.blog_categories(name);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: 모든 사용자 조회 가능
CREATE POLICY "Blog categories are viewable by everyone"
  ON public.blog_categories
  FOR SELECT
  USING (true);

-- INSERT: 관리자만 가능
CREATE POLICY "Admins can create blog categories"
  ON public.blog_categories
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- UPDATE: 관리자만 가능
CREATE POLICY "Admins can update blog categories"
  ON public.blog_categories
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- DELETE: Admin 이상만 가능 (Editor 제외)
CREATE POLICY "Admins can delete blog categories"
  ON public.blog_categories
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.admins WHERE role IN ('super_admin', 'admin')
    )
  );

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_blog_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_categories_updated_at();

-- Add FK constraint to blog_posts
ALTER TABLE public.blog_posts
  ADD CONSTRAINT fk_blog_posts_category
  FOREIGN KEY (category_id)
  REFERENCES public.blog_categories(id)
  ON DELETE SET NULL;

-- Comments
COMMENT ON TABLE public.blog_categories IS 'Blog post categories with color and icon';
COMMENT ON COLUMN public.blog_categories.color IS 'Hex color code for category badge';
COMMENT ON COLUMN public.blog_categories.icon IS 'Icon name (e.g., folder, code, lightbulb)';
COMMENT ON COLUMN public.blog_categories.post_count IS 'Cached count of published posts in this category';

-- Grant permissions
GRANT SELECT ON public.blog_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_categories TO authenticated;

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description, color, icon) VALUES
  ('기술', 'tech', '기술 관련 포스트', '#3b82f6', 'code'),
  ('디자인', 'design', '디자인 관련 포스트', '#f59e0b', 'palette'),
  ('비즈니스', 'business', '비즈니스 관련 포스트', '#8b5cf6', 'briefcase'),
  ('공지', 'notice', '공지사항', '#10b981', 'bell')
ON CONFLICT (slug) DO NOTHING;
