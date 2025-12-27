-- =============================================================================
-- Claude AI 사용 로그 테이블
-- Cloudflare D1 Database
-- =============================================================================

-- claude_usage_logs 테이블
CREATE TABLE IF NOT EXISTS claude_usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  success INTEGER NOT NULL DEFAULT 1,
  error_code TEXT,
  error_message TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  model TEXT,
  latency_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_user ON claude_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_created ON claude_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_success ON claude_usage_logs(success);
CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_endpoint ON claude_usage_logs(endpoint);
