-- ============================================================================
-- Fix get_user_permissions function for JSONB role_permissions structure
-- 기존 조인 구조 대신 JSONB 구조에 맞게 함수 수정
-- Created: 2025-12-15
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_user_permissions(UUID);

-- Create new function that works with JSONB role_permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name TEXT, resource TEXT, action TEXT) AS $$
DECLARE
  v_role_name TEXT;
  v_permissions JSONB;
  v_resource TEXT;
  v_action TEXT;
BEGIN
  -- 1. Get user's role name from user_roles -> roles
  SELECT r.name INTO v_role_name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  LIMIT 1;

  IF v_role_name IS NULL THEN
    RETURN;
  END IF;

  -- 2. Get permissions JSONB for the role
  SELECT rp.permissions INTO v_permissions
  FROM public.role_permissions rp
  WHERE rp.role::TEXT = v_role_name;

  IF v_permissions IS NULL THEN
    RETURN;
  END IF;

  -- 3. If permissions is '*' (wildcard for all), return all permissions from permissions table
  IF v_permissions ? '*' THEN
    RETURN QUERY
    SELECT p.name::TEXT, p.resource::TEXT, p.action::TEXT
    FROM public.permissions p;
    RETURN;
  END IF;

  -- 4. Parse JSONB structure: {"resource": ["action1", "action2"], ...}
  -- Map to permission_name format: "resource:action"
  FOR v_resource IN SELECT jsonb_object_keys(v_permissions)
  LOOP
    FOR v_action IN SELECT jsonb_array_elements_text(v_permissions -> v_resource)
    LOOP
      -- Return permission in "resource:action" format
      permission_name := v_resource || ':' || v_action;
      resource := v_resource;
      action := v_action;
      RETURN NEXT;
    END LOOP;
  END LOOP;

  -- 5. Also check permissions table for exact matches
  RETURN QUERY
  SELECT p.name::TEXT, p.resource::TEXT, p.action::TEXT
  FROM public.permissions p
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_object_keys(v_permissions) AS res
    WHERE p.resource = res
    AND p.action IN (SELECT jsonb_array_elements_text(v_permissions -> res))
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.get_user_permissions(UUID) IS
'사용자의 권한 목록을 반환합니다. JSONB 기반 role_permissions 테이블과 호환됩니다.';
