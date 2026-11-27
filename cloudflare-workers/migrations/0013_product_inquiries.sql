-- =============================================================================
-- 0013: 제품 문의 (product_inquiries)
-- K-FDE Studio 등 제품 소개 페이지의 도입 문의를 저장한다.
-- 적용은 사람이 실행한다:
--   npx wrangler d1 execute idea-on-action-db --remote --file=migrations/0013_product_inquiries.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS product_inquiries (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  company TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IS NULL OR role IN ('business', 'planning', 'data_it', 'purchasing', 'other')),
  use_case TEXT NOT NULL,
  deployment TEXT NOT NULL CHECK (deployment IN ('customer_cloud', 'on_premise', 'undecided')),
  timeline TEXT CHECK (timeline IS NULL OR timeline IN ('within_3_months', 'within_6_months', 'undecided')),
  consent_at TEXT NOT NULL,
  -- received: 접수, contacted: 연락함, in_progress: 진행 중, closed: 종료
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'contacted', 'in_progress', 'closed')),
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_inquiries_status ON product_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_product_inquiries_created ON product_inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_product_inquiries_email ON product_inquiries(email, created_at);
