-- =============================================================================
-- MCP (Minu Central Protocol) 테이블
-- Cloudflare D1 Database
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. service_tokens - JWT/Refresh 토큰 저장
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_tokens (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('access', 'refresh')),
  scope TEXT NOT NULL, -- JSON array
  expires_at TEXT NOT NULL,
  is_revoked INTEGER DEFAULT 0,
  revoked_at TEXT,
  revoked_reason TEXT,
  used INTEGER DEFAULT 0, -- refresh token rotation
  used_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_tokens_hash ON service_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_service_tokens_service ON service_tokens(service_id);
CREATE INDEX IF NOT EXISTS idx_service_tokens_expires ON service_tokens(expires_at);

-- -----------------------------------------------------------------------------
-- 2. service_events - 서비스 이벤트 로그
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_events (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  project_id TEXT,
  user_id TEXT,
  payload TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_events_service ON service_events(service_id);
CREATE INDEX IF NOT EXISTS idx_service_events_type ON service_events(event_type);
CREATE INDEX IF NOT EXISTS idx_service_events_created ON service_events(created_at);

-- -----------------------------------------------------------------------------
-- 3. service_issues - 서비스 이슈 트래킹
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_issues (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT,
  reported_by TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolution TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_issues_service ON service_issues(service_id);
CREATE INDEX IF NOT EXISTS idx_service_issues_status ON service_issues(status);
CREATE INDEX IF NOT EXISTS idx_service_issues_severity ON service_issues(severity);

-- -----------------------------------------------------------------------------
-- 4. service_health - 서비스 헬스 상태
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_health (
  service_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  last_ping TEXT NOT NULL,
  metrics TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------------------
-- 5. routing_rules - 이벤트 라우팅 규칙
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routing_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_service TEXT NOT NULL,
  event_pattern TEXT NOT NULL, -- e.g., "issue.*", "system.health_check"
  target_service TEXT NOT NULL,
  target_endpoint TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  conditions TEXT, -- JSON
  transform TEXT, -- JSON (payload transformation)
  retry_config TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_routing_rules_source ON routing_rules(source_service);
CREATE INDEX IF NOT EXISTS idx_routing_rules_active ON routing_rules(is_active);

-- -----------------------------------------------------------------------------
-- 6. event_queue - 이벤트 큐 (비동기 처리)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_queue (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  routing_rule_id TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  payload TEXT NOT NULL, -- JSON
  target_service TEXT NOT NULL,
  target_endpoint TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TEXT,
  next_retry_at TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (routing_rule_id) REFERENCES routing_rules(id)
);

CREATE INDEX IF NOT EXISTS idx_event_queue_status ON event_queue(status);
CREATE INDEX IF NOT EXISTS idx_event_queue_priority ON event_queue(priority);
CREATE INDEX IF NOT EXISTS idx_event_queue_next_retry ON event_queue(next_retry_at);

-- -----------------------------------------------------------------------------
-- 7. processed_events - 멱등성 추적
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processed_events (
  idempotency_key TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  result TEXT, -- JSON
  processed_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_events_expires ON processed_events(expires_at);

-- -----------------------------------------------------------------------------
-- 8. mcp_audit_log - 감사 로그
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mcp_audit_log (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  service_id TEXT,
  client_id TEXT,
  status_code INTEGER NOT NULL,
  success INTEGER NOT NULL,
  request_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  error_code TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_service ON mcp_audit_log(service_id);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_created ON mcp_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_status ON mcp_audit_log(status_code);

-- -----------------------------------------------------------------------------
-- 9. notifications - 알림 (MCP 이벤트용)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'system' CHECK (type IN ('system', 'alert', 'info', 'warning', 'error')),
  read INTEGER DEFAULT 0,
  read_at TEXT,
  metadata TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- -----------------------------------------------------------------------------
-- 10. profiles - 사용자 프로필 (MCP 알림용)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
