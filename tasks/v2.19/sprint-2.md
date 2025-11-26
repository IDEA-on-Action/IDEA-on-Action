# v2.19.0 Sprint 2: Edge Functions 타입화

**작성일**: 2025-11-26
**Sprint**: 2/5
**예상 시간**: 3시간
**상태**: 📝 Ready

---

## Sprint 목표

1. **타입 정의 작성**: toss-payments.types.ts (30+ 타입)
2. **any 타입 제거**: Edge Functions 9개 → 0개
3. **Edge Functions 배포**: 3개 함수 배포
4. **E2E 테스트**: 5개 신규 작성

---

## TASK-010: toss-payments.types.ts 작성

**담당**: AI 에이전트
**예상 시간**: 1시간
**우선순위**: P0

### 설명
토스페이먼츠 API 타입을 정의합니다.

### 파일 생성

#### supabase/functions/_shared/toss-payments.types.ts
```typescript
/**
 * 토스페이먼츠 API 타입 정의
 * @description 토스페이먼츠 결제 API v1 타입
 * @see https://docs.tosspayments.com/reference
 */

/**
 * 결제 수단
 */
export type TossPaymentMethod =
  | 'CARD'                        // 카드
  | 'VIRTUAL_ACCOUNT'             // 가상계좌
  | 'EASY_PAY'                    // 간편결제
  | 'PHONE'                       // 휴대폰
  | 'CULTURE_GIFT_CERTIFICATE'    // 문화상품권
  | 'BOOK_GIFT_CERTIFICATE'       // 도서문화상품권
  | 'GAME_GIFT_CERTIFICATE';      // 게임문화상품권

/**
 * 결제 상태
 */
export type TossPaymentStatus =
  | 'READY'              // 결제 준비
  | 'IN_PROGRESS'        // 결제 진행 중
  | 'WAITING_FOR_DEPOSIT'// 입금 대기
  | 'DONE'               // 결제 완료
  | 'CANCELED'           // 결제 취소
  | 'PARTIAL_CANCELED'   // 부분 취소
  | 'ABORTED'            // 결제 중단
  | 'EXPIRED';           // 결제 만료

/**
 * 카드 타입
 */
export type TossCardType =
  | 'CREDIT'   // 신용카드
  | 'DEBIT'    // 체크카드
  | 'GIFT';    // 기프트카드

/**
 * 카드 정보
 */
export interface TossCard {
  company: string;           // 카드사
  number: string;            // 카드번호 (마스킹)
  installmentPlanMonths: number; // 할부 개월 수
  isInterestFree: boolean;   // 무이자 여부
  approveNo: string;         // 승인번호
  cardType: TossCardType;    // 카드 타입
  ownerType: 'PERSONAL' | 'CORPORATE'; // 소유자 타입
  acquireStatus: 'READY' | 'REQUESTED' | 'COMPLETED' | 'CANCEL_REQUESTED' | 'CANCELED';
}

/**
 * 가상계좌 정보
 */
export interface TossVirtualAccount {
  accountType: 'NORMAL' | 'FIXED'; // 계좌 타입
  accountNumber: string;            // 계좌번호
  bankCode: string;                 // 은행 코드
  customerName: string;             // 고객명
  dueDate: string;                  // 입금 기한 (ISO 8601)
  refundStatus: 'NONE' | 'PENDING' | 'FAILED' | 'COMPLETED'; // 환불 상태
  expired: boolean;                 // 만료 여부
  settlementStatus: 'INCOMPLETED' | 'COMPLETED'; // 정산 상태
}

/**
 * 취소 정보
 */
export interface TossCancellation {
  cancelAmount: number;        // 취소 금액
  cancelReason: string;        // 취소 사유
  taxFreeAmount: number;       // 면세 금액
  taxAmount: number;           // 부가세
  refundableAmount: number;    // 환불 가능 금액
  canceledAt: string;          // 취소 일시 (ISO 8601)
  transactionKey: string;      // 거래 키
  receiptKey: string | null;   // 영수증 키
}

/**
 * 결제 요청 (결제 창 호출)
 */
export interface TossPaymentRequest {
  amount: number;                // 결제 금액
  orderId: string;               // 주문 ID (고유값)
  orderName: string;             // 주문명
  customerName?: string;         // 고객명
  customerEmail?: string;        // 고객 이메일
  customerMobilePhone?: string;  // 고객 전화번호
  method?: TossPaymentMethod;    // 결제 수단
  successUrl: string;            // 성공 URL
  failUrl: string;               // 실패 URL
  flowMode?: 'DEFAULT' | 'DIRECT'; // 결제 흐름 모드
  easyPay?: string;              // 간편결제 provider
  discountCode?: string;         // 할인 코드
  appScheme?: string;            // 앱 스킴
}

/**
 * 결제 승인 요청
 */
export interface TossPaymentApproveRequest {
  paymentKey: string;  // 결제 키
  orderId: string;     // 주문 ID
  amount: number;      // 결제 금액
}

/**
 * 결제 취소 요청
 */
export interface TossPaymentCancelRequest {
  cancelReason: string;        // 취소 사유
  cancelAmount?: number;       // 취소 금액 (부분 취소)
  refundReceiveAccount?: {     // 환불 계좌 (가상계좌)
    bank: string;
    accountNumber: string;
    holderName: string;
  };
  taxFreeAmount?: number;      // 면세 금액
  taxAmount?: number;          // 부가세
}

/**
 * 결제 응답
 */
export interface TossPaymentResponse {
  // 기본 정보
  version: string;             // API 버전
  paymentKey: string;          // 결제 키
  type: 'NORMAL' | 'BILLING' | 'BRANDPAY'; // 결제 타입
  orderId: string;             // 주문 ID
  orderName: string;           // 주문명
  mId: string;                 // 가맹점 ID
  currency: string;            // 통화 (KRW)
  method: TossPaymentMethod;   // 결제 수단
  totalAmount: number;         // 총 금액
  balanceAmount: number;       // 잔액
  status: TossPaymentStatus;   // 결제 상태
  requestedAt: string;         // 결제 요청 시각 (ISO 8601)
  approvedAt: string | null;   // 결제 승인 시각
  useEscrow: boolean;          // 에스크로 사용 여부
  lastTransactionKey: string | null; // 마지막 거래 키

  // 금액 상세
  suppliedAmount: number;      // 공급가액
  vat: number;                 // 부가세
  cultureExpense: boolean;     // 문화비 지출 여부
  taxFreeAmount: number;       // 면세 금액
  taxExemptionAmount: number;  // 과세 제외 금액

  // 취소 정보
  cancels: TossCancellation[] | null; // 취소 내역
  isPartialCancelable: boolean; // 부분 취소 가능 여부

  // 결제 수단별 정보
  card: TossCard | null;       // 카드 정보
  virtualAccount: TossVirtualAccount | null; // 가상계좌 정보
  transfer: object | null;     // 계좌이체 정보
  mobilePhone: object | null;  // 휴대폰 정보
  giftCertificate: object | null; // 상품권 정보
  easyPay: {                   // 간편결제 정보
    provider: string;
    amount: number;
    discountAmount: number;
  } | null;

  // 고객 정보
  country: string;             // 국가 코드
  failure: {                   // 실패 정보
    code: string;
    message: string;
  } | null;

  // 현금영수증
  cashReceipt: {
    type: 'PERSONAL' | 'CORPORATE' | 'ANONYMOUS';
    receiptKey: string;
    issueNumber: string;
    receiptUrl: string;
    amount: number;
    taxFreeAmount: number;
  } | null;

  // 영수증
  receipt: {
    url: string;
  } | null;

  // 체크아웃
  checkout: {
    url: string;
  } | null;

  // 할인
  discount: {
    amount: number;
  } | null;
}

/**
 * 웹훅 이벤트 타입
 */
export type TossWebhookEventType =
  | 'PAYMENT.WAITING_FOR_DEPOSIT' // 입금 대기
  | 'PAYMENT.DONE'                // 결제 완료
  | 'PAYMENT.CANCELED'            // 결제 취소
  | 'PAYMENT.EXPIRED';            // 결제 만료

/**
 * 웹훅 페이로드
 */
export interface TossWebhookPayload {
  createdAt: string;           // 이벤트 생성 시각 (ISO 8601)
  orderId: string;             // 주문 ID
  status: TossPaymentStatus;   // 결제 상태
  secret: string | null;       // 웹훅 비밀키 (구버전)
  eventType: TossWebhookEventType; // 이벤트 타입
  data: TossPaymentResponse;   // 결제 정보
}

/**
 * 에러 응답
 */
export interface TossErrorResponse {
  code: string;    // 에러 코드
  message: string; // 에러 메시지
}

/**
 * API 응답 (성공)
 */
export type TossApiSuccessResponse<T> = T;

/**
 * API 응답 (실패)
 */
export type TossApiErrorResponse = TossErrorResponse;

/**
 * API 응답 (전체)
 */
export type TossApiResponse<T> = TossApiSuccessResponse<T> | TossApiErrorResponse;
```

### 체크리스트
- [ ] 30개 이상 타입 정의
- [ ] JSDoc 주석 포함
- [ ] 토스페이먼츠 API 문서와 일치
- [ ] TypeScript strict mode 통과
- [ ] 린트 통과

### 완료 조건
```bash
# TypeScript 검사
npx tsc --noEmit supabase/functions/_shared/toss-payments.types.ts
# 기대: 0 errors

# 린트 검사
npm run lint
# 기대: 0 errors
```

---

## TASK-011: process-subscription-payments 타입 적용

**담당**: 병렬 에이전트 A
**예상 시간**: 30분
**우선순위**: P0
**의존성**: TASK-010 완료 후 진행

### 설명
`process-subscription-payments` Edge Function에서 any 타입을 제거합니다.

### 파일 수정

#### supabase/functions/process-subscription-payments/index.ts

**Before**:
```typescript
Deno.serve(async (req) => {
  const { orderId, amount, method }: any = await req.json(); // ❌

  const payment: any = await createPayment({ // ❌
    orderId,
    amount,
    method,
  });

  return new Response(JSON.stringify(payment));
});
```

**After**:
```typescript
import {
  TossPaymentRequest,
  TossPaymentResponse,
  TossApiResponse,
} from '../_shared/toss-payments.types.ts';

Deno.serve(async (req) => {
  // 요청 body 타입 정의
  const body = await req.json() as Pick<TossPaymentRequest, 'orderId' | 'amount' | 'method'>; // ✅

  // 결제 생성 타입 정의
  const payment: TossApiResponse<TossPaymentResponse> = await createPayment({ // ✅
    orderId: body.orderId,
    amount: body.amount,
    method: body.method,
  });

  return new Response(JSON.stringify(payment));
});
```

### any 타입 제거 목록
1. `req.json()` → `TossPaymentRequest` 타입 적용
2. `createPayment()` 반환값 → `TossApiResponse<TossPaymentResponse>` 타입 적용
3. `fetch()` 응답 → `Response` 타입 명시
4. `webhookPayload` → `TossWebhookPayload` 타입 적용

### 체크리스트
- [ ] toss-payments.types.ts import
- [ ] any 타입 제거 (4개)
- [ ] TypeScript strict mode 통과
- [ ] 린트 통과
- [ ] 기능 동작 검증

### 완료 조건
```bash
# TypeScript 검사
npx tsc --noEmit supabase/functions/process-subscription-payments/index.ts
# 기대: 0 errors

# 린트 검사
npm run lint
# 기대: 0 errors

# Edge Function 배포
supabase functions deploy process-subscription-payments
# 기대: success
```

---

## TASK-012: create-payment-intent 타입 적용

**담당**: 병렬 에이전트 B
**예상 시간**: 30분
**우선순위**: P0
**의존성**: TASK-010 완료 후 진행

### 설명
`create-payment-intent` Edge Function에서 any 타입을 제거합니다.

### 파일 수정

#### supabase/functions/create-payment-intent/index.ts

**Before**:
```typescript
Deno.serve(async (req) => {
  const body: any = await req.json(); // ❌

  const response: any = await fetch('https://api.tosspayments.com/v1/payments', { // ❌
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data: any = await response.json(); // ❌

  return new Response(JSON.stringify(data));
});
```

**After**:
```typescript
import {
  TossPaymentRequest,
  TossPaymentResponse,
  TossApiResponse,
  TossErrorResponse,
} from '../_shared/toss-payments.types.ts';

Deno.serve(async (req) => {
  // 요청 body 타입 정의
  const body = await req.json() as TossPaymentRequest; // ✅

  // Fetch 응답 타입 정의
  const response: Response = await fetch('https://api.tosspayments.com/v1/payments', { // ✅
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  // 응답 데이터 타입 정의
  const data: TossApiResponse<TossPaymentResponse> = await response.json(); // ✅

  return new Response(JSON.stringify(data));
});
```

### any 타입 제거 목록
1. `req.json()` → `TossPaymentRequest` 타입 적용
2. `fetch()` 반환값 → `Response` 타입 명시
3. `response.json()` → `TossApiResponse<TossPaymentResponse>` 타입 적용

### 체크리스트
- [ ] toss-payments.types.ts import
- [ ] any 타입 제거 (3개)
- [ ] TypeScript strict mode 통과
- [ ] 린트 통과
- [ ] 기능 동작 검증

### 완료 조건
```bash
# TypeScript 검사
npx tsc --noEmit supabase/functions/create-payment-intent/index.ts
# 기대: 0 errors

# 린트 검사
npm run lint
# 기대: 0 errors

# Edge Function 배포
supabase functions deploy create-payment-intent
# 기대: success
```

---

## TASK-013: weekly-recap 타입 적용

**담당**: 병렬 에이전트 C
**예상 시간**: 30분
**우선순위**: P0
**의존성**: TASK-010 완료 후 진행

### 설명
`weekly-recap` Edge Function에서 any 타입을 제거합니다.

### 파일 수정

#### supabase/functions/weekly-recap/index.ts

**Before**:
```typescript
Deno.serve(async (req) => {
  const stats: any = await getWeeklyStats(); // ❌

  const report: any = await generateReport(stats); // ❌

  return new Response(JSON.stringify(report));
});
```

**After**:
```typescript
// 타입 정의
interface WeeklyStats {
  users: number;
  revenue: number;
  orders: number;
  activeSubscriptions: number;
}

interface WeeklyReport {
  period: { start: string; end: string };
  stats: WeeklyStats;
  insights: string[];
  recommendations: string[];
}

Deno.serve(async (req) => {
  // 통계 타입 정의
  const stats: WeeklyStats = await getWeeklyStats(); // ✅

  // 보고서 타입 정의
  const report: WeeklyReport = await generateReport(stats); // ✅

  return new Response(JSON.stringify(report));
});
```

### any 타입 제거 목록
1. `getWeeklyStats()` 반환값 → `WeeklyStats` 타입 적용
2. `generateReport()` 반환값 → `WeeklyReport` 타입 적용

### 체크리스트
- [ ] WeeklyStats, WeeklyReport 타입 정의
- [ ] any 타입 제거 (2개)
- [ ] TypeScript strict mode 통과
- [ ] 린트 통과
- [ ] 기능 동작 검증

### 완료 조건
```bash
# TypeScript 검사
npx tsc --noEmit supabase/functions/weekly-recap/index.ts
# 기대: 0 errors

# 린트 검사
npm run lint
# 기대: 0 errors

# Edge Function 배포
supabase functions deploy weekly-recap
# 기대: success
```

---

## TASK-014: E2E 테스트 작성

**담당**: AI 에이전트
**예상 시간**: 30분
**우선순위**: P0
**의존성**: TASK-011, TASK-012, TASK-013 완료 후 진행

### 설명
토스페이먼츠 결제 E2E 테스트를 작성합니다.

### 파일 생성

#### tests/e2e/toss-payments.spec.ts
```typescript
import { test, expect } from '@playwright/test';

test.describe('Toss Payments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/subscription');
  });

  test('should create payment intent with correct types', async ({ page }) => {
    await page.click('[data-testid="plan-basic"]');
    await page.click('[data-testid="payment-button"]');

    const response = await page.waitForResponse((res) =>
      res.url().includes('/create-payment-intent')
    );

    const data = await response.json();

    // 타입 검증
    expect(data).toHaveProperty('paymentKey');
    expect(data).toHaveProperty('orderId');
    expect(data).toHaveProperty('amount');
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('READY');
  });

  test('should process subscription payment with type safety', async ({ page }) => {
    // 구독 결제 진행
    await page.click('[data-testid="plan-premium"]');
    await page.click('[data-testid="payment-button"]');

    // 토스페이먼츠 결제 창
    await page.waitForSelector('[data-testid="toss-payment-window"]');

    // 테스트 카드 입력
    await page.fill('[data-testid="card-number"]', '4111111111111111');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');

    // 결제 승인
    await page.click('[data-testid="payment-confirm"]');

    const response = await page.waitForResponse((res) =>
      res.url().includes('/process-subscription-payments')
    );

    const data = await response.json();

    // 타입 검증
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('DONE');
    expect(data).toHaveProperty('approvedAt');
  });

  test('should handle webhook payload with types', async ({ page }) => {
    // 웹훅 테스트는 Edge Function 직접 호출
    const response = await fetch('/functions/v1/process-subscription-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'PAYMENT.DONE',
        orderId: 'test-order-123',
        status: 'DONE',
        data: {
          paymentKey: 'test-payment-key',
          amount: 10000,
        },
      }),
    });

    const data = await response.json();

    // 타입 검증
    expect(data).toHaveProperty('eventType');
    expect(data.eventType).toBe('PAYMENT.DONE');
  });

  test('should validate payment status transitions', async ({ page }) => {
    // READY → IN_PROGRESS → DONE 상태 전환 검증
    const statuses = ['READY', 'IN_PROGRESS', 'DONE'];

    for (const status of statuses) {
      // 각 상태에서 타입 검증
      const response = await fetch(`/api/payment-status?orderId=test-${status}`, {
        headers: { Authorization: 'Bearer test-token' },
      });

      const data = await response.json();
      expect(data.status).toBe(status);
    }
  });

  test('should handle payment errors with typed responses', async ({ page }) => {
    // 잘못된 카드 정보로 결제 시도
    await page.click('[data-testid="plan-basic"]');
    await page.click('[data-testid="payment-button"]');

    await page.fill('[data-testid="card-number"]', '0000000000000000'); // 잘못된 카드
    await page.click('[data-testid="payment-confirm"]');

    const response = await page.waitForResponse((res) =>
      res.url().includes('/create-payment-intent')
    );

    const data = await response.json();

    // 에러 타입 검증
    expect(data).toHaveProperty('code');
    expect(data).toHaveProperty('message');
    expect(data.code).toMatch(/^[A-Z_]+$/);
  });
});
```

### 체크리스트
- [ ] toss-payments.spec.ts 파일 생성
- [ ] 5개 테스트 케이스 작성
- [ ] 타입 검증 포함
- [ ] 테스트 실행 및 통과 확인

### 완료 조건
```bash
# E2E 테스트 실행
npm run test:e2e -- tests/e2e/toss-payments.spec.ts

# 기대 출력:
Running 5 tests using 1 worker
  ✓ should create payment intent with correct types (3.1s)
  ✓ should process subscription payment with type safety (4.5s)
  ✓ should handle webhook payload with types (2.3s)
  ✓ should validate payment status transitions (2.8s)
  ✓ should handle payment errors with typed responses (3.2s)

5 passed (16.1s)
```

---

## Sprint 2 완료 조건

### 코드 품질
- [ ] any 타입 11개 → 2개 (-9개)
- [ ] TypeScript 에러 0개
- [ ] ESLint 경고 31개 → 31개 (유지)

### Edge Functions
- [ ] process-subscription-payments 배포 성공
- [ ] create-payment-intent 배포 성공
- [ ] weekly-recap 배포 성공

### 테스트
- [ ] E2E 테스트 5개 통과
- [ ] 총 테스트 297개 → 302개 (+5개)

### 문서
- [ ] CLAUDE.md 업데이트 (v2.19.0 Sprint 2 완료)
- [ ] project-todo.md 체크

### 빌드
```bash
# 린트 검사
npm run lint
# 기대: 31 warnings (유지)

# TypeScript 검사
npx tsc --noEmit
# 기대: 0 errors

# any 타입 검색
grep -r ": any" supabase/functions/ | wc -l
# 기대: 0 (결제 관련)
```

---

## 다음 단계

Sprint 2 완료 후 **Sprint 3: React Hooks 의존성 해결**로 진행합니다.

- [Sprint 3 문서](./sprint-3.md)
- [구현 전략](../../plan/v2.19/implementation-strategy.md)
- [요구사항](../../spec/v2.19/requirements.md)
