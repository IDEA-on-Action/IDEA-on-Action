-- Beta Invitations Table Migration
-- Closed Beta 초대 시스템을 위한 테이블 생성
-- Date: 2025-11-28
-- Version: 1.6.0
-- Stream C: 초대 시스템

-- ============================================================
-- 1. beta_invitations 테이블
-- ============================================================
-- 토큰 기반 Beta 초대 시스템

CREATE TABLE IF NOT EXISTS beta_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 초대 토큰 (고유)
  token VARCHAR(64) UNIQUE NOT NULL,

  -- 초대 대상 이메일 (옵션 - 특정 이메일만 허용하려면 지정)
  email VARCHAR(255),

  -- 사용 제한
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),

  -- 만료 시간
  expires_at TIMESTAMPTZ NOT NULL,

  -- 생성자 (관리자)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 상태
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- 메타데이터
  note TEXT, -- 관리자 메모 (예: "VIP 고객", "테스터 그룹 A")

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. beta_invitation_uses 테이블 (사용 기록)
-- ============================================================
-- 누가 언제 초대를 사용했는지 추적

CREATE TABLE IF NOT EXISTS beta_invitation_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  invitation_id UUID NOT NULL REFERENCES beta_invitations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 사용자-초대 조합은 유일해야 함 (중복 사용 방지)
  UNIQUE(invitation_id, user_id)
);

-- ============================================================
-- 3. 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_beta_invitations_token ON beta_invitations(token);
CREATE INDEX IF NOT EXISTS idx_beta_invitations_email ON beta_invitations(email);
CREATE INDEX IF NOT EXISTS idx_beta_invitations_expires_at ON beta_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_beta_invitations_is_active ON beta_invitations(is_active);
CREATE INDEX IF NOT EXISTS idx_beta_invitation_uses_invitation_id ON beta_invitation_uses(invitation_id);
CREATE INDEX IF NOT EXISTS idx_beta_invitation_uses_user_id ON beta_invitation_uses(user_id);

-- ============================================================
-- 4. updated_at 자동 업데이트 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION update_beta_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_beta_invitations_updated_at ON beta_invitations;
CREATE TRIGGER trigger_beta_invitations_updated_at
  BEFORE UPDATE ON beta_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_beta_invitations_updated_at();

-- ============================================================
-- 5. 토큰 검증 함수
-- ============================================================

CREATE OR REPLACE FUNCTION validate_beta_invitation(p_token VARCHAR(64), p_email VARCHAR(255) DEFAULT NULL)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  invitation_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- 토큰 조회
  SELECT * INTO v_invitation
  FROM beta_invitations
  WHERE token = p_token;

  -- 토큰 존재 여부
  IF v_invitation IS NULL THEN
    RETURN QUERY SELECT false, '유효하지 않은 초대 코드입니다.', NULL::UUID;
    RETURN;
  END IF;

  -- 활성 상태 확인
  IF NOT v_invitation.is_active THEN
    RETURN QUERY SELECT false, '비활성화된 초대 코드입니다.', NULL::UUID;
    RETURN;
  END IF;

  -- 만료 여부 확인
  IF v_invitation.expires_at < NOW() THEN
    RETURN QUERY SELECT false, '만료된 초대 코드입니다.', NULL::UUID;
    RETURN;
  END IF;

  -- 사용 횟수 확인
  IF v_invitation.used_count >= v_invitation.max_uses THEN
    RETURN QUERY SELECT false, '사용 횟수를 초과한 초대 코드입니다.', NULL::UUID;
    RETURN;
  END IF;

  -- 이메일 제한 확인 (지정된 경우)
  IF v_invitation.email IS NOT NULL AND v_invitation.email != p_email THEN
    RETURN QUERY SELECT false, '이 초대 코드는 다른 이메일 주소용입니다.', NULL::UUID;
    RETURN;
  END IF;

  -- 모든 검증 통과
  RETURN QUERY SELECT true, NULL::TEXT, v_invitation.id;
END;
$$;

-- ============================================================
-- 6. 토큰 사용 함수
-- ============================================================

CREATE OR REPLACE FUNCTION use_beta_invitation(p_token VARCHAR(64), p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_id UUID;
  v_validation RECORD;
BEGIN
  -- 토큰 검증
  SELECT * INTO v_validation
  FROM validate_beta_invitation(p_token);

  IF NOT v_validation.is_valid THEN
    RETURN QUERY SELECT false, v_validation.error_message;
    RETURN;
  END IF;

  v_invitation_id := v_validation.invitation_id;

  -- 이미 사용했는지 확인
  IF EXISTS (
    SELECT 1 FROM beta_invitation_uses
    WHERE invitation_id = v_invitation_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT false, '이미 사용한 초대 코드입니다.';
    RETURN;
  END IF;

  -- 사용 기록 추가
  INSERT INTO beta_invitation_uses (invitation_id, user_id)
  VALUES (v_invitation_id, p_user_id);

  -- 사용 횟수 증가
  UPDATE beta_invitations
  SET used_count = used_count + 1
  WHERE id = v_invitation_id;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- ============================================================
-- 7. RLS (Row Level Security) 정책
-- ============================================================

ALTER TABLE beta_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_invitation_uses ENABLE ROW LEVEL SECURITY;

-- beta_invitations: 관리자만 모든 작업 가능
CREATE POLICY "Admins can manage beta invitations"
  ON beta_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- beta_invitations: 일반 사용자는 조회 불가 (토큰 검증은 함수로)
-- (RLS로 차단됨)

-- beta_invitation_uses: 관리자만 조회 가능
CREATE POLICY "Admins can view invitation uses"
  ON beta_invitation_uses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- beta_invitation_uses: 시스템(함수)이 삽입 (함수는 SECURITY DEFINER)
-- 사용자 직접 삽입 불가

-- ============================================================
-- 8. 코멘트
-- ============================================================

COMMENT ON TABLE beta_invitations IS 'Closed Beta 초대 토큰 - Phase 9 v1.6.0';
COMMENT ON COLUMN beta_invitations.token IS '초대 토큰 (64자 고유 문자열)';
COMMENT ON COLUMN beta_invitations.email IS '특정 이메일만 허용 (NULL이면 누구나)';
COMMENT ON COLUMN beta_invitations.max_uses IS '최대 사용 횟수';
COMMENT ON COLUMN beta_invitations.used_count IS '현재 사용 횟수';
COMMENT ON COLUMN beta_invitations.expires_at IS '만료 시간';
COMMENT ON COLUMN beta_invitations.note IS '관리자 메모';

COMMENT ON TABLE beta_invitation_uses IS '초대 사용 기록';
COMMENT ON COLUMN beta_invitation_uses.invitation_id IS '사용된 초대 ID';
COMMENT ON COLUMN beta_invitation_uses.user_id IS '사용자 ID';
COMMENT ON COLUMN beta_invitation_uses.used_at IS '사용 시간';

COMMENT ON FUNCTION validate_beta_invitation IS '초대 토큰 유효성 검증';
COMMENT ON FUNCTION use_beta_invitation IS '초대 토큰 사용 처리';
