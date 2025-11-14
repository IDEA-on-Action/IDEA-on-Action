-- Phase 11 Week 1: Blog System Tables
-- Migration: 20251020000006_create_blog_tables.sql
-- Author: Claude AI
-- Date: 2025-10-20

-- =====================================================
-- 0. PREREQUISITES
-- =====================================================
-- Ensure pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Verify update_updated_at_column() function exists (should be created in migration 001)
-- Verify user_has_permission() function exists (should be created in migration 002)

-- =====================================================
-- 1. CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.post_categories IS 'Blog post categories';
COMMENT ON COLUMN public.post_categories.slug IS 'URL-friendly identifier (case-insensitive unique)';

-- Case-insensitive unique slug index
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_categories_slug_lower ON public.post_categories(LOWER(slug));

-- =====================================================
-- 2. TAGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.post_tags IS 'Blog post tags';
COMMENT ON COLUMN public.post_tags.slug IS 'URL-friendly identifier (case-insensitive unique)';

-- Case-insensitive unique slug index
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_tags_slug_lower ON public.post_tags(LOWER(slug));

-- =====================================================
-- 3. BLOG POSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL, -- Markdown content
  featured_image TEXT, -- URL to Supabase Storage
  author_id UUID NOT NULL, -- FK to auth.users.id (constraint added separately)
  category_id UUID, -- FK will be added after table creation
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  read_time INTEGER, -- Estimated reading time in minutes
  meta_title TEXT, -- SEO meta title
  meta_description TEXT, -- SEO meta description
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Business rule: published posts must have published_at
  CONSTRAINT published_posts_must_have_date CHECK (
    status != 'published' OR published_at IS NOT NULL
  )
);

COMMENT ON TABLE public.blog_posts IS 'Blog posts with Markdown support';
COMMENT ON COLUMN public.blog_posts.content IS 'Markdown formatted content';
COMMENT ON COLUMN public.blog_posts.status IS 'draft, published, or archived';
COMMENT ON COLUMN public.blog_posts.read_time IS 'Estimated reading time in minutes';
COMMENT ON COLUMN public.blog_posts.slug IS 'URL-friendly identifier (case-insensitive unique)';

-- Note: Foreign key to auth.users is not enforced at database level
-- This is by design in Supabase - auth schema is managed separately
-- Referential integrity is enforced via RLS policies and application logic
-- Index on author_id below ensures query performance

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug_lower ON public.blog_posts(LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);

-- Partial index for published posts (most common query)
CREATE INDEX IF NOT EXISTS idx_blog_posts_published
  ON public.blog_posts(published_at DESC)
  WHERE status = 'published' AND published_at IS NOT NULL;

-- =====================================================
-- 4. POST-TAG RELATIONS TABLE (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_tag_relations (
  post_id UUID NOT NULL, -- FK will be added after table creation
  tag_id UUID NOT NULL, -- FK will be added after table creation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, tag_id)
);

COMMENT ON TABLE public.post_tag_relations IS 'Many-to-many relationship between posts and tags';

-- Reverse lookup index (tag -> posts)
CREATE INDEX IF NOT EXISTS idx_post_tag_relations_tag_id ON public.post_tag_relations(tag_id, post_id);

-- =====================================================
-- 4.5. FOREIGN KEY CONSTRAINTS (Added after tables are created)
-- =====================================================
-- Add foreign keys safely after all tables exist
DO $$
BEGIN
  -- Add FK from blog_posts to post_categories
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'post_categories' 
      AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'blog_posts'
      AND constraint_name = 'blog_posts_category_fk'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_category_fk
      FOREIGN KEY (category_id) 
      REFERENCES public.post_categories(id) 
      ON DELETE SET NULL;
  END IF;

  -- Add FK from post_tag_relations to blog_posts
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'blog_posts' 
      AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'post_tag_relations'
      AND constraint_name = 'post_tag_relations_post_fk'
  ) THEN
    ALTER TABLE public.post_tag_relations
      ADD CONSTRAINT post_tag_relations_post_fk
      FOREIGN KEY (post_id) 
      REFERENCES public.blog_posts(id) 
      ON DELETE CASCADE;
  END IF;

  -- Add FK from post_tag_relations to post_tags
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'post_tags' 
      AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'post_tag_relations'
      AND constraint_name = 'post_tag_relations_tag_fk'
  ) THEN
    ALTER TABLE public.post_tag_relations
      ADD CONSTRAINT post_tag_relations_tag_fk
      FOREIGN KEY (tag_id) 
      REFERENCES public.post_tags(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 5. RLS POLICIES (RBAC-based)
-- =====================================================

-- Enable RLS
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tag_relations ENABLE ROW LEVEL SECURITY;

-- Categories: Public read, RBAC write
CREATE POLICY "Categories are viewable by everyone"
  ON public.post_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Categories are insertable by blog managers"
  ON public.post_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_permission(auth.uid(), 'blog:manage')
  );

CREATE POLICY "Categories are updatable by blog managers"
  ON public.post_categories FOR UPDATE
  TO authenticated
  USING (
    public.user_has_permission(auth.uid(), 'blog:manage')
  )
  WITH CHECK (
    public.user_has_permission(auth.uid(), 'blog:manage')
  );

CREATE POLICY "Categories are deletable by blog managers"
  ON public.post_categories FOR DELETE
  TO authenticated
  USING (
    public.user_has_permission(auth.uid(), 'blog:manage')
  );

-- Tags: Public read, RBAC write
CREATE POLICY "Tags are viewable by everyone"
  ON public.post_tags FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Tags are insertable by blog managers"
  ON public.post_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_permission(auth.uid(), 'blog:manage')
  );

CREATE POLICY "Tags are updatable by blog managers"
  ON public.post_tags FOR UPDATE
  TO authenticated
  USING (
    public.user_has_permission(auth.uid(), 'blog:manage')
  )
  WITH CHECK (
    public.user_has_permission(auth.uid(), 'blog:manage')
  );

CREATE POLICY "Tags are deletable by blog managers"
  ON public.post_tags FOR DELETE
  TO authenticated
  USING (
    public.user_has_permission(auth.uid(), 'blog:manage')
  );

-- Blog Posts: Published posts viewable by all, Draft posts viewable by managers/author only
CREATE POLICY "Published posts are viewable by everyone"
  ON public.blog_posts FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published' OR
    author_id = auth.uid() OR
    public.user_has_permission(auth.uid(), 'blog:manage')
  );

CREATE POLICY "Posts are insertable by blog creators"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_permission(auth.uid(), 'blog:create') AND
    author_id = auth.uid()
  );

CREATE POLICY "Posts are updatable by managers or authors"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    public.user_has_permission(auth.uid(), 'blog:manage')
  )
  WITH CHECK (
    author_id = auth.uid() OR
    public.user_has_permission(auth.uid(), 'blog:manage')
  );

CREATE POLICY "Posts are deletable by blog managers"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (
    public.user_has_permission(auth.uid(), 'blog:delete')
  );

-- Post-Tag Relations: Public read, RBAC write
CREATE POLICY "Post-tag relations are viewable by everyone"
  ON public.post_tag_relations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Post-tag relations are insertable by blog managers"
  ON public.post_tag_relations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_permission(auth.uid(), 'blog:manage')
  );

CREATE POLICY "Post-tag relations are deletable by blog managers"
  ON public.post_tag_relations FOR DELETE
  TO authenticated
  USING (
    public.user_has_permission(auth.uid(), 'blog:manage')
  );

-- =====================================================
-- 6. TRIGGERS (Updated_at auto-update)
-- =====================================================
CREATE TRIGGER update_post_categories_updated_at
  BEFORE UPDATE ON public.post_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. SAMPLE DATA (Categories & Tags) - Development Only
-- =====================================================
INSERT INTO public.post_categories (name, slug, description) VALUES
  ('AI & Technology', 'ai-technology', 'Artificial Intelligence and Technology trends'),
  ('Productivity', 'productivity', 'Tips and tools for better productivity'),
  ('Company News', 'company-news', 'Updates and announcements from VIBE WORKING')
ON CONFLICT ON CONSTRAINT post_categories_name_key DO NOTHING;

INSERT INTO public.post_tags (name, slug) VALUES
  ('AI', 'ai'),
  ('Machine Learning', 'machine-learning'),
  ('Productivity', 'productivity'),
  ('Remote Work', 'remote-work'),
  ('Tutorial', 'tutorial'),
  ('Announcement', 'announcement')
ON CONFLICT ON CONSTRAINT post_tags_name_key DO NOTHING;

-- =====================================================
-- 8. SAMPLE BLOG POSTS - Development Only
-- =====================================================
DO $$
DECLARE
  admin_user_id UUID;
  ai_category_id UUID;
  productivity_category_id UUID;
  ai_tag_id UUID;
  productivity_tag_id UUID;
  tutorial_tag_id UUID;
  post1_id UUID;
  post2_id UUID;
  post3_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@ideaonaction.local' LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin user not found - skipping sample blog posts';
    RETURN;
  END IF;

  -- Get category IDs
  SELECT id INTO ai_category_id FROM public.post_categories WHERE LOWER(slug) = 'ai-technology';
  SELECT id INTO productivity_category_id FROM public.post_categories WHERE LOWER(slug) = 'productivity';

  -- Get tag IDs
  SELECT id INTO ai_tag_id FROM public.post_tags WHERE LOWER(slug) = 'ai';
  SELECT id INTO productivity_tag_id FROM public.post_tags WHERE LOWER(slug) = 'productivity';
  SELECT id INTO tutorial_tag_id FROM public.post_tags WHERE LOWER(slug) = 'tutorial';

  -- Post 1: AI Introduction
  INSERT INTO public.blog_posts (
    title, slug, excerpt, content, author_id, category_id, status, published_at, read_time, meta_title, meta_description
  ) VALUES (
    'Getting Started with AI in Your Workflow',
    'getting-started-with-ai',
    'Discover how to integrate AI tools into your daily workflow for maximum productivity.',
    E'# Getting Started with AI in Your Workflow\n\nArtificial Intelligence is transforming the way we work. Here''s how you can get started:\n\n## 1. Identify Repetitive Tasks\n\nLook for tasks that you do repeatedly. These are prime candidates for AI automation.\n\n## 2. Choose the Right Tools\n\n- **ChatGPT**: For writing and brainstorming\n- **Midjourney**: For image generation\n- **GitHub Copilot**: For coding assistance\n\n## 3. Start Small\n\nBegin with one tool and master it before adding more to your workflow.\n\n## Conclusion\n\nAI is not here to replace you, but to augment your capabilities. Start your journey today!',
    admin_user_id,
    ai_category_id,
    'published',
    now(),
    5,
    'Getting Started with AI in Your Workflow | VIBE WORKING',
    'Learn how to integrate AI tools into your daily workflow for maximum productivity. A beginner-friendly guide.'
  ) ON CONFLICT ON CONSTRAINT idx_blog_posts_slug_lower DO NOTHING
  RETURNING id INTO post1_id;

  -- Add tags to post 1 (only if post was inserted)
  IF post1_id IS NOT NULL THEN
    INSERT INTO public.post_tag_relations (post_id, tag_id) VALUES
      (post1_id, ai_tag_id),
      (post1_id, tutorial_tag_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Post 2: Productivity Tips
  INSERT INTO public.blog_posts (
    title, slug, excerpt, content, author_id, category_id, status, published_at, read_time, meta_title, meta_description
  ) VALUES (
    '10 Productivity Hacks for Remote Workers',
    '10-productivity-hacks-remote-workers',
    'Boost your productivity with these proven strategies for remote work success.',
    E'# 10 Productivity Hacks for Remote Workers\n\nRemote work offers flexibility, but it also comes with unique challenges. Here are 10 proven hacks:\n\n## 1. Create a Dedicated Workspace\n\nSeparate work from personal life with a designated area.\n\n## 2. Use the Pomodoro Technique\n\nWork in 25-minute focused sessions with 5-minute breaks.\n\n## 3. Leverage AI Tools\n\nAutomate routine tasks with AI-powered assistants.\n\n## 4. Set Clear Boundaries\n\nCommunicate your working hours to family and colleagues.\n\n## 5. Take Regular Breaks\n\nStep away from your screen every hour.\n\n## 6-10: [Continue reading...]\n\nImplement these strategies to transform your remote work experience!',
    admin_user_id,
    productivity_category_id,
    'published',
    now() - INTERVAL '7 days',
    8,
    '10 Productivity Hacks for Remote Workers | VIBE WORKING',
    'Boost your productivity with these proven strategies for remote work success. Tips for focus, time management, and work-life balance.'
  ) ON CONFLICT ON CONSTRAINT idx_blog_posts_slug_lower DO NOTHING
  RETURNING id INTO post2_id;

  -- Add tags to post 2
  IF post2_id IS NOT NULL THEN
    INSERT INTO public.post_tag_relations (post_id, tag_id) VALUES
      (post2_id, productivity_tag_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Post 3: Draft Example
  INSERT INTO public.blog_posts (
    title, slug, excerpt, content, author_id, category_id, status, read_time
  ) VALUES (
    'Upcoming Features in VIBE WORKING',
    'upcoming-features-vibe-working',
    'A sneak peek at the exciting new features coming soon to VIBE WORKING.',
    E'# Upcoming Features in VIBE WORKING\n\n**[DRAFT - DO NOT PUBLISH]**\n\n## New Features\n\n- AI-powered task scheduling\n- Real-time collaboration tools\n- Advanced analytics dashboard\n\n*More details coming soon...*',
    admin_user_id,
    (SELECT id FROM public.post_categories WHERE LOWER(slug) = 'company-news'),
    'draft',
    3
  ) ON CONFLICT ON CONSTRAINT idx_blog_posts_slug_lower DO NOTHING
  RETURNING id INTO post3_id;

  -- Add tags to post 3
  IF post3_id IS NOT NULL THEN
    INSERT INTO public.post_tag_relations (post_id, tag_id) VALUES
      (post3_id, ai_tag_id),
      (post3_id, (SELECT id FROM public.post_tags WHERE LOWER(slug) = 'announcement'))
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Sample blog posts created successfully';
END $$;
