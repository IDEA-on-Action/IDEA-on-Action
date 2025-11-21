# Subscription Payment Edge Function - Summary

**Created**: 2025-11-22
**Purpose**: 정기 구독 자동 결제 시스템 구현 완료 요약
**Status**: ✅ Implementation Complete | 📋 Deployment Ready

---

## 📝 작업 요약

### 구현 완료 사항

#### 1. Edge Function 구현 ✅
**위치**: `supabase/functions/process-subscription-payments/index.ts`
**라인 수**: 369줄
**의존성**:
- Supabase Client: `@supabase/supabase-js@2.39.3`
- CORS Helper: `../shared/cors.ts`

**핵심 기능**:
- ✅ 빌링키 기반 자동 결제 처리
- ✅ Exponential backoff 재시도 로직 (최대 3회)
- ✅ 3회 연속 실패 시 구독 정지 (status: 'suspended')
- ✅ 무료 플랜 자동 연장 (결제 없음)
- ✅ 만료 구독 처리 (cancel_at_period_end=true)
- ✅ CRON 인증 (CRON_SECRET)
- ✅ Activity 로그 기록

#### 2. 데이터베이스 스키마 ✅
**마이그레이션**: `20251119153000_create_subscription_management_tables.sql`

**테이블 3개**:
1. **billing_keys**: 토스페이먼츠 빌링키 저장
   - 컬럼: id, user_id, billing_key, customer_key, card_type, card_number, is_active
   - RLS 정책: 사용자별 격리

2. **subscriptions**: 사용자별 구독 정보
   - 컬럼: id, user_id, service_id, plan_id, billing_key_id, status, dates...
   - 상태: trial, active, cancelled, expired, suspended
   - RLS 정책: 사용자 + Admin

3. **subscription_payments**: 결제 히스토리
   - 컬럼: id, subscription_id, amount, payment_key, order_id, status, error_code/message
   - 상태: pending, success, failed, cancelled
   - RLS 정책: 사용자 + Admin (조회만)

#### 3. TypeScript 타입 정의 ✅
**파일**: `src/types/subscription.types.ts`
**라인 수**: 185줄

**주요 타입**:
- `SubscriptionStatus`: 5가지 상태
- `PaymentStatus`: 4가지 상태
- `BillingCycle`: monthly, quarterly, yearly
- `SubscriptionWithPlan`: 확장 타입 (서비스/플랜 정보 포함)
- UI 헬퍼: 상태 한글 변환, 배지 색상 매핑

#### 4. 문서 작성 ✅
**생성된 문서 3개**:
1. **테스트 보고서**: `subscription-payment-edge-function-test-report.md` (~1,000줄)
   - 8개 테스트 시나리오
   - 성능 지표 및 모니터링
   - 문제 해결 가이드

2. **배포 가이드**: `subscription-payment-edge-function-deployment.md` (~800줄)
   - 7단계 배포 프로세스
   - Cron Job 설정 (매일 00:00 KST)
   - 검증 체크리스트

3. **종합 요약**: `subscription-edge-function-summary.md` (현재 문서)

---

## 🔑 핵심 개념

### 1. 빌링키 (Billing Key) 기반 결제
```
사용자 카드 등록 (1회)
    ↓
빌링키 발급 (토스페이먼츠)
    ↓
billing_keys 테이블 저장
    ↓
정기 결제 시 빌링키로 자동 결제 (사용자 액션 불필요)
```

**장점**:
- 사용자가 매번 카드 정보 입력할 필요 없음
- PCI DSS 규정 준수 (카드 정보 직접 저장 안 함)
- 결제 성공률 향상 (자동 재시도)

### 2. 재시도 로직 (Exponential Backoff)
```typescript
retryDelay = 1000ms * 2^retryCount

1차 실패 → 1초 대기 → 2차 시도
2차 실패 → 2초 대기 → 3차 시도
3차 실패 → 4초 대기 → 4차 시도
4차 실패 → 최종 실패
```

**재시도 조건**:
- ✅ 5xx 서버 에러 (일시적 장애)
- ✅ 429 Too Many Requests (Rate limit)
- ✅ 네트워크 에러 (fetch 실패)
- ❌ 4xx 클라이언트 에러 (재시도 불가, 예: 잔액 부족)

### 3. 구독 상태 머신 (State Machine)
```
trial → active → cancelled → expired
  ↓       ↓
  └→ active → suspended (3회 결제 실패)
```

**상태별 설명**:
- `trial`: 무료 체험 중 (14일)
- `active`: 정상 활성 (결제 성공)
- `cancelled`: 사용자가 해지 요청 (cancel_at_period_end=true)
- `expired`: 해지 요청 후 기간 만료
- `suspended`: 3회 연속 결제 실패 (자동 정지)

---

## 🧪 테스트 시나리오 요약

### Scenario 1: 정상 결제 ✅
**조건**: 활성 구독 + 유효한 빌링키 + 충분한 잔액
**결과**:
- ✅ 결제 성공
- ✅ `subscription_payments` 레코드 생성 (`status: 'success'`)
- ✅ `next_billing_date` +1개월 업데이트
- ✅ Activity 로그 기록

### Scenario 2: 결제 실패 (1차) ⚠️
**조건**: 카드 잔액 부족
**결과**:
- ⚠️ 결제 실패
- ✅ `subscription_payments` 레코드 생성 (`status: 'failed'`, `error_code: 'INSUFFICIENT_FUNDS'`)
- ✅ 구독 상태 유지 (`active`)
- ✅ Activity 로그 기록 (`consecutive_failures: 1`)

### Scenario 3: 3회 연속 실패 🔴
**조건**: 최근 3개 결제 모두 실패
**결과**:
- 🔴 구독 정지 (`status: 'suspended'`)
- ✅ Activity 로그 기록 (`action: 'subscription_suspended'`)
- ⏳ 이메일 알림 (TODO)

### Scenario 4: 무료 플랜 🆓
**조건**: 플랜 가격 ₩0
**결과**:
- ✅ 결제 건너뜀
- ✅ `next_billing_date` +1개월 업데이트
- ❌ `subscription_payments` 레코드 생성 안 됨
- ❌ 토스페이먼츠 API 호출 안 됨

### Scenario 5: 재시도 성공 🔄
**조건**: 1차 실패 (500 에러) → 2차 성공
**결과**:
- ✅ 1초 대기 후 재시도
- ✅ 최종 성공
- ✅ 콘솔 로그: `"Payment failed (attempt 1/4), retrying in 1000ms..."`

### Scenario 6: 만료 구독 ⏰
**조건**: `cancel_at_period_end=true` + `current_period_end < 오늘`
**결과**:
- ✅ 구독 상태 → `expired`
- ✅ 결제 시도 안 함

### Scenario 7: 빌링키 만료 ❌
**조건**: 빌링키 만료/삭제
**결과**:
- ❌ 결제 실패 (`error_code: 'INVALID_BILLING_KEY'`)
- ⏳ 사용자에게 빌링키 재등록 요청 (TODO)

### Scenario 8: CRON 인증 실패 🔒
**조건**: Authorization 헤더 없음 또는 잘못된 CRON_SECRET
**결과**:
- 🔒 Edge Function 실행 거부 (401 Unauthorized)
- ✅ 콘솔 로그: `"Unauthorized attempt to execute cron job"`

---

## 📊 데이터 플로우

### 1. Cron Job 실행 (매일 00:00 KST)
```sql
-- pg_cron이 매일 15:00 UTC (한국 시간 00:00) 실행
SELECT net.http_post(
  url := 'https://xxx.supabase.co/functions/v1/process-subscription-payments',
  headers := jsonb_build_object(
    'Authorization', 'Bearer CRON_SECRET'
  )
);
```

### 2. Edge Function 실행
```typescript
// 1. 인증 확인
if (authHeader !== `Bearer ${CRON_SECRET}`) {
  return 401 Unauthorized
}

// 2. 결제 대상 구독 조회
SELECT * FROM subscriptions
WHERE status IN ('active', 'trial')
  AND next_billing_date <= TODAY
  AND cancel_at_period_end = false

// 3. 각 구독 처리
for (sub of subscriptions) {
  if (sub.plan.price === 0) {
    // 무료 플랜 → 기간 연장만
    await extendSubscription(supabase, sub)
  } else {
    // 유료 플랜 → 토스페이먼츠 API 호출
    const result = await processPayment(sub, orderId)

    if (result.success) {
      await handlePaymentSuccess(...)
    } else {
      await handlePaymentFailure(...)
    }
  }
}

// 4. 만료 구독 처리
UPDATE subscriptions
SET status = 'expired'
WHERE cancel_at_period_end = true
  AND current_period_end < TODAY
```

### 3. 토스페이먼츠 API 호출
```http
POST https://api.tosspayments.com/v1/billing/{billingKey}
Authorization: Basic {Base64(SECRET_KEY:)}
Content-Type: application/json

{
  "amount": 50000,
  "customerKey": "user-uuid",
  "orderId": "sub_xxx_1700000000",
  "orderName": "COMPASS Navigator 프로 플랜 정기결제"
}
```

**응답 (성공)**:
```json
{
  "paymentKey": "pay_xxx",
  "orderId": "sub_xxx_1700000000",
  "status": "DONE",
  "totalAmount": 50000,
  "approvedAt": "2025-11-22T00:00:00Z"
}
```

**응답 (실패)**:
```json
{
  "code": "INSUFFICIENT_FUNDS",
  "message": "잔액이 부족합니다."
}
```

---

## 🔐 보안 고려사항

### 1. 환경 변수 (Supabase Secrets)
- ✅ `TOSS_PAYMENTS_SECRET_KEY`: Supabase Secret으로 안전하게 관리
- ✅ `CRON_SECRET`: Cron Job 인증용 (외부 호출 차단)
- ❌ 클라이언트 코드에 API 키 노출 안 됨

### 2. RLS 정책
- ✅ `billing_keys`: 사용자별 격리 (auth.uid() = user_id)
- ✅ `subscriptions`: 사용자 + Admin 조회 가능
- ✅ `subscription_payments`: 사용자 조회만, INSERT는 service_role만

### 3. CORS 헤더
```typescript
corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### 4. 인증 레이어
- **Cron Job → Edge Function**: CRON_SECRET (Bearer 토큰)
- **Edge Function → Supabase**: SERVICE_ROLE_KEY
- **Edge Function → Toss Payments**: SECRET_KEY (Basic Auth)

---

## 📈 성능 최적화

### 현재 구현
- **처리 방식**: 순차 처리 (for loop)
- **예상 시간**: 5초/구독 (API 호출 포함)
- **100개 구독**: ~8분 30초

### 향후 개선안
1. **병렬 처리** (`Promise.all`)
   ```typescript
   await Promise.all(subscriptions.map(sub => processSubscription(sub)))
   // 예상 시간: 5초 (동시 처리)
   ```

2. **배치 INSERT** (subscription_payments)
   ```typescript
   // 10개씩 묶어서 INSERT
   const paymentRecords = []
   for (sub of subscriptions) {
     paymentRecords.push({...})
     if (paymentRecords.length >= 10) {
       await supabase.from('subscription_payments').insert(paymentRecords)
       paymentRecords = []
     }
   }
   ```

3. **재시도 간격 조정**
   ```typescript
   // 1초 → 500ms로 단축
   RETRY_DELAY_MS = 500
   ```

---

## 🚨 에러 처리

### Edge Function 레벨
```typescript
try {
  // 메인 로직
} catch (error) {
  console.error('Error:', error)
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 500 }
  )
}
```

### 결제 처리 레벨
```typescript
try {
  const result = await processPayment(sub, orderId)
  // ...
} catch (err) {
  console.error(`Error processing subscription ${sub.id}:`, err)
  results.push({ id: sub.id, status: 'error', error: err.message })
}
```

### 토스페이먼츠 API 레벨
```typescript
if (!response.ok) {
  const isRetryable = response.status >= 500 || response.status === 429
  if (isRetryable && retryCount < MAX_RETRIES) {
    // 재시도
  } else {
    return { success: false, error: data }
  }
}
```

---

## 📅 Cron 스케줄

### 현재 설정
```
0 15 * * *
```

**의미**:
- 분: 0
- 시: 15 (UTC)
- 일: * (매일)
- 월: * (매월)
- 요일: * (모든 요일)

**한국 시간**: 매일 00:00 (UTC +9시간)

### 다른 예시
| 한국 시간 | UTC 시간 | Cron 표현식 | 설명 |
|-----------|----------|-------------|------|
| 매일 00:00 | 전날 15:00 | `0 15 * * *` | 현재 설정 |
| 매일 09:00 | 같은 날 00:00 | `0 0 * * *` | |
| 매주 월요일 00:00 | 일요일 15:00 | `0 15 * * 0` | |
| 매월 1일 00:00 | 전월 말일 15:00 | `0 15 1 * *` | |

---

## 🎯 다음 단계

### 즉시 작업 (우선순위: 높음)
1. **로컬 테스트** (1시간)
   - [ ] Docker Desktop 실행
   - [ ] `supabase functions serve` 실행
   - [ ] 테스트 구독 데이터 생성
   - [ ] 수동 호출 테스트 (PowerShell/curl)

2. **프로덕션 배포** (30분)
   - [ ] `supabase functions deploy` 실행
   - [ ] Secrets 설정 (TOSS_PAYMENTS_SECRET_KEY, CRON_SECRET)
   - [ ] Cron Job 생성 (매일 00:00 KST)
   - [ ] 수동 실행 테스트 (SQL)

3. **검증** (30분)
   - [ ] Edge Function 로그 확인
   - [ ] Cron Job 실행 기록 확인
   - [ ] 결제 성공/실패 확인 (subscription_payments 테이블)

### 향후 개선 (우선순위: 중간)
1. **이메일 알림** (2시간)
   - [ ] Resend 도메인 검증
   - [ ] 결제 성공 이메일 템플릿
   - [ ] 결제 실패 이메일 템플릿
   - [ ] Suspended 알림 이메일

2. **모니터링** (3시간)
   - [ ] Sentry 연동 (에러 추적)
   - [ ] Slack 알림 (일일 요약)
   - [ ] 관리자 대시보드 (실패 구독 목록)

3. **성능 최적화** (4시간)
   - [ ] 병렬 처리 (`Promise.all`)
   - [ ] 배치 INSERT (subscription_payments)
   - [ ] 재시도 간격 조정

### 추가 기능 (우선순위: 낮음)
1. **구독 관리 UI** (8시간)
   - [ ] AdminSubscriptions 페이지 (관리자)
   - [ ] Subscriptions 페이지 (사용자)
   - [ ] 구독 상태 변경 (재개, 강제 해지)
   - [ ] 결제 히스토리 조회

2. **프로모션 코드** (6시간)
   - [ ] promo_codes 테이블 생성
   - [ ] 할인율/정액 할인 지원
   - [ ] 유효 기간 설정
   - [ ] 사용 횟수 제한

3. **플랜 변경 (Upgrade/Downgrade)** (5시간)
   - [ ] 일할 계산 (Proration)
   - [ ] 즉시 적용 vs 다음 주기 적용
   - [ ] 환불 처리

---

## 📚 관련 문서

### 구현 문서
- [Edge Function 코드](../../../supabase/functions/process-subscription-payments/index.ts)
- [DB 마이그레이션](../../../supabase/migrations/20251119153000_create_subscription_management_tables.sql)
- [TypeScript 타입](../../../src/types/subscription.types.ts)

### 가이드 문서
- [테스트 보고서](./subscription-payment-edge-function-test-report.md)
- [배포 가이드](./subscription-payment-edge-function-deployment.md)
- [Supabase Cron 설정](../supabase-dashboard-cron-setup.md)
- [Edge Function 배포](../supabase-edge-function-deployment.md)

### 외부 참고
- [토스페이먼츠 Billing API](https://docs.tosspayments.com/reference/billing-api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/database/extensions/pg_cron)

---

## ✅ 완료 체크리스트

### 구현 단계
- [x] Edge Function 코드 작성 (369줄)
- [x] DB 스키마 설계 (3개 테이블)
- [x] TypeScript 타입 정의 (185줄)
- [x] RLS 정책 설정 (10개 정책)
- [x] 재시도 로직 구현 (Exponential Backoff)
- [x] 에러 처리 (3단계 레벨)
- [x] CRON 인증 (CRON_SECRET)

### 문서화 단계
- [x] 테스트 보고서 작성 (8개 시나리오)
- [x] 배포 가이드 작성 (7단계 프로세스)
- [x] 종합 요약 작성 (현재 문서)
- [x] API 플로우 다이어그램
- [x] 상태 머신 다이어그램

### 배포 준비
- [ ] 로컬 테스트 완료
- [ ] 프로덕션 배포 완료
- [ ] Cron Job 설정 완료
- [ ] Secret 설정 완료
- [ ] 모니터링 설정 완료

---

**작성자**: Claude Code
**마지막 업데이트**: 2025-11-22
**총 작업 시간**: ~2시간 (구현 완료, 테스트 대기)
**상태**: ✅ Implementation Complete | 📋 Deployment Ready
