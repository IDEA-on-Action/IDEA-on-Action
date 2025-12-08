-- =====================================================
-- 팀 관리 API - 테이블 확인 및 인덱스 추가
-- Migration: 20251209100002_create_teams_table.sql
-- Author: Claude AI
-- Date: 2025-12-09 (KST)
-- Description: 팀 테이블이 이미 존재하므로, 추가 인덱스 및 헬퍼 함수만 생성
-- =====================================================

-- =====================================================
-- 1. 테이블 존재 확인 (이미 20251201000004_create_teams_table.sql에서 생성됨)
-- =====================================================
-- organizations, teams, team_members, team_invitations 테이블은 이미 존재함

-- =====================================================
-- 2. 추가 인덱스 (성능 최적화)
-- =====================================================

-- team_members의 role 필터링 성능 향상
CREATE INDEX IF NOT EXISTS idx_team_members_team_id_role
  ON public.team_members(team_id, role);

-- 활성 멤버만 조회 (joined_at IS NOT NULL)
CREATE INDEX IF NOT EXISTS idx_team_members_team_id_joined
  ON public.team_members(team_id, joined_at)
  WHERE joined_at IS NOT NULL;

-- 만료되지 않은 초대 조회
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at_accepted
  ON public.team_invitations(expires_at, accepted_at)
  WHERE accepted_at IS NULL AND expires_at > NOW();

-- =====================================================
-- 3. 헬퍼 함수 - 팀 멤버 수 조회
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_team_member_count(p_team_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.team_members
  WHERE team_id = p_team_id
    AND joined_at IS NOT NULL;
$$;

COMMENT ON FUNCTION public.get_team_member_count IS '팀의 활성 멤버 수를 반환';

-- =====================================================
-- 4. 헬퍼 함수 - 사용자의 팀 역할 조회
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_team_role(
  p_user_id UUID,
  p_team_id UUID
)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.team_members
  WHERE team_id = p_team_id
    AND user_id = p_user_id
    AND joined_at IS NOT NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_team_role IS '사용자의 특정 팀 내 역할을 반환';

-- =====================================================
-- 5. 헬퍼 함수 - 초대 토큰 검증
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token TEXT)
RETURNS TABLE (
  invitation_id UUID,
  team_id UUID,
  email TEXT,
  role TEXT,
  is_valid BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    team_id,
    email,
    role,
    (accepted_at IS NULL AND expires_at > NOW()) AS is_valid
  FROM public.team_invitations
  WHERE token = p_token
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.validate_invitation_token IS '초대 토큰을 검증하고 초대 정보를 반환';

-- =====================================================
-- 6. 뷰 - 팀 목록 (멤버 수 포함)
-- =====================================================
CREATE OR REPLACE VIEW public.teams_with_member_count AS
SELECT
  t.id,
  t.organization_id,
  t.name,
  t.description,
  t.avatar_url,
  t.settings,
  t.created_by,
  t.created_at,
  t.updated_at,
  COUNT(tm.id) FILTER (WHERE tm.joined_at IS NOT NULL) AS member_count
FROM public.teams t
LEFT JOIN public.team_members tm ON t.id = tm.team_id
GROUP BY t.id;

COMMENT ON VIEW public.teams_with_member_count IS '팀 목록과 각 팀의 멤버 수';

-- =====================================================
-- 7. RLS 정책 - teams_with_member_count 뷰
-- =====================================================
ALTER VIEW public.teams_with_member_count SET (security_invoker = true);

-- =====================================================
-- 끝
-- =====================================================
