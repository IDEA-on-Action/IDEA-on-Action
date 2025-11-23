-- =====================================================
-- DEAD LETTER QUEUE (DLQ) TABLE
-- MCP Router에서 처리 실패한 이벤트를 저장하는 테이블
--
-- 관련 문서: plan/claude-skills/sprint4-functions.md
-- 버전: 1.0.0
-- 작성일: 2025-11-23
-- =====================================================

-- =====================================================
-- 1. DEAD_LETTER_QUEUE TABLE
-- 최대 재시도 후에도 처리되지 않은 이벤트 보관
-- =====================================================
CREATE TABLE IF NOT EXISTS public.dead_letter_queue (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 원본 이벤트 참조
  original_event_id UUID REFERENCES public.event_queue(id) ON DELETE SET NULL,

  -- 이벤트 정보
  event_type TEXT NOT NULL,
  source_service TEXT NOT NULL,
  target_service TEXT,

  -- 페이로드
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 에러 정보
  error_message TEXT NOT NULL,
  error_history JSONB DEFAULT '[]'::jsonb,

  -- 재시도 정보
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- 실패 및 해결 정보
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- 상태
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'retrying', 'resolved', 'discarded')),

  -- 메타데이터
  correlation_id UUID,
  idempotency_key TEXT,
  priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('critical', 'high', 'normal', 'low')),

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT valid_dlq_source_service CHECK (
    source_service IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep', 'central-hub')
  )
);

-- 테이블 코멘트
COMMENT ON TABLE public.dead_letter_queue IS 'MCP Router: 처리 실패 이벤트 보관 (Dead Letter Queue)';
COMMENT ON COLUMN public.dead_letter_queue.id IS 'DLQ 항목 고유 ID';
COMMENT ON COLUMN public.dead_letter_queue.original_event_id IS '원본 event_queue 항목 ID';
COMMENT ON COLUMN public.dead_letter_queue.event_type IS '이벤트 유형';
COMMENT ON COLUMN public.dead_letter_queue.source_service IS '이벤트 발생 서비스';
COMMENT ON COLUMN public.dead_letter_queue.target_service IS '이벤트 대상 서비스';
COMMENT ON COLUMN public.dead_letter_queue.payload IS '이벤트 페이로드 (JSON)';
COMMENT ON COLUMN public.dead_letter_queue.error_message IS '마지막 에러 메시지';
COMMENT ON COLUMN public.dead_letter_queue.error_history IS '에러 히스토리 (JSON 배열)';
COMMENT ON COLUMN public.dead_letter_queue.retry_count IS '총 재시도 횟수';
COMMENT ON COLUMN public.dead_letter_queue.failed_at IS '최초 실패 시간';
COMMENT ON COLUMN public.dead_letter_queue.resolved_at IS '해결 완료 시간';
COMMENT ON COLUMN public.dead_letter_queue.resolved_by IS '해결 처리자 (관리자 ID)';
COMMENT ON COLUMN public.dead_letter_queue.resolution_notes IS '해결 노트/메모';
COMMENT ON COLUMN public.dead_letter_queue.status IS '상태: pending, retrying, resolved, discarded';
COMMENT ON COLUMN public.dead_letter_queue.correlation_id IS '연관 이벤트 추적 ID';
COMMENT ON COLUMN public.dead_letter_queue.idempotency_key IS '멱등성 키';
COMMENT ON COLUMN public.dead_letter_queue.priority IS '원본 이벤트 우선순위';

-- =====================================================
-- 2. INDEXES
-- =====================================================

-- 상태별 조회 (pending 상태 위주)
CREATE INDEX IF NOT EXISTS idx_dlq_status
  ON public.dead_letter_queue(status)
  WHERE status IN ('pending', 'retrying');

-- 서비스별 조회
CREATE INDEX IF NOT EXISTS idx_dlq_source_service
  ON public.dead_letter_queue(source_service);

-- 이벤트 타입별 조회
CREATE INDEX IF NOT EXISTS idx_dlq_event_type
  ON public.dead_letter_queue(event_type);

-- 실패 시간 기반 정렬
CREATE INDEX IF NOT EXISTS idx_dlq_failed_at
  ON public.dead_letter_queue(failed_at DESC);

-- 원본 이벤트 ID 조회
CREATE INDEX IF NOT EXISTS idx_dlq_original_event_id
  ON public.dead_letter_queue(original_event_id)
  WHERE original_event_id IS NOT NULL;

-- 해결자별 조회
CREATE INDEX IF NOT EXISTS idx_dlq_resolved_by
  ON public.dead_letter_queue(resolved_by)
  WHERE resolved_by IS NOT NULL;

-- 복합 인덱스: 상태 + 우선순위 + 실패 시간
CREATE INDEX IF NOT EXISTS idx_dlq_pending_priority
  ON public.dead_letter_queue(status, priority, failed_at)
  WHERE status = 'pending';

-- =====================================================
-- 3. RLS POLICIES
-- service_role과 관리자만 접근 가능
-- =====================================================

ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dlq_service_role_all" ON public.dead_letter_queue;

CREATE POLICY "dlq_service_role_all"
  ON public.dead_letter_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 관리자 읽기/수정 정책
DROP POLICY IF EXISTS "dlq_admin_select" ON public.dead_letter_queue;

CREATE POLICY "dlq_admin_select"
  ON public.dead_letter_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "dlq_admin_update" ON public.dead_letter_queue;

CREATE POLICY "dlq_admin_update"
  ON public.dead_letter_queue
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 4. UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_dead_letter_queue_updated_at ON public.dead_letter_queue;
CREATE TRIGGER update_dead_letter_queue_updated_at
  BEFORE UPDATE ON public.dead_letter_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- 이벤트를 DLQ로 이동
CREATE OR REPLACE FUNCTION public.move_event_to_dlq(
  p_event_id UUID,
  p_error_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.event_queue;
  v_dlq_id UUID;
  v_error_history JSONB;
BEGIN
  -- 원본 이벤트 조회
  SELECT * INTO v_event
  FROM public.event_queue
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found: %', p_event_id;
  END IF;

  -- 에러 히스토리 생성
  v_error_history = jsonb_build_array(
    jsonb_build_object(
      'error', p_error_message,
      'timestamp', NOW()::TEXT,
      'retry_count', v_event.retry_count
    )
  );

  -- DLQ에 삽입
  INSERT INTO public.dead_letter_queue (
    original_event_id,
    event_type,
    source_service,
    target_service,
    payload,
    error_message,
    error_history,
    retry_count,
    correlation_id,
    idempotency_key,
    priority
  ) VALUES (
    v_event.id,
    v_event.event_type,
    v_event.source_service,
    v_event.target_service,
    v_event.payload,
    p_error_message,
    v_error_history,
    v_event.retry_count,
    v_event.correlation_id,
    v_event.idempotency_key,
    v_event.priority
  )
  RETURNING id INTO v_dlq_id;

  -- 원본 이벤트 상태를 'failed'로 변경
  UPDATE public.event_queue
  SET
    status = 'failed',
    error_message = p_error_message,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_event_id;

  RETURN v_dlq_id;
END;
$$;

COMMENT ON FUNCTION public.move_event_to_dlq IS '처리 실패 이벤트를 Dead Letter Queue로 이동';

-- DLQ 항목 재시도
CREATE OR REPLACE FUNCTION public.retry_dlq_event(
  p_dlq_id UUID,
  p_admin_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dlq public.dead_letter_queue;
  v_new_event_id UUID;
BEGIN
  -- DLQ 항목 조회
  SELECT * INTO v_dlq
  FROM public.dead_letter_queue
  WHERE id = p_dlq_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DLQ item not found or not in pending status: %', p_dlq_id;
  END IF;

  -- DLQ 상태를 retrying으로 변경
  UPDATE public.dead_letter_queue
  SET
    status = 'retrying',
    updated_at = NOW()
  WHERE id = p_dlq_id;

  -- 새 이벤트 생성 (event_queue에 재삽입)
  INSERT INTO public.event_queue (
    event_type,
    source_service,
    target_service,
    payload,
    priority,
    status,
    retry_count,
    correlation_id
  ) VALUES (
    v_dlq.event_type,
    v_dlq.source_service,
    v_dlq.target_service,
    v_dlq.payload,
    v_dlq.priority,
    'pending',
    0,
    COALESCE(v_dlq.correlation_id, gen_random_uuid())
  )
  RETURNING id INTO v_new_event_id;

  RETURN v_new_event_id;
END;
$$;

COMMENT ON FUNCTION public.retry_dlq_event IS 'DLQ 항목을 재시도 (새 이벤트로 재삽입)';

-- DLQ 항목 해결 표시
CREATE OR REPLACE FUNCTION public.resolve_dlq_event(
  p_dlq_id UUID,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.dead_letter_queue
  SET
    status = 'resolved',
    resolved_at = NOW(),
    resolved_by = p_admin_id,
    resolution_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_dlq_id AND status IN ('pending', 'retrying');

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.resolve_dlq_event IS 'DLQ 항목을 해결됨으로 표시';

-- DLQ 항목 폐기
CREATE OR REPLACE FUNCTION public.discard_dlq_event(
  p_dlq_id UUID,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.dead_letter_queue
  SET
    status = 'discarded',
    resolved_at = NOW(),
    resolved_by = p_admin_id,
    resolution_notes = COALESCE(p_notes, 'Discarded by admin'),
    updated_at = NOW()
  WHERE id = p_dlq_id AND status = 'pending';

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.discard_dlq_event IS 'DLQ 항목을 폐기 (무시)';

-- DLQ 통계 조회
CREATE OR REPLACE FUNCTION public.get_dlq_stats()
RETURNS TABLE (
  total_count BIGINT,
  pending_count BIGINT,
  retrying_count BIGINT,
  resolved_count BIGINT,
  discarded_count BIGINT,
  by_service JSONB,
  by_event_type JSONB,
  oldest_pending_at TIMESTAMPTZ
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
    COUNT(*) FILTER (WHERE status = 'retrying')::BIGINT AS retrying_count,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT AS resolved_count,
    COUNT(*) FILTER (WHERE status = 'discarded')::BIGINT AS discarded_count,
    (
      SELECT jsonb_object_agg(source_service, cnt)
      FROM (
        SELECT source_service, COUNT(*)::BIGINT as cnt
        FROM public.dead_letter_queue
        WHERE status = 'pending'
        GROUP BY source_service
      ) t
    ) AS by_service,
    (
      SELECT jsonb_object_agg(event_type, cnt)
      FROM (
        SELECT event_type, COUNT(*)::BIGINT as cnt
        FROM public.dead_letter_queue
        WHERE status = 'pending'
        GROUP BY event_type
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    ) AS by_event_type,
    (
      SELECT MIN(failed_at)
      FROM public.dead_letter_queue
      WHERE status = 'pending'
    ) AS oldest_pending_at
  FROM public.dead_letter_queue;
END;
$$;

COMMENT ON FUNCTION public.get_dlq_stats IS 'Dead Letter Queue 통계 조회';

-- 오래된 해결/폐기된 DLQ 항목 정리 (30일 이상)
CREATE OR REPLACE FUNCTION public.cleanup_old_dlq_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.dead_letter_queue
  WHERE
    status IN ('resolved', 'discarded')
    AND resolved_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_dlq_events IS '30일 이상 된 해결/폐기 DLQ 항목 삭제';

-- =====================================================
-- 6. FAIL_EVENT 함수 업데이트 (DLQ 연동)
-- 최대 재시도 초과 시 DLQ로 이동
-- =====================================================

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
  v_dlq_id UUID;
BEGIN
  -- 현재 재시도 횟수 조회
  SELECT retry_count, max_retries
  INTO v_retry_count, v_max_retries
  FROM public.event_queue
  WHERE id = p_event_id;

  IF v_retry_count >= v_max_retries THEN
    -- 최대 재시도 초과: DLQ로 이동
    v_dlq_id := public.move_event_to_dlq(p_event_id, p_error_message);

    -- 로그 출력 (선택적)
    RAISE NOTICE 'Event % moved to DLQ as %', p_event_id, v_dlq_id;
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

COMMENT ON FUNCTION public.fail_event IS '이벤트 처리 실패 표시 및 재시도/DLQ 이동 (exponential backoff)';

-- =====================================================
-- 완료
-- =====================================================
