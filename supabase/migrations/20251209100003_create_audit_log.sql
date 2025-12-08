-- v2.36.0 Sprint 4: Enhanced Audit Log System
-- Migration: 20251209100003_create_audit_log.sql
-- Author: Claude AI
-- Date: 2025-12-09
-- Description: 운영 모니터링 및 감사 추적을 위한 고도화된 Audit Log 시스템

-- =====================================================
-- 1. AUDIT_LOG TABLE (Enhanced Version)
-- =====================================================
-- 기존 audit_logs 테이블과 별도로 새로운 고도화된 테이블 생성
-- 기존 시스템과 호환성 유지를 위해 다른 이름 사용

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event Classification
  event_type VARCHAR(100) NOT NULL, -- user.login, subscription.created 등
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'login', 'logout', 'grant', 'revoke', 'cancel', 'refund')),

  -- Actor Information
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type VARCHAR(50) DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'service', 'admin')),

  -- Resource Information
  resource_type VARCHAR(100), -- service, subscription, team, permission 등
  resource_id UUID,

  -- Change Tracking
  changes JSONB, -- { field: { old: value, new: value } }

  -- Additional Context
  metadata JSONB, -- 추가 메타데이터 (예: 결제 금액, 플랜명 등)

  -- Request Context
  ip_address INET,
  user_agent TEXT,
  session_id UUID,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

-- 배우(Actor) 기반 검색
CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON public.audit_log(actor_id);

-- 리소스 기반 검색
CREATE INDEX IF NOT EXISTS idx_audit_log_resource
  ON public.audit_log(resource_type, resource_id);

-- 이벤트 타입 기반 검색
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type
  ON public.audit_log(event_type);

-- 시간 기반 검색 (최신순 정렬 최적화)
CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON public.audit_log(created_at DESC);

-- 복합 인덱스: 액터 + 시간
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created
  ON public.audit_log(actor_id, created_at DESC);

-- 복합 인덱스: 리소스 타입 + 시간
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type_created
  ON public.audit_log(resource_type, created_at DESC);

-- =====================================================
-- 3. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.audit_log IS 'v2.36.0 고도화된 감사 로그 시스템 - 모든 중요 이벤트 추적';

COMMENT ON COLUMN public.audit_log.event_type IS '이벤트 타입 (예: user.login, subscription.created)';
COMMENT ON COLUMN public.audit_log.action IS '수행된 액션 (create, read, update, delete 등)';
COMMENT ON COLUMN public.audit_log.actor_id IS '액션을 수행한 사용자 ID';
COMMENT ON COLUMN public.audit_log.actor_type IS '액터 타입 (user, system, service, admin)';
COMMENT ON COLUMN public.audit_log.resource_type IS '영향받은 리소스 타입 (service, subscription 등)';
COMMENT ON COLUMN public.audit_log.resource_id IS '영향받은 리소스 ID';
COMMENT ON COLUMN public.audit_log.changes IS '변경 내역 (이전 값과 새 값)';
COMMENT ON COLUMN public.audit_log.metadata IS '추가 컨텍스트 정보';
COMMENT ON COLUMN public.audit_log.ip_address IS '요청 IP 주소';
COMMENT ON COLUMN public.audit_log.user_agent IS '사용자 에이전트 문자열';
COMMENT ON COLUMN public.audit_log.session_id IS '세션 ID';
COMMENT ON COLUMN public.audit_log.created_at IS '이벤트 발생 시간';

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 감사 로그만 조회 가능
CREATE POLICY "Users can view their own audit logs"
  ON public.audit_log FOR SELECT
  USING (actor_id = auth.uid());

-- 관리자는 모든 감사 로그 조회 가능
-- user_has_permission 함수가 이미 존재한다고 가정
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      INNER JOIN public.role_permissions rp ON ur.role_id = rp.role_id
      INNER JOIN public.permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
        AND p.name = 'system:audit'
    )
  );

-- 시스템은 항상 감사 로그 삽입 가능
CREATE POLICY "System can insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 5. HELPER FUNCTION: LOG AUDIT EVENT
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_event_type VARCHAR(100),
  p_action VARCHAR(50),
  p_actor_id UUID DEFAULT NULL,
  p_actor_type VARCHAR(50) DEFAULT 'user',
  p_resource_type VARCHAR(100) DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    event_type,
    action,
    actor_id,
    actor_type,
    resource_type,
    resource_id,
    changes,
    metadata,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    p_event_type,
    p_action,
    COALESCE(p_actor_id, auth.uid()),
    p_actor_type,
    p_resource_type,
    p_resource_id,
    p_changes,
    p_metadata,
    p_ip_address,
    p_user_agent,
    p_session_id
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_audit_event IS '감사 로그 이벤트를 기록하는 헬퍼 함수';

-- =====================================================
-- 6. ANALYTICS FUNCTION: GET AUDIT STATISTICS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_audit_statistics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  event_type VARCHAR(100),
  action VARCHAR(50),
  event_count BIGINT,
  unique_actors BIGINT,
  last_occurrence TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.event_type,
    al.action,
    COUNT(*)::BIGINT AS event_count,
    COUNT(DISTINCT al.actor_id)::BIGINT AS unique_actors,
    MAX(al.created_at) AS last_occurrence
  FROM public.audit_log al
  WHERE al.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY al.event_type, al.action
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_audit_statistics IS '감사 로그 통계를 반환 (이벤트별 집계)';

-- =====================================================
-- 7. SAMPLE DATA FOR TESTING (Optional)
-- =====================================================

-- 개발 환경에서만 샘플 데이터 삽입
DO $$
DECLARE
  v_admin_id UUID;
  v_session_id UUID := gen_random_uuid();
BEGIN
  -- admin@ideaonaction.local 사용자 찾기
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'admin@ideaonaction.local'
  LIMIT 1;

  -- 샘플 데이터가 없는 경우에만 삽입
  IF v_admin_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.audit_log LIMIT 1) THEN
    -- 1. 로그인 이벤트
    INSERT INTO public.audit_log (event_type, action, actor_id, actor_type, metadata, session_id, created_at)
    VALUES
      ('user.login', 'login', v_admin_id, 'admin', '{"method": "email"}'::jsonb, v_session_id, NOW() - INTERVAL '2 hours');

    -- 2. 서비스 생성 이벤트
    INSERT INTO public.audit_log (event_type, action, actor_id, resource_type, resource_id, metadata, session_id, created_at)
    VALUES
      ('service.created', 'create', v_admin_id, 'service', gen_random_uuid(), '{"service_name": "Minu Find"}'::jsonb, v_session_id, NOW() - INTERVAL '1 hour');

    -- 3. 구독 생성 이벤트
    INSERT INTO public.audit_log (event_type, action, actor_id, resource_type, resource_id, metadata, session_id, created_at)
    VALUES
      ('subscription.created', 'create', v_admin_id, 'subscription', gen_random_uuid(), '{"plan": "Pro", "amount": 50000}'::jsonb, v_session_id, NOW() - INTERVAL '30 minutes');

    -- 4. 권한 부여 이벤트
    INSERT INTO public.audit_log (event_type, action, actor_id, resource_type, metadata, session_id, created_at)
    VALUES
      ('permission.granted', 'grant', v_admin_id, 'permission', '{"permission": "admin:manage", "target_user": "user@example.com"}'::jsonb, v_session_id, NOW() - INTERVAL '15 minutes');

    -- 5. 로그아웃 이벤트
    INSERT INTO public.audit_log (event_type, action, actor_id, actor_type, session_id, created_at)
    VALUES
      ('user.logout', 'logout', v_admin_id, 'admin', v_session_id, NOW() - INTERVAL '5 minutes');

    RAISE NOTICE 'Sample audit log data inserted successfully';
  END IF;
END $$;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- anon과 authenticated 사용자에게 필요한 권한 부여
GRANT SELECT ON public.audit_log TO authenticated;
GRANT INSERT ON public.audit_log TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_statistics TO authenticated;

-- =====================================================
-- 마이그레이션 완료
-- =====================================================
