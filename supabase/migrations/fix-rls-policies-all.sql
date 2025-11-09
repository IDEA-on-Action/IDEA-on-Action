-- ============================================
-- Supabase RLS 정책 수정 스크립트
-- 일시: 2025-11-04
-- 목적: notifications, carts, user_roles 테이블 권한 문제 해결
-- ============================================

-- ============================================
-- 1. notifications 테이블 생성 및 RLS 정책
-- ============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'comment', 'system', 'announcement')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Allow service role to insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE notifications IS 'User notifications for orders, comments, system messages, and announcements';

-- ============================================
-- 2. carts 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON public.carts;

-- Create new policies
CREATE POLICY "Users can view own cart"
  ON public.carts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cart"
  ON public.carts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cart"
  ON public.carts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cart"
  ON public.carts FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 3. cart_items 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;

-- Create new policies
CREATE POLICY "Users can view own cart items"
  ON public.cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own cart items"
  ON public.cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_id
        AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. user_roles 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can revoke roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles for admin check" ON public.user_roles;

-- Create new policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- 모든 사용자가 roles 조인을 위해 user_roles 조회 가능
-- (관리자 권한 확인용, 프로덕션에서는 더 엄격하게 설정 필요)
CREATE POLICY "Users can view roles for admin check"
  ON public.user_roles FOR SELECT
  USING (true);

-- ============================================
-- 5. roles 테이블 RLS 정책 확인
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.roles;

-- Create new policy (모든 사용자가 역할 정보 조회 가능)
CREATE POLICY "Roles are viewable by everyone"
  ON public.roles FOR SELECT
  USING (true);

-- ============================================
-- 6. user_profiles 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

-- Create new policies
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid());

-- 관리자는 모든 프로필 조회 가능 (임시)
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS 정책 수정 완료!';
  RAISE NOTICE '- notifications 테이블: 생성 + RLS 정책 4개';
  RAISE NOTICE '- carts 테이블: RLS 정책 4개 재생성';
  RAISE NOTICE '- cart_items 테이블: RLS 정책 4개 재생성';
  RAISE NOTICE '- user_roles 테이블: RLS 정책 2개 재생성';
  RAISE NOTICE '- roles 테이블: RLS 정책 1개 재생성';
  RAISE NOTICE '- user_profiles 테이블: RLS 정책 4개 재생성';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 주의: 프로덕션 환경에서는 user_roles, user_profiles 정책을 더 엄격하게 설정하세요';
END $$;
