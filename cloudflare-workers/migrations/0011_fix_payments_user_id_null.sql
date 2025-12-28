-- =============================================================================
-- payments 테이블 user_id NOT NULL 제약조건 제거
--
-- 이유: Supabase payments 테이블에 user_id가 NULL인 레코드 존재 (9개)
-- SQLite는 ALTER TABLE로 NOT NULL 제약조건 수정 불가하므로 테이블 재생성
-- =============================================================================

-- 1. 새 테이블 생성 (user_id NULL 허용)
CREATE TABLE payments_new (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  user_id TEXT,  -- NULL 허용으로 변경
  payment_key TEXT,
  method TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'toss',
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'KRW',
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TEXT,
  failed_at TEXT,
  failure_reason TEXT,
  refunded_at TEXT,
  refund_amount INTEGER,
  refund_reason TEXT,
  receipt_url TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  provider_transaction_id TEXT
);

-- 2. 기존 데이터 복사
INSERT INTO payments_new SELECT * FROM payments;

-- 3. 기존 테이블 삭제
DROP TABLE payments;

-- 4. 새 테이블 이름 변경
ALTER TABLE payments_new RENAME TO payments;

-- 5. 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
