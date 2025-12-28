-- Central Hub: service_health 테이블 생성
-- Minu 서비스의 헬스 상태를 저장

CREATE TABLE IF NOT EXISTS service_health (
  service_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_ping TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_health_service_id CHECK (
    service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep')
  ),
  CONSTRAINT valid_health_status CHECK (
    status IN ('healthy', 'degraded', 'unhealthy', 'unknown')
  )
);

-- 초기 데이터 삽입
INSERT INTO service_health (service_id, status) VALUES
  ('minu-find', 'unknown'),
  ('minu-frame', 'unknown'),
  ('minu-build', 'unknown'),
  ('minu-keep', 'unknown')
ON CONFLICT (service_id) DO NOTHING;

-- RLS 활성화
ALTER TABLE service_health ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 인증된 사용자 모두 읽기 가능
CREATE POLICY "service_health_select_policy"
ON service_health FOR SELECT
TO authenticated
USING (true);

-- RLS 정책: Edge Function이 업데이트 가능
CREATE POLICY "service_health_update_policy"
ON service_health FOR UPDATE
USING (true);

-- RLS 정책: Edge Function이 삽입 가능 (upsert용)
CREATE POLICY "service_health_insert_policy"
ON service_health FOR INSERT
WITH CHECK (true);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_service_health_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_service_health_updated_at
  BEFORE UPDATE ON service_health
  FOR EACH ROW
  EXECUTE FUNCTION update_service_health_updated_at();

-- 테이블 설명
COMMENT ON TABLE service_health IS 'Minu 서비스 헬스 상태 캐시';
COMMENT ON COLUMN service_health.status IS '서비스 상태 (healthy, degraded, unhealthy, unknown)';
COMMENT ON COLUMN service_health.last_ping IS '마지막 헬스 체크 시간';
COMMENT ON COLUMN service_health.metrics IS '서비스 메트릭 (응답시간, 에러율 등)';
