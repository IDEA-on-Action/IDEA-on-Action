-- Phase 9: Cart Tables Migration
-- 장바구니 시스템을 위한 테이블 생성
-- Date: 2025-11-28
-- Version: 1.6.0

-- ============================================================
-- 1. carts 테이블 (장바구니 아이템)
-- ============================================================
-- 참고: database.ts에 Cart 타입이 이미 정의되어 있음
-- 로그인 사용자의 장바구니를 서버에 저장

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 사용자당 서비스 하나씩만 (수량으로 관리)
  UNIQUE(user_id, service_id)
);

-- ============================================================
-- 2. 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_service_id ON carts(service_id);

-- ============================================================
-- 3. updated_at 자동 업데이트 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION update_carts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_carts_updated_at ON carts;
CREATE TRIGGER trigger_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_carts_updated_at();

-- ============================================================
-- 4. RLS (Row Level Security) 정책
-- ============================================================

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- 자신의 장바구니만 조회 가능
CREATE POLICY "Users can view own cart items"
  ON carts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 자신의 장바구니에만 추가 가능
CREATE POLICY "Users can insert own cart items"
  ON carts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 자신의 장바구니만 수정 가능
CREATE POLICY "Users can update own cart items"
  ON carts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 자신의 장바구니만 삭제 가능
CREATE POLICY "Users can delete own cart items"
  ON carts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. 코멘트
-- ============================================================

COMMENT ON TABLE carts IS '사용자 장바구니 - Phase 9 v1.6.0';
COMMENT ON COLUMN carts.user_id IS '사용자 ID (auth.users 참조)';
COMMENT ON COLUMN carts.service_id IS '서비스 ID (services 참조)';
COMMENT ON COLUMN carts.quantity IS '수량 (최소 1)';
