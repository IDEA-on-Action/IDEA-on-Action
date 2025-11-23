-- =====================================================
-- MCP ORCHESTRATOR AUTH TABLES
-- service_tokens + refresh_tokens 테이블 생성
--
-- 관련 문서: plan/claude-skills/sprint4-schema.md
-- 버전: 1.0.0
-- 작성일: 2025-11-23
-- =====================================================

-- =====================================================
-- 1. SERVICE_TOKENS TABLE
-- 서비스 간 인증용 Access Token 관리
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_tokens (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 서비스 정보
  service_name TEXT NOT NULL,

  -- 토큰 정보
  access_token TEXT NOT NULL,          -- JWT Access Token (암호화 저장)
  token_hash TEXT NOT NULL,            -- SHA256 해시 (빠른 검증용)

  -- 권한 정보
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 유효 기간
  expires_at TIMESTAMPTZ NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  -- 상태
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT valid_service_name CHECK (
    service_name IN ('minu_find', 'minu_frame', 'minu_build', 'minu_keep', 'hub')
  ),
  CONSTRAINT valid_expires_at CHECK (expires_at > created_at),
  CONSTRAINT token_not_empty CHECK (length(access_token) > 0),
  CONSTRAINT token_hash_not_empty CHECK (length(token_hash) > 0)
);

-- 테이블 코멘트
COMMENT ON TABLE public.service_tokens IS 'MCP Orchestrator: 서비스 간 인증 토큰 관리';
COMMENT ON COLUMN public.service_tokens.id IS '토큰 고유 ID';
COMMENT ON COLUMN public.service_tokens.service_name IS '토큰 발급 대상 서비스 (minu_find, minu_frame, minu_build, minu_keep, hub)';
COMMENT ON COLUMN public.service_tokens.access_token IS 'JWT Access Token (암호화 저장)';
COMMENT ON COLUMN public.service_tokens.token_hash IS 'SHA256 해시 - 빠른 토큰 검증용';
COMMENT ON COLUMN public.service_tokens.permissions IS '부여된 권한 목록 (JSON Array)';
COMMENT ON COLUMN public.service_tokens.expires_at IS '토큰 만료 시간';
COMMENT ON COLUMN public.service_tokens.issued_at IS '토큰 발급 시간';
COMMENT ON COLUMN public.service_tokens.last_used_at IS '마지막 사용 시간';
COMMENT ON COLUMN public.service_tokens.is_revoked IS '폐기 여부';
COMMENT ON COLUMN public.service_tokens.revoked_at IS '폐기 시간';

-- =====================================================
-- 2. REFRESH_TOKENS TABLE
-- Access Token 갱신을 위한 Refresh Token 관리
-- =====================================================
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연결된 Service Token
  service_token_id UUID REFERENCES public.service_tokens(id) ON DELETE CASCADE,

  -- Refresh Token
  refresh_token TEXT NOT NULL,         -- JWT Refresh Token (암호화 저장)
  token_hash TEXT NOT NULL,            -- SHA256 해시 (빠른 검증용)

  -- 유효 기간
  expires_at TIMESTAMPTZ NOT NULL,

  -- 폐기 정보
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,

  -- 토큰 로테이션
  replaced_by UUID REFERENCES public.refresh_tokens(id),

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT refresh_token_not_empty CHECK (length(refresh_token) > 0),
  CONSTRAINT refresh_token_hash_not_empty CHECK (length(token_hash) > 0)
);

-- 테이블 코멘트
COMMENT ON TABLE public.refresh_tokens IS 'MCP Orchestrator: Refresh Token 관리 (Access Token 갱신용)';
COMMENT ON COLUMN public.refresh_tokens.id IS 'Refresh Token 고유 ID';
COMMENT ON COLUMN public.refresh_tokens.service_token_id IS '연결된 Service Token ID (FK)';
COMMENT ON COLUMN public.refresh_tokens.refresh_token IS 'JWT Refresh Token (암호화 저장)';
COMMENT ON COLUMN public.refresh_tokens.token_hash IS 'SHA256 해시 - 빠른 토큰 검증용';
COMMENT ON COLUMN public.refresh_tokens.expires_at IS '만료 시간';
COMMENT ON COLUMN public.refresh_tokens.is_revoked IS '폐기 여부';
COMMENT ON COLUMN public.refresh_tokens.revoked_at IS '폐기 시간';
COMMENT ON COLUMN public.refresh_tokens.replaced_by IS '토큰 로테이션 시 새 토큰 ID';

-- =====================================================
-- 3. INDEXES - service_tokens
-- =====================================================

-- 토큰 해시로 빠른 검증 (UNIQUE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_tokens_token_hash_unique
  ON public.service_tokens(token_hash);

-- 서비스별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_service_tokens_service_name
  ON public.service_tokens(service_name);

-- 만료 시간 기반 정리 (expired & not revoked)
CREATE INDEX IF NOT EXISTS idx_service_tokens_expires_at
  ON public.service_tokens(expires_at)
  WHERE is_revoked = false;

-- 유효한 토큰만 조회 (is_revoked = false AND expires_at > now())
CREATE INDEX IF NOT EXISTS idx_service_tokens_valid
  ON public.service_tokens(service_name, expires_at)
  WHERE is_revoked = false;

-- 생성일 기반 정렬
CREATE INDEX IF NOT EXISTS idx_service_tokens_created_at
  ON public.service_tokens(created_at DESC);

-- =====================================================
-- 4. INDEXES - refresh_tokens
-- =====================================================

-- 토큰 해시로 빠른 검증 (UNIQUE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash_unique
  ON public.refresh_tokens(token_hash);

-- 서비스 토큰별 조회
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_service_token_id
  ON public.refresh_tokens(service_token_id);

-- 유효한 토큰만 조회 (is_revoked = false)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_valid
  ON public.refresh_tokens(service_token_id)
  WHERE is_revoked = false;

-- 만료 시간 기반 정리
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON public.refresh_tokens(expires_at)
  WHERE is_revoked = false;

-- =====================================================
-- 5. RLS POLICIES
-- service_role만 접근 가능
-- =====================================================

-- service_tokens RLS
ALTER TABLE public.service_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_tokens_service_role_all" ON public.service_tokens;

CREATE POLICY "service_tokens_service_role_all"
  ON public.service_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- refresh_tokens RLS
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refresh_tokens_service_role_all" ON public.refresh_tokens;

CREATE POLICY "refresh_tokens_service_role_all"
  ON public.refresh_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 6. UPDATED_AT TRIGGERS
-- =====================================================

-- update_updated_at_column 함수가 없으면 생성
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- service_tokens 트리거
DROP TRIGGER IF EXISTS update_service_tokens_updated_at ON public.service_tokens;
CREATE TRIGGER update_service_tokens_updated_at
  BEFORE UPDATE ON public.service_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- refresh_tokens 트리거
DROP TRIGGER IF EXISTS update_refresh_tokens_updated_at ON public.refresh_tokens;
CREATE TRIGGER update_refresh_tokens_updated_at
  BEFORE UPDATE ON public.refresh_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. CLEANUP FUNCTIONS
-- =====================================================

-- 만료 토큰 정리 함수
CREATE OR REPLACE FUNCTION public.cleanup_expired_service_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- 만료된 service_tokens 폐기 처리 (실제 삭제는 하지 않음)
  UPDATE public.service_tokens
  SET
    is_revoked = true,
    revoked_at = NOW()
  WHERE
    expires_at < NOW()
    AND is_revoked = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- 만료된 refresh_tokens 폐기 처리
  UPDATE public.refresh_tokens
  SET
    is_revoked = true,
    revoked_at = NOW()
  WHERE
    expires_at < NOW()
    AND is_revoked = false;

  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_service_tokens IS '만료된 서비스 토큰과 리프레시 토큰을 폐기 상태로 변경';

-- =====================================================
-- 완료
-- =====================================================
