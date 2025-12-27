-- =============================================================================
-- Core Business Tables Migration
-- PostgreSQL ??SQLite (D1) ?ÑÏ†Ñ ÎßàÏù¥Í∑∏Î†à?¥ÏÖò
-- =============================================================================

-- =============================================================================
-- 1. ?¨Ïö©??Î∞??∏Ï¶ù ?åÏù¥Î∏?
-- =============================================================================

-- users ?åÏù¥Î∏?(?µÏã¨ ?¨Ïö©??
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  encrypted_password TEXT,
  name TEXT,
  avatar_url TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  email_confirmed_at TEXT,
  last_sign_in_at TEXT,
  raw_app_meta_data TEXT,
  raw_user_meta_data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- user_profiles ?åÏù¥Î∏?(?ïÏû• ?ÑÎ°ú??
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  website TEXT,
  company TEXT,
  location TEXT,
  social_links TEXT,
  preferences TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);

-- admins ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  permissions TEXT,
  is_super_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admins_user ON admins(user_id);

-- roles ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- user_roles ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- two_factor_auth ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  backup_codes TEXT,
  enabled INTEGER DEFAULT 0,
  verified_at TEXT,
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_2fa_user ON two_factor_auth(user_id);

-- =============================================================================
-- 2. ?úÎπÑ??Î∞??ÅÌíà ?åÏù¥Î∏?
-- =============================================================================

-- service_categories ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  parent_id TEXT REFERENCES service_categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_cat_slug ON service_categories(slug);
CREATE INDEX IF NOT EXISTS idx_service_cat_parent ON service_categories(parent_id);

-- services ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  category_id TEXT REFERENCES service_categories(id),
  price REAL DEFAULT 0,
  original_price REAL,
  currency TEXT DEFAULT 'KRW',
  price_type TEXT DEFAULT 'fixed',
  features TEXT,
  benefits TEXT,
  requirements TEXT,
  deliverables TEXT,
  duration_days INTEGER,
  thumbnail_url TEXT,
  gallery TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'draft',
  is_featured INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_featured ON services(is_featured);

-- service_packages ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS service_packages (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  original_price REAL,
  features TEXT,
  delivery_time TEXT,
  revisions INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_popular INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_pkg_service ON service_packages(service_id);

-- =============================================================================
-- 3. ?•Î∞îÍµ¨Îãà ?åÏù¥Î∏?
-- =============================================================================

-- carts ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  status TEXT DEFAULT 'active',
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id);

-- cart_items ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id),
  package_id TEXT REFERENCES service_packages(id),
  quantity INTEGER DEFAULT 1,
  price REAL NOT NULL,
  options TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

-- =============================================================================
-- 4. Ï£ºÎ¨∏ Î∞?Í≤∞Ï†ú ?åÏù¥Î∏?
-- =============================================================================

-- orders ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  subtotal REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  currency TEXT DEFAULT 'KRW',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  billing_name TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  billing_address TEXT,
  notes TEXT,
  metadata TEXT,
  paid_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  refunded_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- order_items ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id),
  package_id TEXT REFERENCES service_packages(id),
  title TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  service_snapshot TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- payments ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'KRW',
  method TEXT NOT NULL,
  provider TEXT,
  provider_payment_id TEXT,
  status TEXT DEFAULT 'pending',
  gateway_response TEXT,
  billing_key TEXT,
  card_type TEXT,
  card_last4 TEXT,
  receipt_url TEXT,
  refund_amount REAL,
  refunded_at TEXT,
  failed_reason TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider_payment_id);

-- billing_keys ?åÏù¥Î∏?(?ïÍ∏∞Í≤∞Ï†ú??
CREATE TABLE IF NOT EXISTS billing_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_key TEXT NOT NULL,
  card_company TEXT,
  card_number TEXT,
  card_type TEXT,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_billing_keys_user ON billing_keys(user_id);

-- =============================================================================
-- 5. Íµ¨ÎèÖ ?åÏù¥Î∏?
-- =============================================================================

-- subscription_plans ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price REAL NOT NULL,
  currency TEXT DEFAULT 'KRW',
  interval TEXT DEFAULT 'month',
  interval_count INTEGER DEFAULT 1,
  trial_days INTEGER DEFAULT 0,
  features TEXT,
  limits TEXT,
  is_active INTEGER DEFAULT 1,
  is_popular INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sub_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_sub_plans_active ON subscription_plans(is_active);

-- subscriptions ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT DEFAULT 'active',
  billing_key_id TEXT REFERENCES billing_keys(id),
  current_period_start TEXT,
  current_period_end TEXT,
  trial_start TEXT,
  trial_end TEXT,
  cancelled_at TEXT,
  cancel_reason TEXT,
  ended_at TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- subscription_payments ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  payment_id TEXT REFERENCES payments(id),
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'KRW',
  status TEXT DEFAULT 'pending',
  billing_date TEXT,
  paid_at TEXT,
  failed_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_sub ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_status ON subscription_payments(status);

-- =============================================================================
-- 6. CMS ?åÏù¥Î∏?
-- =============================================================================

-- blog_categories ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS blog_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id TEXT REFERENCES blog_categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_cat_slug ON blog_categories(slug);

-- blog_posts ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  category_id TEXT REFERENCES blog_categories(id),
  author_id TEXT REFERENCES users(id),
  featured_image TEXT,
  gallery TEXT,
  tags TEXT,
  status TEXT DEFAULT 'draft',
  is_featured INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at);

-- tags ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- notices ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'draft',
  is_pinned INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  published_at TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notices_slug ON notices(slug);
CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);
CREATE INDEX IF NOT EXISTS idx_notices_type ON notices(type);

-- portfolio_items ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS portfolio_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  content TEXT,
  category TEXT,
  client TEXT,
  project_url TEXT,
  thumbnail_url TEXT,
  gallery TEXT,
  technologies TEXT,
  features TEXT,
  testimonial TEXT,
  status TEXT DEFAULT 'draft',
  is_featured INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  completed_at TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_portfolio_slug ON portfolio_items(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_status ON portfolio_items(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_category ON portfolio_items(category);

-- roadmap_items ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS roadmap_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'planned',
  priority TEXT DEFAULT 'medium',
  progress INTEGER DEFAULT 0,
  target_date TEXT,
  completed_at TEXT,
  sort_order INTEGER DEFAULT 0,
  votes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_roadmap_status ON roadmap_items(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_category ON roadmap_items(category);

-- =============================================================================
-- 7. Î∂ÑÏÑù ?åÏù¥Î∏?
-- =============================================================================

-- analytics_events ?åÏù¥Î∏?
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
-- 8. ÎØ∏Îîî???ºÏù¥Î∏åÎü¨Î¶??åÏù¥Î∏?
-- =============================================================================

-- media_library ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS media_library (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_size INTEGER,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  alt_text TEXT,
  caption TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  uploaded_by TEXT REFERENCES users(id),
  folder TEXT,
  tags TEXT,
  metadata TEXT,
  is_public INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media_library(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_mime ON media_library(mime_type);
CREATE INDEX IF NOT EXISTS idx_media_folder ON media_library(folder);
CREATE INDEX IF NOT EXISTS idx_media_deleted ON media_library(deleted_at);

-- =============================================================================
-- 9. ?Ä Î∞?Ï°∞ÏßÅ ?åÏù¥Î∏?
-- =============================================================================

-- teams ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  settings TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);

-- team_members ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  permissions TEXT,
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- team_invitations ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS team_invitations (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_team_inv_team ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_inv_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_inv_token ON team_invitations(token);

-- =============================================================================
-- 10. AI Î∞?RAG ?åÏù¥Î∏?
-- =============================================================================

-- ai_conversations ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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

-- ai_messages ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens_used INTEGER,
  model TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_msg_created ON ai_messages(created_at);

-- prompt_templates ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  template TEXT NOT NULL,
  variables TEXT,
  category TEXT,
  user_id TEXT REFERENCES users(id),
  is_public INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_slug ON prompt_templates(slug);
CREATE INDEX IF NOT EXISTS idx_prompt_user ON prompt_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_public ON prompt_templates(is_public);

-- rag_documents ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS rag_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  content TEXT,
  metadata TEXT,
  user_id TEXT REFERENCES users(id),
  service_id TEXT,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  chunk_count INTEGER DEFAULT 0,
  is_public INTEGER DEFAULT 0,
  is_indexed INTEGER DEFAULT 0,
  indexed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rag_doc_user ON rag_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_doc_service ON rag_documents(service_id);
CREATE INDEX IF NOT EXISTS idx_rag_doc_public ON rag_documents(is_public);
CREATE INDEX IF NOT EXISTS idx_rag_doc_indexed ON rag_documents(is_indexed);

-- =============================================================================
-- 11. Î¨∏Ïùò Î∞??åÎ¶º ?åÏù¥Î∏?
-- =============================================================================

-- work_with_us_inquiries ?åÏù¥Î∏?
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
  assigned_to TEXT REFERENCES users(id),
  notes TEXT,
  responded_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inquiry_status ON work_with_us_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiry_created ON work_with_us_inquiries(created_at);

-- notifications ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data TEXT,
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- =============================================================================
-- 12. Í∞êÏÇ¨ Î°úÍ∑∏ ?åÏù¥Î∏?
-- =============================================================================

-- audit_logs ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- =============================================================================
-- 13. OAuth ?∞Í≤∞ ?åÏù¥Î∏?
-- =============================================================================

-- oauth_connections ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS oauth_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_oauth_conn_provider_user ON oauth_connections(provider, provider_user_id);

-- =============================================================================
-- 14. ?¥Ïä§?àÌÑ∞ ?åÏù¥Î∏?
-- =============================================================================

-- newsletter_subscriptions ?åÏù¥Î∏?
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT DEFAULT 'active',
  source TEXT,
  confirmed_at TEXT,
  unsubscribed_at TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscriptions(status);
