-- Fix Security Issues for newsletter_subscribers view
-- Issue 1: Exposed Auth Users - Remove auth.users exposure
-- Issue 2: Security Definer - Remove SECURITY DEFINER and use proper RLS

-- ============================================
-- STEP 1: Drop existing view
-- ============================================
DROP VIEW IF EXISTS public.newsletter_subscribers;

-- ============================================
-- STEP 2: Create secure view WITHOUT auth.users exposure
-- ============================================
-- This view ONLY exposes data from user_profiles table
-- and does NOT use SECURITY DEFINER
CREATE OR REPLACE VIEW public.newsletter_subscribers AS
SELECT
  id,
  user_id,
  newsletter_email as email,  -- Use ONLY newsletter_email from user_profiles
  display_name,
  newsletter_subscribed_at as subscribed_at,
  created_at
FROM public.user_profiles
WHERE newsletter_subscribed = true
  AND newsletter_email IS NOT NULL;  -- Ensure email exists

-- ============================================
-- STEP 3: Add RLS policies for the view
-- ============================================
-- Enable RLS on user_profiles if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can view all newsletter subscribers
DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.user_profiles;
CREATE POLICY "Admins can view newsletter subscribers"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  -- User is admin (check via roles table)
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'super_admin')
  )
  -- OR viewing own profile
  OR user_id = auth.uid()
);

-- Policy 2: Users can only view their own newsletter subscription
DROP POLICY IF EXISTS "Users can view own newsletter subscription" ON public.user_profiles;
CREATE POLICY "Users can view own newsletter subscription"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 3: Users can update their own newsletter subscription
DROP POLICY IF EXISTS "Users can update own newsletter subscription" ON public.user_profiles;
CREATE POLICY "Users can update own newsletter subscription"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- STEP 4: Update subscribe_to_newsletter function
-- ============================================
-- Remove SECURITY DEFINER and add proper auth checks
-- Drop existing function first (parameter signature changed: removed DEFAULT NULL)
DROP FUNCTION IF EXISTS subscribe_to_newsletter(TEXT);

CREATE OR REPLACE FUNCTION subscribe_to_newsletter(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  profile_exists BOOLEAN;
  table_exists BOOLEAN;
BEGIN
  current_user_id := auth.uid();

  -- Security check: Must be authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to subscribe';
  END IF;

  -- Security check: Email must be provided
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required for newsletter subscription';
  END IF;

  -- Validate email format (basic check)
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Check if user_profiles table exists
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'user_profiles table does not exist yet';
  END IF;

  -- Check if profile exists
  SELECT EXISTS(
    SELECT 1 FROM public.user_profiles
    WHERE user_id = current_user_id
  ) INTO profile_exists;

  IF profile_exists THEN
    -- Update existing profile (RLS will ensure user can only update own profile)
    UPDATE public.user_profiles
    SET
      newsletter_subscribed = true,
      newsletter_subscribed_at = NOW(),
      newsletter_email = p_email
    WHERE user_id = current_user_id;
  ELSE
    -- Create new profile with newsletter subscription
    INSERT INTO public.user_profiles (
      user_id,
      newsletter_subscribed,
      newsletter_subscribed_at,
      newsletter_email
    )
    VALUES (current_user_id, true, NOW(), p_email);
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER;  -- Use SECURITY INVOKER instead of SECURITY DEFINER

-- ============================================
-- STEP 5: Update unsubscribe_from_newsletter function
-- ============================================
-- Drop existing function first (security mode changed)
DROP FUNCTION IF EXISTS unsubscribe_from_newsletter();

CREATE OR REPLACE FUNCTION unsubscribe_from_newsletter()
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  table_exists BOOLEAN;
BEGIN
  current_user_id := auth.uid();

  -- Security check: Must be authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to unsubscribe';
  END IF;

  -- Check if user_profiles table exists
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'user_profiles table does not exist yet';
  END IF;

  -- Update subscription status (RLS will ensure user can only update own profile)
  UPDATE public.user_profiles
  SET newsletter_subscribed = false
  WHERE user_id = current_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER;  -- Use SECURITY INVOKER instead of SECURITY DEFINER

-- ============================================
-- STEP 6: Add admin function to get newsletter subscribers
-- ============================================
-- This function is for admin use only
-- Drop existing function first if exists
DROP FUNCTION IF EXISTS get_newsletter_subscribers();

CREATE OR REPLACE FUNCTION get_newsletter_subscribers()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  display_name TEXT,
  subscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Security check: Only admins can access (check via roles table)
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can access newsletter subscribers list';
  END IF;

  -- Return newsletter subscribers
  RETURN QUERY
  SELECT
    up.id,
    up.user_id,
    up.newsletter_email as email,
    up.display_name,
    up.newsletter_subscribed_at as subscribed_at,
    up.created_at
  FROM public.user_profiles up
  WHERE up.newsletter_subscribed = true
    AND up.newsletter_email IS NOT NULL
  ORDER BY up.newsletter_subscribed_at DESC;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER;

-- ============================================
-- STEP 7: Add comments
-- ============================================
COMMENT ON VIEW public.newsletter_subscribers IS
'Secure view of newsletter subscribers - does NOT expose auth.users data';

COMMENT ON FUNCTION subscribe_to_newsletter(TEXT) IS
'Subscribe current user to newsletter (SECURITY INVOKER - uses RLS)';

COMMENT ON FUNCTION unsubscribe_from_newsletter() IS
'Unsubscribe current user from newsletter (SECURITY INVOKER - uses RLS)';

COMMENT ON FUNCTION get_newsletter_subscribers() IS
'Admin-only function to get all newsletter subscribers with proper auth check';

-- ============================================
-- STEP 8: Grant permissions
-- ============================================
-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.newsletter_subscribers TO authenticated;

-- Grant EXECUTE on functions to authenticated users
GRANT EXECUTE ON FUNCTION subscribe_to_newsletter(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unsubscribe_from_newsletter() TO authenticated;
GRANT EXECUTE ON FUNCTION get_newsletter_subscribers() TO authenticated;

-- Revoke from anon (anonymous users should not access newsletter data)
REVOKE SELECT ON public.newsletter_subscribers FROM anon;
REVOKE EXECUTE ON FUNCTION subscribe_to_newsletter(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION unsubscribe_from_newsletter() FROM anon;
REVOKE EXECUTE ON FUNCTION get_newsletter_subscribers() FROM anon;
