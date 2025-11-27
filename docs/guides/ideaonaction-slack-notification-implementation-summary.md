# Slack 알림 구현 완료 보고서

## 개요

IDEA on Action 프로젝트에서 **Critical/High 심각도 이슈 발생 시 Slack으로 자동 알림**을 보내는 기능을 성공적으로 구현했습니다.

**구현일**: 2025-11-27
**태스크**: BL-012
**상태**: ✅ 구현 완료 (수동 DB 설정 필요)

---

## 구현된 컴포넌트

### 1. Edge Function

**파일**: `supabase/functions/send-slack-notification/index.ts`

**핵심 기능**:
- Slack Incoming Webhook 연동
- 서비스/심각도별 색상 코딩 (Critical=빨강, High=주황)
- 이모지 아이콘 (🚨 Critical, ⚠️ High)
- 타임스탬프 및 메타데이터 포함
- CORS 지원
- 에러 핸들링 및 로깅

**배포 상태**: ✅ 배포 완료
```bash
supabase functions deploy send-slack-notification --no-verify-jwt
```

**엔드포인트**: `https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/send-slack-notification`

---

### 2. DB 트리거

**파일**: `supabase/migrations/20251127000002_create_slack_notification_trigger.sql`

**핵심 기능**:
- `notify_slack_on_critical_issue()` 함수 생성
- **INSERT 트리거**: 신규 Critical/High 이슈 발생 시 자동 알림
- **UPDATE 트리거**:
  - 심각도가 변경되어 Critical/High가 된 경우
  - 상태가 resolved → open으로 재발한 경우
- pg_net 비동기 HTTP POST (알림 실패가 이슈 생성을 막지 않음)
- 환경 변수 기반 설정 (`app.settings.supabase_url`, `app.settings.service_role_key`)

**배포 상태**: ⏸️ 수동 실행 필요 (아래 참조)

---

### 3. Supabase Secrets

**Secret 이름**: `SLACK_WEBHOOK_URL`

**설정 명령**:
```bash
supabase secrets set SLACK_WEBHOOK_URL=<YOUR_SLACK_WEBHOOK_URL>
```

> ⚠️ Slack Webhook URL은 [Slack App 설정](https://api.slack.com/apps)에서 발급받으세요.

**상태**: ✅ 설정 완료

---

## 수동 설정 필요 항목

### 1. DB 트리거 생성

Supabase Dashboard SQL Editor에서 다음 파일의 SQL을 실행:
- **파일**: `supabase/migrations/20251127000002_create_slack_notification_trigger.sql`
- **URL**: https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/sql/new

### 2. 환경 변수 설정 (DB Level)

Supabase Dashboard SQL Editor에서 실행:

```sql
-- Supabase URL 설정
ALTER DATABASE postgres
SET app.settings.supabase_url = 'https://zykjdneewbzyazfukzyg.supabase.co';

-- Service Role Key 설정
ALTER DATABASE postgres
SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
```

**Service Role Key 확인 위치**: https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/settings/api

---

## 테스트 방법

### 테스트 스크립트 실행

**파일**: `scripts/test-slack-notification.sql`

Supabase Dashboard SQL Editor에서 실행하면:
1. Critical 테스트 이슈 생성 → Slack 알림 전송
2. High 테스트 이슈 생성 → Slack 알림 전송
3. Medium 테스트 이슈 생성 → 알림 미전송 (정상)
4. pg_net HTTP 요청 로그 확인
5. 생성된 테스트 이슈 목록 확인

---

## 알림 메시지 예시

```
🚨 [신규 이슈 발생] [테스트] 긴급 장애 발생

서비스: Minu Find
심각도: CRITICAL
상태: open
발생 시간: 2025-11-27 15:30
설명: 이것은 Slack 알림 기능을 테스트하기 위한 샘플 이슈입니다.

IDEA on Action Central Hub
```

---

## 기술 스택

- **Deno Edge Function**: Supabase Functions (Deno 런타임)
- **PostgreSQL 확장**: pg_net (비동기 HTTP 요청)
- **Slack API**: Incoming Webhook
- **보안**: HMAC-SHA256 서명 (향후 구현 가능)
- **에러 핸들링**: 트랜잭션 롤백 방지 (알림 실패 시에도 이슈 생성 유지)

---

## 아키텍처 다이어그램

```
[service_issues 테이블]
         |
         | INSERT/UPDATE (Critical/High)
         ↓
[notify_slack_on_critical_issue() 트리거]
         |
         | pg_net.http_post()
         ↓
[send-slack-notification Edge Function]
         |
         | HTTP POST
         ↓
[Slack Incoming Webhook]
         |
         ↓
[Slack 채널 알림]
```

---

## 문서 및 스크립트

### 문서
- **설정 가이드**: `docs/guides/ideaonaction-slack-notification-setup.md`
- **구현 요약**: `docs/guides/ideaonaction-slack-notification-implementation-summary.md` (본 문서)

### 스크립트
- **테스트 스크립트**: `scripts/test-slack-notification.sql`

### 코드
- **Edge Function**: `supabase/functions/send-slack-notification/index.ts`
- **DB 마이그레이션**: `supabase/migrations/20251127000002_create_slack_notification_trigger.sql`

---

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
   - `send-slack-notification` 함수 → Logs 탭

6. **pg_net 요청 로그 확인**:
   ```sql
   SELECT * FROM net._http_response ORDER BY created_at DESC LIMIT 10;
   ```

---

## 향후 개선 사항

### 1. 재시도 로직
- `event_queue` 테이블을 활용한 재시도 메커니즘
- 실패한 알림 재전송 (최대 3회)

### 2. 알림 채널 분리
- Critical → #alerts-critical
- High → #alerts-high
- Slack 채널 라우팅 로직

### 3. 알림 그룹화
- 동일 서비스의 연속된 이슈를 하나의 스레드로 그룹화
- Slack Thread 활용

### 4. 액션 버튼
- "이슈 확인" 버튼 → IDEA on Action 대시보드 링크
- "담당자 지정" 버튼 → 인터랙티브 메시지

### 5. 알림 필터링
- 특정 시간대 알림 음소거 (예: 야간 22:00~08:00)
- 서비스별 알림 ON/OFF 설정

---

## 참고 자료

- **Slack Incoming Webhooks**: https://api.slack.com/messaging/webhooks
- **pg_net 문서**: https://github.com/supabase/pg_net
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **PostgreSQL Triggers**: https://www.postgresql.org/docs/current/triggers.html

---

**작성자**: Claude AI
**작성일**: 2025-11-27
**버전**: 1.0.0
