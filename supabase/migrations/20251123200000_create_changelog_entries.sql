-- =============================================================================
-- TASK-018: changelog_entries 테이블 생성
-- 프로젝트 변경 로그 및 릴리스 노트 관리
-- =============================================================================

-- changelog_entries 테이블 생성
-- 프로젝트별 버전 릴리스 히스토리를 관리합니다.
CREATE TABLE IF NOT EXISTS public.changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 버전 정보
  version TEXT NOT NULL,                    -- 버전 번호 (예: 1.0.0, 2.1.0-beta)
  title TEXT NOT NULL,                      -- 릴리스 제목
  description TEXT,                         -- 릴리스 설명

  -- 변경 사항 (JSON 배열)
  -- 형식: [{type: 'feature'|'fix'|'breaking'|'improvement'|'deprecated', description: '...'}]
  changes JSONB DEFAULT '[]'::jsonb,

  -- 연관 정보 (projects.id는 TEXT 타입)
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  github_release_url TEXT,                  -- GitHub 릴리스 링크

  -- 타임스탬프
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 작성자
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 테이블 코멘트
COMMENT ON TABLE public.changelog_entries IS '프로젝트 변경 로그 및 릴리스 노트';
COMMENT ON COLUMN public.changelog_entries.version IS '버전 번호 (예: 1.0.0, 2.1.0-beta)';
COMMENT ON COLUMN public.changelog_entries.title IS '릴리스 제목';
COMMENT ON COLUMN public.changelog_entries.description IS '릴리스 설명 (상세 내용)';
COMMENT ON COLUMN public.changelog_entries.changes IS '변경 사항 JSON 배열 [{type, description}]';
COMMENT ON COLUMN public.changelog_entries.project_id IS '연관 프로젝트 ID (선택)';
COMMENT ON COLUMN public.changelog_entries.github_release_url IS 'GitHub 릴리스 페이지 URL';
COMMENT ON COLUMN public.changelog_entries.released_at IS '릴리스 일시';
COMMENT ON COLUMN public.changelog_entries.created_by IS '작성자 (관리자)';

-- =============================================================================
-- 인덱스 생성
-- =============================================================================

-- 릴리스 날짜 기준 내림차순 정렬용 인덱스
CREATE INDEX IF NOT EXISTS idx_changelog_released_at
  ON public.changelog_entries(released_at DESC);

-- 프로젝트별 변경 로그 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_changelog_project_id
  ON public.changelog_entries(project_id);

-- 버전 검색용 인덱스
CREATE INDEX IF NOT EXISTS idx_changelog_version
  ON public.changelog_entries(version);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책: 모든 사용자가 변경 로그를 조회할 수 있음
CREATE POLICY "changelog_select_public"
  ON public.changelog_entries
  FOR SELECT
  USING (true);

-- 관리자 INSERT 정책
CREATE POLICY "changelog_insert_admin"
  ON public.changelog_entries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- 관리자 UPDATE 정책
CREATE POLICY "changelog_update_admin"
  ON public.changelog_entries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- 관리자 DELETE 정책
CREATE POLICY "changelog_delete_admin"
  ON public.changelog_entries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- 트리거: updated_at 자동 업데이트
-- =============================================================================

CREATE TRIGGER update_changelog_entries_updated_at
  BEFORE UPDATE ON public.changelog_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 마이그레이션 완료 로그
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TASK-018: changelog_entries 테이블 생성 완료';
  RAISE NOTICE '- 테이블: public.changelog_entries';
  RAISE NOTICE '- 인덱스: idx_changelog_released_at, idx_changelog_project_id, idx_changelog_version';
  RAISE NOTICE '- RLS: 공개 읽기, 관리자 쓰기';
  RAISE NOTICE '- 트리거: update_changelog_entries_updated_at';
END $$;
