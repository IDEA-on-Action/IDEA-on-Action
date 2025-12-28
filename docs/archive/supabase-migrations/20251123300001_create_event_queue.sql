-- =====================================================
-- MCP EVENT QUEUE TABLE
-- MCP Router에서 사용하는 이벤트 큐 테이블
--
-- 관련 문서: plan/claude-skills/sprint4-functions.md
-- 버전: 1.0.0
-- 작성일: 2025-11-23
-- =====================================================

-- =====================================================
-- 1. EVENT_QUEUE TABLE
-- 이벤트 라우팅 및 비동기 처리를 위한 큐
-- =====================================================
CREATE TABLE IF NOT EXISTS public.event_queue (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이벤트 정보
  event_type TEXT NOT NULL,
  source_service TEXT NOT NULL,
  target_service TEXT,

  -- 페이로드
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 우선순위 및 상태
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- 재시도 관리
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- 멱등성 키 (중복 요청 방지)
  idempotency_key TEXT UNIQUE,

  -- 처리 정보
  processed_at TIMESTAMPTZ,
  error_message TEXT,

  -- 메타데이터
  correlation_id UUID,
  request_id UUID,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT valid_source_service CHECK (
    source_service IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep', 'central-hub')
  )
);

-- 테이블 코멘트
COMMENT ON TABLE public.event_queue IS 'MCP Router: 이벤트 라우팅 큐 (비동기 처리)';
COMMENT ON COLUMN public.event_queue.id IS '이벤트 고유 ID';
COMMENT ON COLUMN public.event_queue.event_type IS '이벤트 유형 (예: service.health.update, document.generated)';
COMMENT ON COLUMN public.event_queue.source_service IS '이벤트 발생 서비스';
COMMENT ON COLUMN public.event_queue.target_service IS '이벤트 대상 서비스 (NULL이면 Central Hub)';
COMMENT ON COLUMN public.event_queue.payload IS '이벤트 페이로드 (JSON)';
COMMENT ON COLUMN public.event_queue.priority IS '처리 우선순위: critical > high > normal > low';
COMMENT ON COLUMN public.event_queue.status IS '처리 상태: pending, processing, completed, failed';
COMMENT ON COLUMN public.event_queue.retry_count IS '재시도 횟수';
COMMENT ON COLUMN public.event_queue.max_retries IS '최대 재시도 횟수';
COMMENT ON COLUMN public.event_queue.next_retry_at IS '다음 재시도 예정 시간';
COMMENT ON COLUMN public.event_queue.idempotency_key IS '멱등성 키 (중복 요청 방지)';
COMMENT ON COLUMN public.event_queue.processed_at IS '처리 완료 시간';
COMMENT ON COLUMN public.event_queue.error_message IS '에러 메시지 (실패 시)';
COMMENT ON COLUMN public.event_queue.correlation_id IS '연관 이벤트 추적 ID';
COMMENT ON COLUMN public.event_queue.request_id IS '요청 ID';

-- =====================================================
-- 2. INDEXES
-- =====================================================

-- 상태별 조회 (pending 상태 위주)
CREATE INDEX IF NOT EXISTS idx_event_queue_status
  ON public.event_queue(status)
  WHERE status IN ('pending', 'processing');

-- 우선순위별 조회
CREATE INDEX IF NOT EXISTS idx_event_queue_priority
  ON public.event_queue(priority, created_at)
  WHERE status = 'pending';

-- 서비스별 조회
CREATE INDEX IF NOT EXISTS idx_event_queue_source_service
  ON public.event_queue(source_service);

-- 이벤트 타입별 조회
CREATE INDEX IF NOT EXISTS idx_event_queue_event_type
  ON public.event_queue(event_type);

-- 재시도 대상 조회
CREATE INDEX IF NOT EXISTS idx_event_queue_retry
  ON public.event_queue(next_retry_at)
  WHERE status = 'failed' AND retry_count < max_retries;

-- 멱등성 키 조회 (UNIQUE이므로 자동 인덱스 생성됨)

-- 생성일 기반 정렬 (최근 이벤트 조회)
CREATE INDEX IF NOT EXISTS idx_event_queue_created_at
  ON public.event_queue(created_at DESC);

-- 복합 인덱스: 상태 + 우선순위 + 생성일 (pending 이벤트 처리 순서)
CREATE INDEX IF NOT EXISTS idx_event_queue_processing_order
  ON public.event_queue(status, priority, created_at)
  WHERE status = 'pending';

-- =====================================================
-- 3. RLS POLICIES
-- service_role만 접근 가능
-- =====================================================

ALTER TABLE public.event_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_queue_service_role_all" ON public.event_queue;

CREATE POLICY "event_queue_service_role_all"
  ON public.event_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_event_queue_updated_at ON public.event_queue;
CREATE TRIGGER update_event_queue_updated_at
  BEFORE UPDATE ON public.event_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- 다음 처리할 이벤트 가져오기 (FIFO with priority)
CREATE OR REPLACE FUNCTION public.get_next_event_from_queue()
RETURNS SETOF public.event_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.event_queue
  SET
    status = 'processing',
    updated_at = NOW()
  WHERE id = (
    SELECT id
    FROM public.event_queue
    WHERE status = 'pending'
    ORDER BY
      CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.get_next_event_from_queue IS '큐에서 다음 처리할 이벤트를 가져오고 processing 상태로 변경';

-- 이벤트 처리 완료 표시
CREATE OR REPLACE FUNCTION public.complete_event(
  p_event_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.event_queue
  SET
    status = 'completed',
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_event_id AND status = 'processing';

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.complete_event IS '이벤트 처리 완료 표시';

-- 이벤트 처리 실패 표시 (재시도 스케줄링)
CREATE OR REPLACE FUNCTION public.fail_event(
  p_event_id UUID,
  p_error_message TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
BEGIN
  -- 현재 재시도 횟수 조회
  SELECT retry_count, max_retries
  INTO v_retry_count, v_max_retries
  FROM public.event_queue
  WHERE id = p_event_id;

  IF v_retry_count >= v_max_retries THEN
    -- 최대 재시도 초과: 영구 실패
    UPDATE public.event_queue
    SET
      status = 'failed',
      error_message = p_error_message,
      updated_at = NOW()
    WHERE id = p_event_id;
  ELSE
    -- 재시도 스케줄링 (exponential backoff: 1s, 2s, 4s, ...)
    UPDATE public.event_queue
    SET
      status = 'pending',
      retry_count = retry_count + 1,
      error_message = p_error_message,
      next_retry_at = NOW() + (POWER(2, v_retry_count) || ' seconds')::INTERVAL,
      updated_at = NOW()
    WHERE id = p_event_id;
  END IF;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.fail_event IS '이벤트 처리 실패 표시 및 재시도 스케줄링 (exponential backoff)';

-- 큐 통계 조회
CREATE OR REPLACE FUNCTION public.get_event_queue_stats()
RETURNS TABLE (
  total_count BIGINT,
  pending_count BIGINT,
  processing_count BIGINT,
  completed_count BIGINT,
  failed_count BIGINT,
  critical_pending BIGINT,
  high_pending BIGINT,
  normal_pending BIGINT,
  low_pending BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_count,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_count,
    COUNT(*) FILTER (WHERE status = 'processing')::BIGINT AS processing_count,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed_count,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_count,
    COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'critical')::BIGINT AS critical_pending,
    COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'high')::BIGINT AS high_pending,
    COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'normal')::BIGINT AS normal_pending,
    COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'low')::BIGINT AS low_pending
  FROM public.event_queue;
END;
$$;

COMMENT ON FUNCTION public.get_event_queue_stats IS '이벤트 큐 통계 조회';

-- 오래된 완료 이벤트 정리 (7일 이상)
CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.event_queue
  WHERE
    status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_events IS '7일 이상 된 완료/실패 이벤트 삭제';

-- =====================================================
-- 6. MCP_AUDIT_LOG TABLE (선택적)
-- 감사 로그 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.mcp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 요청 정보
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  service_id TEXT,
  client_id TEXT,

  -- 결과
  status_code INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_code TEXT,

  -- 컨텍스트
  request_id TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,

  -- 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_ms INTEGER
);

-- 테이블 코멘트
COMMENT ON TABLE public.mcp_audit_log IS 'MCP Orchestrator: API 호출 감사 로그';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_mcp_audit_service ON public.mcp_audit_log(service_id);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_endpoint ON public.mcp_audit_log(endpoint);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_created ON public.mcp_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_success ON public.mcp_audit_log(success);

-- RLS
ALTER TABLE public.mcp_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mcp_audit_log_service_role_all" ON public.mcp_audit_log;

CREATE POLICY "mcp_audit_log_service_role_all"
  ON public.mcp_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 완료
-- =====================================================
