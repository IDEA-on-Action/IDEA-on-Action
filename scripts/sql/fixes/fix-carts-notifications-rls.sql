-- ============================================
-- carts & notifications 테이블 RLS 정책 수정
-- 일시: 2025-11-15
-- 목적: 403 Forbidden 오류 해결
-- ============================================

-- ============================================
-- 1. carts 테이블 RLS 정책
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (충돌 방지)
DROP POLICY IF EXISTS "Users can view their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can create their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete their own cart" ON public.carts;

-- Users can view their own cart (SELECT)
CREATE POLICY "Users can view their own cart"
  ON public.carts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own cart (INSERT)
CREATE POLICY "Users can create their own cart"
  ON public.carts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own cart (UPDATE)
CREATE POLICY "Users can update their own cart"
  ON public.carts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own cart (DELETE)
CREATE POLICY "Users can delete their own cart"
  ON public.carts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 2. cart_items 테이블 RLS 정책
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (충돌 방지)
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can create their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;

-- Users can view their own cart items (SELECT)
CREATE POLICY "Users can view their own cart items"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (
    cart_id IN (
      SELECT id FROM public.carts WHERE user_id = auth.uid()
    )
  );

-- Users can create their own cart items (INSERT)
CREATE POLICY "Users can create their own cart items"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK (
    cart_id IN (
      SELECT id FROM public.carts WHERE user_id = auth.uid()
    )
  );

-- Users can update their own cart items (UPDATE)
CREATE POLICY "Users can update their own cart items"
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

-- Users can delete their own cart items (DELETE)
CREATE POLICY "Users can delete their own cart items"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING (
    cart_id IN (
      SELECT id FROM public.carts WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 3. notifications 테이블 RLS 정책
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (충돌 방지)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- Users can view their own notifications (SELECT)
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (UPDATE) - 읽음 상태 변경용
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications (DELETE)
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ carts & notifications 테이블 RLS 정책 수정 완료!';
  RAISE NOTICE '- carts 테이블: RLS 정책 4개 생성 (SELECT/INSERT/UPDATE/DELETE)';
  RAISE NOTICE '- cart_items 테이블: RLS 정책 4개 생성 (SELECT/INSERT/UPDATE/DELETE)';
  RAISE NOTICE '- notifications 테이블: RLS 정책 3개 생성 (SELECT/UPDATE/DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '이제 로그인한 사용자가 자신의 장바구니와 알림에 접근할 수 있습니다.';
END $$;
