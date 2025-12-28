-- =============================================================================
-- post_categories 테이블 수정
-- updated_at 컬럼 추가 (blog_categories와 일치)
-- =============================================================================

ALTER TABLE post_categories ADD COLUMN updated_at TEXT;
