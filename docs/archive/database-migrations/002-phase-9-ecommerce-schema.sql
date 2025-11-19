-- ===================================================================
-- Migration 002: Phase 9 E-commerce Schema
-- 작성일: 2025-10-18
-- 목적: 전자상거래 기능을 위한 데이터베이스 스키마 설계
-- Phase: 9 (장바구니, 주문, 결제)
-- ===================================================================

-- ⚠️ 주의: 이 마이그레이션을 실행하기 전에 반드시 백업하세요!
-- Supabase Dashboard → Database → Backups

-- ===================================================================
-- PART 1: carts 테이블 재설계 (장바구니)
-- ===================================================================

-- 기존 carts 테이블 삭제 (service_id 직접 참조 방식)
DROP TABLE IF EXISTS carts CASCADE;

-- 새로운 carts 테이블 생성 (장바구니 메타데이터만)
CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- 제약 조건: 사용자당 하나의 장바구니만
  CONSTRAINT unique_user_cart UNIQUE(user_id)
);

-- 인덱스
CREATE INDEX idx_carts_user ON carts(user_id);

-- 코멘트
COMMENT ON TABLE carts IS '사용자 장바구니 (메타데이터)';
COMMENT ON COLUMN carts.user_id IS '장바구니 소유자 (auth.users.id)';

-- ===================================================================
-- PART 2: cart_items 테이블 생성 (장바구니 항목)
-- ===================================================================

-- 기존 cart_items 테이블 삭제 (price 컬럼이 없는 구 버전)
DROP TABLE IF EXISTS cart_items CASCADE;

CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid REFERENCES carts(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  quantity integer DEFAULT 1 NOT NULL CHECK (quantity > 0 AND quantity <= 99),
  price numeric(10,2) NOT NULL DEFAULT 0, -- 담을 당시 가격 (스냅샷)
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- 제약 조건: 장바구니당 동일한 서비스는 한 번만
  CONSTRAINT unique_cart_service UNIQUE(cart_id, service_id)
);

-- 인덱스
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_service ON cart_items(service_id);
CREATE INDEX idx_cart_items_created ON cart_items(created_at DESC);

-- 코멘트
COMMENT ON TABLE cart_items IS '장바구니 항목 (각 서비스)';
COMMENT ON COLUMN cart_items.cart_id IS '장바구니 ID (carts.id)';
COMMENT ON COLUMN cart_items.service_id IS '서비스 ID (services.id)';
COMMENT ON COLUMN cart_items.quantity IS '수량 (1-99)';
COMMENT ON COLUMN cart_items.price IS '담을 당시 가격 (스냅샷, 가격 변동 추적)';

-- ===================================================================
-- PART 3: orders 테이블 재설계 (주문)
-- ===================================================================

-- 기존 orders 테이블 삭제 (깨끗한 재설계)
DROP TABLE IF EXISTS orders CASCADE;

-- 새로운 orders 테이블 생성
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- 사용자 삭제 후에도 주문 기록 보존

  -- 주문 금액
  subtotal numeric(10,2) NOT NULL DEFAULT 0, -- 소계 (세금/할인 전)
  tax_amount numeric(10,2) DEFAULT 0, -- 세금 (VAT 10%)
  discount_amount numeric(10,2) DEFAULT 0, -- 할인 금액
  shipping_fee numeric(10,2) DEFAULT 0, -- 배송비
  total_amount numeric(10,2) NOT NULL DEFAULT 0, -- 최종 금액

  -- 주문 상태
  status text DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),

  -- 배송 정보
  shipping_address jsonb, -- {postcode, address, addressDetail, city, state}
  shipping_name text, -- 받는 사람 이름
  shipping_phone text, -- 받는 사람 전화번호
  shipping_note text, -- 배송 요청사항

  -- 연락처 정보
  contact_email text, -- 주문자 이메일
  contact_phone text, -- 주문자 전화번호

  -- 메타데이터
  order_number text UNIQUE NOT NULL, -- 주문번호 (ORD-20251018-XXXX)
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL, -- 결제 정보 (순환 참조 방지용)

  -- 타임스탬프
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  confirmed_at timestamptz, -- 주문 확인 시각
  shipped_at timestamptz, -- 배송 시작 시각
  delivered_at timestamptz, -- 배송 완료 시각
  cancelled_at timestamptz -- 취소 시각
);

-- 인덱스
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);

-- 코멘트
COMMENT ON TABLE orders IS '주문 (헤더)';
COMMENT ON COLUMN orders.order_number IS '주문번호 (고객 제공용, ORD-YYYYMMDD-XXXX)';
COMMENT ON COLUMN orders.subtotal IS '소계 (세금/할인 전)';
COMMENT ON COLUMN orders.total_amount IS '최종 결제 금액';
COMMENT ON COLUMN orders.status IS '주문 상태 (pending/confirmed/processing/shipped/delivered/cancelled/refunded)';

-- ===================================================================
-- PART 4: order_items 테이블 재설계 (주문 항목)
-- ===================================================================

DROP TABLE IF EXISTS order_items CASCADE;

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL, -- 서비스 삭제 후에도 주문 기록 보존

  -- 주문 항목 정보
  service_title text NOT NULL, -- 서비스 이름 (스냅샷)
  service_description text, -- 서비스 설명 (스냅샷)
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL DEFAULT 0, -- 단가 (주문 당시)
  subtotal numeric(10,2) NOT NULL DEFAULT 0, -- 소계 (quantity * unit_price)

  -- 메타데이터
  service_snapshot jsonb, -- 전체 서비스 정보 스냅샷 (features, metrics 등)

  created_at timestamptz DEFAULT now() NOT NULL
);

-- 인덱스
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_service ON order_items(service_id);

-- 코멘트
COMMENT ON TABLE order_items IS '주문 항목 (각 서비스)';
COMMENT ON COLUMN order_items.service_title IS '서비스 이름 (주문 당시 스냅샷)';
COMMENT ON COLUMN order_items.service_snapshot IS '서비스 전체 정보 (주문 당시 스냅샷)';

-- ===================================================================
-- PART 5: payments 테이블 재설계 (결제)
-- ===================================================================

DROP TABLE IF EXISTS payments CASCADE;

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL NOT NULL,

  -- 결제 정보
  amount numeric(10,2) NOT NULL DEFAULT 0, -- 결제 금액
  status text DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),

  -- 결제 게이트웨이
  provider text CHECK (provider IN ('kakao', 'toss', 'stripe', 'paypal')),
  provider_transaction_id text, -- 게이트웨이 거래 ID
  payment_method text, -- 결제 수단 (card, bank, kakao_pay, toss_pay 등)

  -- 카드 정보 (마스킹)
  card_info jsonb, -- {cardType, cardNumber: "**** **** **** 1234", issuer}

  -- 메타데이터
  metadata jsonb DEFAULT '{}'::jsonb, -- 게이트웨이 응답 전체 (디버깅용)
  failure_reason text, -- 실패 사유

  -- 타임스탬프
  created_at timestamptz DEFAULT now() NOT NULL,
  paid_at timestamptz, -- 결제 완료 시각
  failed_at timestamptz, -- 결제 실패 시각
  refunded_at timestamptz, -- 환불 완료 시각

  -- 제약 조건: provider_transaction_id는 provider별로 유니크
  CONSTRAINT unique_provider_tx UNIQUE NULLS NOT DISTINCT (provider, provider_transaction_id)
);

-- 인덱스
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

-- 코멘트
COMMENT ON TABLE payments IS '결제 정보';
COMMENT ON COLUMN payments.provider IS '결제 게이트웨이 (kakao/toss/stripe)';
COMMENT ON COLUMN payments.provider_transaction_id IS '게이트웨이 거래 ID (중복 방지)';
COMMENT ON COLUMN payments.metadata IS '게이트웨이 응답 전체 (디버깅/감사용)';

-- ===================================================================
-- PART 6: 트리거 (자동 updated_at)
-- ===================================================================

-- update_updated_at_column 함수가 없으면 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- PART 7: RLS (Row Level Security) 정책
-- ===================================================================

-- 7.1. carts 테이블 RLS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart"
  ON carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cart"
  ON carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart"
  ON carts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart"
  ON carts FOR DELETE
  USING (auth.uid() = user_id);

-- 7.2. cart_items 테이블 RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart items"
  ON cart_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert items to their own cart"
  ON cart_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update items in their own cart"
  ON cart_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items from their own cart"
  ON cart_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()
  ));

-- 7.3. orders 테이블 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending orders"
  ON orders FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending', 'confirmed'));

-- 관리자는 모든 주문 조회 가능
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- 관리자는 모든 주문 업데이트 가능
CREATE POLICY "Admins can update all orders"
  ON orders FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- 7.4. order_items 테이블 RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order items"
  ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

-- 관리자는 모든 주문 항목 조회 가능
CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- 7.5. payments 테이블 RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = payments.order_id
    AND orders.user_id = auth.uid()
  ));

-- 관리자는 모든 결제 조회 가능
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- ===================================================================
-- PART 8: 헬퍼 함수
-- ===================================================================

-- 8.1. 주문번호 생성 함수
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  date_part text;
  random_part text;
  order_number text;
BEGIN
  -- 날짜 부분 (YYYYMMDD)
  date_part := to_char(now(), 'YYYYMMDD');

  -- 랜덤 부분 (4자리 숫자)
  random_part := lpad(floor(random() * 10000)::text, 4, '0');

  -- 주문번호 조합
  order_number := 'ORD-' || date_part || '-' || random_part;

  RETURN order_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_order_number() IS '주문번호 생성 (ORD-YYYYMMDD-XXXX)';

-- 8.2. 주문 총액 계산 함수
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid uuid)
RETURNS numeric AS $$
DECLARE
  order_subtotal numeric;
  order_tax numeric;
  order_discount numeric;
  order_shipping numeric;
  order_total numeric;
BEGIN
  -- orders 테이블에서 금액 정보 가져오기
  SELECT
    subtotal,
    COALESCE(tax_amount, 0),
    COALESCE(discount_amount, 0),
    COALESCE(shipping_fee, 0)
  INTO
    order_subtotal,
    order_tax,
    order_discount,
    order_shipping
  FROM orders
  WHERE id = order_uuid;

  -- 총액 계산
  order_total := order_subtotal + order_tax - order_discount + order_shipping;

  RETURN order_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_order_total(uuid) IS '주문 총액 계산 (소계 + 세금 - 할인 + 배송비)';

-- ===================================================================
-- PART 9: 데이터 검증 (선택 사항)
-- ===================================================================

-- 9.1. 생성된 테이블 확인
DO $$
BEGIN
  RAISE NOTICE '=== Phase 9 E-commerce Schema 생성 완료 ===';
  RAISE NOTICE 'carts: % rows', (SELECT COUNT(*) FROM carts);
  RAISE NOTICE 'cart_items: % rows', (SELECT COUNT(*) FROM cart_items);
  RAISE NOTICE 'orders: % rows', (SELECT COUNT(*) FROM orders);
  RAISE NOTICE 'order_items: % rows', (SELECT COUNT(*) FROM order_items);
  RAISE NOTICE 'payments: % rows', (SELECT COUNT(*) FROM payments);
END $$;

-- ===================================================================
-- Migration 002 완료
-- ===================================================================

-- 실행 방법:
-- 1. Supabase Dashboard → SQL Editor
-- 2. 이 파일 전체 복사 → 붙여넣기
-- 3. RUN 버튼 클릭
-- 4. 결과 확인 (NOTICE 메시지 확인)

-- 롤백 방법 (주의!):
-- DROP TABLE IF EXISTS cart_items CASCADE;
-- DROP TABLE IF EXISTS carts CASCADE;
-- DROP TABLE IF EXISTS order_items CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
