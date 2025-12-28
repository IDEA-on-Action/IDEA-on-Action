-- =====================================================
-- Subscription Management Tables
-- =====================================================
-- Description: 구독 관리 시스템 - 사용자별 구독, 빌링키, 결제 히스토리
-- Created: 2025-11-19
-- Author: Claude & Sinclair Seo
-- =====================================================

-- =====================================================
-- 1. billing_keys 테이블
-- =====================================================
-- Description: 토스페이먼츠 빌링키 저장
CREATE TABLE IF NOT EXISTS public.billing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_key TEXT NOT NULL,
  customer_key TEXT NOT NULL,
  card_type TEXT, -- 카드사 (예: "신한카드", "삼성카드")
  card_number TEXT, -- 마스킹된 카드번호 (예: "1234-****-****-5678")
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT billing_keys_user_id_fkey UNIQUE (user_id, billing_key)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_billing_keys_user_id ON public.billing_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_keys_customer_key ON public.billing_keys(customer_key);
CREATE INDEX IF NOT EXISTS idx_billing_keys_is_active ON public.billing_keys(is_active);

-- 코멘트
COMMENT ON TABLE public.billing_keys IS '토스페이먼츠 빌링키 저장';
COMMENT ON COLUMN public.billing_keys.billing_key IS '토스페이먼츠 빌링키 (bln_으로 시작)';
COMMENT ON COLUMN public.billing_keys.customer_key IS '토스페이먼츠 고객키 (user.id와 동일)';
COMMENT ON COLUMN public.billing_keys.card_type IS '카드사 이름';
COMMENT ON COLUMN public.billing_keys.card_number IS '마스킹된 카드번호';
COMMENT ON COLUMN public.billing_keys.is_active IS '활성 상태 (카드 변경 시 이전 키는 false)';

-- RLS 활성화
ALTER TABLE public.billing_keys ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "사용자는 자신의 빌링키를 조회할 수 있음"
  ON public.billing_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 빌링키를 생성할 수 있음"
  ON public.billing_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 빌링키를 업데이트할 수 있음"
  ON public.billing_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 2. subscriptions 테이블
-- =====================================================
-- Description: 사용자별 구독 정보
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  billing_key_id UUID REFERENCES public.billing_keys(id) ON DELETE SET NULL,

  -- 구독 상태
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, cancelled, expired, suspended

  -- 날짜 정보
  trial_end_date TIMESTAMPTZ, -- 무료 체험 종료일
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 현재 결제 주기 시작일
  current_period_end TIMESTAMPTZ NOT NULL, -- 현재 결제 주기 종료일
  next_billing_date TIMESTAMPTZ, -- 다음 자동 결제일

  -- 취소 정보
  cancelled_at TIMESTAMPTZ, -- 취소 요청 시각
  cancel_at_period_end BOOLEAN DEFAULT false, -- 현재 주기 종료 시 취소 여부

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT subscriptions_status_check CHECK (
    status IN ('trial', 'active', 'cancelled', 'expired', 'suspended')
  )
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON public.subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_service_plan ON public.subscriptions(service_id, plan_id);

-- 코멘트
COMMENT ON TABLE public.subscriptions IS '사용자별 구독 정보';
COMMENT ON COLUMN public.subscriptions.status IS '구독 상태: trial(체험), active(활성), cancelled(취소), expired(만료), suspended(정지)';
COMMENT ON COLUMN public.subscriptions.trial_end_date IS '14일 무료 체험 종료일';
COMMENT ON COLUMN public.subscriptions.current_period_start IS '현재 결제 주기 시작일';
COMMENT ON COLUMN public.subscriptions.current_period_end IS '현재 결제 주기 종료일';
COMMENT ON COLUMN public.subscriptions.next_billing_date IS '다음 자동 결제 예정일';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'true면 현재 주기 종료 시 자동 취소';

-- RLS 활성화
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "사용자는 자신의 구독을 조회할 수 있음"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 구독을 생성할 수 있음"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 구독을 업데이트할 수 있음"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin은 모든 구독을 볼 수 있음
CREATE POLICY "관리자는 모든 구독을 조회할 수 있음"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- =====================================================
-- 3. subscription_payments 테이블
-- =====================================================
-- Description: 구독 결제 히스토리
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- 결제 금액 (원 단위)
  payment_key TEXT, -- 토스페이먼츠 결제키
  order_id TEXT, -- 주문 ID (토스페이먼츠)

  -- 결제 상태
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, cancelled

  -- 에러 정보
  error_code TEXT,
  error_message TEXT,

  -- 타임스탬프
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT subscription_payments_status_check CHECK (
    status IN ('pending', 'success', 'failed', 'cancelled')
  ),
  CONSTRAINT subscription_payments_amount_check CHECK (amount > 0)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON public.subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON public.subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_paid_at ON public.subscription_payments(paid_at DESC);

-- 코멘트
COMMENT ON TABLE public.subscription_payments IS '구독 결제 히스토리';
COMMENT ON COLUMN public.subscription_payments.status IS '결제 상태: pending(대기), success(성공), failed(실패), cancelled(취소)';
COMMENT ON COLUMN public.subscription_payments.payment_key IS '토스페이먼츠 결제키';
COMMENT ON COLUMN public.subscription_payments.order_id IS '토스페이먼츠 주문 ID';

-- RLS 활성화
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "사용자는 자신의 결제 내역을 조회할 수 있음"
  ON public.subscription_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE subscriptions.id = subscription_payments.subscription_id
        AND subscriptions.user_id = auth.uid()
    )
  );

-- 결제는 시스템(service_role)만 생성 가능
-- INSERT/UPDATE/DELETE는 RLS 정책 없음 (service_role만 접근)

-- Admin은 모든 결제 내역을 볼 수 있음
CREATE POLICY "관리자는 모든 결제 내역을 조회할 수 있음"
  ON public.subscription_payments FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- =====================================================
-- 4. 트리거: updated_at 자동 업데이트
-- =====================================================

-- billing_keys updated_at 트리거
CREATE OR REPLACE FUNCTION public.update_billing_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_billing_keys_updated_at
  BEFORE UPDATE ON public.billing_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_billing_keys_updated_at();

-- subscriptions updated_at 트리거
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_updated_at();

-- =====================================================
-- 5. Helper Functions
-- =====================================================

-- 활성 구독 확인 함수
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  p_user_id UUID,
  p_service_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
      AND status IN ('trial', 'active')
      AND (p_service_id IS NULL OR service_id = p_service_id)
      AND current_period_end > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 구독 만료 처리 함수 (Cron에서 호출)
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- 만료된 구독 업데이트
  WITH updated AS (
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = NOW()
    WHERE status IN ('trial', 'active')
      AND current_period_end < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM updated;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.has_active_subscription IS '사용자의 활성 구독 여부 확인';
COMMENT ON FUNCTION public.expire_subscriptions IS '만료된 구독 상태 업데이트 (Cron 호출용)';
