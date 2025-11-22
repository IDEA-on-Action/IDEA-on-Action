# 사이트 재구조화 구현 전략

> Phase별 구현 계획 및 작업 순서

**작성일**: 2025-11-23
**버전**: 1.0.0
**상태**: Draft

---

## 1. Phase 개요

```
Phase 1: 메뉴 재구성 (1주)
    │
    ▼
Phase 2: 프로젝트 페이지 통합 (1주)
    │
    ▼
Phase 3: 이야기 섹션 구축 (1주)
    │
    ▼
Phase 4: 실시간 동기화 (2주)
    │
    ▼
[완료] 총 5주
```

---

## 2. Phase 1: 메뉴 재구성 (1주)

### 목표
- 7개 메뉴 → 5개 메뉴 단순화
- 기존 URL 리디렉션 설정
- 홈 페이지 섹션 재구성

### 작업 목록

#### Day 1-2: Header 및 라우팅
```
TASK-001: Header.tsx 메뉴 5개로 수정
TASK-002: MobileMenu.tsx 동기화
TASK-003: App.tsx 리디렉션 라우트 추가
TASK-004: 허브 페이지 스켈레톤 생성
  - ServicesHub.tsx
  - ProjectsHub.tsx
  - StoriesHub.tsx
  - ConnectHub.tsx
```

#### Day 3-4: 홈 페이지 재구성
```
TASK-005: Index.tsx 섹션 재구성
  - Hero 섹션 강화 (슬로건)
  - What We Do 섹션 (서비스 요약)
  - What We're Building 섹션 (진행중 프로젝트)
  - Latest Updates 섹션 (최근 소식)
  - Newsletter CTA 섹션

TASK-006: About 콘텐츠 홈으로 통합
```

#### Day 5: 검증 및 테스트
```
TASK-007: 리디렉션 동작 테스트
TASK-008: 모바일 메뉴 테스트
TASK-009: E2E 테스트 업데이트 (메뉴 관련)
```

### 의존성
- 없음 (첫 번째 Phase)

### 산출물
- 수정: Header.tsx, MobileMenu.tsx, App.tsx, Index.tsx
- 신규: ServicesHub.tsx, ProjectsHub.tsx, StoriesHub.tsx, ConnectHub.tsx (스켈레톤)

---

## 3. Phase 2: 프로젝트 페이지 통합 (1주)

### 목표
- 포트폴리오 + 로드맵 + 실험실 → 프로젝트 허브 통합
- 탭 기반 네비게이션 구현
- 진척률 표시 컴포넌트 강화

### 작업 목록

#### Day 1-2: 프로젝트 허브 구현
```
TASK-010: ProjectsHub.tsx 완성
  - 탭 네비게이션 (진행중/출시됨/실험중/로드맵)
  - URL 쿼리 파라미터 연동 (?tab=)
  - 필터 및 검색 기능

TASK-011: 탭 컴포넌트 추출
  - InProgressTab.tsx (기존 Portfolio 로직)
  - ReleasedTab.tsx
  - LabTab.tsx (기존 Lab 로직)
  - RoadmapTab.tsx (기존 Roadmap 로직)
```

#### Day 3-4: 프로젝트 카드 강화
```
TASK-012: ProjectCard.tsx 확장
  - 진척률 Progress Bar 추가
  - 상태 배지 표시
  - GitHub 정보 표시 (커밋, 기여자)

TASK-013: ProjectDetail.tsx 생성
  - 기존 PortfolioDetail 이전 및 확장
  - 타임라인 표시
  - 마일스톤 목록
```

#### Day 5: 데이터 연동 및 테스트
```
TASK-014: 기존 훅 연동 검증
  - useProjects, useBounties, useRoadmap

TASK-015: E2E 테스트 작성 (프로젝트 페이지)
```

### 의존성
- Phase 1 완료 (라우팅 설정 필요)

### 산출물
- 수정: Portfolio.tsx → projects/ 이동
- 신규: ProjectsHub.tsx, ProjectCard.tsx, 탭 컴포넌트 4개

---

## 4. Phase 3: 이야기 섹션 구축 (1주)

### 목표
- 이야기 허브 페이지 구현
- 뉴스레터 아카이브 신규 생성
- Changelog 페이지 신규 생성
- 블로그 메뉴 활성화

### 작업 목록

#### Day 1-2: 이야기 허브 및 Changelog
```
TASK-016: StoriesHub.tsx 완성
  - 4개 섹션 네비게이션
  - 각 섹션 미리보기 (3개씩)

TASK-017: Changelog.tsx 신규 생성
  - 릴리즈 노트 목록
  - 버전, 날짜, 변경사항 표시
  - 프로젝트별 필터

TASK-018: changelog_entries 테이블 마이그레이션
```

#### Day 3-4: 뉴스레터 아카이브
```
TASK-019: NewsletterArchive.tsx 신규 생성
  - 발송된 뉴스레터 목록
  - 미리보기 및 상세 보기

TASK-020: NewsletterDetail.tsx 신규 생성
  - 전체 내용 표시

TASK-021: newsletter_archive 테이블 마이그레이션

TASK-022: useNewsletterArchive 훅 생성
```

#### Day 5: 블로그 활성화 및 테스트
```
TASK-023: 블로그 메뉴 활성화 (Header에서 숨김 해제 대신 stories/blog로 이동)

TASK-024: 공지사항 /stories/notices로 이전

TASK-025: E2E 테스트 작성 (이야기 페이지)
```

### 의존성
- Phase 1 완료 (라우팅)
- Phase 2와 병렬 가능

### 산출물
- 신규: StoriesHub.tsx, Changelog.tsx, NewsletterArchive.tsx, NewsletterDetail.tsx
- 신규: changelog_entries 테이블, newsletter_archive 테이블
- 신규: useNewsletterArchive, useChangelog 훅

---

## 5. Phase 4: 실시간 동기화 (2주)

### 목표
- GitHub API 연동
- 진척률 자동 계산
- 릴리즈 알림 시스템

### 작업 목록

#### Week 1: GitHub 연동
```
TASK-026: GitHub API 서비스 생성
  - src/lib/github-api.ts
  - 커밋, 이슈, PR 조회
  - Rate Limit 처리

TASK-027: useGitHubStats 훅 생성
  - React Query 캐싱 (1시간)
  - 에러 핸들링

TASK-028: github_stats_cache 테이블 마이그레이션 (선택적)

TASK-029: ProjectCard에 GitHub 정보 연동
```

#### Week 2: 진척률 및 알림
```
TASK-030: 진척률 자동 계산 로직
  - 마일스톤 기반 계산
  - projects 테이블 progress_percentage 업데이트

TASK-031: GitHub Release 감지 Edge Function
  - Webhook 또는 Polling
  - changelog_entries 자동 생성

TASK-032: 관리자 알림 연동 (선택적)
  - 릴리즈 시 Slack/이메일 알림

TASK-033: E2E 테스트 및 통합 테스트
```

### 의존성
- Phase 2 완료 (프로젝트 페이지)
- Phase 3 완료 (Changelog)

### 산출물
- 신규: src/lib/github-api.ts
- 신규: useGitHubStats 훅
- 신규: process-github-release Edge Function (선택적)
- 수정: ProjectCard, ProjectDetail

---

## 6. 함께하기 섹션 (Phase 3 병렬)

### 작업 목록
```
TASK-034: ConnectHub.tsx 완성
  - 3개 섹션 표시

TASK-035: ProjectInquiry.tsx
  - 기존 WorkWithUs 이전

TASK-036: Careers.tsx 신규 생성
  - 바운티 연동
  - 채용 공고 (정적 또는 CMS)

TASK-037: Community.tsx 이전
```

---

## 7. 병렬 작업 계획

```
Week 1:
├── Agent 1: Header + 라우팅 (TASK-001~004)
├── Agent 2: 홈 페이지 재구성 (TASK-005~006)
├── Agent 3: 허브 페이지 스켈레톤 (TASK-007~009)
└── Agent 4: 문서 업데이트 (CLAUDE.md, changelog)

Week 2:
├── Agent 1: ProjectsHub (TASK-010~011)
├── Agent 2: StoriesHub (TASK-016~017)
├── Agent 3: ConnectHub (TASK-034~037)
└── Agent 4: DB 마이그레이션 (TASK-018, 021)

Week 3:
├── Agent 1: 프로젝트 카드/상세 (TASK-012~015)
├── Agent 2: 뉴스레터 아카이브 (TASK-019~022)
├── Agent 3: 블로그/공지사항 이전 (TASK-023~025)
└── Agent 4: E2E 테스트 작성

Week 4-5:
├── Agent 1: GitHub API 연동 (TASK-026~029)
├── Agent 2: 진척률 자동화 (TASK-030)
├── Agent 3: 릴리즈 알림 (TASK-031~032)
└── Agent 4: 통합 테스트 및 검증 (TASK-033)
```

---

## 8. 리스크 완화

### 8.1 SEO 영향 최소화
- 리디렉션 즉시 적용 (Week 1)
- Search Console 모니터링 설정
- sitemap.xml 즉시 업데이트

### 8.2 사용자 혼란 방지
- 주요 리디렉션 테스트 철저히
- 점진적 배포 (Vercel Preview)
- 피드백 수집 채널 준비

### 8.3 성능 유지
- 번들 크기 모니터링 (각 Phase 후)
- Lighthouse CI 실행
- 코드 스플리팅 검증

---

## 9. 롤백 계획

### Phase별 롤백
- 각 Phase는 독립적으로 롤백 가능
- Git 태그: `site-restructure-phase-{n}-complete`
- DB 마이그레이션: 롤백 스크립트 준비

### 전체 롤백
- `main` 브랜치에서 작업 (feature 브랜치 사용)
- 문제 발생 시 이전 커밋으로 Vercel 롤백

---

## 10. 검증 체크리스트

### Phase 완료 기준
- [ ] 모든 TASK 완료
- [ ] E2E 테스트 통과 (90% 이상)
- [ ] Lighthouse 점수 90+ 유지
- [ ] 번들 크기 10% 이상 증가하지 않음
- [ ] 리디렉션 100% 동작

### 최종 배포 기준
- [ ] 모든 Phase 완료
- [ ] 전체 E2E 테스트 통과
- [ ] 성능 테스트 통과
- [ ] 접근성 테스트 통과
- [ ] SEO 검증 완료

---

## 관련 문서

- [architecture.md](./architecture.md) - 아키텍처
- [tasks/site-restructure/sprint-1.md](../../tasks/site-restructure/sprint-1.md) - Sprint 1 작업
