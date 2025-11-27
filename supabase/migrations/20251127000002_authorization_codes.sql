-- OAuth 2.0 인가 코드 임시 저장 테이블
-- Authorization Code Grant Flow에서 사용

CREATE TABLE IF NOT EXISTS authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 인가 코드 (일회성, 10분 유효)
  code TEXT NOT NULL UNIQUE,

  -- 클라이언트 및 사용자 정보
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 요청된 스코프
  scopes TEXT[] NOT NULL DEFAULT '{}',

  -- PKCE (Proof Key for Code Exchange)
  code_challenge TEXT,
  code_challenge_method TEXT CHECK (code_challenge_method IN ('plain', 'S256')),

  -- 만료 및 사용 여부
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ, -- NULL이면 아직 사용 안 됨

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_authorization_codes_code ON authorization_codes(code);
CREATE INDEX IF NOT EXISTS idx_authorization_codes_expires_at ON authorization_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_authorization_codes_user_id ON authorization_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_authorization_codes_client_id ON authorization_codes(client_id);

-- RLS 활성화
ALTER TABLE authorization_codes ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 코드만 조회 가능
CREATE POLICY "Users can read own authorization codes"
  ON authorization_codes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS 정책: 시스템(서비스 역할)만 생성 가능
CREATE POLICY "Service role can insert authorization codes"
  ON authorization_codes
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS 정책: 시스템만 업데이트 (used_at 마킹)
CREATE POLICY "Service role can update authorization codes"
  ON authorization_codes
  FOR UPDATE
  TO service_role
  USING (true);

-- 만료된 코드 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_expired_authorization_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM authorization_codes
  WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 매 시간마다 만료 코드 청소 (pg_cron 필요)
-- SELECT cron.schedule('cleanup-expired-auth-codes', '0 * * * *', 'SELECT cleanup_expired_authorization_codes();');

-- 인가 코드 검증 함수
CREATE OR REPLACE FUNCTION validate_authorization_code(
  p_code TEXT,
  p_client_id TEXT,
  p_code_verifier TEXT DEFAULT NULL
)
RETURNS TABLE(
  valid BOOLEAN,
  user_id UUID,
  scopes TEXT[],
  error_message TEXT
) AS $$
DECLARE
  v_code_record RECORD;
  v_expected_challenge TEXT;
BEGIN
  -- 코드 조회
  SELECT * INTO v_code_record
  FROM authorization_codes
  WHERE code = p_code
  AND client_id = p_client_id;

  -- 코드가 없음
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT[], 'Invalid authorization code';
    RETURN;
  END IF;

  -- 이미 사용됨
  IF v_code_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT[], 'Authorization code already used';
    RETURN;
  END IF;

  -- 만료됨
  IF v_code_record.expires_at < now() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT[], 'Authorization code expired';
    RETURN;
  END IF;

  -- PKCE 검증 (설정되어 있는 경우)
  IF v_code_record.code_challenge IS NOT NULL THEN
    IF p_code_verifier IS NULL THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT[], 'Code verifier required';
      RETURN;
    END IF;

    IF v_code_record.code_challenge_method = 'S256' THEN
      v_expected_challenge := encode(digest(p_code_verifier, 'sha256'), 'base64');
      v_expected_challenge := rtrim(v_expected_challenge, '=');
      v_expected_challenge := replace(replace(v_expected_challenge, '+', '-'), '/', '_');
    ELSE
      v_expected_challenge := p_code_verifier;
    END IF;

    IF v_code_record.code_challenge != v_expected_challenge THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT[], 'Invalid code verifier';
      RETURN;
    END IF;
  END IF;

  -- 코드를 사용으로 마킹
  UPDATE authorization_codes
  SET used_at = now()
  WHERE code = p_code;

  -- 성공
  RETURN QUERY SELECT true, v_code_record.user_id, v_code_record.scopes, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 코멘트
COMMENT ON TABLE authorization_codes IS 'OAuth 2.0 인가 코드 임시 저장 (10분 유효)';
COMMENT ON COLUMN authorization_codes.code IS '일회성 인가 코드';
COMMENT ON COLUMN authorization_codes.code_challenge IS 'PKCE code_challenge (선택)';
COMMENT ON COLUMN authorization_codes.used_at IS '코드 사용 시각 (NULL=미사용)';
COMMENT ON FUNCTION validate_authorization_code IS '인가 코드 검증 및 사용 마킹';
