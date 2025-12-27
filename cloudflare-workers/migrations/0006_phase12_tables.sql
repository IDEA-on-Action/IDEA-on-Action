-- =============================================================================
-- Phase 12 마이그레이션 테이블
-- Cloudflare D1 Database
-- =============================================================================

-- dead_letter_queue 테이블 (웹훅 실패 기록)
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  target_url TEXT NOT NULL,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  request_id TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dlq_created ON dead_letter_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_dlq_event_type ON dead_letter_queue(event_type);
CREATE INDEX IF NOT EXISTS idx_dlq_resolved ON dead_letter_queue(resolved_at);

-- newsletter_archive 테이블 (뉴스레터 저장)
CREATE TABLE IF NOT EXISTS newsletter_archive (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  preview TEXT,
  sent_at TEXT,
  recipient_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_newsletter_archive_sent ON newsletter_archive(sent_at);

-- newsletter_subscriptions 테이블 (구독자)
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT DEFAULT 'pending',
  topics TEXT,
  confirmed_at TEXT,
  unsubscribed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subs_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subs_status ON newsletter_subscriptions(status);

-- activity_logs 테이블 (활동 로그)
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  log_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_project ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- posts 테이블 (블로그 포스트)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT,
  tags TEXT,
  series TEXT,
  author_id TEXT,
  featured_image TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_series ON posts(series);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);

-- changelog_entries 테이블 (GitHub 릴리즈)
CREATE TABLE IF NOT EXISTS changelog_entries (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT,
  github_release_url TEXT UNIQUE,
  released_at TEXT,
  changes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_changelog_project ON changelog_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_changelog_version ON changelog_entries(version);
CREATE INDEX IF NOT EXISTS idx_changelog_released ON changelog_entries(released_at);

-- projects 테이블 (프로젝트 - GitHub 릴리즈용)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  links TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
