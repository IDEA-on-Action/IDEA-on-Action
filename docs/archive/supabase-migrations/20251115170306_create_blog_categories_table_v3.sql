-- CMS-007 (v3): Create blog_categories table
-- Purpose: Manage blog post categories with color and icon
-- Note: RLS policies will be updated in step 9 (20251115170308_update_cms_rls_policies.sql)
-- Fix: Clean up orphan category_id values before adding FK constraint

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
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_category_slug ON public.blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_category_name ON public.blog_categories(name);

-- Enable RLS (policies added in step 9)
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- Temporary policy: Allow SELECT for everyone (will be refined in step 9)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blog_categories'
      AND policyname = 'Temporary: Blog categories viewable by everyone'
  ) THEN
    CREATE POLICY "Temporary: Blog categories viewable by everyone"
      ON public.blog_categories
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_blog_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_categories_updated_at ON public.blog_categories;
CREATE TRIGGER blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_categories_updated_at();

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

-- =====================================================
-- FIX: Clean up orphan category_id values
-- =====================================================

-- Set category_id to NULL for blog_posts with non-existent categories
UPDATE public.blog_posts
SET category_id = NULL
WHERE category_id IS NOT NULL
  AND category_id NOT IN (SELECT id FROM public.blog_categories);

-- =====================================================
-- Add FK constraint to blog_posts (if not exists)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'blog_posts'
      AND constraint_name = 'fk_blog_posts_category'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT fk_blog_posts_category
      FOREIGN KEY (category_id)
      REFERENCES public.blog_categories(id)
      ON DELETE SET NULL;
  END IF;
END $$;
