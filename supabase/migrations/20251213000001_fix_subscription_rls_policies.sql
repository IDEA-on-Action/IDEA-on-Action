-- =====================================================
-- Fix RLS Policies for Subscription Tables
-- =====================================================
-- Description: subscriptions, billing_keys 테이블 RLS 정책 재설정
-- Created: 2025-12-13
-- =====================================================

-- =====================================================
-- 1. billing_keys RLS 정책 재설정
-- =====================================================

-- 기존 정책 삭제 (존재하면)
DROP POLICY IF EXISTS "사용자는 자신의 빌링키를 조회할 수 있음" ON public.billing_keys;
DROP POLICY IF EXISTS "사용자는 자신의 빌링키를 생성할 수 있음" ON public.billing_keys;
DROP POLICY IF EXISTS "사용자는 자신의 빌링키를 업데이트할 수 있음" ON public.billing_keys;
DROP POLICY IF EXISTS "Users can view their own billing keys" ON public.billing_keys;
DROP POLICY IF EXISTS "Users can insert their own billing keys" ON public.billing_keys;
DROP POLICY IF EXISTS "Users can update their own billing keys" ON public.billing_keys;
DROP POLICY IF EXISTS "Service role can manage all billing keys" ON public.billing_keys;

-- RLS 활성화
ALTER TABLE public.billing_keys ENABLE ROW LEVEL SECURITY;

-- 새 정책 생성
CREATE POLICY "Users can view their own billing keys"
  ON public.billing_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own billing keys"
  ON public.billing_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing keys"
  ON public.billing_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role은 모든 작업 가능
CREATE POLICY "Service role can manage all billing keys"
  ON public.billing_keys FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 2. subscriptions RLS 정책 재설정
-- =====================================================

-- 기존 정책 삭제 (존재하면)
DROP POLICY IF EXISTS "사용자는 자신의 구독을 조회할 수 있음" ON public.subscriptions;
DROP POLICY IF EXISTS "사용자는 자신의 구독을 생성할 수 있음" ON public.subscriptions;
DROP POLICY IF EXISTS "사용자는 자신의 구독을 업데이트할 수 있음" ON public.subscriptions;
DROP POLICY IF EXISTS "관리자는 모든 구독을 조회할 수 있음" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;

-- RLS 활성화
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 새 정책 생성
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin은 모든 구독을 볼 수 있음
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- Service role은 모든 작업 가능
CREATE POLICY "Service role can manage all subscriptions"
  ON public.subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 3. subscription_payments RLS 정책 재설정
-- =====================================================

-- 기존 정책 삭제 (존재하면)
DROP POLICY IF EXISTS "사용자는 자신의 결제 내역을 조회할 수 있음" ON public.subscription_payments;
DROP POLICY IF EXISTS "관리자는 모든 결제 내역을 조회할 수 있음" ON public.subscription_payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.subscription_payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.subscription_payments;
DROP POLICY IF EXISTS "Service role can manage all payments" ON public.subscription_payments;

-- RLS 활성화
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- 새 정책 생성
CREATE POLICY "Users can view their own payments"
  ON public.subscription_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE subscriptions.id = subscription_payments.subscription_id
        AND subscriptions.user_id = auth.uid()
    )
  );

-- Admin은 모든 결제 내역을 볼 수 있음
CREATE POLICY "Admins can view all payments"
  ON public.subscription_payments FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- Service role은 모든 작업 가능
CREATE POLICY "Service role can manage all payments"
  ON public.subscription_payments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. subscription_plans RLS 정책 확인
-- =====================================================

-- subscription_plans는 모든 사용자가 조회 가능해야 함
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Public can view subscription plans" ON public.subscription_plans;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 플랜 조회 가능
CREATE POLICY "Anyone can view subscription plans"
  ON public.subscription_plans FOR SELECT
  TO authenticated, anon
  USING (true);

-- Service role은 모든 작업 가능
CREATE POLICY "Service role can manage subscription plans"
  ON public.subscription_plans FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
