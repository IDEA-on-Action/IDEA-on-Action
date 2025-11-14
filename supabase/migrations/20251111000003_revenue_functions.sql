-- ============================================
-- Phase 14 Week 2: 매출 분석 SQL 함수
-- ============================================

-- 1. 일/주/월별 매출 집계 함수
CREATE OR REPLACE FUNCTION get_revenue_by_date(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  group_by TEXT DEFAULT 'day'
)
RETURNS TABLE (
  date TEXT,
  total NUMERIC,
  count BIGINT
) AS $$
BEGIN
  IF group_by = 'day' THEN
    RETURN QUERY
    SELECT
      TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
      SUM(total_amount)::NUMERIC AS total,
      COUNT(*)::BIGINT AS count
    FROM orders
    WHERE created_at BETWEEN start_date AND end_date
      AND status = 'completed'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY date;
  ELSIF group_by = 'week' THEN
    RETURN QUERY
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-"W"IW') AS date,
      SUM(total_amount)::NUMERIC AS total,
      COUNT(*)::BIGINT AS count
    FROM orders
    WHERE created_at BETWEEN start_date AND end_date
      AND status = 'completed'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY date;
  ELSIF group_by = 'month' THEN
    RETURN QUERY
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') AS date,
      SUM(total_amount)::NUMERIC AS total,
      COUNT(*)::BIGINT AS count
    FROM orders
    WHERE created_at BETWEEN start_date AND end_date
      AND status = 'completed'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY date;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 서비스별 매출 집계 함수
CREATE OR REPLACE FUNCTION get_revenue_by_service(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  service_id UUID,
  service_name TEXT,
  total_revenue NUMERIC,
  order_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.service_id,
    s.title AS service_name,
    SUM(oi.price * oi.quantity)::NUMERIC AS total_revenue,
    COUNT(DISTINCT o.id)::BIGINT AS order_count
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  JOIN services s ON oi.service_id = s.id
  WHERE o.created_at BETWEEN start_date AND end_date
    AND o.status = 'completed'
  GROUP BY oi.service_id, s.title
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. KPI 계산 함수
CREATE OR REPLACE FUNCTION get_kpis(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_revenue NUMERIC,
  order_count BIGINT,
  average_order_value NUMERIC,
  conversion_rate NUMERIC,
  new_customers BIGINT,
  returning_customers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH order_stats AS (
    SELECT
      SUM(total_amount) AS revenue,
      COUNT(*) AS orders,
      COUNT(DISTINCT user_id) AS customers
    FROM orders
    WHERE created_at BETWEEN start_date AND end_date
      AND status = 'completed'
  ),
  visitor_stats AS (
    SELECT COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE created_at BETWEEN start_date AND end_date
      AND event_name = 'page_view'
  ),
  customer_stats AS (
    SELECT
      COUNT(DISTINCT user_id) FILTER (WHERE order_num = 1) AS new_cust,
      COUNT(DISTINCT user_id) FILTER (WHERE order_num > 1) AS return_cust
    FROM (
      SELECT
        user_id,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS order_num
      FROM orders
      WHERE created_at BETWEEN start_date AND end_date
        AND status = 'completed'
    ) numbered_orders
  )
  SELECT
    COALESCE(os.revenue, 0)::NUMERIC,
    COALESCE(os.orders, 0)::BIGINT,
    (COALESCE(os.revenue, 0) / NULLIF(os.orders, 0))::NUMERIC AS avg_order_value,
    (COALESCE(os.orders, 0)::NUMERIC / NULLIF(vs.sessions, 0) * 100)::NUMERIC AS conv_rate,
    COALESCE(cs.new_cust, 0)::BIGINT,
    COALESCE(cs.return_cust, 0)::BIGINT
  FROM order_stats os, visitor_stats vs, customer_stats cs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 설정 (관리자만 실행 가능)
-- 참고: RLS 정책은 orders 테이블에 이미 설정되어 있음
