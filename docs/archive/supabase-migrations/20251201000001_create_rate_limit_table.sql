-- ============================================================================
-- Rate Limit Entries Table
-- ============================================================================
-- Edge Function용 Rate Limiting 테이블
-- 슬라이딩 윈도우 알고리즘 구현
-- 자동 만료 처리 (TTL)
--
-- @version 1.0.0
-- @created 2025-12-01
-- ============================================================================

-- Rate Limit 엔트리 테이블 생성
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rate Limit 키 (IP, User ID, Client ID 등)
  key TEXT NOT NULL,

  -- 현재 요청 수
  count INTEGER NOT NULL DEFAULT 0,

  -- 윈도우 시작 시간
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 만료 시간 (TTL)
  expires_at TIMESTAMPTZ NOT NULL,

  -- 생성/수정 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 인덱스 생성
-- ============================================================================

-- 키 + 윈도우 시작 시간 복합 인덱스 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_rate_limit_entries_key_window
  ON rate_limit_entries(key, window_start DESC);

-- 만료 시간 인덱스 (TTL 정리 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_rate_limit_entries_expires_at
  ON rate_limit_entries(expires_at);

-- 키 인덱스 (키별 조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_rate_limit_entries_key
  ON rate_limit_entries(key);

-- ============================================================================
-- 자동 만료 처리 (TTL)
-- ============================================================================

-- 만료된 엔트리 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limit_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_entries
  WHERE expires_at < now();
END;
$$;

-- 만료된 엔트리 정리 스케줄러 (매 5분마다 실행)
-- pg_cron 확장이 설치된 경우에만 실행
DO $$
BEGIN
  -- pg_cron이 설치되어 있는지 확인
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- 기존 스케줄 삭제 (중복 방지)
    PERFORM cron.unschedule('cleanup-rate-limit-entries');

    -- 새 스케줄 등록
    PERFORM cron.schedule(
      'cleanup-rate-limit-entries',
      '*/5 * * * *', -- 매 5분마다
      $$SELECT cleanup_expired_rate_limit_entries();$$
    );

    RAISE NOTICE 'Rate limit cleanup scheduler registered';
  ELSE
    RAISE NOTICE 'pg_cron extension not found, skipping scheduler setup';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to setup rate limit cleanup scheduler: %', SQLERRM;
END;
$$;

-- ============================================================================
-- RLS (Row Level Security) 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- Service Role은 모든 작업 허용
CREATE POLICY "Service role has full access to rate_limit_entries"
  ON rate_limit_entries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 인증된 사용자는 읽기만 허용 (디버깅용)
CREATE POLICY "Authenticated users can view rate_limit_entries"
  ON rate_limit_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 코멘트
-- ============================================================================

COMMENT ON TABLE rate_limit_entries IS 'Edge Function Rate Limiting 엔트리';
COMMENT ON COLUMN rate_limit_entries.key IS 'Rate Limit 키 (IP, User ID, Client ID 등)';
COMMENT ON COLUMN rate_limit_entries.count IS '현재 윈도우 내 요청 수';
COMMENT ON COLUMN rate_limit_entries.window_start IS '윈도우 시작 시간';
COMMENT ON COLUMN rate_limit_entries.expires_at IS '만료 시간 (TTL)';
COMMENT ON FUNCTION cleanup_expired_rate_limit_entries() IS '만료된 Rate Limit 엔트리 자동 삭제';

-- ============================================================================
-- 테스트 데이터 (개발 환경용)
-- ============================================================================

-- 테스트용 샘플 데이터 삽입 (선택사항)
-- INSERT INTO rate_limit_entries (key, count, window_start, expires_at)
-- VALUES
--   ('oauth:ip:127.0.0.1', 5, now(), now() + interval '1 minute'),
--   ('api:user:test-user-id', 30, now(), now() + interval '1 minute'),
--   ('webhook:client:test-client', 50, now(), now() + interval '1 minute');
