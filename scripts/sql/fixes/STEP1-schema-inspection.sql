-- ============================================
-- STEP 1: Supabase 스키마 조회
-- 일시: 2025-11-13
-- 목적: 정확한 스키마 파악 후 RLS 정책 작성
-- 실행 방법: Supabase Dashboard SQL Editor에서 실행
-- ============================================

-- ============================================
-- 1. public 스키마의 모든 테이블 목록
-- ============================================
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 2. 대상 테이블의 컬럼 정보
-- ============================================
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('newsletter_subscriptions', 'roadmap', 'projects', 'bounties', 'logs')
ORDER BY table_name, ordinal_position;

-- ============================================
-- 3. 현재 GRANT 권한 확인 (올바른 컬럼명 사용)
-- ============================================
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'postgres')
  AND table_name IN ('newsletter_subscriptions', 'roadmap', 'projects', 'bounties', 'logs')
ORDER BY table_name, grantee, privilege_type;

-- ============================================
-- 4. 현재 RLS 활성화 상태
-- ============================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('newsletter_subscriptions', 'roadmap', 'projects', 'bounties', 'logs')
ORDER BY tablename;

-- ============================================
-- 5. 현재 RLS 정책 목록
-- ============================================
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
WHERE schemaname = 'public'
  AND tablename IN ('newsletter_subscriptions', 'roadmap', 'projects', 'bounties', 'logs')
ORDER BY tablename, policyname;

-- ============================================
-- 6. 역할(Role) 확인
-- ============================================
SELECT
  rolname,
  rolsuper,
  rolinherit,
  rolcreaterole,
  rolcreatedb,
  rolcanlogin
FROM pg_roles
WHERE rolname IN ('anon', 'authenticated', 'postgres', 'service_role')
ORDER BY rolname;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ 스키마 조회 완료!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 다음 단계:';
  RAISE NOTICE '1. 위 쿼리 결과를 모두 복사';
  RAISE NOTICE '2. Claude에게 전달';
  RAISE NOTICE '3. 정확한 RLS SQL 생성 대기';
END $$;
