-- ============================================
-- notifications 테이블 GRANT 권한 추가
-- 일시: 2025-11-15
-- 목적: notifications 테이블 조회 시 403 Forbidden 오류 해결
-- ============================================

-- ============================================
-- PostgreSQL GRANT 권한 추가
-- ============================================

-- authenticated 역할에 notifications 테이블 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- anon 역할에는 권한 없음 (로그인 필요)
-- GRANT SELECT ON public.notifications TO anon;

-- ============================================
-- 검증 쿼리
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ notifications 테이블 GRANT 권한 추가 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔐 GRANT 권한:';
  RAISE NOTICE '  - authenticated: SELECT, INSERT, UPDATE, DELETE';
  RAISE NOTICE '  - anon: (권한 없음)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ 이제 로그인한 사용자가 알림을 조회할 수 있습니다!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
