-- Phase 2: 자체 블로그 구축 - post_type 컬럼 추가
-- Migration: 20251214000001_add_post_type_column.sql
-- Author: Claude AI
-- Date: 2025-12-14

-- =====================================================
-- 1. POST_TYPE 컬럼 추가
-- =====================================================
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'blog'
CHECK (post_type IN ('blog', 'changelog', 'devlog', 'announcement'));

COMMENT ON COLUMN public.blog_posts.post_type IS 'Type of post: blog, changelog, devlog, or announcement';

-- =====================================================
-- 2. 인덱스 추가
-- =====================================================
-- post_type 단독 인덱스
CREATE INDEX IF NOT EXISTS idx_blog_posts_post_type ON public.blog_posts(post_type);

-- post_type + published_at 복합 인덱스 (게시된 포스트 타입별 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_blog_posts_type_published
  ON public.blog_posts(post_type, published_at DESC)
  WHERE status = 'published';

-- =====================================================
-- 3. 새 카테고리 추가
-- =====================================================
INSERT INTO public.post_categories (name, slug, description) VALUES
  ('개발 일지', 'devlog', '프로젝트 개발 과정과 기술적 의사결정 기록'),
  ('릴리즈 노트', 'release-notes', '버전별 변경사항 및 업데이트 내역')
ON CONFLICT ON CONSTRAINT post_categories_name_key DO NOTHING;

-- =====================================================
-- 4. 새 태그 추가
-- =====================================================
INSERT INTO public.post_tags (name, slug) VALUES
  ('버전업', 'version-update'),
  ('개발일지', 'dev-diary'),
  ('리팩토링', 'refactoring'),
  ('신기능', 'new-feature'),
  ('버그수정', 'bugfix')
ON CONFLICT ON CONSTRAINT post_tags_name_key DO NOTHING;
