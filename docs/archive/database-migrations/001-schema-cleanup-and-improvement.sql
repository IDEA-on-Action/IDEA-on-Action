-- ===================================================================
-- Migration 001: Schema Cleanup and Improvement
-- 작성일: 2025-10-17
-- 목적: Phase 8-12 로드맵 기반 스키마 최적화
-- ===================================================================

-- ⚠️ 주의: 이 마이그레이션을 실행하기 전에 반드시 백업하세요!
-- Supabase Dashboard → Database → Backups

-- ===================================================================
-- PART 1: 백업 및 검증
-- ===================================================================

-- 1.1. 기존 데이터 확인 (백업 전 체크)
DO $$
BEGIN
  RAISE NOTICE '=== 데이터 백업 체크 ===';
  RAISE NOTICE 'service_categories: % rows', (SELECT COUNT(*) FROM service_categories);
  RAISE NOTICE 'posts: % rows', (SELECT COUNT(*) FROM posts);
  RAISE NOTICE 'services: % rows', (SELECT COUNT(*) FROM services);
END $$;

-- ===================================================================
-- PART 2: 불필요한 테이블 삭제
-- ===================================================================

-- 2.1. post_tags 삭제 (posts.tags JSONB로 대체됨)
DROP TABLE IF EXISTS post_tags CASCADE;

-- 2.2. gallery 삭제 (조건부 - 용도 확인 후)
-- ⚠️ 사용 중이면 이 라인 주석 처리
-- DROP TABLE IF EXISTS gallery CASCADE;

-- 2.3. metrics 삭제 (조건부 - services.metrics JSONB로 대체)
-- ⚠️ 전역 메트릭 용도면 이 라인 주석 처리
-- DROP TABLE IF EXISTS metrics CASCADE;

-- ===================================================================
-- PART 3: services 테이블 개선
-- ===================================================================

-- 3.1. 누락된 컬럼 추가
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES service_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metrics jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3.2. 기존 컬럼 제약 조건 추가 (필요시)
-- ALTER TABLE services ALTER COLUMN title SET NOT NULL;

-- 3.3. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_created ON services(created_at DESC);

-- 3.4. 자동 updated_at 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- PART 4: service_categories 테이블 개선
-- ===================================================================

-- 4.1. 컬럼 추가
ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS icon text,              -- Lucide icon name
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4.2. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_service_categories_slug ON service_categories(slug);
CREATE INDEX IF NOT EXISTS idx_service_categories_active ON service_categories(is_active);

-- 4.3. 자동 updated_at 트리거
CREATE TRIGGER service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- PART 5: Phase 9 테이블 개선 (전자상거래)
-- ===================================================================

-- 5.1. carts 테이블 검증 및 개선
ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1 CHECK (quantity > 0),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_service ON carts(service_id);

CREATE TRIGGER carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.2. orders 테이블 검증 및 개선
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')),
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS contact_info jsonb,
  ADD COLUMN IF NOT EXISTS shipping_note text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.3. order_items 테이블 검증 및 개선
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  ADD COLUMN IF NOT EXISTS unit_price numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_service ON order_items(service_id);

-- 5.4. payments 테이블 검증 및 개선
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider text CHECK (provider IN ('kakao', 'toss', 'stripe')),
  ADD COLUMN IF NOT EXISTS provider_transaction_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_tx ON payments(provider_transaction_id);

-- ===================================================================
-- PART 6: Phase 10 테이블 개선 (인증)
-- ===================================================================

-- 6.1. user_profiles 테이블 검증 및 개선
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6.2. user_roles 테이블 검증 및 개선
ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role text NOT NULL CHECK (role IN ('admin', 'user', 'guest')),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role);

-- ===================================================================
-- PART 7: posts 테이블 검증 (Phase 11 - 이미 양호)
-- ===================================================================

-- 7.1. 인덱스 추가 (성능 개선)
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);

-- ===================================================================
-- PART 8: RLS (Row Level Security) 정책
-- ===================================================================

-- 8.1. services 테이블 RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Public: active 서비스만 조회
DROP POLICY IF EXISTS "Public can view active services" ON services;
CREATE POLICY "Public can view active services"
  ON services FOR SELECT
  USING (status = 'active');

-- Admin: 모든 작업 허용
DROP POLICY IF EXISTS "Admins can manage services" ON services;
CREATE POLICY "Admins can manage services"
  ON services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 8.2. service_categories 테이블 RLS
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active categories" ON service_categories;
CREATE POLICY "Public can view active categories"
  ON service_categories FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON service_categories;
CREATE POLICY "Admins can manage categories"
  ON service_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 8.3. carts 테이블 RLS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own carts" ON carts;
CREATE POLICY "Users can manage their own carts"
  ON carts FOR ALL
  USING (user_id = auth.uid());

-- 8.4. orders 테이블 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders"
  ON orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 8.5. posts 테이블 RLS (Phase 11)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published posts" ON posts;
CREATE POLICY "Public can view published posts"
  ON posts FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Authors can manage their posts" ON posts;
CREATE POLICY "Authors can manage their posts"
  ON posts FOR ALL
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all posts" ON posts;
CREATE POLICY "Admins can manage all posts"
  ON posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ===================================================================
-- PART 9: 검증 및 완료
-- ===================================================================

DO $$
BEGIN
  RAISE NOTICE '=== 마이그레이션 완료 ===';
  RAISE NOTICE 'services 컬럼: % 개', (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 'services' AND table_schema = 'public'
  );
  RAISE NOTICE 'service_categories 컬럼: % 개', (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 'service_categories' AND table_schema = 'public'
  );
  RAISE NOTICE 'RLS 정책 수: % 개', (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = 'public'
  );
END $$;

-- ===================================================================
-- 마이그레이션 완료 체크리스트
-- ===================================================================
-- [ ] Supabase Dashboard에서 백업 생성 완료
-- [ ] migration 실행 완료 (에러 없음)
-- [ ] services 테이블 구조 확인
-- [ ] service_categories 데이터 유지 확인 (4개 행)
-- [ ] posts 데이터 유지 확인 (6개 행)
-- [ ] RLS 정책 동작 확인 (public read, admin write)
-- [ ] TypeScript 타입 생성 준비
