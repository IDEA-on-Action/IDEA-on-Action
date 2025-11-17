# Supabase Dashboard에서 Edge Function 스케줄 추가하기

> **weekly-recap** 함수를 매주 자동 실행하도록 설정하는 가이드

---

## 📋 사전 준비

1. **Service Role Key 확인**
   - Supabase Dashboard > Settings > API
   - `service_role` 키 복사 (보안 주의!)

2. **프로젝트 URL 확인**
   - 현재 프로젝트: `https://zykjdneewbzyazfukzyg.supabase.co`

---

## 🚀 방법 1: Supabase Dashboard (권장)

### Step 1: Database 설정 확인

먼저 필요한 설정을 SQL Editor에서 실행합니다:

```sql
-- 1. pg_cron 확장 설치
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. net 확장 설치 (HTTP 요청용)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. 프로젝트 URL 설정
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://zykjdneewbzyazfukzyg.supabase.co';

-- 4. Service Role Key 설정 (실제 키로 교체 필요!)
ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
```

⚠️ **보안 주의**: Service Role Key는 Dashboard > Settings > API에서 확인 후 위 SQL의 `YOUR_SERVICE_ROLE_KEY_HERE` 부분을 실제 키로 교체하세요.

### Step 2: Cron Job 생성

**옵션 A: Dashboard UI 사용** (Supabase 최신 버전)

1. Supabase Dashboard > **Database** > **Cron Jobs** 메뉴로 이동
2. **"Create a new cron job"** 또는 **"New Cron Job"** 버튼 클릭
3. 다음 정보 입력:
   - **Name**: `weekly-recap-generation`
   - **Schedule**: `0 15 * * 0` (매주 일요일 15:00 UTC)
   - **Command**: 아래 SQL 사용

```sql
SELECT
  net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/weekly-recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
```

4. **"Create"** 또는 **"Save"** 클릭

**옵션 B: SQL Editor 사용** (모든 버전 지원)

1. Supabase Dashboard > **SQL Editor**로 이동
2. 다음 SQL 실행:

```sql
-- 기존 작업 삭제 (있을 경우)
SELECT cron.unschedule('weekly-recap-generation')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly-recap-generation'
);

-- 새 CRON Job 생성
SELECT cron.schedule(
  'weekly-recap-generation',
  '0 15 * * 0', -- 매주 일요일 15:00 UTC (한국 시간 월요일 00:00)
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/weekly-recap',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

---

## 📅 스케줄 표현식 (Cron Expression)

| 설명 | Cron 표현식 | 예시 |
|------|------------|------|
| 매주 일요일 15:00 UTC | `0 15 * * 0` | 현재 설정 |
| 매일 자정 (00:00 UTC) | `0 0 * * *` | |
| 매일 오전 9시 (09:00 UTC) | `0 9 * * *` | |
| 매주 월요일 00:00 UTC | `0 0 * * 1` | |
| 매월 1일 00:00 UTC | `0 0 1 * *` | |

**Cron 형식**: `분 시 일 월 요일`
- 분: 0-59
- 시: 0-23
- 일: 1-31
- 월: 1-12
- 요일: 0-7 (0과 7은 일요일)

---

## ✅ 확인 방법

### 1. Cron Job 목록 확인

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname = 'weekly-recap-generation';
```

### 2. 실행 기록 확인

```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'weekly-recap-generation'
)
ORDER BY start_time DESC
LIMIT 10;
```

### 3. 수동 테스트

```sql
-- Edge Function 직접 호출 테스트
SELECT
  net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/weekly-recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
```

---

## 🔧 문제 해결

### 문제 1: `pg_cron` 확장이 없다는 오류

```sql
-- 확장 설치
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 문제 2: `pg_net` 확장이 없다는 오류

```sql
-- 확장 설치
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 문제 3: 설정 값이 없다는 오류

```sql
-- 설정 확인
SELECT current_setting('app.settings.supabase_url', true);
SELECT current_setting('app.settings.supabase_service_role_key', true);

-- 설정 추가 (없는 경우)
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://zykjdneewbzyazfukzyg.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

### 문제 4: Cron Job이 실행되지 않음

1. **활성 상태 확인**:
```sql
SELECT active FROM cron.job WHERE jobname = 'weekly-recap-generation';
```

2. **활성화** (비활성화된 경우):
```sql
UPDATE cron.job SET active = true WHERE jobname = 'weekly-recap-generation';
```

3. **실행 기록 확인**:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'weekly-recap-generation')
ORDER BY start_time DESC LIMIT 5;
```

---

## 🗑️ Cron Job 삭제

```sql
-- 특정 Cron Job 삭제
SELECT cron.unschedule('weekly-recap-generation');

-- 또는
DELETE FROM cron.job WHERE jobname = 'weekly-recap-generation';
```

---

## 📚 관련 문서

- [Supabase Cron Jobs 공식 문서](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [pg_cron 확장 문서](https://github.com/citusdata/pg_cron)
- [Cron 표현식 가이드](https://crontab.guru/)

---

**Last Updated**: 2025-11-14  
**Status**: ✅ Ready to Use





