-- ============================================
-- order_items 테이블에 패키지 이름 컬럼 추가
-- 일시: 2025-11-15
-- 목적: 주문 생성 시 선택한 패키지 정보 보존
-- ============================================

-- ============================================
-- Step 1: order_items 테이블에 package_name 컬럼 추가
-- ============================================

-- package_name 컬럼 추가 (TEXT, NULL 허용)
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS package_name TEXT;

COMMENT ON COLUMN public.order_items.package_name IS '주문 당시 선택한 패키지 이름 (예: "기본 패키지", "스탠다드 패키지", "프리미엄 패키지")';

-- ============================================
-- Step 2: 검증 쿼리
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ order_items 테이블에 package_name 컬럼 추가 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📦 새 컬럼:';
  RAISE NOTICE '  - package_name TEXT (주문 당시 패키지 이름)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ 이제 주문 내역에 어떤 패키지를 선택했는지 저장됩니다!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
