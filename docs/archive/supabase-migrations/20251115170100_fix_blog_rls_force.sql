-- ============================================
-- Blog 테이블 RLS 정책 강제 재생성
-- 일시: 2025-11-15
-- 목적: 모든 정책을 완전히 삭제하고 재생성하여 401 오류 해결
-- ============================================
-- 
-- 이 스크립트는 모든 기존 정책을 삭제하고 
-- 가장 간단하고 확실한 정책으로 재생성합니다.
-- ============================================

-- ============================================
-- 1. post_categories 테이블 - 완전 재생성
-- ============================================

ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;

-- 모든 정책 삭제 (이름과 관계없이)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_categories') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.post_categories';
    END LOOP;
END $$;

-- SELECT: 모든 사용자 허용
CREATE POLICY "post_categories_select_all"
  ON public.post_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: 관리자만
CREATE POLICY "post_categories_modify_admin"
  ON public.post_categories FOR ALL
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

-- ============================================
-- 2. post_tags 테이블 - 완전 재생성
-- ============================================

ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- 모든 정책 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_tags') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.post_tags';
    END LOOP;
END $$;

-- SELECT: 모든 사용자 허용
CREATE POLICY "post_tags_select_all"
  ON public.post_tags FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: 관리자만
CREATE POLICY "post_tags_modify_admin"
  ON public.post_tags FOR ALL
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

-- ============================================
-- 3. blog_posts 테이블 - 완전 재생성
-- ============================================

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 모든 정책 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blog_posts') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.blog_posts';
    END LOOP;
END $$;

-- SELECT: Published 포스트는 모든 사용자, Draft/Archived는 작성자/관리자
CREATE POLICY "blog_posts_select_published"
  ON public.blog_posts FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "blog_posts_select_draft"
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

-- INSERT: 인증된 사용자만, 본인이 작성자
CREATE POLICY "blog_posts_insert"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- UPDATE: 작성자 또는 관리자
CREATE POLICY "blog_posts_update"
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

-- DELETE: 관리자만
CREATE POLICY "blog_posts_delete"
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
-- 4. post_tag_relations 테이블 - 완전 재생성
-- ============================================

ALTER TABLE public.post_tag_relations ENABLE ROW LEVEL SECURITY;

-- 모든 정책 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_tag_relations') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.post_tag_relations';
    END LOOP;
END $$;

-- SELECT: 모든 사용자 허용
CREATE POLICY "post_tag_relations_select_all"
  ON public.post_tag_relations FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT/DELETE: 관리자만
CREATE POLICY "post_tag_relations_modify_admin"
  ON public.post_tag_relations FOR ALL
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

-- ============================================
-- 완료 메시지 및 검증
-- ============================================

DO $$
DECLARE
    cat_count INTEGER;
    tag_count INTEGER;
    rel_count INTEGER;
    post_count INTEGER;
BEGIN
    -- 정책 개수 확인
    SELECT COUNT(*) INTO cat_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_categories';
    SELECT COUNT(*) INTO tag_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_tags';
    SELECT COUNT(*) INTO rel_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_tag_relations';
    SELECT COUNT(*) INTO post_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blog_posts';
    
    RAISE NOTICE '✅ Blog 테이블 RLS 정책 강제 재생성 완료!';
    RAISE NOTICE '- post_categories: %개 정책', cat_count;
    RAISE NOTICE '- post_tags: %개 정책', tag_count;
    RAISE NOTICE '- post_tag_relations: %개 정책', rel_count;
    RAISE NOTICE '- blog_posts: %개 정책', post_count;
    RAISE NOTICE '';
    RAISE NOTICE '이제 anon 사용자도 카테고리, 태그, published 포스트를 조회할 수 있습니다.';
END $$;





