# Subscription Payment - Quick Reference

> **5분 빠른 참조 가이드** - 정기 결제 시스템 핵심 정보

---

## 🚀 빠른 시작

### 1. 로컬 테스트 (2분)
```bash
# 1. Docker Desktop 실행 (Windows 시작 메뉴)

# 2. Edge Function 로컬 실행
supabase functions serve process-subscription-payments --env-file supabase/.env.local --no-verify-jwt

# 3. 테스트 호출 (PowerShell)
Invoke-RestMethod -Uri 'http://localhost:54321/functions/v1/process-subscription-payments' -Method Post -Body '{}' -ContentType 'application/json'
```

### 2. 프로덕션 배포 (5분)
```bash
# 1. Secret 설정
supabase secrets set TOSS_PAYMENTS_SECRET_KEY=test_sk_xxx
supabase secrets set CRON_SECRET=random-string-123

# 2. Edge Function 배포
supabase functions deploy process-subscription-payments --project-ref zykjdneewbzyazfukzyg

# 3. Cron Job 생성 (Dashboard > SQL Editor)
# 아래 SQL 복사 & 실행
```

**Cron Job SQL**:
```sql
-- 기존 삭제
SELECT cron.unschedule('process-subscription-payments');

-- 새 작업 생성 (매일 00:00 KST)
SELECT cron.schedule('process-subscription-payments', '0 15 * * *', $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-subscription-payments',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')),
    body := '{}'::jsonb
  );
$$);
```

---

## 📊 핵심 개념 (1분)

### 구독 상태
```
trial → active → cancelled → expired
  ↓       ↓
  └→ active → suspended (3회 결제 실패)
```

### 결제 플로우
```
1. Cron Job (매일 00:00 KST)
2. Edge Function 실행
3. 결제 대상 조회 (next_billing_date <= 오늘)
4. 토스페이먼츠 API 호출
5. 성공 → next_billing_date +1개월
6. 실패 → 재시도 (최대 3회)
7. 3회 실패 → status: 'suspended'
```

---

## 🔧 주요 명령어

### Edge Function
```bash
# 배포
supabase functions deploy process-subscription-payments

# 로그 확인
supabase functions logs process-subscription-payments --follow

# Secret 목록
supabase secrets list

# Secret 설정
supabase secrets set KEY_NAME=value
```

### Cron Job
```sql
-- 목록 확인
SELECT jobid, jobname, schedule, active FROM cron.job;

-- 실행 기록
SELECT start_time, status, return_message FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-subscription-payments')
ORDER BY start_time DESC LIMIT 10;

-- 수동 실행
SELECT net.http_post(...);

-- 삭제
SELECT cron.unschedule('process-subscription-payments');
```

---

## 🔍 트러블슈팅 (5초)

### "TOSS_PAYMENTS_SECRET_KEY is not set"
```bash
supabase secrets set TOSS_PAYMENTS_SECRET_KEY=test_sk_xxx
```

### Cron Job 실행 안 됨
```sql
-- 활성화 확인
SELECT active FROM cron.job WHERE jobname = 'process-subscription-payments';

-- 활성화
UPDATE cron.job SET active = true WHERE jobname = 'process-subscription-payments';
```

### "Unauthorized" (401)
```bash
# Secret 재설정
supabase secrets set CRON_SECRET=your-random-string-here

# DB 설정 업데이트 (SQL Editor)
ALTER DATABASE postgres SET app.settings.cron_secret = 'your-random-string-here';
```

### 모든 결제 실패
```bash
# API 키 테스트
curl -X POST https://api.tosspayments.com/v1/billing/test_bln_xxx \
  -H "Authorization: Basic $(echo -n 'test_sk_xxx:' | base64)" \
  -d '{"amount": 1000, "customerKey": "test", "orderId": "test"}'
```

---

## 📈 모니터링 쿼리

### 결제 성공률 (최근 7일)
```sql
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) AS success_rate
FROM subscription_payments
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Suspended 구독 목록
```sql
SELECT
  s.id,
  u.email,
  sp.plan_name,
  s.updated_at
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'suspended'
ORDER BY s.updated_at DESC;
```

### 최근 실패 결제
```sql
SELECT
  sp.id,
  s.user_id,
  sp.amount,
  sp.error_code,
  sp.error_message,
  sp.created_at
FROM subscription_payments sp
JOIN subscriptions s ON sp.subscription_id = s.id
WHERE sp.status = 'failed'
  AND sp.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY sp.created_at DESC;
```

---

## 🔑 환경 변수

| 변수명 | 필수 | 예시 | 설명 |
|--------|------|------|------|
| `TOSS_PAYMENTS_SECRET_KEY` | ✅ | `test_sk_xxx` | 토스페이먼츠 시크릿 키 |
| `CRON_SECRET` | ⚠️ | `random-123` | Cron 인증용 (권장) |
| `SUPABASE_URL` | ✅ | `https://xxx.supabase.co` | 자동 설정됨 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | `eyJ***` | 자동 설정됨 |

---

## 📁 주요 파일

| 파일 | 경로 | 설명 |
|------|------|------|
| Edge Function | `supabase/functions/process-subscription-payments/index.ts` | 369줄 |
| DB 마이그레이션 | `supabase/migrations/20251119153000_create_subscription_management_tables.sql` | 275줄 |
| TypeScript 타입 | `src/types/subscription.types.ts` | 185줄 |
| 테스트 보고서 | `docs/guides/subscriptions/subscription-payment-edge-function-test-report.md` | ~1,000줄 |
| 배포 가이드 | `docs/guides/subscriptions/subscription-payment-edge-function-deployment.md` | ~800줄 |

---

## 🎯 체크리스트

### 배포 전
- [ ] Docker Desktop 실행
- [ ] `supabase login` 완료
- [ ] `supabase link` 완료
- [ ] Secrets 설정 완료
- [ ] 로컬 테스트 성공

### 배포 후
- [ ] Edge Function 배포 확인
- [ ] Cron Job 생성 확인
- [ ] 수동 실행 테스트 성공
- [ ] 로그 에러 없음
- [ ] 모니터링 쿼리 실행

---

## 📚 관련 문서

- **테스트 보고서**: [subscription-payment-edge-function-test-report.md](./subscription-payment-edge-function-test-report.md)
- **배포 가이드**: [subscription-payment-edge-function-deployment.md](./subscription-payment-edge-function-deployment.md)
- **종합 요약**: [subscription-edge-function-summary.md](./subscription-edge-function-summary.md)
- **Cron 설정**: [supabase-dashboard-cron-setup.md](../supabase-dashboard-cron-setup.md)

---

**Last Updated**: 2025-11-22
**Status**: ✅ Ready to Use
