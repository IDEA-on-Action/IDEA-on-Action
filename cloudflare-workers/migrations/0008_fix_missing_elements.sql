-- =============================================================================
-- Fix Missing Elements Migration
-- 기존 테이블과 충돌하지 않는 요소만 추가
-- =============================================================================

-- =============================================================================
-- 1. 누락된 테이블 생성
-- =============================================================================

-- roles 테이블
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- user_roles 테이블
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- two_factor_auth 테이블
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  backup_codes TEXT,
  enabled INTEGER DEFAULT 0,
  verified_at TEXT,
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_2fa_user ON two_factor_auth(user_id);

-- cart_items 테이블
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL,
  service_id TEXT,
  package_id TEXT,
  quantity INTEGER DEFAULT 1,
  price REAL NOT NULL,
  options TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

-- ai_conversations 테이블
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  model TEXT DEFAULT 'claude-3-sonnet',
  system_prompt TEXT,
  metadata TEXT,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_archived ON ai_conversations(is_archived);

-- ai_messages 테이블
CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens_used INTEGER,
  model TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_msg_created ON ai_messages(created_at);

-- prompt_templates 테이블
CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  template TEXT NOT NULL,
  variables TEXT,
  category TEXT,
  user_id TEXT,
  is_public INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_slug ON prompt_templates(slug);
CREATE INDEX IF NOT EXISTS idx_prompt_user ON prompt_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_public ON prompt_templates(is_public);

-- work_with_us_inquiries 테이블
CREATE TABLE IF NOT EXISTS work_with_us_inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  service_interest TEXT,
  budget_range TEXT,
  timeline TEXT,
  message TEXT NOT NULL,
  attachments TEXT,
  status TEXT DEFAULT 'new',
  assigned_to TEXT,
  notes TEXT,
  responded_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inquiry_status ON work_with_us_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiry_created ON work_with_us_inquiries(created_at);

-- oauth_connections 테이블
CREATE TABLE IF NOT EXISTS oauth_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TEXT,
  scope TEXT,
  profile_data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_conn_user ON oauth_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_conn_provider ON oauth_connections(provider);

-- teams 테이블
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  owner_id TEXT NOT NULL,
  settings TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);

-- team_invitations 테이블
CREATE TABLE IF NOT EXISTS team_invitations (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_team_inv_team ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_inv_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_inv_token ON team_invitations(token);

-- analytics_events 테이블
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_type TEXT,
  user_id TEXT,
  session_id TEXT,
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  properties TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);

-- =============================================================================
-- 2. 기존 테이블 인덱스 추가 (기존 컬럼 기준)
-- =============================================================================

-- users 인덱스 (is_active 사용)
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- admins 인덱스
CREATE INDEX IF NOT EXISTS idx_admins_user ON admins(user_id);

-- user_profiles 인덱스
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);

-- services 인덱스
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);

-- service_categories 인덱스
CREATE INDEX IF NOT EXISTS idx_service_cat_slug ON service_categories(slug);

-- service_packages 인덱스
CREATE INDEX IF NOT EXISTS idx_service_pkg_service ON service_packages(service_id);

-- carts 인덱스
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);

-- orders 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- order_items 인덱스
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- payments 인덱스
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- billing_keys 인덱스
CREATE INDEX IF NOT EXISTS idx_billing_keys_user ON billing_keys(user_id);

-- subscription_plans 인덱스
CREATE INDEX IF NOT EXISTS idx_sub_plans_slug ON subscription_plans(slug);

-- subscriptions 인덱스
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- subscription_payments 인덱스
CREATE INDEX IF NOT EXISTS idx_sub_payments_sub ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_status ON subscription_payments(status);

-- blog_categories 인덱스
CREATE INDEX IF NOT EXISTS idx_blog_cat_slug ON blog_categories(slug);

-- blog_posts 인덱스
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);

-- tags 인덱스
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- notices 인덱스
CREATE INDEX IF NOT EXISTS idx_notices_slug ON notices(slug);
CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);

-- portfolio_items 인덱스
CREATE INDEX IF NOT EXISTS idx_portfolio_slug ON portfolio_items(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_status ON portfolio_items(status);

-- roadmap_items 인덱스
CREATE INDEX IF NOT EXISTS idx_roadmap_status ON roadmap_items(status);

-- media_library 인덱스
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media_library(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_folder ON media_library(folder);

-- team_members 인덱스 (기존 테이블은 회사 팀원 정보용 - user_id만 있음)
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- rag_documents 인덱스
CREATE INDEX IF NOT EXISTS idx_rag_doc_user ON rag_documents(user_id);

-- notifications 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- newsletter_subscriptions 인덱스
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscriptions(status);
