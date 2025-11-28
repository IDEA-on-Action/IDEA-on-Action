-- Webhook Events Table Migration
-- 결제 웹훅 이벤트 기록용 테이블
-- Date: 2025-11-28
-- Version: 1.6.0
-- Stream B: 결제 시스템

-- ============================================================
-- 1. webhook_events 테이블
-- ============================================================
-- 결제 웹훅 이벤트 기록 및 중복 방지 (Idempotency)

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 결제 정보
  payment_key TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- 이벤트 정보
  event_type TEXT NOT NULL,
  status TEXT,

  -- 원본 페이로드
  payload JSONB NOT NULL,

  -- 처리 상태
  processed BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL, -- 웹훅 원본 시간
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 중복 방지 (동일 이벤트 한 번만 처리)
  UNIQUE(payment_key, event_type, created_at)
);

-- ============================================================
-- 2. 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_key ON webhook_events(payment_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id ON webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events(received_at);

-- ============================================================
-- 3. RLS (Row Level Security) 정책
-- ============================================================

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능
CREATE POLICY "Admins can view webhook events"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- 삽입은 Service Role만 가능 (Edge Function에서 SUPABASE_SERVICE_ROLE_KEY 사용)
-- 일반 사용자는 삽입 불가

-- ============================================================
-- 4. 코멘트
-- ============================================================

COMMENT ON TABLE webhook_events IS '결제 웹훅 이벤트 기록 - Phase 9 v1.6.0';
COMMENT ON COLUMN webhook_events.payment_key IS '토스페이먼츠 결제 키';
COMMENT ON COLUMN webhook_events.order_id IS '주문 ID';
COMMENT ON COLUMN webhook_events.event_type IS '이벤트 타입 (PAYMENT_STATUS_CHANGED, DEPOSIT_CALLBACK 등)';
COMMENT ON COLUMN webhook_events.status IS '결제 상태';
COMMENT ON COLUMN webhook_events.payload IS '원본 웹훅 페이로드 (JSON)';
COMMENT ON COLUMN webhook_events.processed IS '처리 완료 여부';
COMMENT ON COLUMN webhook_events.error_message IS '처리 실패 시 에러 메시지';
COMMENT ON COLUMN webhook_events.created_at IS '웹훅 원본 생성 시간';
COMMENT ON COLUMN webhook_events.received_at IS '서버 수신 시간';
