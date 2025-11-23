# IDEA on Action 버전 히스토리

> Major.Minor.Patch 버전 관리 체계에 따른 버전별 중요 작업 정리

**작성일**: 2025-11-23
**현재 버전**: 2.8.1
**버전 관리**: [Semantic Versioning](https://semver.org/lang/ko/)

---

## 버전 관리 원칙

| 버전 | 변경 기준 | 승인 |
|------|-----------|------|
| **Major (X.0.0)** | Breaking Changes, 대규모 아키텍처 변경 | 사용자 승인 필수 |
| **Minor (0.X.0)** | 새로운 기능 추가, 하위 호환 | 자동 |
| **Patch (0.0.X)** | 버그 수정, 문서 업데이트, Hotfix | 자동 |

---

## 버전 요약 테이블

| 버전 | 날짜 | 핵심 변경 | 카테고리 |
|------|------|-----------|----------|
| 2.8.1 | 2025-11-23 | 프로덕션 빌드 크래시 수정 | Hotfix |
| 2.8.0 | 2025-11-23 | GitHub 연동 & 진척률 자동화 | Feature |
| 2.7.0 | 2025-11-23 | 프로젝트/이야기/함께하기 허브 | Feature |
| 2.6.0 | 2025-11-23 | 사이트 재구조화 (7→5 메뉴) | Feature |
| 2.5.0 | 2025-11-23 | Tiptap 에디터 & 미디어 고도화 | Feature |
| 2.4.1 | 2025-11-22 | CMS 최적화, DB 보안 강화 | Patch |
| 2.4.0 | 2025-11-22 | Minu 브랜드 전환 | Feature |
| 2.3.4 | 2025-11-22 | Newsletter 날짜 필터 | Patch |
| 2.3.3 | 2025-11-22 | Newsletter 문서화 완료 | Patch |
| 2.3.2 | 2025-11-22 | 토스페이먼츠 심사 준비 | Patch |
| 2.3.1 | 2025-11-22 | 구독 관리 UI (Part 2) | Patch |
| 2.3.0 | 2025-11-22 | Newsletter 관리 기능 | Feature |
| 2.2.1 | 2025-11-22 | Function Search Path 보안 | Patch |
| 2.2.0 | 2025-11-18 | 토스페이먼츠 DB 설정 | Feature |
| 2.1.0 | 2025-11-19 | 디자인 시스템 확장 | Feature |
| 2.0.1 | 2025-11-16 | CMS Phase 4 문서화 | Patch |
| 2.0.0 | 2025-11-16 | Version 2.0 리팩토링 | Major |
| 1.x.x | 2025-10~11 | Phase 1-14 완료 | - |

---

## Major Versions

### v2.0.0 - Version 2.0 리팩토링 (2025-11-16)

**핵심 성과**:
- ESLint 경고: 67개 → 2개 (-97%)
- TypeScript any: 60+개 → 2개 (-97%)
- 초기 번들: ~500 kB → 338 kB gzip (-32%)
- PWA precache: 4,031 KiB → 2,167 KiB (-46%)
- Dependencies: 107개 → 94개 (-12%)

**주요 작업**:
- Phase 1-14 완료 (기본 인프라 ~ 고급 분석)
- 병렬 리팩토링 (4개 에이전트)
- Admin CRUD E2E 테스트 154개 생성

---

## Minor Versions (v2.x.0)

### v2.8.0 - GitHub 연동 (2025-11-23)

**사이트 재구조화 Sprint 4**:
- GitHub API 서비스 (`@octokit/rest`)
- `useGitHubStats` 훅 (React Query)
- `github_stats_cache` 테이블
- 마일스톤 기반 진척률 자동 계산
- `sync-github-releases` Edge Function
- 관리자 알림 (앱 내 + Slack)

### v2.7.0 - 허브 페이지 (2025-11-23)

**사이트 재구조화 Sprint 2+3**:
- ProjectsHub (4개 탭)
- StoriesHub (블로그/뉴스레터/Changelog)
- ConnectHub (문의/커뮤니티/채용)
- DB: `changelog_entries`, `newsletter_archive`
- E2E 테스트 68개 신규

### v2.6.0 - 메뉴 재구조화 (2025-11-23)

**사이트 재구조화 Sprint 1**:
- 7개 메뉴 → 5개 메뉴 단순화
- 리디렉션 라우트 8개
- SDD 문서 작성

### v2.5.0 - CMS Phase 5 (2025-11-23)

**리치 텍스트 에디터 & 미디어 고도화**:
- Tiptap 에디터 통합
- Extensions 4개 (Image, CodeBlock, Markdown, Link)
- 미디어 라이브러리 (Storage bucket, 훅, 컴포넌트)

### v2.4.0 - Minu 브랜드 (2025-11-22)

**COMPASS → Minu 전환**:
- Compass Navigator → Minu Find
- Compass Cartographer → Minu Frame
- Compass Captain → Minu Build
- Compass Harbor → Minu Keep
- MCP 서버 연동 (4개 서비스 페이지)

### v2.3.0 - Newsletter 관리 (2025-11-22)

**Newsletter 기능**:
- AdminNewsletter 페이지
- 통계 대시보드 (4개 카드)
- 구독자 관리 (검색/필터/상태변경/삭제)
- React Query 훅 5개
- GDPR 준수

### v2.2.0 - 토스페이먼츠 (2025-11-18)

**Services Platform DB 설정**:
- `services` 테이블 확장 (4개 JSONB)
- `service_packages` 테이블 생성
- `subscription_plans` 테이블 생성
- 4개 서비스 콘텐츠 데이터

### v2.1.0 - 디자인 시스템 (2025-11-19)

**컴포넌트 확장**:
- 필수 컴포넌트 9개 (CommandPalette, Drawer 등)
- 전문 컴포넌트 4개 (StatsCard, Timeline 등)
- WCAG AAA 85% 달성

---

## Patch Versions 주요 항목

### v2.8.1 - Hotfix (2025-11-23)
- Octokit Lazy Initialization (앱 크래시 수정)
- Admin 청크 순환 의존성 수정

### v2.4.1 - CMS 최적화 (2025-11-22)
- React Query 캐싱 전략 최적화
- TeamForm/PortfolioForm Upload 완성
- 미디어 라이브러리 구축
- 보안 점수: 32 → 98/100

### v2.3.4 - Newsletter 날짜 필터 (2025-11-22)
- DateRangePicker 컴포넌트
- CSV Export 날짜 범위 지원

### v2.2.1 - DB 보안 (2025-11-22)
- 67개 함수 `search_path` 보안 강화
- SQL Injection 방어

### v2.0.1 - CMS Phase 4 (2025-11-16)
- Admin 가이드 6개 (57 KB)
- API 문서 7개 (97 KB)
- E2E 테스트 177개
- 배포 체크리스트 71개

---

## 다음 버전 계획

### v2.9.0 - 안정화 (진행 중)
- SDD 문서 작성 완료
- 빌드 최적화 (chunkSizeWarningLimit)
- 문서 정리

### v3.0.0 (예정 - 사용자 승인 필요)
**후보 기능**:
- 대규모 아키텍처 변경
- Breaking Changes 발생 시
- 새로운 핵심 기능 대규모 추가

---

## 관련 문서

- [changelog.md](./changelog.md) - 상세 변경 로그
- [roadmap.md](./roadmap.md) - 로드맵
- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 메인 문서
- [project-todo.md](../../project-todo.md) - TODO 목록

---

**최종 업데이트**: 2025-11-23 KST
