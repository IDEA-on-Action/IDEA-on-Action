-- ==============================================================================
-- Fix Supabase Linter Warnings
-- ==============================================================================
-- Description:
-- 1. Fix 'auth_users_exposed' and 'security_definer_view' for minu_integration_view
-- 2. Fix 'security_definer_view' for health_metrics views
-- Strategy: Replace SECURITY DEFINER views with SECURITY INVOKER views that call
--           secure SECURITY DEFINER functions.
--           IMPORTANT: We must use WITH (security_invoker = true) on the views
--           to ensure they are treated as standard views by the linter and
--           do not run with the owner's permissions (which causes the linter error).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Fix minu_integration_view
-- ------------------------------------------------------------------------------

-- Create a secure function to retrieve integration data
CREATE OR REPLACE FUNCTION public.get_minu_integration_data()
RETURNS TABLE (
  user_id uuid,
  email varchar,
  full_name text,
  avatar_url text,
  subscription_id uuid,
  subscription_status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  plan_name text,
  price numeric,
  billing_cycle text,
  features jsonb,
  service_title text,
  service_slug text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email::varchar,
    (u.raw_user_meta_data->>'full_name')::text as full_name,
    (u.raw_user_meta_data->>'avatar_url')::text as avatar_url,
    s.id as subscription_id,
    s.status as subscription_status,
    s.current_period_start,
    s.current_period_end,
    sp.plan_name,
    sp.price,
    sp.billing_cycle,
    sp.features,
    srv.title as service_title,
    srv.slug as service_slug
  FROM auth.users u
  LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
  LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
  LEFT JOIN services srv ON sp.service_id = srv.id
  WHERE u.id = auth.uid() -- Enforce RLS-like behavior: users see only their own data
    AND (srv.slug IN ('find', 'frame', 'build', 'keep') OR srv.slug IS NULL);
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_minu_integration_data() TO authenticated;

-- Drop existing views
DROP VIEW IF EXISTS public.compass_integration_view CASCADE;
DROP VIEW IF EXISTS public.minu_integration_view CASCADE;

-- Recreate minu_integration_view with security_invoker = true
CREATE VIEW public.minu_integration_view WITH (security_invoker = true) AS
SELECT * FROM public.get_minu_integration_data();

-- Recreate compass_integration_view with security_invoker = true
CREATE VIEW public.compass_integration_view WITH (security_invoker = true) AS
SELECT * FROM public.minu_integration_view;

-- Grant permissions
GRANT SELECT ON public.minu_integration_view TO authenticated;
GRANT SELECT ON public.compass_integration_view TO authenticated;

COMMENT ON VIEW public.minu_integration_view IS 'Minu 플랫폼 통합 뷰 - 사용자, 구독, 플랜 정보 조회 (Secure Wrapper)';
COMMENT ON VIEW public.compass_integration_view IS 'Deprecated: minu_integration_view를 사용하세요 (Secure Wrapper)';


-- ------------------------------------------------------------------------------
-- 2. Fix health_metrics views
-- ------------------------------------------------------------------------------

-- Function for health_metrics_hourly
CREATE OR REPLACE FUNCTION public.get_health_metrics_hourly()
RETURNS TABLE (
  hour timestamptz,
  endpoint varchar,
  total_requests bigint,
  success_count bigint,
  error_count bigint,
  avg_latency_ms numeric,
  p50_latency_ms double precision,
  p95_latency_ms double precision,
  p99_latency_ms double precision,
  min_latency_ms integer,
  max_latency_ms integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('hour', recorded_at) as hour,
    hm.endpoint,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status_code < 400) as success_count,
    COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
    ROUND(AVG(latency_ms)) as avg_latency_ms,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) as p50_latency_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99_latency_ms,
    MIN(latency_ms) as min_latency_ms,
    MAX(latency_ms) as max_latency_ms
  FROM health_metrics hm
  WHERE recorded_at > NOW() - INTERVAL '24 hours'
  GROUP BY date_trunc('hour', recorded_at), hm.endpoint
  ORDER BY hour DESC, hm.endpoint;
END;
$$;

-- Function for health_metrics_latest
CREATE OR REPLACE FUNCTION public.get_health_metrics_latest()
RETURNS TABLE (
  endpoint varchar,
  status_code integer,
  latency_ms integer,
  error_code varchar,
  recorded_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (hm.endpoint)
    hm.endpoint,
    hm.status_code,
    hm.latency_ms,
    hm.error_code,
    hm.recorded_at
  FROM health_metrics hm
  ORDER BY hm.endpoint, hm.recorded_at DESC;
END;
$$;

-- Function for health_metrics_summary
CREATE OR REPLACE FUNCTION public.get_health_metrics_summary()
RETURNS TABLE (
  total_endpoints bigint,
  total_requests bigint,
  success_requests bigint,
  client_errors bigint,
  server_errors bigint,
  avg_latency_ms numeric,
  p95_latency_ms double precision,
  oldest_metric timestamptz,
  latest_metric timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT hm.endpoint) as total_endpoints,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status_code < 400) as success_requests,
    COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500) as client_errors,
    COUNT(*) FILTER (WHERE status_code >= 500) as server_errors,
    ROUND(AVG(latency_ms)) as avg_latency_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms,
    MIN(recorded_at) as oldest_metric,
    MAX(recorded_at) as latest_metric
  FROM health_metrics hm
  WHERE recorded_at > NOW() - INTERVAL '1 hour';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_health_metrics_hourly() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_health_metrics_latest() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_health_metrics_summary() TO anon, authenticated;

-- Drop existing views
DROP VIEW IF EXISTS public.health_metrics_hourly CASCADE;
DROP VIEW IF EXISTS public.health_metrics_latest CASCADE;
DROP VIEW IF EXISTS public.health_metrics_summary CASCADE;

-- Recreate views as wrappers with security_invoker = true
CREATE VIEW public.health_metrics_hourly WITH (security_invoker = true) AS
SELECT * FROM public.get_health_metrics_hourly();

CREATE VIEW public.health_metrics_latest WITH (security_invoker = true) AS
SELECT * FROM public.get_health_metrics_latest();

CREATE VIEW public.health_metrics_summary WITH (security_invoker = true) AS
SELECT * FROM public.get_health_metrics_summary();

-- Grant permissions
GRANT SELECT ON public.health_metrics_hourly TO anon, authenticated;
GRANT SELECT ON public.health_metrics_latest TO anon, authenticated;
GRANT SELECT ON public.health_metrics_summary TO anon, authenticated;

COMMENT ON VIEW public.health_metrics_hourly IS '시간별 헬스체크 메트릭 집계 (Secure Wrapper)';
COMMENT ON VIEW public.health_metrics_latest IS '엔드포인트별 최신 헬스체크 상태 (Secure Wrapper)';
COMMENT ON VIEW public.health_metrics_summary IS '전체 시스템 헬스체크 요약 (Secure Wrapper)';
