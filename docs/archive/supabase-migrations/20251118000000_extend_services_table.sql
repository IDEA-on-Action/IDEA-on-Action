-- ============================================
-- Services 테이블 확장: 토스페이먼츠 심사 대비
-- 일시: 2025-11-18
-- 목적: pricing_data, deliverables, process_steps, faq 컬럼 추가
-- TASK-001: services 테이블 확장 (pricing_data, deliverables, process_steps, faq)
-- ============================================

-- ============================================
-- Step 1: services 테이블에 4개 컬럼 추가
-- ============================================

-- pricing_data 컬럼 추가 (패키지/플랜 정보)
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS pricing_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.services.pricing_data IS 'Pricing information: packages or subscription plans (JSONB)';

-- deliverables 컬럼 추가 (결과물 목록)
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT NULL;

COMMENT ON COLUMN public.services.deliverables IS 'List of deliverables for this service (JSONB array)';

-- process_steps 컬럼 추가 (프로세스 단계)
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS process_steps JSONB DEFAULT NULL;

COMMENT ON COLUMN public.services.process_steps IS 'Service delivery process steps (JSONB array)';

-- faq 컬럼 추가 (FAQ 목록)
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT NULL;

COMMENT ON COLUMN public.services.faq IS 'Frequently asked questions for this service (JSONB array)';

-- ============================================
-- Step 2: 기존 서비스 데이터 검증
-- ============================================

DO $$
DECLARE
  existing_service_count INTEGER;
BEGIN
  -- 기존 서비스 개수 확인
  SELECT COUNT(*) INTO existing_service_count
  FROM public.services
  WHERE slug IN ('mvp-development', 'fullstack-development', 'design-system', 'operations-management');

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ 테이블 확장 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '추가된 컬럼:';
  RAISE NOTICE '  1. pricing_data (JSONB) - 패키지/플랜 정보';
  RAISE NOTICE '  2. deliverables (JSONB) - 결과물 목록';
  RAISE NOTICE '  3. process_steps (JSONB) - 프로세스 단계';
  RAISE NOTICE '  4. faq (JSONB) - FAQ 목록';
  RAISE NOTICE '';
  RAISE NOTICE '기존 서비스: % 개 (모두 유지됨)', existing_service_count;
  RAISE NOTICE '새 컬럼은 NULL 허용 (기존 데이터 영향 없음)';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ============================================
-- Step 3: 검증 쿼리 (테이블 스키마 확인)
-- ============================================

-- 컬럼 존재 여부 확인
DO $$
DECLARE
  pricing_data_exists BOOLEAN;
  deliverables_exists BOOLEAN;
  process_steps_exists BOOLEAN;
  faq_exists BOOLEAN;
BEGIN
  -- 각 컬럼 존재 여부 확인
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'services'
      AND column_name = 'pricing_data'
  ) INTO pricing_data_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'services'
      AND column_name = 'deliverables'
  ) INTO deliverables_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'services'
      AND column_name = 'process_steps'
  ) INTO process_steps_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'services'
      AND column_name = 'faq'
  ) INTO faq_exists;

  -- 검증 결과 출력
  IF pricing_data_exists AND deliverables_exists AND process_steps_exists AND faq_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '✨ 마이그레이션 검증 성공!';
    RAISE NOTICE '모든 컬럼이 정상적으로 추가되었습니다.';
  ELSE
    RAISE WARNING '경고: 일부 컬럼 추가 실패';
    RAISE WARNING '  - pricing_data: %', pricing_data_exists;
    RAISE WARNING '  - deliverables: %', deliverables_exists;
    RAISE WARNING '  - process_steps: %', process_steps_exists;
    RAISE WARNING '  - faq: %', faq_exists;
  END IF;
END $$;
