-- ============================================
-- services 테이블 GRANT 권한 추가
-- 일시: 2025-11-15
-- 목적: services 테이블 조회 시 403 Forbidden 오류 해결
-- ============================================

-- ============================================
-- PostgreSQL GRANT 권한 추가
-- ============================================

-- authenticated 역할에 services 테이블 SELECT 권한 부여
GRANT SELECT ON public.services TO authenticated;

-- anon 역할에 services 테이블 SELECT 권한 부여 (읽기 전용)
GRANT SELECT ON public.services TO anon;

-- 관리자는 모든 권한 필요
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;

-- ============================================
-- 검증 쿼리
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ services 테이블 GRANT 권한 추가 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔐 GRANT 권한:';
  RAISE NOTICE '  - authenticated: SELECT, INSERT, UPDATE, DELETE';
  RAISE NOTICE '  - anon: SELECT (읽기 전용)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ 이제 로그인한 사용자가 서비스를 조회할 수 있습니다!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
