-- =============================================================================
-- TASK-021: newsletter_archive 테이블 생성
-- 발송된 뉴스레터 아카이브 및 통계 관리
-- =============================================================================

-- newsletter_archive 테이블 생성
-- 발송된 뉴스레터의 히스토리와 성과 지표를 저장합니다.
CREATE TABLE IF NOT EXISTS public.newsletter_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 뉴스레터 콘텐츠
  subject TEXT NOT NULL,                    -- 이메일 제목
  content TEXT NOT NULL,                    -- 본문 내용 (HTML 또는 텍스트)
  preview TEXT,                             -- 미리보기 텍스트 (첫 200자)

  -- 발송 정보
  sent_at TIMESTAMPTZ NOT NULL,             -- 발송 일시
  recipient_count INTEGER DEFAULT 0,        -- 수신자 수

  -- 성과 지표
  open_rate DECIMAL(5,2),                   -- 오픈율 (0.00 ~ 100.00)
  click_rate DECIMAL(5,2),                  -- 클릭율 (0.00 ~ 100.00)

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 테이블 코멘트
COMMENT ON TABLE public.newsletter_archive IS '발송된 뉴스레터 아카이브';
COMMENT ON COLUMN public.newsletter_archive.subject IS '이메일 제목';
COMMENT ON COLUMN public.newsletter_archive.content IS '본문 내용 (HTML 또는 텍스트)';
COMMENT ON COLUMN public.newsletter_archive.preview IS '미리보기 텍스트 (첫 200자 요약)';
COMMENT ON COLUMN public.newsletter_archive.sent_at IS '발송 일시';
COMMENT ON COLUMN public.newsletter_archive.recipient_count IS '발송 시점의 수신자 수';
COMMENT ON COLUMN public.newsletter_archive.open_rate IS '오픈율 (백분율, 0.00~100.00)';
COMMENT ON COLUMN public.newsletter_archive.click_rate IS '클릭율 (백분율, 0.00~100.00)';
COMMENT ON COLUMN public.newsletter_archive.created_by IS '발송자 (관리자)';

-- =============================================================================
-- 인덱스 생성
-- =============================================================================

-- 발송 날짜 기준 내림차순 정렬용 인덱스
CREATE INDEX IF NOT EXISTS idx_newsletter_archive_sent_at
  ON public.newsletter_archive(sent_at DESC);

-- 제목 검색용 인덱스 (부분 일치 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_newsletter_archive_subject
  ON public.newsletter_archive USING gin(to_tsvector('simple', subject));

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE public.newsletter_archive ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책: 모든 사용자가 아카이브된 뉴스레터를 조회할 수 있음
CREATE POLICY "newsletter_archive_select_public"
  ON public.newsletter_archive
  FOR SELECT
  USING (true);

-- 관리자 INSERT 정책
CREATE POLICY "newsletter_archive_insert_admin"
  ON public.newsletter_archive
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- 관리자 UPDATE 정책
CREATE POLICY "newsletter_archive_update_admin"
  ON public.newsletter_archive
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- 관리자 DELETE 정책
CREATE POLICY "newsletter_archive_delete_admin"
  ON public.newsletter_archive
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- 유효성 검사 제약조건
-- =============================================================================

-- 오픈율 범위 검사 (0~100%)
ALTER TABLE public.newsletter_archive
  ADD CONSTRAINT chk_open_rate_range
  CHECK (open_rate IS NULL OR (open_rate >= 0 AND open_rate <= 100));

-- 클릭율 범위 검사 (0~100%)
ALTER TABLE public.newsletter_archive
  ADD CONSTRAINT chk_click_rate_range
  CHECK (click_rate IS NULL OR (click_rate >= 0 AND click_rate <= 100));

-- 수신자 수 음수 방지
ALTER TABLE public.newsletter_archive
  ADD CONSTRAINT chk_recipient_count_positive
  CHECK (recipient_count >= 0);

-- =============================================================================
-- 마이그레이션 완료 로그
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TASK-021: newsletter_archive 테이블 생성 완료';
  RAISE NOTICE '- 테이블: public.newsletter_archive';
  RAISE NOTICE '- 인덱스: idx_newsletter_archive_sent_at, idx_newsletter_archive_subject';
  RAISE NOTICE '- RLS: 공개 읽기, 관리자 쓰기';
  RAISE NOTICE '- 제약조건: chk_open_rate_range, chk_click_rate_range, chk_recipient_count_positive';
END $$;
