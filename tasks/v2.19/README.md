# v2.19.0 Tasks Overview

**버전**: 2.19.0
**테마**: Quick Wins + 품질 안정화 + 기능 확장
**작성일**: 2025-11-26
**예상 기간**: 2일 (2025-11-26 ~ 2025-11-27)

---

## 전체 구조

```
v2.19.0/
├── spec/
│   ├── requirements.md           (요구사항 명세서)
│   └── acceptance-criteria.md    (인수 조건)
├── plan/
│   └── implementation-strategy.md (구현 전략)
└── tasks/
    ├── README.md                  (이 파일)
    ├── sprint-1.md                (AI 위젯 + Fast Refresh)
    ├── sprint-2.md                (Edge Functions 타입화)
    ├── sprint-3.md                (React Hooks 의존성)
    ├── sprint-4.md                (xlsx 차트 삽입)
    └── sprint-5.md                (RAG 하이브리드 검색)
```

---

## Sprint 개요

| Sprint | 주제 | 예상 시간 | 병렬 작업 | 태스크 수 |
|--------|------|-----------|-----------|-----------|
| Sprint 1 | AI 위젯 + Fast Refresh | 4h | 5개 | 10개 |
| Sprint 2 | Edge Functions 타입화 | 3h | 3개 | 5개 |
| Sprint 3 | React Hooks 의존성 | 2h | 순차 | 5개 |
| Sprint 4 | xlsx 차트 삽입 | 3h | 3개 | 6개 |
| Sprint 5 | RAG 하이브리드 검색 | 4h | 순차 | 4개 |
| **총합** | | **16h** | | **30개** |

---

## Sprint 1: AI 위젯 + Fast Refresh (4시간)

### 목표
- SDD 문서 작성
- AI 채팅 위젯 App.tsx 통합
- Fast Refresh 경고 5개 해결

### 태스크
- [TASK-001](./sprint-1.md#task-001-sdd-문서-작성): SDD 문서 작성 (1h)
- [TASK-002](./sprint-1.md#task-002-mcppermissioncontext-훅-분리): MCPPermissionContext 훅 분리 (20m)
- [TASK-003](./sprint-1.md#task-003-mcpprotected-hoc-분리): MCPProtected HOC 분리 (20m)
- [TASK-004](./sprint-1.md#task-004-toggle-variants-분리): toggle variants 분리 (15m)
- [TASK-005](./sprint-1.md#task-005-announcer-훅-분리): Announcer 훅 분리 (20m)
- [TASK-006](./sprint-1.md#task-006-announcer-상수-분리): Announcer 상수 분리 (10m)
- [TASK-007](./sprint-1.md#task-007-apptsx-ai-위젯-통합): App.tsx AI 위젯 통합 (30m)
- [TASK-008](./sprint-1.md#task-008-e2e-테스트-작성): E2E 테스트 작성 (30m)

### 병렬 작업
TASK-002~006은 병렬 실행 가능 (5개 에이전트)

### 완료 조건
- Fast Refresh 경고 5개 → 0개
- E2E 테스트 5개 통과
- AI 위젯 전역 배포

---

## Sprint 2: Edge Functions 타입화 (3시간)

### 목표
- toss-payments.types.ts 작성 (30+ 타입)
- any 타입 9개 제거
- Edge Functions 배포 성공

### 태스크
- [TASK-010](./sprint-2.md#task-010-toss-paymentstypests-작성): toss-payments.types.ts 작성 (1h)
- [TASK-011](./sprint-2.md#task-011-process-subscription-payments-타입-적용): process-subscription-payments 타입 적용 (30m)
- [TASK-012](./sprint-2.md#task-012-create-payment-intent-타입-적용): create-payment-intent 타입 적용 (30m)
- [TASK-013](./sprint-2.md#task-013-weekly-recap-타입-적용): weekly-recap 타입 적용 (30m)
- [TASK-014](./sprint-2.md#task-014-e2e-테스트-작성): E2E 테스트 작성 (30m)

### 병렬 작업
TASK-011~013은 병렬 실행 가능 (3개 에이전트)

### 완료 조건
- any 타입 11개 → 2개 (-9개)
- E2E 테스트 5개 통과
- Edge Functions 배포 성공

---

## Sprint 3: React Hooks 의존성 (2시간)

### 목표
- exhaustive-deps 경고 10개 해결
- 기능 동작 변화 없음
- 구독/결제 시스템 정상 동작

### 태스크
- [TASK-015](./sprint-3.md#task-015-usesubscriptions-의존성-수정): useSubscriptions 의존성 수정 (30m)
- [TASK-016](./sprint-3.md#task-016-usesubscriptionplans-의존성-수정): useSubscriptionPlans 의존성 수정 (20m)
- [TASK-017](./sprint-3.md#task-017-usepayments-의존성-수정): usePayments 의존성 수정 (30m)
- [TASK-018](./sprint-3.md#task-018-usetosspayments-의존성-수정): useTossPayments 의존성 수정 (20m)
- [TASK-019](./sprint-3.md#task-019-e2e-테스트-작성): E2E 테스트 작성 (30m)

### 병렬 작업
순차 실행 필요 (상호 의존 가능성)

### 완료 조건
- exhaustive-deps 경고 10개 → 0개
- E2E 테스트 4개 통과
- ESLint 경고 31개 → 21개 (-10개)

---

## Sprint 4: xlsx 차트 삽입 (3시간)

### 목표
- xlsx 차트 API 구현 (addChart 메서드)
- 4가지 차트 타입 지원 (line, bar, pie, area)
- Minu 3개 스킬 통합

### 태스크
- [TASK-020](./sprint-4.md#task-020-xlsxchartoptions-타입-정의): XLSXChartOptions 타입 정의 (30m)
- [TASK-021](./sprint-4.md#task-021-xlsxhelperaddchart-메서드-구현): xlsxHelper.addChart 메서드 구현 (1.5h)
- [TASK-022](./sprint-4.md#task-022-marketanalysis-차트-통합): marketAnalysis 차트 통합 (20m)
- [TASK-023](./sprint-4.md#task-023-projectreport-차트-통합): projectReport 차트 통합 (20m)
- [TASK-024](./sprint-4.md#task-024-operationsreport-차트-통합): operationsReport 차트 통합 (20m)
- [TASK-025](./sprint-4.md#task-025-e2e-테스트-작성): E2E 테스트 작성 (30m)

### 병렬 작업
TASK-022~024는 병렬 실행 가능 (3개 에이전트)

### 완료 조건
- 4가지 차트 타입 동작
- E2E 테스트 3개 통과
- docs/guides/xlsx-chart.md 작성

---

## Sprint 5: RAG 하이브리드 검색 (4시간)

### 목표
- FTS + 벡터 하이브리드 검색 구현
- 정확도 50% → 75% 개선
- 가중치 조정 UI

### 태스크
- [TASK-026](./sprint-5.md#task-026-search_rag_hybrid-sql-함수-구현): search_rag_hybrid SQL 함수 구현 (1.5h)
- [TASK-027](./sprint-5.md#task-027-useraghybridsearch-훅-구현): useRAGHybridSearch 훅 구현 (1h)
- [TASK-028](./sprint-5.md#task-028-ragsearchresults-ui-통합): RAGSearchResults UI 통합 (1h)
- [TASK-029](./sprint-5.md#task-029-e2e-테스트-작성): E2E 테스트 작성 (30m)

### 병렬 작업
순차 실행 필요 (의존성 체인)

### 완료 조건
- 하이브리드 검색 함수 동작
- E2E 테스트 3개 통과
- docs/guides/rag-hybrid-search.md 작성

---

## 전체 성공 지표

### 정량적 지표
| 지표 | Before | After | 개선률 |
|------|--------|-------|--------|
| 린트 경고 | 36개 | 0개 | -100% |
| TypeScript any | 11개 | 0개 | -100% |
| Fast Refresh 경고 | 5개 | 0개 | -100% |
| exhaustive-deps 경고 | 10개 | 0개 | -100% |
| E2E 테스트 | 292개 | 312개 | +6.8% |

### 정성적 지표
- **개발 경험**: Fast Refresh 안정화, 자동완성 개선
- **사용자 경험**: AI 위젯 전역 접근성
- **코드 품질**: 타입 안전성, 린트 규칙 준수
- **검색 정확도**: RAG 하이브리드 검색 75% 이상

---

## 실행 순서

### 1단계: 문서 검토
```bash
# SDD 문서 읽기
cat spec/v2.19/requirements.md
cat spec/v2.19/acceptance-criteria.md
cat plan/v2.19/implementation-strategy.md
```

### 2단계: Sprint 1 실행
```bash
# 태스크 확인
cat tasks/v2.19/sprint-1.md

# 병렬 작업 (5개 에이전트)
# TASK-002~006 동시 진행

# 순차 작업
# TASK-007, TASK-008
```

### 3단계: Sprint 2 실행
```bash
# 태스크 확인
cat tasks/v2.19/sprint-2.md

# 병렬 작업 (3개 에이전트)
# TASK-011~013 동시 진행
```

### 4단계: Sprint 3 실행
```bash
# 태스크 확인
cat tasks/v2.19/sprint-3.md

# 순차 작업
# TASK-015~019 순서대로 진행
```

### 5단계: Sprint 4 실행
```bash
# 태스크 확인
cat tasks/v2.19/sprint-4.md

# 병렬 작업 (3개 에이전트)
# TASK-022~024 동시 진행
```

### 6단계: Sprint 5 실행
```bash
# 태스크 확인
cat tasks/v2.19/sprint-5.md

# 순차 작업
# TASK-026~029 순서대로 진행
```

---

## 검증 체크리스트

### 각 Sprint 완료 시
- [ ] 린트 검사 통과 (`npm run lint`)
- [ ] TypeScript 검사 통과 (`npx tsc --noEmit`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] E2E 테스트 통과 (`npm run test:e2e`)

### 전체 완료 시
- [ ] 모든 Sprint 완료 (1~5)
- [ ] 전체 테스트 통과 (312개)
- [ ] 성공 지표 달성 (정량적, 정성적)
- [ ] CLAUDE.md 업데이트
- [ ] project-todo.md 체크
- [ ] docs/project/changelog.md 업데이트

---

## 배포 체크리스트

### Vercel 배포
```bash
# 빌드 확인
npm run build

# Vercel 배포
vercel --prod
```

### Supabase 배포
```bash
# Edge Functions 배포
supabase functions deploy process-subscription-payments
supabase functions deploy create-payment-intent
supabase functions deploy weekly-recap

# DB 마이그레이션
supabase db push
```

### 프로덕션 검증
- [ ] 홈페이지 로드
- [ ] AI 위젯 동작
- [ ] 구독/결제 기능
- [ ] RAG 검색 기능
- [ ] xlsx 다운로드

---

## 롤백 계획

### 조건
- 빌드 실패
- Critical 기능 장애
- 성능 저하 (페이지 로드 3초 초과)
- 보안 이슈

### 방법
```bash
# Git revert
git revert <commit-hash>

# Vercel 롤백
vercel rollback

# Supabase Functions 재배포
supabase functions deploy <function-name> --legacy
```

---

## 참고 문서

### SDD 문서
- [요구사항 명세서](../../spec/v2.19/requirements.md)
- [인수 조건](../../spec/v2.19/acceptance-criteria.md)
- [구현 전략](../../plan/v2.19/implementation-strategy.md)

### Sprint 문서
- [Sprint 1: AI 위젯 + Fast Refresh](./sprint-1.md)
- [Sprint 2: Edge Functions 타입화](./sprint-2.md)
- [Sprint 3: React Hooks 의존성](./sprint-3.md)
- [Sprint 4: xlsx 차트 삽입](./sprint-4.md)
- [Sprint 5: RAG 하이브리드 검색](./sprint-5.md)

### 프로젝트 문서
- [CLAUDE.md](../../CLAUDE.md)
- [project-todo.md](../../project-todo.md)
- [docs/project/changelog.md](../../docs/project/changelog.md)

---

**작성**: AI 에이전트
**최종 수정**: 2025-11-26
