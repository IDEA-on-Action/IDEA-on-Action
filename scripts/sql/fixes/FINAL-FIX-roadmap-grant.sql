-- ============================================
-- 최종 해결: roadmap 테이블 GRANT 권한 부여
-- 일시: 2025-11-13
-- 근본 원인: roadmap 테이블에만 anon 역할 SELECT 권한 누락
-- 실행 방법: Supabase Dashboard SQL Editor에서 실행
-- ============================================

-- roadmap 테이블에 anon, authenticated 역할 SELECT 권한 부여
GRANT SELECT ON public.roadmap TO anon;
GRANT SELECT ON public.roadmap TO authenticated;

-- 권한 확인
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'roadmap'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;
