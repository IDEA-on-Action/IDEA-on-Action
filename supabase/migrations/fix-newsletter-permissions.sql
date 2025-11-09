-- ============================================
-- Fix Newsletter Subscriptions Permissions
-- Grant table-level permissions + RLS policies
-- ============================================

-- 1. Grant table-level permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.newsletter_subscriptions TO anon, authenticated;

-- 2. Enable Row Level Security
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies
DROP POLICY IF EXISTS "newsletter_admin_read" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "newsletter_public_insert" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "newsletter_owner_update" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.newsletter_subscriptions;

-- 4. Create simple INSERT policy for everyone
CREATE POLICY "Enable insert for anonymous users"
  ON public.newsletter_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 5. Create SELECT policy for admins only
CREATE POLICY "Enable select for admins"
  ON public.newsletter_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- 6. Create UPDATE policy for own email
CREATE POLICY "Enable update for own email"
  ON public.newsletter_subscriptions
  FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Newsletter permissions and policies applied!';
  RAISE NOTICE '📋 Granted: SELECT, INSERT, UPDATE to anon and authenticated';
  RAISE NOTICE '🔒 RLS Policies: 3 policies created';
END $$;
