-- Check service_categories table schema
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'service_categories'
ORDER BY ordinal_position;

-- Check existing RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'service_categories';

-- Check table grants
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'service_categories'
  AND grantee IN ('anon', 'authenticated', 'public');
