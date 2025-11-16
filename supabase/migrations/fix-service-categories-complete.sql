-- ============================================================
-- Fix service_categories RLS and permissions (Complete)
-- ============================================================

-- 1. Grant SELECT permission to anon and authenticated roles
GRANT SELECT ON service_categories TO anon;
GRANT SELECT ON service_categories TO authenticated;

-- 2. Enable RLS (if not already enabled)
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies (clean slate)
DROP POLICY IF EXISTS "Allow anon to read service categories" ON service_categories;
DROP POLICY IF EXISTS "Allow authenticated to read service categories" ON service_categories;
DROP POLICY IF EXISTS "Public read access" ON service_categories;

-- 4. Create new RLS policies
-- Policy for anonymous users
CREATE POLICY "service_categories_anon_select"
  ON service_categories
  FOR SELECT
  TO anon
  USING (true);

-- Policy for authenticated users
CREATE POLICY "service_categories_authenticated_select"
  ON service_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Verify display_order column exists (add if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'service_categories'
      AND column_name = 'display_order'
  ) THEN
    ALTER TABLE service_categories ADD COLUMN display_order INTEGER DEFAULT 0;
    
    -- Set display_order for existing categories
    UPDATE service_categories
    SET display_order = (
      CASE name
        WHEN '개발 서비스' THEN 1
        WHEN 'AI 솔루션' THEN 2
        WHEN '데이터 분석' THEN 3
        WHEN '컨설팅' THEN 4
        WHEN '교육 & 트레이닝' THEN 5
        ELSE 99
      END
    );
  END IF;
END $$;

-- 6. Verify results
SELECT
  'Columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'service_categories'
ORDER BY ordinal_position;

SELECT
  'Policies' as check_type,
  policyname,
  roles::text,
  cmd,
  qual::text
FROM pg_policies
WHERE tablename = 'service_categories';

SELECT
  'Grants' as check_type,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'service_categories'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;
