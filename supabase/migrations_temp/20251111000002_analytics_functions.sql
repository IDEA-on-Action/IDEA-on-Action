-- Phase 14: 고급 분석 대시보드
-- 분석 SQL 함수 (퍼널 분석, 이탈률 계산)
-- 작성일: 2025-11-04

-- ============================================
-- 1. 퍼널 분석 함수
-- ============================================
-- 회원가입 → 서비스 조회 → 장바구니 추가 → 결제 시작 → 구매 완료
-- 각 단계별 고유 세션 수를 집계
CREATE OR REPLACE FUNCTION calculate_funnel(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  signup_count BIGINT,
  view_service_count BIGINT,
  add_to_cart_count BIGINT,
  checkout_count BIGINT,
  purchase_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT CASE WHEN event_name = 'sign_up' THEN session_id END) AS signup_count,
    COUNT(DISTINCT CASE WHEN event_name = 'view_service' THEN session_id END) AS view_service_count,
    COUNT(DISTINCT CASE WHEN event_name = 'add_to_cart' THEN session_id END) AS add_to_cart_count,
    COUNT(DISTINCT CASE WHEN event_name = 'begin_checkout' THEN session_id END) AS checkout_count,
    COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN session_id END) AS purchase_count
  FROM analytics_events
  WHERE created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 퍼널 함수 설명
COMMENT ON FUNCTION calculate_funnel IS 'Phase 14: 구매 퍼널 분석 (회원가입 → 구매)';

-- ============================================
-- 2. 이탈률 계산 함수
-- ============================================
-- 이탈률 = (이벤트가 1개만 있는 세션 수 / 전체 세션 수) * 100
-- 단일 이벤트 세션 = 사용자가 한 페이지만 보고 떠남
CREATE OR REPLACE FUNCTION calculate_bounce_rate(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_sessions BIGINT,
  bounced_sessions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH session_events AS (
    SELECT
      session_id,
      COUNT(*) AS event_count
    FROM analytics_events
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY session_id
  )
  SELECT
    COUNT(*)::BIGINT AS total_sessions,
    COUNT(CASE WHEN event_count = 1 THEN 1 END)::BIGINT AS bounced_sessions
  FROM session_events;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 이탈률 함수 설명
COMMENT ON FUNCTION calculate_bounce_rate IS 'Phase 14: 이탈률 계산 (단일 이벤트 세션 비율)';

-- ============================================
-- 3. 이벤트별 집계 함수 (보너스)
-- ============================================
-- 특정 기간 동안 이벤트별 발생 횟수 집계
CREATE OR REPLACE FUNCTION get_event_counts(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  event_name TEXT,
  event_count BIGINT,
  unique_users BIGINT,
  unique_sessions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.event_name,
    COUNT(*)::BIGINT AS event_count,
    COUNT(DISTINCT ae.user_id)::BIGINT AS unique_users,
    COUNT(DISTINCT ae.session_id)::BIGINT AS unique_sessions
  FROM analytics_events ae
  WHERE ae.created_at BETWEEN start_date AND end_date
  GROUP BY ae.event_name
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 이벤트 집계 함수 설명
COMMENT ON FUNCTION get_event_counts IS 'Phase 14: 이벤트별 발생 횟수 집계 (보너스 함수)';

-- ============================================
-- 4. 세션별 이벤트 타임라인 함수
-- ============================================
-- 특정 세션의 이벤트 타임라인 조회 (디버깅/분석용)
CREATE OR REPLACE FUNCTION get_session_timeline(
  p_session_id TEXT
)
RETURNS TABLE (
  id UUID,
  event_name TEXT,
  event_params JSONB,
  page_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.id,
    ae.event_name,
    ae.event_params,
    ae.page_url,
    ae.created_at
  FROM analytics_events ae
  WHERE ae.session_id = p_session_id
  ORDER BY ae.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 세션 타임라인 함수 설명
COMMENT ON FUNCTION get_session_timeline IS 'Phase 14: 특정 세션의 이벤트 타임라인 조회';

-- ============================================
-- 권한 설정 (관리자만 실행 가능)
-- ============================================
-- 보안: 관리자만 분석 함수 실행 가능
REVOKE EXECUTE ON FUNCTION calculate_funnel FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION calculate_bounce_rate FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_event_counts FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_session_timeline FROM PUBLIC;

-- authenticated 사용자에게 실행 권한 부여 (RLS로 관리자 확인)
GRANT EXECUTE ON FUNCTION calculate_funnel TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_bounce_rate TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_timeline TO authenticated;
