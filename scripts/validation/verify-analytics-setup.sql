-- Analytics 설정 완료 확인 쿼리
-- 모든 단계가 성공적으로 완료되었는지 확인

-- ============================================
-- 1. 테이블 확인
-- ============================================
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'analytics_events';

-- 예상 결과: analytics_events 테이블이 표시되어야 함

-- ============================================
-- 2. 함수 확인
-- ============================================
SELECT 
  routine_name,
  routine_type,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM information_schema.routines r
JOIN pg_proc p ON r.specific_name = p.proname || '_' || p.oid
WHERE r.routine_schema = 'public'
  AND r.routine_name IN (
    'calculate_funnel',
    'calculate_bounce_rate',
    'get_event_counts',
    'get_session_timeline'
  )
ORDER BY r.routine_name;

-- 예상 결과: 4개의 함수가 표시되어야 함

-- ============================================
-- 3. 함수 권한 확인
-- ============================================
SELECT 
  p.proname AS function_name,
  CASE 
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN '✅ authenticated'
    ELSE '❌ none'
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

-- 예상 결과: 모든 함수가 '✅ authenticated' 권한을 가져야 함

-- ============================================
-- 4. 함수 테스트 (빈 데이터 반환 정상)
-- ============================================
-- 테이블이 비어있어도 함수는 정상 작동해야 함

-- 퍼널 분석 테스트
SELECT * FROM calculate_funnel(
  '2025-01-01'::timestamptz,
  '2025-12-31'::timestamptz
);

-- 이탈률 계산 테스트
SELECT * FROM calculate_bounce_rate(
  '2025-01-01'::timestamptz,
  '2025-12-31'::timestamptz
);

-- 이벤트 집계 테스트
SELECT * FROM get_event_counts(
  '2025-01-01'::timestamptz,
  '2025-12-31'::timestamptz
);

-- 예상 결과: 에러 없이 빈 결과 또는 0 값 반환 (정상)

-- ============================================
-- 5. RLS 정책 확인
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'analytics_events'
ORDER BY policyname;

-- 예상 결과: 2개의 정책이 표시되어야 함
-- 1. "Admins can view analytics events" (SELECT)
-- 2. "Service role can insert analytics events" (INSERT)

-- ============================================
-- 6. 인덱스 확인
-- ============================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'analytics_events'
ORDER BY indexname;

-- 예상 결과: 6개의 인덱스가 표시되어야 함

