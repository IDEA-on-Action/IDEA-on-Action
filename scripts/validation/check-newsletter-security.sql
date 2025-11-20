-- ============================================
-- Newsletter Security Validation Script
-- ============================================
-- Run this after applying 20251121000000_fix_newsletter_security_issues.sql
--
-- Usage:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f scripts/validation/check-newsletter-security.sql
--
-- Expected: All checks should return ✅ PASS

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'Newsletter Security Validation Script'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- ============================================
-- CHECK 1: View does NOT expose auth.users
-- ============================================
\echo '🔍 CHECK 1: Verify newsletter_subscribers view does NOT reference auth.users'
\echo ''

DO $$
DECLARE
  view_definition TEXT;
  has_auth_users BOOLEAN;
BEGIN
  -- Get view definition
  SELECT pg_get_viewdef('public.newsletter_subscribers'::regclass, true)
  INTO view_definition;

  -- Check if view references auth.users
  has_auth_users := view_definition LIKE '%auth.users%';

  IF has_auth_users THEN
    RAISE NOTICE '❌ FAIL: View still references auth.users table';
    RAISE NOTICE 'View definition: %', view_definition;
  ELSE
    RAISE NOTICE '✅ PASS: View does NOT reference auth.users';
  END IF;
END $$;

\echo ''

-- ============================================
-- CHECK 2: View uses ONLY newsletter_email
-- ============================================
\echo '🔍 CHECK 2: Verify view uses newsletter_email (not COALESCE fallback)'
\echo ''

DO $$
DECLARE
  view_definition TEXT;
  has_coalesce BOOLEAN;
BEGIN
  SELECT pg_get_viewdef('public.newsletter_subscribers'::regclass, true)
  INTO view_definition;

  has_coalesce := view_definition LIKE '%COALESCE%';

  IF has_coalesce THEN
    RAISE NOTICE '⚠️  WARN: View uses COALESCE (check if auth.users is involved)';
    RAISE NOTICE 'View definition: %', view_definition;
  ELSE
    RAISE NOTICE '✅ PASS: View uses direct column reference';
  END IF;
END $$;

\echo ''

-- ============================================
-- CHECK 3: Functions use SECURITY INVOKER
-- ============================================
\echo '🔍 CHECK 3: Verify functions use SECURITY INVOKER (not SECURITY DEFINER)'
\echo ''

SELECT
  p.proname as function_name,
  CASE
    WHEN p.prosecdef THEN '❌ FAIL: SECURITY DEFINER'
    ELSE '✅ PASS: SECURITY INVOKER'
  END as security_status,
  p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'subscribe_to_newsletter',
    'unsubscribe_from_newsletter',
    'get_newsletter_subscribers'
  )
ORDER BY p.proname;

\echo ''

-- ============================================
-- CHECK 4: RLS is enabled on user_profiles
-- ============================================
\echo '🔍 CHECK 4: Verify RLS is enabled on user_profiles table'
\echo ''

SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ PASS: RLS enabled'
    ELSE '❌ FAIL: RLS NOT enabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

\echo ''

-- ============================================
-- CHECK 5: Required RLS policies exist
-- ============================================
\echo '🔍 CHECK 5: Verify required RLS policies exist on user_profiles'
\echo ''

WITH expected_policies AS (
  SELECT unnest(ARRAY[
    'Admins can view newsletter subscribers',
    'Users can view own newsletter subscription',
    'Users can update own newsletter subscription'
  ]) as expected_name
),
actual_policies AS (
  SELECT policyname
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND policyname LIKE '%newsletter%'
)
SELECT
  e.expected_name,
  CASE
    WHEN a.policyname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM expected_policies e
LEFT JOIN actual_policies a ON e.expected_name = a.policyname
ORDER BY e.expected_name;

\echo ''

-- ============================================
-- CHECK 6: Permissions granted correctly
-- ============================================
\echo '🔍 CHECK 6: Verify permissions on view and functions'
\echo ''

-- Check view permissions
\echo 'View permissions:'
SELECT
  grantee,
  privilege_type,
  CASE
    WHEN grantee = 'authenticated' AND privilege_type = 'SELECT' THEN '✅ CORRECT'
    WHEN grantee = 'anon' THEN '❌ SHOULD BE REVOKED'
    ELSE 'ℹ️  INFO'
  END as status
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'newsletter_subscribers'
ORDER BY grantee, privilege_type;

\echo ''

-- Check function permissions
\echo 'Function permissions:'
SELECT
  r.routine_name,
  p.grantee,
  p.privilege_type,
  CASE
    WHEN p.grantee = 'authenticated' THEN '✅ CORRECT'
    WHEN p.grantee = 'anon' THEN '❌ SHOULD BE REVOKED'
    ELSE 'ℹ️  INFO'
  END as status
FROM information_schema.routines r
LEFT JOIN information_schema.routine_privileges p
  ON r.routine_name = p.routine_name
  AND r.routine_schema = p.routine_schema
WHERE r.routine_schema = 'public'
  AND r.routine_name IN (
    'subscribe_to_newsletter',
    'unsubscribe_from_newsletter',
    'get_newsletter_subscribers'
  )
ORDER BY r.routine_name, p.grantee;

\echo ''

-- ============================================
-- CHECK 7: Email validation in function
-- ============================================
\echo '🔍 CHECK 7: Verify email validation exists in subscribe_to_newsletter'
\echo ''

DO $$
DECLARE
  func_source TEXT;
  has_email_validation BOOLEAN;
  has_null_check BOOLEAN;
BEGIN
  -- Get function source
  SELECT pg_get_functiondef(oid)
  INTO func_source
  FROM pg_proc
  WHERE proname = 'subscribe_to_newsletter'
    AND pronamespace = 'public'::regnamespace;

  -- Check for email validation
  has_email_validation := func_source LIKE '%!~%' OR func_source LIKE '%~%';
  has_null_check := func_source LIKE '%p_email IS NULL%' OR func_source LIKE '%p_email = ''''%';

  IF has_email_validation AND has_null_check THEN
    RAISE NOTICE '✅ PASS: Email validation and NULL check exist';
  ELSIF has_null_check THEN
    RAISE NOTICE '⚠️  WARN: NULL check exists but no regex validation';
  ELSIF has_email_validation THEN
    RAISE NOTICE '⚠️  WARN: Email validation exists but no NULL check';
  ELSE
    RAISE NOTICE '❌ FAIL: No email validation found';
  END IF;
END $$;

\echo ''

-- ============================================
-- CHECK 8: View only includes non-null emails
-- ============================================
\echo '🔍 CHECK 8: Verify view filters for non-null emails'
\echo ''

DO $$
DECLARE
  view_definition TEXT;
  has_null_filter BOOLEAN;
BEGIN
  SELECT pg_get_viewdef('public.newsletter_subscribers'::regclass, true)
  INTO view_definition;

  has_null_filter := view_definition LIKE '%IS NOT NULL%';

  IF has_null_filter THEN
    RAISE NOTICE '✅ PASS: View filters for non-null emails';
  ELSE
    RAISE NOTICE '⚠️  WARN: View may include null emails';
  END IF;
END $$;

\echo ''

-- ============================================
-- CHECK 9: Admin function has explicit auth check
-- ============================================
\echo '🔍 CHECK 9: Verify get_newsletter_subscribers has admin check'
\echo ''

DO $$
DECLARE
  func_source TEXT;
  has_admin_check BOOLEAN;
BEGIN
  SELECT pg_get_functiondef(oid)
  INTO func_source
  FROM pg_proc
  WHERE proname = 'get_newsletter_subscribers'
    AND pronamespace = 'public'::regnamespace;

  has_admin_check := func_source LIKE '%user_roles%' AND func_source LIKE '%admin%';

  IF has_admin_check THEN
    RAISE NOTICE '✅ PASS: Admin auth check exists';
  ELSE
    RAISE NOTICE '❌ FAIL: No admin auth check found';
  END IF;
END $$;

\echo ''

-- ============================================
-- SUMMARY
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'Validation Complete'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo 'Review results above. All checks should show ✅ PASS'
\echo 'If any checks show ❌ FAIL, re-apply migration or fix manually'
\echo ''
