-- ============================================
-- Apply Newsletter RLS Policies
-- Temporary migration to fix newsletter_subscriptions permissions
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "newsletter_admin_read" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "newsletter_public_insert" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "newsletter_owner_update" ON public.newsletter_subscriptions;

-- 누구나 구독 가능 (INSERT) - anon과 authenticated 모두 허용
CREATE POLICY "newsletter_public_insert"
  ON public.newsletter_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 관리자는 모든 구독자 조회 가능 (SELECT)
CREATE POLICY "newsletter_admin_read"
  ON public.newsletter_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- 본인 이메일만 업데이트 가능 (UPDATE)
CREATE POLICY "newsletter_owner_update"
  ON public.newsletter_subscriptions
  FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Verification message
DO $$
BEGIN
  RAISE NOTICE '✅ Newsletter RLS policies applied successfully!';
END $$;
