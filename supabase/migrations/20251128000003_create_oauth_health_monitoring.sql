-- OAuth 헬스 모니터링 시스템
-- 생성일: 2025-11-28
-- 목적: OAuth 인증 성능 및 오류 모니터링을 위한 메트릭 및 알림 시스템

-- OAuth 헬스 메트릭 테이블
CREATE TABLE IF NOT EXISTS public.oauth_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('auth_request', 'token_exchange', 'token_refresh', 'error')),
  success_count INTEGER DEFAULT 0 CHECK (success_count >= 0),
  failure_count INTEGER DEFAULT 0 CHECK (failure_count >= 0),
  avg_latency_ms NUMERIC(10,2) CHECK (avg_latency_ms >= 0),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 시간 범위 검증
  CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- OAuth 알림 규칙 테이블
CREATE TABLE IF NOT EXISTS public.oauth_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('auth_request', 'token_exchange', 'token_refresh', 'error', 'any')),
  threshold_type TEXT NOT NULL CHECK (threshold_type IN ('error_rate', 'latency', 'count', 'success_rate')),
  threshold_value NUMERIC NOT NULL CHECK (threshold_value >= 0),
  comparison TEXT NOT NULL CHECK (comparison IN ('>', '>=', '<', '<=', '=')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  notification_channels TEXT[] DEFAULT ARRAY['slack']::TEXT[],
  is_active BOOLEAN DEFAULT true,
  cooldown_minutes INTEGER DEFAULT 15 CHECK (cooldown_minutes >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth 알림 히스토리 테이블
CREATE TABLE IF NOT EXISTS public.oauth_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.oauth_alert_rules(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES public.oauth_clients(client_id) ON DELETE SET NULL,
  metric_type TEXT NOT NULL,
  triggered_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  severity TEXT NOT NULL,
  notification_sent BOOLEAN DEFAULT false,
  notification_channels TEXT[],
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_oauth_health_metrics_client_id
  ON public.oauth_health_metrics(client_id);

CREATE INDEX IF NOT EXISTS idx_oauth_health_metrics_period
  ON public.oauth_health_metrics(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_oauth_health_metrics_type
  ON public.oauth_health_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_oauth_alert_history_rule_id
  ON public.oauth_alert_history(rule_id);

CREATE INDEX IF NOT EXISTS idx_oauth_alert_history_created_at
  ON public.oauth_alert_history(created_at DESC);

-- 기본 알림 규칙 시드
INSERT INTO public.oauth_alert_rules (
  rule_name,
  metric_type,
  threshold_type,
  threshold_value,
  comparison,
  severity,
  notification_channels,
  cooldown_minutes,
  description
) VALUES
-- 1. 에러율 알림 (Critical)
(
  'High Error Rate - Critical',
  'any',
  'error_rate',
  10.0,
  '>',
  'critical',
  ARRAY['slack', 'email']::TEXT[],
  5,
  '에러율이 10%를 초과하면 즉시 알림 (5분 쿨다운)'
),

-- 2. 에러율 알림 (High)
(
  'High Error Rate - Warning',
  'any',
  'error_rate',
  5.0,
  '>',
  'high',
  ARRAY['slack']::TEXT[],
  15,
  '에러율이 5%를 초과하면 경고 알림 (15분 쿨다운)'
),

-- 3. 응답 시간 알림
(
  'High Latency',
  'any',
  'latency',
  2000.0,
  '>',
  'high',
  ARRAY['slack']::TEXT[],
  15,
  '평균 응답 시간이 2초를 초과하면 알림'
),

-- 4. 토큰 교환 실패율
(
  'Token Exchange Failure',
  'token_exchange',
  'error_rate',
  15.0,
  '>',
  'critical',
  ARRAY['slack', 'email']::TEXT[],
  10,
  '토큰 교환 실패율이 15%를 초과하면 즉시 알림'
),

-- 5. 토큰 갱신 실패율
(
  'Token Refresh Failure',
  'token_refresh',
  'error_rate',
  20.0,
  '>',
  'high',
  ARRAY['slack']::TEXT[],
  15,
  '토큰 갱신 실패율이 20%를 초과하면 알림'
),

-- 6. 낮은 성공률
(
  'Low Success Rate',
  'any',
  'success_rate',
  90.0,
  '<',
  'medium',
  ARRAY['slack']::TEXT[],
  30,
  '전체 성공률이 90% 미만이면 알림'
)

ON CONFLICT (rule_name) DO UPDATE SET
  threshold_value = EXCLUDED.threshold_value,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 헬스 메트릭 집계 함수
CREATE OR REPLACE FUNCTION calculate_oauth_health_metrics(
  p_client_id TEXT,
  p_metric_type TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
) RETURNS TABLE (
  success_count BIGINT,
  failure_count BIGINT,
  error_rate NUMERIC,
  success_rate NUMERIC,
  avg_latency_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH metrics AS (
    SELECT
      SUM(ohm.success_count) as total_success,
      SUM(ohm.failure_count) as total_failure,
      AVG(ohm.avg_latency_ms) as avg_latency
    FROM public.oauth_health_metrics ohm
    WHERE ohm.client_id = p_client_id
      AND (p_metric_type = 'any' OR ohm.metric_type = p_metric_type)
      AND ohm.period_start >= p_period_start
      AND ohm.period_end <= p_period_end
  )
  SELECT
    COALESCE(m.total_success, 0) as success_count,
    COALESCE(m.total_failure, 0) as failure_count,
    CASE
      WHEN (COALESCE(m.total_success, 0) + COALESCE(m.total_failure, 0)) > 0
      THEN ROUND((COALESCE(m.total_failure, 0)::NUMERIC / (COALESCE(m.total_success, 0) + COALESCE(m.total_failure, 0))) * 100, 2)
      ELSE 0
    END as error_rate,
    CASE
      WHEN (COALESCE(m.total_success, 0) + COALESCE(m.total_failure, 0)) > 0
      THEN ROUND((COALESCE(m.total_success, 0)::NUMERIC / (COALESCE(m.total_success, 0) + COALESCE(m.total_failure, 0))) * 100, 2)
      ELSE 100
    END as success_rate,
    COALESCE(m.avg_latency, 0) as avg_latency_ms
  FROM metrics m;
END;
$$ LANGUAGE plpgsql;

-- RLS 정책 (관리자만 접근)
ALTER TABLE public.oauth_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access to oauth_health_metrics"
  ON public.oauth_health_metrics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (metadata->>'role' = 'admin' OR metadata->>'role' = 'superadmin')
    )
  );

CREATE POLICY "Admin access to oauth_alert_rules"
  ON public.oauth_alert_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (metadata->>'role' = 'admin' OR metadata->>'role' = 'superadmin')
    )
  );

CREATE POLICY "Admin access to oauth_alert_history"
  ON public.oauth_alert_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (metadata->>'role' = 'admin' OR metadata->>'role' = 'superadmin')
    )
  );

-- 코멘트
COMMENT ON TABLE public.oauth_health_metrics IS 'OAuth 인증 성능 메트릭 테이블';
COMMENT ON TABLE public.oauth_alert_rules IS 'OAuth 알림 규칙 설정 테이블';
COMMENT ON TABLE public.oauth_alert_history IS 'OAuth 알림 발생 히스토리 테이블';
COMMENT ON FUNCTION calculate_oauth_health_metrics IS 'OAuth 헬스 메트릭 집계 함수';
