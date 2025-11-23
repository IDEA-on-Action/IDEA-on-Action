-- =============================================================================
-- StoriesHub RLS 정책 수정
-- newsletter_archive, changelog_entries 테이블 공개 읽기 권한 추가
--
-- 문제: 403 Forbidden 에러 - permission denied for table
-- 원인: RLS가 활성화되었으나 정책이 적용되지 않음
-- =============================================================================

-- =============================================================================
-- 1. newsletter_archive 테이블 RLS 정책
-- =============================================================================

-- 기존 정책이 있을 수 있으므로 안전하게 삭제 후 재생성
DROP POLICY IF EXISTS "newsletter_archive_select_public" ON public.newsletter_archive;
DROP POLICY IF EXISTS "newsletter_archive_public_read" ON public.newsletter_archive;
DROP POLICY IF EXISTS "Allow public read access" ON public.newsletter_archive;

-- RLS 활성화 확인
ALTER TABLE public.newsletter_archive ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책: 모든 사용자(익명 포함)가 아카이브된 뉴스레터를 조회할 수 있음
CREATE POLICY "newsletter_archive_select_public"
  ON public.newsletter_archive
  FOR SELECT
  TO public
  USING (true);

-- =============================================================================
-- 2. changelog_entries 테이블 RLS 정책
-- =============================================================================

-- 기존 정책이 있을 수 있으므로 안전하게 삭제 후 재생성
DROP POLICY IF EXISTS "changelog_select_public" ON public.changelog_entries;
DROP POLICY IF EXISTS "changelog_public_read" ON public.changelog_entries;
DROP POLICY IF EXISTS "Allow public read access" ON public.changelog_entries;

-- RLS 활성화 확인
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책: 모든 사용자(익명 포함)가 변경 로그를 조회할 수 있음
CREATE POLICY "changelog_select_public"
  ON public.changelog_entries
  FOR SELECT
  TO public
  USING (true);

-- =============================================================================
-- 3. 권한 부여 (anon 역할에 SELECT 권한)
-- =============================================================================

-- anon 역할에 테이블 SELECT 권한 부여
GRANT SELECT ON public.newsletter_archive TO anon;
GRANT SELECT ON public.newsletter_archive TO authenticated;

GRANT SELECT ON public.changelog_entries TO anon;
GRANT SELECT ON public.changelog_entries TO authenticated;

-- projects 테이블도 확인 (changelog_entries에서 JOIN으로 참조)
GRANT SELECT ON public.projects TO anon;
GRANT SELECT ON public.projects TO authenticated;

-- =============================================================================
-- 마이그레이션 완료 로그
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'StoriesHub RLS 정책 수정 완료';
  RAISE NOTICE '- newsletter_archive: 공개 읽기 정책 적용';
  RAISE NOTICE '- changelog_entries: 공개 읽기 정책 적용';
  RAISE NOTICE '- anon/authenticated 역할에 SELECT 권한 부여';
END $$;
