-- ============================================
-- Newsletter RLS 정책 정리 및 재생성
-- 일시: 2025-11-13
-- 근본 원인: 중복된 정책으로 인한 충돌 + anon SELECT 정책 부재
-- 실행 방법: Supabase Dashboard SQL Editor에서 실행
-- ============================================

-- ============================================
-- STEP 1: 모든 기존 정책 삭제
-- ============================================
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Enable select for admins" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Enable update for own email" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "newsletter_admin_read" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "newsletter_owner_update" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "newsletter_public_insert" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "read_subscriptions_for_authenticated" ON public.newsletter_subscriptions;

-- ============================================
-- STEP 2: RLS 활성화 확인
-- ============================================
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: 간단하고 명확한 정책 생성
-- ============================================

-- 1. INSERT 정책: anon, authenticated 모두 구독 가능
CREATE POLICY "newsletter_insert"
  ON public.newsletter_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. SELECT 정책: anon도 모든 행 조회 가능 (INSERT RETURNING용)
--    보안 참고: 실제 프로덕션에서는 제한 필요
CREATE POLICY "newsletter_select"
  ON public.newsletter_subscriptions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. UPDATE 정책: authenticated 사용자만, 본인 이메일만
CREATE POLICY "newsletter_update"
  ON public.newsletter_subscriptions
  FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 4. DELETE 정책: 관리자만
CREATE POLICY "newsletter_delete"
  ON public.newsletter_subscriptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- ============================================
-- STEP 4: 정책 확인
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  CASE
    WHEN qual IS NULL THEN 'No restriction'
    ELSE 'Has restriction'
  END as using_clause,
  CASE
    WHEN with_check IS NULL THEN 'No restriction'
    ELSE 'Has restriction'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'newsletter_subscriptions'
ORDER BY policyname;
