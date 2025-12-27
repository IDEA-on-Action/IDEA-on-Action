-- ============================================
-- D1 초기 스키마 (Cloudflare D1 - SQLite)
-- PostgreSQL → SQLite 변환
-- Phase 3: Database 마이그레이션
-- ============================================

-- ============================================
-- 1. 사용자 테이블
-- ============================================

-- users: 핵심 사용자 정보
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_migrated INTEGER DEFAULT 0,
  migrated_at TEXT,
  email_verified INTEGER DEFAULT 0,
  phone_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- user_profiles: 확장 프로필 정보
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  bio TEXT,
  company TEXT,
  job_title TEXT,
  website TEXT,
  location TEXT,  -- JSON: { country, city, timezone }
  social_links TEXT,  -- JSON: { github, twitter, linkedin }
  preferences TEXT,  -- JSON: { theme, language, notifications }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- connected_accounts: OAuth 연동 계정
CREATE TABLE IF NOT EXISTS connected_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,  -- google, github, kakao, microsoft, apple
  provider_account_id TEXT NOT NULL,
  provider_email TEXT,
  access_token_hash TEXT,
  refresh_token_hash TEXT,
  is_primary INTEGER DEFAULT 0,
  connected_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, provider),
  UNIQUE(provider, provider_account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_connected_accounts_user_id ON connected_accounts(user_id);
CREATE INDEX idx_connected_accounts_provider ON connected_accounts(provider);

-- ============================================
-- 2. 관리자 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',  -- admin, super_admin
  permissions TEXT,  -- JSON: 권한 목록
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_admins_user_id ON admins(user_id);
CREATE INDEX idx_admins_role ON admins(role);

-- ============================================
-- 3. OAuth 테이블
-- ============================================

-- oauth_clients: OAuth 클라이언트 등록
CREATE TABLE IF NOT EXISTS oauth_clients (
  id TEXT PRIMARY KEY,
  client_id TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  client_name TEXT NOT NULL,
  description TEXT,
  redirect_uris TEXT NOT NULL,  -- JSON 배열
  allowed_scopes TEXT NOT NULL,  -- JSON 배열
  require_pkce INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_oauth_clients_client_id ON oauth_clients(client_id);
CREATE INDEX idx_oauth_clients_is_active ON oauth_clients(is_active);

-- authorization_codes: 인증 코드 (임시)
-- KV로 관리하는 것이 더 적합하지만, 백업용으로 D1에도 저장
CREATE TABLE IF NOT EXISTS authorization_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scope TEXT,  -- JSON 배열
  code_challenge TEXT,
  code_challenge_method TEXT,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_authorization_codes_code ON authorization_codes(code);
CREATE INDEX idx_authorization_codes_expires ON authorization_codes(expires_at);

-- oauth_refresh_tokens: 리프레시 토큰
CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  scope TEXT,
  expires_at TEXT NOT NULL,
  revoked INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_hash ON oauth_refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user ON oauth_refresh_tokens(user_id);

-- ============================================
-- 4. 세션 테이블 (KV 백업)
-- ============================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_id TEXT,
  device_info TEXT,  -- JSON
  ip_address TEXT,
  user_agent TEXT,
  is_active INTEGER DEFAULT 1,
  last_active_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- ============================================
-- 5. 로그인 시도 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success INTEGER DEFAULT 0,
  failure_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at);

-- ============================================
-- 6. 감사 로그 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  user_id TEXT,
  client_id TEXT,
  request_params TEXT,  -- JSON
  response_status INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_endpoint ON audit_logs(endpoint);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_status ON audit_logs(response_status);
