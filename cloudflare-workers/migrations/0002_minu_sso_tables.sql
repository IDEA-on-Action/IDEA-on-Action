-- =============================================================================
-- Minu SSO 테이블
-- Cloudflare D1 Database
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. minu_oauth_sessions - OAuth 세션 관리
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS minu_oauth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  service TEXT NOT NULL CHECK (service IN ('find', 'frame', 'build', 'keep')),
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_minu_oauth_sessions_state ON minu_oauth_sessions(state);
CREATE INDEX IF NOT EXISTS idx_minu_oauth_sessions_user ON minu_oauth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_minu_oauth_sessions_expires ON minu_oauth_sessions(expires_at);

-- -----------------------------------------------------------------------------
-- 2. minu_tokens - Minu 서비스 토큰 저장
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS minu_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('find', 'frame', 'build', 'keep')),
  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT,
  access_token_expires_at TEXT NOT NULL,
  refresh_token_expires_at TEXT,
  scope TEXT, -- JSON array
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, service)
);

CREATE INDEX IF NOT EXISTS idx_minu_tokens_user ON minu_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_minu_tokens_service ON minu_tokens(service);
CREATE INDEX IF NOT EXISTS idx_minu_tokens_expires ON minu_tokens(access_token_expires_at);

-- -----------------------------------------------------------------------------
-- 3. minu_subscriptions - Minu 서비스 구독 정보
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS minu_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('find', 'frame', 'build', 'keep')),
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
  features TEXT, -- JSON array
  limits TEXT, -- JSON object
  current_period_start TEXT,
  current_period_end TEXT,
  trial_end TEXT,
  minu_subscription_id TEXT,
  synced_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, service)
);

CREATE INDEX IF NOT EXISTS idx_minu_subscriptions_user ON minu_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_minu_subscriptions_service ON minu_subscriptions(service);
CREATE INDEX IF NOT EXISTS idx_minu_subscriptions_status ON minu_subscriptions(status);

-- -----------------------------------------------------------------------------
-- 4. payments - 결제 기록 (Minu 결제 포함)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT NOT NULL,
  provider_payment_id TEXT,
  failure_reason TEXT,
  metadata TEXT, -- JSON object
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
