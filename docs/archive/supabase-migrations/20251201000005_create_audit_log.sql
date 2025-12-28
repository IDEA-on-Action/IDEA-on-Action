-- =====================================================
-- 감사 로그(Audit Log) 시스템
-- =====================================================
-- 목적: 시스템 내 모든 주요 이벤트 추적 및 감사
-- 작성일: 2025-12-01
-- =====================================================

-- 감사 로그 테이블
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이벤트 정보
  event_type VARCHAR(100) NOT NULL,  -- 'auth.login', 'user.update', 'team.create' 등

  -- 행위자 정보
  actor_id UUID,                      -- 행위자 (사용자 ID)
  actor_type VARCHAR(50),             -- 'user' | 'system' | 'service' | 'anonymous'
  actor_email VARCHAR(255),           -- 이메일 (조회 편의)

  -- 리소스 정보
  resource_type VARCHAR(100),         -- 'user', 'team', 'subscription' 등
  resource_id UUID,                   -- 대상 리소스 ID
  organization_id UUID,               -- 조직 ID (선택)

  -- 액션 정보
  action VARCHAR(50) NOT NULL,        -- 'create', 'read', 'update', 'delete', 'login', 'logout'

  -- 변경 데이터
  changes JSONB,                      -- 변경 전/후 데이터 { before: {}, after: {} }
  metadata JSONB,                     -- 추가 메타데이터

  -- 요청 정보
  ip_address INET,                    -- IP 주소
  user_agent TEXT,                    -- User-Agent
  request_id VARCHAR(64),             -- 요청 추적 ID

  -- 성능 정보
  duration_ms INTEGER,                -- 작업 소요 시간 (밀리초)

  -- 상태 정보
  status VARCHAR(20) NOT NULL,        -- 'success' | 'failure' | 'pending'
  error_code VARCHAR(50),             -- 오류 코드
  error_message TEXT,                 -- 오류 메시지

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 인덱스
-- =====================================================

-- 행위자 기준 조회
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);

-- 리소스 기준 조회
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- 조직 기준 조회
CREATE INDEX idx_audit_log_org ON audit_log(organization_id);

-- 이벤트 타입 기준 조회
CREATE INDEX idx_audit_log_event ON audit_log(event_type);

-- 시간 기준 조회 (최신순)
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- 액션 기준 조회
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- 상태 기준 조회 (실패 이벤트 추적)
CREATE INDEX idx_audit_log_status ON audit_log(status);

-- 복합 인덱스: 리소스 + 시간 (특정 리소스 히스토리)
CREATE INDEX idx_audit_log_resource_time ON audit_log(resource_type, resource_id, created_at DESC);

-- 복합 인덱스: 행위자 + 시간 (사용자 활동 추적)
CREATE INDEX idx_audit_log_actor_time ON audit_log(actor_id, created_at DESC);

-- =====================================================
-- 유틸리티 함수
-- =====================================================

-- 오래된 감사 로그 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- 특정 리소스의 감사 로그 조회 함수
CREATE OR REPLACE FUNCTION get_resource_audit_logs(
  p_resource_type VARCHAR,
  p_resource_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  event_type VARCHAR,
  actor_email VARCHAR,
  action VARCHAR,
  changes JSONB,
  status VARCHAR,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.event_type,
    al.actor_email,
    al.action,
    al.changes,
    al.status,
    al.created_at
  FROM audit_log al
  WHERE al.resource_type = p_resource_type
    AND al.resource_id = p_resource_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 특정 사용자의 감사 로그 조회 함수
CREATE OR REPLACE FUNCTION get_user_audit_logs(
  p_actor_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  event_type VARCHAR,
  resource_type VARCHAR,
  resource_id UUID,
  action VARCHAR,
  status VARCHAR,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.event_type,
    al.resource_type,
    al.resource_id,
    al.action,
    al.status,
    al.created_at
  FROM audit_log al
  WHERE al.actor_id = p_actor_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- RLS 활성화
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 정책: 관리자만 모든 감사 로그 조회 가능
CREATE POLICY "audit_log_admin_read"
  ON audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
        AND admins.role IN ('admin', 'super_admin')
    )
  );

-- 정책: 사용자는 자신의 감사 로그만 조회 가능
CREATE POLICY "audit_log_user_read"
  ON audit_log
  FOR SELECT
  USING (actor_id = auth.uid());

-- 정책: Edge Functions(서비스 역할)만 감사 로그 삽입 가능
CREATE POLICY "audit_log_service_insert"
  ON audit_log
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 코멘트
-- =====================================================

COMMENT ON TABLE audit_log IS '시스템 감사 로그 - 모든 주요 이벤트 추적';
COMMENT ON COLUMN audit_log.event_type IS '이벤트 타입 (auth.login, user.update 등)';
COMMENT ON COLUMN audit_log.actor_type IS '행위자 타입 (user, system, service, anonymous)';
COMMENT ON COLUMN audit_log.changes IS '변경 전/후 데이터 { before: {}, after: {} }';
COMMENT ON COLUMN audit_log.metadata IS '추가 메타데이터 (자유 형식)';
COMMENT ON COLUMN audit_log.request_id IS '요청 추적 ID (분산 추적)';
COMMENT ON COLUMN audit_log.duration_ms IS '작업 소요 시간 (밀리초)';
COMMENT ON COLUMN audit_log.status IS '상태 (success, failure, pending)';
