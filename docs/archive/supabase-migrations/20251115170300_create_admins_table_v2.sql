-- CMS-001 (v2): Create admins table with fixed RLS policies
-- Purpose: Manage admin users with role-based permissions (Super Admin, Admin, Editor)
-- Fix: Remove infinite recursion in RLS policies

-- Drop existing table if exists (to start clean)
DROP TABLE IF EXISTS public.admins CASCADE;

-- Create admins table
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'editor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign key to auth.users (soft reference, no constraint)
  -- This is by design in Supabase - auth schema is managed separately
  CONSTRAINT admins_user_id_unique UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_admins_user_id ON public.admins(user_id);
CREATE INDEX idx_admins_role ON public.admins(role);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (Fixed - No infinite recursion)
-- =====================================================

-- SELECT: All authenticated users can view admins list
-- (No recursion - doesn't check admins table itself)
CREATE POLICY "Authenticated users can view admins"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Only existing super admins can add new admins
-- Use security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = user_uuid
      AND role = 'super_admin'
  );
END;
$$;

CREATE POLICY "Super admins can insert admins"
  ON public.admins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
  );

-- UPDATE: Only super admins can update admin records
CREATE POLICY "Super admins can update admins"
  ON public.admins
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
  );

-- DELETE: Only super admins can delete admin records
CREATE POLICY "Super admins can delete admins"
  ON public.admins
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
  );

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION update_admins_updated_at();

-- Comments
COMMENT ON TABLE public.admins IS 'CMS Admin users with role-based permissions (v2 - fixed RLS)';
COMMENT ON COLUMN public.admins.role IS 'Admin role: super_admin (full access), admin (content management), editor (create/edit only)';
COMMENT ON COLUMN public.admins.user_id IS 'Foreign key to auth.users, unique constraint ensures one admin record per user';
COMMENT ON FUNCTION public.is_super_admin IS 'Security definer function to check super admin status without recursion';

-- Grant permissions
GRANT SELECT ON public.admins TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admins TO authenticated;

-- =====================================================
-- SEED DATA: Create initial super admin
-- =====================================================
-- Note: You must manually update the user_id to match your admin user

-- Example: Insert super admin (replace with your actual user ID)
-- INSERT INTO public.admins (user_id, role)
-- VALUES ('YOUR_USER_ID_HERE', 'super_admin')
-- ON CONFLICT (user_id) DO NOTHING;

-- To get your user ID, run in Supabase SQL Editor:
-- SELECT id, email FROM auth.users WHERE email = 'admin@ideaonaction.local';
