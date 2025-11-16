-- Extend user_profiles table for newsletter subscriptions
-- This migration adds newsletter-related columns to existing user_profiles
-- Note: This runs conditionally only if user_profiles table exists

DO $$
BEGIN
  -- Check if user_profiles table exists
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  ) THEN
    -- Add newsletter columns
    ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS newsletter_subscribed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS newsletter_email TEXT; -- Optional: different email for newsletter

    -- Create index for newsletter queries
    CREATE INDEX IF NOT EXISTS idx_user_profiles_newsletter ON public.user_profiles(newsletter_subscribed)
    WHERE newsletter_subscribed = true;
  END IF;
END $$;

-- Create newsletter-related views and functions (conditionally)
DO $$
BEGIN
  -- Check if user_profiles table exists
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  ) THEN
    -- Create newsletter_subscribers view
    CREATE OR REPLACE VIEW public.newsletter_subscribers AS
    SELECT
      id,
      user_id,
      COALESCE(newsletter_email, (SELECT email FROM auth.users WHERE id = user_id)) as email,
      display_name,
      newsletter_subscribed_at as subscribed_at,
      created_at
    FROM public.user_profiles
    WHERE newsletter_subscribed = true;

    -- Add comments
    COMMENT ON COLUMN public.user_profiles.newsletter_subscribed IS 'Whether user is subscribed to newsletter';
    COMMENT ON COLUMN public.user_profiles.newsletter_subscribed_at IS 'When user subscribed to newsletter';
    COMMENT ON COLUMN public.user_profiles.newsletter_email IS 'Optional separate email for newsletter (if different from auth email)';
    COMMENT ON VIEW public.newsletter_subscribers IS 'View of all newsletter subscribers with their emails';
  END IF;
END $$;

-- Function to subscribe to newsletter
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(p_email TEXT DEFAULT NULL)
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
  SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id = current_user_id) INTO profile_exists;

  IF profile_exists THEN
    -- Update existing profile
    UPDATE public.user_profiles
    SET
      newsletter_subscribed = true,
      newsletter_subscribed_at = NOW(),
      newsletter_email = p_email
    WHERE user_id = current_user_id;
  ELSE
    -- Create new profile with newsletter subscription
    INSERT INTO public.user_profiles (user_id, newsletter_subscribed, newsletter_subscribed_at, newsletter_email)
    VALUES (current_user_id, true, NOW(), p_email);
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsubscribe from newsletter
CREATE OR REPLACE FUNCTION unsubscribe_from_newsletter()
RETURNS BOOLEAN AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
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

  UPDATE public.user_profiles
  SET newsletter_subscribed = false
  WHERE user_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION subscribe_to_newsletter IS 'Subscribe current user to newsletter';
COMMENT ON FUNCTION unsubscribe_from_newsletter IS 'Unsubscribe current user from newsletter';
