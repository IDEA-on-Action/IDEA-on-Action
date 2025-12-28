-- ============================================================================
-- User Sessions Table
-- 다중 기기 세션 관리 및 보안 강화
-- Created: 2025-12-09
-- ============================================================================

-- user_sessions 테이블 생성
CREATE TABLE IF NOT EXISTS user_sessions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Token Reference (Supabase Auth Refresh Token ID)
  refresh_token_id UUID,

  -- Device Information
  device_info JSONB,
  -- 예시: {"type": "mobile", "os": "iOS 17.0", "browser": "Safari", "app_version": "2.36.0"}

  -- Network Information
  ip_address INET,
  user_agent TEXT,

  -- Session Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT user_sessions_refresh_token_id_unique UNIQUE (refresh_token_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- 사용자별 세션 조회 (가장 빈번한 쿼리)
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);

-- 활성 세션 조회
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active) WHERE is_active = true;

-- 만료 세션 정리 (배치 작업용)
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 마지막 활동 시간 정렬
CREATE INDEX idx_user_sessions_last_active_at ON user_sessions(last_active_at DESC);

-- 리프레시 토큰 조회 (토큰 갱신 시)
CREATE INDEX idx_user_sessions_refresh_token_id ON user_sessions(refresh_token_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 세션만 조회 가능
CREATE POLICY "Users can view their own sessions"
  ON user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 세션만 업데이트 가능
CREATE POLICY "Users can update their own sessions"
  ON user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자는 자신의 세션만 삭제 가능 (로그아웃)
CREATE POLICY "Users can delete their own sessions"
  ON user_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- 서비스 역할은 모든 작업 가능 (시스템 관리용)
CREATE POLICY "Service role has full access"
  ON user_sessions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Triggers
-- ============================================================================

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_user_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_sessions_updated_at();

-- ============================================================================
-- Functions
-- ============================================================================

-- 만료된 세션 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW()
  OR (is_active = false AND updated_at < NOW() - INTERVAL '30 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자의 활성 세션 수 조회
CREATE OR REPLACE FUNCTION get_active_session_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  session_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO session_count
  FROM user_sessions
  WHERE user_id = target_user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN session_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 세션 활동 업데이트
CREATE OR REPLACE FUNCTION update_session_activity(session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_sessions
  SET last_active_at = NOW()
  WHERE id = session_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 모든 다른 세션 무효화 (단일 세션 모드)
CREATE OR REPLACE FUNCTION revoke_other_sessions(
  target_user_id UUID,
  current_session_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET is_active = false,
      updated_at = NOW()
  WHERE user_id = target_user_id
    AND id != current_session_id
    AND is_active = true;

  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  RETURN revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE user_sessions IS '사용자 세션 관리 테이블 - 다중 기기 로그인 추적 및 보안 강화';
COMMENT ON COLUMN user_sessions.id IS '세션 고유 ID';
COMMENT ON COLUMN user_sessions.user_id IS '사용자 ID (auth.users 참조)';
COMMENT ON COLUMN user_sessions.refresh_token_id IS 'Supabase Auth 리프레시 토큰 ID';
COMMENT ON COLUMN user_sessions.device_info IS '기기 정보 (JSON): 타입, OS, 브라우저 등';
COMMENT ON COLUMN user_sessions.ip_address IS '접속 IP 주소';
COMMENT ON COLUMN user_sessions.user_agent IS 'User Agent 문자열';
COMMENT ON COLUMN user_sessions.is_active IS '세션 활성 여부';
COMMENT ON COLUMN user_sessions.last_active_at IS '마지막 활동 시간';
COMMENT ON COLUMN user_sessions.expires_at IS '세션 만료 시간';
COMMENT ON COLUMN user_sessions.created_at IS '세션 생성 시간';
COMMENT ON COLUMN user_sessions.updated_at IS '세션 수정 시간';

-- ============================================================================
-- Grants
-- ============================================================================

-- authenticated 사용자에게 기본 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO authenticated;

-- service_role에게 모든 권한 부여
GRANT ALL ON user_sessions TO service_role;
