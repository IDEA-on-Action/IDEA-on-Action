-- Slack 알림 기능 테스트 스크립트
-- Supabase Dashboard SQL Editor에서 실행: https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/sql/new

-- 1. 테스트 이슈 생성 (Critical)
DO $$
DECLARE
  test_issue_id UUID;
BEGIN
  INSERT INTO service_issues (
    service_id,
    severity,
    title,
    description,
    status
  ) VALUES (
    'minu-find',
    'critical',
    '[테스트] 긴급 장애 발생 - Critical',
    '이것은 Slack 알림 기능을 테스트하기 위한 Critical 샘플 이슈입니다.',
    'open'
  ) RETURNING id INTO test_issue_id;

  RAISE NOTICE 'Test Critical issue created: %', test_issue_id;
END $$;

-- 잠시 대기 (알림이 전송될 시간을 줌)
SELECT pg_sleep(2);

-- 2. 테스트 이슈 생성 (High)
DO $$
DECLARE
  test_issue_id UUID;
BEGIN
  INSERT INTO service_issues (
    service_id,
    severity,
    title,
    description,
    status
  ) VALUES (
    'minu-frame',
    'high',
    '[테스트] 중요 이슈 발생 - High',
    '이것은 Slack 알림 기능을 테스트하기 위한 High 샘플 이슈입니다.',
    'open'
  ) RETURNING id INTO test_issue_id;

  RAISE NOTICE 'Test High issue created: %', test_issue_id;
END $$;

-- 잠시 대기
SELECT pg_sleep(2);

-- 3. 테스트 이슈 생성 (Medium - 알림이 가지 않아야 함)
DO $$
DECLARE
  test_issue_id UUID;
BEGIN
  INSERT INTO service_issues (
    service_id,
    severity,
    title,
    description,
    status
  ) VALUES (
    'minu-build',
    'medium',
    '[테스트] 일반 이슈 발생 - Medium',
    '이것은 알림이 가지 않아야 하는 Medium 샘플 이슈입니다.',
    'open'
  ) RETURNING id INTO test_issue_id;

  RAISE NOTICE 'Test Medium issue created (should NOT trigger Slack): %', test_issue_id;
END $$;

-- 4. pg_net HTTP 요청 로그 확인 (최근 10개)
SELECT
  id,
  created_at,
  status_code,
  content,
  error_msg
FROM net._http_response
ORDER BY created_at DESC
LIMIT 10;

-- 5. 생성된 테스트 이슈 확인
SELECT
  id,
  service_id,
  severity,
  title,
  status,
  created_at
FROM service_issues
WHERE title LIKE '[테스트]%'
ORDER BY created_at DESC;

-- 6. 테스트 이슈 정리 (선택 사항)
-- DELETE FROM service_issues WHERE title LIKE '[테스트]%';
