-- CMS-005: Update blog_posts table for CMS compatibility
-- Purpose: Add CMS-specific columns and RLS policies to existing blog_posts table

-- Note: blog_posts table already exists (created in 20251020000006_create_blog_tables.sql)
-- We only add missing columns and update RLS policies for admins table integration

-- =====================================================
-- 1. ADD MISSING COLUMNS (if not exists)
-- =====================================================

-- Add summary column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_posts'
      AND column_name = 'summary'
  ) THEN
    ALTER TABLE public.blog_posts ADD COLUMN summary TEXT;
    COMMENT ON COLUMN public.blog_posts.summary IS 'Short summary for SEO and previews';
  END IF;
END $$;

-- Add thumbnail column (if not exists) - alias for featured_image
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_posts'
      AND column_name = 'thumbnail'
  ) THEN
    -- Use featured_image instead of adding duplicate column
    -- thumbnail is already covered by featured_image
    NULL;
  END IF;
END $$;

-- Add tags array column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_posts'
      AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.blog_posts ADD COLUMN tags TEXT[] DEFAULT '{}';
    COMMENT ON COLUMN public.blog_posts.tags IS 'Array of tag names (alternative to post_tag_relations)';
  END IF;
END $$;

-- Add featured column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_posts'
      AND column_name = 'featured'
  ) THEN
    ALTER TABLE public.blog_posts ADD COLUMN featured BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON public.blog_posts(featured);
    COMMENT ON COLUMN public.blog_posts.featured IS 'Pin to top of blog page';
  END IF;
END $$;

-- Add seo_title column (if not exists) - alias for meta_title
-- (Already exists as meta_title, no need to add)

-- Add seo_description column (if not exists) - alias for meta_description
-- (Already exists as meta_description, no need to add)

-- =====================================================
-- 2. UPDATE RLS POLICIES FOR ADMINS TABLE
-- =====================================================

-- Drop existing conflicting policies (if any)
DROP POLICY IF EXISTS "Admins can view all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can create blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can update blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can delete blog posts" ON public.blog_posts;

-- Add new CMS admin-based policies (compatible with existing RBAC policies)
-- These policies work alongside existing RBAC policies

-- Admins can view all posts (including drafts)
CREATE POLICY "Admins can view all blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Admins can create posts
CREATE POLICY "Admins can create blog posts"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins) AND
    author_id = auth.uid()
  );

-- Admins can update posts
CREATE POLICY "Admins can update blog posts"
  ON public.blog_posts
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Admin/Super Admin can delete posts (Editor cannot)
CREATE POLICY "Admins can delete blog posts"
  ON public.blog_posts
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.admins WHERE role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- 3. HELPER FUNCTIONS (Optional)
-- =====================================================

-- Function to convert status to boolean published
CREATE OR REPLACE FUNCTION public.is_blog_post_published(post_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN post_status = 'published';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.is_blog_post_published IS 'Helper function to check if blog post is published (converts status to boolean)';

-- =====================================================
-- 4. COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.blog_posts IS 'Blog posts with Markdown support (extended for CMS)';
COMMENT ON COLUMN public.blog_posts.status IS 'draft, published, or archived (use this instead of published boolean)';
COMMENT ON COLUMN public.blog_posts.author_id IS 'FK to auth.users.id (also checked against admins table for CMS access)';

-- Grant permissions (already granted in original migration, but ensure they exist)
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
