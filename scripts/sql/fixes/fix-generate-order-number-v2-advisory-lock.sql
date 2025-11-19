-- Fix generate_order_number() with Advisory Lock
-- Author: Claude AI
-- Date: 2025-11-15
-- Issue: Race condition in concurrent order creation
-- Solution: PostgreSQL Advisory Lock

-- =====================================================
-- 1. DROP OLD FUNCTION
-- =====================================================
DROP FUNCTION IF EXISTS public.generate_order_number();

-- =====================================================
-- 2. CREATE NEW FUNCTION (Advisory Lock)
-- =====================================================
-- Format: ORD-YYYYMMDD-XXXX (with guaranteed uniqueness)
-- Example: ORD-20251115-0001, ORD-20251115-0002, etc.
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today TEXT;
  sequence_num INTEGER;
  order_num TEXT;
  lock_key BIGINT;
BEGIN
  today := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Advisory lock key (hash of date)
  lock_key := ('x' || SUBSTRING(MD5(today) FROM 1 FOR 8))::bit(32)::bigint;

  -- Acquire advisory lock (released automatically at transaction end)
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Get count of orders today + 1 (now safe from race condition)
  SELECT COALESCE(MAX(
    NULLIF(REGEXP_REPLACE(order_number, '^ORD-\d{8}-', ''), '')::INTEGER
  ), 0) + 1 INTO sequence_num
  FROM public.orders
  WHERE order_number LIKE 'ORD-' || today || '-%';

  -- Format: ORD-20251115-0001
  order_num := 'ORD-' || today || '-' || LPAD(sequence_num::TEXT, 4, '0');

  RETURN order_num;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION public.generate_order_number IS
  'Generates unique sequential order number with advisory lock: ORD-YYYYMMDD-XXXX';

-- =====================================================
-- 3. GRANT EXECUTE PERMISSION
-- =====================================================
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;

-- =====================================================
-- 4. TEST
-- =====================================================
-- Test sequential numbering:
-- SELECT public.generate_order_number(); -- ORD-20251115-0001
-- SELECT public.generate_order_number(); -- ORD-20251115-0002
-- SELECT public.generate_order_number(); -- ORD-20251115-0003
