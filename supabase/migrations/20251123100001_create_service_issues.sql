-- Central Hub: service_issues 테이블 생성
-- 외부 Minu 서비스에서 발생한 이슈를 저장

CREATE TABLE IF NOT EXISTS service_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  project_id UUID,
  reported_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_service_id CHECK (
    service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep')
  ),
  CONSTRAINT valid_severity CHECK (
    severity IN ('critical', 'high', 'medium', 'low')
  ),
  CONSTRAINT valid_status CHECK (
    status IN ('open', 'in_progress', 'resolved', 'closed')
  )
);

-- 성능 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_service_issues_service
  ON service_issues(service_id);
CREATE INDEX IF NOT EXISTS idx_service_issues_status
  ON service_issues(status);
CREATE INDEX IF NOT EXISTS idx_service_issues_severity
  ON service_issues(severity);
CREATE INDEX IF NOT EXISTS idx_service_issues_project
  ON service_issues(project_id)
  WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_issues_reported_by
  ON service_issues(reported_by)
  WHERE reported_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_issues_assigned_to
  ON service_issues(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- RLS 활성화
ALTER TABLE service_issues ENABLE ROW LEVEL SECURITY;

-- RLS 정책: Edge Function이 삽입 가능
CREATE POLICY "service_issues_insert_policy"
ON service_issues FOR INSERT
WITH CHECK (true);

-- RLS 정책: 관련 사용자 또는 관리자가 읽기 가능
CREATE POLICY "service_issues_select_policy"
ON service_issues FOR SELECT
TO authenticated
USING (
  reported_by = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- RLS 정책: 관리자만 업데이트 가능
CREATE POLICY "service_issues_update_admin_policy"
ON service_issues FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_service_issues_updated_at()
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

CREATE TRIGGER trigger_service_issues_updated_at
  BEFORE UPDATE ON service_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_service_issues_updated_at();

-- 테이블 및 정책 설명
COMMENT ON TABLE service_issues IS 'Minu 서비스에서 발생한 이슈 트래커';
COMMENT ON COLUMN service_issues.severity IS '이슈 심각도 (critical, high, medium, low)';
COMMENT ON COLUMN service_issues.status IS '이슈 상태 (open, in_progress, resolved, closed)';
