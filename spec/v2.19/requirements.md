# v2.19.0 요구사항 명세서

**작성일**: 2025-11-26
**버전**: 2.19.0
**상태**: 📝 Draft

---

## 목표

v2.19.0은 **Quick Wins + 품질 안정화 + 기능 확장**에 초점을 맞춥니다.

### 핵심 목표
1. **기술 부채 해소**: Fast Refresh 경고, TypeScript any, React Hooks 의존성
2. **사용자 경험 개선**: AI 채팅 위젯 전역 배포
3. **기능 확장**: xlsx 차트, RAG 하이브리드 검색
4. **품질 안정화**: 린트 경고 0개, E2E 테스트 커버리지 확대

---

## 사용자 스토리

### US-001: 개발자로서 전역 AI 어시스턴트를 사용하고 싶다
**As a** 개발자
**I want** 모든 페이지에서 AI 채팅 위젯에 접근
**So that** 페이지 컨텍스트에 맞는 AI 도움을 즉시 받을 수 있다

**인수 조건**:
- [ ] App.tsx에 AIChatWidget 컴포넌트 추가
- [ ] 모든 페이지에서 플로팅 버튼 표시
- [ ] 페이지별 컨텍스트 자동 감지

### US-002: 개발자로서 Fast Refresh 경고 없이 개발하고 싶다
**As a** 개발자
**I want** Fast Refresh 경고 해결
**So that** HMR이 안정적으로 동작한다

**인수 조건**:
- [ ] MCPPermissionContext.tsx 훅 분리
- [ ] MCPProtected.tsx HOC 분리
- [ ] toggle.tsx variants 분리
- [ ] Announcer.tsx 상수 분리
- [ ] Fast Refresh 경고 0개

### US-003: 개발자로서 타입 안전한 Edge Functions를 유지하고 싶다
**As a** 개발자
**I want** Edge Functions에서 any 타입 제거
**So that** 런타임 에러를 방지하고 자동완성을 활용한다

**인수 조건**:
- [ ] toss-payments.types.ts 작성
- [ ] process-subscription-payments 타입 적용
- [ ] create-payment-intent 타입 적용
- [ ] weekly-recap 타입 적용
- [ ] any 타입 0개

### US-004: 개발자로서 React Hooks 의존성 경고를 해결하고 싶다
**As a** 개발자
**I want** exhaustive-deps 경고 해결
**So that** 의도치 않은 재렌더링과 메모리 누수를 방지한다

**인수 조건**:
- [ ] useSubscriptions.ts 의존성 배열 수정
- [ ] useSubscriptionPlans.ts 의존성 배열 수정
- [ ] usePayments.ts 의존성 배열 수정
- [ ] useTossPayments.ts 의존성 배열 수정
- [ ] exhaustive-deps 경고 0개

### US-005: 비즈니스 사용자로서 Excel에 차트를 삽입하고 싶다
**As a** 비즈니스 사용자
**I want** xlsx 생성 시 차트 삽입 기능
**So that** 데이터를 시각적으로 표현할 수 있다

**인수 조건**:
- [ ] XLSX.Chart 타입 정의
- [ ] addChart 메서드 구현
- [ ] 4가지 차트 타입 지원 (line, bar, pie, area)
- [ ] E2E 테스트 통과

### US-006: AI 사용자로서 하이브리드 검색을 활용하고 싶다
**As a** AI 사용자
**I want** 키워드 + 벡터 하이브리드 검색
**So that** 정확도 높은 RAG 결과를 얻을 수 있다

**인수 조건**:
- [ ] search_rag_hybrid() SQL 함수 구현
- [ ] useRAGHybridSearch 훅 작성
- [ ] 정확도 50% → 75% 개선
- [ ] E2E 테스트 통과

---

## 기능 요구사항

### FR-001: AI 채팅 위젯 전역 배포
**우선순위**: P0 (Critical)
**담당**: Sprint 1

#### 설명
App.tsx에 AIChatWidget을 통합하여 모든 페이지에서 AI 어시스턴트에 접근할 수 있도록 한다.

#### 세부 요구사항
1. **컴포넌트 통합**
   - App.tsx에 `<AIChatWidget />` 추가
   - `MCPPermissionProvider`로 감싸기
   - 인증된 사용자만 접근 가능

2. **페이지 컨텍스트**
   - `usePageContext()` 훅으로 현재 페이지 감지
   - 페이지별 맞춤 프롬프트 제공
   - 서비스별 도구 자동 활성화

3. **UI/UX**
   - 플로팅 버튼 (우하단 고정)
   - 모달 오버레이 (ESC 키로 닫기)
   - 반응형 디자인 (모바일/데스크톱)

#### 인수 조건
- [ ] 모든 페이지에서 플로팅 버튼 표시
- [ ] 클릭 시 채팅 창 오픈
- [ ] 페이지 컨텍스트 자동 감지
- [ ] E2E 테스트 통과

---

### FR-002: Fast Refresh 경고 해결
**우선순위**: P0 (Critical)
**담당**: Sprint 1

#### 설명
Fast Refresh는 컴포넌트 파일에서 React 컴포넌트만 export하도록 요구한다. 5개 파일에서 훅/HOC/상수를 별도 파일로 분리한다.

#### 대상 파일
1. **MCPPermissionContext.tsx**
   - 문제: `useMCPPermission` 훅 export
   - 해결: `useMCPPermission.ts` 별도 파일 생성

2. **MCPProtected.tsx**
   - 문제: `withMCPProtection` HOC export
   - 해결: `withMCPProtection.tsx` 별도 파일 생성

3. **toggle.tsx**
   - 문제: `toggleVariants` 상수 export
   - 해결: `toggle.variants.ts` 별도 파일 생성

4. **Announcer.tsx**
   - 문제: `useAnnouncer`, `ARIA_LIVE_TIMEOUT` export
   - 해결: `useAnnouncer.ts`, `announcer.constants.ts` 별도 파일 생성

#### 인수 조건
- [ ] Fast Refresh 경고 5개 → 0개
- [ ] 기존 import 경로 호환성 유지
- [ ] 빌드 성공
- [ ] E2E 테스트 통과

---

### FR-003: Edge Functions 타입화
**우선순위**: P0 (Critical)
**담당**: Sprint 2

#### 설명
결제 관련 Edge Functions에서 any 타입을 제거하고 타입 안전성을 확보한다.

#### 대상 파일
1. **toss-payments.types.ts** (신규)
   - TossPaymentMethod
   - TossPaymentStatus
   - TossPaymentRequest
   - TossPaymentResponse
   - TossWebhookPayload

2. **process-subscription-payments.ts**
   - any 타입 9개 제거
   - toss-payments.types.ts import

3. **create-payment-intent.ts**
   - any 타입 제거
   - toss-payments.types.ts import

4. **weekly-recap.ts**
   - any 타입 제거
   - 적절한 타입 정의

#### 인수 조건
- [ ] any 타입 9개 → 0개
- [ ] 타입 정의 30+ 개
- [ ] 빌드 성공
- [ ] E2E 테스트 통과

---

### FR-004: React Hooks 의존성 해결
**우선순위**: P1 (High)
**담당**: Sprint 3

#### 설명
React Hooks ESLint 규칙 `exhaustive-deps`를 준수하여 의존성 배열을 수정한다.

#### 대상 파일
1. **useSubscriptions.ts** (경고 3개)
2. **useSubscriptionPlans.ts** (경고 2개)
3. **usePayments.ts** (경고 3개)
4. **useTossPayments.ts** (경고 2개)

#### 해결 전략
1. **누락된 의존성 추가**
   - useCallback, useMemo 의존성 배열에 추가
   - 불필요한 재생성 방지 (React.memo, useCallback)

2. **안전한 무시 (eslint-disable-next-line)**
   - Supabase client 등 안정적인 참조
   - 주석으로 이유 명시

3. **의존성 재구조화**
   - 필요시 useRef로 최신 값 참조
   - useEffect 분리

#### 인수 조건
- [ ] exhaustive-deps 경고 10개 → 0개
- [ ] 기능 동작 변화 없음
- [ ] E2E 테스트 통과

---

### FR-005: xlsx 차트 삽입 (BL-006)
**우선순위**: P1 (High)
**담당**: Sprint 4

#### 설명
xlsx 생성 시 차트를 삽입하여 데이터 시각화를 지원한다.

#### 기능 명세
1. **차트 타입**
   - Line Chart (꺾은선)
   - Bar Chart (막대)
   - Pie Chart (원형)
   - Area Chart (영역)

2. **API 설계**
```typescript
interface ChartOptions {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  dataRange: string;  // 예: 'A1:B10'
  position: { col: number; row: number };
  size: { width: number; height: number };
}

xlsxHelper.addChart(worksheet, options);
```

3. **통합 지점**
   - `src/lib/xlsx/xlsxHelper.ts`
   - `src/lib/claude/skills/marketAnalysis.ts`
   - `src/lib/claude/skills/projectReport.ts`

#### 인수 조건
- [ ] 4가지 차트 타입 동작
- [ ] E2E 테스트 통과
- [ ] 문서 업데이트

---

### FR-006: RAG 하이브리드 검색
**우선순위**: P2 (Medium)
**담당**: Sprint 5

#### 설명
키워드 검색(FTS)과 벡터 검색을 결합하여 RAG 정확도를 개선한다.

#### 기능 명세
1. **SQL 함수**: `search_rag_hybrid()`
```sql
CREATE OR REPLACE FUNCTION search_rag_hybrid(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  fts_weight FLOAT DEFAULT 0.3,
  vector_weight FLOAT DEFAULT 0.7
)
```

2. **점수 결합**
   - FTS 점수 (ts_rank) × fts_weight
   - 벡터 점수 (1 - cosine_distance) × vector_weight
   - 최종 점수 = FTS 점수 + 벡터 점수

3. **React 훅**: `useRAGHybridSearch`
```typescript
const { results, search, isLoading } = useRAGHybridSearch({
  ftsWeight: 0.3,
  vectorWeight: 0.7,
  matchThreshold: 0.7,
});
```

#### 인수 조건
- [ ] 정확도 50% → 75% 개선
- [ ] 검색 속도 200ms 이하
- [ ] E2E 테스트 통과
- [ ] 문서 업데이트

---

## 비기능 요구사항

### NFR-001: 코드 품질
- **린트 경고**: 0개 (현재 36개)
- **TypeScript any**: 0개 (현재 11개)
- **Fast Refresh 경고**: 0개 (현재 5개)
- **exhaustive-deps 경고**: 0개 (현재 10개)

### NFR-002: 빌드 성능
- **빌드 시간**: 30초 이내
- **번들 크기**: gzip 기준 500 kB 이내
- **PWA precache**: 3 MB 이내

### NFR-003: 테스트 커버리지
- **E2E 테스트**: 20개 신규 작성
- **총 테스트**: 312개 (현재 292개)
- **통과율**: 100%

### NFR-004: 문서화
- **SDD 문서**: 5개 (spec 2개, plan 1개, tasks 2개)
- **가이드 문서**: 2개 (xlsx-chart, rag-hybrid)
- **CLAUDE.md**: 업데이트

---

## 제약사항

### 기술적 제약
1. **React 18**: Server Components 미지원 (Vite 프로젝트)
2. **Supabase Edge Functions**: Deno 런타임 (Node.js 모듈 제한)
3. **xlsx 라이브러리**: SheetJS v0.20.x (차트 기능 제한적)
4. **pgvector**: PostgreSQL 14+ 필수

### 시간적 제약
- **개발 기간**: 2일 (2025-11-26 ~ 2025-11-27)
- **배포 기한**: 2025-11-27 23:59 KST

### 리소스 제약
- **병렬 에이전트**: 최대 5개
- **테스트 환경**: Playwright (Chromium)

---

## 성공 지표

### 정량적 지표
- **린트 경고**: 36개 → 0개 (-100%)
- **TypeScript any**: 11개 → 0개 (-100%)
- **Fast Refresh 경고**: 5개 → 0개 (-100%)
- **exhaustive-deps 경고**: 10개 → 0개 (-100%)
- **E2E 테스트**: 292개 → 312개 (+20개)

### 정성적 지표
- **개발 경험**: Fast Refresh 안정화, 자동완성 개선
- **사용자 경험**: AI 위젯 전역 접근성
- **코드 품질**: 타입 안전성, 린트 규칙 준수

---

## 참고 문서
- [BL-006: xlsx 차트 삽입](../../spec/backlog/BL-006-xlsx-chart-insertion.md)
- [CLAUDE.md](../../CLAUDE.md)
- [project-todo.md](../../project-todo.md)
