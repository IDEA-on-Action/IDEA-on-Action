-- =============================================================================
-- Supabase 스키마 정렬 마이그레이션
-- Supabase PostgreSQL → D1 SQLite 누락 컬럼만 추가
--
-- 기존 D1 스키마 분석 결과:
-- - portfolio_items: display_order 이미 존재
-- - roadmap_items: display_order 이미 존재
-- - subscription_plans: display_order 이미 존재
-- - blog_posts: reading_time 이미 존재 (read_time 대신)
-- - notices: author_id 이미 존재
-- =============================================================================

-- =============================================================================
-- 1. user_profiles 테이블 - avatar_url, display_name 추가
-- =============================================================================
ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN display_name TEXT;

-- =============================================================================
-- 2. admins 테이블 - email, is_super_admin 추가
-- =============================================================================
ALTER TABLE admins ADD COLUMN email TEXT;
ALTER TABLE admins ADD COLUMN is_super_admin INTEGER DEFAULT 0;

-- =============================================================================
-- 3. user_roles 테이블 - assigned_by, assigned_at 추가
-- =============================================================================
ALTER TABLE user_roles ADD COLUMN assigned_by TEXT;
ALTER TABLE user_roles ADD COLUMN assigned_at TEXT DEFAULT (datetime('now'));

-- =============================================================================
-- 4. services 테이블 - image_url 추가 (images JSON 배열 외 단일 URL)
-- =============================================================================
ALTER TABLE services ADD COLUMN image_url TEXT;

-- =============================================================================
-- 5. cart_items 테이블 - updated_at 추가
-- =============================================================================
ALTER TABLE cart_items ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- =============================================================================
-- 6. order_items 테이블 - service_title 추가 (name 외 추가)
-- =============================================================================
ALTER TABLE order_items ADD COLUMN service_title TEXT;

-- =============================================================================
-- 7. payments 테이블 - provider_transaction_id 추가 (payment_key 외 추가)
-- =============================================================================
ALTER TABLE payments ADD COLUMN provider_transaction_id TEXT;

-- =============================================================================
-- 8. billing_keys 테이블 - customer_key 추가
-- =============================================================================
ALTER TABLE billing_keys ADD COLUMN customer_key TEXT;

-- =============================================================================
-- 9. subscription_plans 테이블 - service_id 추가 (display_order 이미 존재)
-- =============================================================================
ALTER TABLE subscription_plans ADD COLUMN service_id TEXT;

-- =============================================================================
-- 10. newsletter_subscriptions 테이블 - subscribed_at 추가
-- =============================================================================
ALTER TABLE newsletter_subscriptions ADD COLUMN subscribed_at TEXT DEFAULT (datetime('now'));

-- =============================================================================
-- 11. post_categories 테이블 생성 (blog_categories 복사본)
-- Supabase에서 post_categories로 사용하는 경우 대비
-- =============================================================================
CREATE TABLE IF NOT EXISTS post_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id TEXT REFERENCES post_categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_post_cat_slug ON post_categories(slug);

-- =============================================================================
-- 인덱스 추가
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_sub_plans_service ON subscription_plans(service_id);
