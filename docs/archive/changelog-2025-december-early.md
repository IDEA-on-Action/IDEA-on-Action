# Changelog Archive - 2025년 12월 초

> IDEA on Action 프로젝트 변경 로그 (2025년 12월 1일 ~ 12월 9일)

이 문서는 v2.24.0 ~ v2.35.0 버전의 변경 사항을 포함합니다.

---

## [2.35.0] - 2025-12-09 (RAG 검색 고도화, Minu Sandbox)

### 🔍 RAG 검색

하이브리드 검색 및 고급 랭킹 알고리즘 구현.

#### 주요 기능

| 기능 | 파일 | 설명 |
|-----|------|------|
| 하이브리드 검색 | `hybrid-search.ts` | 키워드 + 시맨틱 검색 |
| 랭킹 알고리즘 | `ranking.ts` | TF-IDF, BM25, MMR |

### 🧪 Minu Sandbox

Sandbox 환경 구축 및 API 클라이언트.

#### 생성된 파일

- `sandbox-client.ts` - Sandbox API 클라이언트
- `useMinuSandbox.ts` - Sandbox 모드 관리 훅
- `minu-sandbox.ts` - Sandbox 환경 설정

### 📊 품질 지표

| 지표 | v2.34.0 | v2.35.0 | 변화 |
|------|---------|---------|------|
| 유닛 테스트 | 1746개 | 1880개 | +134개 |
| 번들 크기 | 1644 KB | 1636 KB | -0.5% |

---

## [2.34.1] - 2025-12-09 (토스페이먼츠 라이브 키 설정)

### 💳 결제 시스템

토스페이먼츠 카드심사 완료 후 라이브 키 설정.

#### 설정 완료 항목

| 환경 | 키 종류 | 상태 |
|-----|--------|------|
| `.env.local` | API 개별 연동 키 (Client/Secret) | ✅ |
| `.env.local` | 결제위젯 연동 키 (Client/Secret) | ✅ |
| `.env.local` | 보안 키 | ✅ |
| Supabase Secrets | `TOSS_SECRET_KEY` | ✅ |
| Vercel 환경변수 | `VITE_TOSS_*` | ✅ |

#### API 키 테스트
- API 개별 연동 키: ✅ 인증 성공
- 결제위젯 연동 키: ✅ 인증 성공

#### 사용 중인 연동 방식
- **API 개별 연동**: 일반결제, 정기결제(빌링키 발급)
- **결제위젯**: 향후 위젯 UI 사용 시 (예비)

---

## [2.30.0] - 2025-12-02 (기술 부채 해소 및 문서 동기화)

### 🔧 기술 부채 해소

TODO 주석 11개 구현 완료로 코드 품질 개선.

#### 구현된 TODO 항목
1. Minu Find: 발견 프로세스 초기 단계 컴포넌트 (플레이스홀더 제거)
2. Minu Frame: RFP 생성 프로세스 컴포넌트 (플레이스홀더 제거)
3. Minu Build: 프로젝트 진행 추적 컴포넌트 (플레이스홀더 제거)
4. Minu Keep: 운영/유지보수 대시보드 (플레이스홀더 제거)
5. Central Hub: 알림 구독 컴포넌트 구현
6. 기타 TODO 주석 6개 구현

#### 테스트 확장
- 신규 테스트 60개 추가
- Minu 서비스 테스트 커버리지 향상
- Central Hub 테스트 보강

### 📚 문서 동기화

프로젝트 문서 간 정보 일관성 확보.

#### 업데이트된 문서
- `docs/project/roadmap.md`: 테스트 수 업데이트 (Unit 1066 → 1126, 총 6466 → 6526)
- `project-todo.md`: v2.30.0 섹션 추가, 품질 지표 업데이트
- `docs/project/changelog.md`: v2.30.0 변경 사항 기록

### 📊 품질 지표

| 지표 | 이전 (v2.29.0) | 이후 (v2.30.0) | 변화 |
|------|---------------|---------------|------|
| 유닛 테스트 | 1066개 | 1126개 | +60개 |
| E2E 테스트 | 5400개 | 5400개 | 유지 |
| 총 테스트 | 6466개 | 6526개 | +60개 |
| TODO 주석 | 11개 | 0개 | -11개 |
| 린트 경고 | 0개 | 0개 | 유지 |
| 번들 크기 | ~1644 KiB | ~1644 KiB | 유지 |

### 🎯 완료 기준

- [x] TODO 주석 11개 구현
- [x] 테스트 +60개 추가
- [x] 문서 동기화 (roadmap, todo, changelog)
- [x] 린트 경고 0개 유지
- [x] 버전 정보 일관성 확보

---

## [2.29.0] - 2025-12-02 (Claude Skills Phase 3 완료 - pptx Skill)

### 🎨 pptx Skill 완성

5개 병렬 에이전트 작업으로 PowerPoint 생성 기능 완성.

#### 생성된 파일

**pptx 슬라이드 생성 함수 (5개)**:
- `src/lib/skills/pptx/titleSlide.ts`: 제목 슬라이드 생성 (128줄)
- `src/lib/skills/pptx/summarySlide.ts`: KPI 요약 슬라이드 생성 (271줄)
- `src/lib/skills/pptx/eventsSlide.ts`: 이벤트 현황 슬라이드 생성 (323줄)
- `src/lib/skills/pptx/issuesSlide.ts`: 이슈 현황 슬라이드 생성 (437줄)
- `src/lib/skills/pptx/index.ts`: 통합 export 및 프레젠테이션 생성 (143줄)

**Central Hub 통합**:
- `src/components/central-hub/ExportButton.tsx`: xlsx/pptx 드롭다운 메뉴 (239줄)

**번들 최적화**:
- `src/pages/admin/analytics/AnalyticsDataProvider.tsx`: 훅 분리로 청크 크기 감소 (59줄)

#### 기능
- 제목 슬라이드: 브랜드 로고, 날짜 범위, 보고서 제목
- 요약 슬라이드: 4개 KPI 카드 (총 이벤트, 이슈, 평균 응답시간, 가동률)
- 이벤트 슬라이드: 이벤트 통계 표 (최대 20개)
- 이슈 슬라이드: 이슈 현황 표 (최대 15개), 심각도별 색상 구분
- ExportButton: xlsx/pptx 선택 드롭다운, 로딩/에러 상태 처리

### 🧪 테스트 확장

#### 생성된 파일
- `tests/unit/hooks/useAlertSubscriptions.test.tsx`: 35개 테스트 케이스 (727줄)
  - 구독 목록 조회 (5개)
  - 구독 추가 (6개)
  - 구독 수정 (6개)
  - 구독 삭제 (6개)
  - 필터링 (5개)
  - 에러 처리 (4개)
  - 캐싱 (3개)
- `tests/unit/hooks/usePptxGenerate.test.tsx`: 19개 테스트 케이스 (767줄)
  - 동적 로딩 (3개)
  - 슬라이드 생성 (6개)
  - 진행률 추적 (3개)
  - 에러 처리 (4개)
  - 메모리 정리 (3개)

### ⚡ 번들 최적화

pages-admin-analytics 청크 크기 17% 감소.

#### 수정된 파일
- `vite.config.ts`: manualChunks 규칙 추가
- `src/pages/admin/Analytics.tsx`: AnalyticsDataProvider 분리

#### 효과
- pages-admin-analytics: 1,128KB → 935KB (-193KB, -17%)
- 초기 로딩 시간 단축

### 📊 품질 지표

| 지표 | 이전 (v2.28.0) | 이후 (v2.29.0) | 변화 |
|------|---------------|---------------|------|
| 유닛 테스트 | 1012개 | 1066개 | +54개 |
| E2E 테스트 | 195개 | 5400개 | +5205개 |
| 총 테스트 | 1207개 | 6466개 | +5259개 |
| pptx Skill | 60% | 95% | +35% |
| 번들 크기 | ~1545 KiB | ~1644 KiB | +99 KiB |
| analytics 청크 | 1,128KB | 935KB | -193KB (-17%) |
| 린트 에러 | 0개 | 0개 | 유지 |

### 🎯 완료 기준

- [x] pptx 슬라이드 생성 함수 5개 구현
- [x] Central Hub ExportButton 확장
- [x] 테스트 +54개 (useAlertSubscriptions 35개, usePptxGenerate 19개)
- [x] 번들 최적화 -17%
- [x] 린트 에러 0개

---

## [2.28.0] - 2025-12-02 (v2.28.0 병렬 작업 Phase 1+2 완료)

### 🎯 Central Hub 고도화

알림 구독 관리 UI 구현.

#### 생성된 파일
- `src/components/central-hub/AlertSubscriptionManager.tsx`: 알림 구독 관리 컴포넌트

#### 기능
- 구독 목록 표시 (Card 형태)
- 추가/수정/삭제 (Dialog + Form)
- 필터링 (전체/서비스/심각도/이벤트)
- 로딩/에러/빈 상태 처리

### 📊 pptx Skill 구현

Claude Skills Phase 3로 PowerPoint 생성 기능 추가.

#### 생성된 파일
- `src/hooks/usePptxGenerate.ts`: pptx 문서 생성 훅 (681줄)

#### 기능
- 6가지 슬라이드 타입 지원 (Title, Content, TwoColumn, Chart, Image, Quote)
- pptxgenjs 동적 로딩 (번들 최적화)
- 진행률 추적 (0-100%)
- 브랜드 컬러 적용

### 🧪 테스트 강화

#### 생성된 파일
- `tests/unit/skills/useClaudeSkill.test.tsx`: Claude Skill 훅 테스트 (20개)
- `tests/e2e/minu/sandbox.spec.ts`: Minu Sandbox E2E 테스트 (23개)

### ⚡ 번들 최적화

Giscus 댓글 컴포넌트 Lazy Load 적용.

#### 수정된 파일
- `src/components/community/GiscusComments.tsx`: 래퍼 컴포넌트로 변경
- `src/components/community/GiscusCommentsCore.tsx`: 실제 구현 분리
- `vite.config.ts`: `components-giscus` 번들 설정 추가

#### 효과
- 별도 번들 분리: 3.05 KB
- 초기 로딩 시간 단축

### 🔧 기술 부채 해소

린트 경고 22개 수정 (any 타입 → 명시적 타입).

#### 수정된 파일
- `tests/unit/hooks/useServiceEvents.test.tsx`
- `tests/unit/hooks/useServiceHealth.test.tsx`
- `tests/unit/hooks/useServiceIssues.test.tsx`

### 📊 품질 지표

| 지표 | 이전 | 이후 | 변화 |
|------|------|------|------|
| 유닛 테스트 | 992개 | 1012개 | +20개 |
| E2E 테스트 | 172개 | 195개 | +23개 |
| 린트 에러 | 0개 | 0개 | 유지 |
| 린트 경고 | 22개 | 0개 | -22개 |

---

## [2.27.0] - 2025-12-02 (Claude Skills Phase 2 + 기술 부채 해소)

### 📝 docx Skill 구현

Claude Skills Phase 2로 Word 문서 생성 기능 추가.

#### 생성된 파일
- `src/hooks/useDocxExport.ts`: docx 문서 생성 훅
- `src/types/docx.ts`: docx 관련 타입 정의
- `tests/unit/skills/useDocxExport.test.ts`: 8개 테스트 케이스

### 🧪 Central Hub 테스트 강화

Central Hub 훅 테스트 94개 추가.

#### 테스트 파일
- `tests/unit/hooks/useServiceEvents.test.tsx`: 서비스 이벤트 훅 테스트
- `tests/unit/hooks/useServiceIssues.test.tsx`: 서비스 이슈 훅 테스트
- `tests/unit/hooks/useServiceHealth.test.tsx`: 서비스 헬스 훅 테스트

### 🔧 기술 부채 해소

#### 수정된 항목
- TODO 주석 5개 제거 및 구현
- `any` 타입 1개 수정

### 📊 품질 지표

| 지표 | 이전 | 이후 | 변화 |
|------|------|------|------|
| 유닛 테스트 | 869개 | 971개 | +102개 |
| 린트 에러 | 0개 | 0개 | 유지 |
| 번들 크기 | 1545 KB | 1545 KB | 유지 |

---

## [2.26.0] - 2025-12-01 (xlsx Skill 고도화 + 테스트 확장)

### 📊 xlsx Skill 고도화

Claude Skills Phase 1 xlsx Skill 95% 완료.

#### 기능
- 차트 삽입 기능 구현
- 다중 시트 지원
- 스타일 적용 개선

### 🧪 테스트 확장

#### 추가된 테스트
- `tests/unit/skills/xlsx-chart-insert.test.ts`: 5개 테스트 케이스
- 결제/구독 훅 테스트 강화

### 📊 품질 지표

| 지표 | 값 |
|------|-----|
| xlsx Skill 완성도 | 95% |
| 린트 에러 | 0개 |

---

## [2.25.0] - 2025-12-01 (Central Hub Phase 2 + MCP 권한 시스템)

### 🔐 MCP 권한 시스템

MCPProtected HOC 및 권한 관리 인프라 구현.

#### 생성된 컴포넌트 (src/components/mcp/)
- `MCPProtected.tsx`: 서비스별 권한 보호 HOC
- `MCPLoading.tsx`: 권한 확인 중 로딩 UI
- `MCPFallback.tsx`: 권한 없음 시 Fallback UI (4가지 사유별)
- `MCPError.tsx`: 에러 UI

#### 생성된 훅/Context
- `useMCPPermission.ts`: 서비스별 권한 확인 훅
- `MCPPermissionContext.tsx`: 전역 권한 캐시 관리

### 📊 Central Hub 대시보드 고도화

#### 신규 차트 컴포넌트
- `UsageChart.tsx`: 서비스별 사용량 막대 차트
- `TrendChart.tsx`: 이벤트/이슈/응답시간 트렌드 라인 차트

#### 고급 필터 및 알림 센터
- `EnhancedFilter.tsx`: 멀티 서비스, 날짜 범위, 심각도, 상태 필터
- `AlertCenter.tsx`: 그룹화, 일괄 처리, 우선순위 표시

### 🔧 페이지 리팩토링

Minu 서비스 페이지에 MCP 권한 시스템 적용.

#### 수정된 페이지
- `MinuFindPage.tsx`: useMCPServicePermission 훅 적용
- `MinuFramePage.tsx`: useMCPServicePermission 훅 적용
- `MinuBuildPage.tsx`: useMCPServicePermission 훅 적용
- `MinuKeepPage.tsx`: useMCPServicePermission 훅 적용
- `CentralHubDashboard.tsx`: 관리자 권한 체크 강화

### 🐛 버그 수정

- `useRAGSearch.ts`: debounce 타이머 cleanup 추가 (테스트 환경 에러 수정)

### 📊 품질 지표

| 지표 | 값 |
|------|-----|
| 신규 컴포넌트 | 10개 |
| 수정된 파일 | 12개 |
| Central Hub 컴포넌트 | 14개 |
| 린트 에러 | 0개 |
| 번들 크기 | 1545 KB |

---

## [2.24.0] - 2025-12-01 (병렬 작업 완료 + 테스트 강화)

### 🧪 테스트 강화

대규모 테스트 추가 및 RLS 정책 수정.

#### 주요 작업
- **인증/결제 훅 테스트**: 158개 테스트 케이스 추가
- **결제/구독 훅 테스트**: 49개 테스트 케이스 추가
- **유닛 테스트 수정**: 42개 실패 테스트 수정 및 린트 경고 해결

### 📦 번들 최적화

- **pptxgenjs 의존성 제거**: 미사용 기능 정리 (~100KB 절감)
- **번들 크기 개선**: -41% 최적화

### 🔧 Minu 연동 Phase 2 완료

API 인프라 전체 구현 완료.

#### 생성된 Edge Functions
- `session-api`: 세션 관리 API
- `permission-api`: 권한 관리 API (RBAC)
- `team-api`: 팀 관리 API
- `api-v1-health`: Health API 확장 (detailed, metrics, ready, live)

#### 생성된 공유 모듈
- `rate-limit.ts`: Rate Limiting
- `audit-log.ts`, `audit-events.ts`: Audit Log

### 🎯 Central Hub 알림 시스템

AdminHub 대시보드 확장 및 Claude Skills 기반 구현.

### 📊 품질 지표

| 지표 | 값 |
|------|-----|
| Unit Tests | 808개 통과 (+73개) |
| 번들 크기 | 1544 KB (-41%) |
| 린트 에러 | 0개 |

---

## Related Documents

- [현재 Changelog](../project/changelog.md) - 최신 변경 사항
- [2025년 11월 아카이브](./changelog-2025-november.md) - v2.0.0 ~ v2.23.0
