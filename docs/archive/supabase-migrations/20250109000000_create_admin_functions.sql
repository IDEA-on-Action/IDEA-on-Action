-- Create admin helper functions early for RLS policies
-- These functions are marked SECURITY DEFINER to avoid RLS recursion

-- Check if user is any type of admin
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if admins table exists first
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'admins'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = user_uuid
    );
  ELSE
    -- Fallback: No admins yet, return false
    RETURN FALSE;
  END IF;
END;
$$;

-- Check if user can delete (super_admin or admin, not editor)
CREATE OR REPLACE FUNCTION public.can_admin_delete(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if admins table exists first
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'admins'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = user_uuid
        AND role IN ('super_admin', 'admin')
    );
  ELSE
    -- Fallback: No admins yet, return false
    RETURN FALSE;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.is_admin_user IS 'Check if user is any type of admin (security definer to avoid recursion)';
COMMENT ON FUNCTION public.can_admin_delete IS 'Check if user can delete (super_admin or admin, not editor)';
