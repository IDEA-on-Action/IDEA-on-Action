-- Fix generate_order_number() to prevent race condition
-- Author: Claude AI
-- Date: 2025-11-15
-- Issue: Duplicate order numbers when concurrent requests occur

-- =====================================================
-- 1. DROP OLD FUNCTION
-- =====================================================
DROP FUNCTION IF EXISTS public.generate_order_number();

-- =====================================================
-- 2. CREATE NEW FUNCTION (Timestamp + Random)
-- =====================================================
-- Format: ORD-YYYYMMDD-HHMMSS-XXX
-- Example: ORD-20251115-143052-A3F
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
  order_num TEXT;
BEGIN
  -- Timestamp: YYYYMMDD-HHMMSS
  timestamp_part := TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');

  -- Random: 3 characters (uppercase alphanumeric)
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 3));

  -- Combine: ORD-20251115-143052-A3F
  order_num := 'ORD-' || timestamp_part || '-' || random_part;

  RETURN order_num;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION public.generate_order_number IS
  'Generates unique order number with timestamp and random suffix: ORD-YYYYMMDD-HHMMSS-XXX';

-- =====================================================
-- 3. GRANT EXECUTE PERMISSION
-- =====================================================
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;

-- =====================================================
-- 4. TEST
-- =====================================================
-- SELECT public.generate_order_number();
-- Expected output: ORD-20251115-143052-A3F (unique every time)
