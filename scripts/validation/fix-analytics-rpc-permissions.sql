-- Analytics RPC 함수 권한 확인 및 수정
-- 함수가 존재하는데 404 오류가 발생하는 경우 실행

-- ============================================
-- 1. 현재 권한 확인
-- ============================================
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE 
    WHEN has_function_privilege('public', p.oid, 'EXECUTE') THEN 'PUBLIC'
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'authenticated'
    ELSE 'none'
  END AS execute_permission
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

-- ============================================
-- 2. 권한 재설정 (필요한 경우)
-- ============================================

-- PUBLIC에서 실행 권한 제거
REVOKE EXECUTE ON FUNCTION calculate_funnel(timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION calculate_bounce_rate(timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_event_counts(timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_session_timeline(text) FROM PUBLIC;

-- authenticated 사용자에게 실행 권한 부여
GRANT EXECUTE ON FUNCTION calculate_funnel(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_bounce_rate(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_counts(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_timeline(text) TO authenticated;

-- anon 사용자에게도 권한 부여 (선택사항 - 공개 API인 경우)
-- GRANT EXECUTE ON FUNCTION calculate_funnel(timestamptz, timestamptz) TO anon;
-- GRANT EXECUTE ON FUNCTION calculate_bounce_rate(timestamptz, timestamptz) TO anon;
-- GRANT EXECUTE ON FUNCTION get_event_counts(timestamptz, timestamptz) TO anon;

-- ============================================
-- 3. 함수 테스트
-- ============================================

-- 테스트 쿼리 (에러가 발생하지 않아야 함)
SELECT * FROM calculate_funnel(
  '2025-01-01'::timestamptz,
  '2025-12-31'::timestamptz
) LIMIT 1;

SELECT * FROM calculate_bounce_rate(
  '2025-01-01'::timestamptz,
  '2025-12-31'::timestamptz
) LIMIT 1;

SELECT * FROM get_event_counts(
  '2025-01-01'::timestamptz,
  '2025-12-31'::timestamptz
) LIMIT 5;

