-- ============================================
-- service_packages 테이블 생성: 일회성 프로젝트 패키지
-- 일시: 2025-11-18
-- 목적: 서비스별 패키지 정보 저장 (MVP, 풀스택 등)
-- TASK-002: service_packages 테이블 생성
-- ============================================

-- ============================================
-- Step 1: service_packages 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,

  -- 패키지 정보
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  features JSONB DEFAULT '[]', -- 패키지 포함 기능 목록 (JSONB array)

  -- 표시 옵션
  is_popular BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.service_packages IS 'Service packages for one-time project services (e.g., MVP Standard, MVP Pro)';
COMMENT ON COLUMN public.service_packages.service_id IS 'Reference to parent service';
COMMENT ON COLUMN public.service_packages.price IS 'Package price in KRW (Korean Won)';
COMMENT ON COLUMN public.service_packages.features IS 'JSONB array of package features: [{"icon": "Check", "text": "Feature description"}, ...]';
COMMENT ON COLUMN public.service_packages.is_popular IS 'Mark as popular/recommended package';
COMMENT ON COLUMN public.service_packages.display_order IS 'Sort order for package display (lower = higher priority)';

-- ============================================
-- Step 2: Indexes 생성
-- ============================================

-- Foreign key index for efficient JOIN
CREATE INDEX IF NOT EXISTS idx_service_packages_service_id
  ON public.service_packages(service_id);

-- Display order index for sorting
CREATE INDEX IF NOT EXISTS idx_service_packages_display_order
  ON public.service_packages(display_order);

-- Composite index for service + display order (most common query)
CREATE INDEX IF NOT EXISTS idx_service_packages_service_display
  ON public.service_packages(service_id, display_order);

-- ============================================
-- Step 3: RLS 정책 설정
-- ============================================

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

-- Public can view all packages
CREATE POLICY "service_packages_public_select"
  ON public.service_packages FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can insert packages
CREATE POLICY "service_packages_admin_insert"
  ON public.service_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

-- Only admins can update packages
CREATE POLICY "service_packages_admin_update"
  ON public.service_packages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

-- Only admins can delete packages
CREATE POLICY "service_packages_admin_delete"
  ON public.service_packages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

-- ============================================
-- Step 4: 트리거 설정 (updated_at 자동 업데이트)
-- ============================================

CREATE TRIGGER update_service_packages_updated_at
  BEFORE UPDATE ON public.service_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Step 5: 검증 쿼리
-- ============================================

DO $$
DECLARE
  table_exists BOOLEAN;
  index_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- 테이블 존재 여부 확인
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'service_packages'
  ) INTO table_exists;

  -- 인덱스 개수 확인
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'service_packages';

  -- RLS 정책 개수 확인
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'service_packages';

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ service_packages 테이블 생성 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '테이블 존재: %', table_exists;
  RAISE NOTICE '인덱스 개수: % (예상: 4개 - PK + 3개)', index_count;
  RAISE NOTICE 'RLS 정책 개수: % (예상: 4개)', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '컬럼 목록:';
  RAISE NOTICE '  - id (UUID, PK)';
  RAISE NOTICE '  - service_id (UUID, FK → services.id)';
  RAISE NOTICE '  - name (TEXT)';
  RAISE NOTICE '  - price (NUMERIC)';
  RAISE NOTICE '  - features (JSONB)';
  RAISE NOTICE '  - is_popular (BOOLEAN)';
  RAISE NOTICE '  - display_order (INTEGER)';
  RAISE NOTICE '  - created_at, updated_at (TIMESTAMPTZ)';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  IF NOT table_exists THEN
    RAISE WARNING '❌ 테이블 생성 실패!';
  END IF;
END $$;
