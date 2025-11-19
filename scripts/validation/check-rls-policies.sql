-- ============================================
-- RLS 정책 확인 (service_packages, subscription_plans)
-- ============================================

-- 1. service_packages RLS 정책
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'service_packages'
ORDER BY policyname;

-- 2. subscription_plans RLS 정책
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'subscription_plans'
ORDER BY policyname;

-- 3. anon 권한 확인
SELECT
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_name IN ('service_packages', 'subscription_plans')
ORDER BY table_name, privilege_type;
