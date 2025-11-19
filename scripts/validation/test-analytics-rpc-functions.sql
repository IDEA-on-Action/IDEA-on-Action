-- Analytics RPC 함수 직접 테스트
-- 함수가 정상 작동하는지 확인

-- ============================================
-- 1. calculate_funnel 테스트
-- ============================================
SELECT * FROM calculate_funnel(
  '2025-01-01'::timestamptz,
  '2025-12-31'::timestamptz
);

-- 예상 결과: signup_count, view_service_count 등의 컬럼이 있는 행 반환
-- 에러가 발생하면: 함수 정의나 analytics_events 테이블 문제

-- ============================================
-- 2. calculate_bounce_rate 테스트
-- ============================================
SELECT * FROM calculate_bounce_rate(
  '2025-01-01'::timestamptz,
  '2025-12-31'::timestamptz
);

-- 예상 결과: total_sessions, bounced_sessions 컬럼이 있는 행 반환

-- ============================================
-- 3. get_event_counts 테스트
-- ============================================
SELECT * FROM get_event_counts(
  '2025-01-01'::timestamptz,
  '2025-12-31'::timestamptz
) LIMIT 10;

-- 예상 결과: event_name, event_count 등의 행 반환 (데이터가 있으면)

-- ============================================
-- 4. get_session_timeline 테스트 (세션 ID 필요)
-- ============================================
-- 실제 세션 ID로 테스트하거나, analytics_events 테이블에서 가져오기
-- SELECT * FROM get_session_timeline('your-session-id-here');

-- ============================================
-- 5. analytics_events 테이블 확인
-- ============================================
-- 함수가 analytics_events 테이블을 사용하므로 테이블 존재 확인
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'analytics_events';

-- 테이블이 없으면 함수는 작동하지만 빈 결과만 반환합니다

-- ============================================
-- 6. 함수 시그니처 상세 확인
-- ============================================
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'calculate_funnel',
    'calculate_bounce_rate',
    'get_event_counts',
    'get_session_timeline'
  )
ORDER BY p.proname;

