-- ============================================
-- Blog 테이블 RLS 정책 간단화 및 수정
-- 일시: 2025-11-15
-- 목적: anon 사용자도 published 포스트 조회 가능하도록 정책 단순화
-- ============================================
-- 
-- 문제: blog_posts 정책에서 auth.uid()를 사용하는 부분이 
--      anon 사용자(null)에서 문제를 일으킬 수 있음
-- 해결: published 포스트는 별도 정책으로 분리하여 단순화
-- ============================================

-- ============================================
-- 1. blog_posts 테이블 RLS 정책 재생성 (단순화)
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.blog_posts;
DROP POLICY IF EXISTS "Posts are insertable by blog creators" ON public.blog_posts;
DROP POLICY IF EXISTS "Posts are updatable by managers or authors" ON public.blog_posts;
DROP POLICY IF EXISTS "Posts are deletable by blog managers" ON public.blog_posts;

-- 정책 1: Published 포스트는 모든 사용자가 조회 가능 (anon 포함)
CREATE POLICY "Published posts are viewable by everyone"
  ON public.blog_posts FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- 정책 2: Draft/Archived 포스트는 작성자 또는 관리자만 조회 가능 (authenticated만)
CREATE POLICY "Draft posts are viewable by authors or admins"
  ON public.blog_posts FOR SELECT
  TO authenticated
  USING (
    (status = 'draft' OR status = 'archived') AND
    (
      author_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.user_roles
        JOIN public.roles ON user_roles.role_id = roles.id
        WHERE user_roles.user_id = auth.uid()
        AND roles.name = 'admin'
      )
    )
  );

-- 작성자만 게시글 생성 가능 (INSERT)
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
-- 2. post_categories 테이블 정책 확인 (이미 올바름)
-- ============================================
-- 정책이 이미 올바르게 설정되어 있으므로 재생성하지 않음

-- ============================================
-- 3. post_tags 테이블 정책 확인 (이미 올바름)
-- ============================================
-- 정책이 이미 올바르게 설정되어 있으므로 재생성하지 않음

-- ============================================
-- 4. post_tag_relations 테이블 정책 확인 (이미 올바름)
-- ============================================
-- 정책이 이미 올바르게 설정되어 있으므로 재생성하지 않음

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Blog 테이블 RLS 정책 단순화 완료!';
  RAISE NOTICE '- blog_posts 테이블: SELECT 정책 2개로 분리';
  RAISE NOTICE '  * Published 포스트: anon/authenticated 모두 조회 가능';
  RAISE NOTICE '  * Draft/Archived 포스트: authenticated만 (작성자/관리자)';
  RAISE NOTICE '';
  RAISE NOTICE '이제 로그인하지 않은 사용자(anon)도 published 포스트를 조회할 수 있습니다.';
END $$;





