-- =============================================================================
-- TASK-028: github_stats_cache 테이블 생성
-- GitHub API 통계 캐시 (Rate Limit 최적화)
-- =============================================================================

-- github_stats_cache 테이블 생성
-- GitHub API 호출 결과를 캐시하여 Rate Limit을 효율적으로 관리합니다.
CREATE TABLE IF NOT EXISTS public.github_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 저장소 정보
  repo_url TEXT NOT NULL UNIQUE,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,

  -- 통계 정보
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  open_issues INTEGER DEFAULT 0,
  commits INTEGER DEFAULT 0,
  contributors INTEGER DEFAULT 0,
  language TEXT,
  default_branch TEXT DEFAULT 'main',

  -- 최신 릴리즈 정보
  last_release_version TEXT,
  last_release_date TIMESTAMPTZ,
  last_release_url TEXT,

  -- 캐시 관리
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 테이블 코멘트
COMMENT ON TABLE public.github_stats_cache IS 'GitHub API 통계 캐시 테이블';
COMMENT ON COLUMN public.github_stats_cache.repo_url IS 'GitHub 저장소 전체 URL';
COMMENT ON COLUMN public.github_stats_cache.owner IS '저장소 소유자';
COMMENT ON COLUMN public.github_stats_cache.repo IS '저장소 이름';
COMMENT ON COLUMN public.github_stats_cache.stars IS '스타 수';
COMMENT ON COLUMN public.github_stats_cache.forks IS '포크 수';
COMMENT ON COLUMN public.github_stats_cache.open_issues IS '열린 이슈 수';
COMMENT ON COLUMN public.github_stats_cache.commits IS '총 커밋 수';
COMMENT ON COLUMN public.github_stats_cache.contributors IS '기여자 수';
COMMENT ON COLUMN public.github_stats_cache.language IS '주 사용 언어';
COMMENT ON COLUMN public.github_stats_cache.cached_at IS '캐시 생성 시간';
COMMENT ON COLUMN public.github_stats_cache.expires_at IS '캐시 만료 시간';

-- =============================================================================
-- 인덱스 생성
-- =============================================================================

-- 저장소 URL로 빠른 조회
CREATE INDEX IF NOT EXISTS idx_github_cache_repo_url
  ON public.github_stats_cache(repo_url);

-- 캐시 만료 시간으로 정리 대상 조회
CREATE INDEX IF NOT EXISTS idx_github_cache_expires
  ON public.github_stats_cache(expires_at);

-- owner/repo 조합으로 조회
CREATE INDEX IF NOT EXISTS idx_github_cache_owner_repo
  ON public.github_stats_cache(owner, repo);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE public.github_stats_cache ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책: 모든 사용자가 캐시를 조회할 수 있음
CREATE POLICY "github_cache_select_public"
  ON public.github_stats_cache
  FOR SELECT
  USING (true);

-- 관리자 INSERT 정책
CREATE POLICY "github_cache_insert_admin"
  ON public.github_stats_cache
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- 관리자 UPDATE 정책
CREATE POLICY "github_cache_update_admin"
  ON public.github_stats_cache
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- 관리자 DELETE 정책
CREATE POLICY "github_cache_delete_admin"
  ON public.github_stats_cache
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

CREATE TRIGGER update_github_stats_cache_updated_at
  BEFORE UPDATE ON public.github_stats_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 헬퍼 함수: 만료된 캐시 정리
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_github_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.github_stats_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_github_cache IS '만료된 GitHub 캐시 항목을 정리합니다';

-- =============================================================================
-- 마이그레이션 완료 로그
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TASK-028: github_stats_cache 테이블 생성 완료';
  RAISE NOTICE '- 테이블: public.github_stats_cache';
  RAISE NOTICE '- 인덱스: idx_github_cache_repo_url, idx_github_cache_expires, idx_github_cache_owner_repo';
  RAISE NOTICE '- RLS: 공개 읽기, 관리자 쓰기';
  RAISE NOTICE '- 함수: cleanup_expired_github_cache()';
END $$;
