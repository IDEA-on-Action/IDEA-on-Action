-- ============================================================================
-- Health Metrics Tables and Views
-- ============================================================================
-- Description: API 헬스체크 메트릭을 저장하고 집계하는 테이블 및 뷰
-- Version: 2.23.0
-- Created: 2025-12-01
-- ============================================================================

-- health_metrics 테이블 생성
-- API 엔드포인트별 헬스체크 메트릭 기록
CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint VARCHAR(100) NOT NULL,
  status_code INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  error_code VARCHAR(50),
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 인덱스
  CONSTRAINT health_metrics_status_code_check CHECK (status_code >= 100 AND status_code < 600),
  CONSTRAINT health_metrics_latency_check CHECK (latency_ms >= 0)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded_at ON health_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_endpoint ON health_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_health_metrics_status_code ON health_metrics(status_code);

-- 파티셔닝을 위한 코멘트 (향후 대용량 데이터 처리 시 고려)
COMMENT ON TABLE health_metrics IS 'API 헬스체크 메트릭 저장 테이블 (24시간 데이터 보관)';
COMMENT ON COLUMN health_metrics.endpoint IS '헬스체크 엔드포인트 경로 (/basic, /detailed, /metrics, etc)';
COMMENT ON COLUMN health_metrics.status_code IS 'HTTP 응답 상태 코드';
COMMENT ON COLUMN health_metrics.latency_ms IS '응답 시간 (밀리초)';
COMMENT ON COLUMN health_metrics.error_code IS '에러 코드 (있는 경우)';

-- ============================================================================
-- 집계 뷰 생성
-- ============================================================================

-- 시간별 집계 뷰
CREATE OR REPLACE VIEW health_metrics_hourly AS
SELECT
  date_trunc('hour', recorded_at) as hour,
  endpoint,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status_code < 400) as success_count,
  COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
  ROUND(AVG(latency_ms)) as avg_latency_ms,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) as p50_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99_latency_ms,
  MIN(latency_ms) as min_latency_ms,
  MAX(latency_ms) as max_latency_ms
FROM health_metrics
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', recorded_at), endpoint
ORDER BY hour DESC, endpoint;

COMMENT ON VIEW health_metrics_hourly IS '시간별 헬스체크 메트릭 집계 (최근 24시간)';

-- 엔드포인트별 최근 상태 뷰
CREATE OR REPLACE VIEW health_metrics_latest AS
SELECT DISTINCT ON (endpoint)
  endpoint,
  status_code,
  latency_ms,
  error_code,
  recorded_at
FROM health_metrics
ORDER BY endpoint, recorded_at DESC;

COMMENT ON VIEW health_metrics_latest IS '엔드포인트별 최신 헬스체크 상태';

-- 전체 시스템 상태 요약 뷰
CREATE OR REPLACE VIEW health_metrics_summary AS
SELECT
  COUNT(DISTINCT endpoint) as total_endpoints,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status_code < 400) as success_requests,
  COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500) as client_errors,
  COUNT(*) FILTER (WHERE status_code >= 500) as server_errors,
  ROUND(AVG(latency_ms)) as avg_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms,
  MIN(recorded_at) as oldest_metric,
  MAX(recorded_at) as latest_metric
FROM health_metrics
WHERE recorded_at > NOW() - INTERVAL '1 hour';

COMMENT ON VIEW health_metrics_summary IS '전체 시스템 헬스체크 요약 (최근 1시간)';

-- ============================================================================
-- 자동 정리 함수
-- ============================================================================

-- 24시간 이전 데이터 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_old_health_metrics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM health_metrics
  WHERE recorded_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_health_metrics IS '24시간 이전 헬스 메트릭 데이터 삭제';

-- ============================================================================
-- RLS (Row Level Security) 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

-- 시스템 관리자만 읽기 가능
CREATE POLICY "health_metrics_read_policy"
  ON health_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- 서비스 롤은 모든 작업 가능 (Edge Function용)
CREATE POLICY "health_metrics_service_policy"
  ON health_metrics
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 권한 설정
-- ============================================================================

-- anon과 authenticated 사용자는 뷰만 읽기 가능
GRANT SELECT ON health_metrics_hourly TO anon, authenticated;
GRANT SELECT ON health_metrics_latest TO anon, authenticated;
GRANT SELECT ON health_metrics_summary TO anon, authenticated;

-- service_role은 모든 권한
GRANT ALL ON health_metrics TO service_role;

-- ============================================================================
-- 초기 데이터 (선택 사항)
-- ============================================================================

-- 테스트용 샘플 데이터 (개발 환경에서만 사용)
-- INSERT INTO health_metrics (endpoint, status_code, latency_ms, recorded_at) VALUES
--   ('/basic', 200, 45, NOW() - INTERVAL '10 minutes'),
--   ('/detailed', 200, 120, NOW() - INTERVAL '8 minutes'),
--   ('/metrics', 200, 80, NOW() - INTERVAL '5 minutes'),
--   ('/ready', 200, 30, NOW() - INTERVAL '3 minutes'),
--   ('/live', 200, 15, NOW() - INTERVAL '1 minute');
