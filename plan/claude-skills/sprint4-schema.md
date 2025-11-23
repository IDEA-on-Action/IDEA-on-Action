# Claude Skills Sprint 4 - MCP Orchestrator DB 스키마 설계

> MCP Orchestrator 인프라를 위한 데이터베이스 스키마 설계

**작성일**: 2025-11-23
**버전**: 1.0.0
**상태**: Draft
**관련 문서**:
- [architecture.md](./architecture.md)
- [spec/claude-skills/requirements.md](../../spec/claude-skills/requirements.md)

---

## 1. 개요

### 1.1 목적
Sprint 4에서는 MCP Orchestrator의 핵심 인프라를 구축합니다. 이 문서는 서비스 간 인증, 토큰 관리, 이벤트 큐잉을 위한 데이터베이스 스키마를 정의합니다.

### 1.2 범위
- **서비스 토큰 관리**: Minu 서비스 간 인증을 위한 토큰 발급/검증/폐기
- **토큰 갱신**: Refresh Token을 통한 Access Token 갱신
- **이벤트 큐**: 비동기 이벤트 처리 및 재시도 메커니즘
- **Dead Letter Queue**: 실패한 이벤트 보관 및 디버깅

### 1.3 서비스 식별자
```
minu_find   - 사업기회 탐색 (구 Compass Navigator)
minu_frame  - 문제정의 & RFP (구 Compass Cartographer)
minu_build  - 프로젝트 진행 (구 Compass Captain)
minu_keep   - 운영/유지보수 (구 Compass Harbor)
```

---

## 2. 테이블 설계

### 2.1 service_tokens (서비스 간 인증 토큰)

서비스 간 인증을 위한 Access Token을 관리합니다.

```sql
-- =====================================================
-- SERVICE_TOKENS TABLE
-- 서비스 간 인증용 Access Token 관리
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_tokens (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 서비스 정보
  service_name TEXT NOT NULL,

  -- 토큰 정보
  access_token TEXT NOT NULL,          -- JWT Access Token (암호화 저장)
  token_hash TEXT NOT NULL,            -- SHA256 해시 (빠른 검증용)

  -- 권한 정보
  permissions JSONB NOT NULL DEFAULT '["read"]',

  -- 유효 기간
  expires_at TIMESTAMPTZ NOT NULL,

  -- 상태
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- 메타데이터
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_ip INET,
  user_agent TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT valid_service_name CHECK (
    service_name IN ('minu_find', 'minu_frame', 'minu_build', 'minu_keep')
  ),
  CONSTRAINT valid_expires_at CHECK (expires_at > created_at),
  CONSTRAINT token_not_empty CHECK (length(access_token) > 0),
  CONSTRAINT token_hash_not_empty CHECK (length(token_hash) > 0)
);

-- 테이블 코멘트
COMMENT ON TABLE public.service_tokens IS 'MCP Orchestrator: 서비스 간 인증 토큰 관리';
COMMENT ON COLUMN public.service_tokens.id IS '토큰 고유 ID';
COMMENT ON COLUMN public.service_tokens.service_name IS '토큰 발급 대상 서비스 (minu_find, minu_frame, minu_build, minu_keep)';
COMMENT ON COLUMN public.service_tokens.access_token IS 'JWT Access Token (암호화 저장)';
COMMENT ON COLUMN public.service_tokens.token_hash IS 'SHA256 해시 - 빠른 토큰 검증용';
COMMENT ON COLUMN public.service_tokens.permissions IS '부여된 권한 목록 (JSON Array)';
COMMENT ON COLUMN public.service_tokens.expires_at IS '토큰 만료 시간';
COMMENT ON COLUMN public.service_tokens.is_revoked IS '폐기 여부';
COMMENT ON COLUMN public.service_tokens.revoked_at IS '폐기 시간';
COMMENT ON COLUMN public.service_tokens.revoked_reason IS '폐기 사유';
COMMENT ON COLUMN public.service_tokens.issued_by IS '발급자 ID';
COMMENT ON COLUMN public.service_tokens.client_ip IS '발급 요청 클라이언트 IP';
COMMENT ON COLUMN public.service_tokens.user_agent IS '발급 요청 User-Agent';
```

### 2.2 refresh_tokens (토큰 갱신용)

Access Token 갱신을 위한 Refresh Token을 관리합니다.

```sql
-- =====================================================
-- REFRESH_TOKENS TABLE
-- Access Token 갱신을 위한 Refresh Token 관리
-- =====================================================
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연결된 Service Token
  service_token_id UUID NOT NULL REFERENCES public.service_tokens(id) ON DELETE CASCADE,

  -- Refresh Token
  refresh_token TEXT NOT NULL,         -- JWT Refresh Token (암호화 저장)
  token_hash TEXT NOT NULL,            -- SHA256 해시 (빠른 검증용)

  -- 유효 기간 (Refresh Token은 더 긴 유효기간)
  expires_at TIMESTAMPTZ,              -- NULL인 경우 무기한 (권장하지 않음)

  -- 폐기 정보
  revoked_at TIMESTAMPTZ,              -- NULL이면 유효
  revoked_reason TEXT,

  -- 사용 이력
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,

  -- 메타데이터
  replaced_by UUID REFERENCES public.refresh_tokens(id), -- 토큰 로테이션 시 새 토큰 참조

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT refresh_token_not_empty CHECK (length(refresh_token) > 0),
  CONSTRAINT refresh_token_hash_not_empty CHECK (length(token_hash) > 0)
);

-- 테이블 코멘트
COMMENT ON TABLE public.refresh_tokens IS 'MCP Orchestrator: Refresh Token 관리 (Access Token 갱신용)';
COMMENT ON COLUMN public.refresh_tokens.id IS 'Refresh Token 고유 ID';
COMMENT ON COLUMN public.refresh_tokens.service_token_id IS '연결된 Service Token ID (FK)';
COMMENT ON COLUMN public.refresh_tokens.refresh_token IS 'JWT Refresh Token (암호화 저장)';
COMMENT ON COLUMN public.refresh_tokens.token_hash IS 'SHA256 해시 - 빠른 토큰 검증용';
COMMENT ON COLUMN public.refresh_tokens.expires_at IS '만료 시간 (NULL = 무기한, 권장하지 않음)';
COMMENT ON COLUMN public.refresh_tokens.revoked_at IS '폐기 시간 (NULL = 유효)';
COMMENT ON COLUMN public.refresh_tokens.revoked_reason IS '폐기 사유';
COMMENT ON COLUMN public.refresh_tokens.last_used_at IS '마지막 사용 시간';
COMMENT ON COLUMN public.refresh_tokens.use_count IS '사용 횟수';
COMMENT ON COLUMN public.refresh_tokens.replaced_by IS '토큰 로테이션 시 새 토큰 ID';
```

### 2.3 event_queue (이벤트 큐)

비동기 이벤트 처리 및 재시도를 위한 큐입니다.

```sql
-- =====================================================
-- EVENT_QUEUE TABLE
-- 비동기 이벤트 처리 큐 (재시도 지원)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.event_queue (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이벤트 정보
  event_type TEXT NOT NULL,            -- 이벤트 유형 (예: 'token.issued', 'service.sync')
  source_service TEXT NOT NULL,        -- 이벤트 발생 서비스
  target_service TEXT,                 -- 대상 서비스 (NULL = 브로드캐스트)

  -- 페이로드
  payload JSONB NOT NULL DEFAULT '{}',

  -- 처리 상태
  status TEXT NOT NULL DEFAULT 'pending',

  -- 재시도 설정
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- 처리 정보
  processed_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  processor_id TEXT,                   -- 처리 중인 워커 ID

  -- 에러 정보
  last_error TEXT,
  error_history JSONB DEFAULT '[]',    -- 에러 이력 배열

  -- 우선순위 (낮을수록 높은 우선순위)
  priority INTEGER NOT NULL DEFAULT 5,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT valid_source_service CHECK (
    source_service IN ('minu_find', 'minu_frame', 'minu_build', 'minu_keep', 'hub')
  ),
  CONSTRAINT valid_target_service CHECK (
    target_service IS NULL OR
    target_service IN ('minu_find', 'minu_frame', 'minu_build', 'minu_keep', 'hub')
  ),
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0),
  CONSTRAINT valid_max_retries CHECK (max_retries >= 0),
  CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 10)
);

-- 테이블 코멘트
COMMENT ON TABLE public.event_queue IS 'MCP Orchestrator: 비동기 이벤트 처리 큐';
COMMENT ON COLUMN public.event_queue.id IS '이벤트 고유 ID';
COMMENT ON COLUMN public.event_queue.event_type IS '이벤트 유형 (token.issued, service.sync, data.updated 등)';
COMMENT ON COLUMN public.event_queue.source_service IS '이벤트 발생 서비스';
COMMENT ON COLUMN public.event_queue.target_service IS '대상 서비스 (NULL = 브로드캐스트)';
COMMENT ON COLUMN public.event_queue.payload IS '이벤트 페이로드 (JSON)';
COMMENT ON COLUMN public.event_queue.status IS '처리 상태: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN public.event_queue.retry_count IS '현재 재시도 횟수';
COMMENT ON COLUMN public.event_queue.max_retries IS '최대 재시도 횟수 (기본 3회)';
COMMENT ON COLUMN public.event_queue.next_retry_at IS '다음 재시도 예정 시간';
COMMENT ON COLUMN public.event_queue.processed_at IS '처리 완료 시간';
COMMENT ON COLUMN public.event_queue.processing_started_at IS '처리 시작 시간';
COMMENT ON COLUMN public.event_queue.processor_id IS '처리 중인 워커 식별자';
COMMENT ON COLUMN public.event_queue.last_error IS '마지막 에러 메시지';
COMMENT ON COLUMN public.event_queue.error_history IS '에러 이력 (JSON Array)';
COMMENT ON COLUMN public.event_queue.priority IS '우선순위 (1=최고, 10=최저, 기본 5)';
```

### 2.4 dead_letter_queue (실패한 이벤트)

최대 재시도 횟수를 초과하여 실패한 이벤트를 보관합니다.

```sql
-- =====================================================
-- DEAD_LETTER_QUEUE TABLE
-- 실패한 이벤트 보관 (디버깅 및 수동 재처리용)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.dead_letter_queue (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 원본 이벤트 참조
  event_id UUID NOT NULL REFERENCES public.event_queue(id) ON DELETE SET NULL,

  -- 원본 이벤트 정보 (이벤트 삭제 후에도 보존)
  original_event_type TEXT NOT NULL,
  original_source_service TEXT NOT NULL,
  original_target_service TEXT,
  original_payload JSONB NOT NULL,

  -- 실패 정보
  error_message TEXT NOT NULL,
  error_code TEXT,
  error_stack TEXT,

  -- 재시도 이력
  total_retry_count INTEGER NOT NULL DEFAULT 0,
  error_history JSONB DEFAULT '[]',

  -- 수동 처리 정보
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- 타임스탬프
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 테이블 코멘트
COMMENT ON TABLE public.dead_letter_queue IS 'MCP Orchestrator: 실패한 이벤트 보관 (Dead Letter Queue)';
COMMENT ON COLUMN public.dead_letter_queue.id IS 'DLQ 항목 고유 ID';
COMMENT ON COLUMN public.dead_letter_queue.event_id IS '원본 이벤트 ID (FK)';
COMMENT ON COLUMN public.dead_letter_queue.original_event_type IS '원본 이벤트 유형';
COMMENT ON COLUMN public.dead_letter_queue.original_source_service IS '원본 이벤트 발생 서비스';
COMMENT ON COLUMN public.dead_letter_queue.original_target_service IS '원본 이벤트 대상 서비스';
COMMENT ON COLUMN public.dead_letter_queue.original_payload IS '원본 이벤트 페이로드';
COMMENT ON COLUMN public.dead_letter_queue.error_message IS '최종 에러 메시지';
COMMENT ON COLUMN public.dead_letter_queue.error_code IS '에러 코드';
COMMENT ON COLUMN public.dead_letter_queue.error_stack IS '에러 스택 트레이스';
COMMENT ON COLUMN public.dead_letter_queue.total_retry_count IS '총 재시도 횟수';
COMMENT ON COLUMN public.dead_letter_queue.error_history IS '에러 이력 (JSON Array)';
COMMENT ON COLUMN public.dead_letter_queue.resolved_at IS '수동 해결 시간';
COMMENT ON COLUMN public.dead_letter_queue.resolved_by IS '수동 해결자 ID';
COMMENT ON COLUMN public.dead_letter_queue.resolution_notes IS '해결 메모';
COMMENT ON COLUMN public.dead_letter_queue.failed_at IS 'DLQ로 이동된 시간';
```

---

## 3. 인덱스 설계

### 3.1 service_tokens 인덱스

```sql
-- =====================================================
-- SERVICE_TOKENS INDEXES
-- =====================================================

-- 서비스별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_service_tokens_service_name
  ON public.service_tokens(service_name);

-- 토큰 해시로 빠른 검증
CREATE INDEX IF NOT EXISTS idx_service_tokens_token_hash
  ON public.service_tokens(token_hash);

-- 만료 시간 기반 정리 (expired & not revoked)
CREATE INDEX IF NOT EXISTS idx_service_tokens_expires_at
  ON public.service_tokens(expires_at)
  WHERE is_revoked = false;

-- 유효한 토큰만 조회 (is_revoked = false AND expires_at > now())
CREATE INDEX IF NOT EXISTS idx_service_tokens_valid
  ON public.service_tokens(service_name, expires_at)
  WHERE is_revoked = false;

-- 발급자별 조회
CREATE INDEX IF NOT EXISTS idx_service_tokens_issued_by
  ON public.service_tokens(issued_by)
  WHERE issued_by IS NOT NULL;

-- 생성일 기반 정렬
CREATE INDEX IF NOT EXISTS idx_service_tokens_created_at
  ON public.service_tokens(created_at DESC);
```

### 3.2 refresh_tokens 인덱스

```sql
-- =====================================================
-- REFRESH_TOKENS INDEXES
-- =====================================================

-- 서비스 토큰별 조회
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_service_token_id
  ON public.refresh_tokens(service_token_id);

-- 토큰 해시로 빠른 검증
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
  ON public.refresh_tokens(token_hash);

-- 유효한 토큰만 조회 (revoked_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_valid
  ON public.refresh_tokens(service_token_id)
  WHERE revoked_at IS NULL;

-- 만료 시간 기반 정리
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON public.refresh_tokens(expires_at)
  WHERE revoked_at IS NULL AND expires_at IS NOT NULL;
```

### 3.3 event_queue 인덱스

```sql
-- =====================================================
-- EVENT_QUEUE INDEXES
-- =====================================================

-- 대기 중인 이벤트 조회 (우선순위 + 생성시간 순)
CREATE INDEX IF NOT EXISTS idx_event_queue_pending
  ON public.event_queue(priority, created_at)
  WHERE status = 'pending';

-- 재시도 대상 이벤트 조회
CREATE INDEX IF NOT EXISTS idx_event_queue_retry
  ON public.event_queue(next_retry_at)
  WHERE status = 'pending' AND retry_count > 0;

-- 이벤트 유형별 조회
CREATE INDEX IF NOT EXISTS idx_event_queue_event_type
  ON public.event_queue(event_type);

-- 소스 서비스별 조회
CREATE INDEX IF NOT EXISTS idx_event_queue_source_service
  ON public.event_queue(source_service);

-- 대상 서비스별 조회
CREATE INDEX IF NOT EXISTS idx_event_queue_target_service
  ON public.event_queue(target_service)
  WHERE target_service IS NOT NULL;

-- 상태별 조회
CREATE INDEX IF NOT EXISTS idx_event_queue_status
  ON public.event_queue(status);

-- 처리 중인 이벤트 (타임아웃 감지용)
CREATE INDEX IF NOT EXISTS idx_event_queue_processing
  ON public.event_queue(processing_started_at)
  WHERE status = 'processing';

-- 생성일 기반 정렬/필터
CREATE INDEX IF NOT EXISTS idx_event_queue_created_at
  ON public.event_queue(created_at DESC);

-- 처리 완료/실패 이벤트 정리용
CREATE INDEX IF NOT EXISTS idx_event_queue_processed_at
  ON public.event_queue(processed_at)
  WHERE status IN ('completed', 'failed');
```

### 3.4 dead_letter_queue 인덱스

```sql
-- =====================================================
-- DEAD_LETTER_QUEUE INDEXES
-- =====================================================

-- 원본 이벤트 참조
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_event_id
  ON public.dead_letter_queue(event_id)
  WHERE event_id IS NOT NULL;

-- 이벤트 유형별 조회
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_event_type
  ON public.dead_letter_queue(original_event_type);

-- 소스 서비스별 조회
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_source
  ON public.dead_letter_queue(original_source_service);

-- 미해결 항목 조회
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_unresolved
  ON public.dead_letter_queue(failed_at DESC)
  WHERE resolved_at IS NULL;

-- 실패 시간 기반 정렬
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_failed_at
  ON public.dead_letter_queue(failed_at DESC);
```

---

## 4. RLS 정책

MCP Orchestrator 테이블은 **service_role만 접근** 가능하도록 설정합니다. 일반 사용자나 관리자도 직접 접근할 수 없으며, Edge Function을 통해서만 접근합니다.

### 4.1 service_tokens RLS

```sql
-- =====================================================
-- SERVICE_TOKENS RLS POLICIES
-- =====================================================

-- RLS 활성화
ALTER TABLE public.service_tokens ENABLE ROW LEVEL SECURITY;

-- 모든 기존 정책 제거 (안전을 위해)
DROP POLICY IF EXISTS "service_tokens_service_role_all" ON public.service_tokens;

-- service_role만 모든 작업 가능
CREATE POLICY "service_tokens_service_role_all"
  ON public.service_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 일반 사용자는 접근 불가 (명시적 차단)
-- RLS가 활성화되면 기본적으로 차단됨
```

### 4.2 refresh_tokens RLS

```sql
-- =====================================================
-- REFRESH_TOKENS RLS POLICIES
-- =====================================================

-- RLS 활성화
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- 모든 기존 정책 제거
DROP POLICY IF EXISTS "refresh_tokens_service_role_all" ON public.refresh_tokens;

-- service_role만 모든 작업 가능
CREATE POLICY "refresh_tokens_service_role_all"
  ON public.refresh_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 4.3 event_queue RLS

```sql
-- =====================================================
-- EVENT_QUEUE RLS POLICIES
-- =====================================================

-- RLS 활성화
ALTER TABLE public.event_queue ENABLE ROW LEVEL SECURITY;

-- 모든 기존 정책 제거
DROP POLICY IF EXISTS "event_queue_service_role_all" ON public.event_queue;

-- service_role만 모든 작업 가능
CREATE POLICY "event_queue_service_role_all"
  ON public.event_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 4.4 dead_letter_queue RLS

```sql
-- =====================================================
-- DEAD_LETTER_QUEUE RLS POLICIES
-- =====================================================

-- RLS 활성화
ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- 모든 기존 정책 제거
DROP POLICY IF EXISTS "dead_letter_queue_service_role_all" ON public.dead_letter_queue;
DROP POLICY IF EXISTS "dead_letter_queue_admin_select" ON public.dead_letter_queue;

-- service_role은 모든 작업 가능
CREATE POLICY "dead_letter_queue_service_role_all"
  ON public.dead_letter_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 관리자는 조회만 가능 (모니터링 목적)
CREATE POLICY "dead_letter_queue_admin_select"
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
```

---

## 5. 트리거 및 함수

### 5.1 updated_at 자동 갱신

```sql
-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

-- service_tokens
CREATE TRIGGER update_service_tokens_updated_at
  BEFORE UPDATE ON public.service_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- refresh_tokens
CREATE TRIGGER update_refresh_tokens_updated_at
  BEFORE UPDATE ON public.refresh_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- event_queue
CREATE TRIGGER update_event_queue_updated_at
  BEFORE UPDATE ON public.event_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### 5.2 이벤트 실패 시 DLQ 이동

```sql
-- =====================================================
-- MOVE TO DEAD LETTER QUEUE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.move_event_to_dlq()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 최대 재시도 횟수 초과 시 DLQ로 이동
  IF NEW.status = 'failed' AND NEW.retry_count >= NEW.max_retries THEN
    INSERT INTO public.dead_letter_queue (
      event_id,
      original_event_type,
      original_source_service,
      original_target_service,
      original_payload,
      error_message,
      total_retry_count,
      error_history,
      failed_at
    ) VALUES (
      NEW.id,
      NEW.event_type,
      NEW.source_service,
      NEW.target_service,
      NEW.payload,
      COALESCE(NEW.last_error, 'Unknown error'),
      NEW.retry_count,
      NEW.error_history,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 트리거 연결
CREATE TRIGGER event_queue_to_dlq_trigger
  AFTER UPDATE ON public.event_queue
  FOR EACH ROW
  WHEN (NEW.status = 'failed' AND NEW.retry_count >= NEW.max_retries)
  EXECUTE FUNCTION public.move_event_to_dlq();
```

### 5.3 만료 토큰 정리 함수

```sql
-- =====================================================
-- CLEANUP EXPIRED TOKENS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- 만료된 service_tokens 폐기 처리 (실제 삭제는 하지 않음)
  UPDATE public.service_tokens
  SET
    is_revoked = true,
    revoked_at = NOW(),
    revoked_reason = 'Token expired'
  WHERE
    expires_at < NOW()
    AND is_revoked = false;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- 만료된 refresh_tokens 폐기 처리
  UPDATE public.refresh_tokens
  SET
    revoked_at = NOW(),
    revoked_reason = 'Token expired'
  WHERE
    expires_at < NOW()
    AND revoked_at IS NULL
    AND expires_at IS NOT NULL;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_tokens IS '만료된 토큰을 폐기 상태로 변경';
```

### 5.4 완료된 이벤트 정리 함수

```sql
-- =====================================================
-- CLEANUP OLD EVENTS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_events(
  retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- 완료된 이벤트 삭제 (retention_days 이전)
  DELETE FROM public.event_queue
  WHERE
    status IN ('completed', 'cancelled')
    AND processed_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_events IS '오래된 완료 이벤트 삭제 (기본 30일 보관)';
```

---

## 6. 마이그레이션 파일명 규칙

### 6.1 파일명 형식

```
YYYYMMDDHHMMSS_<description>.sql
```

- **YYYYMMDD**: 날짜 (UTC 기준)
- **HHMMSS**: 시간 (UTC 기준)
- **description**: 스네이크 케이스로 설명

### 6.2 Sprint 4 마이그레이션 파일 목록

```
supabase/migrations/
├── 20251124100000_create_mcp_service_tokens.sql      # service_tokens 테이블
├── 20251124100001_create_mcp_refresh_tokens.sql      # refresh_tokens 테이블
├── 20251124100002_create_mcp_event_queue.sql         # event_queue 테이블
├── 20251124100003_create_mcp_dead_letter_queue.sql   # dead_letter_queue 테이블
├── 20251124100004_create_mcp_indexes.sql             # 모든 인덱스
├── 20251124100005_create_mcp_rls_policies.sql        # RLS 정책
├── 20251124100006_create_mcp_functions.sql           # 트리거 및 함수
└── 20251124100007_seed_mcp_test_data.sql             # (선택) 테스트 데이터
```

### 6.3 마이그레이션 작성 원칙

1. **IF NOT EXISTS**: 테이블/인덱스 생성 시 항상 사용
2. **DROP IF EXISTS**: 정책/함수 재생성 전 기존 객체 제거
3. **COMMENT ON**: 모든 테이블/컬럼에 설명 추가
4. **트랜잭션**: 각 마이그레이션은 하나의 트랜잭션으로 처리
5. **롤백 가능**: 가능한 한 롤백 스크립트도 함께 작성

---

## 7. 보안 고려사항

### 7.1 토큰 저장

- **access_token/refresh_token**: 암호화하여 저장 (AES-256-GCM 권장)
- **token_hash**: SHA-256 해시로 저장 (빠른 검증용)
- **Edge Function**에서 암/복호화 수행

### 7.2 토큰 수명

| 토큰 유형 | 권장 수명 | 갱신 가능 |
|----------|----------|----------|
| Access Token | 1시간 | Refresh Token으로 갱신 |
| Refresh Token | 7일 | 재발급 (토큰 로테이션) |

### 7.3 접근 제어

- **RLS**: 모든 테이블에 service_role만 접근
- **Edge Function**: JWT 검증 후 service_role로 DB 접근
- **감사 로그**: 모든 토큰 발급/폐기 기록

---

## 8. ERD (Entity Relationship Diagram)

```
┌───────────────────────────┐
│      service_tokens       │
├───────────────────────────┤
│ PK id (UUID)              │
│    service_name           │
│    access_token           │
│    token_hash             │
│    permissions (JSONB)    │
│    expires_at             │
│    is_revoked             │
│    revoked_at             │
│    revoked_reason         │
│ FK issued_by              │
│    client_ip              │
│    user_agent             │
│    created_at             │
│    updated_at             │
└───────────┬───────────────┘
            │ 1
            │
            │ N
┌───────────┴───────────────┐
│      refresh_tokens       │
├───────────────────────────┤
│ PK id (UUID)              │
│ FK service_token_id       │
│    refresh_token          │
│    token_hash             │
│    expires_at             │
│    revoked_at             │
│    revoked_reason         │
│    last_used_at           │
│    use_count              │
│ FK replaced_by            │
│    created_at             │
│    updated_at             │
└───────────────────────────┘

┌───────────────────────────┐
│       event_queue         │
├───────────────────────────┤
│ PK id (UUID)              │
│    event_type             │
│    source_service         │
│    target_service         │
│    payload (JSONB)        │
│    status                 │
│    retry_count            │
│    max_retries            │
│    next_retry_at          │
│    processed_at           │
│    processing_started_at  │
│    processor_id           │
│    last_error             │
│    error_history (JSONB)  │
│    priority               │
│    created_at             │
│    updated_at             │
└───────────┬───────────────┘
            │ 1
            │
            │ N
┌───────────┴───────────────┐
│    dead_letter_queue      │
├───────────────────────────┤
│ PK id (UUID)              │
│ FK event_id               │
│    original_event_type    │
│    original_source_service│
│    original_target_service│
│    original_payload       │
│    error_message          │
│    error_code             │
│    error_stack            │
│    total_retry_count      │
│    error_history (JSONB)  │
│    resolved_at            │
│ FK resolved_by            │
│    resolution_notes       │
│    failed_at              │
│    created_at             │
└───────────────────────────┘
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |
