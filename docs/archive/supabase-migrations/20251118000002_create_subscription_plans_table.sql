-- ============================================
-- subscription_plans 테이블 생성: 정기 구독 플랜
-- 일시: 2025-11-18
-- 목적: 서비스별 구독 플랜 정보 저장 (월간, 분기, 연간)
-- TASK-003: subscription_plans 테이블 생성
-- ============================================

-- ============================================
-- Step 1: subscription_plans 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,

  -- 플랜 정보
  plan_name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  features JSONB DEFAULT '[]', -- 플랜 포함 기능 목록 (JSONB array)

  -- 표시 옵션
  is_popular BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscription_plans IS 'Subscription plans for recurring services (e.g., Operations Management - Standard, Pro, Enterprise)';
COMMENT ON COLUMN public.subscription_plans.service_id IS 'Reference to parent service';
COMMENT ON COLUMN public.subscription_plans.plan_name IS 'Plan name (e.g., Standard, Pro, Enterprise)';
COMMENT ON COLUMN public.subscription_plans.billing_cycle IS 'Billing frequency: monthly, quarterly, yearly';
COMMENT ON COLUMN public.subscription_plans.price IS 'Plan price in KRW (Korean Won) per billing cycle';
COMMENT ON COLUMN public.subscription_plans.features IS 'JSONB array of plan features: [{"icon": "Check", "text": "Feature description"}, ...]';
COMMENT ON COLUMN public.subscription_plans.is_popular IS 'Mark as popular/recommended plan';
COMMENT ON COLUMN public.subscription_plans.display_order IS 'Sort order for plan display (lower = higher priority)';

-- ============================================
-- Step 2: Indexes 생성
-- ============================================

-- Foreign key index for efficient JOIN
CREATE INDEX IF NOT EXISTS idx_subscription_plans_service_id
  ON public.subscription_plans(service_id);

-- Billing cycle index for filtering
CREATE INDEX IF NOT EXISTS idx_subscription_plans_billing_cycle
  ON public.subscription_plans(billing_cycle);

-- Composite index for service + billing cycle (common query)
CREATE INDEX IF NOT EXISTS idx_subscription_plans_service_billing
  ON public.subscription_plans(service_id, billing_cycle);

-- Display order index for sorting
CREATE INDEX IF NOT EXISTS idx_subscription_plans_display_order
  ON public.subscription_plans(display_order);

-- ============================================
-- Step 3: RLS 정책 설정
-- ============================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Public can view all plans
CREATE POLICY "subscription_plans_public_select"
  ON public.subscription_plans FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can insert plans
CREATE POLICY "subscription_plans_admin_insert"
  ON public.subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

-- Only admins can update plans
CREATE POLICY "subscription_plans_admin_update"
  ON public.subscription_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

-- Only admins can delete plans
CREATE POLICY "subscription_plans_admin_delete"
  ON public.subscription_plans FOR DELETE
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

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
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
    WHERE table_schema = 'public' AND table_name = 'subscription_plans'
  ) INTO table_exists;

  -- 인덱스 개수 확인
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'subscription_plans';

  -- RLS 정책 개수 확인
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'subscription_plans';

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ subscription_plans 테이블 생성 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '테이블 존재: %', table_exists;
  RAISE NOTICE '인덱스 개수: % (예상: 5개 - PK + 4개)', index_count;
  RAISE NOTICE 'RLS 정책 개수: % (예상: 4개)', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '컬럼 목록:';
  RAISE NOTICE '  - id (UUID, PK)';
  RAISE NOTICE '  - service_id (UUID, FK → services.id)';
  RAISE NOTICE '  - plan_name (TEXT)';
  RAISE NOTICE '  - billing_cycle (TEXT: monthly/quarterly/yearly)';
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
