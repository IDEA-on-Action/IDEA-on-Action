-- ============================================
-- user_roles 테이블 GRANT 권한 부여
-- 일시: 2025-11-13
-- 근본 원인: Newsletter INSERT 후 SELECT 시 user_roles 조회 권한 필요
-- 실행 방법: Supabase Dashboard SQL Editor에서 실행
-- ============================================

-- user_roles 테이블에 anon, authenticated 역할 SELECT 권한 부여
GRANT SELECT ON public.user_roles TO anon;
GRANT SELECT ON public.user_roles TO authenticated;

-- roles 테이블에도 권한 부여 (user_roles와 JOIN되므로)
GRANT SELECT ON public.roles TO anon;
GRANT SELECT ON public.roles TO authenticated;

-- 권한 확인
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('user_roles', 'roles')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;
