-- Sandbox 환경 격리 마이그레이션
-- 생성일: 2025-12-01
-- 목적: Minu 서비스 테스트용 독립 환경 구축

-- ============================================================================
-- 1. Sandbox 설정 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sandbox_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'staging', 'production')),
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 환경별로 설정 키는 유일해야 함
  CONSTRAINT unique_sandbox_config_key UNIQUE (environment, config_key)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sandbox_configs_environment
  ON public.sandbox_configs(environment);
CREATE INDEX IF NOT EXISTS idx_sandbox_configs_key
  ON public.sandbox_configs(config_key);
CREATE INDEX IF NOT EXISTS idx_sandbox_configs_active
  ON public.sandbox_configs(is_active) WHERE is_active = true;

-- 업데이트 타임스탬프 트리거
CREATE OR REPLACE FUNCTION update_sandbox_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sandbox_configs_timestamp
  BEFORE UPDATE ON public.sandbox_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_sandbox_configs_timestamp();

-- ============================================================================
-- 2. Sandbox 테스트 데이터 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sandbox_test_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'staging')),
  data_type TEXT NOT NULL, -- 'user', 'service', 'oauth_client', 'transaction' 등
  entity_id UUID NOT NULL,
  test_data JSONB NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  expires_at TIMESTAMPTZ, -- 자동 삭제를 위한 만료 시간
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::JSONB
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sandbox_test_data_environment
  ON public.sandbox_test_data(environment);
CREATE INDEX IF NOT EXISTS idx_sandbox_test_data_type
  ON public.sandbox_test_data(data_type);
CREATE INDEX IF NOT EXISTS idx_sandbox_test_data_entity
  ON public.sandbox_test_data(entity_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_test_data_expires
  ON public.sandbox_test_data(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sandbox_test_data_tags
  ON public.sandbox_test_data USING GIN(tags);

-- 업데이트 타임스탬프 트리거
CREATE TRIGGER update_sandbox_test_data_timestamp
  BEFORE UPDATE ON public.sandbox_test_data
  FOR EACH ROW
  EXECUTE FUNCTION update_sandbox_configs_timestamp();

-- ============================================================================
-- 3. Sandbox OAuth 클라이언트 등록 (oauth_clients 테이블이 있을 때만 실행)
-- ============================================================================

DO $$
BEGIN
  -- oauth_clients 테이블 존재 여부 확인
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'oauth_clients'
  ) THEN
    -- Minu Find - Sandbox
    INSERT INTO public.oauth_clients (
      client_id, client_secret, client_name, redirect_uris,
      client_type, allowed_scopes, require_pkce, is_active, metadata
    ) VALUES (
      'minu-find-sandbox',
      'sandbox_secret_find_' || gen_random_uuid()::text,
      'Minu Find (Sandbox)',
      ARRAY['http://localhost:3001/auth/callback/sandbox', 'http://127.0.0.1:3001/auth/callback/sandbox']::TEXT[],
      'confidential',
      ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
      true, true,
      jsonb_build_object('environment', 'sandbox', 'service', 'find', 'description', 'Minu Find Sandbox 테스트 환경')
    ) ON CONFLICT (client_id) DO NOTHING;

    -- Minu Frame - Sandbox
    INSERT INTO public.oauth_clients (
      client_id, client_secret, client_name, redirect_uris,
      client_type, allowed_scopes, require_pkce, is_active, metadata
    ) VALUES (
      'minu-frame-sandbox',
      'sandbox_secret_frame_' || gen_random_uuid()::text,
      'Minu Frame (Sandbox)',
      ARRAY['http://localhost:3002/auth/callback/sandbox', 'http://127.0.0.1:3002/auth/callback/sandbox']::TEXT[],
      'confidential',
      ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
      true, true,
      jsonb_build_object('environment', 'sandbox', 'service', 'frame', 'description', 'Minu Frame Sandbox 테스트 환경')
    ) ON CONFLICT (client_id) DO NOTHING;

    -- Minu Build - Sandbox
    INSERT INTO public.oauth_clients (
      client_id, client_secret, client_name, redirect_uris,
      client_type, allowed_scopes, require_pkce, is_active, metadata
    ) VALUES (
      'minu-build-sandbox',
      'sandbox_secret_build_' || gen_random_uuid()::text,
      'Minu Build (Sandbox)',
      ARRAY['http://localhost:3003/auth/callback/sandbox', 'http://127.0.0.1:3003/auth/callback/sandbox']::TEXT[],
      'confidential',
      ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
      true, true,
      jsonb_build_object('environment', 'sandbox', 'service', 'build', 'description', 'Minu Build Sandbox 테스트 환경')
    ) ON CONFLICT (client_id) DO NOTHING;

    -- Minu Keep - Sandbox
    INSERT INTO public.oauth_clients (
      client_id, client_secret, client_name, redirect_uris,
      client_type, allowed_scopes, require_pkce, is_active, metadata
    ) VALUES (
      'minu-keep-sandbox',
      'sandbox_secret_keep_' || gen_random_uuid()::text,
      'Minu Keep (Sandbox)',
      ARRAY['http://localhost:3004/auth/callback/sandbox', 'http://127.0.0.1:3004/auth/callback/sandbox']::TEXT[],
      'confidential',
      ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
      true, true,
      jsonb_build_object('environment', 'sandbox', 'service', 'keep', 'description', 'Minu Keep Sandbox 테스트 환경')
    ) ON CONFLICT (client_id) DO NOTHING;

    RAISE NOTICE 'Sandbox OAuth 클라이언트 등록 완료';
  ELSE
    RAISE NOTICE 'oauth_clients 테이블이 없습니다. OAuth 클라이언트 등록을 건너뜁니다.';
  END IF;
END $$;

-- ============================================================================
-- 4. Sandbox 기본 설정 추가
-- ============================================================================

INSERT INTO public.sandbox_configs (environment, config_key, config_value, description) VALUES
('sandbox', 'rate_limit', '{"requests": 1000, "window": 60}'::JSONB, 'Sandbox API 속도 제한 (1000 req/min)'),
('sandbox', 'session_timeout', '{"timeout_seconds": 3600}'::JSONB, 'Sandbox 세션 타임아웃 (1시간)'),
('sandbox', 'cache_ttl', '{"ttl_seconds": 60}'::JSONB, 'Sandbox 캐시 TTL (1분)'),
('sandbox', 'mock_payments', '{"enabled": true, "auto_approve": true}'::JSONB, 'Mock 결제 설정'),
('sandbox', 'data_isolation', '{"enabled": true, "auto_cleanup": true, "retention_days": 7}'::JSONB, '데이터 격리 및 자동 정리 설정'),
('sandbox', 'logging', '{"level": "debug", "sql": true, "api_calls": true}'::JSONB, '상세 로깅 설정'),
('sandbox', 'webhooks', '{"enabled": false}'::JSONB, 'Webhook 비활성화'),
('sandbox', 'cors', '{"mode": "permissive", "allowed_origins": ["http://localhost:*", "http://127.0.0.1:*"]}'::JSONB, 'CORS 관대한 설정')
ON CONFLICT (environment, config_key) DO NOTHING;

-- ============================================================================
-- 5. RLS (Row Level Security) 정책
-- ============================================================================

-- Sandbox 설정 테이블 RLS 활성화
ALTER TABLE public.sandbox_configs ENABLE ROW LEVEL SECURITY;

-- 관리자만 모든 설정 읽기 가능
CREATE POLICY "Admins can view all sandbox configs"
  ON public.sandbox_configs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- 관리자만 설정 수정 가능
CREATE POLICY "Admins can modify sandbox configs"
  ON public.sandbox_configs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Sandbox 테스트 데이터 RLS 활성화
ALTER TABLE public.sandbox_test_data ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 자신의 테스트 데이터만 읽기 가능
CREATE POLICY "Users can view their own sandbox test data"
  ON public.sandbox_test_data
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- 인증된 사용자는 자신의 테스트 데이터만 생성/수정/삭제 가능
CREATE POLICY "Users can manage their own sandbox test data"
  ON public.sandbox_test_data
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid());

-- 관리자는 모든 테스트 데이터 접근 가능
CREATE POLICY "Admins can view all sandbox test data"
  ON public.sandbox_test_data
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. 헬퍼 함수: Sandbox 설정 조회
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sandbox_config(
  p_environment TEXT DEFAULT 'sandbox',
  p_config_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_config_key IS NULL THEN
    -- 모든 활성 설정 반환
    SELECT jsonb_object_agg(config_key, config_value)
    INTO v_result
    FROM public.sandbox_configs
    WHERE environment = p_environment
      AND is_active = true;
  ELSE
    -- 특정 설정 반환
    SELECT config_value
    INTO v_result
    FROM public.sandbox_configs
    WHERE environment = p_environment
      AND config_key = p_config_key
      AND is_active = true;
  END IF;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. 자동 정리 함수: 만료된 테스트 데이터 삭제
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sandbox_data()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.sandbox_test_data
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. 코멘트 추가
-- ============================================================================

COMMENT ON TABLE public.sandbox_configs IS 'Sandbox 환경별 설정 저장';
COMMENT ON TABLE public.sandbox_test_data IS 'Sandbox 테스트 데이터 격리 저장';
COMMENT ON FUNCTION get_sandbox_config IS 'Sandbox 설정 조회 헬퍼 함수';
COMMENT ON FUNCTION cleanup_expired_sandbox_data IS '만료된 Sandbox 테스트 데이터 자동 삭제';
