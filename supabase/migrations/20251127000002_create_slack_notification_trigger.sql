-- Slack 알림 트리거 생성
-- Critical/High 심각도 이슈 발생 시 자동으로 Slack 알림 전송

-- pg_net 확장 활성화 (HTTP 요청용)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Slack 알림 전송 함수
CREATE OR REPLACE FUNCTION notify_slack_on_critical_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
  function_url TEXT;
BEGIN
  -- 환경 변수에서 URL 가져오기 (Supabase 프로젝트 설정에서 설정 필요)
  -- 예: ALTER DATABASE postgres SET app.settings.supabase_url = 'https://zykjdneewbzyazfukzyg.supabase.co';
  -- 예: ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';

  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- 환경 변수가 없으면 에러 로그만 남기고 진행
    RAISE WARNING 'Supabase URL or Service Key not configured. Skipping Slack notification.';
    RETURN NEW;
  END;

  -- 환경 변수가 없으면 스킵
  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Supabase URL or Service Key is NULL. Skipping Slack notification.';
    RETURN NEW;
  END IF;

  -- Edge Function URL 생성
  function_url := supabase_url || '/functions/v1/send-slack-notification';

  -- Critical 또는 High 심각도인 경우에만 알림
  IF NEW.severity IN ('critical', 'high') THEN
    -- pg_net을 사용한 비동기 HTTP POST 요청
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'issue', jsonb_build_object(
          'id', NEW.id,
          'title', NEW.title,
          'description', NEW.description,
          'severity', NEW.severity,
          'service_id', NEW.service_id,
          'status', NEW.status,
          'created_at', NEW.created_at
        ),
        'type', TG_OP
      )
    );

    RAISE NOTICE 'Slack notification triggered for issue: % (severity: %)', NEW.id, NEW.severity;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 에러가 발생해도 트랜잭션을 롤백하지 않음 (알림 실패가 이슈 생성을 막으면 안 됨)
  RAISE WARNING 'Failed to send Slack notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 기존 트리거 삭제 (있다면)
DROP TRIGGER IF EXISTS issue_slack_notification_insert ON service_issues;
DROP TRIGGER IF EXISTS issue_slack_notification_update ON service_issues;

-- 트리거 생성 (INSERT 시 - 신규 이슈 발생)
CREATE TRIGGER issue_slack_notification_insert
  AFTER INSERT ON service_issues
  FOR EACH ROW
  EXECUTE FUNCTION notify_slack_on_critical_issue();

-- 트리거 생성 (UPDATE 시 - 심각도가 변경되어 Critical/High가 된 경우)
CREATE TRIGGER issue_slack_notification_update
  AFTER UPDATE ON service_issues
  FOR EACH ROW
  WHEN (
    -- 심각도가 변경되었고, 새 심각도가 Critical/High인 경우
    (OLD.severity IS DISTINCT FROM NEW.severity AND NEW.severity IN ('critical', 'high'))
    -- 또는 상태가 resolved → open으로 재발한 경우
    OR (OLD.status = 'resolved' AND NEW.status = 'open' AND NEW.severity IN ('critical', 'high'))
  )
  EXECUTE FUNCTION notify_slack_on_critical_issue();

-- 함수 및 트리거 설명
COMMENT ON FUNCTION notify_slack_on_critical_issue() IS 'Critical/High 이슈 발생 시 Slack으로 자동 알림을 전송하는 트리거 함수';
COMMENT ON TRIGGER issue_slack_notification_insert ON service_issues IS '신규 Critical/High 이슈 발생 시 Slack 알림';
COMMENT ON TRIGGER issue_slack_notification_update ON service_issues IS 'Critical/High 이슈 업데이트 시 Slack 알림';
