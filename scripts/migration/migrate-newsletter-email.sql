-- ============================================
-- Pre-Migration: Populate newsletter_email from auth.users
-- ============================================
-- Run this BEFORE applying 20251121000000_fix_newsletter_security_issues.sql
-- to prevent data loss
--
-- Usage:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f scripts/migration/migrate-newsletter-email.sql
--   OR
--   supabase db execute -f scripts/migration/migrate-newsletter-email.sql

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'Pre-Migration: Populate newsletter_email from auth.users'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- ============================================
-- STEP 1: Check current state
-- ============================================
\echo '🔍 STEP 1: Checking current state...'
\echo ''

DO $$
DECLARE
  total_subscribed INTEGER;
  with_email INTEGER;
  without_email INTEGER;
BEGIN
  -- Count total newsletter subscribers
  SELECT COUNT(*) INTO total_subscribed
  FROM public.user_profiles
  WHERE newsletter_subscribed = true;

  -- Count subscribers with newsletter_email
  SELECT COUNT(*) INTO with_email
  FROM public.user_profiles
  WHERE newsletter_subscribed = true
    AND newsletter_email IS NOT NULL;

  -- Count subscribers without newsletter_email
  SELECT COUNT(*) INTO without_email
  FROM public.user_profiles
  WHERE newsletter_subscribed = true
    AND newsletter_email IS NULL;

  RAISE NOTICE '📊 Current State:';
  RAISE NOTICE '   Total subscribers: %', total_subscribed;
  RAISE NOTICE '   With newsletter_email: %', with_email;
  RAISE NOTICE '   Without newsletter_email: % (will be migrated)', without_email;
  RAISE NOTICE '';

  IF without_email = 0 THEN
    RAISE NOTICE '✅ No migration needed - all subscribers have newsletter_email';
  END IF;
END $$;

\echo ''

-- ============================================
-- STEP 2: Backup existing data
-- ============================================
\echo '💾 STEP 2: Creating backup table...'
\echo ''

-- Create backup table
CREATE TABLE IF NOT EXISTS public._migration_backup_user_profiles_newsletter AS
SELECT
  id,
  user_id,
  newsletter_subscribed,
  newsletter_email,
  newsletter_subscribed_at,
  created_at
FROM public.user_profiles
WHERE newsletter_subscribed = true;

\echo '✅ Backup table created: _migration_backup_user_profiles_newsletter'
\echo ''

-- ============================================
-- STEP 3: Migrate newsletter_email from auth.users
-- ============================================
\echo '🔄 STEP 3: Migrating newsletter_email from auth.users...'
\echo ''

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update newsletter_email from auth.users
  WITH updates AS (
    UPDATE public.user_profiles up
    SET newsletter_email = au.email
    FROM auth.users au
    WHERE up.user_id = au.id
      AND up.newsletter_subscribed = true
      AND up.newsletter_email IS NULL
      AND au.email IS NOT NULL
    RETURNING up.id
  )
  SELECT COUNT(*) INTO updated_count FROM updates;

  RAISE NOTICE '✅ Updated % rows with email from auth.users', updated_count;
END $$;

\echo ''

-- ============================================
-- STEP 4: Verify migration
-- ============================================
\echo '🔍 STEP 4: Verifying migration...'
\echo ''

DO $$
DECLARE
  total_subscribed INTEGER;
  with_email INTEGER;
  without_email INTEGER;
  success_rate NUMERIC;
BEGIN
  -- Count total newsletter subscribers
  SELECT COUNT(*) INTO total_subscribed
  FROM public.user_profiles
  WHERE newsletter_subscribed = true;

  -- Count subscribers with newsletter_email
  SELECT COUNT(*) INTO with_email
  FROM public.user_profiles
  WHERE newsletter_subscribed = true
    AND newsletter_email IS NOT NULL;

  -- Count subscribers without newsletter_email
  SELECT COUNT(*) INTO without_email
  FROM public.user_profiles
  WHERE newsletter_subscribed = true
    AND newsletter_email IS NULL;

  -- Calculate success rate
  IF total_subscribed > 0 THEN
    success_rate := (with_email::NUMERIC / total_subscribed::NUMERIC) * 100;
  ELSE
    success_rate := 0;
  END IF;

  RAISE NOTICE '📊 After Migration:';
  RAISE NOTICE '   Total subscribers: %', total_subscribed;
  RAISE NOTICE '   With newsletter_email: %', with_email;
  RAISE NOTICE '   Without newsletter_email: %', without_email;
  RAISE NOTICE '   Success rate: %%', ROUND(success_rate, 2);
  RAISE NOTICE '';

  IF without_email > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % subscribers still without email', without_email;
    RAISE NOTICE '   These users may not appear in newsletter_subscribers view after security fix';
  ELSE
    RAISE NOTICE '✅ SUCCESS: All subscribers have newsletter_email';
  END IF;
END $$;

\echo ''

-- ============================================
-- STEP 5: Show sample data
-- ============================================
\echo '📋 STEP 5: Sample migrated data (first 5 rows):'
\echo ''

SELECT
  user_id,
  newsletter_email,
  newsletter_subscribed,
  newsletter_subscribed_at
FROM public.user_profiles
WHERE newsletter_subscribed = true
ORDER BY newsletter_subscribed_at DESC
LIMIT 5;

\echo ''

-- ============================================
-- STEP 6: Show orphaned subscribers (if any)
-- ============================================
\echo '⚠️  STEP 6: Checking for orphaned subscribers (no auth.users match):'
\echo ''

SELECT
  up.user_id,
  up.newsletter_subscribed_at,
  CASE
    WHEN au.id IS NULL THEN '❌ No auth.users match'
    WHEN au.email IS NULL THEN '⚠️  auth.users has no email'
    ELSE '✅ OK'
  END as status
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE up.newsletter_subscribed = true
  AND up.newsletter_email IS NULL;

\echo ''

-- ============================================
-- SUMMARY
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'Migration Complete'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo 'Next Steps:'
\echo '1. Review migration results above'
\echo '2. If success rate = 100%, proceed with security migration:'
\echo '   supabase db reset (local)'
\echo '   OR'
\echo '   supabase db push (production)'
\echo ''
\echo '3. If there are orphaned subscribers, investigate:'
\echo '   - Check if auth.users records exist'
\echo '   - Check if auth.users.email is populated'
\echo '   - Manually update newsletter_email if needed'
\echo ''
\echo 'Rollback (if needed):'
\echo '  UPDATE public.user_profiles up'
\echo '  SET newsletter_email = bkp.newsletter_email'
\echo '  FROM _migration_backup_user_profiles_newsletter bkp'
\echo '  WHERE up.id = bkp.id;'
\echo ''
