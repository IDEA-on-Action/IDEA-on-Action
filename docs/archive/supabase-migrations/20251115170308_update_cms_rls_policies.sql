-- CMS: Update all CMS table RLS policies to use is_super_admin() function
-- Purpose: Fix infinite recursion issues by using security definer function

-- Ensure is_super_admin function exists (created in admins migration)
-- This function is marked SECURITY DEFINER to avoid RLS recursion

-- Also create helper functions for other admin checks
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = user_uuid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_admin_delete(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = user_uuid
      AND role IN ('super_admin', 'admin')
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin_user IS 'Check if user is any type of admin (security definer to avoid recursion)';
COMMENT ON FUNCTION public.can_admin_delete IS 'Check if user can delete (super_admin or admin, not editor)';

-- =====================================================
-- Update roadmap_items RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Public can view published roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Admins can create roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Admins can update roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Admins can delete roadmap items" ON public.roadmap_items;

CREATE POLICY "Public can view published roadmap items"
  ON public.roadmap_items
  FOR SELECT
  USING (published = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can create roadmap items"
  ON public.roadmap_items
  FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update roadmap items"
  ON public.roadmap_items
  FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete roadmap items"
  ON public.roadmap_items
  FOR DELETE
  USING (public.can_admin_delete(auth.uid()));

-- =====================================================
-- Update portfolio_items RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Public can view published portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Admins can create portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Admins can update portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Admins can delete portfolio items" ON public.portfolio_items;

CREATE POLICY "Public can view published portfolio items"
  ON public.portfolio_items
  FOR SELECT
  USING (published = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can create portfolio items"
  ON public.portfolio_items
  FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update portfolio items"
  ON public.portfolio_items
  FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete portfolio items"
  ON public.portfolio_items
  FOR DELETE
  USING (public.can_admin_delete(auth.uid()));

-- =====================================================
-- Update lab_items RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Public can view published lab items" ON public.lab_items;
DROP POLICY IF EXISTS "Admins can create lab items" ON public.lab_items;
DROP POLICY IF EXISTS "Admins can update lab items" ON public.lab_items;
DROP POLICY IF EXISTS "Admins can delete lab items" ON public.lab_items;

CREATE POLICY "Public can view published lab items"
  ON public.lab_items
  FOR SELECT
  USING (published = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can create lab items"
  ON public.lab_items
  FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update lab items"
  ON public.lab_items
  FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete lab items"
  ON public.lab_items
  FOR DELETE
  USING (public.can_admin_delete(auth.uid()));

-- =====================================================
-- Update team_members RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Public can view active team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can create team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can delete team members" ON public.team_members;

CREATE POLICY "Public can view active team members"
  ON public.team_members
  FOR SELECT
  USING (active = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can create team members"
  ON public.team_members
  FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update team members"
  ON public.team_members
  FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete team members"
  ON public.team_members
  FOR DELETE
  USING (public.can_admin_delete(auth.uid()));

-- =====================================================
-- Update blog_categories RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Blog categories are viewable by everyone" ON public.blog_categories;
DROP POLICY IF EXISTS "Admins can create blog categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Admins can update blog categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Admins can delete blog categories" ON public.blog_categories;

CREATE POLICY "Blog categories are viewable by everyone"
  ON public.blog_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can create blog categories"
  ON public.blog_categories
  FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update blog categories"
  ON public.blog_categories
  FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete blog categories"
  ON public.blog_categories
  FOR DELETE
  USING (public.can_admin_delete(auth.uid()));

-- =====================================================
-- Update tags RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.tags;
DROP POLICY IF EXISTS "Admins can create tags" ON public.tags;
DROP POLICY IF EXISTS "Admins can update tags" ON public.tags;
DROP POLICY IF EXISTS "Admins can delete tags" ON public.tags;

CREATE POLICY "Tags are viewable by everyone"
  ON public.tags
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can create tags"
  ON public.tags
  FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update tags"
  ON public.tags
  FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete tags"
  ON public.tags
  FOR DELETE
  USING (public.can_admin_delete(auth.uid()));

-- =====================================================
-- Update blog_posts RLS policies (for CMS admins)
-- =====================================================

-- Note: blog_posts already has RBAC policies from Phase 11
-- We ADD new policies for CMS admins (policies are OR-ed together)

-- Admins can view all posts (including drafts)
CREATE POLICY "CMS admins can view all blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (public.is_admin_user(auth.uid()));

-- Admins can create posts
CREATE POLICY "CMS admins can create blog posts"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (
    public.is_admin_user(auth.uid()) AND
    author_id = auth.uid()
  );

-- Admins can update posts
CREATE POLICY "CMS admins can update blog posts"
  ON public.blog_posts
  FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

-- Admin/Super Admin can delete posts (Editor cannot)
CREATE POLICY "CMS admins can delete blog posts"
  ON public.blog_posts
  FOR DELETE
  USING (public.can_admin_delete(auth.uid()));
