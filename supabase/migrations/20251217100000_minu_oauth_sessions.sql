-- Minu OAuth 세션 및 구독 테이블
-- v2.39.0: Minu Find Edge Functions 연동

-- ============================================================================
-- minu_oauth_sessions: OAuth 세션 상태 저장
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.minu_oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('find', 'frame', 'build', 'keep')),
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  used_at TIMESTAMPTZ,

  CONSTRAINT minu_oauth_sessions_state_length CHECK (length(state) >= 32)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_minu_oauth_sessions_state ON public.minu_oauth_sessions(state);
CREATE INDEX IF NOT EXISTS idx_minu_oauth_sessions_user_id ON public.minu_oauth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_minu_oauth_sessions_expires_at ON public.minu_oauth_sessions(expires_at);

-- 만료된 세션 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_expired_minu_oauth_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.minu_oauth_sessions
  WHERE expires_at < now() OR used_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS 정책
ALTER TABLE public.minu_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 세션만 조회 가능
CREATE POLICY "minu_oauth_sessions_select_own" ON public.minu_oauth_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- service_role은 모든 작업 가능
CREATE POLICY "minu_oauth_sessions_service_role" ON public.minu_oauth_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- minu_subscriptions: 구독 정보 캐시
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.minu_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('find', 'frame', 'build', 'keep')),

  -- 구독 정보
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),

  -- 기간 정보
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- 기능 및 제한
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',

  -- 메타데이터
  minu_subscription_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT minu_subscriptions_unique_user_service UNIQUE (user_id, service)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_minu_subscriptions_user_id ON public.minu_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_minu_subscriptions_service ON public.minu_subscriptions(service);
CREATE INDEX IF NOT EXISTS idx_minu_subscriptions_status ON public.minu_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_minu_subscriptions_minu_subscription_id ON public.minu_subscriptions(minu_subscription_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_minu_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_minu_subscriptions_updated_at
  BEFORE UPDATE ON public.minu_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_minu_subscriptions_updated_at();

-- RLS 정책
ALTER TABLE public.minu_subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 구독만 조회 가능
CREATE POLICY "minu_subscriptions_select_own" ON public.minu_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- service_role은 모든 작업 가능
CREATE POLICY "minu_subscriptions_service_role" ON public.minu_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- minu_tokens: Minu 서비스 토큰 저장
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.minu_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('find', 'frame', 'build', 'keep')),

  -- 토큰 정보 (해시 저장)
  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT,

  -- 만료 정보
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,

  -- 메타데이터
  scope TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,

  CONSTRAINT minu_tokens_unique_user_service UNIQUE (user_id, service)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_minu_tokens_user_id ON public.minu_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_minu_tokens_service ON public.minu_tokens(service);
CREATE INDEX IF NOT EXISTS idx_minu_tokens_access_token_hash ON public.minu_tokens(access_token_hash);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER trigger_minu_tokens_updated_at
  BEFORE UPDATE ON public.minu_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_minu_subscriptions_updated_at();

-- RLS 정책
ALTER TABLE public.minu_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 토큰만 조회 가능
CREATE POLICY "minu_tokens_select_own" ON public.minu_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- service_role은 모든 작업 가능
CREATE POLICY "minu_tokens_service_role" ON public.minu_tokens
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 헬퍼 함수
-- ============================================================================

-- 구독 정보 조회 함수
CREATE OR REPLACE FUNCTION get_minu_subscription(
  p_user_id UUID,
  p_service TEXT
)
RETURNS TABLE (
  plan_id TEXT,
  plan_name TEXT,
  status TEXT,
  features JSONB,
  limits JSONB,
  current_period_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.plan_id,
    ms.plan_name,
    ms.status,
    ms.features,
    ms.limits,
    ms.current_period_end
  FROM public.minu_subscriptions ms
  WHERE ms.user_id = p_user_id
    AND ms.service = p_service
    AND ms.status IN ('active', 'trialing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 구독 정보 upsert 함수
CREATE OR REPLACE FUNCTION upsert_minu_subscription(
  p_user_id UUID,
  p_service TEXT,
  p_plan_id TEXT,
  p_plan_name TEXT,
  p_status TEXT,
  p_features JSONB DEFAULT '{}',
  p_limits JSONB DEFAULT '{}',
  p_current_period_start TIMESTAMPTZ DEFAULT NULL,
  p_current_period_end TIMESTAMPTZ DEFAULT NULL,
  p_minu_subscription_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.minu_subscriptions (
    user_id, service, plan_id, plan_name, status, features, limits,
    current_period_start, current_period_end, minu_subscription_id, synced_at
  ) VALUES (
    p_user_id, p_service, p_plan_id, p_plan_name, p_status, p_features, p_limits,
    p_current_period_start, p_current_period_end, p_minu_subscription_id, now()
  )
  ON CONFLICT (user_id, service) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    plan_name = EXCLUDED.plan_name,
    status = EXCLUDED.status,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    minu_subscription_id = EXCLUDED.minu_subscription_id,
    synced_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 코멘트 추가
COMMENT ON TABLE public.minu_oauth_sessions IS 'Minu OAuth 인증 세션 상태 저장';
COMMENT ON TABLE public.minu_subscriptions IS 'Minu 서비스 구독 정보 캐시';
COMMENT ON TABLE public.minu_tokens IS 'Minu 서비스 토큰 저장';
COMMENT ON FUNCTION get_minu_subscription IS 'Minu 구독 정보 조회';
COMMENT ON FUNCTION upsert_minu_subscription IS 'Minu 구독 정보 저장/업데이트';
