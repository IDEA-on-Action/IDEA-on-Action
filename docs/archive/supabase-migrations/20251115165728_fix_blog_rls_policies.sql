-- ============================================
-- Blog 테이블 RLS 정책 수정
-- 일시: 2025-11-15
-- 목적: post_categories, post_tags, blog_posts, post_tag_relations 테이블의 401 오류 해결
-- ============================================
-- 
-- 문제: 원본 마이그레이션에서 user_has_permission() 함수를 사용하는 정책이
--      제대로 작동하지 않아 401 Unauthorized 오류 발생
-- 해결: anon과 authenticated 모두 SELECT 가능하도록 정책 재정의
-- ============================================

-- ============================================
-- 1. post_categories 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (원본 마이그레이션의 정책 제거)
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.post_categories;
DROP POLICY IF EXISTS "Categories are insertable by blog managers" ON public.post_categories;
DROP POLICY IF EXISTS "Categories are updatable by blog managers" ON public.post_categories;
DROP POLICY IF EXISTS "Categories are deletable by blog managers" ON public.post_categories;

-- 누구나 카테고리 조회 가능 (SELECT) - anon과 authenticated 모두 허용
CREATE POLICY "Categories are viewable by everyone"
  ON public.post_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- 관리자만 카테고리 생성/수정/삭제 가능 (INSERT/UPDATE/DELETE)
CREATE POLICY "Categories are insertable by blog managers"
  ON public.post_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

CREATE POLICY "Categories are updatable by blog managers"
  ON public.post_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

CREATE POLICY "Categories are deletable by blog managers"
  ON public.post_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- ============================================
-- 2. post_tags 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (원본 마이그레이션의 정책 제거)
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.post_tags;
DROP POLICY IF EXISTS "Tags are insertable by blog managers" ON public.post_tags;
DROP POLICY IF EXISTS "Tags are updatable by blog managers" ON public.post_tags;
DROP POLICY IF EXISTS "Tags are deletable by blog managers" ON public.post_tags;

-- 누구나 태그 조회 가능 (SELECT) - anon과 authenticated 모두 허용
CREATE POLICY "Tags are viewable by everyone"
  ON public.post_tags FOR SELECT
  TO anon, authenticated
  USING (true);

-- 관리자만 태그 생성/수정/삭제 가능 (INSERT/UPDATE/DELETE)
CREATE POLICY "Tags are insertable by blog managers"
  ON public.post_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

CREATE POLICY "Tags are updatable by blog managers"
  ON public.post_tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

CREATE POLICY "Tags are deletable by blog managers"
  ON public.post_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- ============================================
-- 3. blog_posts 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (원본 마이그레이션의 정책 제거)
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.blog_posts;
DROP POLICY IF EXISTS "Posts are insertable by blog creators" ON public.blog_posts;
DROP POLICY IF EXISTS "Posts are updatable by managers or authors" ON public.blog_posts;
DROP POLICY IF EXISTS "Posts are deletable by blog managers" ON public.blog_posts;

-- Published posts는 모든 사용자가 조회 가능, Draft/Archived는 작성자 또는 관리자만
CREATE POLICY "Published posts are viewable by everyone"
  ON public.blog_posts FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published' OR
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- 작성자만 게시글 생성 가능 (INSERT) - 모든 인증된 사용자가 작성 가능
CREATE POLICY "Posts are insertable by blog creators"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- 작성자 또는 관리자만 게시글 수정 가능 (UPDATE)
CREATE POLICY "Posts are updatable by managers or authors"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  )
  WITH CHECK (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- 관리자만 게시글 삭제 가능 (DELETE)
CREATE POLICY "Posts are deletable by blog managers"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- ============================================
-- 4. post_tag_relations 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.post_tag_relations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (원본 마이그레이션의 정책 제거)
DROP POLICY IF EXISTS "Post-tag relations are viewable by everyone" ON public.post_tag_relations;
DROP POLICY IF EXISTS "Post-tag relations are insertable by blog managers" ON public.post_tag_relations;
DROP POLICY IF EXISTS "Post-tag relations are deletable by blog managers" ON public.post_tag_relations;

-- 누구나 post-tag 관계 조회 가능 (SELECT) - anon과 authenticated 모두 허용
CREATE POLICY "Post-tag relations are viewable by everyone"
  ON public.post_tag_relations FOR SELECT
  TO anon, authenticated
  USING (true);

-- 관리자만 post-tag 관계 생성 가능 (INSERT)
CREATE POLICY "Post-tag relations are insertable by blog managers"
  ON public.post_tag_relations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- 관리자만 post-tag 관계 삭제 가능 (DELETE)
CREATE POLICY "Post-tag relations are deletable by blog managers"
  ON public.post_tag_relations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Blog 테이블 RLS 정책 수정 완료!';
  RAISE NOTICE '- post_categories 테이블: RLS 정책 4개 재생성 (SELECT: anon/authenticated 허용)';
  RAISE NOTICE '- post_tags 테이블: RLS 정책 4개 재생성 (SELECT: anon/authenticated 허용)';
  RAISE NOTICE '- blog_posts 테이블: RLS 정책 4개 재생성 (SELECT: published posts는 anon/authenticated 허용)';
  RAISE NOTICE '- post_tag_relations 테이블: RLS 정책 3개 재생성 (SELECT: anon/authenticated 허용)';
  RAISE NOTICE '';
  RAISE NOTICE '이제 로그인하지 않은 사용자(anon)도 블로그 카테고리, 태그, published 포스트를 조회할 수 있습니다.';
END $$;





