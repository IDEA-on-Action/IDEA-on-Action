-- ============================================
-- Blog RLS 정책 간단 재생성 + 테스트
-- 실행 방법: Supabase Dashboard → SQL Editor → 전체 복사/붙여넣기 → Run
-- ============================================

-- ============================================
-- STEP 1: 기존 정책 완전 삭제
-- ============================================

-- post_categories 정책 삭제
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_categories') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.post_categories';
  END LOOP;
END $$;

-- post_tags 정책 삭제
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_tags') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.post_tags';
  END LOOP;
END $$;

-- blog_posts 정책 삭제
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blog_posts') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.blog_posts';
  END LOOP;
END $$;

-- post_tag_relations 정책 삭제
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_tag_relations') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.post_tag_relations';
  END LOOP;
END $$;

-- ============================================
-- STEP 2: RLS 활성화 확인
-- ============================================

ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tag_relations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: 새 정책 생성 (가장 간단한 형태)
-- ============================================

-- post_categories: 모든 사용자가 SELECT 가능
CREATE POLICY "post_categories_select"
  ON public.post_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- post_tags: 모든 사용자가 SELECT 가능
CREATE POLICY "post_tags_select"
  ON public.post_tags FOR SELECT
  TO anon, authenticated
  USING (true);

-- blog_posts: Published 포스트만 모든 사용자가 SELECT 가능
CREATE POLICY "blog_posts_select_published"
  ON public.blog_posts FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- post_tag_relations: 모든 사용자가 SELECT 가능
CREATE POLICY "post_tag_relations_select"
  ON public.post_tag_relations FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================
-- STEP 4: 정책 확인
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd AS operation,
  roles AS allowed_roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('post_categories', 'post_tags', 'blog_posts', 'post_tag_relations')
ORDER BY tablename, cmd;

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Blog RLS 정책 재생성 완료!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 다음 단계:';
  RAISE NOTICE '1. SQL Editor → Settings (톱니바퀴) → "Run as" → "anon" 선택';
  RAISE NOTICE '2. 아래 테스트 쿼리 실행:';
  RAISE NOTICE '   SELECT * FROM post_categories LIMIT 1;';
  RAISE NOTICE '   SELECT * FROM post_tags LIMIT 1;';
  RAISE NOTICE '   SELECT * FROM blog_posts WHERE status = ''published'' LIMIT 1;';
  RAISE NOTICE '3. 결과가 나오면 정상입니다!';
END $$;





