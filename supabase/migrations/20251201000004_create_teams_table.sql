-- =====================================================
-- 팀/조직 관리 시스템
-- Migration: 20251201000004_create_teams_table.sql
-- Author: Claude AI
-- Date: 2025-12-01 (KST)
-- =====================================================

-- =====================================================
-- 1. 조직 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.organizations IS '조직 테이블 - 최상위 컨테이너';
COMMENT ON COLUMN public.organizations.slug IS 'URL에서 사용할 고유 식별자';
COMMENT ON COLUMN public.organizations.settings IS '조직 설정 JSON';
COMMENT ON COLUMN public.organizations.created_by IS '조직 생성자 (자동으로 owner 역할 부여)';

CREATE INDEX IF NOT EXISTS idx_organizations_created_by
  ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_slug
  ON public.organizations(slug);

-- =====================================================
-- 2. 팀 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.teams IS '팀 테이블 - 조직 내 하위 그룹';
COMMENT ON COLUMN public.teams.organization_id IS '소속 조직 ID';
COMMENT ON COLUMN public.teams.settings IS '팀 설정 JSON';
COMMENT ON COLUMN public.teams.created_by IS '팀 생성자';

CREATE INDEX IF NOT EXISTS idx_teams_organization_id
  ON public.teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_created_by
  ON public.teams(created_by);

-- =====================================================
-- 3. 팀 멤버 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

COMMENT ON TABLE public.team_members IS '팀 멤버 테이블 - 팀과 사용자 매핑';
COMMENT ON COLUMN public.team_members.role IS '팀 내 역할: owner, admin, member, viewer';
COMMENT ON COLUMN public.team_members.invited_by IS '초대자 ID';
COMMENT ON COLUMN public.team_members.joined_at IS '초대 수락 시간 (NULL이면 초대 대기 중)';

CREATE INDEX IF NOT EXISTS idx_team_members_team_id
  ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id
  ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role
  ON public.team_members(role);

-- =====================================================
-- 4. 팀 초대 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  token VARCHAR(64) UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.team_invitations IS '팀 초대 테이블 - 이메일 기반 초대';
COMMENT ON COLUMN public.team_invitations.token IS '초대 토큰 (URL에 포함)';
COMMENT ON COLUMN public.team_invitations.expires_at IS '초대 만료 시간';
COMMENT ON COLUMN public.team_invitations.accepted_at IS '초대 수락 시간';

CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id
  ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email
  ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token
  ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at
  ON public.team_invitations(expires_at);

-- =====================================================
-- 5. organization_id FK 추가 (organization_members 테이블)
-- =====================================================
-- 기존 organization_members 테이블에 FK 제약 조건 추가
DO $$
BEGIN
  -- FK가 이미 존재하는지 확인 후 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'organization_members_organization_id_fkey'
  ) THEN
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 6. 트리거 - updated_at 자동 갱신
-- =====================================================
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. 조직 생성 시 자동으로 owner 멤버 추가 함수
-- =====================================================
CREATE OR REPLACE FUNCTION public.add_organization_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 조직 생성자를 owner로 추가
  INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_add_organization_owner
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.add_organization_owner();

-- =====================================================
-- 8. 팀 생성 시 자동으로 owner 멤버 추가 함수
-- =====================================================
CREATE OR REPLACE FUNCTION public.add_team_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 팀 생성자를 owner로 추가
  INSERT INTO public.team_members (team_id, user_id, role, invited_by, joined_at)
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by, NOW());

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_add_team_owner
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.add_team_owner();

-- =====================================================
-- 9. RLS 정책 - organizations
-- =====================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 조직 멤버는 자신이 속한 조직 조회 가능
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
    )
  );

-- 인증된 사용자는 조직 생성 가능
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- owner만 조직 수정 가능
CREATE POLICY "Owners can update organizations"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- owner만 조직 삭제 가능
CREATE POLICY "Owners can delete organizations"
  ON public.organizations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- =====================================================
-- 10. RLS 정책 - teams
-- =====================================================
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 조직 멤버는 팀 조회 가능
CREATE POLICY "Organization members can view teams"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = teams.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- admin 이상은 팀 생성 가능
CREATE POLICY "Admins can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (
    public.check_permission(
      auth.uid(),
      organization_id,
      'teams',
      'create'
    )
  );

-- admin 이상은 팀 수정 가능
CREATE POLICY "Admins can update teams"
  ON public.teams FOR UPDATE
  USING (
    public.check_permission(
      auth.uid(),
      organization_id,
      'teams',
      'update'
    )
  );

-- admin 이상은 팀 삭제 가능
CREATE POLICY "Admins can delete teams"
  ON public.teams FOR DELETE
  USING (
    public.check_permission(
      auth.uid(),
      organization_id,
      'teams',
      'delete'
    )
  );

-- =====================================================
-- 11. RLS 정책 - team_members
-- =====================================================
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 팀 멤버는 자신이 속한 팀의 멤버 목록 조회 가능
CREATE POLICY "Team members can view team members"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.joined_at IS NOT NULL
    )
  );

-- admin 이상만 멤버 추가 가능
CREATE POLICY "Admins can add team members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
        AND public.check_permission(
          auth.uid(),
          t.organization_id,
          'teams',
          'invite'
        )
    )
  );

-- admin 이상만 멤버 제거 가능 (단, owner는 제거 불가)
CREATE POLICY "Admins can remove team members"
  ON public.team_members FOR DELETE
  USING (
    role != 'owner'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
        AND public.check_permission(
          auth.uid(),
          t.organization_id,
          'teams',
          'remove'
        )
    )
  );

-- =====================================================
-- 12. RLS 정책 - team_invitations
-- =====================================================
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- admin 이상만 초대 목록 조회 가능
CREATE POLICY "Admins can view team invitations"
  ON public.team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
        AND public.check_permission(
          auth.uid(),
          t.organization_id,
          'teams',
          'invite'
        )
    )
  );

-- admin 이상만 초대 생성 가능
CREATE POLICY "Admins can create team invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
        AND public.check_permission(
          auth.uid(),
          t.organization_id,
          'teams',
          'invite'
        )
    )
  );

-- =====================================================
-- 13. 유틸리티 함수 - 초대 토큰 생성
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

COMMENT ON FUNCTION public.generate_invitation_token IS '초대 토큰 생성 (64자 HEX)';

-- =====================================================
-- 14. 권한 설정 업데이트 (teams 리소스 추가)
-- =====================================================

-- Owner 역할은 이미 모든 권한(*:*)을 가지고 있으므로 업데이트 불필요

-- Admin 역할에 teams 권한 추가
UPDATE public.role_permissions
SET permissions = permissions || '{"teams": ["create", "read", "update", "delete", "invite", "remove"]}'::jsonb,
    updated_at = NOW()
WHERE role = 'admin';

-- Member 역할에 teams 읽기 권한 추가
UPDATE public.role_permissions
SET permissions = permissions || '{"teams": ["read"]}'::jsonb,
    updated_at = NOW()
WHERE role = 'member';

-- Viewer 역할에 teams 읽기 권한 추가
UPDATE public.role_permissions
SET permissions = permissions || '{"teams": ["read"]}'::jsonb,
    updated_at = NOW()
WHERE role = 'viewer';
