# v2.19.0 인수 조건

**작성일**: 2025-11-26
**버전**: 2.19.0
**상태**: 📝 Draft

---

## Sprint 1: AI 위젯 + Fast Refresh

### 완료 조건
- [ ] SDD 문서 5개 작성 (spec 2개, plan 1개, tasks 2개)
- [ ] AI 채팅 위젯 App.tsx 통합
- [ ] Fast Refresh 경고 5개 → 0개
- [ ] E2E 테스트 5개 통과
- [ ] 빌드 성공 (lint + tsc + vite build)

### 검증 방법

#### 1. SDD 문서 작성
```bash
# 문서 존재 확인
ls spec/v2.19/requirements.md
ls spec/v2.19/acceptance-criteria.md
ls plan/v2.19/implementation-strategy.md
ls tasks/v2.19/sprint-1.md
ls tasks/v2.19/sprint-2.md
```

**기대 결과**:
- 5개 파일 모두 존재
- 각 파일 1,000자 이상

---

#### 2. AI 채팅 위젯 전역 배포
```typescript
// App.tsx 구조
import { AIChatWidget } from '@/components/ai-chat/AIChatWidget';
import { MCPPermissionProvider } from '@/contexts/MCPPermissionContext';

function App() {
  return (
    <MCPPermissionProvider>
      <Routes>
        {/* 기존 라우트 */}
      </Routes>
      <AIChatWidget />
    </MCPPermissionProvider>
  );
}
```

**기대 결과**:
- [ ] 모든 페이지에서 플로팅 버튼 표시
- [ ] 클릭 시 채팅 창 오픈
- [ ] ESC 키로 닫기
- [ ] 페이지 컨텍스트 자동 감지

**테스트 시나리오**:
1. 홈페이지 접속 → 플로팅 버튼 확인
2. 버튼 클릭 → 채팅 창 오픈
3. "현재 페이지는?" 질문 → "홈페이지" 답변
4. ProjectsHub 이동 → "현재 페이지는?" → "프로젝트 허브" 답변
5. ESC 키 → 채팅 창 닫힘

---

#### 3. Fast Refresh 경고 해결
```bash
# 개발 서버 시작
npm run dev

# 파일 수정 시 Fast Refresh 경고 확인
# 경고 예시:
# "Fast refresh only works when a file only exports components.
#  Move your component(s) to a separate file."
```

**Before**:
```
Fast Refresh warnings: 5
- MCPPermissionContext.tsx
- MCPProtected.tsx
- toggle.tsx
- Announcer.tsx (2개)
```

**After**:
```
Fast Refresh warnings: 0
```

**파일 구조 변경**:
```
src/contexts/
  MCPPermissionContext.tsx     # 컴포넌트만
  useMCPPermission.ts          # 훅 분리

src/components/mcp/
  MCPProtected.tsx             # 컴포넌트만
  withMCPProtection.tsx        # HOC 분리

src/components/ui/
  toggle.tsx                   # 컴포넌트만
  toggle.variants.ts           # variants 분리

src/components/accessibility/
  Announcer.tsx                # 컴포넌트만
  useAnnouncer.ts              # 훅 분리
  announcer.constants.ts       # 상수 분리
```

**기대 결과**:
- [ ] Fast Refresh 경고 0개
- [ ] 기존 import 경로 호환성 유지
- [ ] HMR 정상 동작

---

#### 4. E2E 테스트 통과
```bash
# E2E 테스트 실행
npm run test:e2e -- tests/e2e/ai-chat-widget.spec.ts
```

**테스트 케이스** (`tests/e2e/ai-chat-widget.spec.ts`):
1. `should show floating button on all pages`
2. `should open chat window on button click`
3. `should close chat window on ESC key`
4. `should detect page context automatically`
5. `should work after Fast Refresh`

**기대 결과**:
- [ ] 5개 테스트 모두 통과
- [ ] 실행 시간 30초 이내

---

#### 5. 빌드 성공
```bash
# 린트 검사
npm run lint

# TypeScript 타입 검사
npx tsc --noEmit

# 프로덕션 빌드
npm run build
```

**기대 결과**:
```
✓ Lint: 0 errors, 0 warnings
✓ TypeScript: 0 errors
✓ Build: success in ~30s
✓ Bundle size: < 500 kB gzip
```

---

## Sprint 2: Edge Functions 타입화

### 완료 조건
- [ ] toss-payments.types.ts 작성 (30+ 타입)
- [ ] any 타입 9개 → 0개
- [ ] Edge Functions 배포 성공
- [ ] E2E 테스트 5개 통과

### 검증 방법

#### 1. 타입 정의 작성
```bash
# 파일 존재 확인
ls supabase/functions/_shared/toss-payments.types.ts
```

**toss-payments.types.ts 구조**:
```typescript
// 결제 수단
export type TossPaymentMethod =
  | 'CARD'
  | 'VIRTUAL_ACCOUNT'
  | 'EASY_PAY'
  | 'PHONE'
  | 'CULTURE_GIFT_CERTIFICATE'
  | 'BOOK_GIFT_CERTIFICATE'
  | 'GAME_GIFT_CERTIFICATE';

// 결제 상태
export type TossPaymentStatus =
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_DEPOSIT'
  | 'DONE'
  | 'CANCELED'
  | 'PARTIAL_CANCELED'
  | 'ABORTED'
  | 'EXPIRED';

// 결제 요청
export interface TossPaymentRequest {
  orderId: string;
  amount: number;
  orderName: string;
  customerName?: string;
  customerEmail?: string;
  method?: TossPaymentMethod;
  successUrl: string;
  failUrl: string;
}

// 결제 응답
export interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  amount: number;
  status: TossPaymentStatus;
  approvedAt?: string;
  // ... (30+ 타입)
}
```

**기대 결과**:
- [ ] 30개 이상 타입 정의
- [ ] JSDoc 주석 포함
- [ ] 토스페이먼츠 API 문서와 일치

---

#### 2. any 타입 제거
```bash
# any 타입 검색
grep -r "any" supabase/functions/process-subscription-payments/
grep -r "any" supabase/functions/create-payment-intent/
grep -r "any" supabase/functions/weekly-recap/
```

**Before**:
```typescript
// process-subscription-payments/index.ts
const payment: any = await createPayment(data);  // ❌
const response: any = await fetch(url);          // ❌
```

**After**:
```typescript
// process-subscription-payments/index.ts
import { TossPaymentResponse } from '../_shared/toss-payments.types.ts';

const payment: TossPaymentResponse = await createPayment(data);  // ✅
const response: Response = await fetch(url);                      // ✅
```

**기대 결과**:
- [ ] any 타입 9개 → 0개
- [ ] 타입 추론 활성화
- [ ] 자동완성 동작

---

#### 3. Edge Functions 배포
```bash
# Edge Functions 배포
supabase functions deploy process-subscription-payments
supabase functions deploy create-payment-intent
supabase functions deploy weekly-recap
```

**기대 결과**:
```
✓ process-subscription-payments deployed
✓ create-payment-intent deployed
✓ weekly-recap deployed
```

---

#### 4. E2E 테스트 통과
```bash
# E2E 테스트 실행
npm run test:e2e -- tests/e2e/toss-payments.spec.ts
```

**테스트 케이스** (`tests/e2e/toss-payments.spec.ts`):
1. `should create payment intent with correct types`
2. `should process subscription payment with type safety`
3. `should handle webhook payload with types`
4. `should validate payment status transitions`
5. `should handle payment errors with typed responses`

**기대 결과**:
- [ ] 5개 테스트 모두 통과
- [ ] 타입 에러 0개

---

## Sprint 3: React Hooks 의존성 해결

### 완료 조건
- [ ] exhaustive-deps 경고 10개 → 0개
- [ ] 기능 동작 변화 없음
- [ ] E2E 테스트 4개 통과

### 검증 방법

#### 1. exhaustive-deps 경고 해결
```bash
# ESLint 실행
npm run lint
```

**Before**:
```
Warning: React Hook useCallback has missing dependencies
  src/hooks/useSubscriptions.ts:45
  src/hooks/useSubscriptions.ts:67
  src/hooks/useSubscriptions.ts:89
  src/hooks/useSubscriptionPlans.ts:34
  src/hooks/useSubscriptionPlans.ts:56
  src/hooks/usePayments.ts:23
  src/hooks/usePayments.ts:45
  src/hooks/usePayments.ts:67
  src/hooks/useTossPayments.ts:28
  src/hooks/useTossPayments.ts:50

Total: 10 warnings
```

**After**:
```
✓ 0 warnings
```

---

#### 2. 기능 동작 검증
```bash
# 수동 테스트
1. 구독 페이지 접속
2. 플랜 선택
3. 결제 진행
4. 구독 활성화 확인
```

**기대 결과**:
- [ ] 구독 기능 정상 동작
- [ ] 불필요한 재렌더링 없음
- [ ] 메모리 누수 없음

---

#### 3. E2E 테스트 통과
```bash
# E2E 테스트 실행
npm run test:e2e -- tests/e2e/subscription-flow.spec.ts
```

**테스트 케이스** (`tests/e2e/subscription-flow.spec.ts`):
1. `should load subscription plans without extra renders`
2. `should create subscription with correct dependencies`
3. `should process payment without re-fetching`
4. `should cancel subscription with stable callback`

**기대 결과**:
- [ ] 4개 테스트 모두 통과
- [ ] 렌더링 횟수 최소화

---

## Sprint 4: xlsx 차트 삽입

### 완료 조건
- [ ] XLSX.Chart 타입 정의
- [ ] addChart 메서드 구현
- [ ] 4가지 차트 타입 동작
- [ ] E2E 테스트 3개 통과

### 검증 방법

#### 1. 타입 정의
```typescript
// src/lib/types/skills.types.ts
export interface XLSXChartOptions {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  dataRange: string;
  position: { col: number; row: number };
  size: { width: number; height: number };
}
```

**기대 결과**:
- [ ] 타입 정의 완료
- [ ] JSDoc 주석 포함

---

#### 2. addChart 메서드 구현
```typescript
// src/lib/xlsx/xlsxHelper.ts
class XLSXHelper {
  addChart(worksheet: XLSX.WorkSheet, options: XLSXChartOptions): void {
    // 차트 삽입 로직
  }
}
```

**기대 결과**:
- [ ] 4가지 차트 타입 지원
- [ ] 데이터 범위 검증
- [ ] 위치/크기 설정

---

#### 3. E2E 테스트 통과
```bash
# E2E 테스트 실행
npm run test:e2e -- tests/e2e/xlsx-chart.spec.ts
```

**테스트 케이스** (`tests/e2e/xlsx-chart.spec.ts`):
1. `should insert line chart in market analysis`
2. `should insert bar chart in project report`
3. `should insert pie chart in operations report`

**기대 결과**:
- [ ] 3개 테스트 모두 통과
- [ ] 생성된 Excel 파일에 차트 포함

---

## Sprint 5: RAG 하이브리드 검색

### 완료 조건
- [ ] search_rag_hybrid() SQL 함수 구현
- [ ] useRAGHybridSearch 훅 작성
- [ ] 정확도 50% → 75% 개선
- [ ] E2E 테스트 3개 통과

### 검증 방법

#### 1. SQL 함수 구현
```bash
# 마이그레이션 실행
supabase db push
```

**SQL 함수**:
```sql
CREATE OR REPLACE FUNCTION search_rag_hybrid(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  fts_weight FLOAT DEFAULT 0.3,
  vector_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  fts_score FLOAT,
  combined_score FLOAT
);
```

**기대 결과**:
- [ ] 함수 생성 성공
- [ ] 가중치 조정 가능
- [ ] 성능 200ms 이내

---

#### 2. React 훅 작성
```typescript
// src/hooks/useRAGHybridSearch.ts
export function useRAGHybridSearch(options?: {
  ftsWeight?: number;
  vectorWeight?: number;
  matchThreshold?: number;
}) {
  // 하이브리드 검색 로직
}
```

**기대 결과**:
- [ ] 검색 함수 제공
- [ ] 로딩 상태 관리
- [ ] 에러 처리

---

#### 3. E2E 테스트 통과
```bash
# E2E 테스트 실행
npm run test:e2e -- tests/e2e/rag-hybrid-search.spec.ts
```

**테스트 케이스** (`tests/e2e/rag-hybrid-search.spec.ts`):
1. `should return more accurate results than vector-only search`
2. `should adjust weights dynamically`
3. `should handle Korean text properly`

**기대 결과**:
- [ ] 3개 테스트 모두 통과
- [ ] 정확도 75% 이상

---

## 전체 완료 조건

### 코드 품질
```bash
# 린트 검사
npm run lint
# 기대: 0 errors, 0 warnings

# 타입 검사
npx tsc --noEmit
# 기대: 0 errors

# any 타입 검색
grep -r ": any" src/ | wc -l
# 기대: 0
```

---

### 빌드 성공
```bash
# 프로덕션 빌드
npm run build

# 기대 출력:
✓ 600 modules transformed.
dist/index.html                   0.50 kB │ gzip:  0.32 kB
dist/assets/index-abc123.css     45.61 kB │ gzip: 10.23 kB
dist/assets/index-xyz789.js     338.24 kB │ gzip: 95.67 kB

✓ built in 30.25s
```

---

### E2E 테스트 통과
```bash
# 전체 E2E 테스트
npm run test:e2e

# 기대 출력:
Running 312 tests using 5 workers
  312 passed (5.2m)
```

---

### 문서 업데이트
- [ ] CLAUDE.md 업데이트 (v2.19.0 섹션 추가)
- [ ] project-todo.md 체크 (v2.19.0 항목)
- [ ] docs/project/changelog.md 업데이트
- [ ] docs/guides/xlsx-chart.md 작성
- [ ] docs/guides/rag-hybrid-search.md 작성

---

## 롤백 조건

다음 상황 발생 시 즉시 롤백:
1. **빌드 실패**: 프로덕션 빌드 에러
2. **Critical 기능 장애**: 인증, 결제 시스템 장애
3. **성능 저하**: 페이지 로드 시간 3초 초과
4. **보안 이슈**: RLS 우회, SQL Injection

---

## 참고 문서
- [requirements.md](./requirements.md)
- [implementation-strategy.md](../../plan/v2.19/implementation-strategy.md)
- [sprint-1.md](../../tasks/v2.19/sprint-1.md)
