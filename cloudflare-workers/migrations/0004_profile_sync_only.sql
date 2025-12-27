-- profile_sync_status 테이블
CREATE TABLE IF NOT EXISTS profile_sync_status (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_sync_direction TEXT,
  last_synced_at TEXT,
  ideaonaction_updated_at TEXT,
  minu_updated_at TEXT,
  conflict_fields TEXT,
  conflict_resolved_at TEXT,
  error_message TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error_at TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profile_sync_status_user ON profile_sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_sync_status_status ON profile_sync_status(sync_status);

-- profile_sync_history 테이블
CREATE TABLE IF NOT EXISTS profile_sync_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sync_direction TEXT NOT NULL,
  sync_result TEXT NOT NULL,
  synced_fields TEXT,
  conflict_fields TEXT,
  before_data TEXT,
  after_data TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'user',
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profile_sync_history_user ON profile_sync_history(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_sync_history_created ON profile_sync_history(created_at);
