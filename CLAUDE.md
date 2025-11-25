# IDEA on Action 프로젝트 개발 문서

> Claude와의 개발 협업을 위한 프로젝트 핵심 문서

**마지막 업데이트**: 2025-11-25
**현재 버전**: 2.17.0 (AI 채팅 위젯 + Tool Use + 기술 부채 해소)
**상태**: ✅ Production Ready | 🔒 보안 점수 98/100 | 🎯 토스페이먼츠 심사 제출 완료
**개발 방법론**: SDD (Spec-Driven Development) + MCP (Model Context Protocol) Integration

---

## 📋 최신 업데이트

### 2025-11-25 (오늘)
- ✅ **v2.17.0: AI 채팅 위젯 + Tool Use + 기술 부채 해소**
  - **Sprint 1: AI 어시스턴트 채팅 위젯** (BL-AI-008)
    - 플로팅 채팅 위젯: `AIChatWidget`, `AIChatButton`, `AIChatWindow`
    - 메시지 컴포넌트: `AIChatMessages`, `AIChatMessage`, `AIChatInput`
    - 페이지 컨텍스트 훅: `usePageContext` (서비스별 맞춤 프롬프트)
    - 타입 정의: `ai-chat-widget.types.ts`
  - **Sprint 2: 기술 부채 해소**
    - TODO 주석 제거: PromptTemplateSelector, PromptTemplateShareModal, useRealtimeDashboard
    - any 타입 제거: useOrders, AdminTeam, AdminTags, AdminLab
    - 린트 경고: 40개 → 36개 (-10%)
  - **Sprint 3: AI Tool Use 기반 구축** (BL-AI-003)
    - ToolRegistry 클래스: `src/lib/claude/tools.ts`
    - 도구 4개: issues, events, health, projects
    - React 훅: `useClaudeTools`, `useClaudeToolList`, `useHasTool`
  - **SDD 문서**: 12개 신규 (3개 Sprint × spec/plan/tasks)
  - **빌드**: 32.74s 성공 (PWA precache 27 entries)
  - **병렬 에이전트**: 7개 동시 작업

- ✅ **v2.16.0: 프롬프트 템플릿 + 대화 컨텍스트 관리**
  - **Sprint 3: 프롬프트 템플릿 관리** (BL-AI-005)
    - DB 마이그레이션: `prompt_templates` 테이블
    - TypeScript 타입: `prompt-template.types.ts` (30+ 타입)
    - React 훅: `usePromptTemplates` (CRUD + 변수 치환)
    - UI 컴포넌트: `PromptTemplateSelector`, `PromptTemplateShareModal`
    - E2E 테스트: 6개 (`prompt-templates.spec.ts`)
  - **Sprint 4: 대화 컨텍스트 관리** (BL-AI-002)
    - DB 마이그레이션: `ai_conversations`, `ai_messages` 테이블
    - TypeScript 타입: `conversation.types.ts` (40+ 타입)
    - React 훅: `useConversationManager` (세션 CRUD, 요약, 포크, 내보내기)
    - UI 컴포넌트: `ConversationList`, `ConversationDetail`
    - E2E 테스트: 13개 (`conversation-context.spec.ts`)
  - **SDD 문서**: 8개 신규 (spec, plan, tasks)
  - **빌드**: 21.06s 성공 (PWA precache 27 entries)
  - **병렬 에이전트**: 7개 동시 작업 (Sprint 3: 3개, Sprint 4: 4개)

### 2025-11-24
- ✅ **Central Hub Phase 3 + Vision API 통합 (v2.15.0)**
  - **Central Hub 실시간 동기화**:
    - `useRealtimeServiceStatus` 훅 (Supabase Realtime 채널)
    - `useRealtimeEventStream` 훅 (이벤트/이슈 스트림)
    - 연결 상태 관리 (connecting/connected/disconnected/error)
    - 자동 재연결 로직 (최대 5회)
  - **Central Hub 대시보드 확장**:
    - `ServiceHealthCard` 컴포넌트 (상태별 색상, 메트릭)
    - `ServiceStatusDashboard` 컴포넌트 (2x2 그리드)
    - `RealtimeAlertPanel` 컴포넌트 (실시간 알림)
  - **Vision API 통합**:
    - Edge Function `claude-ai/vision-handler.ts`
    - `useClaudeVision` 훅 (스트리밍/비스트리밍)
    - `ImageAnalyzer` 컴포넌트 (드래그앤드롭)
    - 5개 분석 유형 (UI/다이어그램/스크린샷/와이어프레임/일반)
  - **SDD 문서**: 5개 신규 (Vision API spec/plan/tasks)
  - **E2E 테스트**: 8개 신규 (`vision-api.spec.ts`)
  - **빌드**: 36.94s 성공 (PWA precache 27 entries)
  - **병렬 에이전트**: 4개 동시 작업

- ✅ **AI 통합 완료 (v2.14.0)** - Claude API 연동
  - **Edge Function**: `claude-ai` (채팅/스트리밍, JWT 인증, Rate Limiting)
  - **DB 마이그레이션**: `claude_usage_logs`, `claude_rate_limits` 테이블
  - **React 훅 5개**: `useClaudeChat`, `useClaudeStreaming`, `useClaudeSkill`, `useRFPGenerator`, `useOpsReportWriter`
  - **AI 생성기 4개**: RFP, 요구사항 분석, 프로젝트 계획, 운영 보고서
  - **UI 컴포넌트 2개**: `AIAssistButton`, `AIUsageDashboard`
  - **docx/xlsx 연동**: AI 생성 결과를 문서로 변환 (`documentBridge.ts`)
  - **E2E 테스트**: 22개 신규 작성 (`claude-integration.spec.ts`, `claude-skills.spec.ts`)
  - **SDD 문서**: 7개 신규 (spec, plan, tasks)
  - **빌드**: 24.34s 성공 (PWA precache 27 entries)
  - **병렬 에이전트**: 4개 동시 작업 (2개 Sprint)

- ✅ **Claude Skills Sprint 5 완료** - 서비스별 특화 기능
  - **패키지**: `pptxgenjs` (v3.12.0) 설치, vite.config.ts 청크 최적화
  - **Minu Find**: 시장분석 Excel 생성기 (`marketAnalysis.ts`)
    - 경쟁사 비교 매트릭스, 트렌드 분석, 사업기회 스코어링 시트
  - **Minu Frame**: PowerPoint 생성 훅 (`usePptxGenerate.ts`)
    - 4종 슬라이드 템플릿 (Title, Content, TwoColumn, Chart)
    - 브랜드 스타일 적용 (IDEA on Action, 16:9)
  - **Minu Build**: 프로젝트 리포트 생성기 (`projectReport.ts`)
    - 스프린트 요약, 작업 목록, 번다운, 리소스 할당 시트
  - **Minu Keep**: 운영 보고서 템플릿 (`operationsReport.ts`)
    - SLA 지표, 장애 이력, 개선사항, 다음달 계획 섹션
  - **E2E 테스트**: 18개 신규 작성 (`minu-services.spec.ts`)
  - **빌드**: 40.56s 성공 (PWA precache 27 entries)
  - **병렬 에이전트**: 4개 동시 작업

### 2025-11-23
- ✅ **Claude Skills Sprint 4 완료** - MCP Orchestrator
  - **DB 마이그레이션**: `service_tokens`, `refresh_tokens`, `event_queue`, `dead_letter_queue` 테이블
  - **Edge Functions**: `mcp-auth` (토큰 발급/검증), `mcp-router` (이벤트 라우팅), `mcp-sync` (상태 동기화)
  - **React 훅**: `useMCPAuth`, `useMCPSync`, `useMCPClient`, `useMCPPermission`
  - **TypeScript 타입**: `mcp-auth.types.ts`, `mcp-sync.types.ts`
  - **E2E 테스트**: 14개 신규 작성 (`mcp-orchestrator.spec.ts`)
  - **SDD 문서**: 3개 신규 (스펙, 스키마, 함수 설계)
  - **병렬 에이전트**: 4개 동시 작업

- ✅ **Claude Skills Sprint 3 완료** - docx Skill + RFP 템플릿
  - **패키지**: `docx` (v9.5.1) 설치, vite.config.ts 청크 최적화
  - **타입**: `docx.types.ts` (29개 타입 정의)
  - **TemplateEngine**: 변수 치환, 섹션 빌더 (heading/paragraph/table/list)
  - **훅**: `useDocxGenerate` + 편의 훅 2개 (useGenerateRFP, useGenerateReport)
  - **RFP 템플릿 3종**: 정부 SI, 스타트업 MVP, 엔터프라이즈
  - **보고서 템플릿 2종**: 주간 보고서, 월간 보고서
  - **RFPWizard**: 4단계 마법사 컴포넌트 (개요/요구사항/평가기준/검토)
  - **DB 마이그레이션**: `document_templates` 테이블
  - **E2E 테스트**: 신규 작성 (`docx-rfp.spec.ts`)
  - **병렬 에이전트**: 4개 동시 작업

- ✅ **Claude Skills Sprint 2 완료** - Central Hub 대시보드 UI
  - **컴포넌트 4개**: `ServiceHealthCard`, `EventTimeline`, `IssueList`, `StatisticsChart`
  - **대시보드 페이지**: `CentralHubDashboard.tsx` (탭 UI: Overview/Events/Issues)
  - **라우트**: `/admin/central-hub` 추가
  - **반응형**: 모바일/태블릿/데스크톱 레이아웃
  - **Realtime**: Supabase Realtime 구독 (이미 구현됨)
  - **E2E 테스트**: 5개 신규 작성 (`central-hub-dashboard.spec.ts`)
  - **빌드**: ~30s 성공 (PWA precache 27 entries)
  - **병렬 에이전트**: 4개 동시 작업 (Phase 1)

- ✅ **Claude Skills Sprint 1 완료** - xlsx Skill 구현
  - **패키지**: `xlsx` (SheetJS) 설치, vite.config.ts 청크 최적화
  - **타입**: `skills.types.ts` (20+ 타입 정의)
  - **훅**: `useXlsxExport` (진행률, 에러 핸들링 포함)
  - **컴포넌트**: `ExportButton` (Excel 내보내기 버튼)
  - **시트 생성**: 이벤트/이슈/헬스/KPI 4개 시트
  - **E2E 테스트**: 5개 신규 작성 (`xlsx-export.spec.ts`)

- ✅ **Central Hub Phase 2 완료** - MCP 컴포넌트 인프라
  - **HOC**: `MCPProtected`, `withMCPProtection`
  - **훅**: `useMCPServicePermission` (권한 확인 + 캐싱)
  - **Context**: `MCPPermissionProvider` (전역 권한 캐시)
  - **UI**: `MCPLoading`, `MCPFallback` 컴포넌트
  - **E2E 테스트**: 40개 신규 작성 (`mcp-permission.spec.ts`)
  - **빌드**: 30.64s 성공 (PWA precache 27 entries)

- ✅ **Claude Skills SDD 문서 체계 완성** - 허브 + Minu 시리즈 Skills 통합 계획
  - **SDD 문서**: `spec/claude-skills/`, `plan/claude-skills/`, `tasks/claude-skills/`
  - **요구사항**: 8개 사용자 스토리, 12개 기능 요구사항, 50+ 인수 조건
  - **아키텍처**: Skills Integration Layer, MCP Orchestrator 설계
  - **기술 스택**: xlsx (SheetJS), docx, pptxgenjs
  - **구현 전략**: 5 Phase, 38개 TASK, 60시간 계획
  - **백로그**: 27개 항목 (P0~P3)

- ✅ **Central Hub 인프라 구축** - Minu 서비스 중심 시스템 Phase 1
  - **SDD 문서**: `spec/central-hub/`, `plan/central-hub/`, `tasks/central-hub/`
  - **DB 마이그레이션**: `service_events`, `service_issues`, `service_health` 테이블
  - **Edge Function**: `receive-service-event` (웹훅 수신 + HMAC 검증)
  - **React 훅**: `useServiceEvents`, `useServiceIssues`, `useServiceHealth`
  - **TypeScript 타입**: `central-hub.types.ts` (20+ 타입 정의)
  - **빌드**: 34.37s 성공 (PWA precache 27 entries)

- ✅ **StoriesHub 데이터 연동 완료** - 4개 섹션 모두 자동 업데이트
  - **블로그**: WordPress API 연동 (`useWordPressPosts`)
  - **뉴스레터**: Supabase `newsletter_archive` 연동 (`useNewsletterArchive`)
  - **변경사항**: Supabase `changelog_entries` 연동 (`useChangelog`)
  - **공지사항**: Supabase `notices` 연동 (기존 유지)
  - 더미 데이터 제거, 실시간 데이터 로딩 및 로딩 상태 표시

- ✅ **사이트 재구조화 Sprint 4 완료** - GitHub 연동 & 진척률 자동화
  - **TASK-026**: GitHub API 서비스 생성 (`src/lib/github-api.ts`)
  - **TASK-027**: useGitHubStats 훅 생성 (React Query 캐싱)
  - **TASK-028**: github_stats_cache 마이그레이션 (API Rate Limit 최적화)
  - **TASK-029**: ProjectCard GitHub 통계 연동 (Stars, Forks, Contributors)
  - **TASK-030**: 진척률 자동 계산 (마일스톤 기반 트리거)
  - **TASK-031**: Release 감지 Edge Function (`sync-github-releases`)
  - **TASK-032**: 관리자 알림 연동 (앱 내 + Slack)
  - **TASK-033**: E2E 테스트 15개 신규 작성
  - **패키지**: `@octokit/rest` 추가
  - **빌드**: 20.85s 성공 (PWA precache 27 entries)

- ✅ **사이트 재구조화 Sprint 2 + Sprint 3 병렬 완료** - 프로젝트/이야기/함께하기 페이지
  - **Sprint 2**: ProjectsHub 4개 탭 완성, ProjectCard 확장, 탭 컴포넌트 4개
  - **Sprint 3**: StoriesHub, ConnectHub 완성, Changelog/Newsletter 페이지
  - **DB 마이그레이션**: changelog_entries, newsletter_archive 테이블
  - **React 훅**: useChangelog, useNewsletterArchive 생성
  - **E2E 테스트**: 68개 신규 작성 (projects-hub, stories-hub, connect-hub)
  - **병렬 에이전트**: 5~6개 동시 진행, 74% 시간 절감

### 2025-11-22
- ✅ **Minu 브랜드 전환 완료** - COMPASS → Minu 시리즈 리브랜딩
  - Compass Navigator → **Minu Find** (사업기회 탐색)
  - Compass Cartographer → **Minu Frame** (문제정의 & RFP)
  - Compass Captain → **Minu Build** (프로젝트 진행)
  - Compass Harbor → **Minu Keep** (운영/유지보수)
- ✅ **MCP 서버 연동 완료** - Minu 4개 서비스 페이지 MCP 클라이언트 통합
- ✅ **프로덕션 DB 마이그레이션 완료** - services, subscription_plans, views 업데이트
- ✅ **Newsletter CSV Export 날짜 필터 완성** - DateRangePicker 컴포넌트, E2E 테스트 3개 추가
- ✅ **Function Search Path 보안 강화** - 67개 함수 SQL Injection 방어 (보안 점수 98/100)

### 2025-11-21
- ✅ **Services Platform Day 3 검증 완료** - 프로덕션 배포 검증 보고서 3개
- ✅ **CMS Phase 3 완료** - Admin 가이드 6개, API 문서 7개, 배포 체크리스트 (병렬 4개 에이전트)
- ✅ **Supabase Security Issues 수정** - Newsletter 시스템 보안 강화 (2개 Critical/High 이슈 해결)
- ✅ **CMS Phase 2 완료** - 4개 Admin 페이지 병렬 구현 (2시간, 병렬 7개 에이전트)

### 이전 업데이트
**전체 히스토리**: [docs/archive/CLAUDE-history-november-2025.md](docs/archive/CLAUDE-history-november-2025.md)

---

  - TypeScript any: 60+개 → 2개 (-97%)
  - Fast Refresh 경고: 7개 → 0개 (-100%)
  - vendor-react gzip: 389.88 kB → 45.61 kB (-88.3%)
  - Dependencies: 107개 → 94개 (-12%)
  - UI 컴포넌트: 48개 → 36개 (-25%)

- 2025-11-15: **⚡ 병렬 리팩토링 완료 (Phase 1-2)** 🎉
  - 4개 에이전트 동시 작업으로 ESLint critical error, Fast Refresh 경고, TypeScript any 타입 전면 개선
  - 린트 결과: 67개 → 2개 (97% 개선)
  - 빌드 성공: 16.63s (이전 32.26s 대비 48% 빨라짐)

- 2025-11-15: **📊 CMS Phase 2 완료** - TypeScript 타입 & React 훅 생성 ✅
  - TypeScript 타입 42개 (cms.types.ts, v2.ts)
  - React 훅 7개 (총 56개 함수)
  - 병렬 실행 (8개 에이전트, 2+2분 소요)

**히스토리 아카이브**: [docs/archive/CLAUDE-history-november-2025.md](docs/archive/CLAUDE-history-november-2025.md)

---

## 🎯 SDD (Spec-Driven Development) 방법론

### 개요
IDEA on Action 프로젝트는 **명세 주도 개발(Spec-Driven Development)**을 적용하여, 코드보다 의도를 먼저 정의하고 AI와 협업하는 체계적인 개발 프로세스를 따릅니다.

### SDD란?
코드 작성 전에 **명세서(Specification)**를 먼저 작성하는 개발 방법론으로, 명세서가 개발자와 AI의 **단일 진실 소스(Single Source of Truth)** 역할을 수행합니다.

```
전통적 접근: 코드 중심 → 문서는 사후 보강
SDD 접근: 명세 중심 → 코드는 명세의 구현체
```

### SDD의 핵심 원칙

#### 1. 명세가 원본(Source)이다
- 코드는 명세의 **표현물(Artifact)**
- 명세와 구현의 간극을 최소화
- 변경 시 명세를 먼저 업데이트

#### 2. 의도와 구현의 분리
- **"무엇을(What)"**: 변하지 않는 의도와 목표
- **"어떻게(How)"**: 유연한 구현 방식
- 스펙 변경 → 플랜 재생성 → 코드 리빌드

#### 3. 검증 중심 개발
- 각 단계마다 검증 후 다음 단계로
- 작은 변경 단위로 리뷰 및 테스트
- 테스트 가능한 작업 단위로 분해

#### 4. 컨텍스트 보존
- 의사결정의 맥락과 이유를 문서화
- AI와의 대화 컨텍스트를 명세로 결정화
- 휘발성 정보를 영구 문서로 변환

---

## 🔄 SDD 4단계 프로세스

### Stage 1: Specify (명세 작성) - "무엇을/왜"

**목적**: 프로젝트의 의도, 목표, 요구사항을 명확히 정의

**산출물**: `/spec/` 디렉토리
- `requirements.md` - 사용자 요구사항, 사용자 여정
- `acceptance-criteria.md` - 성공 기준, 검증 방법
- `constraints.md` - 비기능 요구사항, 제약사항

**작성 원칙**:
- ✅ 사용자 관점에서 작성
- ✅ 기능보다 가치에 집중
- ✅ 구체적인 예시 포함
- ❌ 기술 스택 언급 금지
- ❌ 구현 방법 언급 금지

### Stage 2: Plan (계획 수립) - "어떻게(제약 포함)"

**목적**: 기술적 접근 방법과 아키텍처 결정

**산출물**: `/plan/` 디렉토리
- `architecture.md` - 시스템 구조, 컴포넌트 설계
- `tech-stack.md` - 기술 스택, 라이브러리 선택 이유
- `implementation-strategy.md` - 구현 순서, 우선순위

**작성 원칙**:
- ✅ 기술적 제약사항 명시
- ✅ 아키텍처 결정 이유 기록
- ✅ 보안, 성능, 확장성 고려
- ✅ 기존 시스템과의 통합 방안
- ✅ 레거시 코드 패턴 준수

### Stage 3: Tasks (작업 분해) - "쪼갠 일감"

**목적**: 구현 가능한 작은 단위로 분해

**산출물**: `/tasks/` 디렉토리
- `sprint-N.md` - 스프린트별 작업 목록
- `backlog.md` - 백로그 작업 목록

**작업 크기 기준**:
- ⏱️ **1~3시간 단위** 권장
- ✅ 독립적으로 구현 가능
- ✅ 독립적으로 테스트 가능
- ✅ 명확한 완료 기준 존재

### Stage 4: Implement (구현) - "코드 작성"

**목적**: 작업 단위로 코드 작성 및 검증

**프로세스**:
1. **태스크 선택**: `/tasks/` 에서 하나 선택
2. **새 대화 시작**: 컨텍스트 오염 방지
3. **구현**: AI와 협업하여 코드 작성
4. **테스트**: 단위/통합 테스트 실행
5. **검증**: 완료 기준 충족 확인
6. **커밋**: 작은 단위로 커밋
7. **리뷰**: 코드 리뷰 및 피드백

**구현 원칙**:
- ✅ TDD (Test-Driven Development) 적용
- ✅ Red → Green → Refactor 사이클
- ✅ 최소한의 코드로 테스트 통과
- ✅ 린트/타입 에러 즉시 수정
- ✅ 커밋 메시지에 태스크 ID 포함

---

## 📜 Constitution (프로젝트 헌법)

프로젝트의 **협상 불가능한 원칙**을 정의합니다. 모든 의사결정은 이 원칙에 부합해야 합니다.

### 핵심 가치
1. **사용자 우선**: 모든 기능은 사용자 가치 제공이 목적
2. **투명성**: 의사결정 과정과 이유를 문서화
3. **품질**: 테스트 커버리지 80% 이상 유지
4. **접근성**: WCAG 2.1 AA 준수
5. **성능**: Lighthouse 점수 90+ 유지

### 기술 원칙
1. **TypeScript Strict Mode**: 엄격한 타입 체크
2. **TDD**: 테스트 먼저, 구현 나중
3. **컴포넌트 단일 책임**: 한 가지 역할만 수행
4. **명시적 에러 처리**: try-catch 또는 Error Boundary
5. **반응형 디자인**: 모바일 퍼스트

### 코드 스타일
1. **PascalCase**: 컴포넌트, 타입, 인터페이스
2. **camelCase**: 함수, 변수, 훅
3. **kebab-case**: 파일명, CSS 클래스
4. **UPPER_SNAKE_CASE**: 상수
5. **Import 순서**: React → 외부 라이브러리 → 내부 모듈 → 스타일

### 문서화 원칙
1. **명세 우선**: 구현 전 명세 작성
2. **변경 시 명세 먼저**: 코드 변경 전 명세 업데이트
3. **커밋 메시지**: Conventional Commits 준수
4. **코드 주석**: Why, not What
5. **README**: 프로젝트 시작 가이드 포함

---

## 🤖 AI 협업 규칙 (SDD 적용)

### 언어 원칙
- **모든 출력은 한글로 작성**: 코드 주석, 커밋 메시지, 문서, 대화 응답 모두 한글 사용
- **예외**: 코드 변수명, 함수명, 기술 용어는 영문 유지
- **번역 불필요**: 영문 에러 메시지나 로그는 그대로 인용 가능

### 날짜/시간 원칙
- **기준 시간대**: KST (Korea Standard Time, UTC+9)
- **날짜 표기**: YYYY-MM-DD 형식 (예: 2025-11-23)
- **문서 업데이트 시 현지 날짜 확인 필수**
- **마이그레이션 파일명**: YYYYMMDDHHMMSS 형식 (UTC 기준)

### SOT (Skeleton of Thought) + SDD 통합

모든 작업은 **SDD 4단계 프로세스**를 따르며, SOT로 각 단계를 구조화합니다.

**통합 프로세스**:
```
1. 문제 정의 → Specify (명세 작성)
2. 현황 파악 → Plan (계획 수립)
3. 구조 설계 → Tasks (작업 분해)
4. 영향 범위 → Implement (구현)
5. 검증 계획 → Verify (검증)
```

### 작업 전 체크리스트

#### Specify 단계
- [ ] 사용자 스토리 작성
- [ ] 성공 기준 정의
- [ ] 제약사항 확인
- [ ] 관련 명세 검토

#### Plan 단계
- [ ] 아키텍처 설계 검토
- [ ] 기술 스택 선택 및 기록
- [ ] 구현 전략 수립
- [ ] 보안/성능 고려사항 점검

#### Tasks 단계
- [ ] 작업을 1~3시간 단위로 분해
- [ ] 각 작업의 완료 기준 정의
- [ ] 의존성 관계 파악
- [ ] 우선순위 결정

#### Implement 단계
- [ ] 새 대화(세션) 시작
- [ ] 관련 명세/플랜/태스크 확인
- [ ] TDD 사이클 적용
- [ ] 린트/타입 에러 해결
- [ ] 테스트 통과 확인
- [ ] 커밋 및 푸시

### 작업 후 문서 업데이트 체크리스트

**필수 문서**:
- [ ] `CLAUDE.md` - 프로젝트 현황 업데이트
- [ ] 관련 명세 파일 (`spec/`, `plan/`, `tasks/`)
- [ ] `project-todo.md` - 완료 항목 체크

**중요 문서**:
- [ ] `docs/project/changelog.md` - 변경 로그 기록
- [ ] `docs/project/roadmap.md` - 로드맵 진행률 업데이트

**선택 문서**:
- [ ] 관련 가이드 문서 (필요시)

**버그 픽스 시 필수**:
- [ ] `docs/troubleshooting/bug-fixes-log.md` - 에러 원인과 해결 방법 기록

---

## 🐛 버그 픽스 관리 원칙

### 목적
모든 버그 픽스와 해결 방안을 체계적으로 기록하여, 다음 배포나 작업에 활용할 수 있도록 합니다.

### 기록 대상
1. **프로덕션 에러**: 배포 후 발견된 버그
2. **RLS/권한 이슈**: Supabase 보안 관련 문제
3. **레이아웃/UI 버그**: 사용자에게 보이는 문제
4. **빌드 에러**: 컴파일 또는 배포 실패

### 기록 위치
- **버그 픽스 로그**: `docs/troubleshooting/bug-fixes-log.md`

### 기록 항목
1. **증상**: 사용자가 경험한 문제
2. **에러 메시지**: 콘솔 로그 또는 에러 내용
3. **원인**: 근본 원인 분석
4. **해결**: 수정 코드 또는 SQL
5. **관련 파일**: 수정된 파일 목록
6. **교훈**: 향후 예방을 위한 교훈

### 워크플로우
```
버그 발견 → 원인 분석 → 수정 → 테스트 → bug-fixes-log.md 기록 → 커밋
```

---

### 컨텍스트 관리 원칙

#### 컨텍스트 절식 (Context Isolation)
- **태스크마다 새 대화 시작**: 이전 대화의 오염 방지
- **명세 참조로 컨텍스트 제공**: 대화 히스토리 대신 명세 파일 공유
- **관련 파일만 공유**: 전체 코드베이스가 아닌 필요한 파일만

#### 컨텍스트 제공 방법
```markdown
# 새 대화 시작 시 제공할 정보

1. 관련 명세: spec/requirements.md#feature-name
2. 관련 플랜: plan/architecture.md#component-structure
3. 현재 태스크: tasks/sprint-N.md#task-ID
4. 관련 파일: src/components/Component.tsx
5. Constitution: constitution.md
```

---

## 🔢 버전 관리

**현재 버전**: 2.8.1
**형식**: Major.Minor.Patch ([Semantic Versioning](https://semver.org/lang/ko/))

### 버전 업 기준

| 버전 | 변경 기준 | 승인 |
|------|-----------|------|
| **Major (X.0.0)** | Breaking Changes, 대규모 아키텍처 변경 | ⚠️ 사용자 승인 필수 |
| **Minor (0.X.0)** | 새로운 기능 추가 (하위 호환) | 자동 |
| **Patch (0.0.X)** | 버그 수정, 문서 업데이트, Hotfix | 자동 |

### 최근 버전 히스토리

| 버전 | 날짜 | 핵심 변경 |
|------|------|-----------|
| 2.11.0 | 2025-11-23 | Claude Skills Sprint 3 (docx Skill + RFP) |
| 2.10.0 | 2025-11-23 | Claude Skills Sprint 2 (Central Hub 대시보드) |
| 2.9.0 | 2025-11-23 | Central Hub 인프라 (Minu 서비스 중심 시스템) |
| 2.8.1 | 2025-11-23 | 프로덕션 빌드 크래시 Hotfix |
| 2.8.0 | 2025-11-23 | GitHub 연동 & 진척률 자동화 |
| 2.7.0 | 2025-11-23 | 프로젝트/이야기/함께하기 허브 |
| 2.6.0 | 2025-11-23 | 사이트 재구조화 (7→5 메뉴) |
| 2.5.0 | 2025-11-23 | Tiptap 에디터 & 미디어 고도화 |
| 2.4.0 | 2025-11-22 | Minu 브랜드 전환 |
| 2.3.0 | 2025-11-22 | Newsletter 관리 기능 |

**전체 히스토리**: [docs/project/version-history.md](docs/project/version-history.md)

### 릴리스
```bash
npm run release:patch  # 패치 버전
npm run release:minor  # 마이너 버전
npm run release:major  # 메이저 버전
```

**상세 가이드**: [docs/versioning/README.md](docs/versioning/README.md)

---

## 📋 프로젝트 개요

### Vision & Direction

> **"생각을 멈추지 않고, 행동으로 옮기는 회사"**
>
> IDEA on Action은 "아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오"로 진화합니다.
> Version 2.0에서는 단순한 소개용 웹사이트를 넘어 **Roadmap, Portfolio, Now, Lab, Community**가 상호작용하는 형태로 확장합니다.

**핵심 루프**:
"아이디어 → 실험 → 결과공유 → 참여 → 다음 아이디어"

### 기본 정보
- **프로젝트명**: IDEA on Action (구 VIBE WORKING)
- **회사명**: 생각과행동 (IdeaonAction)
- **목적**: 아이디어 실험실 & 커뮤니티형 프로덕트 스튜디오
- **슬로건**: KEEP AWAKE, LIVE PASSIONATE
- **웹사이트**: https://www.ideaonaction.ai/
- **GitHub**: https://github.com/IDEA-on-Action/idea-on-action

### 연락처
- **대표자**: 서민원
- **이메일**: sinclairseo@gmail.com
- **전화**: 010-4904-2671

---

## 🛠️ 기술 스택

### Core
- **Vite**: 5.4.19 (빌드 도구)
- **React**: 18.x
- **TypeScript**: 5.x
- **Tailwind CSS**: 3.4.x
- **Supabase**: 2.x (Backend)

### UI & Design
- **shadcn/ui** - UI 컴포넌트 라이브러리
- **Radix UI** - Headless UI primitives
- **Lucide Icons** - 아이콘 라이브러리
- **Google Fonts** - Inter (본문), JetBrains Mono (코드)

### State Management
- **React Query** - 서버 상태 관리
- **React Hook Form** - 폼 관리
- **Zustand** - 클라이언트 상태 관리 (장바구니)

### Routing & i18n
- **React Router DOM** - 클라이언트 사이드 라우팅
- **i18next** - 국제화 프레임워크
- **react-i18next** - React i18n 통합

### Monitoring & Analytics
- **Sentry** - 에러 추적 및 모니터링
- **Google Analytics 4** - 사용자 분석
- **Vite PWA** - Progressive Web App 지원

---

## 📁 프로젝트 구조

```
idea-on-action/
├── spec/                    # Stage 1: Specify (명세)
│   ├── requirements.md      # 사용자 요구사항
│   ├── acceptance-criteria.md  # 성공 기준
│   └── constraints.md       # 제약사항
├── plan/                    # Stage 2: Plan (계획)
│   ├── architecture.md      # 아키텍처 설계
│   ├── tech-stack.md        # 기술 스택
│   └── implementation-strategy.md  # 구현 전략
├── tasks/                   # Stage 3: Tasks (작업)
│   ├── sprint-1.md          # 스프린트 1 작업
│   ├── sprint-2.md          # 스프린트 2 작업
│   ├── sprint-3.md          # 스프린트 3 작업
│   └── backlog.md           # 백로그
├── constitution.md          # 프로젝트 헌법 (불변 원칙)
├── src/                     # Stage 4: Implement (구현)
│   ├── components/          # React 컴포넌트
│   ├── pages/               # 페이지 (Index, ServiceList, Admin...)
│   ├── hooks/               # 커스텀 훅 (useAuth, useTheme...)
│   └── lib/                 # 유틸리티
├── docs/                    # 프로젝트 문서
│   ├── guides/              # 실무 가이드
│   ├── project/             # 로드맵, 변경 로그
│   └── archive/             # 히스토리 보관
├── tests/                   # 테스트
│   ├── e2e/                 # E2E 테스트
│   ├── unit/                # 유닛 테스트
│   └── fixtures/            # 테스트 데이터
├── scripts/                 # 개발 스크립트
└── public/                  # 정적 파일
```

**상세 구조**: [docs/guides/project-structure.md](docs/guides/project-structure.md)

---

## 🚀 빠른 시작

### 개발 환경 설정
```bash
# 1. 저장소 클론
git clone https://github.com/IDEA-on-Action/IdeaonAction-Homepage.git
cd IdeaonAction-Homepage

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정 (.env.local)
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_KEY]

# 4. 개발 서버 실행
npm run dev  # http://localhost:8080
```

### 주요 명령어
```bash
npm run dev       # 개발 서버 (Vite)
npm run build     # 프로덕션 빌드
npm run preview   # 빌드 미리보기
npm run lint      # ESLint 검사
```

---

## 📊 현재 상태

### ✅ 완료된 작업

**Phase 1-14 (100%)** - 기본 인프라부터 고급 분석 대시보드까지 완료
- 프로덕션 배포, Vite 프로젝트 구조, DevOps 인프라
- 인증 시스템 (OAuth, 2FA, RBAC)
- 디자인 시스템, 서비스 페이지, 관리자 시스템
- 전자상거래, SSO, 콘텐츠 관리 (블로그, 공지사항)
- 성능 최적화 (Code Splitting, PWA, i18n)
- AI & 실시간 기능 (검색, 챗봇, 알림)
- 고급 분석 대시보드 (GA4, 매출, 실시간)
- **총 테스트**: 292개 (E2E 172, Unit 92, Visual 28)

**Version 2.0 (2025-11-14~16)** - 리팩토링 & 최적화
- ESLint 경고: 67개 → 2개 (-97%)
- TypeScript any: 60+개 → 2개 (-97%)
- 초기 번들: ~500 kB → 338 kB gzip (-32%)
- PWA precache: 4,031 KiB → 2,167 KiB (-46%)
- Dependencies: 107개 → 94개 (-12%)
- Admin CRUD E2E 테스트: 154개 신규 생성

**상세 히스토리**: [docs/archive/CLAUDE-history-november-2025.md](docs/archive/CLAUDE-history-november-2025.md)

---

## 📚 주요 문서

### 전체 문서 인덱스
- **[docs/README.md](docs/README.md)** - 전체 문서 가이드

### 실무 가이드
- **디자인 시스템**: [docs/guides/design-system/](docs/guides/design-system/)
- **배포 가이드**: [docs/guides/deployment/](docs/guides/deployment/)
- **데이터베이스**: [docs/guides/database/](docs/guides/database/)
- **CMS 가이드**: [docs/guides/cms/](docs/guides/cms/)

### 프로젝트 관리
- **[project-todo.md](project-todo.md)** - 할 일 목록
- **[docs/project/roadmap.md](docs/project/roadmap.md)** - 로드맵
- **[docs/project/changelog.md](docs/project/changelog.md)** - 변경 로그

### 히스토리
- **[docs/archive/](docs/archive/)** - 개발 히스토리 보관
  - [CLAUDE-history-november-2025.md](docs/archive/CLAUDE-history-november-2025.md) - 2025년 11월 히스토리

### 외부 참고
- [Vite 문서](https://vitejs.dev/)
- [React 문서](https://react.dev/)
- [Supabase 문서](https://supabase.com/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [shadcn/ui 문서](https://ui.shadcn.com/)

---

## 📝 참고사항

### 환경 변수
- **접두사**: `VITE_` (Vite 환경 변수)
- **파일명**: `.env.local` (로컬 개발용, gitignore)
- **포트**: 5173 (Vite 기본)

### 코드 컨벤션
- **컴포넌트**: PascalCase (Header.tsx, ThemeToggle.tsx)
- **훅**: camelCase with use prefix (useTheme.ts, useAuth.ts)
- **스타일**: Tailwind CSS utility classes
- **타입**: TypeScript strict mode

### Import 경로
- **Alias**: `@/` → `src/` (vite.config.ts에서 설정)
- **예시**: `import { Button } from '@/components/ui/button'`

### 문서 및 SQL 관리 규칙
- **통합 관리**: 모든 문서는 `docs/` 아래 통합, SQL은 `scripts/sql/` 또는 `supabase/migrations/`
- **단일 진실 소스**: 정보 중복 금지, 참조 링크 사용
- **명명 규칙**: kebab-case (문서), 타임스탬프 (공식 마이그레이션)
- **문서 생명주기**: 생성 → 활성 → 완료 → 보관 (docs/archive/)
- **필수 업데이트**: CLAUDE.md, project-todo.md, changelog.md

**상세 가이드**: [문서 관리 규칙](docs/DOCUMENT_MANAGEMENT.md)

---

**Full Documentation**: `docs/`
**Project TODO**: `project-todo.md`
**Design System**: `docs/guides/design-system/README.md`
**Changelog**: `docs/project/changelog.md`

---

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

# Context Engineering
당신은 최신 스택이 빠르게 변하는 프로젝트에서 작업하는 AI 개발자입니다.
  시작 전 반드시 아래 절차를 따르세요.

  1. **환경 파악**
     - `package.json`, 구성 파일(next.config, vite.config 등), 리드미를 읽고 실제 프레임워크·라이브러리 버전을 확인합니다.
     - 런타임 제약(Edge/Serverless/Browser), 네트워크 사용 가능 여부, 보안 정책 등을 명확히 정리합니다.

  2. **버전 차이 대응**
     - 확인된 버전의 릴리스 노트/마이그레이션 가이드를 참조해 기존 지식과 달라진 API, 헬퍼 함수, 타입 시스템을 정리합니다.
     - 이전 버전 경험을 그대로 적용하지 말고, 최신 권장사항과 비호환 포인트를 우선 확인합니다.

  3. **설계 시 체크**
     - 폰트, 이미지, 외부 API 등 네트워크 리소스가 필요한 경우, 프로젝트 설정(예: `next.config.js`의 image 도메인, offline 제한)에 맞춰 선반영합니다.
     - 인증/데이터 레이어는 실제 사용 중인 SDK 버전에 맞춰 타입, 비동기 패턴, Edge 호환성을 고려합니다.
     - 새로 만드는 컴포넌트/액션은 최신 React/프레임워크 API(예: React 19의 `useActionState`, Next.js 15의 Promise 기반 `params`)로 작성합니다.

  4. **구현 중 검증**
     - 주요 변경마다 린트/타입/빌드 명령을 실행하거나, 최소한 실행 가능 여부를 추정하고 예상되는 오류를 미리 보고합니다.
     - 제약 때문에 못 하는 작업이 있으면 즉시 알리고 대체 방향을 제안합니다.

  5. **결과 전달**
     - 변경 사항에는 어떤 버전 차이를 반영했는지, 어떤 경고/오류를 미연에 방지했는지를 포함해 설명합니다.
     - 추가로 확인하거나 설정해야 할 항목이 있다면 명확히 지목합니다.

  이 지침을 매번 준수해 최신 스택 특성을 반영하고, 이전 지식에 기대어 생길 수 있는 디버깅 시간을 최소화하세요.
