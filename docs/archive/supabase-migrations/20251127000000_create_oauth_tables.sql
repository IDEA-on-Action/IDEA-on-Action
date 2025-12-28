-- ============================================
-- OAuth 2.0 Server Tables
-- ============================================
-- Description: Minu 서비스 연동을 위한 OAuth 2.0 Authorization Server
-- Created: 2025-11-27
-- Standard: RFC 6749 (OAuth 2.0), RFC 7636 (PKCE)
-- ============================================

-- ============================================
-- 1. oauth_clients 테이블
-- ============================================
-- Description: OAuth 클라이언트 애플리케이션 정보
CREATE TABLE IF NOT EXISTS public.oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 클라이언트 식별자
  client_id TEXT NOT NULL UNIQUE,
  client_secret TEXT NOT NULL, -- bcrypt 해시
  client_name TEXT NOT NULL,

  -- 리다이렉트 URI 화이트리스트
  redirect_uris TEXT[] NOT NULL DEFAULT '{}', -- ARRAY of allowed redirect URIs

  -- 클라이언트 타입
  client_type TEXT NOT NULL DEFAULT 'confidential' CHECK (client_type IN ('confidential', 'public')),

  -- 허용된 스코프
  allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY['profile', 'subscription:read']::TEXT[],

  -- PKCE 필수 여부
  require_pkce BOOLEAN NOT NULL DEFAULT true,

  -- 클라이언트 상태
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.oauth_clients IS 'OAuth 2.0 클라이언트 애플리케이션 정보';
COMMENT ON COLUMN public.oauth_clients.client_id IS 'OAuth 클라이언트 ID (예: minu-find-prod)';
COMMENT ON COLUMN public.oauth_clients.client_secret IS 'bcrypt 해시된 클라이언트 시크릿';
COMMENT ON COLUMN public.oauth_clients.redirect_uris IS '허용된 리다이렉트 URI 목록';
COMMENT ON COLUMN public.oauth_clients.client_type IS 'confidential: 서버 사이드, public: SPA/모바일';
COMMENT ON COLUMN public.oauth_clients.require_pkce IS 'PKCE 필수 여부 (권장: true)';

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_clients_client_id
  ON public.oauth_clients(client_id);

CREATE INDEX IF NOT EXISTS idx_oauth_clients_is_active
  ON public.oauth_clients(is_active);

-- ============================================
-- 2. authorization_codes 테이블
-- ============================================
-- Description: OAuth Authorization Code 임시 저장 (10분 만료)
CREATE TABLE IF NOT EXISTS public.authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 코드 정보
  code TEXT NOT NULL UNIQUE, -- 랜덤 생성 코드
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 리다이렉트 URI (토큰 요청 시 검증용)
  redirect_uri TEXT NOT NULL,

  -- 스코프
  scope TEXT[] NOT NULL DEFAULT ARRAY['profile', 'subscription:read']::TEXT[],

  -- PKCE
  code_challenge TEXT, -- SHA256(code_verifier)
  code_challenge_method TEXT CHECK (code_challenge_method IN ('S256', 'plain')),

  -- 사용 여부
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,

  -- 만료 시간 (10분)
  expires_at TIMESTAMPTZ NOT NULL,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.authorization_codes IS 'OAuth Authorization Code 임시 저장 (10분 유효)';
COMMENT ON COLUMN public.authorization_codes.code IS '인증 코드 (1회용)';
COMMENT ON COLUMN public.authorization_codes.code_challenge IS 'PKCE code_challenge (SHA256 해시)';
COMMENT ON COLUMN public.authorization_codes.is_used IS '코드 사용 여부 (재사용 방지)';
COMMENT ON COLUMN public.authorization_codes.expires_at IS '만료 시간 (생성 후 10분)';

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_authorization_codes_code
  ON public.authorization_codes(code);

CREATE INDEX IF NOT EXISTS idx_authorization_codes_user_id
  ON public.authorization_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_authorization_codes_expires_at
  ON public.authorization_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_authorization_codes_client_user
  ON public.authorization_codes(client_id, user_id);

-- ============================================
-- 3. oauth_refresh_tokens 테이블
-- ============================================
-- Description: OAuth Refresh Token 저장 (30일 만료)
CREATE TABLE IF NOT EXISTS public.oauth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 토큰 정보
  token_hash TEXT NOT NULL UNIQUE, -- SHA256 해시
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 스코프
  scope TEXT[] NOT NULL DEFAULT ARRAY['profile', 'subscription:read']::TEXT[],

  -- 토큰 상태
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- 만료 시간 (30일)
  expires_at TIMESTAMPTZ NOT NULL,

  -- 마지막 사용 시간 (Token Rotation 추적)
  last_used_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.oauth_refresh_tokens IS 'OAuth Refresh Token 저장 (30일 유효)';
COMMENT ON COLUMN public.oauth_refresh_tokens.token_hash IS 'SHA256 해시된 토큰 값';
COMMENT ON COLUMN public.oauth_refresh_tokens.is_revoked IS '토큰 폐기 여부';
COMMENT ON COLUMN public.oauth_refresh_tokens.last_used_at IS '마지막 사용 시간 (Token Rotation)';

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_hash
  ON public.oauth_refresh_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_user_id
  ON public.oauth_refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_client_user
  ON public.oauth_refresh_tokens(client_id, user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_expires_at
  ON public.oauth_refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_is_revoked
  ON public.oauth_refresh_tokens(is_revoked);

-- ============================================
-- 4. oauth_audit_log 테이블
-- ============================================
-- Description: OAuth 요청 감사 로그
CREATE TABLE IF NOT EXISTS public.oauth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 요청 정보
  endpoint TEXT NOT NULL, -- /oauth/authorize, /oauth/token, /oauth/revoke
  method TEXT NOT NULL, -- GET, POST
  client_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 요청/응답
  request_params JSONB,
  response_status INTEGER NOT NULL,
  error_code TEXT,
  error_description TEXT,

  -- 클라이언트 정보
  ip_address TEXT,
  user_agent TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.oauth_audit_log IS 'OAuth 요청 감사 로그';
COMMENT ON COLUMN public.oauth_audit_log.endpoint IS 'OAuth 엔드포인트 경로';
COMMENT ON COLUMN public.oauth_audit_log.response_status IS 'HTTP 응답 코드';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_oauth_audit_log_client_id
  ON public.oauth_audit_log(client_id);

CREATE INDEX IF NOT EXISTS idx_oauth_audit_log_user_id
  ON public.oauth_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_audit_log_created_at
  ON public.oauth_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_oauth_audit_log_endpoint
  ON public.oauth_audit_log(endpoint);

-- ============================================
-- 5. RLS 정책 설정
-- ============================================

-- oauth_clients: 모든 사용자 읽기 가능 (클라이언트 정보 확인용)
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth_clients_public_select"
  ON public.oauth_clients FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- authorization_codes: 사용자 본인 코드만 조회 가능
ALTER TABLE public.authorization_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authorization_codes_user_select"
  ON public.authorization_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- oauth_refresh_tokens: 사용자 본인 토큰만 조회 가능
ALTER TABLE public.oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth_refresh_tokens_user_select"
  ON public.oauth_refresh_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- oauth_audit_log: 사용자 본인 로그만 조회 가능
ALTER TABLE public.oauth_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth_audit_log_user_select"
  ON public.oauth_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 6. 트리거 설정
-- ============================================

-- oauth_clients updated_at 자동 업데이트
CREATE TRIGGER update_oauth_clients_updated_at
  BEFORE UPDATE ON public.oauth_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 7. Helper Functions
-- ============================================

-- 만료된 코드 정리 함수 (Cron 호출용)
CREATE OR REPLACE FUNCTION public.cleanup_expired_authorization_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.authorization_codes
    WHERE expires_at < now() - INTERVAL '1 hour' -- 만료 후 1시간 경과
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_authorization_codes IS '만료된 Authorization Code 삭제 (Cron 호출용)';

-- 만료된 Refresh Token 정리 함수
CREATE OR REPLACE FUNCTION public.cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.oauth_refresh_tokens
    WHERE expires_at < now() - INTERVAL '7 days' -- 만료 후 7일 경과
       OR (is_revoked = true AND revoked_at < now() - INTERVAL '7 days')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_refresh_tokens IS '만료된 Refresh Token 삭제 (Cron 호출용)';

-- 클라이언트 검증 함수
CREATE OR REPLACE FUNCTION public.verify_oauth_client(
  p_client_id TEXT,
  p_redirect_uri TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  client_name TEXT,
  require_pkce BOOLEAN,
  allowed_scopes TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.is_active AS is_valid,
    c.client_name,
    c.require_pkce,
    c.allowed_scopes
  FROM public.oauth_clients c
  WHERE c.client_id = p_client_id
    AND c.is_active = true
    AND (p_redirect_uri IS NULL OR p_redirect_uri = ANY(c.redirect_uris));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.verify_oauth_client IS 'OAuth 클라이언트 검증 및 정보 조회';

-- ============================================
-- 8. 초기 데이터 삽입 (Minu 서비스 클라이언트)
-- ============================================

-- Minu Find 클라이언트
INSERT INTO public.oauth_clients (
  client_id,
  client_secret,
  client_name,
  redirect_uris,
  client_type,
  allowed_scopes,
  require_pkce,
  is_active,
  metadata
) VALUES (
  'minu-find-prod',
  '$2a$10$dummyHashForDevelopmentOnlyReplaceInProduction', -- 실제 배포 시 bcrypt 해시로 교체 필요
  'Minu Find (사업기회 탐색)',
  ARRAY['https://find.minu.best/auth/callback', 'http://localhost:3001/auth/callback']::TEXT[],
  'confidential',
  ARRAY['profile', 'subscription:read', 'subscription:write']::TEXT[],
  true,
  true,
  '{"service_type": "minu-find", "description": "시장조사 및 사업기회 분석 서비스"}'::JSONB
) ON CONFLICT (client_id) DO NOTHING;

-- Minu Frame 클라이언트
INSERT INTO public.oauth_clients (
  client_id,
  client_secret,
  client_name,
  redirect_uris,
  client_type,
  allowed_scopes,
  require_pkce,
  is_active,
  metadata
) VALUES (
  'minu-frame-prod',
  '$2a$10$dummyHashForDevelopmentOnlyReplaceInProduction',
  'Minu Frame (문제정의 & RFP)',
  ARRAY['https://frame.minu.best/auth/callback', 'http://localhost:3002/auth/callback']::TEXT[],
  'confidential',
  ARRAY['profile', 'subscription:read', 'subscription:write']::TEXT[],
  true,
  true,
  '{"service_type": "minu-frame", "description": "문제 정의 및 제안 요청서 작성 서비스"}'::JSONB
) ON CONFLICT (client_id) DO NOTHING;

-- Minu Build 클라이언트
INSERT INTO public.oauth_clients (
  client_id,
  client_secret,
  client_name,
  redirect_uris,
  client_type,
  allowed_scopes,
  require_pkce,
  is_active,
  metadata
) VALUES (
  'minu-build-prod',
  '$2a$10$dummyHashForDevelopmentOnlyReplaceInProduction',
  'Minu Build (프로젝트 진행)',
  ARRAY['https://build.minu.best/auth/callback', 'http://localhost:3003/auth/callback']::TEXT[],
  'confidential',
  ARRAY['profile', 'subscription:read', 'subscription:write']::TEXT[],
  true,
  true,
  '{"service_type": "minu-build", "description": "프로젝트 실행 및 관리 서비스"}'::JSONB
) ON CONFLICT (client_id) DO NOTHING;

-- Minu Keep 클라이언트
INSERT INTO public.oauth_clients (
  client_id,
  client_secret,
  client_name,
  redirect_uris,
  client_type,
  allowed_scopes,
  require_pkce,
  is_active,
  metadata
) VALUES (
  'minu-keep-prod',
  '$2a$10$dummyHashForDevelopmentOnlyReplaceInProduction',
  'Minu Keep (운영 & 유지보수)',
  ARRAY['https://keep.minu.best/auth/callback', 'http://localhost:3004/auth/callback']::TEXT[],
  'confidential',
  ARRAY['profile', 'subscription:read', 'subscription:write']::TEXT[],
  true,
  true,
  '{"service_type": "minu-keep", "description": "서비스 운영 및 유지보수 서비스"}'::JSONB
) ON CONFLICT (client_id) DO NOTHING;

-- ============================================
-- 9. 검증 쿼리
-- ============================================

DO $$
DECLARE
  clients_count INTEGER;
  indexes_count INTEGER;
  policies_count INTEGER;
BEGIN
  -- 테이블 확인
  SELECT COUNT(*) INTO clients_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('oauth_clients', 'authorization_codes', 'oauth_refresh_tokens', 'oauth_audit_log');

  -- 인덱스 확인
  SELECT COUNT(*) INTO indexes_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('oauth_clients', 'authorization_codes', 'oauth_refresh_tokens', 'oauth_audit_log');

  -- RLS 정책 확인
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('oauth_clients', 'authorization_codes', 'oauth_refresh_tokens', 'oauth_audit_log');

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ OAuth 2.0 Server Tables 생성 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '테이블 개수: % (예상: 4개)', clients_count;
  RAISE NOTICE '인덱스 개수: % (예상: 20+개)', indexes_count;
  RAISE NOTICE 'RLS 정책 개수: % (예상: 5개)', policies_count;
  RAISE NOTICE '';
  RAISE NOTICE '테이블 목록:';
  RAISE NOTICE '  - oauth_clients (OAuth 클라이언트 정보)';
  RAISE NOTICE '  - authorization_codes (인증 코드, 10분 만료)';
  RAISE NOTICE '  - oauth_refresh_tokens (Refresh Token, 30일 만료)';
  RAISE NOTICE '  - oauth_audit_log (감사 로그)';
  RAISE NOTICE '';
  RAISE NOTICE '초기 클라이언트:';
  RAISE NOTICE '  - minu-find-prod';
  RAISE NOTICE '  - minu-frame-prod';
  RAISE NOTICE '  - minu-build-prod';
  RAISE NOTICE '  - minu-keep-prod';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
