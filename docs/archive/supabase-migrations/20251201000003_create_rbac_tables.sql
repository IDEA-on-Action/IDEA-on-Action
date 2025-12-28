-- =====================================================
-- RBAC (역할 기반 접근 제어) 시스템
-- Migration: 20251201000003_create_rbac_tables.sql
-- Author: Claude AI
-- Date: 2025-12-01
-- =====================================================

-- =====================================================
-- 1. 역할 ENUM 타입
-- =====================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE user_role IS '사용자 역할: owner(소유자), admin(관리자), member(멤버), viewer(뷰어)';

-- =====================================================
-- 2. 조직 멤버 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

COMMENT ON TABLE public.organization_members IS '조직 멤버 및 역할 매핑';
COMMENT ON COLUMN public.organization_members.organization_id IS '조직 ID (추후 organizations 테이블과 FK 연결)';
COMMENT ON COLUMN public.organization_members.user_id IS '사용자 ID';
COMMENT ON COLUMN public.organization_members.role IS '역할: owner, admin, member, viewer';
COMMENT ON COLUMN public.organization_members.invited_by IS '초대자 ID';

CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id
  ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id
  ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role
  ON public.organization_members(role);

-- =====================================================
-- 3. 역할별 권한 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role user_role PRIMARY KEY,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.role_permissions IS '역할별 권한 매핑';
COMMENT ON COLUMN public.role_permissions.role IS '역할';
COMMENT ON COLUMN public.role_permissions.permissions IS '권한 JSON: {"resource": ["action1", "action2"]} 또는 {"*": ["*"]}';

-- =====================================================
-- 4. 기본 권한 시드 데이터
-- =====================================================
INSERT INTO public.role_permissions (role, permissions) VALUES
  -- Owner: 모든 권한 + 조직 삭제 + 결제 관리
  ('owner', '{
    "*": ["*"]
  }'),

  -- Admin: 모든 기능 + 멤버 관리
  ('admin', '{
    "users": ["read", "invite", "remove"],
    "content": ["create", "read", "update", "delete"],
    "services": ["create", "read", "update", "delete"],
    "billing": ["read"],
    "analytics": ["read"]
  }'),

  -- Member: 구독 플랜 범위 내 기능
  ('member', '{
    "content": ["read", "create", "update"],
    "services": ["read"],
    "users": ["read"]
  }'),

  -- Viewer: 읽기 전용
  ('viewer', '{
    "content": ["read"],
    "services": ["read"],
    "users": ["read"]
  }')
ON CONFLICT (role) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- =====================================================
-- 5. 권한 확인 함수
-- =====================================================

/**
 * 사용자가 특정 리소스에 대한 액션을 수행할 권한이 있는지 확인
 *
 * @param p_user_id - 사용자 ID
 * @param p_organization_id - 조직 ID
 * @param p_resource - 리소스 이름 (예: 'content', 'users', 'services')
 * @param p_action - 액션 이름 (예: 'read', 'create', 'update', 'delete')
 * @returns boolean - 권한 있음(true), 없음(false)
 */
CREATE OR REPLACE FUNCTION public.check_permission(
  p_user_id UUID,
  p_organization_id UUID,
  p_resource TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role user_role;
  v_permissions JSONB;
  v_resource_actions JSONB;
BEGIN
  -- 1. 사용자의 조직 내 역할 조회
  SELECT role INTO v_user_role
  FROM public.organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;

  -- 조직 멤버가 아니면 권한 없음
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 2. 역할의 권한 조회
  SELECT permissions INTO v_permissions
  FROM public.role_permissions
  WHERE role = v_user_role;

  -- 3. 와일드카드 권한 체크 (owner)
  IF v_permissions ? '*' THEN
    v_resource_actions := v_permissions -> '*';
    IF v_resource_actions @> '["*"]'::jsonb THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- 4. 리소스별 권한 체크
  IF v_permissions ? p_resource THEN
    v_resource_actions := v_permissions -> p_resource;

    -- 와일드카드 액션 체크
    IF v_resource_actions @> '["*"]'::jsonb THEN
      RETURN TRUE;
    END IF;

    -- 특정 액션 체크
    IF v_resource_actions @> to_jsonb(ARRAY[p_action]) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- 권한 없음
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.check_permission IS '사용자의 리소스/액션 권한 확인';

/**
 * 사용자의 조직 내 역할 조회
 *
 * @param p_user_id - 사용자 ID
 * @param p_organization_id - 조직 ID
 * @returns user_role - 역할 (owner, admin, member, viewer) 또는 NULL
 */
CREATE OR REPLACE FUNCTION public.get_user_role(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM public.organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;

  RETURN v_role;
END;
$$;

COMMENT ON FUNCTION public.get_user_role IS '사용자의 조직 내 역할 조회';

/**
 * 역할의 모든 권한 조회
 *
 * @param p_role - 역할
 * @returns JSONB - 권한 JSON
 */
CREATE OR REPLACE FUNCTION public.get_role_permissions(
  p_role user_role
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permissions JSONB;
BEGIN
  SELECT permissions INTO v_permissions
  FROM public.role_permissions
  WHERE role = p_role;

  RETURN COALESCE(v_permissions, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_role_permissions IS '역할의 권한 조회';

-- =====================================================
-- 6. RLS 정책
-- =====================================================

-- organization_members 테이블
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 자신이 속한 조직의 멤버 목록 조회
CREATE POLICY "Users can view organization members"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- Admin 이상만 멤버 추가 가능
CREATE POLICY "Admins can insert organization members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    public.check_permission(
      auth.uid(),
      organization_id,
      'users',
      'invite'
    )
  );

-- Admin 이상만 멤버 제거 가능 (단, owner는 제거 불가)
CREATE POLICY "Admins can delete organization members"
  ON public.organization_members FOR DELETE
  USING (
    role != 'owner'
    AND public.check_permission(
      auth.uid(),
      organization_id,
      'users',
      'remove'
    )
  );

-- role_permissions 테이블
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 역할별 권한 조회 가능 (읽기 전용)
CREATE POLICY "Everyone can view role permissions"
  ON public.role_permissions FOR SELECT
  USING (true);

-- =====================================================
-- 7. 트리거 - updated_at 자동 갱신
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
