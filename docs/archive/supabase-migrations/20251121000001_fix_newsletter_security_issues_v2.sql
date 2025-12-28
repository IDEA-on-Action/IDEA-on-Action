-- Fix Security Issues for newsletter_subscribers view
-- Issue 1: Exposed Auth Users - Remove auth.users exposure
-- Issue 2: Security Definer - Remove SECURITY DEFINER and use proper RLS
-- VERSION 2: Fixed to use roles table join instead of direct role column
-- NOTE: This migration is conditional and will skip if prerequisites are not met

-- ============================================
-- STEP 1-2: Drop and recreate view (conditional)
-- ============================================
DO $$
BEGIN
  -- Check if user_profiles table exists with newsletter_email column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'newsletter_email'
  ) THEN
    -- Drop existing view
    DROP VIEW IF EXISTS public.newsletter_subscribers;

    -- Create secure view WITHOUT auth.users exposure
    EXECUTE '
      CREATE OR REPLACE VIEW public.newsletter_subscribers AS
      SELECT
        id,
        user_id,
        newsletter_email as email,
        display_name,
        newsletter_subscribed_at as subscribed_at,
        created_at
      FROM public.user_profiles
      WHERE newsletter_subscribed = true
        AND newsletter_email IS NOT NULL
    ';

    RAISE NOTICE 'newsletter_subscribers view created successfully (v2)';
  ELSE
    RAISE NOTICE 'Skipping newsletter_subscribers view v2 - user_profiles.newsletter_email column not found';
  END IF;
END $$;

-- ============================================
-- STEP 3: Add RLS policies (conditional)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  ) THEN
    -- Enable RLS
    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

    -- Policy 1: Admins can view all newsletter subscribers
    DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.user_profiles;

    -- Check if user_roles and roles tables exist
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles'
    ) AND EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'roles'
    ) THEN
      CREATE POLICY "Admins can view newsletter subscribers"
      ON public.user_profiles
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.roles r ON ur.role_id = r.id
          WHERE ur.user_id = auth.uid()
          AND r.name IN ('admin', 'super_admin')
        )
        OR user_id = auth.uid()
      );
    END IF;

    -- Policy 2: Users can only view their own subscription
    DROP POLICY IF EXISTS "Users can view own newsletter subscription" ON public.user_profiles;
    CREATE POLICY "Users can view own newsletter subscription"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

    -- Policy 3: Users can update their own subscription
    DROP POLICY IF EXISTS "Users can update own newsletter subscription" ON public.user_profiles;
    CREATE POLICY "Users can update own newsletter subscription"
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

    RAISE NOTICE 'RLS policies applied successfully (v2)';
  ELSE
    RAISE NOTICE 'Skipping RLS policies v2 - user_profiles table not found';
  END IF;
END $$;

-- ============================================
-- STEP 4: Update subscribe_to_newsletter function
-- ============================================
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  profile_exists BOOLEAN;
  table_exists BOOLEAN;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to subscribe';
  END IF;

  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required for newsletter subscription';
  END IF;

  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'user_profiles table does not exist yet';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_profiles
    WHERE user_id = current_user_id
  ) INTO profile_exists;

  IF profile_exists THEN
    UPDATE public.user_profiles
    SET
      newsletter_subscribed = true,
      newsletter_subscribed_at = NOW(),
      newsletter_email = p_email
    WHERE user_id = current_user_id;
  ELSE
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
SECURITY INVOKER;

-- ============================================
-- STEP 5: Update unsubscribe_from_newsletter function
-- ============================================
CREATE OR REPLACE FUNCTION unsubscribe_from_newsletter()
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  table_exists BOOLEAN;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to unsubscribe';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'user_profiles table does not exist yet';
  END IF;

  UPDATE public.user_profiles
  SET newsletter_subscribed = false
  WHERE user_id = current_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER;

-- ============================================
-- STEP 6: Admin function (conditional)
-- ============================================
DO $$
BEGIN
  -- Only create get_newsletter_subscribers if both role tables exist
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles'
  ) AND EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'roles'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'newsletter_email'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION get_newsletter_subscribers()
      RETURNS TABLE (
        id UUID,
        user_id UUID,
        email TEXT,
        display_name TEXT,
        subscribed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ
      ) AS $func$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.roles r ON ur.role_id = r.id
          WHERE ur.user_id = auth.uid()
          AND r.name IN (''admin'', ''super_admin'')
        ) THEN
          RAISE EXCEPTION ''Only admins can access newsletter subscribers list'';
        END IF;

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
      $func$ LANGUAGE plpgsql SECURITY INVOKER
    ';
    RAISE NOTICE 'get_newsletter_subscribers function created successfully';
  ELSE
    RAISE NOTICE 'Skipping get_newsletter_subscribers - prerequisites not met';
  END IF;
END $$;

-- ============================================
-- STEP 7-8: Comments and permissions (conditional)
-- ============================================
DO $$
BEGIN
  -- View comments and permissions
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public'
    AND viewname = 'newsletter_subscribers'
  ) THEN
    COMMENT ON VIEW public.newsletter_subscribers IS
    'Secure view of newsletter subscribers - does NOT expose auth.users data';
    GRANT SELECT ON public.newsletter_subscribers TO authenticated;
    REVOKE SELECT ON public.newsletter_subscribers FROM anon;
  END IF;

  -- Function comments and permissions
  COMMENT ON FUNCTION subscribe_to_newsletter(TEXT) IS
  'Subscribe current user to newsletter (SECURITY INVOKER - uses RLS)';

  COMMENT ON FUNCTION unsubscribe_from_newsletter() IS
  'Unsubscribe current user from newsletter (SECURITY INVOKER - uses RLS)';

  GRANT EXECUTE ON FUNCTION subscribe_to_newsletter(TEXT) TO authenticated;
  GRANT EXECUTE ON FUNCTION unsubscribe_from_newsletter() TO authenticated;

  REVOKE EXECUTE ON FUNCTION subscribe_to_newsletter(TEXT) FROM anon;
  REVOKE EXECUTE ON FUNCTION unsubscribe_from_newsletter() FROM anon;

  -- get_newsletter_subscribers function (if exists)
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_newsletter_subscribers'
    AND pronamespace = 'public'::regnamespace
  ) THEN
    COMMENT ON FUNCTION get_newsletter_subscribers() IS
    'Admin-only function to get all newsletter subscribers with proper auth check';
    GRANT EXECUTE ON FUNCTION get_newsletter_subscribers() TO authenticated;
    REVOKE EXECUTE ON FUNCTION get_newsletter_subscribers() FROM anon;
  END IF;

  RAISE NOTICE 'Newsletter security fixes v2 applied successfully';
END $$;
