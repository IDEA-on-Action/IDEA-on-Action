-- CMS-005 (v2): Update blog_posts table for CMS compatibility
-- Purpose: Add CMS-specific columns to existing blog_posts table
-- Note: RLS policies will be updated in step 9 (20251115170308_update_cms_rls_policies.sql)

-- Note: blog_posts table already exists (created in 20251020000006_create_blog_tables.sql)
-- We only add missing columns here, NOT RLS policies (to avoid conflicts)

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
    COMMENT ON COLUMN public.blog_posts.summary IS 'Short summary for SEO and previews (optional, excerpt exists)';
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

-- =====================================================
-- 2. HELPER FUNCTIONS (Optional)
-- =====================================================

-- Function to convert status to boolean published
CREATE OR REPLACE FUNCTION public.is_blog_post_published(post_status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN post_status = 'published';
END;
$$;

COMMENT ON FUNCTION public.is_blog_post_published IS 'Helper function to check if blog post is published (converts status to boolean)';

-- =====================================================
-- 3. COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.blog_posts IS 'Blog posts with Markdown support (extended for CMS)';
COMMENT ON COLUMN public.blog_posts.status IS 'draft, published, or archived (use this instead of published boolean)';
COMMENT ON COLUMN public.blog_posts.author_id IS 'FK to auth.users.id (also checked against admins table for CMS access)';
COMMENT ON COLUMN public.blog_posts.featured_image IS 'Thumbnail/featured image URL (use this instead of separate thumbnail column)';
COMMENT ON COLUMN public.blog_posts.meta_title IS 'SEO title (same as seo_title)';
COMMENT ON COLUMN public.blog_posts.meta_description IS 'SEO description (same as seo_description)';

-- =====================================================
-- 4. NOTE ABOUT RLS POLICIES
-- =====================================================

-- RLS policies for blog_posts will be updated in:
-- 20251115170308_update_cms_rls_policies.sql
--
-- This is to ensure SECURITY DEFINER functions (is_admin_user, can_admin_delete)
-- are created first to avoid infinite recursion issues.
