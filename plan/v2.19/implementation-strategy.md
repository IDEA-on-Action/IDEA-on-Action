# v2.19.0 구현 전략

**작성일**: 2025-11-26
**버전**: 2.19.0
**상태**: 📝 Draft

---

## 개요

v2.19.0은 **Quick Wins + 품질 안정화 + 기능 확장** 전략으로 진행합니다.

### 핵심 전략
1. **병렬 작업 최대화**: 독립적인 Sprint는 병렬 실행
2. **검증 주도 개발**: 각 Sprint 완료 시 lint + build + test
3. **점진적 배포**: Sprint 단위로 배포 및 롤백 가능
4. **문서 우선**: SDD 문서 작성 → 구현 → 검증

---

## 아키텍처 설계

### 시스템 구조

```
┌─────────────────────────────────────────────────────────┐
│                        App.tsx                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          MCPPermissionProvider                    │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │           Routes (기존)                     │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │       AIChatWidget (신규)                   │  │  │
│  │  │  - 플로팅 버튼                              │  │  │
│  │  │  - 채팅 창                                  │  │  │
│  │  │  - 페이지 컨텍스트 감지                     │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

### 컴포넌트 분리 전략 (Fast Refresh)

#### 원칙
React Fast Refresh는 **하나의 파일에서 React 컴포넌트만 export**하도록 요구합니다.

#### Before (경고 발생)
```typescript
// MCPPermissionContext.tsx
export const MCPPermissionProvider = () => { /* ... */ };
export const useMCPPermission = () => { /* ... */ };  // ❌ 훅 export
```

#### After (경고 해결)
```typescript
// MCPPermissionContext.tsx (컴포넌트만)
export const MCPPermissionProvider = () => { /* ... */ };

// useMCPPermission.ts (훅 분리)
export const useMCPPermission = () => { /* ... */ };  // ✅
```

#### 적용 파일
1. **MCPPermissionContext.tsx**
   - `useMCPPermission` → `useMCPPermission.ts`

2. **MCPProtected.tsx**
   - `withMCPProtection` → `withMCPProtection.tsx`

3. **toggle.tsx**
   - `toggleVariants` → `toggle.variants.ts`

4. **Announcer.tsx**
   - `useAnnouncer` → `useAnnouncer.ts`
   - `ARIA_LIVE_TIMEOUT` → `announcer.constants.ts`

---

### Edge Functions 타입화 전략

#### 타입 정의 위치
```
supabase/functions/
  _shared/
    toss-payments.types.ts  # 토스페이먼츠 타입 (신규)
    types.ts                # 공통 타입 (기존)
  process-subscription-payments/
    index.ts                # 타입 적용
  create-payment-intent/
    index.ts                # 타입 적용
  weekly-recap/
    index.ts                # 타입 적용
```

#### 타입 계층 구조
```typescript
// toss-payments.types.ts
export type TossPaymentMethod = 'CARD' | 'VIRTUAL_ACCOUNT' | ...;
export type TossPaymentStatus = 'READY' | 'DONE' | ...;

export interface TossPaymentRequest {
  orderId: string;
  amount: number;
  // ...
}

export interface TossPaymentResponse extends TossPaymentRequest {
  paymentKey: string;
  status: TossPaymentStatus;
  // ...
}

export interface TossWebhookPayload {
  eventType: string;
  data: TossPaymentResponse;
  // ...
}
```

---

### React Hooks 의존성 해결 전략

#### 전략 1: 누락된 의존성 추가
```typescript
// Before
const createSubscription = useCallback(async (planId: string) => {
  await supabase.from('subscriptions').insert({ plan_id: planId, user_id });
}, []);  // ❌ user_id 누락

// After
const createSubscription = useCallback(async (planId: string) => {
  await supabase.from('subscriptions').insert({ plan_id: planId, user_id });
}, [user_id]);  // ✅
```

#### 전략 2: 안전한 무시 (eslint-disable)
```typescript
// Supabase client는 재생성되지 않으므로 안전
const supabase = createClient();
useEffect(() => {
  supabase.from('users').select();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);  // supabase 제외
```

#### 전략 3: useRef로 최신 값 참조
```typescript
// Before
const handleClick = useCallback(() => {
  console.log(count);  // ❌ count 의존성 필요
}, []);

// After
const countRef = useRef(count);
useEffect(() => { countRef.current = count; }, [count]);

const handleClick = useCallback(() => {
  console.log(countRef.current);  // ✅
}, []);
```

---

## 구현 순서

### Phase 1: Sprint 1 (AI 위젯 + Fast Refresh) - 4시간
**목표**: SDD 문서 작성, AI 위젯 통합, Fast Refresh 경고 해결

#### TASK-001: SDD 문서 작성 (1시간)
- spec/v2.19/requirements.md
- spec/v2.19/acceptance-criteria.md
- plan/v2.19/implementation-strategy.md
- tasks/v2.19/sprint-1.md
- tasks/v2.19/sprint-2.md

#### TASK-002~008: Fast Refresh 해결 (2시간)
- **병렬 작업 가능** (5개 파일 독립적)
- TASK-002: MCPPermissionContext
- TASK-003: MCPProtected
- TASK-004: toggle
- TASK-005: Announcer (훅)
- TASK-006: Announcer (상수)

#### TASK-009: AI 위젯 통합 (30분)
- App.tsx에 AIChatWidget 추가

#### TASK-010: E2E 테스트 (30분)
- ai-chat-widget.spec.ts 작성

---

### Phase 2: Sprint 2 (Edge Functions 타입화) - 3시간
**목표**: any 타입 제거, 타입 안전성 확보

#### TASK-011: 타입 정의 작성 (1시간)
- toss-payments.types.ts (30+ 타입)

#### TASK-012~014: 타입 적용 (1.5시간)
- **병렬 작업 가능** (3개 함수 독립적)
- TASK-012: process-subscription-payments
- TASK-013: create-payment-intent
- TASK-014: weekly-recap

#### TASK-015: E2E 테스트 (30분)
- toss-payments.spec.ts 작성

---

### Phase 3: Sprint 3 (React Hooks 의존성) - 2시간
**목표**: exhaustive-deps 경고 해결

#### TASK-016~019: 의존성 수정 (1.5시간)
- **순차 작업 필요** (상호 의존 가능성)
- TASK-016: useSubscriptions.ts
- TASK-017: useSubscriptionPlans.ts
- TASK-018: usePayments.ts
- TASK-019: useTossPayments.ts

#### TASK-020: E2E 테스트 (30분)
- subscription-flow.spec.ts 작성

---

### Phase 4: Sprint 4 (xlsx 차트) - 3시간
**목표**: xlsx 차트 삽입 기능 구현

#### TASK-021: 타입 정의 (30분)
- XLSXChartOptions 인터페이스

#### TASK-022: addChart 메서드 (1.5시간)
- xlsxHelper.ts 확장
- 4가지 차트 타입 구현

#### TASK-023~025: 통합 (1시간)
- **병렬 작업 가능** (3개 스킬 독립적)
- TASK-023: marketAnalysis.ts
- TASK-024: projectReport.ts
- TASK-025: operationsReport.ts

#### TASK-026: E2E 테스트 (30분)
- xlsx-chart.spec.ts 작성

---

### Phase 5: Sprint 5 (RAG 하이브리드) - 4시간
**목표**: 키워드 + 벡터 하이브리드 검색

#### TASK-027: SQL 함수 (1.5시간)
- search_rag_hybrid() 구현
- 성능 최적화 (인덱스)

#### TASK-028: React 훅 (1시간)
- useRAGHybridSearch.ts 작성

#### TASK-029: UI 통합 (1시간)
- RAGSearchResults 컴포넌트 수정
- 가중치 조정 UI

#### TASK-030: E2E 테스트 (30분)
- rag-hybrid-search.spec.ts 작성

---

## 기술 스택

### 기존 스택
- **React**: 18.x
- **TypeScript**: 5.x
- **Vite**: 5.4.19
- **Supabase**: 2.x
- **xlsx**: SheetJS v0.20.x
- **pgvector**: PostgreSQL 14+

### 신규 도입
- **없음** (기존 스택 활용)

---

## 데이터베이스 설계

### 기존 테이블 활용
- `rag_documents` (v2.18.0)
- `rag_embeddings` (v2.18.0)

### 신규 함수
```sql
-- RAG 하이브리드 검색 함수
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
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    1 - (e.embedding <=> query_embedding) AS similarity,
    ts_rank(to_tsvector('simple', e.content), plainto_tsquery('simple', query_text)) AS fts_score,
    (
      ts_rank(to_tsvector('simple', e.content), plainto_tsquery('simple', query_text)) * fts_weight +
      (1 - (e.embedding <=> query_embedding)) * vector_weight
    ) AS combined_score
  FROM rag_embeddings e
  WHERE
    1 - (e.embedding <=> query_embedding) > match_threshold
    OR to_tsvector('simple', e.content) @@ plainto_tsquery('simple', query_text)
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;
```

---

## 보안 고려사항

### Edge Functions
1. **JWT 검증**: 모든 함수에서 인증 확인
2. **Rate Limiting**: 결제 API 호출 제한
3. **입력 검증**: Zod 스키마 검증
4. **SQL Injection 방지**: Parameterized Queries

### RAG 검색
1. **RLS 정책**: project_id 기반 접근 제어
2. **입력 필터링**: XSS 방지
3. **결과 제한**: 최대 5개 결과

---

## 성능 최적화

### 번들 크기
- **목표**: gzip 기준 500 kB 이내
- **전략**: Code Splitting, Tree Shaking

### 검색 성능
- **목표**: 200ms 이내
- **전략**:
  - pgvector 인덱스 (IVFFlat)
  - FTS 인덱스 (GIN)
  - 결과 캐싱 (React Query)

### 빌드 시간
- **목표**: 30초 이내
- **전략**:
  - Vite incremental build
  - esbuild minification

---

## 테스트 전략

### E2E 테스트 (Playwright)
- **총 20개 신규 작성**
- **실행 환경**: Chromium
- **병렬 실행**: 5 workers

### 테스트 커버리지 목표
- **Sprint 1**: 5개 (AI 위젯, Fast Refresh)
- **Sprint 2**: 5개 (Edge Functions 타입)
- **Sprint 3**: 4개 (React Hooks 의존성)
- **Sprint 4**: 3개 (xlsx 차트)
- **Sprint 5**: 3개 (RAG 하이브리드)

---

## 배포 전략

### 단계별 배포
1. **Sprint 1 배포** (AI 위젯 + Fast Refresh)
2. **Sprint 2 배포** (Edge Functions 타입화)
3. **Sprint 3 배포** (React Hooks 의존성)
4. **Sprint 4 배포** (xlsx 차트)
5. **Sprint 5 배포** (RAG 하이브리드)

### 배포 검증
```bash
# 1. 린트 + 타입 검사
npm run lint && npx tsc --noEmit

# 2. 프로덕션 빌드
npm run build

# 3. E2E 테스트
npm run test:e2e

# 4. Vercel 배포
vercel --prod

# 5. Supabase 함수 배포
supabase functions deploy
```

### 롤백 계획
- **조건**: 빌드 실패, Critical 기능 장애, 성능 저하, 보안 이슈
- **방법**: Git revert → Vercel 이전 배포 롤백

---

## 리스크 관리

### 기술적 리스크

#### R-001: Fast Refresh 경고 재발
**확률**: Medium
**영향**: Low
**대응**:
- 린트 규칙 추가 (no-exports-in-component-files)
- PR 리뷰 시 Fast Refresh 경고 확인

#### R-002: Edge Functions 타입 불일치
**확률**: Medium
**영향**: High
**대응**:
- 토스페이먼츠 API 문서 최신화
- E2E 테스트로 검증

#### R-003: xlsx 차트 브라우저 호환성
**확률**: Low
**영향**: Medium
**대응**:
- SheetJS 공식 문서 확인
- Chromium, Firefox, Safari 테스트

#### R-004: RAG 검색 성능 저하
**확률**: Medium
**영향**: Medium
**대응**:
- pgvector 인덱스 최적화
- 결과 캐싱 (React Query)
- 검색 디바운싱 (300ms)

---

## 일정 계획

### 전체 일정
- **시작일**: 2025-11-26
- **종료일**: 2025-11-27
- **총 기간**: 2일

### Phase별 일정
| Phase | Sprint | 시간 | 병렬 가능 |
|-------|--------|------|-----------|
| 1 | Sprint 1 | 4h | 부분 (5개 태스크) |
| 2 | Sprint 2 | 3h | 부분 (3개 태스크) |
| 3 | Sprint 3 | 2h | 불가 (순차) |
| 4 | Sprint 4 | 3h | 부분 (3개 태스크) |
| 5 | Sprint 5 | 4h | 불가 (순차) |

**총 예상 시간**: 16시간 (병렬 작업 시 ~10시간)

---

## 병렬 작업 전략

### 병렬 에이전트 할당

#### Sprint 1 (5개 에이전트)
1. 에이전트 A: TASK-002 (MCPPermissionContext)
2. 에이전트 B: TASK-003 (MCPProtected)
3. 에이전트 C: TASK-004 (toggle)
4. 에이전트 D: TASK-005 (Announcer 훅)
5. 에이전트 E: TASK-006 (Announcer 상수)

#### Sprint 2 (3개 에이전트)
1. 에이전트 A: TASK-012 (process-subscription-payments)
2. 에이전트 B: TASK-013 (create-payment-intent)
3. 에이전트 C: TASK-014 (weekly-recap)

#### Sprint 4 (3개 에이전트)
1. 에이전트 A: TASK-023 (marketAnalysis)
2. 에이전트 B: TASK-024 (projectReport)
3. 에이전트 C: TASK-025 (operationsReport)

---

## 문서 업데이트 계획

### 필수 문서
1. **CLAUDE.md**
   - v2.19.0 섹션 추가
   - 최신 업데이트 기록

2. **project-todo.md**
   - v2.19.0 항목 체크

3. **docs/project/changelog.md**
   - 변경 로그 기록

### 신규 가이드 문서
1. **docs/guides/xlsx-chart.md**
   - xlsx 차트 삽입 가이드

2. **docs/guides/rag-hybrid-search.md**
   - RAG 하이브리드 검색 가이드

---

## 성공 지표

### 정량적 지표
- **린트 경고**: 36개 → 0개 (-100%)
- **TypeScript any**: 11개 → 0개 (-100%)
- **Fast Refresh 경고**: 5개 → 0개 (-100%)
- **exhaustive-deps 경고**: 10개 → 0개 (-100%)
- **E2E 테스트**: 292개 → 312개 (+20개)
- **빌드 시간**: ~30초 유지
- **번들 크기**: 500 kB gzip 이내

### 정성적 지표
- **개발 경험**: Fast Refresh 안정화, 자동완성 개선
- **사용자 경험**: AI 위젯 전역 접근성
- **코드 품질**: 타입 안전성, 린트 규칙 준수

---

## 참고 문서
- [requirements.md](../../spec/v2.19/requirements.md)
- [acceptance-criteria.md](../../spec/v2.19/acceptance-criteria.md)
- [sprint-1.md](../../tasks/v2.19/sprint-1.md)
- [sprint-2.md](../../tasks/v2.19/sprint-2.md)
- [CLAUDE.md](../../CLAUDE.md)
