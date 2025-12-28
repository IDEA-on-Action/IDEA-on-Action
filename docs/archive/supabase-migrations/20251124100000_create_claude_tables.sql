-- ============================================================================
-- Claude AI 통합 테이블 마이그레이션
--
-- 파일: 20251124100000_create_claude_tables.sql
-- 작성일: 2025-11-24
-- 버전: 1.0.0
--
-- 테이블:
-- 1. claude_usage_logs - Claude API 호출 로그
-- 2. claude_rate_limits - Rate Limit 상태 (Token Bucket)
--
-- 기능:
-- - API 사용량 추적 및 분석
-- - 사용자별 Rate Limiting
-- - 에러 모니터링 및 디버깅
-- ============================================================================

-- 트랜잭션 시작
BEGIN;

-- ============================================================================
-- 1. claude_usage_logs 테이블
-- API 호출 로그 및 사용량 추적
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.claude_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 및 요청 식별
  user_id TEXT NOT NULL,
  request_id UUID NOT NULL,

  -- 요청 정보
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',

  -- 응답 상태
  status_code INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,

  -- 에러 정보 (실패 시)
  error_code TEXT,
  error_message TEXT,

  -- 토큰 사용량
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,

  -- 모델 정보
  model TEXT,

  -- 성능 지표
  latency_ms INTEGER,

  -- 클라이언트 정보
  ip_address INET,
  user_agent TEXT,

  -- 추가 메타데이터 (JSON)
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_user_id
  ON public.claude_usage_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_request_id
  ON public.claude_usage_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_created_at
  ON public.claude_usage_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_status_code
  ON public.claude_usage_logs(status_code);

CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_success
  ON public.claude_usage_logs(success);

CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_model
  ON public.claude_usage_logs(model);

-- 복합 인덱스 (사용자별 시간순 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_user_created
  ON public.claude_usage_logs(user_id, created_at DESC);

-- 에러 분석용 인덱스
CREATE INDEX IF NOT EXISTS idx_claude_usage_logs_errors
  ON public.claude_usage_logs(error_code, created_at DESC)
  WHERE success = false;

-- 테이블 코멘트
COMMENT ON TABLE public.claude_usage_logs IS 'Claude AI API 호출 로그 및 사용량 추적';
COMMENT ON COLUMN public.claude_usage_logs.user_id IS '사용자 ID (UUID 또는 anon:IP 형식)';
COMMENT ON COLUMN public.claude_usage_logs.request_id IS '요청 고유 식별자 (추적용)';
COMMENT ON COLUMN public.claude_usage_logs.endpoint IS 'API 엔드포인트 경로';
COMMENT ON COLUMN public.claude_usage_logs.input_tokens IS '입력 토큰 수';
COMMENT ON COLUMN public.claude_usage_logs.output_tokens IS '출력 토큰 수';
COMMENT ON COLUMN public.claude_usage_logs.total_tokens IS '총 토큰 수';
COMMENT ON COLUMN public.claude_usage_logs.latency_ms IS 'API 응답 시간 (밀리초)';
COMMENT ON COLUMN public.claude_usage_logs.metadata IS '추가 메타데이터 (PII 스크러빙 후 저장)';

-- ============================================================================
-- 2. claude_rate_limits 테이블
-- Token Bucket 기반 Rate Limiting 상태
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.claude_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 식별 (고유 제약조건)
  user_id TEXT NOT NULL UNIQUE,

  -- Token Bucket 상태
  tokens_remaining INTEGER NOT NULL DEFAULT 10,
  bucket_capacity INTEGER NOT NULL DEFAULT 10,

  -- 마지막 토큰 리필 시각
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_claude_rate_limits_user_id
  ON public.claude_rate_limits(user_id);

CREATE INDEX IF NOT EXISTS idx_claude_rate_limits_last_refill
  ON public.claude_rate_limits(last_refill_at);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_claude_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_claude_rate_limits_updated_at
  ON public.claude_rate_limits;

CREATE TRIGGER trigger_update_claude_rate_limits_updated_at
  BEFORE UPDATE ON public.claude_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_claude_rate_limits_updated_at();

-- 테이블 코멘트
COMMENT ON TABLE public.claude_rate_limits IS 'Claude AI Rate Limiting 상태 (Token Bucket 알고리즘)';
COMMENT ON COLUMN public.claude_rate_limits.user_id IS '사용자 ID (고유)';
COMMENT ON COLUMN public.claude_rate_limits.tokens_remaining IS '남은 토큰 수';
COMMENT ON COLUMN public.claude_rate_limits.bucket_capacity IS '버킷 최대 용량 (분당 최대 요청 수)';
COMMENT ON COLUMN public.claude_rate_limits.last_refill_at IS '마지막 토큰 리필 시각';

-- ============================================================================
-- 3. RLS (Row Level Security) 정책
-- ============================================================================

-- claude_usage_logs RLS 활성화
ALTER TABLE public.claude_usage_logs ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 접근 정책
CREATE POLICY "Admins can manage all claude_usage_logs"
  ON public.claude_usage_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- 사용자 본인 로그 조회 정책
CREATE POLICY "Users can view own claude_usage_logs"
  ON public.claude_usage_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- 서비스 역할 삽입 정책 (Edge Function용)
CREATE POLICY "Service role can insert claude_usage_logs"
  ON public.claude_usage_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- claude_rate_limits RLS 활성화
ALTER TABLE public.claude_rate_limits ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 접근 정책
CREATE POLICY "Admins can manage all claude_rate_limits"
  ON public.claude_rate_limits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- 사용자 본인 Rate Limit 조회 정책
CREATE POLICY "Users can view own claude_rate_limits"
  ON public.claude_rate_limits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- 서비스 역할 전체 접근 정책 (Edge Function용)
CREATE POLICY "Service role can manage claude_rate_limits"
  ON public.claude_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. 유틸리티 함수
-- ============================================================================

-- 사용자별 API 사용량 통계 함수
CREATE OR REPLACE FUNCTION get_claude_usage_stats(
  p_user_id TEXT,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  total_tokens BIGINT,
  avg_latency_ms NUMERIC,
  models_used TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::BIGINT AS total_requests,
    COUNT(*) FILTER (WHERE success = true)::BIGINT AS successful_requests,
    COUNT(*) FILTER (WHERE success = false)::BIGINT AS failed_requests,
    COALESCE(SUM(total_tokens), 0)::BIGINT AS total_tokens,
    ROUND(AVG(latency_ms), 2) AS avg_latency_ms,
    ARRAY_AGG(DISTINCT model) FILTER (WHERE model IS NOT NULL) AS models_used
  FROM public.claude_usage_logs
  WHERE user_id = p_user_id
    AND created_at BETWEEN p_start_date AND p_end_date;
$$;

COMMENT ON FUNCTION get_claude_usage_stats IS '사용자별 Claude API 사용량 통계 조회';

-- 전체 시스템 사용량 통계 함수 (관리자용)
CREATE OR REPLACE FUNCTION get_claude_system_stats(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_requests BIGINT,
  unique_users BIGINT,
  success_rate NUMERIC,
  total_tokens BIGINT,
  avg_latency_ms NUMERIC,
  error_breakdown JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::BIGINT AS total_requests,
    COUNT(DISTINCT user_id)::BIGINT AS unique_users,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE success = true) / NULLIF(COUNT(*), 0),
      2
    ) AS success_rate,
    COALESCE(SUM(total_tokens), 0)::BIGINT AS total_tokens,
    ROUND(AVG(latency_ms), 2) AS avg_latency_ms,
    COALESCE(
      jsonb_object_agg(
        error_code,
        error_count
      ) FILTER (WHERE error_code IS NOT NULL),
      '{}'::JSONB
    ) AS error_breakdown
  FROM (
    SELECT
      *,
      COUNT(*) OVER (PARTITION BY error_code) AS error_count
    FROM public.claude_usage_logs
    WHERE created_at BETWEEN p_start_date AND p_end_date
  ) subq;
$$;

COMMENT ON FUNCTION get_claude_system_stats IS '전체 시스템 Claude API 사용량 통계 (관리자용)';

-- Rate Limit 리셋 함수
CREATE OR REPLACE FUNCTION reset_claude_rate_limit(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.claude_rate_limits
  SET
    tokens_remaining = bucket_capacity,
    last_refill_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION reset_claude_rate_limit IS '특정 사용자의 Rate Limit 리셋';

-- 만료된 Rate Limit 레코드 정리 함수
CREATE OR REPLACE FUNCTION cleanup_stale_rate_limits(
  p_days_old INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.claude_rate_limits
  WHERE updated_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_stale_rate_limits IS '오래된 Rate Limit 레코드 정리';

-- 오래된 로그 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_claude_logs(
  p_days_old INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.claude_usage_logs
  WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_claude_logs IS '오래된 Claude 사용 로그 정리';

-- ============================================================================
-- 5. 파티셔닝 (대량 데이터 대비 - 선택사항)
-- ============================================================================

-- 참고: 파티셔닝은 데이터가 많아질 경우 적용
-- 현재는 인덱스로 충분하며, 필요시 아래 코드 활성화

-- CREATE TABLE claude_usage_logs_partitioned (
--   LIKE claude_usage_logs INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);
--
-- CREATE TABLE claude_usage_logs_2025_11
--   PARTITION OF claude_usage_logs_partitioned
--   FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================

COMMIT;

-- 마이그레이션 확인
DO $$
BEGIN
  RAISE NOTICE 'Claude AI 테이블 마이그레이션 완료';
  RAISE NOTICE '- claude_usage_logs 테이블 생성됨';
  RAISE NOTICE '- claude_rate_limits 테이블 생성됨';
  RAISE NOTICE '- RLS 정책 적용됨';
  RAISE NOTICE '- 유틸리티 함수 4개 생성됨';
END $$;
