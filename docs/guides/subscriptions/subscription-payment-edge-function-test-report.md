# Subscription Payment Edge Function - Test Report

**Created**: 2025-11-22
**Function**: `process-subscription-payments`
**Purpose**: 자동 정기결제 처리 및 구독 관리
**Status**: ✅ Implementation Complete | ⏳ Testing Pending

---

## 📋 개요

### 목적
토스페이먼츠 빌링키를 사용한 정기 구독 자동 결제 처리를 위한 Supabase Edge Function

### 핵심 기능
1. **자동 결제 처리**: 매일 00:00 (KST) 실행, 결제 예정일이 도래한 구독 자동 결제
2. **재시도 로직**: 네트워크/서버 에러 시 exponential backoff (최대 3회)
3. **실패 처리**: 3회 연속 실패 시 구독 상태 → `suspended`, 사용자 알림
4. **무료 플랜**: 가격이 0원인 플랜은 결제 없이 기간 자동 연장
5. **만료 처리**: `cancel_at_period_end=true` 구독의 만료일 확인 및 상태 업데이트

---

## 🏗️ 아키텍처

### Edge Function 위치
```
supabase/functions/process-subscription-payments/index.ts
```

### 의존성
- **Supabase Client**: `@supabase/supabase-js@2.39.3`
- **Toss Payments API**: `https://api.tosspayments.com/v1/billing/{billingKey}`
- **CORS Helper**: `../shared/cors.ts`

### 환경 변수
| 변수명 | 필수 | 설명 | 예시 |
|--------|------|------|------|
| `TOSS_PAYMENTS_SECRET_KEY` | ✅ | 토스페이먼츠 시크릿 키 | `test_sk_***` |
| `CRON_SECRET` | ⚠️ | Cron 인증용 Secret | `random-string-123` |
| `SUPABASE_URL` | ✅ | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service Role Key | `eyJ***` |

---

## 🔄 프로세스 플로우

### 1. 구독 조회 (Query)
```sql
SELECT *
FROM subscriptions
WHERE status IN ('active', 'trial')
  AND next_billing_date <= TODAY
  AND cancel_at_period_end = false
```

**조건**:
- 활성/체험 상태
- 결제 예정일이 오늘 이전
- 해지 예약되지 않음

### 2. 결제 처리 (Payment)

#### A. 무료 플랜 (price = 0)
```typescript
if (plan.price === 0) {
  await extendSubscription(supabase, sub)
  // 다음 결제일만 연장, 실제 결제 없음
}
```

#### B. 유료 플랜 (price > 0)
```typescript
// 1. 토스페이먼츠 API 호출
POST https://api.tosspayments.com/v1/billing/{billingKey}
Authorization: Basic {Base64(SECRET_KEY:)}
Body: {
  amount: 50000,
  customerKey: "user-uuid",
  orderId: "sub_xxx_1700000000",
  orderName: "COMPASS Navigator 프로 플랜 정기결제"
}

// 2. 성공 시
- subscription_payments 레코드 생성 (status: 'success')
- subscriptions 업데이트 (next_billing_date +1 month/quarter/year)
- activity_logs 기록

// 3. 실패 시
- subscription_payments 레코드 생성 (status: 'failed', error_code/message)
- 최근 3회 결제 실패 여부 확인
- 3회 실패 → status: 'suspended', activity_logs 기록
```

### 3. 재시도 로직 (Retry)
```typescript
// Exponential Backoff
MAX_RETRIES = 3
RETRY_DELAY_MS = 1000

retryDelay = 1000 * 2^retryCount
// 1초 → 2초 → 4초
```

**재시도 조건**:
- 5xx 서버 에러
- 429 Too Many Requests
- 네트워크 에러 (fetch 실패)

### 4. 만료 처리 (Expiration)
```typescript
// cancel_at_period_end=true 구독 확인
SELECT id FROM subscriptions
WHERE cancel_at_period_end = true
  AND current_period_end < TODAY
  AND status != 'expired'

// 상태 업데이트
UPDATE subscriptions
SET status = 'expired'
WHERE id IN (...)
```

---

## 🧪 테스트 시나리오

### Test 1: 정상 결제 ✅
**설정**:
- 구독 상태: `active`
- `next_billing_date`: 오늘
- 플랜 가격: ₩50,000
- 빌링키: 유효

**예상 결과**:
```json
{
  "id": "sub-uuid",
  "status": "success",
  "orderId": "sub_xxx_1700000000"
}
```

**검증**:
- ✅ `subscription_payments` 레코드 생성 (`status: 'success'`)
- ✅ `subscriptions.next_billing_date` +1개월 업데이트
- ✅ `activity_logs` 기록 (`action: 'subscription_payment_success'`)

---

### Test 2: 결제 실패 (잔액 부족) ⚠️
**설정**:
- 구독 상태: `active`
- `next_billing_date`: 오늘
- 카드: 잔액 부족

**토스페이먼츠 응답**:
```json
{
  "code": "INSUFFICIENT_FUNDS",
  "message": "잔액이 부족합니다."
}
```

**예상 결과**:
```json
{
  "id": "sub-uuid",
  "status": "failed",
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "잔액이 부족합니다."
  }
}
```

**검증**:
- ✅ `subscription_payments.status`: `'failed'`
- ✅ `subscription_payments.error_code`: `'INSUFFICIENT_FUNDS'`
- ✅ `subscriptions.status`: 유지 (`'active'`) (1회 실패)
- ✅ `activity_logs` 기록 (`consecutive_failures: 1`)

---

### Test 3: 3회 연속 실패 → Suspended 🔴
**설정**:
- 최근 3개 `subscription_payments` 레코드 모두 `status: 'failed'`

**예상 결과**:
```json
{
  "id": "sub-uuid",
  "status": "failed",
  "error": {...}
}
```

**검증**:
- ✅ `subscriptions.status`: `'suspended'`
- ✅ `activity_logs` 기록:
  ```json
  {
    "action": "subscription_suspended",
    "metadata": {
      "reason": "consecutive_payment_failures",
      "failure_count": 3,
      "last_error": "잔액이 부족합니다."
    }
  }
  ```
- ⏳ 이메일 알림 발송 (TODO)

---

### Test 4: 무료 플랜 연장 🆓
**설정**:
- 플랜 가격: ₩0
- `next_billing_date`: 오늘

**예상 결과**:
```json
{
  "id": "sub-uuid",
  "status": "extended_free"
}
```

**검증**:
- ✅ `subscriptions.next_billing_date` +1개월 업데이트
- ✅ `subscription_payments` 레코드 생성 **안 됨**
- ✅ 토스페이먼츠 API 호출 **안 됨**

---

### Test 5: 재시도 로직 (5xx 에러) 🔄
**설정**:
- 토스페이먼츠 API: 1차 `500 Internal Server Error`, 2차 `200 OK`

**예상 동작**:
1. 1차 호출 → 500 에러
2. 1초 대기 (exponential backoff)
3. 2차 호출 → 성공

**검증**:
- ✅ 콘솔 로그: `"Payment failed (attempt 1/4), retrying in 1000ms..."`
- ✅ 최종 결과: `status: 'success'`
- ✅ 재시도 횟수: 1회

---

### Test 6: 만료 구독 처리 ⏰
**설정**:
- `cancel_at_period_end`: `true`
- `current_period_end`: 어제

**예상 결과**:
```
Expired 1 subscriptions
```

**검증**:
- ✅ `subscriptions.status`: `'expired'`

---

### Test 7: 빌링키 만료 ❌
**설정**:
- 빌링키: 만료됨

**토스페이먼츠 응답**:
```json
{
  "code": "INVALID_BILLING_KEY",
  "message": "빌링키가 만료되었습니다."
}
```

**예상 결과**:
```json
{
  "id": "sub-uuid",
  "status": "failed",
  "error": {
    "code": "INVALID_BILLING_KEY",
    "message": "빌링키가 만료되었습니다."
  }
}
```

**검증**:
- ✅ `subscription_payments.status`: `'failed'`
- ✅ `subscription_payments.error_code`: `'INVALID_BILLING_KEY'`
- ⏳ 사용자에게 빌링키 재등록 요청 (TODO)

---

### Test 8: CRON 인증 실패 🔒
**설정**:
- Authorization 헤더 없음 (또는 잘못된 CRON_SECRET)

**예상 응답**:
```json
{
  "message": "Unauthorized",
  "status": 401
}
```

**검증**:
- ✅ Edge Function 실행 **안 됨**
- ✅ 콘솔 로그: `"Unauthorized attempt to execute cron job"`

---

## 📊 성능 지표

### 예상 처리량
- **구독 수**: 100개/일 (초기)
- **실행 시간**: 평균 5초/구독 (API 호출 포함)
- **총 시간**: ~8분 (100개 × 5초)

### 병목 지점
1. **토스페이먼츠 API**: Rate limit 확인 필요
2. **Supabase DB**: `subscription_payments` 대량 INSERT

### 최적화 방안
- [ ] 병렬 처리 (`Promise.all`)
- [ ] 배치 INSERT (subscription_payments 10개씩 묶기)
- [ ] 재시도 간격 조정 (1초 → 500ms)

---

## 🔍 모니터링

### Edge Function 로그
```bash
# 실시간 로그 스트리밍
supabase functions logs process-subscription-payments --project-ref zykjdneewbzyazfukzyg --follow

# 최근 100개 로그
supabase functions logs process-subscription-payments --project-ref zykjdneewbzyazfukzyg --limit 100
```

### 주요 메트릭
| 메트릭 | 목표 | 확인 방법 |
|--------|------|----------|
| 성공률 | 95%+ | `SELECT COUNT(*) FROM subscription_payments WHERE status='success'` |
| 평균 응답 시간 | 5초 이하 | Edge Function Metrics (Dashboard) |
| 에러율 | 5% 이하 | `SELECT COUNT(*) FROM subscription_payments WHERE status='failed'` |
| Suspended 비율 | 1% 이하 | `SELECT COUNT(*) FROM subscriptions WHERE status='suspended'` |

### 알림 설정 (TODO)
- [ ] Sentry: Edge Function 에러 추적
- [ ] Slack: 일일 실행 결과 요약
- [ ] Email: Suspended 구독 알림 (관리자)

---

## 🛠️ 문제 해결

### 문제 1: "TOSS_PAYMENTS_SECRET_KEY is not set"
**원인**: Supabase Secret이 설정되지 않음
**해결**:
```bash
supabase secrets set TOSS_PAYMENTS_SECRET_KEY=test_sk_xxx
```

---

### 문제 2: 모든 구독 결제 실패
**원인**: 토스페이먼츠 API 키가 잘못됨
**확인**:
```bash
# Secret 확인
supabase secrets list

# 테스트 API 호출
curl -X POST https://api.tosspayments.com/v1/billing/test_bln_xxx \
  -H "Authorization: Basic $(echo -n 'test_sk_xxx:' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "customerKey": "test", "orderId": "test"}'
```

---

### 문제 3: Cron Job 실행 안 됨
**확인**:
```sql
-- Cron Job 목록
SELECT * FROM cron.job WHERE jobname = 'process-subscription-payments';

-- 실행 기록
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-subscription-payments')
ORDER BY start_time DESC LIMIT 10;
```

---

### 문제 4: 구독이 조회되지 않음
**확인**:
```sql
-- 조건 확인
SELECT id, status, next_billing_date, cancel_at_period_end
FROM subscriptions
WHERE status IN ('active', 'trial')
  AND next_billing_date <= CURRENT_DATE
  AND cancel_at_period_end = false;
```

---

## 📚 관련 문서

- [토스페이먼츠 Billing API 문서](https://docs.tosspayments.com/reference/billing-api)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Supabase Cron Jobs 문서](https://supabase.com/docs/guides/database/extensions/pg_cron)

---

## 🎯 다음 단계

### 즉시 작업
- [ ] 로컬 테스트 실행 (`supabase functions serve`)
- [ ] 프로덕션 배포 (`supabase functions deploy`)
- [ ] Cron Job 설정 (매일 00:00 KST)
- [ ] 환경 변수 설정 (TOSS_PAYMENTS_SECRET_KEY)

### 향후 개선
- [ ] 이메일 알림 (Resend 통합)
- [ ] Sentry 에러 추적
- [ ] 병렬 처리 최적화
- [ ] 관리자 대시보드 (실패 구독 목록)

---

**작성자**: Claude Code
**마지막 업데이트**: 2025-11-22
**상태**: ✅ Implementation Complete | ⏳ Testing Pending
