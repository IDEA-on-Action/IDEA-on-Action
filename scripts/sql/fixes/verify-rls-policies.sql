-- ============================================
-- RLS 정책 검증 스크립트
-- 실행 후 결과를 확인하여 정책이 올바르게 설정되었는지 확인
-- ============================================

-- ============================================
-- 1. notifications 테이블 확인
-- ============================================

\echo '=== 1. notifications 테이블 확인 ==='

-- 테이블 존재 확인
SELECT
  '테이블 존재 여부' AS check_item,
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
  ) AS result;

-- RLS 활성화 확인
SELECT
  '🔒 RLS 활성화' AS check_item,
  tablename,
  rowsecurity AS enabled
FROM pg_tables
WHERE tablename = 'notifications';

-- RLS 정책 확인 (4개 예상)
SELECT
  '📋 RLS 정책 목록' AS check_item,
  policyname,
  cmd AS operation,
  CASE
    WHEN qual IS NOT NULL THEN 'USING'
    WHEN with_check IS NOT NULL THEN 'WITH CHECK'
    ELSE 'N/A'
  END AS policy_type
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd;

-- ============================================
-- 2. carts 테이블 확인
-- ============================================

\echo ''
\echo '=== 2. carts 테이블 확인 ==='

-- RLS 활성화 확인
SELECT
  '🔒 RLS 활성화' AS check_item,
  tablename,
  rowsecurity AS enabled
FROM pg_tables
WHERE tablename = 'carts';

-- RLS 정책 확인 (4개 예상)
SELECT
  '📋 RLS 정책 목록' AS check_item,
  policyname,
  cmd AS operation,
  CASE
    WHEN qual IS NOT NULL THEN 'USING'
    WHEN with_check IS NOT NULL THEN 'WITH CHECK'
    ELSE 'N/A'
  END AS policy_type
FROM pg_policies
WHERE tablename = 'carts'
ORDER BY cmd;

-- ============================================
-- 3. cart_items 테이블 확인
-- ============================================

\echo ''
\echo '=== 3. cart_items 테이블 확인 ==='

-- RLS 활성화 확인
SELECT
  '🔒 RLS 활성화' AS check_item,
  tablename,
  rowsecurity AS enabled
FROM pg_tables
WHERE tablename = 'cart_items';

-- RLS 정책 확인 (4개 예상)
SELECT
  '📋 RLS 정책 목록' AS check_item,
  policyname,
  cmd AS operation,
  CASE
    WHEN qual IS NOT NULL THEN 'USING'
    WHEN with_check IS NOT NULL THEN 'WITH CHECK'
    ELSE 'N/A'
  END AS policy_type
FROM pg_policies
WHERE tablename = 'cart_items'
ORDER BY cmd;

-- ============================================
-- 4. user_roles 테이블 확인
-- ============================================

\echo ''
\echo '=== 4. user_roles 테이블 확인 ==='

-- RLS 활성화 확인
SELECT
  '🔒 RLS 활성화' AS check_item,
  tablename,
  rowsecurity AS enabled
FROM pg_tables
WHERE tablename = 'user_roles';

-- RLS 정책 확인 (2개 예상)
SELECT
  '📋 RLS 정책 목록' AS check_item,
  policyname,
  cmd AS operation,
  CASE
    WHEN qual IS NOT NULL THEN 'USING'
    WHEN with_check IS NOT NULL THEN 'WITH CHECK'
    ELSE 'N/A'
  END AS policy_type
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY cmd;

-- ============================================
-- 5. roles 테이블 확인
-- ============================================

\echo ''
\echo '=== 5. roles 테이블 확인 ==='

-- RLS 활성화 확인
SELECT
  '🔒 RLS 활성화' AS check_item,
  tablename,
  rowsecurity AS enabled
FROM pg_tables
WHERE tablename = 'roles';

-- RLS 정책 확인 (1개 예상)
SELECT
  '📋 RLS 정책 목록' AS check_item,
  policyname,
  cmd AS operation,
  CASE
    WHEN qual IS NOT NULL THEN 'USING'
    WHEN with_check IS NOT NULL THEN 'WITH CHECK'
    ELSE 'N/A'
  END AS policy_type
FROM pg_policies
WHERE tablename = 'roles'
ORDER BY cmd;

-- ============================================
-- 6. user_profiles 테이블 확인
-- ============================================

\echo ''
\echo '=== 6. user_profiles 테이블 확인 ==='

-- RLS 활성화 확인
SELECT
  '🔒 RLS 활성화' AS check_item,
  tablename,
  rowsecurity AS enabled
FROM pg_tables
WHERE tablename = 'user_profiles';

-- RLS 정책 확인 (4개 예상)
SELECT
  '📋 RLS 정책 목록' AS check_item,
  policyname,
  cmd AS operation,
  CASE
    WHEN qual IS NOT NULL THEN 'USING'
    WHEN with_check IS NOT NULL THEN 'WITH CHECK'
    ELSE 'N/A'
  END AS policy_type
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd;

-- ============================================
-- 7. 전체 요약
-- ============================================

\echo ''
\echo '=== 7. 전체 요약 ==='

SELECT
  tablename,
  COUNT(*) AS policy_count,
  string_agg(DISTINCT cmd::text, ', ') AS operations
FROM pg_policies
WHERE tablename IN ('notifications', 'carts', 'cart_items', 'user_roles', 'roles', 'user_profiles')
GROUP BY tablename
ORDER BY tablename;

-- 예상 결과:
-- notifications: 4개 (SELECT, UPDATE, DELETE, INSERT)
-- carts: 4개 (SELECT, INSERT, UPDATE, DELETE)
-- cart_items: 4개 (SELECT, INSERT, UPDATE, DELETE)
-- user_roles: 2개 (SELECT)
-- roles: 1개 (SELECT)
-- user_profiles: 4개 (SELECT, INSERT, UPDATE)
