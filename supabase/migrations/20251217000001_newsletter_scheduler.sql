-- Newsletter 스케줄링 시스템
-- 자동 발송, 드래프트 관리, 발송 로그 테이블

-- ============================================
-- 1. newsletter_drafts 테이블 (발송 예약)
-- ============================================
CREATE TABLE IF NOT EXISTS public.newsletter_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  preview TEXT,

  -- 스케줄링
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- 세그먼트 타겟팅
  segment_filter JSONB DEFAULT '{}',
  -- 예: {"status": "confirmed", "topics": ["tech", "business"]}

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 발송 결과
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_message TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_status ON public.newsletter_drafts(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_scheduled_at ON public.newsletter_drafts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_created_by ON public.newsletter_drafts(created_by);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_newsletter_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_newsletter_drafts_updated_at ON public.newsletter_drafts;
CREATE TRIGGER trigger_newsletter_drafts_updated_at
  BEFORE UPDATE ON public.newsletter_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_drafts_updated_at();

-- ============================================
-- 2. newsletter_send_logs 테이블 (발송 로그)
-- ============================================
CREATE TABLE IF NOT EXISTS public.newsletter_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL,  -- newsletter_drafts 또는 newsletter_archive의 ID
  subscriber_email TEXT NOT NULL,

  -- 발송 상태
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'complained')),
  sent_at TIMESTAMPTZ,

  -- 추적
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- 에러 정보
  error_code TEXT,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_newsletter_send_logs_newsletter ON public.newsletter_send_logs(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_send_logs_email ON public.newsletter_send_logs(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_newsletter_send_logs_status ON public.newsletter_send_logs(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_send_logs_sent_at ON public.newsletter_send_logs(sent_at);

-- ============================================
-- 3. RLS 정책
-- ============================================

-- newsletter_drafts RLS
ALTER TABLE public.newsletter_drafts ENABLE ROW LEVEL SECURITY;

-- 관리자만 모든 작업 가능
CREATE POLICY "newsletter_drafts_admin_all" ON public.newsletter_drafts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- newsletter_send_logs RLS
ALTER TABLE public.newsletter_send_logs ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능
CREATE POLICY "newsletter_send_logs_admin_read" ON public.newsletter_send_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Service Role만 삽입/수정 가능 (Edge Function에서 사용)
CREATE POLICY "newsletter_send_logs_service_insert" ON public.newsletter_send_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "newsletter_send_logs_service_update" ON public.newsletter_send_logs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. 스케줄 발송 함수
-- ============================================

-- 예약된 뉴스레터 조회 (스케줄러용)
CREATE OR REPLACE FUNCTION get_scheduled_newsletters()
RETURNS TABLE (
  id UUID,
  subject TEXT,
  content TEXT,
  preview TEXT,
  segment_filter JSONB,
  scheduled_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nd.id,
    nd.subject,
    nd.content,
    nd.preview,
    nd.segment_filter,
    nd.scheduled_at
  FROM public.newsletter_drafts nd
  WHERE nd.status = 'scheduled'
    AND nd.scheduled_at <= NOW()
  ORDER BY nd.scheduled_at ASC
  LIMIT 10;  -- 한 번에 최대 10개 처리
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 뉴스레터 상태 업데이트
CREATE OR REPLACE FUNCTION update_newsletter_status(
  p_newsletter_id UUID,
  p_status TEXT,
  p_sent_count INTEGER DEFAULT NULL,
  p_failed_count INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.newsletter_drafts
  SET
    status = p_status,
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    sent_count = COALESCE(p_sent_count, sent_count),
    failed_count = COALESCE(p_failed_count, failed_count),
    error_message = COALESCE(p_error_message, error_message)
  WHERE id = p_newsletter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. pg_cron 스케줄 설정 (Supabase Dashboard에서 설정)
-- ============================================
-- 참고: pg_cron은 Supabase Dashboard > Database > Cron Jobs에서 설정해야 합니다.
--
-- 스케줄 예시 (매 5분마다 실행):
-- SELECT cron.schedule(
--   'newsletter-scheduler',
--   '*/5 * * * *',
--   $$
--     SELECT net.http_post(
--       url := 'https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/newsletter-send',
--       headers := '{"Authorization": "Bearer <service_role_key>", "Content-Type": "application/json"}'::jsonb,
--       body := '{"scheduled": true}'::jsonb
--     );
--   $$
-- );

-- ============================================
-- 6. 통계 뷰
-- ============================================
CREATE OR REPLACE VIEW public.newsletter_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'draft') AS draft_count,
  COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled_count,
  COUNT(*) FILTER (WHERE status = 'sent') AS sent_count,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
  COALESCE(SUM(sent_count), 0) AS total_emails_sent,
  COALESCE(SUM(recipient_count), 0) AS total_recipients
FROM public.newsletter_drafts;

-- ============================================
-- 7. 코멘트
-- ============================================
COMMENT ON TABLE public.newsletter_drafts IS '뉴스레터 드래프트 및 스케줄 관리';
COMMENT ON TABLE public.newsletter_send_logs IS '개별 이메일 발송 로그 (추적용)';
COMMENT ON FUNCTION get_scheduled_newsletters IS '발송 예정인 뉴스레터 목록 조회';
COMMENT ON FUNCTION update_newsletter_status IS '뉴스레터 발송 상태 업데이트';
