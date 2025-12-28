-- =====================================================
-- MCP AUTH: service_tokens 스키마 업데이트
--
-- mcp-auth Edge Function과 호환되도록 스키마 수정
-- - service_name → service_id로 변경
-- - client_id 컬럼 추가
-- - token_type 컬럼 추가 (access/refresh 통합)
-- - scope 컬럼 추가 (permissions 대체)
-- - Refresh Token Rotation 지원 (used, used_at)
-- - 보안 감사 (ip_address, user_agent)
-- - revoked_reason 컬럼 추가
--
-- 관련 문서: supabase/functions/mcp-auth/index.ts
-- 버전: 2.0.0
-- 작성일: 2025-11-29
-- =====================================================

-- =====================================================
-- 1. 기존 테이블 백업 (필요시)
-- =====================================================

-- refresh_tokens 테이블 삭제 (service_tokens로 통합)
DROP TABLE IF EXISTS public.refresh_tokens CASCADE;

-- =====================================================
-- 2. service_tokens 스키마 업데이트
-- =====================================================

-- 기존 인덱스 삭제
DROP INDEX IF EXISTS idx_service_tokens_token_hash_unique;
DROP INDEX IF EXISTS idx_service_tokens_service_name;
DROP INDEX IF EXISTS idx_service_tokens_expires_at;
DROP INDEX IF EXISTS idx_service_tokens_valid;
DROP INDEX IF EXISTS idx_service_tokens_created_at;

-- RLS 정책 임시 삭제
DROP POLICY IF EXISTS "service_tokens_service_role_all" ON public.service_tokens;

-- 기존 테이블 삭제 후 재생성 (스키마 변경이 크므로)
DROP TABLE IF EXISTS public.service_tokens CASCADE;

CREATE TABLE public.service_tokens (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 서비스 정보
  service_id TEXT NOT NULL,
  client_id TEXT NOT NULL,

  -- 토큰 정보
  token_hash TEXT NOT NULL,            -- SHA256 해시 (보안상 실제 토큰은 저장하지 않음)
  token_type TEXT NOT NULL,            -- 'access' 또는 'refresh'

  -- 권한 정보
  scope TEXT[] NOT NULL DEFAULT '{}',  -- 권한 배열 (예: ['events:read', 'health:write'])

  -- 유효 기간
  expires_at TIMESTAMPTZ NOT NULL,

  -- 상태
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- Refresh Token Rotation (보안 강화)
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,

  -- 보안 감사
  ip_address TEXT,
  user_agent TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT valid_service_id CHECK (
    service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep', 'central-hub')
  ),
  CONSTRAINT valid_token_type CHECK (
    token_type IN ('access', 'refresh')
  ),
  CONSTRAINT valid_expires_at CHECK (expires_at > created_at),
  CONSTRAINT token_hash_not_empty CHECK (length(token_hash) > 0),
  CONSTRAINT client_id_not_empty CHECK (length(client_id) > 0)
);

-- 테이블 코멘트
COMMENT ON TABLE public.service_tokens IS 'MCP Auth: 서비스 간 인증 토큰 관리 (Access + Refresh 통합)';
COMMENT ON COLUMN public.service_tokens.id IS '토큰 고유 ID';
COMMENT ON COLUMN public.service_tokens.service_id IS '서비스 ID (minu-find, minu-frame, minu-build, minu-keep, central-hub)';
COMMENT ON COLUMN public.service_tokens.client_id IS '클라이언트 ID (서비스 인스턴스 식별자)';
COMMENT ON COLUMN public.service_tokens.token_hash IS 'SHA256 해시 - 보안상 실제 토큰은 저장하지 않음';
COMMENT ON COLUMN public.service_tokens.token_type IS '토큰 타입 (access: Access Token, refresh: Refresh Token)';
COMMENT ON COLUMN public.service_tokens.scope IS '권한 배열 (예: events:read, health:write)';
COMMENT ON COLUMN public.service_tokens.expires_at IS '토큰 만료 시간';
COMMENT ON COLUMN public.service_tokens.is_revoked IS '폐기 여부';
COMMENT ON COLUMN public.service_tokens.revoked_at IS '폐기 시간';
COMMENT ON COLUMN public.service_tokens.revoked_reason IS '폐기 사유 (user_request, refresh_token_reuse, security_violation 등)';
COMMENT ON COLUMN public.service_tokens.used IS 'Refresh Token 사용 여부 (Token Rotation)';
COMMENT ON COLUMN public.service_tokens.used_at IS 'Refresh Token 사용 시간';
COMMENT ON COLUMN public.service_tokens.ip_address IS '토큰 발급/사용 IP 주소';
COMMENT ON COLUMN public.service_tokens.user_agent IS '토큰 발급/사용 User-Agent';

-- =====================================================
-- 3. INDEXES
-- =====================================================

-- 토큰 해시로 빠른 검증 (UNIQUE)
CREATE UNIQUE INDEX idx_service_tokens_token_hash_unique
  ON public.service_tokens(token_hash);

-- 서비스별 조회 최적화
CREATE INDEX idx_service_tokens_service_id
  ON public.service_tokens(service_id);

-- 서비스 + 클라이언트별 조회
CREATE INDEX idx_service_tokens_service_client
  ON public.service_tokens(service_id, client_id);

-- 토큰 타입별 조회
CREATE INDEX idx_service_tokens_token_type
  ON public.service_tokens(token_type);

-- 유효한 토큰만 조회 (is_revoked = false AND expires_at > now())
CREATE INDEX idx_service_tokens_valid
  ON public.service_tokens(service_id, token_type, expires_at)
  WHERE is_revoked = false;

-- 만료 시간 기반 정리 (expired & not revoked)
CREATE INDEX idx_service_tokens_expires_at
  ON public.service_tokens(expires_at)
  WHERE is_revoked = false;

-- Refresh Token Rotation 감지 (used = true인 refresh token)
CREATE INDEX idx_service_tokens_used_refresh
  ON public.service_tokens(service_id, used_at)
  WHERE token_type = 'refresh' AND used = true;

-- 생성일 기반 정렬
CREATE INDEX idx_service_tokens_created_at
  ON public.service_tokens(created_at DESC);

-- =====================================================
-- 4. RLS POLICIES
-- service_role만 접근 가능
-- =====================================================

ALTER TABLE public.service_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_tokens_service_role_all"
  ON public.service_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 5. UPDATED_AT TRIGGER
-- =====================================================

-- update_updated_at_column 함수는 이미 존재
CREATE TRIGGER update_service_tokens_updated_at
  BEFORE UPDATE ON public.service_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. CLEANUP FUNCTION 업데이트
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
    revoked_at = NOW(),
    revoked_reason = 'expired'
  WHERE
    expires_at < NOW()
    AND is_revoked = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_service_tokens IS '만료된 서비스 토큰을 폐기 상태로 변경';

-- =====================================================
-- 완료
-- =====================================================
