-- ============================================
-- Services Platform RLS 정책 검증 스크립트
-- 목적: services, service_packages, subscription_plans RLS 정책 확인
-- 사용법: psql -U postgres -d postgres -f scripts/check-services-rls-policies.sql
-- TASK-004: RLS 정책 검증
-- ============================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔐 Services Platform RLS 정책 검증'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- ============================================
-- 1. services 테이블 RLS 정책 확인
-- ============================================

\echo '1️⃣  services 테이블 RLS 정책'
\echo ''

SELECT
  schemaname AS "스키마",
  tablename AS "테이블",
  policyname AS "정책명",
  permissive AS "허용",
  roles AS "역할",
  cmd AS "명령",
  qual AS "조건"
FROM
  pg_policies
WHERE
  schemaname = 'public'
  AND tablename = 'services'
ORDER BY
  policyname;

\echo ''

-- ============================================
-- 2. service_packages 테이블 RLS 정책 확인
-- ============================================

\echo '2️⃣  service_packages 테이블 RLS 정책'
\echo ''

SELECT
  schemaname AS "스키마",
  tablename AS "테이블",
  policyname AS "정책명",
  permissive AS "허용",
  roles AS "역할",
  cmd AS "명령"
FROM
  pg_policies
WHERE
  schemaname = 'public'
  AND tablename = 'service_packages'
ORDER BY
  policyname;

\echo ''

-- ============================================
-- 3. subscription_plans 테이블 RLS 정책 확인
-- ============================================

\echo '3️⃣  subscription_plans 테이블 RLS 정책'
\echo ''

SELECT
  schemaname AS "스키마",
  tablename AS "테이블",
  policyname AS "정책명",
  permissive AS "허용",
  roles AS "역할",
  cmd AS "명령"
FROM
  pg_policies
WHERE
  schemaname = 'public'
  AND tablename = 'subscription_plans'
ORDER BY
  policyname;

\echo ''

-- ============================================
-- 4. RLS 활성화 여부 확인
-- ============================================

\echo '4️⃣  RLS 활성화 상태'
\echo ''

SELECT
  schemaname AS "스키마",
  tablename AS "테이블",
  rowsecurity AS "RLS 활성화"
FROM
  pg_tables
WHERE
  schemaname = 'public'
  AND tablename IN ('services', 'service_packages', 'subscription_plans')
ORDER BY
  tablename;

\echo ''

-- ============================================
-- 5. 테이블별 정책 개수 요약
-- ============================================

\echo '5️⃣  RLS 정책 개수 요약'
\echo ''

SELECT
  tablename AS "테이블",
  COUNT(*) AS "정책 개수",
  COUNT(*) FILTER (WHERE cmd = 'SELECT') AS "SELECT 정책",
  COUNT(*) FILTER (WHERE cmd = 'INSERT') AS "INSERT 정책",
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') AS "UPDATE 정책",
  COUNT(*) FILTER (WHERE cmd = 'DELETE') AS "DELETE 정책"
FROM
  pg_policies
WHERE
  schemaname = 'public'
  AND tablename IN ('services', 'service_packages', 'subscription_plans')
GROUP BY
  tablename
ORDER BY
  tablename;

\echo ''

-- ============================================
-- 6. 예상 정책 vs 실제 정책 검증
-- ============================================

\echo '6️⃣  정책 검증 (예상 vs 실제)'
\echo ''

DO $$
DECLARE
  services_policy_count INTEGER;
  packages_policy_count INTEGER;
  plans_policy_count INTEGER;
  services_rls_enabled BOOLEAN;
  packages_rls_enabled BOOLEAN;
  plans_rls_enabled BOOLEAN;
BEGIN
  -- 정책 개수 확인
  SELECT COUNT(*) INTO services_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'services';

  SELECT COUNT(*) INTO packages_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'service_packages';

  SELECT COUNT(*) INTO plans_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'subscription_plans';

  -- RLS 활성화 여부 확인
  SELECT rowsecurity INTO services_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'services';

  SELECT rowsecurity INTO packages_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'service_packages';

  SELECT rowsecurity INTO plans_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'subscription_plans';

  -- 결과 출력
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ RLS 정책 검증 결과';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 services 테이블:';
  RAISE NOTICE '   - RLS 활성화: %', services_rls_enabled;
  RAISE NOTICE '   - 정책 개수: % (예상: 6개)', services_policy_count;

  IF services_policy_count < 6 THEN
    RAISE WARNING '⚠️  services 정책 부족! (현재: %, 예상: 6)', services_policy_count;
  ELSE
    RAISE NOTICE '   ✅ 정책 개수 정상';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📦 service_packages 테이블:';
  RAISE NOTICE '   - RLS 활성화: %', packages_rls_enabled;
  RAISE NOTICE '   - 정책 개수: % (예상: 4개)', packages_policy_count;

  IF packages_policy_count < 4 THEN
    RAISE WARNING '⚠️  service_packages 정책 부족! (현재: %, 예상: 4)', packages_policy_count;
  ELSE
    RAISE NOTICE '   ✅ 정책 개수 정상';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '💳 subscription_plans 테이블:';
  RAISE NOTICE '   - RLS 활성화: %', plans_rls_enabled;
  RAISE NOTICE '   - 정책 개수: % (예상: 4개)', plans_policy_count;

  IF plans_policy_count < 4 THEN
    RAISE WARNING '⚠️  subscription_plans 정책 부족! (현재: %, 예상: 4)', plans_policy_count;
  ELSE
    RAISE NOTICE '   ✅ 정책 개수 정상';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  IF services_rls_enabled AND packages_rls_enabled AND plans_rls_enabled
     AND services_policy_count >= 6 AND packages_policy_count >= 4 AND plans_policy_count >= 4 THEN
    RAISE NOTICE '🎉 모든 RLS 정책이 정상적으로 설정되었습니다!';
  ELSE
    RAISE WARNING '❌ 일부 RLS 정책에 문제가 있습니다. 위 내용을 확인하세요.';
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✨ RLS 정책 검증 완료!'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '📌 다음 단계: Supabase 대시보드에서 RLS 테스트'
\echo '   1. SQL Editor → Settings → "Run as" → "anon" 선택'
\echo '   2. SELECT * FROM service_packages LIMIT 1; (성공해야 함)'
\echo '   3. INSERT INTO service_packages ... (실패해야 함)'
\echo '   4. Settings → "Run as" → "postgres" 선택'
\echo '   5. INSERT INTO service_packages ... (성공해야 함)'
\echo ''
