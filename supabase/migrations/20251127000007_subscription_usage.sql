-- 구독 사용량 추적 테이블
-- 각 구독의 기능별 사용량을 기간별로 기록

CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 구독 참조
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- 기능 키 (plan_features.feature_key와 매칭)
  feature_key TEXT NOT NULL,

  -- 사용량
  used_count INTEGER NOT NULL DEFAULT 0,

  -- 기간 (월별 집계)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 유니크 제약: 구독-기능-기간 조합은 하나만
  CONSTRAINT uq_subscription_usage_period UNIQUE (subscription_id, feature_key, period_start)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON subscription_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_feature_key ON subscription_usage(feature_key);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON subscription_usage(period_start, period_end);

-- RLS 활성화
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 구독 사용량만 조회
DROP POLICY IF EXISTS "Users can read own subscription usage" ON subscription_usage;
CREATE POLICY "Users can read own subscription usage"
  ON subscription_usage
  FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

-- RLS 정책: 시스템만 사용량 기록
DROP POLICY IF EXISTS "Service role can manage subscription usage" ON subscription_usage;
CREATE POLICY "Service role can manage subscription usage"
  ON subscription_usage
  FOR ALL
  TO service_role
  WITH CHECK (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_subscription_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_usage_updated_at
  BEFORE UPDATE ON subscription_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_usage_updated_at();

-- 사용량 증가 함수 (원자적 업데이트)
CREATE OR REPLACE FUNCTION increment_subscription_usage(
  p_subscription_id UUID,
  p_feature_key TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS TABLE(
  success BOOLEAN,
  current_usage INTEGER,
  limit_value INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_plan_id UUID;
BEGIN
  -- 현재 기간 계산 (월 단위)
  v_period_start := date_trunc('month', CURRENT_DATE);
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;

  -- 플랜 ID 조회
  SELECT plan_id INTO v_plan_id
  FROM subscriptions
  WHERE id = p_subscription_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 'Subscription not found';
    RETURN;
  END IF;

  -- 기능 제한 조회
  SELECT limit_value INTO v_limit
  FROM plan_features
  WHERE plan_id = v_plan_id
  AND feature_key = p_feature_key;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 'Feature not found in plan';
    RETURN;
  END IF;

  -- 현재 사용량 조회 또는 초기화
  INSERT INTO subscription_usage (subscription_id, feature_key, used_count, period_start, period_end)
  VALUES (p_subscription_id, p_feature_key, 0, v_period_start, v_period_end)
  ON CONFLICT (subscription_id, feature_key, period_start)
  DO NOTHING;

  -- 사용량 증가
  UPDATE subscription_usage
  SET used_count = used_count + p_increment
  WHERE subscription_id = p_subscription_id
  AND feature_key = p_feature_key
  AND period_start = v_period_start
  RETURNING used_count INTO v_current_usage;

  -- 제한 초과 체크 (NULL은 무제한)
  IF v_limit IS NOT NULL AND v_current_usage > v_limit THEN
    -- 롤백 (사용량 원복)
    UPDATE subscription_usage
    SET used_count = used_count - p_increment
    WHERE subscription_id = p_subscription_id
    AND feature_key = p_feature_key
    AND period_start = v_period_start;

    RETURN QUERY SELECT false, v_current_usage - p_increment, v_limit, 'Usage limit exceeded';
    RETURN;
  END IF;

  -- 성공
  RETURN QUERY SELECT true, v_current_usage, COALESCE(v_limit, -1), NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 월별 사용량 리셋 함수 (매월 1일 실행)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
DECLARE
  v_last_month DATE;
BEGIN
  v_last_month := date_trunc('month', CURRENT_DATE - interval '1 month');

  -- 지난달 이전 데이터 아카이브 (옵션: 별도 테이블로 이동)
  -- DELETE FROM subscription_usage WHERE period_end < v_last_month;

  -- 새 월의 사용량 레코드는 자동 생성됨 (increment_subscription_usage에서)
  RAISE NOTICE 'Monthly usage reset completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 매월 1일 0시에 사용량 리셋 (pg_cron 필요)
-- SELECT cron.schedule('reset-monthly-usage', '0 0 1 * *', 'SELECT reset_monthly_usage();');

-- 사용량 조회 함수 (현재 기간)
CREATE OR REPLACE FUNCTION get_current_usage(
  p_subscription_id UUID,
  p_feature_key TEXT
)
RETURNS TABLE(
  used_count INTEGER,
  limit_value INTEGER,
  remaining INTEGER,
  period_start DATE,
  period_end DATE
) AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  v_period_start := date_trunc('month', CURRENT_DATE);
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;

  RETURN QUERY
  SELECT
    COALESCE(su.used_count, 0)::INTEGER,
    pf.limit_value,
    CASE
      WHEN pf.limit_value IS NULL THEN -1 -- 무제한
      ELSE GREATEST(0, pf.limit_value - COALESCE(su.used_count, 0))
    END AS remaining,
    v_period_start,
    v_period_end
  FROM subscriptions s
  JOIN plan_features pf ON pf.plan_id = s.plan_id
  LEFT JOIN subscription_usage su ON su.subscription_id = s.id
    AND su.feature_key = p_feature_key
    AND su.period_start = v_period_start
  WHERE s.id = p_subscription_id
  AND pf.feature_key = p_feature_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 코멘트
COMMENT ON TABLE subscription_usage IS '구독 기능별 사용량 추적 (월별 집계)';
COMMENT ON COLUMN subscription_usage.feature_key IS '기능 식별자 (예: find_market_search)';
COMMENT ON COLUMN subscription_usage.used_count IS '기간 내 사용 횟수';
COMMENT ON FUNCTION increment_subscription_usage IS '사용량 증가 및 제한 체크 (원자적)';
COMMENT ON FUNCTION reset_monthly_usage IS '매월 1일 사용량 리셋';
COMMENT ON FUNCTION get_current_usage IS '현재 기간 사용량 조회';
