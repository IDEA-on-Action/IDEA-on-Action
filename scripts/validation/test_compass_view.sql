-- Test Compass Integration View
-- Run this script to verify the view returns expected data.

-- 1. Check if view exists
SELECT EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
    AND viewname = 'compass_integration_view'
) as view_exists;

-- 2. Sample Data Check (Limit 5)
SELECT *
FROM public.compass_integration_view
LIMIT 5;

-- 3. Check specific user (Replace with a valid UUID if testing manually)
-- SELECT * FROM public.compass_integration_view WHERE user_id = '...';
