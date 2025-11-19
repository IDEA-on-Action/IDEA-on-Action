-- ============================================
-- orders 및 order_items 테이블 GRANT 권한 추가
-- 일시: 2025-11-15
-- 목적: 주문 생성 시 403 Forbidden 오류 해결
-- ============================================

-- ============================================
-- PostgreSQL GRANT 권한 추가
-- ============================================

-- authenticated 역할에 orders 테이블 권한 부여
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- authenticated 역할에 order_items 테이블 권한 부여
GRANT SELECT, INSERT ON public.order_items TO authenticated;

-- anon 역할에는 권한 없음 (로그인 필요)
-- GRANT SELECT ON public.orders TO anon;
-- GRANT SELECT ON public.order_items TO anon;

-- ============================================
-- RPC 함수 권한 추가
-- ============================================

-- generate_order_number 함수 EXECUTE 권한
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;

-- ============================================
-- 검증 쿼리
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ orders 및 order_items 테이블 GRANT 권한 추가 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔐 GRANT 권한:';
  RAISE NOTICE '  - authenticated: orders (SELECT, INSERT, UPDATE)';
  RAISE NOTICE '  - authenticated: order_items (SELECT, INSERT)';
  RAISE NOTICE '  - authenticated: generate_order_number() (EXECUTE)';
  RAISE NOTICE '  - anon: (권한 없음)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ 이제 로그인한 사용자가 주문을 생성할 수 있습니다!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
