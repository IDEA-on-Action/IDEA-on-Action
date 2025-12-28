-- CMS-001: Create admins table and RLS policies
-- Purpose: Manage admin users with role-based permissions (Super Admin, Admin, Editor)

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'editor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_admins_user_id ON public.admins(user_id);
CREATE INDEX idx_admins_role ON public.admins(role);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: 관리자만 조회 가능 (자신이 관리자인 경우에만)
CREATE POLICY "Admins can view all admins"
  ON public.admins
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- INSERT: Super Admin만 가능
CREATE POLICY "Super admins can insert admins"
  ON public.admins
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.admins WHERE role = 'super_admin'
    )
  );

-- UPDATE: Super Admin만 가능
CREATE POLICY "Super admins can update admins"
  ON public.admins
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.admins WHERE role = 'super_admin'
    )
  );

-- DELETE: Super Admin만 가능
CREATE POLICY "Super admins can delete admins"
  ON public.admins
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.admins WHERE role = 'super_admin'
    )
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
COMMENT ON TABLE public.admins IS 'CMS Admin users with role-based permissions';
COMMENT ON COLUMN public.admins.role IS 'Admin role: super_admin (full access), admin (content management), editor (create/edit only)';
COMMENT ON COLUMN public.admins.user_id IS 'Foreign key to auth.users, unique constraint ensures one admin record per user';

-- Grant permissions
GRANT SELECT ON public.admins TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admins TO authenticated;
