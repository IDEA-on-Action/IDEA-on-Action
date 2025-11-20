-- ============================================
-- Fix Revenue Functions to Include Subscriptions
-- ============================================

-- 1. 일/주/월별 매출 집계 함수 수정
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
    WITH combined_revenue AS (
      SELECT created_at, total_amount::NUMERIC as amount FROM orders WHERE status = 'completed'
      UNION ALL
      SELECT created_at, amount::NUMERIC as amount FROM subscription_payments WHERE status = 'success'
    )
    SELECT
      TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
      SUM(amount)::NUMERIC AS total,
      COUNT(*)::BIGINT AS count
    FROM combined_revenue
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY date;
  ELSIF group_by = 'week' THEN
    RETURN QUERY
    WITH combined_revenue AS (
      SELECT created_at, total_amount::NUMERIC as amount FROM orders WHERE status = 'completed'
      UNION ALL
      SELECT created_at, amount::NUMERIC as amount FROM subscription_payments WHERE status = 'success'
    )
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-"W"IW') AS date,
      SUM(amount)::NUMERIC AS total,
      COUNT(*)::BIGINT AS count
    FROM combined_revenue
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY date;
  ELSIF group_by = 'month' THEN
    RETURN QUERY
    WITH combined_revenue AS (
      SELECT created_at, total_amount::NUMERIC as amount FROM orders WHERE status = 'completed'
      UNION ALL
      SELECT created_at, amount::NUMERIC as amount FROM subscription_payments WHERE status = 'success'
    )
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') AS date,
      SUM(amount)::NUMERIC AS total,
      COUNT(*)::BIGINT AS count
    FROM combined_revenue
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY date;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 서비스별 매출 집계 함수 수정
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
  WITH combined_sales AS (
    -- 1. General Orders
    SELECT
      oi.service_id,
      s.title AS service_name,
      (oi.price * oi.quantity)::NUMERIC AS amount,
      o.id::TEXT as transaction_id
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN services s ON oi.service_id = s.id
    WHERE o.created_at BETWEEN start_date AND end_date
      AND o.status = 'completed'
    
    UNION ALL
    
    -- 2. Subscription Payments
    SELECT
      sub.service_id,
      s.title AS service_name,
      sp.amount::NUMERIC AS amount,
      sp.id::TEXT as transaction_id
    FROM subscription_payments sp
    JOIN subscriptions sub ON sp.subscription_id = sub.id
    JOIN services s ON sub.service_id = s.id
    WHERE sp.created_at BETWEEN start_date AND end_date
      AND sp.status = 'success'
  )
  SELECT
    cs.service_id,
    cs.service_name,
    SUM(cs.amount)::NUMERIC AS total_revenue,
    COUNT(DISTINCT cs.transaction_id)::BIGINT AS order_count
  FROM combined_sales cs
  GROUP BY cs.service_id, cs.service_name
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. KPI 계산 함수 수정
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
  WITH combined_stats AS (
    SELECT total_amount::NUMERIC as amount, user_id, created_at FROM orders WHERE status = 'completed' AND created_at BETWEEN start_date AND end_date
    UNION ALL
    SELECT amount::NUMERIC as amount, sub.user_id, sp.created_at 
    FROM subscription_payments sp 
    JOIN subscriptions sub ON sp.subscription_id = sub.id 
    WHERE sp.status = 'success' AND sp.created_at BETWEEN start_date AND end_date
  ),
  order_stats AS (
    SELECT
      SUM(amount) AS revenue,
      COUNT(*) AS orders,
      COUNT(DISTINCT user_id) AS customers
    FROM combined_stats
  ),
  visitor_stats AS (
    SELECT COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE created_at BETWEEN start_date AND end_date
      AND event_name = 'page_view'
  ),
  customer_stats AS (
    -- 신규/재방문 고객은 일단 Orders 테이블 기준으로 유지 (구독 결제는 보통 재구매로 간주되나 로직 복잡성 회피)
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
