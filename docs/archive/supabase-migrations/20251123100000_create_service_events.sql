-- Central Hub: service_events 테이블 생성
-- 외부 Minu 서비스에서 발생한 이벤트를 저장

CREATE TABLE IF NOT EXISTS service_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  project_id UUID,
  user_id UUID REFERENCES auth.users(id),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_service_id CHECK (
    service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep')
  )
);

-- 성능 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_service_events_service
  ON service_events(service_id);
CREATE INDEX IF NOT EXISTS idx_service_events_type
  ON service_events(event_type);
CREATE INDEX IF NOT EXISTS idx_service_events_project
  ON service_events(project_id)
  WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_events_created
  ON service_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_events_user
  ON service_events(user_id)
  WHERE user_id IS NOT NULL;

-- RLS 활성화
ALTER TABLE service_events ENABLE ROW LEVEL SECURITY;

-- RLS 정책: Edge Function (service_role)이 삽입 가능
CREATE POLICY "service_events_insert_policy"
ON service_events FOR INSERT
WITH CHECK (true);

-- RLS 정책: 관리자만 읽기 가능
CREATE POLICY "service_events_select_admin_policy"
ON service_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.user_id = auth.uid()
  )
);

-- 테이블 및 정책 설명
COMMENT ON TABLE service_events IS 'Minu 서비스에서 발생한 이벤트 로그';
COMMENT ON COLUMN service_events.service_id IS '이벤트를 발생시킨 서비스 ID';
COMMENT ON COLUMN service_events.event_type IS '이벤트 유형 (progress.updated, task.completed 등)';
COMMENT ON COLUMN service_events.payload IS '이벤트 상세 데이터 (JSON)';
