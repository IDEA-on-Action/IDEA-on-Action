-- ============================================================================
-- User Sessions 테이블
-- ============================================================================
-- 목적: 사용자의 활성 세션을 관리하고 동시 로그인을 제한합니다
-- 생성일: 2025-12-01
-- 버전: 1.0.0

-- 테이블 생성
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_id UUID REFERENCES oauth_refresh_tokens(id) ON DELETE SET NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token_id ON user_sessions(refresh_token_id);
CREATE INDEX idx_user_sessions_last_active_at ON user_sessions(last_active_at);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 업데이트 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_user_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 업데이트 트리거 생성
CREATE TRIGGER trigger_update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_sessions_updated_at();

-- RLS (Row Level Security) 활성화
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 세션만 조회 가능
CREATE POLICY "Users can view their own sessions"
  ON user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 세션만 삭제 가능
CREATE POLICY "Users can delete their own sessions"
  ON user_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS 정책: 서비스 역할은 모든 작업 가능
CREATE POLICY "Service role can manage all sessions"
  ON user_sessions
  USING (auth.role() = 'service_role');

-- 자동 만료 세션 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 주석 추가
COMMENT ON TABLE user_sessions IS '사용자 세션 관리 테이블';
COMMENT ON COLUMN user_sessions.id IS '세션 고유 ID';
COMMENT ON COLUMN user_sessions.user_id IS '사용자 ID';
COMMENT ON COLUMN user_sessions.refresh_token_id IS 'Refresh Token ID (oauth_refresh_tokens 참조)';
COMMENT ON COLUMN user_sessions.device_info IS '기기 정보 (브라우저, OS 등)';
COMMENT ON COLUMN user_sessions.ip_address IS 'IP 주소';
COMMENT ON COLUMN user_sessions.user_agent IS 'User-Agent 헤더';
COMMENT ON COLUMN user_sessions.last_active_at IS '마지막 활동 시간';
COMMENT ON COLUMN user_sessions.expires_at IS '세션 만료 시간';
COMMENT ON COLUMN user_sessions.created_at IS '생성 시간';
COMMENT ON COLUMN user_sessions.updated_at IS '수정 시간';
