-- Phase 10 Week 3: RBAC & Audit Logs
-- Migration: 20251020000002_create_rbac_and_audit.sql
-- Author: Claude AI
-- Date: 2025-10-20

-- =====================================================
-- 0. DROP LEGACY RBAC TABLES (Clean up naming conflicts)
-- =====================================================
-- Drop old RBAC schema to avoid conflicts with new schema
-- Legacy tables: public.role, public.user_role, public.user_roles
DROP TABLE IF EXISTS public.user_role CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.role CASCADE;

COMMENT ON SCHEMA public IS 'Cleaned up legacy RBAC tables to avoid naming conflicts';

-- =====================================================
-- 1. ROLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (name IN ('admin', 'manager', 'user', 'viewer')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.roles IS 'Available user roles';

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
  ('admin', 'Full system access - can manage all resources'),
  ('manager', 'Can manage content and users (blog, notices, services)'),
  ('user', 'Standard user - can view content and make purchases'),
  ('viewer', 'Read-only access - can only view public content')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. PERMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL, -- e.g., 'service', 'blog', 'notice', 'user'
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'manage')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.permissions IS 'Granular permissions for RBAC';

-- Insert default permissions
INSERT INTO public.permissions (name, resource, action, description) VALUES
  -- Service permissions
  ('service:create', 'service', 'create', 'Create new services'),
  ('service:read', 'service', 'read', 'View services'),
  ('service:update', 'service', 'update', 'Update services'),
  ('service:delete', 'service', 'delete', 'Delete services'),
  ('service:manage', 'service', 'manage', 'Full service management'),

  -- Blog permissions
  ('blog:create', 'blog', 'create', 'Create blog posts'),
  ('blog:read', 'blog', 'read', 'View blog posts'),
  ('blog:update', 'blog', 'update', 'Update blog posts'),
  ('blog:delete', 'blog', 'delete', 'Delete blog posts'),
  ('blog:manage', 'blog', 'manage', 'Full blog management'),

  -- Notice permissions
  ('notice:create', 'notice', 'create', 'Create notices'),
  ('notice:read', 'notice', 'read', 'View notices'),
  ('notice:update', 'notice', 'update', 'Update notices'),
  ('notice:delete', 'notice', 'delete', 'Delete notices'),
  ('notice:manage', 'notice', 'manage', 'Full notice management'),

  -- User permissions
  ('user:create', 'user', 'create', 'Create users'),
  ('user:read', 'user', 'read', 'View users'),
  ('user:update', 'user', 'update', 'Update users'),
  ('user:delete', 'user', 'delete', 'Delete users'),
  ('user:manage', 'user', 'manage', 'Full user management'),

  -- Order permissions
  ('order:read', 'order', 'read', 'View orders'),
  ('order:update', 'order', 'update', 'Update order status'),
  ('order:manage', 'order', 'manage', 'Full order management'),

  -- System permissions
  ('system:audit', 'system', 'read', 'View audit logs'),
  ('system:manage', 'system', 'manage', 'System administration')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 3. ROLE_PERMISSIONS TABLE (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE public.role_permissions IS 'Assigns permissions to roles';

-- Assign permissions to roles
DO $$
DECLARE
  admin_role_id UUID;
  manager_role_id UUID;
  user_role_id UUID;
  viewer_role_id UUID;
BEGIN
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO manager_role_id FROM public.roles WHERE name = 'manager';
  SELECT id INTO user_role_id FROM public.roles WHERE name = 'user';
  SELECT id INTO viewer_role_id FROM public.roles WHERE name = 'viewer';

  -- Admin: All permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT admin_role_id, id FROM public.permissions
  ON CONFLICT DO NOTHING;

  -- Manager: Content management
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT manager_role_id, id FROM public.permissions
  WHERE name IN (
    'service:manage', 'blog:manage', 'notice:manage', 'order:read', 'order:update'
  )
  ON CONFLICT DO NOTHING;

  -- User: Read + Create own content
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT user_role_id, id FROM public.permissions
  WHERE action IN ('read', 'create')
  ON CONFLICT DO NOTHING;

  -- Viewer: Read only
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT viewer_role_id, id FROM public.permissions
  WHERE action = 'read'
  ON CONFLICT DO NOTHING;
END $$;

-- =====================================================
-- 4. USER_ROLES TABLE (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

COMMENT ON TABLE public.user_roles IS 'Assigns roles to users';

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

-- Assign admin role to existing admin user
DO $$
DECLARE
  admin_user_id UUID;
  admin_role_id UUID;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@ideaonaction.local' LIMIT 1;
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';

  IF admin_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id, assigned_by)
    VALUES (admin_user_id, admin_role_id, admin_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- 5. AUDIT_LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', etc.
  resource TEXT NOT NULL, -- 'service', 'blog', 'user', 'session', etc.
  resource_id TEXT, -- ID of affected resource
  details JSONB, -- Additional context (old/new values, IP, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Tracks all user actions for security and compliance';

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- =====================================================
-- 6. HELPER FUNCTIONS (Must be defined before RLS policies)
-- =====================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID,
  p_permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    INNER JOIN public.role_permissions ON user_roles.role_id = role_permissions.role_id
    INNER JOIN public.permissions ON role_permissions.permission_id = permissions.id
    WHERE user_roles.user_id = p_user_id
      AND permissions.name = p_permission_name
  ) INTO v_has_permission;

  RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name TEXT, resource TEXT, action TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT permissions.name::TEXT, permissions.resource::TEXT, permissions.action::TEXT
  FROM public.user_roles
  INNER JOIN public.role_permissions ON user_roles.role_id = role_permissions.role_id
  INNER JOIN public.permissions ON role_permissions.permission_id = permissions.id
  WHERE user_roles.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log action
CREATE OR REPLACE FUNCTION public.log_action(
  p_user_id UUID,
  p_action TEXT,
  p_resource TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource, resource_id, details)
  VALUES (p_user_id, p_action, p_resource, p_resource_id, p_details)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- Roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles are viewable by everyone"
  ON public.roles FOR SELECT
  USING (true);

-- Permissions table
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permissions are viewable by everyone"
  ON public.permissions FOR SELECT
  USING (true);

-- Role_permissions table
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role permissions are viewable by everyone"
  ON public.role_permissions FOR SELECT
  USING (true);

-- User_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (
    public.user_has_permission(auth.uid(), 'user:manage')
  );

CREATE POLICY "Admins can assign roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    public.user_has_permission(auth.uid(), 'user:manage')
  );

CREATE POLICY "Admins can revoke roles"
  ON public.user_roles FOR DELETE
  USING (
    public.user_has_permission(auth.uid(), 'user:manage')
  );

-- Audit_logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    public.user_has_permission(auth.uid(), 'system:audit')
  );

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);
