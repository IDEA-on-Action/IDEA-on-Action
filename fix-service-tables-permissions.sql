-- ============================================
-- 서비스 플랫폼 테이블 권한 확인 및 수정
-- 목적: service_packages, subscription_plans 테이블에 anon/authenticated 역할 SELECT 권한 부여
-- 일시: 2025-11-19
-- 참고: check-blog-table-permissions.sql 패턴 따름
-- ============================================

-- STEP 1: 현재 권한 확인
SELECT
  table_name,
  array_agg(DISTINCT privilege_type) as privileges,
  array_agg(DISTINCT grantee) as grantees
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('service_packages', 'subscription_plans')
GROUP BY table_name
ORDER BY table_name;

-- STEP 2: anon 역할에게 SELECT 권한 부여
GRANT SELECT ON public.service_packages TO anon;
GRANT SELECT ON public.subscription_plans TO anon;

-- STEP 3: authenticated 역할에게도 SELECT 권한 부여
GRANT SELECT ON public.service_packages TO authenticated;
GRANT SELECT ON public.subscription_plans TO authenticated;

-- STEP 4: 권한 재확인
SELECT
  table_name,
  array_agg(DISTINCT privilege_type) as privileges,
  array_agg(DISTINCT grantee) as grantees
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('service_packages', 'subscription_plans')
GROUP BY table_name
ORDER BY table_name;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 서비스 플랫폼 테이블 권한 설정 완료!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 테스트 방법:';
  RAISE NOTICE '1. 스크립트 실행: node scripts/check-service-tables.cjs';
  RAISE NOTICE '2. 브라우저에서 http://localhost:8080/services/fed76f94-b3a0-4c88-9540-cf3f98ef354c 새로고침';
  RAISE NOTICE '3. 프로덕션: https://www.ideaonaction.ai/services/compass-navigator';
END $$;
