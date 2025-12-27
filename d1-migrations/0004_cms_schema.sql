-- ============================================
-- D1 CMS 스키마
-- Phase 3: Database 마이그레이션
-- ============================================

-- ============================================
-- 1. 블로그 카테고리
-- ============================================

CREATE TABLE IF NOT EXISTS blog_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES blog_categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX idx_blog_categories_parent ON blog_categories(parent_id);

-- ============================================
-- 2. 태그
-- ============================================

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tags_slug ON tags(slug);

-- ============================================
-- 3. 블로그 게시물
-- ============================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  author_id TEXT,
  category_id TEXT,
  featured_image TEXT,
  images TEXT DEFAULT '[]',  -- JSON 배열
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  is_featured INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  reading_time INTEGER,  -- 분 단위
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_featured ON blog_posts(is_featured);
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at);

-- ============================================
-- 4. 게시물-태그 연결
-- ============================================

CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_tags_post ON blog_post_tags(post_id);
CREATE INDEX idx_post_tags_tag ON blog_post_tags(tag_id);

-- ============================================
-- 5. 공지사항
-- ============================================

CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  author_id TEXT,
  type TEXT DEFAULT 'general'
    CHECK (type IN ('general', 'important', 'maintenance', 'update')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  is_pinned INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  published_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notices_slug ON notices(slug);
CREATE INDEX idx_notices_status ON notices(status);
CREATE INDEX idx_notices_type ON notices(type);
CREATE INDEX idx_notices_pinned ON notices(is_pinned);

-- ============================================
-- 6. 포트폴리오
-- ============================================

CREATE TABLE IF NOT EXISTS portfolio_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  client_name TEXT,
  category TEXT,
  technologies TEXT DEFAULT '[]',  -- JSON 배열
  featured_image TEXT,
  images TEXT DEFAULT '[]',  -- JSON 배열
  project_url TEXT,
  github_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  is_featured INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_portfolio_slug ON portfolio_items(slug);
CREATE INDEX idx_portfolio_status ON portfolio_items(status);
CREATE INDEX idx_portfolio_featured ON portfolio_items(is_featured);
CREATE INDEX idx_portfolio_order ON portfolio_items(display_order);

-- ============================================
-- 7. 팀 멤버
-- ============================================

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  bio TEXT,
  avatar_url TEXT,
  email TEXT,
  phone TEXT,
  social_links TEXT,  -- JSON
  skills TEXT DEFAULT '[]',  -- JSON 배열
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  joined_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_active ON team_members(is_active);
CREATE INDEX idx_team_members_order ON team_members(display_order);

-- ============================================
-- 8. 로드맵
-- ============================================

CREATE TABLE IF NOT EXISTS roadmap_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  progress INTEGER DEFAULT 0,  -- 0-100
  target_date TEXT,
  completed_at TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_roadmap_status ON roadmap_items(status);
CREATE INDEX idx_roadmap_priority ON roadmap_items(priority);
CREATE INDEX idx_roadmap_order ON roadmap_items(display_order);

-- ============================================
-- 9. 미디어 라이브러리
-- ============================================

CREATE TABLE IF NOT EXISTS media_library (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,  -- bytes
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  caption TEXT,
  folder TEXT DEFAULT 'uploads',
  uploaded_by TEXT,
  metadata TEXT,  -- JSON (dimensions, duration, etc.)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_media_filename ON media_library(filename);
CREATE INDEX idx_media_folder ON media_library(folder);
CREATE INDEX idx_media_mime ON media_library(mime_type);
CREATE INDEX idx_media_uploaded_by ON media_library(uploaded_by);
