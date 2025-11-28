-- Fix RLS Policies: Replace user_roles with admins
-- 기존에 잘못된 user_roles 참조를 admins로 수정
-- Date: 2025-11-28
-- Version: 1.6.1

-- ============================================================
-- 1. oauth_clients 정책 수정
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage oauth clients" ON oauth_clients;
CREATE POLICY "Admins can manage oauth clients"
  ON oauth_clients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- ============================================================
-- 2. plan_features 정책 수정
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage plan features" ON plan_features;
CREATE POLICY "Admins can manage plan features"
  ON plan_features
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- ============================================================
-- 3. orders 정책 수정
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.role IN ('admin', 'super_admin')
      AND admins.is_active = true
    )
  );

-- ============================================================
-- 4. order_items 정책 수정
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
CREATE POLICY "Admins can view all order items"
  ON order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.role IN ('admin', 'super_admin')
      AND admins.is_active = true
    )
  );

-- ============================================================
-- 5. payments 정책 수정
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage all payments" ON payments;
CREATE POLICY "Admins can manage all payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.role IN ('admin', 'super_admin')
      AND admins.is_active = true
    )
  );

-- ============================================================
-- 코멘트
-- ============================================================

COMMENT ON POLICY "Admins can manage oauth clients" ON oauth_clients IS 'Admin/Super Admin만 OAuth 클라이언트 관리 가능';
COMMENT ON POLICY "Admins can manage plan features" ON plan_features IS 'Admin/Super Admin만 플랜 기능 관리 가능';
COMMENT ON POLICY "Admins can view all orders" ON orders IS 'Admin/Super Admin은 모든 주문 조회/수정 가능';
COMMENT ON POLICY "Admins can view all order items" ON order_items IS 'Admin/Super Admin은 모든 주문 항목 조회/수정 가능';
COMMENT ON POLICY "Admins can manage all payments" ON payments IS 'Admin/Super Admin은 모든 결제 조회/수정 가능';
