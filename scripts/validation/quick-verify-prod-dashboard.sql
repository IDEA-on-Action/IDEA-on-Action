-- ================================================================
-- Quick Production Migration Verification (Dashboard Version)
-- ================================================================
-- Purpose: Fast verification for Supabase Dashboard SQL Editor
-- Run time: ~5 seconds
-- Compatible with: Supabase Dashboard, pgAdmin, any SQL client
-- ================================================================

-- Newsletter Security (5 critical checks)
SELECT '📧 Newsletter Security Checks' as section, '' as status, 1 as sort_order
UNION ALL
SELECT
  '1. View exists',
  CASE
    WHEN EXISTS(
      SELECT 1 FROM pg_views
      WHERE schemaname = 'public'
      AND viewname = 'newsletter_subscribers'
    )
    THEN '✅ PASS'
    ELSE '❌ FAIL: View missing'
  END,
  1
UNION ALL
SELECT
  '2. No auth.users exposure',
  CASE
    WHEN EXISTS(
      SELECT 1 FROM pg_views
      WHERE schemaname = 'public'
      AND viewname = 'newsletter_subscribers'
      AND definition NOT LIKE '%auth.users%'
    )
    THEN '✅ PASS'
    ELSE '❌ FAIL: auth.users still exposed'
  END,
  1
UNION ALL
SELECT
  '3. RLS policies (user_profiles)',
  CASE
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname LIKE '%newsletter%') >= 3
    THEN '✅ PASS (' || (SELECT COUNT(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname LIKE '%newsletter%') || ' policies)'
    ELSE '❌ FAIL: Found ' || (SELECT COUNT(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname LIKE '%newsletter%') || ' policies (expected 3+)'
  END,
  1
UNION ALL
SELECT
  '4. No SECURITY DEFINER functions',
  CASE
    WHEN (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prosecdef = true AND p.proname IN ('subscribe_to_newsletter', 'unsubscribe_from_newsletter', 'get_newsletter_subscribers')) = 0
    THEN '✅ PASS (All SECURITY INVOKER)'
    ELSE '❌ FAIL: ' || (SELECT COUNT(*)::text FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prosecdef = true AND p.proname IN ('subscribe_to_newsletter', 'unsubscribe_from_newsletter', 'get_newsletter_subscribers')) || ' DEFINER functions found'
  END,
  1
UNION ALL
SELECT
  '5. Anonymous access revoked',
  CASE
    WHEN NOT EXISTS(
      SELECT 1 FROM information_schema.table_privileges
      WHERE table_schema = 'public'
      AND table_name = 'newsletter_subscribers'
      AND grantee = 'anon'
      AND privilege_type = 'SELECT'
    )
    THEN '✅ PASS'
    ELSE '❌ FAIL: Anonymous still has SELECT access'
  END,
  1
UNION ALL
SELECT '', '', 1 -- Spacer
UNION ALL
SELECT '🔧 Function Search Path Checks' as section, '' as status, 2 as sort_order
UNION ALL
SELECT
  '6. Critical functions with search_path',
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND 'search_path=public, pg_temp' = ANY(p.proconfig)
      AND p.proname IN (
        'subscribe_to_newsletter', 'unsubscribe_from_newsletter', 'get_newsletter_subscribers',
        'generate_password_reset_token', 'verify_password_reset_token',
        'get_revenue_by_date', 'get_revenue_by_service', 'get_kpis'
      )
    ) >= 8
    THEN '✅ PASS (' || (SELECT COUNT(*)::text FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND 'search_path=public, pg_temp' = ANY(p.proconfig) AND p.proname IN ('subscribe_to_newsletter', 'unsubscribe_from_newsletter', 'get_newsletter_subscribers', 'generate_password_reset_token', 'verify_password_reset_token', 'get_revenue_by_date', 'get_revenue_by_service', 'get_kpis')) || '/8+ critical)'
    ELSE '⚠️ PARTIAL: ' || (SELECT COUNT(*)::text FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND 'search_path=public, pg_temp' = ANY(p.proconfig) AND p.proname IN ('subscribe_to_newsletter', 'unsubscribe_from_newsletter', 'get_newsletter_subscribers', 'generate_password_reset_token', 'verify_password_reset_token', 'get_revenue_by_date', 'get_revenue_by_service', 'get_kpis')) || '/8'
  END,
  2
UNION ALL
SELECT
  '7. Trigger functions with search_path',
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND 'search_path=public, pg_temp' = ANY(p.proconfig)
      AND (p.proname LIKE 'update_%_updated_at' OR p.proname LIKE 'set_cms_%')
    ) >= 20
    THEN '✅ PASS (' || (SELECT COUNT(*)::text FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND 'search_path=public, pg_temp' = ANY(p.proconfig) AND (p.proname LIKE 'update_%_updated_at' OR p.proname LIKE 'set_cms_%')) || '/44+ triggers)'
    ELSE '⚠️ PARTIAL: ' || (SELECT COUNT(*)::text FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND 'search_path=public, pg_temp' = ANY(p.proconfig) AND (p.proname LIKE 'update_%_updated_at' OR p.proname LIKE 'set_cms_%')) || '/44'
  END,
  2
UNION ALL
SELECT '', '', 2 -- Spacer
UNION ALL
SELECT '📊 Overall Status' as section, '' as status, 3 as sort_order
UNION ALL
SELECT
  'FINAL VERIFICATION',
  CASE
    WHEN (
      -- All 5 Newsletter checks pass
      EXISTS(SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'newsletter_subscribers')
      AND EXISTS(SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'newsletter_subscribers' AND definition NOT LIKE '%auth.users%')
      AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname LIKE '%newsletter%') >= 3
      AND (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prosecdef = true AND p.proname IN ('subscribe_to_newsletter', 'unsubscribe_from_newsletter', 'get_newsletter_subscribers')) = 0
      AND NOT EXISTS(SELECT 1 FROM information_schema.table_privileges WHERE table_schema = 'public' AND table_name = 'newsletter_subscribers' AND grantee = 'anon' AND privilege_type = 'SELECT')
      -- Both Function Search Path checks pass (at least 8 critical + 20 triggers)
      AND (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND 'search_path=public, pg_temp' = ANY(p.proconfig) AND p.proname IN ('subscribe_to_newsletter', 'unsubscribe_from_newsletter', 'get_newsletter_subscribers', 'generate_password_reset_token', 'verify_password_reset_token', 'get_revenue_by_date', 'get_revenue_by_service', 'get_kpis')) >= 8
      AND (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND 'search_path=public, pg_temp' = ANY(p.proconfig) AND (p.proname LIKE 'update_%_updated_at' OR p.proname LIKE 'set_cms_%')) >= 20
    )
    THEN '✅ ALL MIGRATIONS VERIFIED'
    ELSE '❌ SOME CHECKS FAILED - Review above results'
  END,
  3
ORDER BY sort_order, section;
