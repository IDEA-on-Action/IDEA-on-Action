-- =============================================================================
-- MCP Sync 테이블
-- Cloudflare D1 Database
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. service_states - 서비스 상태 저장
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_states (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  state_type TEXT NOT NULL CHECK (state_type IN ('health', 'capabilities', 'config', 'metadata')),
  state TEXT NOT NULL, -- JSON
  version INTEGER NOT NULL DEFAULT 1,
  ttl_seconds INTEGER NOT NULL DEFAULT 300,
  synced_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(service_id, state_type)
);

CREATE INDEX IF NOT EXISTS idx_service_states_service ON service_states(service_id);
CREATE INDEX IF NOT EXISTS idx_service_states_type ON service_states(state_type);
CREATE INDEX IF NOT EXISTS idx_service_states_expires ON service_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_service_states_synced ON service_states(synced_at);

-- -----------------------------------------------------------------------------
-- 2. service_health - 서비스 헬스 상태 (호환성용)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_health (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')) DEFAULT 'unknown',
  last_ping TEXT DEFAULT (datetime('now')),
  metrics TEXT, -- JSON
  version TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_health_service ON service_health(service_id);
CREATE INDEX IF NOT EXISTS idx_service_health_status ON service_health(status);
