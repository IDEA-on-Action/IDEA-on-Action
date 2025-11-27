-- 플랜별 기능 제한 테이블
-- 각 구독 플랜이 제공하는 기능과 제한치 정의

CREATE TABLE IF NOT EXISTS plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 플랜 참조
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,

  -- 기능 키 (도메인별 네임스페이스)
  feature_key TEXT NOT NULL,

  -- 제한 값 (NULL은 무제한)
  limit_value INTEGER,

  -- 제한 타입
  limit_type TEXT NOT NULL CHECK (limit_type IN ('count', 'boolean')),
  -- 'count': 횟수 제한 (예: 50회/월)
  -- 'boolean': 가능/불가능 (예: true=사용 가능, false=사용 불가)

  -- 설명
  description TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 유니크 제약: 플랜-기능 조합은 하나만
  CONSTRAINT uq_plan_features_key UNIQUE (plan_id, feature_key)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_key ON plan_features(feature_key);

-- RLS 활성화
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 인증 사용자는 플랜 기능 조회 가능
CREATE POLICY "Authenticated users can read plan features"
  ON plan_features
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS 정책: Admin만 플랜 기능 관리
CREATE POLICY "Admins can manage plan features"
  ON plan_features
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 초기 데이터: Minu 서비스별 기능 제한
-- subscription_plans 테이블의 name을 기준으로 plan_id를 조회하여 삽입

DO $$
DECLARE
  v_free_plan_id UUID;
  v_basic_plan_id UUID;
  v_pro_plan_id UUID;
BEGIN
  -- 플랜 ID 조회 (name 기준)
  SELECT id INTO v_free_plan_id FROM subscription_plans WHERE name = 'Free';
  SELECT id INTO v_basic_plan_id FROM subscription_plans WHERE name = 'Basic';
  SELECT id INTO v_pro_plan_id FROM subscription_plans WHERE name = 'Pro';

  -- Free 플랜 기능
  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_key, limit_value, limit_type, description)
    VALUES
      -- Minu Find (사업기회 탐색)
      (v_free_plan_id, 'find_market_search', 5, 'count', '시장 조사 검색 (5회/월)'),
      (v_free_plan_id, 'find_competitor_analysis', 3, 'count', '경쟁사 분석 (3회/월)'),
      (v_free_plan_id, 'find_trend_report', 1, 'count', '트렌드 리포트 생성 (1회/월)'),
      (v_free_plan_id, 'find_export_excel', 1, 'boolean', 'Excel 내보내기 (제한적)'),

      -- Minu Frame (문제정의 & RFP)
      (v_free_plan_id, 'frame_document_generate', 3, 'count', '문서 생성 (3회/월)'),
      (v_free_plan_id, 'frame_rfp_template', 1, 'boolean', 'RFP 템플릿 (기본만)'),
      (v_free_plan_id, 'frame_requirement_analysis', 2, 'count', '요구사항 분석 (2회/월)'),
      (v_free_plan_id, 'frame_export_docx', 1, 'boolean', 'DOCX 내보내기 (워터마크)'),

      -- Minu Build (프로젝트 진행)
      (v_free_plan_id, 'build_project_create', 1, 'count', '프로젝트 생성 (1개)'),
      (v_free_plan_id, 'build_task_limit', 20, 'count', '작업 개수 제한 (20개/프로젝트)'),
      (v_free_plan_id, 'build_sprint_planning', 1, 'boolean', '스프린트 계획 (기본)'),
      (v_free_plan_id, 'build_report_generate', 1, 'count', '프로젝트 리포트 (1회/월)'),

      -- Minu Keep (운영/유지보수)
      (v_free_plan_id, 'keep_monitoring_service', 1, 'count', '모니터링 서비스 (1개)'),
      (v_free_plan_id, 'keep_alert_limit', 10, 'count', '알림 개수 제한 (10개/월)'),
      (v_free_plan_id, 'keep_sla_tracking', 0, 'boolean', 'SLA 추적 (불가)'),
      (v_free_plan_id, 'keep_operations_report', 1, 'count', '운영 보고서 (1회/월)');
  END IF;

  -- Basic 플랜 기능
  IF v_basic_plan_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_key, limit_value, limit_type, description)
    VALUES
      -- Minu Find
      (v_basic_plan_id, 'find_market_search', 50, 'count', '시장 조사 검색 (50회/월)'),
      (v_basic_plan_id, 'find_competitor_analysis', 20, 'count', '경쟁사 분석 (20회/월)'),
      (v_basic_plan_id, 'find_trend_report', 10, 'count', '트렌드 리포트 생성 (10회/월)'),
      (v_basic_plan_id, 'find_export_excel', 1, 'boolean', 'Excel 내보내기 (전체)'),

      -- Minu Frame
      (v_basic_plan_id, 'frame_document_generate', 30, 'count', '문서 생성 (30회/월)'),
      (v_basic_plan_id, 'frame_rfp_template', 1, 'boolean', 'RFP 템플릿 (고급)'),
      (v_basic_plan_id, 'frame_requirement_analysis', 20, 'count', '요구사항 분석 (20회/월)'),
      (v_basic_plan_id, 'frame_export_docx', 1, 'boolean', 'DOCX 내보내기 (워터마크 없음)'),

      -- Minu Build
      (v_basic_plan_id, 'build_project_create', 5, 'count', '프로젝트 생성 (5개)'),
      (v_basic_plan_id, 'build_task_limit', 100, 'count', '작업 개수 제한 (100개/프로젝트)'),
      (v_basic_plan_id, 'build_sprint_planning', 1, 'boolean', '스프린트 계획 (고급)'),
      (v_basic_plan_id, 'build_report_generate', 10, 'count', '프로젝트 리포트 (10회/월)'),

      -- Minu Keep
      (v_basic_plan_id, 'keep_monitoring_service', 3, 'count', '모니터링 서비스 (3개)'),
      (v_basic_plan_id, 'keep_alert_limit', 100, 'count', '알림 개수 제한 (100개/월)'),
      (v_basic_plan_id, 'keep_sla_tracking', 1, 'boolean', 'SLA 추적 (가능)'),
      (v_basic_plan_id, 'keep_operations_report', 10, 'count', '운영 보고서 (10회/월)');
  END IF;

  -- Pro 플랜 기능 (대부분 무제한)
  IF v_pro_plan_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_key, limit_value, limit_type, description)
    VALUES
      -- Minu Find
      (v_pro_plan_id, 'find_market_search', NULL, 'count', '시장 조사 검색 (무제한)'),
      (v_pro_plan_id, 'find_competitor_analysis', NULL, 'count', '경쟁사 분석 (무제한)'),
      (v_pro_plan_id, 'find_trend_report', NULL, 'count', '트렌드 리포트 생성 (무제한)'),
      (v_pro_plan_id, 'find_export_excel', 1, 'boolean', 'Excel 내보내기 (고급)'),

      -- Minu Frame
      (v_pro_plan_id, 'frame_document_generate', NULL, 'count', '문서 생성 (무제한)'),
      (v_pro_plan_id, 'frame_rfp_template', 1, 'boolean', 'RFP 템플릿 (프리미엄)'),
      (v_pro_plan_id, 'frame_requirement_analysis', NULL, 'count', '요구사항 분석 (무제한)'),
      (v_pro_plan_id, 'frame_export_docx', 1, 'boolean', 'DOCX 내보내기 (고급)'),

      -- Minu Build
      (v_pro_plan_id, 'build_project_create', NULL, 'count', '프로젝트 생성 (무제한)'),
      (v_pro_plan_id, 'build_task_limit', NULL, 'count', '작업 개수 제한 (무제한)'),
      (v_pro_plan_id, 'build_sprint_planning', 1, 'boolean', '스프린트 계획 (프리미엄)'),
      (v_pro_plan_id, 'build_report_generate', NULL, 'count', '프로젝트 리포트 (무제한)'),

      -- Minu Keep
      (v_pro_plan_id, 'keep_monitoring_service', NULL, 'count', '모니터링 서비스 (무제한)'),
      (v_pro_plan_id, 'keep_alert_limit', NULL, 'count', '알림 개수 제한 (무제한)'),
      (v_pro_plan_id, 'keep_sla_tracking', 1, 'boolean', 'SLA 추적 (고급)'),
      (v_pro_plan_id, 'keep_operations_report', NULL, 'count', '운영 보고서 (무제한)');
  END IF;

END $$;

-- 기능 제한 체크 함수
CREATE OR REPLACE FUNCTION check_feature_limit(
  p_subscription_id UUID,
  p_feature_key TEXT
)
RETURNS TABLE(
  allowed BOOLEAN,
  current_usage INTEGER,
  limit_value INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_plan_id UUID;
  v_feature RECORD;
  v_usage RECORD;
BEGIN
  -- 구독의 플랜 조회
  SELECT plan_id INTO v_plan_id
  FROM subscriptions
  WHERE id = p_subscription_id
  AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 'Active subscription not found';
    RETURN;
  END IF;

  -- 기능 정보 조회
  SELECT * INTO v_feature
  FROM plan_features
  WHERE plan_id = v_plan_id
  AND feature_key = p_feature_key;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 'Feature not available in current plan';
    RETURN;
  END IF;

  -- boolean 타입은 limit_value로 판단
  IF v_feature.limit_type = 'boolean' THEN
    IF v_feature.limit_value = 1 THEN
      RETURN QUERY SELECT true, 0, 1, NULL::TEXT;
    ELSE
      RETURN QUERY SELECT false, 0, 0, 'Feature disabled in current plan';
    END IF;
    RETURN;
  END IF;

  -- count 타입은 사용량 체크
  SELECT * INTO v_usage FROM get_current_usage(p_subscription_id, p_feature_key);

  -- 무제한 (NULL)
  IF v_feature.limit_value IS NULL THEN
    RETURN QUERY SELECT true, v_usage.used_count, -1, NULL::TEXT;
    RETURN;
  END IF;

  -- 제한 체크
  IF v_usage.used_count >= v_feature.limit_value THEN
    RETURN QUERY SELECT false, v_usage.used_count, v_feature.limit_value, 'Usage limit exceeded';
  ELSE
    RETURN QUERY SELECT true, v_usage.used_count, v_feature.limit_value, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 코멘트
COMMENT ON TABLE plan_features IS '플랜별 기능 제한 정의';
COMMENT ON COLUMN plan_features.feature_key IS '기능 식별자 (네임스페이스: service_feature)';
COMMENT ON COLUMN plan_features.limit_value IS '제한치 (NULL=무제한)';
COMMENT ON COLUMN plan_features.limit_type IS 'count=횟수 제한, boolean=가능 여부';
COMMENT ON FUNCTION check_feature_limit IS '기능 사용 가능 여부 체크';
