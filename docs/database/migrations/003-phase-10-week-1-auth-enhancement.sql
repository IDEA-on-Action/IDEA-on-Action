-- ===================================================================
-- Migration 003: Phase 10 Week 1 - Auth Enhancement
-- 작성일: 2025-10-19
-- 목적: OAuth 확장 및 프로필 관리 기능 추가
-- Phase: 10 Week 1 (SSO & 인증 강화)
-- ===================================================================

-- ⚠️ 주의: 이 마이그레이션을 실행하기 전에 반드시 백업하세요!
-- Supabase Dashboard → Database → Backups

-- ===================================================================
-- PART 1: user_profiles 테이블 확장
-- ===================================================================

-- 1.1. 프로필 관련 컬럼 추가
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS location jsonb DEFAULT '{}'::jsonb, -- {country, city, timezone}
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb, -- 사용자 설정 (테마, 언어, 알림)
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_ip inet,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 1.2. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_verified ON user_profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated ON user_profiles(updated_at DESC);

-- 1.3. 자동 updated_at 트리거
DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 1.4. 코멘트
COMMENT ON TABLE user_profiles IS '사용자 프로필 정보';
COMMENT ON COLUMN user_profiles.avatar_url IS '프로필 이미지 URL';
COMMENT ON COLUMN user_profiles.display_name IS '표시 이름 (닉네임)';
COMMENT ON COLUMN user_profiles.bio IS '자기소개';
COMMENT ON COLUMN user_profiles.phone IS '전화번호';
COMMENT ON COLUMN user_profiles.location IS '위치 정보 (JSON: country, city, timezone)';
COMMENT ON COLUMN user_profiles.preferences IS '사용자 설정 (JSON: theme, language, notifications)';
COMMENT ON COLUMN user_profiles.email_verified IS '이메일 인증 여부';
COMMENT ON COLUMN user_profiles.phone_verified IS '전화번호 인증 여부';
COMMENT ON COLUMN user_profiles.last_login_at IS '마지막 로그인 시각';
COMMENT ON COLUMN user_profiles.last_login_ip IS '마지막 로그인 IP';

-- ===================================================================
-- PART 2: connected_accounts 테이블 생성 (OAuth 계정 연결)
-- ===================================================================

DROP TABLE IF EXISTS connected_accounts CASCADE;

CREATE TABLE connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- OAuth 제공자 정보
  provider text NOT NULL CHECK (provider IN ('google', 'github', 'kakao', 'microsoft', 'apple', 'linkedin')),
  provider_account_id text NOT NULL, -- OAuth 제공자의 사용자 ID
  provider_account_email text, -- OAuth 계정 이메일

  -- 메타데이터
  access_token text, -- 암호화 저장 권장
  refresh_token text, -- 암호화 저장 권장
  expires_at timestamptz,
  scope text, -- OAuth 권한 범위
  token_type text DEFAULT 'Bearer',

  -- 연결 정보
  is_primary boolean DEFAULT false, -- 주 계정 여부
  connected_at timestamptz DEFAULT now(),
  last_used_at timestamptz,

  -- 제약 조건: 사용자당 제공자별 하나의 계정만
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider),
  -- 제약 조건: 제공자별 계정 ID는 유니크
  CONSTRAINT unique_provider_account UNIQUE(provider, provider_account_id)
);

-- 인덱스
CREATE INDEX idx_connected_accounts_user ON connected_accounts(user_id);
CREATE INDEX idx_connected_accounts_provider ON connected_accounts(provider);
CREATE INDEX idx_connected_accounts_primary ON connected_accounts(user_id, is_primary) WHERE is_primary = true;

-- 코멘트
COMMENT ON TABLE connected_accounts IS '사용자 연결 계정 (OAuth)';
COMMENT ON COLUMN connected_accounts.provider IS 'OAuth 제공자 (google, github, kakao, microsoft, apple)';
COMMENT ON COLUMN connected_accounts.provider_account_id IS 'OAuth 제공자의 사용자 ID';
COMMENT ON COLUMN connected_accounts.is_primary IS '주 계정 여부 (로그인 시 사용)';

-- ===================================================================
-- PART 3: email_verifications 테이블 생성
-- ===================================================================

DROP TABLE IF EXISTS email_verifications CASCADE;

CREATE TABLE email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_token ON email_verifications(token);
CREATE INDEX idx_email_verifications_expires ON email_verifications(expires_at) WHERE verified_at IS NULL;

-- 코멘트
COMMENT ON TABLE email_verifications IS '이메일 인증 토큰';
COMMENT ON COLUMN email_verifications.token IS '인증 토큰 (UUID v4)';
COMMENT ON COLUMN email_verifications.expires_at IS '만료 시각 (24시간)';

-- ===================================================================
-- PART 4: 헬퍼 함수
-- ===================================================================

-- 4.1. 이메일 인증 토큰 생성 함수
CREATE OR REPLACE FUNCTION generate_email_verification_token(
  p_user_id uuid,
  p_email text
)
RETURNS text AS $$
DECLARE
  v_token text;
BEGIN
  -- 기존 미인증 토큰 삭제
  DELETE FROM email_verifications
  WHERE user_id = p_user_id
  AND email = p_email
  AND verified_at IS NULL;

  -- 새 토큰 생성
  v_token := gen_random_uuid()::text;

  INSERT INTO email_verifications (user_id, email, token, expires_at)
  VALUES (p_user_id, p_email, v_token, now() + interval '24 hours');

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_email_verification_token(uuid, text) IS '이메일 인증 토큰 생성 (24시간 유효)';

-- 4.2. 이메일 인증 함수
CREATE OR REPLACE FUNCTION verify_email_token(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_verification record;
  v_result jsonb;
BEGIN
  -- 토큰 조회
  SELECT * INTO v_verification
  FROM email_verifications
  WHERE token = p_token
  AND verified_at IS NULL
  AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;

  -- 이메일 인증 처리
  UPDATE email_verifications
  SET verified_at = now()
  WHERE id = v_verification.id;

  UPDATE user_profiles
  SET email_verified = true
  WHERE user_id = v_verification.user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_verification.user_id,
    'email', v_verification.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_email_token(text) IS '이메일 인증 토큰 검증 및 처리';

-- 4.3. 마지막 로그인 정보 업데이트 함수
CREATE OR REPLACE FUNCTION update_last_login(
  p_user_id uuid,
  p_ip_address inet DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET
    last_login_at = now(),
    last_login_ip = COALESCE(p_ip_address, last_login_ip)
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_last_login(uuid, inet) IS '마지막 로그인 정보 업데이트';

-- ===================================================================
-- PART 5: RLS (Row Level Security) 정책
-- ===================================================================

-- 5.1. user_profiles RLS (기존 정책 유지 + 추가)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로필만 조회/수정 가능
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- 관리자는 모든 프로필 조회 가능
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- 5.2. connected_accounts RLS
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 연결 계정만 조회/수정 가능
CREATE POLICY "Users can view their own connected accounts"
  ON connected_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connected accounts"
  ON connected_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected accounts"
  ON connected_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected accounts"
  ON connected_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- 5.3. email_verifications RLS
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 인증 기록만 조회 가능
CREATE POLICY "Users can view their own email verifications"
  ON email_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- ===================================================================
-- PART 6: 데이터 검증
-- ===================================================================

DO $$
BEGIN
  RAISE NOTICE '=== Phase 10 Week 1 Migration 완료 ===';
  RAISE NOTICE 'user_profiles: % rows', (SELECT COUNT(*) FROM user_profiles);
  RAISE NOTICE 'connected_accounts: % rows', (SELECT COUNT(*) FROM connected_accounts);
  RAISE NOTICE 'email_verifications: % rows', (SELECT COUNT(*) FROM email_verifications);
END $$;

-- ===================================================================
-- Migration 003 완료
-- ===================================================================

-- 실행 방법:
-- 1. Supabase Dashboard → SQL Editor
-- 2. 이 파일 전체 복사 → 붙여넣기
-- 3. RUN 버튼 클릭
-- 4. 결과 확인 (NOTICE 메시지 확인)
