-- Newsletter Subscriptions Table
-- 뉴스레터 구독자 관리

CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  preferences JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_newsletter_email ON public.newsletter_subscriptions(email);
CREATE INDEX idx_newsletter_status ON public.newsletter_subscriptions(status);
CREATE INDEX idx_newsletter_subscribed_at ON public.newsletter_subscriptions(subscribed_at);

-- RLS Policies
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- 관리자만 모든 구독자 조회 가능
-- Note: Using is_admin_user() function to avoid dependency on user_profiles table
CREATE POLICY "newsletter_admin_read"
  ON public.newsletter_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- 누구나 구독 가능 (INSERT)
CREATE POLICY "newsletter_public_insert"
  ON public.newsletter_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 본인 이메일만 업데이트 가능 (상태 변경, 구독 취소)
CREATE POLICY "newsletter_owner_update"
  ON public.newsletter_subscriptions
  FOR UPDATE
  TO authenticated
  USING (email = auth.email())
  WITH CHECK (email = auth.email());

-- Comments
COMMENT ON TABLE public.newsletter_subscriptions IS '뉴스레터 구독자 테이블';
COMMENT ON COLUMN public.newsletter_subscriptions.email IS '구독자 이메일';
COMMENT ON COLUMN public.newsletter_subscriptions.status IS '구독 상태: pending(대기), confirmed(확인완료), unsubscribed(구독취소)';
COMMENT ON COLUMN public.newsletter_subscriptions.preferences IS '구독자 선호 설정 (주제, 빈도 등)';
COMMENT ON COLUMN public.newsletter_subscriptions.metadata IS '추가 메타데이터 (유입 경로, IP 등)';
