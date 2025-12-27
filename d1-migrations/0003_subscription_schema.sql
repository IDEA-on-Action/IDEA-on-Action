-- ============================================
-- D1 구독 스키마
-- Phase 3: Database 마이그레이션
-- ============================================

-- ============================================
-- 1. 구독 플랜
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  tier TEXT NOT NULL DEFAULT 'basic'
    CHECK (tier IN ('trial', 'basic', 'pro', 'enterprise')),
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'KRW',
  features TEXT DEFAULT '[]',  -- JSON 배열
  limits TEXT,  -- JSON: { api_calls, storage, users, etc. }
  is_active INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  trial_days INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);

-- ============================================
-- 2. 사용자 구독
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled', 'expired', 'trial')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  trial_start TEXT,
  trial_end TEXT,
  cancelled_at TEXT,
  cancel_reason TEXT,
  paused_at TEXT,
  resume_at TEXT,
  metadata TEXT,  -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

-- ============================================
-- 3. 빌링키
-- ============================================

CREATE TABLE IF NOT EXISTS billing_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  billing_key TEXT NOT NULL,  -- 토스페이먼츠 billingKey
  card_type TEXT,
  card_number TEXT,  -- 마스킹된 카드번호
  card_company TEXT,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_billing_keys_user ON billing_keys(user_id);
CREATE INDEX idx_billing_keys_active ON billing_keys(is_active);

-- ============================================
-- 4. 구독 결제 기록
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  billing_key_id TEXT,
  payment_key TEXT UNIQUE,
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'KRW',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  billing_date TEXT NOT NULL,
  paid_at TEXT,
  failed_at TEXT,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TEXT,
  metadata TEXT,  -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (billing_key_id) REFERENCES billing_keys(id)
);

CREATE INDEX idx_sub_payments_subscription ON subscription_payments(subscription_id);
CREATE INDEX idx_sub_payments_user ON subscription_payments(user_id);
CREATE INDEX idx_sub_payments_status ON subscription_payments(status);
CREATE INDEX idx_sub_payments_billing_date ON subscription_payments(billing_date);

-- ============================================
-- 5. 구독 사용량
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_usage (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,  -- api_calls, storage_bytes, active_users, etc.
  usage_value INTEGER NOT NULL DEFAULT 0,
  limit_value INTEGER,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subscription_id, metric_name, period_start),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sub_usage_subscription ON subscription_usage(subscription_id);
CREATE INDEX idx_sub_usage_user ON subscription_usage(user_id);
CREATE INDEX idx_sub_usage_metric ON subscription_usage(metric_name);
CREATE INDEX idx_sub_usage_period ON subscription_usage(period_start, period_end);
