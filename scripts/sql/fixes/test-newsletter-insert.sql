-- ============================================
-- Test Newsletter Insert
-- Direct INSERT test to verify permissions
-- ============================================

-- 1. Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'newsletter_subscriptions';

-- 2. Check table grants
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'newsletter_subscriptions';

-- 3. Try direct INSERT as service role (should always work)
INSERT INTO public.newsletter_subscriptions (email, status)
VALUES ('test-service-role@example.com', 'confirmed')
RETURNING *;

-- 4. Check if data was inserted
SELECT * FROM public.newsletter_subscriptions;

-- Clean up test data
DELETE FROM public.newsletter_subscriptions WHERE email LIKE 'test-%';
