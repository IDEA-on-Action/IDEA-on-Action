# Claude Skills 요구사항 명세서

> 생각과 행동 허브 및 Minu 시리즈를 위한 Claude Skills 통합 요구사항

**작성일**: 2025-11-23
**버전**: 1.0.0
**상태**: Draft
**관련 문서**: [Central Hub 요구사항](../central-hub/requirements.md)

---

## 1. 개요

### 1.1 목적

Claude Skills를 IDEA on Action 허브 시스템과 Minu 4개 서비스에 통합하여, 문서 자동화 및 데이터 시각화 기능을 제공합니다.

### 1.2 대상 서비스

| 서비스 | 역할 | 핵심 Skills |
|--------|------|-------------|
| **IDEA on Action Hub** | 통합 관리 플랫폼 | frontend-design, xlsx |
| **Minu Find** | 사업기회 탐색 | xlsx, docx, pdf |
| **Minu Frame** | 문제정의 & RFP | docx, pptx, frontend-design |
| **Minu Build** | 프로젝트 진행 | xlsx, docx, frontend-design |
| **Minu Keep** | 운영/유지보수 | xlsx, docx, pdf |

### 1.3 Skills 유형

| Skill | 설명 | 주요 용도 |
|-------|------|----------|
| **xlsx** | Excel 파일 생성/분석 | 데이터 리포트, 통계 시트, KPI 대시보드 |
| **docx** | Word 문서 생성 | RFP, 보고서, 매뉴얼, 계약서 |
| **pptx** | PowerPoint 생성 | 발표 자료, 제안서 |
| **pdf** | PDF 파싱/생성 | 공고문 분석, 감사 보고서 |
| **frontend-design** | React UI 컴포넌트 | 대시보드, 위젯, 입력 폼 |

---

## 2. 사용자 스토리

### US-CS-01: 통합 대시보드 UI
> **As a** 관리자
> **I want to** 모든 Minu 서비스의 상태를 한눈에 볼 수 있는 대시보드
> **So that** 서비스 운영 현황을 빠르게 파악할 수 있다

**인수 조건**:
- [ ] 4개 서비스 헬스 상태 카드 표시
- [ ] 실시간 이벤트 타임라인
- [ ] 이슈 목록 및 심각도 표시
- [ ] 통계 차트 (일별/주별/월별)

### US-CS-02: 통합 통계 Excel Export
> **As a** 관리자
> **I want to** 전체 서비스 데이터를 Excel로 내보내기
> **So that** 경영진 보고서를 작성할 수 있다

**인수 조건**:
- [ ] 이벤트 로그 시트
- [ ] 이슈 현황 시트
- [ ] 서비스 헬스 이력 시트
- [ ] KPI 요약 시트
- [ ] 날짜 범위 필터

### US-CS-03: 시장 분석 리포트 (Minu Find)
> **As a** 사업 기획자
> **I want to** 시장 분석 데이터를 Excel/Word로 자동 생성
> **So that** 사업기회를 체계적으로 평가할 수 있다

**인수 조건**:
- [ ] 경쟁사 비교 매트릭스 (xlsx)
- [ ] 트렌드 분석 차트 (xlsx)
- [ ] 원페이저 기회 분석 (docx)
- [ ] 시장 진입 전략 요약 (docx)

### US-CS-04: RFP 자동 생성 (Minu Frame)
> **As a** 프로젝트 매니저
> **I want to** 요구사항을 입력하면 RFP 문서가 자동 생성
> **So that** 문서 작성 시간을 단축할 수 있다

**인수 조건**:
- [ ] 정부 SI 표준 RFP 템플릿
- [ ] 스타트업 MVP RFP 템플릿
- [ ] 엔터프라이즈 RFP 템플릿
- [ ] 요구사항 자동 분류 (기능/비기능)
- [ ] MoSCoW 우선순위 설정

### US-CS-05: 프로젝트 진행 리포트 (Minu Build)
> **As a** 프로젝트 매니저
> **I want to** 프로젝트 진행 상황을 Excel/Word로 자동 생성
> **So that** 스테이크홀더에게 정기 보고할 수 있다

**인수 조건**:
- [ ] 간트 차트 생성 (xlsx)
- [ ] 번다운 차트 (xlsx)
- [ ] 주간 진행 보고서 (docx)
- [ ] 이슈 리포트 (docx)

### US-CS-06: 운영 보고서 (Minu Keep)
> **As a** 운영 담당자
> **I want to** 운영 지표를 자동 수집하고 보고서 생성
> **So that** 월간 운영 현황을 보고할 수 있다

**인수 조건**:
- [ ] SLA 모니터링 시트 (xlsx)
- [ ] 버그 트래킹 시트 (xlsx)
- [ ] 월간 운영 보고서 (docx)
- [ ] 장애 대응 리포트 (docx)

### US-CS-07: 발표 자료 생성 (Minu Frame)
> **As a** 비즈니스 개발자
> **I want to** 문제 정의 및 솔루션 제안 발표 자료 생성
> **So that** 스테이크홀더 설득을 효과적으로 할 수 있다

**인수 조건**:
- [ ] 문제 정의 슬라이드 (pptx)
- [ ] 솔루션 제안 슬라이드 (pptx)
- [ ] 브랜드 가이드라인 적용

### US-CS-08: MCP 중앙 관리 (Hub)
> **As a** 시스템 관리자
> **I want to** JWT 토큰과 Cross-service 데이터를 중앙 관리
> **So that** 4개 서비스 간 원활한 연동이 가능하다

**인수 조건**:
- [ ] JWT 토큰 중앙 발급/검증
- [ ] Cross-service 데이터 동기화
- [ ] Webhook 이벤트 라우팅
- [ ] Service health check 자동화

---

## 3. 기능 요구사항

### FR-CS-01: xlsx Skill 통합

#### FR-CS-01.1: Excel Export 기능

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 이벤트 로그 내보내기 | service_events 테이블 Excel 변환 | P0 |
| 이슈 현황 내보내기 | service_issues 테이블 Excel 변환 | P0 |
| 헬스 이력 내보내기 | service_health 변경 이력 Excel 변환 | P1 |
| KPI 요약 시트 | 주요 지표 집계 및 차트 | P1 |

#### FR-CS-01.2: Excel Import 기능

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 대량 데이터 가져오기 | Excel → DB 대량 삽입 | P2 |
| 템플릿 검증 | 형식 오류 사전 체크 | P2 |

### FR-CS-02: docx Skill 통합

#### FR-CS-02.1: 문서 템플릿 시스템

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| RFP 템플릿 | 3종 RFP 양식 (정부SI, 스타트업, 엔터프라이즈) | P0 |
| 보고서 템플릿 | 주간/월간 보고서 양식 | P0 |
| 매뉴얼 템플릿 | 운영/사용자 매뉴얼 양식 | P1 |
| 계약서 템플릿 | 운영 계약서 양식 | P2 |

#### FR-CS-02.2: 동적 콘텐츠 삽입

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 변수 치환 | {{변수}} 형식 자동 치환 | P0 |
| 테이블 동적 생성 | 데이터 기반 표 자동 생성 | P0 |
| 차트 삽입 | Excel 차트 이미지 삽입 | P1 |

### FR-CS-03: frontend-design Skill 통합

#### FR-CS-03.1: 대시보드 컴포넌트

| 컴포넌트 | 설명 | 우선순위 |
|----------|------|----------|
| ServiceHealthCard | 서비스 상태 카드 (4개) | P0 |
| EventTimeline | 실시간 이벤트 타임라인 | P0 |
| IssueList | 이슈 목록 (심각도 표시) | P0 |
| StatisticsChart | 통계 차트 (Chart.js) | P1 |
| KPIWidget | KPI 요약 위젯 | P1 |

#### FR-CS-03.2: 입력 폼 컴포넌트

| 컴포넌트 | 설명 | 우선순위 |
|----------|------|----------|
| RFPWizard | RFP 입력 마법사 (단계별) | P1 |
| RequirementBuilder | 요구사항 드래그앤드롭 | P1 |
| ReportConfigurator | 보고서 설정 폼 | P2 |

### FR-CS-04: MCP Orchestrator

#### FR-CS-04.1: 인증 중앙화

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| JWT 토큰 발급 | 서비스별 JWT 생성 | P0 |
| 토큰 검증 | 서비스 요청 시 토큰 확인 | P0 |
| 토큰 갱신 | Refresh Token 처리 | P1 |

#### FR-CS-04.2: 데이터 동기화

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 이벤트 라우팅 | Webhook → 적절한 서비스 전달 | P0 |
| 상태 동기화 | Cross-service 상태 공유 | P1 |
| 캐시 무효화 | 변경 시 관련 캐시 삭제 | P1 |

---

## 4. 비기능 요구사항

### NFR-CS-01: 성능

| 항목 | 요구사항 |
|------|----------|
| Excel 생성 시간 | 1,000행 기준 3초 이내 |
| Word 생성 시간 | 10페이지 기준 2초 이내 |
| 대시보드 로딩 | 초기 로딩 2초 이내, Realtime 업데이트 100ms 이내 |
| API 응답 시간 | p95 500ms 이내 |

### NFR-CS-02: 보안

| 항목 | 요구사항 |
|------|----------|
| 데이터 접근 | RLS 정책 적용, 역할별 접근 제어 |
| 파일 다운로드 | 인증된 사용자만 허용 |
| 토큰 저장 | HttpOnly Cookie 또는 Secure Storage |
| 감사 로그 | 문서 생성/다운로드 이력 기록 |

### NFR-CS-03: 가용성

| 항목 | 요구사항 |
|------|----------|
| 서비스 가용성 | 99.5% 이상 |
| 장애 복구 | RTO 1시간, RPO 1시간 |
| 에러 핸들링 | Graceful degradation |

### NFR-CS-04: 확장성

| 항목 | 요구사항 |
|------|----------|
| 새 Skill 추가 | 플러그인 아키텍처 지원 |
| 새 템플릿 추가 | 관리자 UI에서 템플릿 관리 |
| 새 서비스 추가 | 최소한의 코드 변경으로 연동 |

---

## 5. 제약사항

### 5.1 기술적 제약

| 항목 | 제약 | 대응 |
|------|------|------|
| Supabase Edge Function | 50MB 메모리 제한 | 대용량 파일은 클라이언트 생성 |
| 브라우저 메모리 | 대용량 Excel 제한 | 스트리밍 또는 서버 생성 |
| CORS | 외부 API 호출 제한 | Proxy 또는 Edge Function 경유 |

### 5.2 비즈니스 제약

| 항목 | 제약 | 대응 |
|------|------|------|
| Central Hub Phase 1 | 웹훅/이벤트 인프라 의존 | Phase 1 완료 후 진행 |
| 기존 MCP 서버 | 구조 유지 필요 | 확장 방식으로 통합 |
| 브랜드 가이드라인 | Minu 시리즈 통일성 | 디자인 토큰 활용 |

---

## 6. 우선순위 매트릭스

| 우선순위 | 기능 | 이유 |
|----------|------|------|
| **P0** | xlsx 기본 Export | 모든 서비스에서 공통 사용 |
| **P0** | docx RFP 템플릿 | Minu Frame 핵심 기능 |
| **P0** | ServiceHealthCard | Hub 대시보드 필수 |
| **P0** | MCP 토큰 발급/검증 | 서비스 연동 기반 |
| **P1** | xlsx 차트 생성 | 데이터 시각화 향상 |
| **P1** | docx 동적 콘텐츠 | 자동화 수준 향상 |
| **P1** | EventTimeline | 실시간 모니터링 |
| **P2** | pptx 발표 자료 | Minu Frame 부가 기능 |
| **P2** | pdf 파싱 | Minu Find 부가 기능 |
| **P3** | 대량 Import | 관리자 편의 기능 |

---

## 7. 용어 정의

| 용어 | 정의 |
|------|------|
| **Claude Skills** | Claude Code의 문서 생성/분석 플러그인 시스템 |
| **xlsx Skill** | Excel 파일 생성 및 분석 기능 |
| **docx Skill** | Word 문서 생성 기능 |
| **frontend-design** | React UI 컴포넌트 생성 기능 |
| **MCP Orchestrator** | 서비스 간 통신 조정 커스텀 Skill |
| **RFP** | Request for Proposal (제안요청서) |
| **MoSCoW** | Must, Should, Could, Won't 우선순위 기법 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |
