-- Fix admins table RLS policy: Remove circular dependency
-- Issue: useIsAdmin needs to query admins table, but RLS policy requires querying admins table to check if user is admin
-- Solution: Allow authenticated users to check their own admin status

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;
DROP POLICY IF EXISTS "Users can check their own admin status" ON public.admins;

-- Create single simple policy: Authenticated users can see their own record
-- This prevents circular dependency and allows useIsAdmin to work
CREATE POLICY "Users can view their own admin record"
  ON public.admins
  FOR SELECT
  USING (auth.uid() = user_id);
