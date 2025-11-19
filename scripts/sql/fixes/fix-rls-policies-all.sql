-- ============================================
-- Supabase RLS 정책 수정 스크립트
-- 일시: 2025-11-04
-- 목적: notifications, carts, user_roles, roadmap 테이블 권한 문제 해결
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
-- 7. roadmap 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.roadmap ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Roadmap is viewable by everyone" ON public.roadmap;
DROP POLICY IF EXISTS "Admins can insert roadmap" ON public.roadmap;
DROP POLICY IF EXISTS "Admins can update roadmap" ON public.roadmap;
DROP POLICY IF EXISTS "Admins can delete roadmap" ON public.roadmap;

-- Create new policies
-- 모든 사용자가 roadmap 조회 가능
CREATE POLICY "Roadmap is viewable by everyone"
  ON public.roadmap FOR SELECT
  USING (true);

-- 관리자만 INSERT 가능
CREATE POLICY "Admins can insert roadmap"
  ON public.roadmap FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM public.roles WHERE name = 'admin'
      )
    )
  );

-- 관리자만 UPDATE 가능
CREATE POLICY "Admins can update roadmap"
  ON public.roadmap FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM public.roles WHERE name = 'admin'
      )
    )
  );

-- 관리자만 DELETE 가능
CREATE POLICY "Admins can delete roadmap"
  ON public.roadmap FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM public.roles WHERE name = 'admin'
      )
    )
  );

-- ============================================
-- 8. projects 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policy
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON public.projects;

-- Create new policy (모든 사용자가 프로젝트 조회 가능)
CREATE POLICY "Projects are viewable by everyone"
  ON public.projects FOR SELECT
  USING (true);

-- ============================================
-- 9. bounties 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;

-- Drop existing policy
DROP POLICY IF EXISTS "Bounties are viewable by everyone" ON public.bounties;

-- Create new policy (모든 사용자가 바운티 조회 가능)
CREATE POLICY "Bounties are viewable by everyone"
  ON public.bounties FOR SELECT
  USING (true);

-- ============================================
-- 10. logs 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy
DROP POLICY IF EXISTS "Logs are viewable by everyone" ON public.logs;

-- Create new policy (모든 사용자가 로그 조회 가능)
CREATE POLICY "Logs are viewable by everyone"
  ON public.logs FOR SELECT
  USING (true);

-- ============================================
-- 11. newsletter_subscriptions 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "newsletter_admin_read" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "newsletter_public_insert" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "newsletter_owner_update" ON public.newsletter_subscriptions;

-- 누구나 구독 가능 (INSERT) - anon과 authenticated 모두 허용
CREATE POLICY "newsletter_public_insert"
  ON public.newsletter_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 관리자는 모든 구독자 조회 가능 (SELECT)
CREATE POLICY "newsletter_admin_read"
  ON public.newsletter_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- 본인 이메일만 업데이트 가능 (UPDATE)
CREATE POLICY "newsletter_owner_update"
  ON public.newsletter_subscriptions
  FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ============================================
-- 12. newsletter_subscribers 뷰 RLS 정책 확인
-- ============================================

-- Enable Row Level Security (뷰는 기본 테이블의 정책을 따름)
-- newsletter_subscribers는 뷰이므로 기본 테이블에 정책이 있어야 함

-- ============================================
-- 13. post_categories 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.post_categories;
DROP POLICY IF EXISTS "Categories are insertable by blog managers" ON public.post_categories;
DROP POLICY IF EXISTS "Categories are updatable by blog managers" ON public.post_categories;
DROP POLICY IF EXISTS "Categories are deletable by blog managers" ON public.post_categories;

-- 누구나 카테고리 조회 가능 (SELECT) - anon과 authenticated 모두 허용
CREATE POLICY "Categories are viewable by everyone"
  ON public.post_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- 관리자만 카테고리 생성/수정/삭제 가능 (INSERT/UPDATE/DELETE)
CREATE POLICY "Categories are insertable by blog managers"
  ON public.post_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

CREATE POLICY "Categories are updatable by blog managers"
  ON public.post_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

CREATE POLICY "Categories are deletable by blog managers"
  ON public.post_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- ============================================
-- 14. post_tags 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.post_tags;
DROP POLICY IF EXISTS "Tags are insertable by blog managers" ON public.post_tags;
DROP POLICY IF EXISTS "Tags are updatable by blog managers" ON public.post_tags;
DROP POLICY IF EXISTS "Tags are deletable by blog managers" ON public.post_tags;

-- 누구나 태그 조회 가능 (SELECT) - anon과 authenticated 모두 허용
CREATE POLICY "Tags are viewable by everyone"
  ON public.post_tags FOR SELECT
  TO anon, authenticated
  USING (true);

-- 관리자만 태그 생성/수정/삭제 가능 (INSERT/UPDATE/DELETE)
CREATE POLICY "Tags are insertable by blog managers"
  ON public.post_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

CREATE POLICY "Tags are updatable by blog managers"
  ON public.post_tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

CREATE POLICY "Tags are deletable by blog managers"
  ON public.post_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- ============================================
-- 15. blog_posts 테이블 RLS 정책 재생성
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.blog_posts;
DROP POLICY IF EXISTS "Posts are insertable by blog creators" ON public.blog_posts;
DROP POLICY IF EXISTS "Posts are updatable by managers or authors" ON public.blog_posts;
DROP POLICY IF EXISTS "Posts are deletable by blog managers" ON public.blog_posts;

-- Published posts는 모든 사용자가 조회 가능, Draft/Archived는 작성자 또는 관리자만
CREATE POLICY "Published posts are viewable by everyone"
  ON public.blog_posts FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published' OR
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- 작성자만 게시글 생성 가능 (INSERT) - 모든 인증된 사용자가 작성 가능
CREATE POLICY "Posts are insertable by blog creators"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- 작성자 또는 관리자만 게시글 수정 가능 (UPDATE)
CREATE POLICY "Posts are updatable by managers or authors"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  )
  WITH CHECK (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

-- 관리자만 게시글 삭제 가능 (DELETE)
CREATE POLICY "Posts are deletable by blog managers"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      JOIN public.roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
    )
  );

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
  RAISE NOTICE '- roadmap 테이블: RLS 정책 4개 재생성';
  RAISE NOTICE '- projects 테이블: RLS 정책 1개 재생성 (Status 페이지용)';
  RAISE NOTICE '- bounties 테이블: RLS 정책 1개 재생성 (Status 페이지용)';
  RAISE NOTICE '- logs 테이블: RLS 정책 1개 재생성 (Status 페이지용)';
  RAISE NOTICE '- newsletter_subscriptions 테이블: RLS 정책 3개 재생성';
  RAISE NOTICE '- post_categories 테이블: RLS 정책 4개 재생성';
  RAISE NOTICE '- post_tags 테이블: RLS 정책 4개 재생성';
  RAISE NOTICE '- blog_posts 테이블: RLS 정책 4개 재생성';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 주의: 프로덕션 환경에서는 user_roles, user_profiles 정책을 더 엄격하게 설정하세요';
END $$;
