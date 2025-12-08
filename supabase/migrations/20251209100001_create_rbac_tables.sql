-- ============================================================================
-- RBAC (Role-Based Access Control) Tables
-- 조직 기반 역할 및 권한 관리 시스템
-- Created: 2025-12-09
-- ============================================================================

-- ============================================================================
-- Enums
-- ============================================================================

-- 사용자 역할 정의
CREATE TYPE user_role AS ENUM (
  'owner',   -- 조직 소유자 (모든 권한)
  'admin',   -- 관리자 (대부분 권한)
  'member',  -- 일반 멤버 (기본 권한)
  'viewer'   -- 조회자 (읽기 전용)
);

-- ============================================================================
-- organization_members 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization Reference
  organization_id UUID NOT NULL,
  -- 참고: organizations 테이블은 이미 존재한다고 가정
  -- 실제 구현 시 REFERENCES organizations(id) 추가 가능

  -- User Reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role Assignment
  role user_role NOT NULL DEFAULT 'member',

  -- Invitation Tracking
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),

  -- Join Tracking
  joined_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT organization_members_unique_user UNIQUE (organization_id, user_id),
  CONSTRAINT organization_members_no_self_invite CHECK (user_id != invited_by)
);

-- ============================================================================
-- role_permissions 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  -- Primary Key (역할 자체가 PK)
  role user_role PRIMARY KEY,

  -- Permissions (JSONB)
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- user_custom_permissions 테이블 (역할 외 추가 권한)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_custom_permissions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization Member Reference
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- Permission Details
  resource TEXT NOT NULL,  -- 리소스 타입 (예: 'projects', 'services', 'settings')
  action TEXT NOT NULL,     -- 액션 (예: 'read', 'write', 'delete', 'manage')
  allowed BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT user_custom_permissions_unique_permission
    UNIQUE (organization_id, user_id, resource, action),
  FOREIGN KEY (organization_id, user_id)
    REFERENCES organization_members(organization_id, user_id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- organization_members
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);
CREATE INDEX idx_organization_members_invited_by ON organization_members(invited_by);

-- user_custom_permissions
CREATE INDEX idx_user_custom_permissions_org_user
  ON user_custom_permissions(organization_id, user_id);
CREATE INDEX idx_user_custom_permissions_resource
  ON user_custom_permissions(resource);
CREATE INDEX idx_user_custom_permissions_action
  ON user_custom_permissions(action);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_permissions ENABLE ROW LEVEL SECURITY;

-- organization_members RLS
CREATE POLICY "Users can view members of their organizations"
  ON organization_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can insert members"
  ON organization_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update members"
  ON organization_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete members"
  ON organization_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
    -- 소유자는 삭제할 수 없음 (최소 1명 필요)
    AND role != 'owner'
  );

-- role_permissions RLS (모든 인증된 사용자가 읽기 가능)
CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage role permissions"
  ON role_permissions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- user_custom_permissions RLS
CREATE POLICY "Users can view their custom permissions"
  ON user_custom_permissions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members AS om
      WHERE om.organization_id = user_custom_permissions.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can manage custom permissions"
  ON user_custom_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members AS om
      WHERE om.organization_id = user_custom_permissions.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- Triggers
-- ============================================================================

-- updated_at 자동 갱신 트리거 (organization_members)
CREATE OR REPLACE FUNCTION update_organization_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_members_updated_at();

-- updated_at 자동 갱신 트리거 (role_permissions)
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permissions_updated_at();

-- updated_at 자동 갱신 트리거 (user_custom_permissions)
CREATE OR REPLACE FUNCTION update_user_custom_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_custom_permissions_updated_at
  BEFORE UPDATE ON user_custom_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_custom_permissions_updated_at();

-- ============================================================================
-- Functions
-- ============================================================================

-- 사용자의 조직 내 역할 조회
CREATE OR REPLACE FUNCTION get_user_role(
  target_user_id UUID,
  target_organization_id UUID
)
RETURNS user_role AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM organization_members
  WHERE user_id = target_user_id
    AND organization_id = target_organization_id;

  RETURN user_role_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자의 특정 권한 확인 (역할 기반 + 커스텀 권한)
CREATE OR REPLACE FUNCTION check_permission(
  target_user_id UUID,
  target_organization_id UUID,
  resource_name TEXT,
  action_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_value user_role;
  role_perms JSONB;
  custom_perm BOOLEAN;
BEGIN
  -- 1. 사용자 역할 조회
  SELECT role INTO user_role_value
  FROM organization_members
  WHERE user_id = target_user_id
    AND organization_id = target_organization_id;

  IF user_role_value IS NULL THEN
    RETURN false;
  END IF;

  -- 2. 역할 기반 권한 확인
  SELECT permissions INTO role_perms
  FROM role_permissions
  WHERE role = user_role_value;

  -- 권한 JSON 구조: {"resource": {"action": true}}
  IF (role_perms -> resource_name -> action_name)::boolean = true THEN
    RETURN true;
  END IF;

  -- 3. 커스텀 권한 확인
  SELECT allowed INTO custom_perm
  FROM user_custom_permissions
  WHERE user_id = target_user_id
    AND organization_id = target_organization_id
    AND resource = resource_name
    AND action = action_name;

  RETURN COALESCE(custom_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자가 서비스에 접근 가능한지 확인
CREATE OR REPLACE FUNCTION can_access_service(
  target_user_id UUID,
  service_slug TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  has_subscription BOOLEAN;
BEGIN
  -- 활성 구독 확인
  SELECT EXISTS (
    SELECT 1
    FROM subscriptions s
    JOIN services sv ON s.service_id = sv.id
    WHERE s.user_id = target_user_id
      AND sv.slug = service_slug
      AND s.status IN ('trial', 'active')
      AND s.current_period_end > NOW()
  ) INTO has_subscription;

  RETURN has_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Seed Default Role Permissions
-- ============================================================================

INSERT INTO role_permissions (role, permissions, description) VALUES
  (
    'owner',
    '{
      "projects": {"read": true, "write": true, "delete": true, "manage": true},
      "services": {"read": true, "write": true, "delete": true, "manage": true},
      "members": {"read": true, "write": true, "delete": true, "manage": true},
      "settings": {"read": true, "write": true, "delete": true, "manage": true},
      "billing": {"read": true, "write": true, "delete": true, "manage": true}
    }'::jsonb,
    '조직 소유자 - 모든 권한'
  ),
  (
    'admin',
    '{
      "projects": {"read": true, "write": true, "delete": true, "manage": true},
      "services": {"read": true, "write": true, "delete": false, "manage": true},
      "members": {"read": true, "write": true, "delete": true, "manage": false},
      "settings": {"read": true, "write": true, "delete": false, "manage": false},
      "billing": {"read": true, "write": false, "delete": false, "manage": false}
    }'::jsonb,
    '관리자 - 대부분의 권한 (결제, 멤버 관리 제외)'
  ),
  (
    'member',
    '{
      "projects": {"read": true, "write": true, "delete": false, "manage": false},
      "services": {"read": true, "write": true, "delete": false, "manage": false},
      "members": {"read": true, "write": false, "delete": false, "manage": false},
      "settings": {"read": true, "write": false, "delete": false, "manage": false},
      "billing": {"read": false, "write": false, "delete": false, "manage": false}
    }'::jsonb,
    '일반 멤버 - 읽기/쓰기 권한'
  ),
  (
    'viewer',
    '{
      "projects": {"read": true, "write": false, "delete": false, "manage": false},
      "services": {"read": true, "write": false, "delete": false, "manage": false},
      "members": {"read": true, "write": false, "delete": false, "manage": false},
      "settings": {"read": true, "write": false, "delete": false, "manage": false},
      "billing": {"read": false, "write": false, "delete": false, "manage": false}
    }'::jsonb,
    '조회자 - 읽기 전용 권한'
  )
ON CONFLICT (role) DO UPDATE
  SET permissions = EXCLUDED.permissions,
      description = EXCLUDED.description,
      updated_at = NOW();

-- ============================================================================
-- Comments
-- ============================================================================

-- organization_members
COMMENT ON TABLE organization_members IS '조직 멤버 및 역할 관리';
COMMENT ON COLUMN organization_members.id IS '멤버 레코드 고유 ID';
COMMENT ON COLUMN organization_members.organization_id IS '조직 ID';
COMMENT ON COLUMN organization_members.user_id IS '사용자 ID';
COMMENT ON COLUMN organization_members.role IS '사용자 역할 (owner/admin/member/viewer)';
COMMENT ON COLUMN organization_members.invited_by IS '초대한 사용자 ID';
COMMENT ON COLUMN organization_members.invited_at IS '초대 일시';
COMMENT ON COLUMN organization_members.joined_at IS '가입 일시';

-- role_permissions
COMMENT ON TABLE role_permissions IS '역할별 권한 정의';
COMMENT ON COLUMN role_permissions.role IS '역할 (PK)';
COMMENT ON COLUMN role_permissions.permissions IS '권한 JSON: {resource: {action: boolean}}';
COMMENT ON COLUMN role_permissions.description IS '역할 설명';

-- user_custom_permissions
COMMENT ON TABLE user_custom_permissions IS '사용자별 커스텀 권한 (역할 외 추가/제한)';
COMMENT ON COLUMN user_custom_permissions.id IS '권한 레코드 고유 ID';
COMMENT ON COLUMN user_custom_permissions.organization_id IS '조직 ID';
COMMENT ON COLUMN user_custom_permissions.user_id IS '사용자 ID';
COMMENT ON COLUMN user_custom_permissions.resource IS '리소스 타입';
COMMENT ON COLUMN user_custom_permissions.action IS '액션';
COMMENT ON COLUMN user_custom_permissions.allowed IS '허용 여부';
COMMENT ON COLUMN user_custom_permissions.granted_by IS '권한 부여자 ID';
COMMENT ON COLUMN user_custom_permissions.reason IS '권한 부여 사유';

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON organization_members TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_custom_permissions TO authenticated;

GRANT ALL ON organization_members TO service_role;
GRANT ALL ON role_permissions TO service_role;
GRANT ALL ON user_custom_permissions TO service_role;
