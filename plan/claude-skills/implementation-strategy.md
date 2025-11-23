# Claude Skills 구현 전략

> Claude Skills 통합을 위한 단계별 구현 계획 및 전략

**작성일**: 2025-11-23
**버전**: 1.0.0
**상태**: Draft
**관련 명세**: [spec/claude-skills/requirements.md](../../spec/claude-skills/requirements.md)
**관련 설계**: [architecture.md](architecture.md)

---

## 1. 구현 단계 개요

```
Phase 0          Phase 1           Phase 2          Phase 3          Phase 4          Phase 5
(선행 조건)       (xlsx)           (frontend)        (docx)          (MCP)           (고도화)
    │               │                 │                │               │               │
    │   Central     │   Excel         │  Dashboard     │   Word        │  Orchestrator │  AI 통합
    │   Hub P2      │   Export        │  Components    │   생성        │   구현        │  확장
    │               │                 │                │               │               │
    ▼               ▼                 ▼                ▼               ▼               ▼
[Week 0]        [Week 1]          [Week 2]         [Week 3]        [Week 4]        [향후]
```

---

## 2. Phase 0: 선행 조건 (Central Hub Phase 2)

### 목표
Central Hub Phase 2 완료 후 Skills 구현 시작

### 필요 작업 (tasks/central-hub/sprint-2.md 참조)

| 순서 | 작업 | 예상 시간 | 상태 |
|------|------|----------|------|
| 1 | MCPProtected HOC 생성 | 2시간 | ⏳ 대기 |
| 2 | useMCPPermission 훅 생성 | 1시간 | ⏳ 대기 |
| 3 | MCPPermissionContext 생성 | 30분 | ⏳ 대기 |
| 4 | MinuFramePage 권한 적용 | 1시간 | ⏳ 대기 |
| 5 | MinuBuildPage 권한 적용 | 1시간 | ⏳ 대기 |
| 6 | MinuKeepPage 권한 적용 | 1시간 | ⏳ 대기 |
| 7 | E2E 테스트 작성 | 2시간 | ⏳ 대기 |

**총 예상 소요**: 8시간 (1일)

### 완료 조건

- [ ] MCPProtected HOC가 4개 서비스 페이지에 적용됨
- [ ] useMCPPermission 훅이 권한 캐싱을 지원함
- [ ] E2E 테스트 13개 이상 통과

---

## 3. Phase 1: xlsx Skill 통합 (Sprint 1)

### 목표
Excel 내보내기 기본 기능 구현

### 구현 순서

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 1 | xlsx 패키지 설치 및 설정 | 30분 | - |
| 2 | TypeScript 타입 정의 | 1시간 | 1 |
| 3 | useXlsxExport 훅 구현 | 2시간 | 2 |
| 4 | ExportButton 컴포넌트 구현 | 1시간 | 3 |
| 5 | 이벤트 로그 시트 생성 | 1시간 | 3 |
| 6 | 이슈 현황 시트 생성 | 1시간 | 3 |
| 7 | KPI 요약 시트 생성 | 1시간 | 5, 6 |
| 8 | E2E 테스트 작성 | 1시간 | 4-7 |

**총 예상 소요**: 8시간 (1일)

### 예상 산출물

```
src/
├── skills/
│   └── xlsx/
│       ├── index.ts              # 모듈 진입점
│       ├── useXlsxExport.ts      # React 훅
│       ├── generators/
│       │   ├── eventsSheet.ts    # 이벤트 시트 생성
│       │   ├── issuesSheet.ts    # 이슈 시트 생성
│       │   └── kpiSheet.ts       # KPI 시트 생성
│       └── utils/
│           ├── formatters.ts     # 데이터 포맷터
│           └── styles.ts         # 셀 스타일
├── components/
│   └── skills/
│       └── ExportButton.tsx      # 내보내기 버튼
└── types/
    └── skills.types.ts           # 타입 정의

tests/e2e/skills/
└── xlsx-export.spec.ts           # E2E 테스트
```

### 성공 기준

- [ ] 1,000행 데이터 3초 이내 Excel 생성
- [ ] 생성된 파일이 Excel에서 정상 열림
- [ ] 날짜 필터 적용 시 해당 기간만 포함
- [ ] 비인증 사용자는 내보내기 불가

---

## 4. Phase 2: frontend-design Skill + 대시보드 (Sprint 2)

### 목표
Central Hub 대시보드 UI 컴포넌트 구현

### 구현 순서

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 1 | ServiceHealthCard 컴포넌트 | 2시간 | Phase 0 |
| 2 | EventTimeline 컴포넌트 | 2시간 | Phase 0 |
| 3 | IssueList 컴포넌트 | 2시간 | Phase 0 |
| 4 | StatisticsChart 컴포넌트 | 2시간 | 1-3 |
| 5 | 대시보드 페이지 통합 | 2시간 | 1-4 |
| 6 | Realtime 연동 | 1시간 | 5 |
| 7 | 반응형 레이아웃 | 1시간 | 5 |
| 8 | E2E 테스트 작성 | 2시간 | 5-7 |

**총 예상 소요**: 14시간 (2일)

### 예상 산출물

```
src/
├── components/
│   └── dashboard/
│       ├── ServiceHealthCard.tsx   # 서비스 상태 카드
│       ├── EventTimeline.tsx       # 이벤트 타임라인
│       ├── IssueList.tsx           # 이슈 목록
│       ├── StatisticsChart.tsx     # 통계 차트
│       └── index.ts                # 모듈 진입점
└── pages/
    └── admin/
        └── CentralHubDashboard.tsx # 대시보드 페이지

tests/e2e/dashboard/
└── central-hub-dashboard.spec.ts   # E2E 테스트
```

### 성공 기준

- [ ] 4개 서비스 헬스 상태 실시간 표시
- [ ] 이벤트 변경 시 100ms 이내 UI 업데이트
- [ ] 모바일/태블릿/데스크톱 반응형 지원
- [ ] Lighthouse 성능 점수 90+ 유지

---

## 5. Phase 3: docx Skill 통합 (Sprint 3)

### 목표
Word 문서 생성 기능 및 RFP 템플릿 구현

### 구현 순서

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 1 | docx 패키지 설치 및 설정 | 30분 | - |
| 2 | TypeScript 타입 확장 | 1시간 | 1 |
| 3 | TemplateEngine 구현 | 2시간 | 2 |
| 4 | useDocxGenerate 훅 구현 | 2시간 | 3 |
| 5 | RFP 템플릿 3종 구현 | 3시간 | 3 |
| 6 | 보고서 템플릿 2종 구현 | 2시간 | 3 |
| 7 | RFPWizard 컴포넌트 구현 | 3시간 | 4-5 |
| 8 | DB 템플릿 테이블 생성 | 1시간 | 5-6 |
| 9 | E2E 테스트 작성 | 2시간 | 7-8 |

**총 예상 소요**: 16시간 (2일)

### 예상 산출물

```
src/
├── skills/
│   └── docx/
│       ├── index.ts              # 모듈 진입점
│       ├── useDocxGenerate.ts    # React 훅
│       ├── TemplateEngine.ts     # 템플릿 엔진
│       ├── templates/
│       │   ├── rfp-government.ts # 정부 SI RFP
│       │   ├── rfp-startup.ts    # 스타트업 MVP RFP
│       │   ├── rfp-enterprise.ts # 엔터프라이즈 RFP
│       │   ├── weekly-report.ts  # 주간 보고서
│       │   └── monthly-report.ts # 월간 보고서
│       └── utils/
│           ├── variables.ts      # 변수 치환
│           └── builders.ts       # 섹션 빌더
├── components/
│   └── skills/
│       └── RFPWizard/
│           ├── index.tsx         # 마법사 메인
│           ├── Step1Overview.tsx # 1단계: 개요
│           ├── Step2Requirements.tsx # 2단계: 요구사항
│           ├── Step3Evaluation.tsx # 3단계: 평가 기준
│           └── Step4Review.tsx   # 4단계: 검토
└── types/
    └── docx.types.ts             # docx 전용 타입

supabase/migrations/
└── 20251124xxxxxx_create_document_templates.sql

tests/e2e/skills/
└── docx-generate.spec.ts         # E2E 테스트
```

### 성공 기준

- [ ] 10페이지 문서 2초 이내 생성
- [ ] 변수 치환 100% 정확도
- [ ] RFP 템플릿 3종 모두 정상 생성
- [ ] RFPWizard 4단계 완료 후 docx 다운로드

---

## 6. Phase 4: MCP Orchestrator (Sprint 4)

### 목표
서비스 간 인증 및 데이터 동기화 구현

### 구현 순서

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 1 | service_tokens 테이블 생성 | 30분 | - |
| 2 | JWT 토큰 발급 함수 구현 | 2시간 | 1 |
| 3 | 토큰 검증 미들웨어 구현 | 2시간 | 2 |
| 4 | 토큰 갱신 로직 구현 | 1시간 | 2-3 |
| 5 | 이벤트 라우터 구현 | 2시간 | 3 |
| 6 | 재시도 및 DLQ 구현 | 2시간 | 5 |
| 7 | 상태 동기화 서비스 구현 | 2시간 | 3-5 |
| 8 | 캐시 관리 로직 구현 | 1시간 | 7 |
| 9 | E2E 테스트 작성 | 2시간 | 4-8 |

**총 예상 소요**: 14시간 (2일)

### 예상 산출물

```
supabase/
├── migrations/
│   └── 20251125xxxxxx_create_service_tokens.sql
└── functions/
    ├── mcp-auth/
    │   └── index.ts              # 토큰 발급/검증
    ├── mcp-router/
    │   └── index.ts              # 이벤트 라우팅
    └── mcp-sync/
        └── index.ts              # 상태 동기화

src/
├── lib/
│   └── mcp/
│       ├── index.ts              # MCP 클라이언트
│       ├── auth.ts               # 인증 유틸
│       ├── router.ts             # 라우터 유틸
│       └── sync.ts               # 동기화 유틸
└── hooks/
    └── useMCPOrchestrator.ts     # 오케스트레이터 훅

tests/e2e/mcp/
└── orchestrator.spec.ts          # E2E 테스트
```

### 성공 기준

- [ ] JWT 토큰 발급/검증 정상 작동
- [ ] 웹훅 이벤트 100ms 이내 라우팅
- [ ] 실패 시 최대 3회 재시도
- [ ] 캐시 TTL 5분, 변경 시 즉시 무효화

---

## 7. 기술 결정 사항

### 7.1 클라이언트 vs 서버 문서 생성

| 기준 | 클라이언트 생성 | 서버 생성 |
|------|----------------|----------|
| **1,000행 이하** | ✅ 권장 | - |
| **1,000행 초과** | - | ✅ 권장 |
| **차트 포함** | 제한적 | ✅ 권장 |
| **보안 데이터** | - | ✅ 권장 |

**결정**: 기본적으로 클라이언트 생성, 대용량/보안 데이터는 서버 생성

### 7.2 템플릿 저장 방식

| 방식 | 장점 | 단점 |
|------|------|------|
| **DB 저장** | 동적 수정 가능, 버전 관리 | 초기 로딩 지연 |
| **파일 시스템** | 빠른 로딩, 버전 관리 쉬움 | 런타임 수정 불가 |
| **하이브리드** | 유연성 + 성능 | 복잡성 증가 |

**결정**: 하이브리드 - 기본 템플릿은 파일, 사용자 정의는 DB

### 7.3 캐싱 전략

| 데이터 | TTL | 무효화 |
|--------|-----|--------|
| 템플릿 목록 | 10분 | 템플릿 수정 시 |
| 생성 문서 목록 | 5분 | 새 문서 생성 시 |
| 서비스 토큰 | 1시간 | 만료 시 |
| 권한 정보 | 5분 | 권한 변경 시 |

---

## 8. 리스크 및 대응

### 8.1 기술적 리스크

| 리스크 | 영향 | 확률 | 대응 |
|--------|------|------|------|
| 대용량 Excel 메모리 부족 | 높음 | 중간 | 스트리밍 생성, 서버 오프로드 |
| docx 복잡한 레이아웃 한계 | 중간 | 높음 | 단순 템플릿 유지, 대안 라이브러리 검토 |
| Edge Function 타임아웃 | 중간 | 낮음 | 비동기 처리 + 폴링 |
| 번들 크기 증가 | 낮음 | 높음 | 코드 스플리팅, 동적 로딩 |

### 8.2 비즈니스 리스크

| 리스크 | 영향 | 확률 | 대응 |
|--------|------|------|------|
| Central Hub P2 지연 | 높음 | 중간 | 병렬 작업 가능한 부분 선진행 |
| 템플릿 요구사항 변경 | 중간 | 높음 | 유연한 템플릿 구조 설계 |
| 외부 서비스 연동 지연 | 낮음 | 중간 | Mock 데이터로 개발 진행 |

---

## 9. 테스트 전략

### 9.1 단위 테스트

| 대상 | 커버리지 목표 | 도구 |
|------|--------------|------|
| Skills 유틸 함수 | 80% | Vitest |
| 훅 로직 | 70% | @testing-library/react-hooks |
| 컴포넌트 로직 | 60% | @testing-library/react |

### 9.2 통합 테스트

| 대상 | 시나리오 수 | 도구 |
|------|------------|------|
| Excel 생성 → 다운로드 | 5개 | Vitest |
| Word 생성 → 다운로드 | 5개 | Vitest |
| MCP 토큰 발급 → 검증 | 5개 | Vitest |

### 9.3 E2E 테스트

| 대상 | 시나리오 수 | 도구 |
|------|------------|------|
| Excel 내보내기 플로우 | 5개 | Playwright |
| RFP 생성 마법사 | 10개 | Playwright |
| 대시보드 Realtime | 5개 | Playwright |
| 권한 기반 접근 제어 | 10개 | Playwright |

---

## 10. 배포 전략

### 10.1 Phase별 배포

| Phase | 환경 | 승인 | 롤백 계획 |
|-------|------|------|----------|
| Phase 1 | Preview → Production | 자동 → 수동 | 이전 배포 즉시 롤백 |
| Phase 2 | Preview → Production | 자동 → 수동 | 이전 배포 즉시 롤백 |
| Phase 3 | Preview → Production | 자동 → 수동 | 이전 배포 즉시 롤백 |
| Phase 4 | Preview → Staging → Production | 자동 → 수동 → 수동 | DB 마이그레이션 롤백 스크립트 |

### 10.2 Feature Flag

```typescript
// 환경 변수 기반 Feature Flag
const FEATURE_FLAGS = {
  ENABLE_XLSX_SKILL: import.meta.env.VITE_ENABLE_XLSX_SKILL === 'true',
  ENABLE_DOCX_SKILL: import.meta.env.VITE_ENABLE_DOCX_SKILL === 'true',
  ENABLE_MCP_ORCHESTRATOR: import.meta.env.VITE_ENABLE_MCP_ORCHESTRATOR === 'true',
};
```

### 10.3 모니터링

| 지표 | 임계값 | 알림 채널 |
|------|--------|----------|
| 에러율 | 1% 초과 | Sentry → Slack |
| p95 응답 시간 | 500ms 초과 | Vercel Analytics |
| 문서 생성 실패 | 5회/시간 초과 | Supabase Logs |

---

## 11. 일정 요약

| Phase | 작업 | 소요 시간 | 누적 |
|-------|------|----------|------|
| Phase 0 | Central Hub P2 | 8시간 | 8시간 |
| Phase 1 | xlsx Skill | 8시간 | 16시간 |
| Phase 2 | 대시보드 | 14시간 | 30시간 |
| Phase 3 | docx Skill | 16시간 | 46시간 |
| Phase 4 | MCP Orchestrator | 14시간 | 60시간 |

**총 예상 소요**: 60시간 (7-8일)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |
