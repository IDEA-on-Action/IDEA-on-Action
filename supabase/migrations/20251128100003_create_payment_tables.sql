-- Phase 9: Payment Tables Migration
-- 결제 시스템을 위한 테이블 생성
-- Date: 2025-11-28
-- Version: 1.8.0

-- ============================================================
-- 1. payments 테이블 (결제 정보)
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('kakao', 'toss', 'stripe')),
  provider_transaction_id VARCHAR(255), -- 결제사 거래 ID
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method VARCHAR(50), -- 카드, 계좌이체, 간편결제 등
  metadata JSONB DEFAULT '{}', -- 결제사별 추가 정보
  paid_at TIMESTAMPTZ, -- 실제 결제 완료 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction_id ON payments(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ============================================================
-- 3. RLS (Row Level Security) 정책
-- ============================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 자신의 주문에 대한 결제만 조회 가능
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 자신의 주문에 대한 결제만 생성 가능
CREATE POLICY "Users can create own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 자신의 결제만 수정 가능 (상태 업데이트)
CREATE POLICY "Users can update own payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Admin: 모든 결제 조회/수정 가능
DROP POLICY IF EXISTS "Admins can manage all payments" ON payments;
CREATE POLICY "Admins can manage all payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.role IN ('admin', 'super_admin')
      AND admins.is_active = true
    )
  );

-- ============================================================
-- 4. 코멘트
-- ============================================================

COMMENT ON TABLE payments IS '결제 정보 - Phase 9 v1.8.0';
COMMENT ON COLUMN payments.provider IS '결제 제공자: kakao, toss, stripe';
COMMENT ON COLUMN payments.provider_transaction_id IS '결제사에서 발급한 거래 ID';
COMMENT ON COLUMN payments.status IS '결제 상태: pending, completed, failed, refunded';
COMMENT ON COLUMN payments.metadata IS '결제사별 추가 정보 (카드정보, 가상계좌 등)';
COMMENT ON COLUMN payments.paid_at IS '실제 결제 완료 시간';
