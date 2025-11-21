# Subscription Payment Edge Function - Deployment Guide

**Created**: 2025-11-22
**Function**: `process-subscription-payments`
**Purpose**: 자동 정기결제 처리 및 구독 관리
**Environment**: Production

---

## 📋 배포 전 체크리스트

### 1. 로컬 환경 확인
- [x] Docker Desktop 설치 및 실행
- [x] Supabase CLI 설치 (`supabase --version`)
- [x] 프로젝트 연결 (`supabase link`)

### 2. 데이터베이스 준비
- [x] `billing_keys` 테이블 존재
- [x] `subscriptions` 테이블 존재
- [x] `subscription_plans` 테이블 존재
- [x] `subscription_payments` 테이블 존재
- [x] RLS 정책 설정 완료

### 3. 토스페이먼츠 설정
- [ ] 빌링키 발급 테스트 완료
- [ ] API 키 확보 (프로덕션용)
- [ ] 결제 테스트 완료 (테스트 모드)

### 4. 모니터링 준비
- [ ] Sentry 프로젝트 생성 (선택)
- [ ] Resend 도메인 검증 (이메일 알림용, 선택)

---

## 🚀 배포 단계

### Step 1: Docker Desktop 시작

**Windows**:
1. 시작 메뉴에서 "Docker Desktop" 실행
2. 시스템 트레이에서 Docker 아이콘이 초록색이 될 때까지 대기 (1-2분)
3. 확인:
   ```bash
   docker ps
   ```

**Mac**:
```bash
open -a Docker
# 또는 Applications 폴더에서 Docker.app 실행
```

---

### Step 2: Supabase CLI 확인 및 로그인

```bash
# CLI 버전 확인
supabase --version
# 예상 출력: 1.123.4 이상

# Supabase 로그인 (미로그인 시)
supabase login

# 프로젝트 연결 확인
supabase link --project-ref zykjdneewbzyazfukzyg
```

**예상 출력**:
```
Linked to project: zykjdneewbzyazfukzyg
API URL: https://zykjdneewbzyazfukzyg.supabase.co
```

---

### Step 3: 환경 변수 설정 (Supabase Secrets)

#### A. 토스페이먼츠 API 키 설정

**테스트 환경** (개발/스테이징):
```bash
supabase secrets set TOSS_PAYMENTS_SECRET_KEY=test_sk_YZ1aOwX7K8me65R45bwrxmzpj2gq
```

**프로덕션 환경**:
```bash
# 실제 프로덕션 키로 교체 필요
supabase secrets set TOSS_PAYMENTS_SECRET_KEY=live_sk_ACTUAL_PRODUCTION_KEY
```

#### B. CRON 보안 Secret 설정 (선택)

```bash
# 랜덤 문자열 생성 (Windows PowerShell)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Secret 설정
supabase secrets set CRON_SECRET=your-random-string-here
```

**참고**: CRON_SECRET을 설정하면 Edge Function 호출 시 Authorization 헤더에 `Bearer {CRON_SECRET}` 필요

#### C. Secret 확인

```bash
supabase secrets list
```

**예상 출력**:
```
Name                          Value
TOSS_PAYMENTS_SECRET_KEY      test_sk_***
CRON_SECRET                   ***
```

---

### Step 4: Edge Function 배포

```bash
# process-subscription-payments Edge Function 배포
supabase functions deploy process-subscription-payments --project-ref zykjdneewbzyazfukzyg

# 배포 확인
supabase functions list
```

**예상 출력**:
```
✓ Deployed Function process-subscription-payments
  URL: https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/process-subscription-payments
  Version: 1
  Created At: 2025-11-22T10:30:00Z
```

---

### Step 5: 로컬 테스트 (선택, 권장)

#### A. 로컬 환경 변수 설정

**Windows PowerShell**:
```powershell
@"
TOSS_PAYMENTS_SECRET_KEY=test_sk_YZ1aOwX7K8me65R45bwrxmzpj2gq
CRON_SECRET=your-random-string-here
"@ | Out-File -FilePath supabase\.env.local -Encoding utf8
```

**Linux/Mac (bash)**:
```bash
cat > supabase/.env.local <<EOF
TOSS_PAYMENTS_SECRET_KEY=test_sk_YZ1aOwX7K8me65R45bwrxmzpj2gq
CRON_SECRET=your-random-string-here
EOF
```

#### B. Edge Function 로컬 실행

```bash
# JWT 검증 비활성화 (로컬 테스트용)
supabase functions serve process-subscription-payments --env-file supabase/.env.local --no-verify-jwt
```

**예상 출력**:
```
Serving process-subscription-payments on http://localhost:54321/functions/v1/process-subscription-payments
```

#### C. 수동 테스트 호출

**Windows PowerShell**:
```powershell
$headers = @{
  "Content-Type" = "application/json"
  "Authorization" = "Bearer your-random-string-here"
}
Invoke-RestMethod -Uri 'http://localhost:54321/functions/v1/process-subscription-payments' -Method Post -Headers $headers -Body '{}'
```

**Linux/Mac (curl)**:
```bash
curl -X POST http://localhost:54321/functions/v1/process-subscription-payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-random-string-here" \
  -d '{}'
```

**예상 응답** (구독 없을 경우):
```json
{
  "message": "Subscription processing completed",
  "processed": 0,
  "results": []
}
```

---

### Step 6: Cron Job 설정 (매일 00:00 KST)

#### A. Supabase Dashboard SQL Editor

1. https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/sql/new 접속
2. 다음 SQL 실행:

```sql
-- 1. 필수 확장 설치
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. 프로젝트 설정
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://zykjdneewbzyazfukzyg.supabase.co';

-- 3. Service Role Key 설정 (실제 키로 교체 필요!)
-- Settings > API > service_role 키 복사
ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';

-- 4. CRON Secret 설정 (Step 3-B에서 생성한 값)
ALTER DATABASE postgres SET app.settings.cron_secret = 'your-random-string-here';
```

#### B. Cron Job 생성

```sql
-- 기존 작업 삭제 (있을 경우)
SELECT cron.unschedule('process-subscription-payments')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-subscription-payments'
);

-- 새 CRON Job 생성 (매일 00:00 KST = 15:00 UTC 전날)
-- 한국 시간 00:00 = UTC 15:00 (전날)
SELECT cron.schedule(
  'process-subscription-payments',
  '0 15 * * *', -- 매일 15:00 UTC (한국 시간 다음날 00:00)
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-subscription-payments',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**참고**: UTC 15:00 = KST 00:00 (다음날)

#### C. Cron Job 확인

```sql
-- Cron Job 목록
SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname = 'process-subscription-payments';
```

**예상 출력**:
```
jobid | jobname                       | schedule      | active
------|-------------------------------|---------------|-------
1     | process-subscription-payments | 0 15 * * *    | true
```

---

### Step 7: 수동 실행 테스트 (Cron Job)

```sql
-- Edge Function 직접 호출 (수동 테스트)
SELECT
  net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-subscription-payments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
```

**예상 응답**:
```
request_id
----------
12345
```

**로그 확인**:
```bash
supabase functions logs process-subscription-payments --project-ref zykjdneewbzyazfukzyg --limit 10
```

---

## ✅ 배포 검증

### 1. Edge Function 상태 확인
```bash
supabase functions list
```

**확인 사항**:
- ✅ `process-subscription-payments` 함수가 목록에 있음
- ✅ Version 번호 확인
- ✅ Created At 타임스탬프 최신

### 2. Secret 확인
```bash
supabase secrets list
```

**확인 사항**:
- ✅ `TOSS_PAYMENTS_SECRET_KEY` 존재
- ✅ `CRON_SECRET` 존재 (설정한 경우)

### 3. Cron Job 확인
```sql
-- Dashboard > SQL Editor
SELECT * FROM cron.job WHERE jobname = 'process-subscription-payments';
```

**확인 사항**:
- ✅ `active = true`
- ✅ `schedule = '0 15 * * *'`

### 4. 실행 기록 확인
```sql
SELECT
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'process-subscription-payments'
)
ORDER BY start_time DESC
LIMIT 5;
```

**확인 사항**:
- ✅ `status = 'succeeded'`
- ✅ `return_message` 확인 (에러 없음)

### 5. Edge Function 로그 확인
```bash
supabase functions logs process-subscription-payments --follow
```

**확인 사항**:
- ✅ "Subscription processing completed" 메시지
- ✅ `processed: N` (처리된 구독 수)
- ✅ 에러 로그 없음

---

## 📊 모니터링 설정

### 1. Supabase Dashboard

**Edge Function Metrics**:
1. https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/functions
2. **process-subscription-payments** 선택
3. **Metrics** 탭 확인:
   - 요청 수 (Requests)
   - 성공률 (Success Rate)
   - 평균 응답 시간 (Avg Response Time)
   - 에러율 (Error Rate)

### 2. Cron Job 실행 기록

**매일 확인**:
```sql
SELECT
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-subscription-payments')
  AND start_time >= NOW() - INTERVAL '7 days'
ORDER BY start_time DESC;
```

### 3. 결제 성공률 모니터링

```sql
-- 최근 7일 결제 성공률
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS total_payments,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successful_payments,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) AS success_rate
FROM subscription_payments
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 4. Suspended 구독 확인

```sql
-- Suspended 구독 목록
SELECT
  s.id,
  s.user_id,
  s.status,
  s.updated_at,
  sp.plan_name,
  u.email
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
JOIN auth.users u ON s.user_id = u.id
WHERE s.status = 'suspended'
ORDER BY s.updated_at DESC;
```

---

## 🔧 문제 해결

### 문제 1: "TOSS_PAYMENTS_SECRET_KEY is not set"

**증상**: Edge Function 실행 시 에러 발생

**원인**: Supabase Secret이 설정되지 않음

**해결**:
```bash
supabase secrets set TOSS_PAYMENTS_SECRET_KEY=test_sk_xxx
```

---

### 문제 2: Cron Job이 실행되지 않음

**증상**: Cron Job 실행 기록이 없음

**확인 1**: Cron Job 활성 상태
```sql
SELECT active FROM cron.job WHERE jobname = 'process-subscription-payments';
```

**해결 1**: 활성화
```sql
UPDATE cron.job SET active = true WHERE jobname = 'process-subscription-payments';
```

**확인 2**: pg_cron 확장 설치
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**해결 2**: 확장 설치
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

---

### 문제 3: "Unauthorized" 에러 (401)

**증상**: Edge Function 호출 시 401 에러

**원인**: CRON_SECRET 불일치

**해결**:
```bash
# Secret 재설정
supabase secrets set CRON_SECRET=your-random-string-here

# Database 설정 업데이트
-- SQL Editor에서 실행
ALTER DATABASE postgres SET app.settings.cron_secret = 'your-random-string-here';
```

---

### 문제 4: 토스페이먼츠 API 에러

**증상**: 모든 결제 실패 (status: 'failed')

**확인**:
```bash
# API 키 테스트
curl -X POST https://api.tosspayments.com/v1/billing/test_bln_xxx \
  -H "Authorization: Basic $(echo -n 'test_sk_xxx:' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "customerKey": "test", "orderId": "test"}'
```

**해결**:
- API 키가 올바른지 확인
- 테스트 모드 vs 프로덕션 모드 확인
- 빌링키 유효성 확인

---

### 문제 5: "relation 'billing_keys' does not exist"

**증상**: DB 쿼리 에러

**원인**: 마이그레이션 미적용

**해결**:
```bash
# 로컬 DB 리셋 (개발 환경)
supabase db reset

# 프로덕션 DB (Dashboard > SQL Editor)
-- 마이그레이션 파일 수동 실행:
-- supabase/migrations/20251119153000_create_subscription_management_tables.sql
```

---

## 📚 참고 문서

- [토스페이먼츠 Billing API](https://docs.tosspayments.com/reference/billing-api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [pg_cron 확장](https://github.com/citusdata/pg_cron)
- [Cron 표현식 가이드](https://crontab.guru/)

---

## 🎯 배포 완료 체크리스트

### 필수 항목
- [ ] Edge Function 배포 완료 (`supabase functions deploy`)
- [ ] Secrets 설정 완료 (TOSS_PAYMENTS_SECRET_KEY, CRON_SECRET)
- [ ] Cron Job 생성 완료 (매일 00:00 KST)
- [ ] 수동 테스트 성공 (로컬 또는 SQL)
- [ ] 로그 확인 (에러 없음)

### 권장 항목
- [ ] Sentry 연동 (에러 추적)
- [ ] Resend 연동 (이메일 알림)
- [ ] Slack 알림 설정 (일일 요약)
- [ ] 모니터링 대시보드 구성
- [ ] 프로덕션 API 키 교체 (테스트 → 실제)

### 문서화
- [x] 테스트 보고서 작성
- [x] 배포 가이드 작성
- [ ] Runbook 작성 (장애 대응)
- [ ] 사용자 가이드 작성 (구독 관리 방법)

---

**작성자**: Claude Code
**마지막 업데이트**: 2025-11-22
**상태**: ✅ Ready for Deployment
