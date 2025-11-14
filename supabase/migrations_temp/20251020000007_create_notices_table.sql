-- Phase 11 Week 2: Notices System
-- Migration: 20251020000007_create_notices_table.sql
-- Author: Claude AI
-- Date: 2025-10-20

-- =====================================================
-- 0. PREREQUISITES
-- =====================================================
-- pgcrypto extension should already be created in migration 006
-- update_updated_at_column() function should exist from migration 001
-- user_has_permission() function should exist from migration 002

-- =====================================================
-- 1. NOTICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent', 'maintenance')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID NOT NULL, -- FK to auth.users.id (constraint added separately)
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Business rule: published notices must have published_at
  CONSTRAINT published_notices_must_have_date CHECK (
    status != 'published' OR published_at IS NOT NULL
  ),

  -- Business rule: expires_at must be after published_at
  CONSTRAINT expires_after_published CHECK (
    expires_at IS NULL OR published_at IS NULL OR expires_at > published_at
  )
);

COMMENT ON TABLE public.notices IS 'System notices and announcements';
COMMENT ON COLUMN public.notices.type IS 'info, warning, urgent, or maintenance';
COMMENT ON COLUMN public.notices.status IS 'draft, published, or archived';
COMMENT ON COLUMN public.notices.is_pinned IS 'Show at the top of the list';
COMMENT ON COLUMN public.notices.expires_at IS 'Notice will be hidden after this date';

-- Note: Foreign key to auth.users is not enforced at database level
-- This is by design in Supabase - auth schema is managed separately
-- Referential integrity is enforced via RLS policies and application logic

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notices_status ON public.notices(status);
CREATE INDEX IF NOT EXISTS idx_notices_type ON public.notices(type);
CREATE INDEX IF NOT EXISTS idx_notices_is_pinned ON public.notices(is_pinned);

-- Partial index for active notices (most common query)
-- Note: Cannot use now() in index predicate (must be IMMUTABLE)
-- Filter expires_at > now() in application queries instead
CREATE INDEX IF NOT EXISTS idx_notices_active
  ON public.notices(is_pinned DESC, published_at DESC)
  WHERE status = 'published' AND expires_at IS NULL;

-- Additional index for notices with expiration dates
CREATE INDEX IF NOT EXISTS idx_notices_expires_at
  ON public.notices(expires_at)
  WHERE status = 'published' AND expires_at IS NOT NULL;

-- =====================================================
-- 2. RLS POLICIES (RBAC-based)
-- =====================================================

-- Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Published notices are viewable by everyone
CREATE POLICY "Published notices are viewable by everyone"
  ON public.notices FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published' OR
    author_id = auth.uid() OR
    public.user_has_permission(auth.uid(), 'notice:manage')
  );

-- Notices are insertable by notice creators
CREATE POLICY "Notices are insertable by notice creators"
  ON public.notices FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_permission(auth.uid(), 'notice:create') AND
    author_id = auth.uid()
  );

-- Notices are updatable by managers or authors
CREATE POLICY "Notices are updatable by managers or authors"
  ON public.notices FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    public.user_has_permission(auth.uid(), 'notice:manage')
  )
  WITH CHECK (
    author_id = auth.uid() OR
    public.user_has_permission(auth.uid(), 'notice:manage')
  );

-- Notices are deletable by notice managers
CREATE POLICY "Notices are deletable by notice managers"
  ON public.notices FOR DELETE
  TO authenticated
  USING (
    public.user_has_permission(auth.uid(), 'notice:delete')
  );

-- =====================================================
-- 3. TRIGGERS (Updated_at auto-update)
-- =====================================================
CREATE TRIGGER update_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. SAMPLE NOTICES - Development Only
-- =====================================================
DO $$
DECLARE
  admin_user_id UUID;
  notice1_id UUID;
  notice2_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@ideaonaction.local' LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin user not found - skipping sample notices';
    RETURN;
  END IF;

  -- Notice 1: Welcome (Pinned)
  INSERT INTO public.notices (
    title, content, type, status, author_id, published_at, is_pinned
  ) VALUES (
    'Welcome to VIBE WORKING!',
    E'We''re excited to announce the launch of our new platform.\n\nExplore our AI-powered services and boost your productivity today!\n\n**Key Features:**\n- AI Task Automation\n- Smart Scheduling\n- Team Collaboration\n\nGet started now!',
    'info',
    'published',
    admin_user_id,
    now(),
    true
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO notice1_id;

  -- Notice 2: Maintenance
  INSERT INTO public.notices (
    title, content, type, status, author_id, published_at, expires_at
  ) VALUES (
    'Scheduled Maintenance - Oct 25',
    E'**Maintenance Window:** October 25, 2025, 2:00 AM - 4:00 AM KST\n\n**What to expect:**\n- Brief service interruptions (5-10 minutes)\n- Database optimization\n- Performance improvements\n\nWe apologize for any inconvenience.',
    'maintenance',
    'published',
    admin_user_id,
    now(),
    now() + INTERVAL '5 days'
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO notice2_id;

  RAISE NOTICE 'Sample notices created successfully';
END $$;
