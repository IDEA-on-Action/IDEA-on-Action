-- =============================================================================
-- Profile Sync 테이블
-- Cloudflare D1 Database
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profile_sync_status - 프로필 동기화 상태
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_sync_status (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')) DEFAULT 'pending',
  last_sync_direction TEXT CHECK (last_sync_direction IN ('ideaonaction_to_minu', 'minu_to_ideaonaction', 'bidirectional')),
  last_synced_at TEXT,
  ideaonaction_updated_at TEXT,
  minu_updated_at TEXT,
  conflict_fields TEXT, -- JSON
  conflict_resolved_at TEXT,
  error_message TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error_at TEXT,
  metadata TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profile_sync_status_user ON profile_sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_sync_status_status ON profile_sync_status(sync_status);
CREATE INDEX IF NOT EXISTS idx_profile_sync_status_synced ON profile_sync_status(last_synced_at);

-- -----------------------------------------------------------------------------
-- 2. profile_sync_history - 프로필 동기화 이력
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_sync_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('ideaonaction_to_minu', 'minu_to_ideaonaction', 'bidirectional')),
  sync_result TEXT NOT NULL CHECK (sync_result IN ('success', 'partial', 'conflict', 'failed')),
  synced_fields TEXT, -- JSON array
  conflict_fields TEXT, -- JSON
  before_data TEXT, -- JSON
  after_data TEXT, -- JSON
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('user', 'webhook', 'scheduled', 'manual')) DEFAULT 'user',
  metadata TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profile_sync_history_user ON profile_sync_history(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_sync_history_created ON profile_sync_history(created_at);
CREATE INDEX IF NOT EXISTS idx_profile_sync_history_result ON profile_sync_history(sync_result);
CREATE INDEX IF NOT EXISTS idx_profile_sync_history_direction ON profile_sync_history(sync_direction);

-- -----------------------------------------------------------------------------
-- 3. profiles 테이블에 metadata 컬럼 추가 (이미 존재하면 무시)
-- -----------------------------------------------------------------------------
-- 기존 profiles 테이블 구조: id, email, role, display_name, avatar_url, created_at, updated_at
-- metadata 컬럼 추가
ALTER TABLE profiles ADD COLUMN metadata TEXT;
