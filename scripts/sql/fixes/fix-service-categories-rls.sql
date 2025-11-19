-- Fix service_categories RLS policy for anon users
-- Allow anonymous users to read service categories

-- Grant SELECT permission to anon role
GRANT SELECT ON service_categories TO anon;

-- Create RLS policy for anon users
DROP POLICY IF EXISTS "Allow anon to read service categories" ON service_categories;
CREATE POLICY "Allow anon to read service categories"
  ON service_categories
  FOR SELECT
  TO anon
  USING (true);

-- Verify
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'service_categories';
