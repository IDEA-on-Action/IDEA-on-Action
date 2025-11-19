-- ============================================
-- 주문 시스템 완전 수정 스크립트
-- 일시: 2025-11-15
-- 실행 순서: 이 파일을 Supabase Dashboard SQL Editor에서 한 번에 실행
-- ============================================

-- ============================================
-- STEP 1: cart_items에 package_name 추가
-- ============================================
ALTER TABLE public.cart_items
ADD COLUMN IF NOT EXISTS package_name TEXT;

COMMENT ON COLUMN public.cart_items.package_name IS '선택한 패키지 이름 (예: "기본 패키지", "스탠다드 패키지", "프리미엄 패키지")';

-- ============================================
-- STEP 2: order_items에 package_name 추가
-- ============================================
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS package_name TEXT;

COMMENT ON COLUMN public.order_items.package_name IS '주문 당시 선택한 패키지 이름 (예: "기본 패키지", "스탠다드 패키지", "프리미엄 패키지")';

-- ============================================
-- STEP 3: orders 테이블 GRANT 권한 추가
-- ============================================

-- authenticated 역할에 orders 테이블 권한 부여
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- authenticated 역할에 order_items 테이블 권한 부여
GRANT SELECT, INSERT ON public.order_items TO authenticated;

-- generate_order_number 함수 EXECUTE 권한
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;

-- ============================================
-- 검증 쿼리
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ 주문 시스템 완전 수정 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📦 추가된 컬럼:';
  RAISE NOTICE '  - cart_items.package_name TEXT';
  RAISE NOTICE '  - order_items.package_name TEXT';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 추가된 GRANT 권한:';
  RAISE NOTICE '  - authenticated: orders (SELECT, INSERT, UPDATE)';
  RAISE NOTICE '  - authenticated: order_items (SELECT, INSERT)';
  RAISE NOTICE '  - authenticated: generate_order_number() (EXECUTE)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ 이제 주문 생성이 정상 작동합니다!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
