-- ============================================
-- carts & cart_items 테이블 RLS 정책 완전 재설정
-- 일시: 2025-11-15
-- 목적: 중복 정책 제거 및 GRANT 권한 추가
-- ============================================

-- ============================================
-- Step 1: 모든 기존 정책 제거 (중복 방지)
-- ============================================

-- carts 테이블의 모든 정책 제거
DROP POLICY IF EXISTS "Users can create their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can view own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can view their own cart" ON public.carts;

-- cart_items 테이블의 모든 정책 제거
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can create their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can view own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can create own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;

-- ============================================
-- Step 2: PostgreSQL GRANT 권한 추가
-- ============================================

-- authenticated 역할에 carts 테이블 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;

-- anon 역할에는 SELECT만 허용 (읽기 전용)
GRANT SELECT ON public.carts TO anon;
GRANT SELECT ON public.cart_items TO anon;

-- ============================================
-- Step 3: RLS 활성화
-- ============================================

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 4: 새로운 RLS 정책 생성 (authenticated만)
-- ============================================

-- carts 테이블 정책 (authenticated 역할만)
CREATE POLICY "authenticated_users_select_own_cart"
  ON public.carts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_users_insert_own_cart"
  ON public.carts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "authenticated_users_update_own_cart"
  ON public.carts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "authenticated_users_delete_own_cart"
  ON public.carts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- cart_items 테이블 정책 (authenticated 역할만)
CREATE POLICY "authenticated_users_select_own_cart_items"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (
    cart_id IN (
      SELECT id FROM public.carts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_users_insert_own_cart_items"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK (
    cart_id IN (
      SELECT id FROM public.carts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_users_update_own_cart_items"
  ON public.cart_items FOR UPDATE
  TO authenticated
  USING (
    cart_id IN (
      SELECT id FROM public.carts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    cart_id IN (
      SELECT id FROM public.carts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_users_delete_own_cart_items"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING (
    cart_id IN (
      SELECT id FROM public.carts WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Step 5: 검증 쿼리
-- ============================================

-- RLS 정책 확인
DO $$
DECLARE
  cart_policy_count INTEGER;
  cart_items_policy_count INTEGER;
BEGIN
  -- carts 테이블 정책 개수 확인
  SELECT COUNT(*) INTO cart_policy_count
  FROM pg_policies
  WHERE tablename = 'carts' AND schemaname = 'public';

  -- cart_items 테이블 정책 개수 확인
  SELECT COUNT(*) INTO cart_items_policy_count
  FROM pg_policies
  WHERE tablename = 'cart_items' AND schemaname = 'public';

  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS 정책 재설정 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📋 carts 테이블: % 개 정책', cart_policy_count;
  RAISE NOTICE '📋 cart_items 테이블: % 개 정책', cart_items_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔐 GRANT 권한:';
  RAISE NOTICE '  - authenticated: SELECT, INSERT, UPDATE, DELETE';
  RAISE NOTICE '  - anon: SELECT (읽기 전용)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ 이제 로그인한 사용자가 장바구니를 사용할 수 있습니다!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
