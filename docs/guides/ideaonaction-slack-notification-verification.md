# Slack 알림 구현 검증 체크리스트

## 배포 완료 항목 ✅

### 1. Edge Function 배포
- ✅ **send-slack-notification** Edge Function 배포 완료
- ✅ 상태: ACTIVE
- ✅ 버전: 1
- ✅ 배포일: 2025-11-27 10:00:23 UTC
- ✅ URL: `https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/send-slack-notification`

### 2. Supabase Secrets 설정
- ✅ **SLACK_WEBHOOK_URL** Secret 설정 완료
- ✅ Digest: `898debeb4191fc883e1e80fa262843eb1b140eca6a45dc88d48399a654eb6a8f`

### 3. 코드 커밋
- ✅ Git 커밋 완료: `feat(BL-012): Slack 알림 구현`
- ✅ 파일 6개 추가
  - Edge Function: `supabase/functions/send-slack-notification/index.ts`
  - Migration: `supabase/migrations/20251127000002_create_slack_notification_trigger.sql`
  - 문서 2개: 설정 가이드, 구현 요약
  - 테스트 스크립트: `scripts/test-slack-notification.sql`
  - CLAUDE.md 업데이트

---

## 남은 수동 설정 항목 ⏸️

### 1. DB 트리거 생성

**실행 위치**: [Supabase SQL Editor](https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/sql/new)

**실행할 파일**: `supabase/migrations/20251127000002_create_slack_notification_trigger.sql`

**포함 내용**:
- [ ] `pg_net` 확장 활성화
- [ ] `notify_slack_on_critical_issue()` 함수 생성
- [ ] INSERT 트리거 생성 (`issue_slack_notification_insert`)
- [ ] UPDATE 트리거 생성 (`issue_slack_notification_update`)

**검증 SQL**:
```sql
-- 1. pg_net 확장 확인
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- 2. 함수 존재 확인
SELECT proname FROM pg_proc WHERE proname = 'notify_slack_on_critical_issue';

-- 3. 트리거 확인
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE '%slack%';
```

---

### 2. 환경 변수 설정 (DB Level)

**실행 위치**: [Supabase SQL Editor](https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/sql/new)

**실행할 SQL**:
```sql
-- 1. Supabase URL 설정
ALTER DATABASE postgres
SET app.settings.supabase_url = 'https://zykjdneewbzyazfukzyg.supabase.co';

-- 2. Service Role Key 설정
-- (https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/settings/api 에서 확인)
ALTER DATABASE postgres
SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
```

**검증 SQL**:
```sql
-- 환경 변수 확인
SELECT current_setting('app.settings.supabase_url', true) AS supabase_url;
SELECT current_setting('app.settings.service_role_key', true) AS service_key;
```

---

## 테스트 실행 📋

### 1. 테스트 이슈 생성

**실행 위치**: [Supabase SQL Editor](https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/sql/new)

**실행할 파일**: `scripts/test-slack-notification.sql`

**테스트 시나리오**:
1. Critical 이슈 생성 → Slack 알림 전송 (🚨)
2. High 이슈 생성 → Slack 알림 전송 (⚠️)
3. Medium 이슈 생성 → 알림 미전송 (정상)
4. pg_net HTTP 요청 로그 확인

### 2. Slack 채널 확인

**확인 항목**:
- [ ] Critical 이슈 알림 도착 (빨간색 첨부파일, 🚨 아이콘)
- [ ] High 이슈 알림 도착 (주황색 첨부파일, ⚠️ 아이콘)
- [ ] Medium 이슈 알림 미도착
- [ ] 메시지 형식 정상 (서비스, 심각도, 상태, 발생 시간, 설명)

### 3. 로그 확인

**Edge Function 로그**:
- **위치**: [Supabase Functions Dashboard](https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/functions)
- **확인**: `send-slack-notification` → Logs 탭
- **기대 결과**: HTTP 200 응답, 에러 없음

**pg_net 요청 로그**:
```sql
SELECT
  id,
  created_at,
  status_code,
  content,
  error_msg
FROM net._http_response
ORDER BY created_at DESC
LIMIT 10;
```

**기대 결과**:
- `status_code = 200`
- `error_msg IS NULL`

---

## 트러블슈팅 가이드 🔧

### 알림이 오지 않는 경우

1. **트리거 활성화 확인**:
   ```sql
   SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE '%slack%';
   ```
   - 기대: `tgenabled = 'O'` (Enabled)

2. **함수 존재 확인**:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'notify_slack_on_critical_issue';
   ```
   - 기대: 1개 행 반환

3. **환경 변수 확인**:
   ```sql
   SELECT current_setting('app.settings.supabase_url', true);
   SELECT current_setting('app.settings.service_role_key', true);
   ```
   - 기대: 둘 다 NOT NULL

4. **pg_net 확장 확인**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```
   - 기대: 1개 행 반환

5. **Slack Webhook URL 확인**:
   ```bash
   supabase secrets list
   ```
   - 기대: `SLACK_WEBHOOK_URL` 존재

### 수동 테스트 (Edge Function 직접 호출)

```bash
curl -X POST \
  https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/send-slack-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "issue": {
      "id": "test-id",
      "title": "테스트 이슈",
      "description": "수동 테스트",
      "severity": "critical",
      "service_id": "minu-find",
      "status": "open",
      "created_at": "2025-11-27T10:00:00Z"
    },
    "type": "INSERT"
  }'
```

**기대 응답**:
```json
{
  "success": true,
  "issue_id": "test-id",
  "severity": "critical"
}
```

---

## 완료 후 정리 🧹

### 테스트 이슈 삭제

```sql
-- 테스트로 생성한 이슈 정리
DELETE FROM service_issues WHERE title LIKE '[테스트]%';
```

### Git Push

```bash
git push origin main
```

---

## 참고 문서 📚

- **설정 가이드**: `docs/guides/ideaonaction-slack-notification-setup.md`
- **구현 요약**: `docs/guides/ideaonaction-slack-notification-implementation-summary.md`
- **테스트 스크립트**: `scripts/test-slack-notification.sql`

---

**작성일**: 2025-11-27
**상태**: 배포 완료 (수동 DB 설정 필요)
