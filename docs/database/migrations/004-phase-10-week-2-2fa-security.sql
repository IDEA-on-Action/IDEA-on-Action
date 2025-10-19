-- ===================================================================
-- Migration 004: Phase 10 Week 2 - 2FA & Security Enhancement
-- 작성일: 2025-10-19
-- 목적: 2단계 인증 및 보안 기능 추가
-- Phase: 10 Week 2 (2FA & 보안 강화)
-- ===================================================================

-- ⚠️ 주의: 이 마이그레이션을 실행하기 전에 반드시 백업하세요!
-- Supabase Dashboard → Database → Backups

-- ===================================================================
-- PART 1: two_factor_auth 테이블 생성 (TOTP 2FA)
-- ===================================================================

DROP TABLE IF EXISTS two_factor_auth CASCADE;

CREATE TABLE two_factor_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- TOTP 설정
  secret text NOT NULL, -- TOTP secret (base32 인코딩, 암호화 저장 권장)
  enabled boolean DEFAULT false,
  verified_at timestamptz, -- 최초 인증 완료 시각

  -- 백업 코드 (해시 저장)
  backup_codes text[], -- bcrypt 해시 배열 (10개 생성)
  backup_codes_used integer DEFAULT 0, -- 사용한 백업 코드 수

  -- 메타데이터
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz -- 마지막 2FA 사용 시각
);

-- 인덱스
CREATE INDEX idx_two_factor_auth_user ON two_factor_auth(user_id);
CREATE INDEX idx_two_factor_auth_enabled ON two_factor_auth(enabled) WHERE enabled = true;

-- 코멘트
COMMENT ON TABLE two_factor_auth IS '2단계 인증 (TOTP) 설정';
COMMENT ON COLUMN two_factor_auth.secret IS 'TOTP secret (base32, 암호화 저장)';
COMMENT ON COLUMN two_factor_auth.backup_codes IS '백업 코드 (bcrypt 해시 배열)';

-- ===================================================================
-- PART 2: login_attempts 테이블 생성 (브루트 포스 방지)
-- ===================================================================

DROP TABLE IF EXISTS login_attempts CASCADE;

CREATE TABLE login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 시도 정보
  email text NOT NULL, -- 로그인 시도 이메일
  ip_address inet NOT NULL, -- IP 주소
  user_agent text, -- User-Agent
  success boolean NOT NULL, -- 성공 여부

  -- 실패 사유
  failure_reason text, -- 'invalid_password', 'invalid_email', 'account_locked', '2fa_failed'

  -- 타임스탬프
  attempted_at timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_attempted ON login_attempts(attempted_at DESC);

-- 코멘트
COMMENT ON TABLE login_attempts IS '로그인 시도 기록 (보안 감사)';
COMMENT ON COLUMN login_attempts.failure_reason IS '실패 사유 (invalid_password, invalid_email, account_locked, 2fa_failed)';

-- ===================================================================
-- PART 3: account_locks 테이블 생성 (계정 잠금)
-- ===================================================================

DROP TABLE IF EXISTS account_locks CASCADE;

CREATE TABLE account_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- 잠금 정보
  is_locked boolean DEFAULT true,
  lock_reason text NOT NULL, -- 'brute_force', 'suspicious_activity', 'admin'
  locked_at timestamptz DEFAULT now(),
  unlock_at timestamptz, -- 자동 잠금 해제 시각 (NULL이면 수동 해제만 가능)

  -- 메타데이터
  locked_by uuid REFERENCES auth.users(id), -- 잠금 실행자 (관리자)
  unlock_token text UNIQUE, -- 잠금 해제 토큰 (이메일 링크)
  unlocked_at timestamptz
);

-- 인덱스
CREATE INDEX idx_account_locks_user ON account_locks(user_id);
CREATE INDEX idx_account_locks_active ON account_locks(is_locked, unlock_at) WHERE is_locked = true;

-- 코멘트
COMMENT ON TABLE account_locks IS '계정 잠금 (브루트 포스 방지)';
COMMENT ON COLUMN account_locks.lock_reason IS '잠금 사유 (brute_force, suspicious_activity, admin)';

-- ===================================================================
-- PART 4: password_reset_tokens 테이블 생성
-- ===================================================================

DROP TABLE IF EXISTS password_reset_tokens CASCADE;

CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at) WHERE used_at IS NULL;

-- 코멘트
COMMENT ON TABLE password_reset_tokens IS '비밀번호 재설정 토큰';
COMMENT ON COLUMN password_reset_tokens.token IS '재설정 토큰 (UUID v4)';

-- ===================================================================
-- PART 5: 헬퍼 함수
-- ===================================================================

-- 5.1. 로그인 시도 기록 함수
CREATE OR REPLACE FUNCTION log_login_attempt(
  p_email text,
  p_user_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_success boolean DEFAULT false,
  p_failure_reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO login_attempts (user_id, email, ip_address, user_agent, success, failure_reason)
  VALUES (p_user_id, p_email, p_ip_address, p_user_agent, p_success, p_failure_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_login_attempt IS '로그인 시도 기록';

-- 5.2. 계정 잠금 확인 함수
CREATE OR REPLACE FUNCTION is_account_locked(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_lock record;
BEGIN
  SELECT * INTO v_lock
  FROM account_locks
  WHERE user_id = p_user_id
  AND is_locked = true
  AND (unlock_at IS NULL OR unlock_at > now());

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_account_locked(uuid) IS '계정 잠금 여부 확인';

-- 5.3. 계정 잠금 함수 (브루트 포스 감지)
CREATE OR REPLACE FUNCTION lock_account_on_failed_attempts(p_email text)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_failed_attempts integer;
  v_max_attempts integer := 5; -- 최대 시도 횟수
  v_lock_duration interval := interval '30 minutes'; -- 잠금 시간
BEGIN
  -- 사용자 ID 조회
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF NOT FOUND THEN
    RETURN; -- 존재하지 않는 이메일
  END IF;

  -- 최근 15분간 실패한 로그인 시도 횟수
  SELECT COUNT(*) INTO v_failed_attempts
  FROM login_attempts
  WHERE email = p_email
  AND success = false
  AND attempted_at > now() - interval '15 minutes';

  -- 최대 시도 횟수 초과 시 계정 잠금
  IF v_failed_attempts >= v_max_attempts THEN
    INSERT INTO account_locks (user_id, lock_reason, unlock_at)
    VALUES (v_user_id, 'brute_force', now() + v_lock_duration)
    ON CONFLICT (user_id)
    DO UPDATE SET
      is_locked = true,
      lock_reason = 'brute_force',
      locked_at = now(),
      unlock_at = now() + v_lock_duration;

    RAISE NOTICE 'Account locked: % (% failed attempts)', p_email, v_failed_attempts;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION lock_account_on_failed_attempts(text) IS '브루트 포스 감지 및 계정 잠금 (5회 실패 시 30분)';

-- 5.4. 비밀번호 재설정 토큰 생성 함수
CREATE OR REPLACE FUNCTION generate_password_reset_token(p_email text)
RETURNS text AS $$
DECLARE
  v_user_id uuid;
  v_token text;
BEGIN
  -- 사용자 조회
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_email;
  END IF;

  -- 기존 미사용 토큰 삭제
  DELETE FROM password_reset_tokens
  WHERE email = p_email
  AND used_at IS NULL;

  -- 새 토큰 생성
  v_token := gen_random_uuid()::text;

  INSERT INTO password_reset_tokens (user_id, email, token, expires_at)
  VALUES (v_user_id, p_email, v_token, now() + interval '1 hour');

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_password_reset_token(text) IS '비밀번호 재설정 토큰 생성 (1시간 유효)';

-- 5.5. 비밀번호 재설정 토큰 검증 함수
CREATE OR REPLACE FUNCTION verify_password_reset_token(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_reset record;
  v_result jsonb;
BEGIN
  -- 토큰 조회
  SELECT * INTO v_reset
  FROM password_reset_tokens
  WHERE token = p_token
  AND used_at IS NULL
  AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;

  -- 토큰 사용 처리
  UPDATE password_reset_tokens
  SET used_at = now()
  WHERE id = v_reset.id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_reset.user_id,
    'email', v_reset.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_password_reset_token(text) IS '비밀번호 재설정 토큰 검증 및 사용 처리';

-- ===================================================================
-- PART 6: RLS (Row Level Security) 정책
-- ===================================================================

-- 6.1. two_factor_auth RLS
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own 2FA settings"
  ON two_factor_auth FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 2FA settings"
  ON two_factor_auth FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own 2FA settings"
  ON two_factor_auth FOR UPDATE
  USING (auth.uid() = user_id);

-- 6.2. login_attempts RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 로그인 시도만 조회 가능
CREATE POLICY "Users can view their own login attempts"
  ON login_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- 관리자는 모든 로그인 시도 조회 가능
CREATE POLICY "Admins can view all login attempts"
  ON login_attempts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- 6.3. account_locks RLS
ALTER TABLE account_locks ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 계정 잠금 상태만 조회 가능
CREATE POLICY "Users can view their own account lock status"
  ON account_locks FOR SELECT
  USING (auth.uid() = user_id);

-- 관리자만 계정 잠금 관리 가능
CREATE POLICY "Admins can manage account locks"
  ON account_locks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- 6.4. password_reset_tokens RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 재설정 토큰만 조회 가능
CREATE POLICY "Users can view their own reset tokens"
  ON password_reset_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- ===================================================================
-- PART 7: 트리거
-- ===================================================================

-- 7.1. two_factor_auth updated_at 트리거
DROP TRIGGER IF EXISTS two_factor_auth_updated_at ON two_factor_auth;
CREATE TRIGGER two_factor_auth_updated_at
  BEFORE UPDATE ON two_factor_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- PART 8: 데이터 검증
-- ===================================================================

DO $$
BEGIN
  RAISE NOTICE '=== Phase 10 Week 2 Migration 완료 ===';
  RAISE NOTICE 'two_factor_auth: % rows', (SELECT COUNT(*) FROM two_factor_auth);
  RAISE NOTICE 'login_attempts: % rows', (SELECT COUNT(*) FROM login_attempts);
  RAISE NOTICE 'account_locks: % rows', (SELECT COUNT(*) FROM account_locks);
  RAISE NOTICE 'password_reset_tokens: % rows', (SELECT COUNT(*) FROM password_reset_tokens);
END $$;

-- ===================================================================
-- Migration 004 완료
-- ===================================================================

-- 실행 방법:
-- 1. Supabase Dashboard → SQL Editor
-- 2. 이 파일 전체 복사 → 붙여넣기
-- 3. RUN 버튼 클릭
-- 4. 결과 확인 (NOTICE 메시지 확인)
