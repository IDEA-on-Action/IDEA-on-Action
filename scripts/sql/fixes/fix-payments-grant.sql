-- ============================================
-- payments 테이블 GRANT 권한 추가
-- 일시: 2025-11-15
-- 목적: 결제 정보 저장 시 403 Forbidden 오류 해결
-- ============================================

-- ============================================
-- PostgreSQL GRANT 권한 추가
-- ============================================

-- authenticated 역할에 payments 테이블 권한 부여
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;

-- anon 역할에는 권한 없음 (로그인 필요)
-- GRANT SELECT ON public.payments TO anon;

-- ============================================
-- 검증 쿼리
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ payments 테이블 GRANT 권한 추가 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔐 GRANT 권한:';
  RAISE NOTICE '  - authenticated: payments (SELECT, INSERT, UPDATE)';
  RAISE NOTICE '  - anon: (권한 없음)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ 이제 로그인한 사용자가 결제 정보를 저장할 수 있습니다!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
