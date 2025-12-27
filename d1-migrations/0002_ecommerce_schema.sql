-- ============================================
-- D1 e-Commerce 스키마
-- Phase 3: Database 마이그레이션
-- ============================================

-- ============================================
-- 1. 서비스 카테고리
-- ============================================

CREATE TABLE IF NOT EXISTS service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  parent_id TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES service_categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_service_categories_slug ON service_categories(slug);
CREATE INDEX idx_service_categories_parent ON service_categories(parent_id);
CREATE INDEX idx_service_categories_order ON service_categories(display_order);

-- ============================================
-- 2. 서비스
-- ============================================

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  category_id TEXT,
  price INTEGER NOT NULL DEFAULT 0,  -- 원 단위 정수
  discount_price INTEGER,
  currency TEXT DEFAULT 'KRW',
  images TEXT DEFAULT '[]',  -- JSON 배열
  features TEXT DEFAULT '[]',  -- JSON 배열
  requirements TEXT,
  deliverables TEXT,
  estimated_duration TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'draft', 'archived')),
  is_featured INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  metadata TEXT,  -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_services_slug ON services(slug);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_featured ON services(is_featured);
CREATE INDEX idx_services_order ON services(display_order);

-- ============================================
-- 3. 서비스 패키지
-- ============================================

CREATE TABLE IF NOT EXISTS service_packages (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  features TEXT DEFAULT '[]',  -- JSON 배열
  is_popular INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE INDEX idx_service_packages_service ON service_packages(service_id);
CREATE INDEX idx_service_packages_order ON service_packages(display_order);

-- ============================================
-- 4. 장바구니
-- ============================================

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_id TEXT,  -- 비로그인 사용자용
  items TEXT DEFAULT '[]',  -- JSON 배열
  total_amount INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'KRW',
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_session ON carts(session_id);
CREATE INDEX idx_carts_expires ON carts(expires_at);

-- ============================================
-- 5. 주문
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled', 'refunded')),
  total_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  tax_amount INTEGER DEFAULT 0,
  final_amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'KRW',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  billing_info TEXT,  -- JSON
  notes TEXT,
  metadata TEXT,  -- JSON
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- ============================================
-- 6. 주문 항목
-- ============================================

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  service_id TEXT,
  package_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,  -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_service ON order_items(service_id);

-- ============================================
-- 7. 결제
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  payment_key TEXT UNIQUE,  -- 토스페이먼츠 paymentKey
  method TEXT NOT NULL,  -- card, bank_transfer, virtual_account, etc.
  provider TEXT NOT NULL DEFAULT 'toss',  -- toss, kakao, etc.
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'KRW',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  paid_at TEXT,
  failed_at TEXT,
  failure_reason TEXT,
  refunded_at TEXT,
  refund_amount INTEGER,
  refund_reason TEXT,
  receipt_url TEXT,
  metadata TEXT,  -- JSON (토스 응답 데이터)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_key ON payments(payment_key);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at);
