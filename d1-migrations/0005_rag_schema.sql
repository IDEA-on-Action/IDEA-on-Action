-- ============================================
-- D1 RAG 스키마 (벡터 제외 - Vectorize 사용)
-- Phase 3: Database 마이그레이션
-- ============================================

-- ============================================
-- 1. RAG 문서
-- ============================================

CREATE TABLE IF NOT EXISTS rag_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  source_type TEXT DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'upload', 'crawl', 'api')),
  source_url TEXT,
  file_path TEXT,  -- R2 경로
  mime_type TEXT,
  file_size INTEGER,
  chunk_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  service_id TEXT,  -- 관련 서비스
  user_id TEXT,
  is_public INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  error_message TEXT,
  metadata TEXT,  -- JSON
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_rag_docs_service ON rag_documents(service_id);
CREATE INDEX idx_rag_docs_user ON rag_documents(user_id);
CREATE INDEX idx_rag_docs_status ON rag_documents(status);
CREATE INDEX idx_rag_docs_public ON rag_documents(is_public);

-- ============================================
-- 2. RAG 청크 (메타데이터만, 벡터는 Vectorize)
-- ============================================

CREATE TABLE IF NOT EXISTS rag_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  start_char INTEGER,
  end_char INTEGER,
  metadata TEXT,  -- JSON (heading, page, etc.)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(document_id, chunk_index),
  FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_rag_chunks_document ON rag_chunks(document_id);
CREATE INDEX idx_rag_chunks_index ON rag_chunks(document_id, chunk_index);

-- ============================================
-- 3. RAG 검색 로그
-- ============================================

CREATE TABLE IF NOT EXISTS rag_search_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  top_score REAL,
  search_type TEXT DEFAULT 'hybrid'
    CHECK (search_type IN ('vector', 'keyword', 'hybrid')),
  filters TEXT,  -- JSON
  latency_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_rag_search_user ON rag_search_logs(user_id);
CREATE INDEX idx_rag_search_created ON rag_search_logs(created_at);

-- ============================================
-- 4. 콘텐츠 버전 관리
-- ============================================

CREATE TABLE IF NOT EXISTS content_versions (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,  -- blog_post, notice, service, etc.
  entity_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,  -- JSON (전체 엔티티 스냅샷)
  change_summary TEXT,
  changed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(entity_type, entity_id, version_number),
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_content_versions_entity ON content_versions(entity_type, entity_id);
CREATE INDEX idx_content_versions_number ON content_versions(version_number);

-- ============================================
-- 5. FTS (Full-Text Search) 가상 테이블
-- ============================================

-- 블로그 검색용 FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS blog_posts_fts USING fts5(
  title,
  content,
  excerpt,
  content='blog_posts',
  content_rowid='rowid'
);

-- RAG 문서 검색용 FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS rag_documents_fts USING fts5(
  title,
  content,
  content='rag_documents',
  content_rowid='rowid'
);

-- RAG 청크 검색용 FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS rag_chunks_fts USING fts5(
  chunk_text,
  content='rag_chunks',
  content_rowid='rowid'
);

-- 서비스 검색용 FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS services_fts USING fts5(
  title,
  description,
  short_description,
  content='services',
  content_rowid='rowid'
);
