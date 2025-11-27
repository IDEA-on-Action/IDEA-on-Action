# Slack 알림 설정 가이드

IDEA on Action 프로젝트에서 Critical/High 심각도 이슈 발생 시 Slack으로 자동 알림을 받는 기능 설정 가이드입니다.

## 완료된 작업

### 1. Edge Function 배포 ✅
- **파일**: `supabase/functions/send-slack-notification/index.ts`
- **상태**: 배포 완료
- **URL**: `https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/send-slack-notification`

### 2. Slack Webhook URL 설정 ✅
- **Secret 이름**: `SLACK_WEBHOOK_URL`
- **설정 명령**: `supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...`
- **상태**: 설정 완료

## 남은 작업

### 3. DB 트리거 생성 (수동 실행 필요)

Supabase Dashboard SQL Editor에서 다음 SQL을 실행해야 합니다:

**실행 위치**: https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/sql/new

**실행할 SQL**:
```sql
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
  -- 환경 변수에서 URL 가져오기
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Supabase URL or Service Key not configured. Skipping Slack notification.';
    RETURN NEW;
  END;

  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Supabase URL or Service Key is NULL. Skipping Slack notification.';
    RETURN NEW;
  END IF;

  function_url := supabase_url || '/functions/v1/send-slack-notification';

  IF NEW.severity IN ('critical', 'high') THEN
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
  RAISE WARNING 'Failed to send Slack notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 기존 트리거 삭제
DROP TRIGGER IF EXISTS issue_slack_notification_insert ON service_issues;
DROP TRIGGER IF EXISTS issue_slack_notification_update ON service_issues;

-- INSERT 트리거 생성
CREATE TRIGGER issue_slack_notification_insert
  AFTER INSERT ON service_issues
  FOR EACH ROW
  EXECUTE FUNCTION notify_slack_on_critical_issue();

-- UPDATE 트리거 생성
CREATE TRIGGER issue_slack_notification_update
  AFTER UPDATE ON service_issues
  FOR EACH ROW
  WHEN (
    (OLD.severity IS DISTINCT FROM NEW.severity AND NEW.severity IN ('critical', 'high'))
    OR (OLD.status = 'resolved' AND NEW.status = 'open' AND NEW.severity IN ('critical', 'high'))
  )
  EXECUTE FUNCTION notify_slack_on_critical_issue();

-- 설명 추가
COMMENT ON FUNCTION notify_slack_on_critical_issue() IS 'Critical/High 이슈 발생 시 Slack으로 자동 알림을 전송하는 트리거 함수';
COMMENT ON TRIGGER issue_slack_notification_insert ON service_issues IS '신규 Critical/High 이슈 발생 시 Slack 알림';
COMMENT ON TRIGGER issue_slack_notification_update ON service_issues IS 'Critical/High 이슈 업데이트 시 Slack 알림';
```

### 4. 환경 변수 설정 (DB Level)

트리거 함수가 Supabase URL과 Service Role Key를 참조할 수 있도록 데이터베이스 레벨 설정이 필요합니다:

**실행할 SQL** (Supabase Dashboard SQL Editor):
```sql
-- Supabase URL 설정
ALTER DATABASE postgres
SET app.settings.supabase_url = 'https://zykjdneewbzyazfukzyg.supabase.co';

-- Service Role Key 설정 (프로젝트 Settings > API에서 확인)
ALTER DATABASE postgres
SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
```

**Service Role Key 확인 위치**:
https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/settings/api

## 테스트 방법

### 1. 테스트 이슈 생성

다음 SQL을 실행하여 테스트 이슈를 생성합니다:

```sql
INSERT INTO service_issues (
  service_id,
  severity,
  title,
  description,
  status
) VALUES (
  'minu-find',
  'critical',
  '[테스트] 긴급 장애 발생',
  '이것은 Slack 알림 기능을 테스트하기 위한 샘플 이슈입니다.',
  'open'
);
```

### 2. Slack 채널 확인

Slack 채널에서 다음과 같은 알림이 도착하는지 확인합니다:

```
🚨 [신규 이슈 발생] [테스트] 긴급 장애 발생

서비스: Minu Find
심각도: CRITICAL
상태: open
발생 시간: 2025-11-27 15:30
설명: 이것은 Slack 알림 기능을 테스트하기 위한 샘플 이슈입니다.

IDEA on Action Central Hub
```

### 3. pg_net 요청 확인 (디버깅용)

pg_net의 HTTP 요청 로그를 확인하려면:

```sql
SELECT * FROM net._http_response ORDER BY created_at DESC LIMIT 10;
```

## 트러블슈팅

### 알림이 오지 않는 경우

1. **트리거 확인**:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%slack%';
   ```

2. **함수 존재 확인**:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'notify_slack_on_critical_issue';
   ```

3. **pg_net 확장 확인**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

4. **환경 변수 확인**:
   ```sql
   SELECT current_setting('app.settings.supabase_url', true);
   SELECT current_setting('app.settings.service_role_key', true);
   ```

5. **Edge Function 로그 확인**:
   - https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/functions
   - `send-slack-notification` 함수 클릭 → Logs 탭

6. **Slack Webhook URL 확인**:
   ```bash
   supabase secrets list
   ```

## 참고 사항

- **비동기 처리**: pg_net은 비동기로 HTTP 요청을 전송하므로 알림 실패가 이슈 생성을 막지 않습니다.
- **재시도 정책**: 현재는 재시도 로직이 없으므로, 필요시 `event_queue` 테이블을 활용한 재시도 로직 추가 고려
- **보안**: Service Role Key는 절대 코드에 하드코딩하지 않고 DB 설정 또는 환경 변수로 관리합니다.

## 관련 파일

- **Edge Function**: `supabase/functions/send-slack-notification/index.ts`
- **Migration**: `supabase/migrations/20251127000002_create_slack_notification_trigger.sql`
- **테이블**: `service_issues` (정의: `supabase/migrations/20251123100001_create_service_issues.sql`)
