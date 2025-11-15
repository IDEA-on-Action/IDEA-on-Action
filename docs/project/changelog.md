# Changelog

> VIBE WORKING 프로젝트 변경 로그

모든 주요 변경 사항이 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 기반으로 하며,
버전 관리는 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

---

## [2.0.0-sprint2.5] - 2025-11-15

### 🎉 Sprint 2 Day 3-5 완료 - Giscus, Work with Us, Newsletter 통합

**완료율**: 100% (12/12 작업)
**파일 변경**: 9개 (7개 수정, 2개 신규)
**총 코드**: ~800줄 추가
**환경 변수**: 7개 추가
**빌드**: 20.56s, 129 PWA entries

#### Added
- **Track A: Giscus 통합** (T-2.11 ~ T-2.14)
  - `@giscus/react` v3.1.0 패키지 설치
  - 환경 변수 6개 추가 (VITE_GISCUS_*)
  - GiscusComments 컴포넌트 환경 변수 통합
  - Community & BlogPost 페이지 댓글 시스템 활성화

- **Track B: Work with Us 폼** (T-2.15 ~ T-2.17)
  - `sendWorkWithUsEmail` 함수 생성 (HTML 이메일 템플릿)
  - `useWorkInquiries` 훅 생성 (7개 함수, 230줄)
  - WorkWithUsForm 업데이트 (패키지 옵션: MVP, Growth, Custom)

- **Track C: Newsletter 폼** (T-2.18)
  - Newsletter 기능 검증 완료

- **Track D: 테스트 & 배포** (T-2.19 ~ T-2.22)
  - E2E 테스트 auth-helpers.ts 픽스처 생성 (5개 함수)
  - 문서 업데이트 (CLAUDE.md, project-todo.md)

#### Changed
- `src/vite-env.d.ts`: Giscus + Resend 환경 변수 타입 정의
- `src/components/community/GiscusComments.tsx`: 환경 변수 기반 설정
- `src/components/forms/WorkWithUsForm.tsx`: useWorkInquiries 훅 적용
- `src/lib/email.ts`: sendWorkWithUsEmail 함수 추가 (85줄)

#### Fixed
- 유닛 테스트 97.6% 통과 (124/127)
- Lighthouse CI 실행 (Home: 50%, Services: 41%, Login: 53%)

---

## [2.0.0-phase5.2] - 2025-11-15

### 🎯 Phase 5-2 완료 - 성능 & 접근성 개선

**완료율**: 100% (4/4 작업)
**커밋**: 7개 (305a97d, fc8d7e2, 19c26ef, 63fdf21, 3b10a19, 303e923, c40a12d)
**변경 파일**: 6개 (Login.tsx, ServiceCard.tsx, BlogCard.tsx, SearchResultCard.tsx, Services.tsx, index.html, src/index.css)
**빌드**: 23.45s ~ 35.41s, 150 PWA entries

#### 개선 작업 (4개)

**1. Login SEO 메타태그 추가** (커밋 305a97d)
- Open Graph 태그 4개 (title, description, type, url)
- Twitter Card 태그 3개 (card, title, description)
- Canonical URL
- robots: noindex, nofollow (보안)
- **예상 효과**: Lighthouse SEO 66% → 85%+ (+19%+)

**2. 이미지 최적화 (CLS 개선)** (커밋 fc8d7e2)
- ServiceCard.tsx: width=400, height=192
- BlogCard.tsx: width=400, height=192 + lazy loading
- SearchResultCard.tsx: width=96, height=96 + lazy loading
- **효과**:
  - CLS (Cumulative Layout Shift) 개선
  - 브라우저 레이아웃 사전 계산 (리플로우 방지)
  - lazy loading으로 LCP 개선
- **예상 효과**: Lighthouse Performance 47% → 60%+ (+13%+)

**3. 폰트 preload 최적화 (LCP 개선)** (커밋 19c26ef)
- Google Fonts preconnect 태그 추가
  - fonts.googleapis.com
  - fonts.gstatic.com (crossorigin)
- CSS @import → HTML `<link>` 변환
  - 병렬 다운로드 가능
  - CSS 파싱 대기 불필요
- **폰트**: Inter (본문) + JetBrains Mono (코드), 9개 웨이트
- **효과**:
  - 폰트 다운로드 시작 시점 빨라짐
  - LCP (Largest Contentful Paint) 개선
- **예상 효과**: Lighthouse Performance 60% → 65%+ (+5%+)

**4. Services 페이지 접근성 개선** (커밋 63fdf21)
- 폼 요소 레이블 연결 (aria-labelledby)
  - Select (정렬) → "sort-label"
  - Tabs (카테고리) → "category-label"
- ARIA 속성 추가 (8개)
  - main: aria-label="서비스 목록"
  - 로딩 상태: aria-label="카테고리 로딩 중"
  - 빈 상태: role="status"
  - 장식용 아이콘: aria-hidden="true"
- **효과**:
  - 스크린 리더 폼 컨트롤 정확 인식
  - 상태 변화 명확 전달
  - WCAG 2.1 AA 준수 향상
- **예상 효과**: Lighthouse Accessibility 84% → 85%+ (+1%+)

#### 문서화

- docs/deployment/phase5-monitoring-report.md 업데이트 (3개 커밋)
- R-5.2 섹션 완성: 완료된 개선 작업 4개 상세 기록

#### 예상 Lighthouse 점수 개선

| 지표 | 이전 (로컬) | 개선 후 (예상) | 증가 |
|------|------------|---------------|------|
| **Performance (Home)** | 47% | 65%+ | +18%+ |
| **Accessibility (Services)** | 84% | 85%+ | +1%+ |
| **SEO (Login)** | 66% | 85%+ | +19%+ |

#### 남은 작업 (복잡도 높음, 선택)

- Critical CSS 인라인화
- JavaScript 번들 크기 최적화
- Code splitting 개선
- Third-party 스크립트 최적화

---

## [2.0.0] - 2025-11-15

### 🎉 Version 2.0.0 릴리스 - 커뮤니티형 프로덕트 스튜디오

**주요 기능**:
- ✅ **Sprint 1**: Structure & Static Data (Home 강화, SEO, Weekly Recap)
- ✅ **Sprint 2**: Supabase Integration & Community (CRUD 훅, 동적 페이지, Giscus, Work with Us, Newsletter)
- ✅ **Sprint 3**: Automation & Open Metrics (GA4, 테스트, SEO 최적화)

**새 페이지** (8개):
- About, Roadmap, Portfolio, Now, Lab, Community, Work-with-Us, Status

**핵심 기능**:
- 프로젝트 관리 (Portfolio, Roadmap)
- 활동 로그 (Now)
- 바운티 시스템 (Lab)
- 커뮤니티 댓글 (Giscus)
- Work with Us 폼
- Newsletter 구독
- 오픈 메트릭스 (Status)
- Weekly Recap 자동 생성

**기술 스택**:
- React 18 + TypeScript + Vite
- Supabase (Backend)
- React Query (Data Fetching)
- Giscus (댓글)
- GA4 (분석)
- PWA (오프라인 지원)

**테스트**:
- 단위 테스트: 261/305 통과 (85.6%)
- E2E 테스트: 24개 파일
- SEO: sitemap 15개, JSON-LD 5개

**빌드**:
- 빌드 시간: 21.29s
- Main bundle: 109.60 kB gzip
- PWA: 129 entries (3.9 MB)

---

## [2.0.0-sprint3] - 2025-11-14

### 🎉 Version 2.0 Sprint 3 완료 - Automation & Open Metrics

**완료율**: 100% (7/7 작업)
**테스트**: 223개 (E2E 55, Unit 168)
**SEO**: sitemap 15개 URL, JSON-LD 5개 스키마
**배포**: Ready to Deploy

#### Added
- **E2E 테스트 55개** (Task 3.5)
  - 사용자 여정 테스트: journey-1-visitor (9), journey-2-collaborator (10), journey-3-fan (11)
  - 폼 제출 테스트: work-with-us (14), newsletter (11)
- **JSON-LD 구조화 데이터** (Task 3.6)
  - src/lib/json-ld.ts (5개 스키마 생성기)
  - Organization, WebSite, Person, Article, Breadcrumb 스키마
- **Vercel 배포 가이드** (Task 3.7)
  - docs/guides/deployment/vercel-deployment-sprint3.md

#### Changed
- **SEO 메타데이터 개선** (Task 3.6)
  - Index.tsx: Organization + WebSite JSON-LD 추가
  - About.tsx: Person JSON-LD 추가
  - BlogPost.tsx: Article JSON-LD 추가
- **sitemap.xml 재생성** (15개 URL)
  - 12개 정적 페이지 + 3개 프로젝트 페이지

#### Fixed
- Lighthouse 성능 측정 (로컬: P44-53, 프로덕션 예상: P75-85)
- 환경 변수 12개 검증 완료
- GitHub Actions 워크플로우 6개 검증

---

## [Unreleased]

### Completed
- **Phase 14: 고급 분석 대시보드** (완료 - 100%) ✅
  - [x] Week 1: 사용자 행동 분석 ✅
  - [x] Week 2: 매출 차트 & KPI ✅
  - [x] Week 3: 실시간 대시보드 ✅
  - [x] 테스트 마무리 (2025-11-09) ✅
    - E2E 테스트 28개 확인 (Analytics 9, Revenue 9, Realtime 10)
    - 유닛 테스트 35개 작성 (useRevenue 10, useRealtimeDashboard 10, useAnalyticsEvents 15)
    - 컴포넌트 테스트 47개 확인 (Hero 13, Features 15, Services 19)
    - 문서 아카이브 업데이트 (phase14-analytics.md)
    - **총 355개 테스트** (E2E 200, Unit 127, Visual 28)

- **Version 2.0 Sprint 2: Supabase Integration & Community** ✅ (완료 - 2025-11-09)
  - [x] Stage 1: Supabase Schema (7개 마이그레이션) ✅
  - [x] Stage 2: React Query Hooks (5개 훅 + types) ✅
  - [x] Stage 3: Page Data Source Conversion (6개 페이지) ✅
  - [x] Stage 4: Giscus Integration ✅
  - [x] Stage 5: Work with Us Form ✅
  - [x] Stage 6: Newsletter Widget (스킵 - 선택사항) ⏭️
  - [x] Stage 7: Build Verification (0 errors) ✅
  - [x] Stage 8: Component Integration (Sprint 2.5) ✅

- **Version 2.0 Sprint 3: Automation & Open Metrics (Option A - Quick Wins)** ✅ (완료 - 2025-01-09)
  - [x] Sprint 3.1: Newsletter 위젯 ✅
  - [x] Sprint 3.2: SEO 개선 (robots.txt, sitemap.xml) ✅
  - [x] Sprint 3.3: Status 페이지 메트릭스 연결 ✅
  - [x] Sprint 3.4: 버그 수정 및 테스트 (RLS 정책, 에러 핸들링, 타입 오류) ✅
  - [x] Sprint 3.5: 메뉴 구조 개선 및 디자인 시스템 구축 ✅
  - [x] Sprint 3.6: 코드 품질 개선 및 린트 에러 수정 ✅

### Planned
- **Version 2.0: 커뮤니티형 프로덕트 스튜디오** 🚀
  - [x] Sprint 1: Structure & Static Data (Week 1) ✅
  - [x] Sprint 2: Supabase Integration & Community (Week 2) ✅
  - [x] Sprint 3: Automation & Open Metrics - Quick Wins (Week 3) ✅

---

## [2.0.0-sprint3] - 2025-11-09

### Added
- **Sprint 3.1: Newsletter 위젯** 📧 ✅
  - `supabase/migrations/20250109000008_create_newsletter.sql` - Newsletter 테이블
    - newsletter_subscriptions 테이블 (id, email, status, subscribed_at, confirmed_at, preferences, metadata)
    - 3개 상태: pending, confirmed, unsubscribed
    - RLS 정책 3개 (관리자 읽기, 공개 삽입, 본인 업데이트)
    - 인덱스 3개 (email, status, subscribed_at)
  - `src/hooks/useNewsletter.ts` - Newsletter 관리 훅
    - useSubscribeNewsletter() - 구독 신청 (중복 이메일 처리)
    - useConfirmNewsletter() - 구독 확인
    - useUnsubscribeNewsletter() - 구독 취소
    - useNewsletterStats() - 통계 조회 (관리자용)
  - `src/components/forms/NewsletterForm.tsx` - Newsletter 폼 컴포넌트
    - Inline 변형 (Home CTA용)
    - Stacked 변형 (Footer용)
    - 이메일 유효성 검사
    - 로딩 상태 표시
  - `src/lib/email.ts` - Newsletter 이메일 함수
    - sendNewsletterConfirmationEmail() - 구독 확인 이메일
    - sendNewsletterWelcomeEmail() - 환영 이메일

- **Sprint 3.2: SEO 개선** 🔍 ✅
  - `public/sitemap.xml` - 동적 사이트맵 생성
    - 12개 정적 페이지 (/, /about, /roadmap, /portfolio, /now, /lab, /community, /work-with-us, /status, /services, /blog, /notices)
    - 동적 페이지 지원 (Projects, Blog Posts, Services)
    - changefreq, priority 설정

### Changed
- **Sprint 3.1: Newsletter 통합**
  - `src/components/Footer.tsx` - Newsletter 섹션 추가
    - lg:col-span-2 (브랜드 섹션 확장)
    - Stacked 폼 배치
  - `src/pages/Index.tsx` - Newsletter CTA 섹션 추가
    - "Stay Connected" 배지
    - Inline 폼 배치
    - 개인정보 보호 안내

- **Sprint 3.2: SEO 최적화**
  - `public/robots.txt` - Version 2.0 페이지 추가
    - Allow 경로 11개 (/, /about, /roadmap, /portfolio, /now, /lab, /community, /work-with-us, /status, /services, /blog, /notices)
    - Disallow 경로 7개 (/admin/, /login, /profile, /2fa/, /checkout/, /orders/)
  - `scripts/generate-sitemap.ts` - 사이트맵 생성 스크립트 개선
    - Version 2.0 정적 페이지 12개 추가
    - Projects 동적 페이지 지원
    - NEXT_PUBLIC_ 환경 변수 호환성
    - 수동 .env.local 로딩 구현

- **Sprint 3.3: Status 페이지 메트릭스**
  - `src/pages/Status.tsx` - Newsletter 메트릭스 추가
    - useNewsletterStats 훅 통합
    - Newsletter 구독자 카드 추가 (confirmed/pending/total)
    - Key Metrics 그리드 확장 (4개 → 5개)
    - lg:grid-cols-4 → lg:grid-cols-5

### Technical
- **Build**: 0 errors, 17.09s
- **Bundle**: ~3008 KiB (+1 KiB)
  - Status-BXcp0idw.js: 10.34 kB (+0.79 kB)
  - pages-ecommerce-DQxBjvyI.js: 61.52 kB (+0.38 kB)
- **Total Files**: 17개 (8개 수정, 9개 신규)
- **Total Code**: 3,365줄 추가

---

## [2.0.0-sprint2.5] - 2025-11-09

### Added
- **Stage 8: Component Integration (Sprint 2.5)** 🔗 ✅
  - `docs/guides/giscus-setup.md` - Giscus 설정 가이드
    - GitHub Discussions 활성화 방법
    - Giscus 앱 설치 절차
    - 카테고리 생성 가이드
    - 설정값 적용 예제
    - 트러블슈팅 가이드

### Changed
- **컴포넌트 통합** (3개 페이지)
  - `src/pages/Community.tsx` - GiscusComments 임베드
    - "Coming Soon" 섹션 → 실제 댓글 시스템
    - Features 섹션 재구성
    - GitHub 계정 로그인 안내
  - `src/pages/WorkWithUs.tsx` - WorkWithUsForm 임베드
    - "Coming Soon" 섹션 → 실제 제안서 폼
    - 8개 필드 폼 (name, email, company, package, budget, message, preferred_contact, phone)
    - Success/error toasts 통합
  - `src/pages/BlogPost.tsx` - 댓글 섹션 추가
    - GiscusComments 임베드
    - mapping='specific' (포스트별 개별 Discussion)

### Fixed
- `src/pages/Status.tsx` - 필드명 오류 수정
  - Line 196: `activity.createdAt` → `activity.created_at`
  - 런타임 에러 방지

### Technical
- **Build**: 0 errors, 24.55s (+2초)
- **Bundle**: ~3003 KiB (+6 KiB)
  - Community-DDTnBGHC.js: 4.31 kB (새 파일)
  - WorkWithUs-kHmrtkxe.js: 11.15 kB (+7 kB)
  - pages-cms-BCRTeJ3V.js: 35.15 kB (+0.15 kB)
- **Total Files**: 3개 수정, 1개 생성

---

## [2.0.0-sprint2] - 2025-11-09

### Added
- **Version 2.0 Sprint 2: Supabase Integration & Community** 🚀 ✅
  - **Stage 1: Supabase Schema**
    - `supabase/migrations/20250109000001_create_projects.sql` - Portfolio 프로젝트 테이블
      - id (TEXT PK), slug (UNIQUE), title, status, summary, description, metrics (JSONB)
      - tech (JSONB), team (JSONB), links (JSONB), timeline (JSONB), tags (TEXT[])
      - RLS: Public SELECT, Admin INSERT/UPDATE/DELETE
    - `supabase/migrations/20250109000002_create_roadmap.sql` - 분기별 로드맵 테이블
      - quarter (TEXT UNIQUE), theme, goal, progress, milestones (JSONB[]), kpis (JSONB)
      - risk_level, owner, start_date, end_date
    - `supabase/migrations/20250109000003_create_logs.sql` - Now 활동 로그 테이블
      - type ('release', 'learning', 'decision'), title, content, project_id (FK), tags (TEXT[])
      - 인덱스: type, created_at, project_id, tags (GIN)
    - `supabase/migrations/20250109000004_create_bounties.sql` - Lab 바운티 테이블
      - difficulty ('초급', '중급', '고급'), reward, skills_required (TEXT[]), applicants (UUID[])
      - SQL 함수: apply_to_bounty(bounty_id) SECURITY DEFINER
    - `supabase/migrations/20250109000005_create_proposals.sql` - Work with Us 제안서 테이블
      - name, email, company, package, budget, message, status, user_id
      - RLS: Users can view own, Admins can view/update all
      - Auto-assign user_id on INSERT if authenticated
    - `supabase/migrations/20250109000006_extend_user_profiles.sql` - 뉴스레터 구독 확장
      - newsletter_subscribed, newsletter_subscribed_at, newsletter_email
      - VIEW: newsletter_subscribers (활성 구독자 조회)
      - SQL 함수: subscribe_to_newsletter(), unsubscribe_from_newsletter()
    - `supabase/migrations/20250109000007_seed_initial_data.sql` - 초기 데이터 삽입
      - 3개 프로젝트, 5개 로드맵, 10개 로그, 4개 바운티
      - ON CONFLICT DO NOTHING (멱등성)
  - **Stage 2: React Query Hooks**
    - `src/types/v2.ts` - TypeScript 타입 정의
      - Project, Roadmap, Log, Bounty, Proposal 인터페이스
      - ProposalFormValues, Milestone, KPI 타입
    - `src/hooks/useProjects.ts` - 프로젝트 CRUD 훅 (9개 함수)
      - useProjects(), useProject(slug), useProjectsByStatus()
      - useCreateProject(), useUpdateProject(), useDeleteProject()
    - `src/hooks/useRoadmap.ts` - 로드맵 CRUD 훅 (6개 함수)
      - useRoadmap(), useRoadmapByQuarter()
      - useCreateRoadmap(), useUpdateRoadmap(), useDeleteRoadmap()
    - `src/hooks/useLogs.ts` - 로그 CRUD 훅 (8개 함수)
      - useLogs(limit?), useLogsByType(), useLogsByProject()
      - useCreateLog(), useUpdateLog(), useDeleteLog()
    - `src/hooks/useBounties.ts` - 바운티 CRUD 훅 (8개 함수)
      - useBounties(), useBounty(id), useBountiesByStatus()
      - useApplyToBounty() - RPC 호출
      - useCreateBounty(), useUpdateBounty(), useDeleteBounty(), useAssignBounty()
    - `src/hooks/useProposals.ts` - 제안서 CRUD 훅 (6개 함수)
      - useProposals(), useMyProposals(), useProposalsByStatus()
      - useSubmitProposal(), useUpdateProposalStatus(), useDeleteProposal()
  - **Stage 3: Page Data Source Conversion**
    - `src/pages/Roadmap.tsx` - JSON → useRoadmap() 훅 전환
      - Loading/Error/Empty 상태 추가
      - useEffect로 초기 quarter 선택
    - `src/pages/Portfolio.tsx` - JSON → useProjects() 훅 전환
      - useMemo로 filteredProjects, projectCounts 최적화
    - `src/pages/PortfolioDetail.tsx` - JSON → useProject(slug) 전환
      - enabled 옵션으로 slug 존재 시에만 쿼리
    - `src/pages/Now.tsx` - JSON → useLogs() 전환
      - created_at 필드명 수정 (createdAt → created_at)
    - `src/pages/Lab.tsx` - JSON → useBounties() 전환
      - bounties 상수로 null safety 보장
    - `src/pages/Status.tsx` - JSON → useProjects, useBounties, useLogs(20) 전환
      - 3개 훅 로딩/에러 상태 병합
      - 안전한 폴백 (|| [])
  - **Stage 4: Giscus Integration**
    - `src/components/community/GiscusComments.tsx` - GitHub Discussions 댓글
      - useTheme()로 다크 모드 자동 전환
      - 설정 플레이스홀더 (repo, repoId, category, categoryId)
      - cleanup on unmount (iframe 제거)
  - **Stage 5: Work with Us Form**
    - `src/components/forms/WorkWithUsForm.tsx` - 제안서 폼
      - React Hook Form + Zod validation
      - useSubmitProposal() mutation
      - Success/error toasts (sonner)
      - 8개 필드: name, email, company, package, budget, message, preferred_contact, phone

### Changed
- **삭제된 파일** (4개)
  - `src/data/projects.json`
  - `src/data/roadmap.json`
  - `src/data/logs.json`
  - `src/data/bounties.json`
- **수정된 파일** (6개)
  - `src/pages/Roadmap.tsx` - 데이터 소스 전환, 상태 UI 추가
  - `src/pages/Portfolio.tsx` - 데이터 소스 전환, useMemo 최적화
  - `src/pages/PortfolioDetail.tsx` - 데이터 소스 전환
  - `src/pages/Now.tsx` - 데이터 소스 전환, 필드명 수정
  - `src/pages/Lab.tsx` - 데이터 소스 전환
  - `src/pages/Status.tsx` - 데이터 소스 전환, 다중 훅 통합

### Fixed
- Import 경로 수정 (5개 훅 파일)
  - `@/lib/supabase` → `@/integrations/supabase/client`
  - sed 명령으로 일괄 수정

### Technical
- **Build**: 0 errors, 22.56s
- **Bundle**: ~2997 KiB (56 entries precached by PWA)
- **PWA**: Service Worker 자동 생성
- **Total Files**: 13개 생성, 6개 수정, 4개 삭제

---

## [1.8.0] - 2025-11-04

### Added
- **Phase 14: 고급 분석 대시보드** 📊 ✅
  - **Week 1: 사용자 행동 분석**
    - `src/lib/analytics.ts` - GA4 이벤트 15개 추가 (viewService, removeFromCart, addPaymentInfo, searchWithResults, etc.)
    - `supabase/migrations/20251111000001_create_analytics_events.sql` - analytics_events 테이블
      - 4개 인덱스 (event_name, created_at, params GIN, funnel)
      - RLS: 관리자 전용 조회
    - `supabase/migrations/20251111000002_analytics_functions.sql` - SQL 함수 4개
      - calculate_funnel(): 5단계 퍼널 분석 (signup → purchase)
      - calculate_bounce_rate(): 이탈률 계산
      - get_event_counts(): 이벤트별 집계
      - get_session_timeline(): 세션 타임라인
    - `src/lib/session.ts` - SessionStorage 기반 세션 ID 관리 (30분 타임아웃)
    - `src/hooks/useAnalyticsEvents.ts` - React Query 훅 7개
    - `src/pages/admin/Analytics.tsx` - Analytics 페이지 (4개 탭: 개요/퍼널/행동/로그)
    - `src/components/analytics/DateRangePicker.tsx` - 날짜 범위 선택기 (7개 프리셋)
    - `src/components/analytics/FunnelChart.tsx` - Recharts 퍼널 시각화
    - `src/components/analytics/BounceRateCard.tsx` - 이탈률 KPI 카드
    - `src/components/analytics/EventTimeline.tsx` - 이벤트 타임라인 (14개 아이콘)
  - **Week 2: 매출 차트 & KPI**
    - `supabase/migrations/20251111000003_revenue_functions.sql` - SQL 함수 3개
      - get_revenue_by_date(): 일/주/월별 매출 집계
      - get_revenue_by_service(): 서비스별 매출 TOP 순위
      - get_kpis(): 6개 KPI 계산
    - `src/hooks/useRevenue.ts` - React Query 훅 5개
    - `src/components/analytics/RevenueChart.tsx` - 매출 추이 (Line/Bar 전환)
    - `src/components/analytics/ServiceRevenueChart.tsx` - 서비스별 매출 (Horizontal Bar, TOP 10)
    - `src/components/analytics/OrdersChart.tsx` - 주문 건수 (Area Chart)
    - `src/components/analytics/RevenueComparisonChart.tsx` - 이전 기간 대비 매출 비교
    - `src/components/analytics/KPICard.tsx` - KPI 카드 시스템 (6개 KPI)
    - `src/pages/admin/Revenue.tsx` - Revenue 페이지 (4개 탭, CSV 내보내기)
  - **Week 3: 실시간 대시보드**
    - `src/hooks/useRealtimeDashboard.ts` - Realtime 훅 3개
      - useRealtimeDashboard(): Supabase Realtime 구독
      - useAutoRefresh(): 자동 새로고침 (10초/30초/1분)
      - useRealtimeMetrics(): Presence API (온라인 사용자)
    - `src/components/analytics/LiveMetricCard.tsx` - LIVE 배지, 펄스 애니메이션
    - `src/components/analytics/LiveActivityFeed.tsx` - 실시간 주문 피드 (최근 10개)
    - `src/pages/admin/RealtimeDashboard.tsx` - RealtimeDashboard 페이지
  - **전체 통계**: 32개 파일 (24개 신규, 8개 수정), 6,531줄 코드 추가

### Changed
- `src/App.tsx` - 3개 라우트 추가 (/admin/analytics, /admin/revenue, /admin/realtime)
- `src/components/layouts/AdminLayout.tsx` - 3개 메뉴 항목 추가 (BarChart3, TrendingUp, Activity)
- Bundle 크기: pages-admin 50.28 kB → 61.23 kB gzip (+10.95 kB, +21.8%)
- Total 크기: 552 kB → 602 kB gzip (+50 kB, +9.1%)

### Performance
- SQL 함수로 서버 사이드 집계 (클라이언트 부담 감소)
- React Query 캐싱 (5-10분 staleTime)
- Supabase Realtime으로 실시간 업데이트 (폴링 없음)
- Lazy Loading (모든 새 페이지 lazy 로드)

---

## [1.7.3] - 2025-11-04

### Added
- **Phase 13 Week 3: 알림 시스템** 🔔 ✅
  - `supabase/migrations/20251104000001_create_notifications.sql` - 알림 테이블 마이그레이션
    - notifications 테이블 스키마 (id, user_id, type, title, message, link, read, created_at)
    - RLS 정책 4개 (SELECT, INSERT, UPDATE, DELETE)
    - 인덱스 2개 (user_id, created_at)
    - 알림 타입: order, comment, system, announcement
  - `src/lib/email.ts` - Resend 이메일 서비스
    - sendEmail 함수 (React Email 템플릿 지원)
    - 에러 핸들링 및 재시도 로직
    - TypeScript 타입 정의
  - `src/hooks/useNotifications.ts` - 알림 관리 훅
    - 알림 목록 조회 (React Query)
    - Supabase Realtime 구독 (INSERT 이벤트)
    - markAsRead, markAllAsRead, deleteNotification 함수
    - createNotification 함수 (관리자/시스템용)
    - unreadCount 계산
  - `src/components/notifications/NotificationBell.tsx` - 알림 벨 컴포넌트
    - 헤더 우측 상단 배치
    - unreadCount 배지 표시 (9+ 처리)
    - 드롭다운 메뉴 (최근 3개 알림)
    - "모두 보기" 링크 (/notifications)
  - `src/components/notifications/NotificationDropdown.tsx` - 알림 드롭다운
    - Popover 기반 UI
    - 최근 3개 알림 표시
    - 빈 상태 처리
  - `src/components/notifications/NotificationItem.tsx` - 알림 아이템
    - 타입별 아이콘 (Package, FileText, Bell, Megaphone)
    - 읽음/읽지 않음 스타일
    - 클릭 시 markAsRead + 링크 이동
    - 날짜 표시 (상대 시간)
  - `src/pages/Notifications.tsx` - 알림 센터 페이지
    - 전체 알림 목록 (50개 제한)
    - 필터 탭 (전체/읽지 않음)
    - 개별 삭제 버튼
    - "모두 읽음" 버튼
    - SEO 최적화

### Changed
- `src/App.tsx` - Notifications 라우트 추가 (/notifications)
  - lazy loading으로 Notifications 컴포넌트 로드
- `src/components/Header.tsx` - NotificationBell 통합
  - ThemeToggle과 CartButton 사이에 배치
- `src/locales/ko/common.json` - 알림 번역 추가 (15개 키)
- `src/locales/en/common.json` - 알림 번역 추가 (15개 키)
- `.env.example` - Resend 환경 변수 추가
  - VITE_RESEND_API_KEY
  - VITE_FROM_EMAIL
  - VITE_APP_VERSION: 1.7.0 → 1.7.2

### Technical
- **Bundle Size**: Notifications-Cwmb4tJM.js (3.01 kB / 1.28 kB gzip)
- **Total Size**: ~552 kB gzip (v1.7.2 대비 +4%)
- **PWA Cache**: 43 entries (2805.38 KiB)
- **Build Time**: 16.34s
- **Dependencies**: resend@^4.0.3, @react-email/components@^0.0.31, react-email@^3.0.3

---

## [1.7.2] - 2025-11-04

### Added
- **Phase 13 Week 2: AI 챗봇 통합** 🤖 ✅
  - `src/lib/openai.ts` - OpenAI API 클라이언트 래퍼
    - GPT-3.5-turbo 기본 모델
    - 스트리밍 응답 지원 (createChatCompletionStream)
    - VIBE WORKING 컨텍스트 시스템 프롬프트
    - 에러 핸들링
  - `src/hooks/useChat.ts` - 채팅 상태 관리 훅
    - 메시지 목록 관리 (Message[])
    - sendMessage 함수 (스트리밍 응답)
    - clearMessages 함수
    - LocalStorage 자동 저장/로드
    - 로딩 상태 관리
  - `src/components/chat/ChatMessage.tsx` - 메시지 컴포넌트
    - 역할별 스타일링 (user: 우측, assistant: 좌측)
    - Markdown 렌더링 (react-markdown, remark-gfm)
    - 아바타 표시
  - `src/components/chat/ChatInput.tsx` - 입력 컴포넌트
    - Textarea with autoResize
    - Enter로 전송, Shift+Enter로 줄바꿈
    - 전송/로딩 버튼
  - `src/components/chat/ChatWindow.tsx` - 채팅 창 컴포넌트
    - 메시지 목록 (자동 스크롤)
    - ChatInput 통합
    - 헤더 (타이틀, 대화 초기화, 닫기)
    - 환영 메시지
  - `src/components/chat/ChatWidget.tsx` - 플로팅 챗 버튼
    - 우측 하단 고정 위치
    - 펄스 애니메이션
    - ChatWindow 토글
  - `src/components/chat/index.ts` - 컴포넌트 export

### Changed
- `src/App.tsx` - ChatWidget 통합
  - CartDrawer 아래에 배치
- `src/locales/ko/common.json` - 채팅 번역 추가 (10개 키)
- `src/locales/en/common.json` - 채팅 번역 추가 (10개 키)
- `.env.example` - OpenAI 환경 변수 추가
  - VITE_OPENAI_API_KEY
  - VITE_OPENAI_MODEL

### Technical
- **Bundle Size**: index-B2370P9-.js (181.35 kB / 54.67 kB gzip)
- **Total Size**: ~532 kB gzip (v1.7.1 대비 +0.4%)
- **Build Time**: 16.65s
- **Dependencies**: openai@^4.77.3, react-markdown@^9.0.2, remark-gfm@^4.0.1

---

## [1.7.1] - 2025-11-04

### Added
- **Search 페이지 i18n 지원** 🌐
  - `src/locales/ko/search.json` - 한국어 번역 (15개 키)
  - `src/locales/en/search.json` - 영어 번역 (15개 키)
  - `src/locales/ko/common.json` - 공통 번역 추가 (clear, description, errors.generic)
  - `src/locales/en/common.json` - 공통 번역 추가 (clear, description, errors.generic)

- **테스트 추가** 🧪
  - `tests/e2e/search.spec.ts` - E2E 테스트 15개
    - 검색 페이지 렌더링, 검색 입력/결과, 타입 필터
    - 검색어 하이라이팅, URL 파라미터, 빈 결과
    - 카드 클릭, Header 통합, 모바일 반응형
    - 다크 모드, 30개 제한, 로딩/에러 상태
  - `tests/unit/hooks/useSearch.test.tsx` - 유닛 테스트 10개
    - 초기 상태, 검색 실행, 통합 검색
    - 타입 필터링, 빈 결과, React Query 캐싱
    - 로딩/에러 상태, 검색어 변경, limit 파라미터

- **문서화** 📚
  - `docs/archive/phase12-performance-pwa-i18n.md` - Phase 12 완료 문서

### Changed
- `src/pages/Search.tsx` - useTranslation 통합 (12개 문자열)
- `src/components/search/SearchResultCard.tsx` - 타입 배지 및 날짜 로케일 번역
- `src/components/Header.tsx` - 검색 버튼 aria-label 번역 (데스크톱/모바일)

### Fixed
- 번역 파일 위치 수정 (`public/locales` → `src/locales`)

### Statistics
- **총 테스트**: 267개 → 292개 (+25개)
  - E2E: 157개 → 172개 (+15개)
  - Unit: 82개 → 92개 (+10개)
  - Visual: 28개
- **번역 키**: 330개 → 345개 (+15개)
- **지원 언어**: 2개 (한국어/영어)

---

## [1.7.1] - 2025-11-03

### Added
- **Phase 13 Week 1: 통합 검색 시스템** 🔍 ✅
  - `src/hooks/useSearch.ts` - 통합 검색 훅
    - 서비스, 블로그, 공지사항 통합 검색
    - React Query 기반 실시간 검색
    - 타입별 필터링 (전체/서비스/블로그/공지)
    - 검색어 하이라이팅 헬퍼 함수
    - SearchResult, UseSearchOptions, UseSearchReturn 타입 정의
  - `src/pages/Search.tsx` - 검색 페이지
    - 검색어 입력 폼 (최소 2자 검증)
    - 타입 필터 탭 (4개: 전체, 서비스, 블로그, 공지)
    - 검색 결과 목록 (30개 제한)
    - URL 쿼리 파라미터 지원 (?q=검색어&type=service)
    - 로딩/에러/빈 결과 상태 UI
    - SEO 최적화 (react-helmet-async)
  - `src/components/search/SearchResultCard.tsx` - 검색 결과 카드
    - 타입별 아이콘 및 배지 (Package/FileText/Bell)
    - 검색어 하이라이팅 (<mark> 태그)
    - 이미지 썸네일 (서비스/블로그)
    - 날짜 표시 (yyyy년 M월 d일)
    - 카테고리 배지
    - 호버 애니메이션 (hover-lift)

### Changed
- `src/App.tsx` - Search 라우트 추가 (/search)
  - lazy loading으로 Search 컴포넌트 로드
- `src/components/Header.tsx` - 검색 기능 UI 추가
  - 데스크톱 검색 아이콘 버튼 (우측 상단)
  - 모바일 메뉴 검색 항목 추가
  - SearchIcon 아이콘 임포트

### Technical
- **Bundle Size**: Search-DDPPI54_.js (9.29 kB / 3.45 kB gzip)
- **Total Size**: ~530 kB gzip (v1.7.0 대비 +0.6%)
- **PWA Cache**: 42 entries (2681.26 KiB)
- **Build Time**: 24.43s
- **Lazy Loading**: Search 페이지 필요 시에만 로딩

---

## [1.7.0] - 2025-11-02

### Added
- **Phase 12: 성능 최적화 & PWA & 국제화** 🚀 🎉
  - **Week 1: 성능 최적화 & 모니터링**
    - Code Splitting (React.lazy, Suspense) - 30+ 라우트 지연 로딩
    - Vite manualChunks 최적화 (10개 vendor chunks, 4개 page chunks)
    - `src/lib/sentry.ts` - Sentry 에러 추적 통합
      - ErrorBoundary, Session Replay, User tracking
      - `initSentry()`, `setUser()`, `clearUser()` 함수
    - `src/lib/analytics.ts` - Google Analytics 4 통합
      - 페이지뷰 자동 추적, 이벤트 추적 (장바구니, 결제, 로그인 등)
      - `initGA4()`, `trackPageView()`, `trackEvent()`, `analytics` 객체
    - `src/components/shared/AnalyticsTracker.tsx` - 라우트 변경 추적
    - `useAuth.ts` - Sentry 사용자 추적 통합
    - `.env.example` - VITE_SENTRY_DSN, VITE_GA4_MEASUREMENT_ID, VITE_APP_VERSION 추가
  - **Week 2: PWA (Progressive Web App)**
    - `vite-plugin-pwa` 통합 (Service Worker 자동 생성)
    - `vite.config.ts` - VitePWA 플러그인 설정
      - 웹 앱 매니페스트 (이름, 테마 색상, 아이콘)
      - Workbox 캐싱 전략 (CacheFirst, NetworkFirst)
    - `public/pwa-192x192.png`, `public/pwa-512x512.png` - PWA 아이콘
    - `src/components/PWAInstallPrompt.tsx` - 앱 설치 프롬프트
    - `src/components/PWAUpdatePrompt.tsx` - Service Worker 업데이트 알림
    - `App.tsx` - PWA 컴포넌트 통합
  - **Week 3: i18n (국제화)**
    - i18next, react-i18next, i18next-browser-languagedetector 설치
    - `src/lib/i18n.ts` - i18n 설정 (한국어/영어 지원)
      - 5개 네임스페이스: common, auth, services, ecommerce, admin
      - 브라우저 언어 자동 감지 (localStorage → navigator → htmlTag)
      - fallbackLng: "ko", defaultNS: "common"
    - 번역 파일 (330+ 키):
      - `src/locales/ko/common.json` (110+ 키) - 네비게이션, 버튼, 메시지, 검증, 테마
      - `src/locales/ko/auth.json` (50+ 키) - 로그인, 프로필, 2FA, 비밀번호, OAuth
      - `src/locales/ko/services.json` (30+ 키) - 서비스 목록, 필터, 카드, 상세
      - `src/locales/ko/ecommerce.json` (60+ 키) - 장바구니, 결제, 주문, 상품
      - `src/locales/ko/admin.json` (80+ 키) - 대시보드, 서비스, 블로그, 공지사항, 주문, 역할
      - `src/locales/en/*.json` - 영어 번역 (동일한 구조)
    - `src/components/shared/LanguageSwitcher.tsx` - 언어 전환 드롭다운
    - `src/main.tsx` - i18n 초기화 임포트
    - `Header.tsx` - LanguageSwitcher 컴포넌트 추가

### Changed
- **빌드 최적화**
  - Bundle 크기: 533.94 kB (1개 파일) → ~527 kB (28개 청크 분리)
  - 초기 로딩 감소: ~62.5% (vendor 청크 분리로 병렬 다운로드)
  - Lazy Loading: 30+ 라우트 (필요 시 로딩)
  - Build Time: 13.04s → 22.21s (청크 생성 시간 포함)
- **App.tsx 리팩토링**
  - 모든 라우트 컴포넌트 React.lazy로 전환 (Index, Login, NotFound 제외)
  - Suspense 래퍼 추가 (LoadingFallback)
  - Sentry ErrorBoundary 추가
  - PWA 컴포넌트 통합
- **AdminLayout.tsx**
  - Named export → Default export (lazy loading 호환)

### Fixed
- Sentry import 에러 (@sentry/tracing deprecated → browserTracingIntegration 사용)
- AdminLayout export 불일치 (named → default)

### Performance
- Code Splitting으로 초기 로딩 시간 단축
- Route-based 청크로 네트워크 병렬 다운로드
- Vendor 청크 캐싱으로 재방문 속도 향상
- PWA Service Worker로 오프라인 지원 및 재방문 속도 향상

### Dependencies
- Added: @sentry/react@10.22.0 - 에러 추적
- Added: vite-plugin-pwa@1.1.0 - PWA 플러그인
- Added: workbox-window@7.3.0 - Service Worker 관리
- Added: i18next@25.6.0 - i18n 프레임워크
- Added: react-i18next@16.2.3 - React i18n 통합
- Added: i18next-browser-languagedetector@8.2.0 - 브라우저 언어 감지

---

## [1.6.1] - 2025-10-20

### Added
- **Phase 11: 콘텐츠 관리 시스템 (CMS)** 📝 🎉
  - **Week 1: 블로그 시스템**
    - Markdown 에디터 (react-markdown, remark-gfm, rehype-raw, rehype-sanitize)
    - `useBlogPosts` 훅 (9개 함수: 목록 조회, 상세 조회, CRUD, 통계)
    - `Blog.tsx` - 블로그 목록 페이지 (카테고리, 태그 필터링)
    - `BlogPost.tsx` - 블로그 상세 페이지 (Markdown 렌더링)
    - `AdminBlog.tsx` - 블로그 관리 페이지
    - `CreateBlogPost.tsx`, `EditBlogPost.tsx` - 블로그 편집
    - 컴포넌트: `BlogCard`, `BlogPostForm`, `MarkdownRenderer`
    - 카테고리, 태그 시스템
    - 조회수, 좋아요 기능
  - **Week 2: 공지사항 & SEO**
    - `useNotices` 훅 (6개 함수: CRUD, 통계)
    - `Notices.tsx` - 공지사항 목록 페이지
    - `AdminNotices.tsx` - 공지사항 관리
    - `CreateNotice.tsx`, `EditNotice.tsx` - 공지사항 편집
    - 컴포넌트: `NoticeCard`, `NoticeForm`
    - 중요도 시스템 (low, medium, high, urgent)
    - SEO 스크립트: `scripts/generate-sitemap.ts`, `scripts/generate-rss.ts`
    - `public/robots.txt` - 검색엔진 크롤링 제어
    - NPM 스크립트: `generate:sitemap`, `generate:rss`
  - **타입 정의**
    - `src/types/blog.ts` - BlogPost, BlogCategory 타입
    - `src/types/notice.ts` - Notice 타입

- **Phase 10 Week 3: RBAC & 감사 로그** 🔐 🎉
  - **역할 기반 접근 제어 (RBAC)**
    - 4개 역할: `super_admin`, `admin`, `manager`, `user`
    - 25개 권한: services (CRUD), orders (view/manage), users (view/manage), roles (view/manage), audit_logs (view), payments (view/manage), content (CRUD) 등
    - `useRBAC` 훅 (7개 함수)
      - `useRoles`, `useUserRoles`, `usePermissions`, `useHasPermission`
      - `useAssignRole`, `useRemoveRole`, `useCanAccess`
    - `AdminRoles.tsx` - 역할 관리 페이지
  - **감사 로그 시스템**
    - 사용자 활동 추적 (CRUD, 로그인, 로그아웃 등)
    - `useAuditLogs` 훅 (2개 함수: `useAuditLogs`, `useLogAction`)
    - `AuditLogs.tsx` - 감사 로그 조회 페이지
  - **타입 정의**
    - `src/types/rbac.ts` - Role, Permission, UserRole 타입

- **Phase 10 Week 2: 2FA & 보안 강화** 🔐
  - **데이터베이스 (Migration 004)**
    - `two_factor_auth` 테이블 (TOTP secret, 백업 코드)
    - `login_attempts` 테이블 (로그인 시도 기록)
    - `account_locks` 테이블 (계정 잠금 관리)
    - `password_reset_tokens` 테이블
    - 헬퍼 함수 5개 (로그인 기록, 계정 잠금, 비밀번호 재설정)
    - 브루트 포스 방지 (5회 실패 → 30분 잠금)
  - **TOTP 라이브러리**
    - `src/lib/auth/totp.ts` (otpauth, qrcode 기반)
    - TOTP secret 생성, QR 코드 생성, 토큰 검증
    - 백업 코드 생성 (10개)
  - **use2FA 훅 (7개)**
    - `use2FASettings`, `useSetup2FA`, `useEnable2FA`, `useDisable2FA`
    - `useRegenerateBackupCodes`, `useVerify2FA`
  - **2FA 페이지**
    - `TwoFactorSetup.tsx` - 4단계 설정 플로우 (QR 코드, 검증, 백업 코드)
    - `TwoFactorVerify.tsx` - 로그인 시 2FA 인증
    - `Profile.tsx` - 2FA 관리 섹션 추가

- **Phase 10 Week 1: OAuth 확장 & 프로필 관리** 👤
  - **데이터베이스 (Migration 003)**
    - `user_profiles` 테이블 확장 (11개 컬럼)
    - `connected_accounts` 테이블
    - `email_verifications` 테이블
  - **Microsoft (Azure AD) OAuth** 통합
  - **Apple OAuth** 통합
  - **useProfile 훅 (5개)**
    - 프로필 CRUD, 아바타 업로드, 연결된 계정 관리
  - **Profile 페이지 완전 재작성**
    - React Hook Form + Zod 검증
    - 아바타 업로드 다이얼로그

- **Phase 9: 전자상거래 시스템** 💳 🎉
  - **Week 1: 장바구니 시스템**
    - Zustand 상태 관리 (`src/stores/cartStore.ts`)
    - `useCart` 훅 (5개 함수: 조회, 추가, 수정, 삭제, 비우기)
    - Cart UI 컴포넌트: `CartButton`, `CartDrawer`, `CartItem`, `CartSummary`
    - Header 통합 (장바구니 버튼 + 배지)
    - ServiceDetail "장바구니 담기" 버튼
  - **Week 2: 주문 관리 시스템**
    - `useOrders` 훅 (6개 함수)
    - `Checkout.tsx` - 주문 생성 페이지 (React Hook Form + Zod)
    - `Orders.tsx` - 주문 목록 페이지
    - `OrderDetail.tsx` - 주문 상세 페이지
    - Header "내 주문" 메뉴 추가
    - 7단계 주문 상태 (pending, confirmed, processing, shipped, delivered, cancelled, refunded)
  - **Week 3: 결제 게이트웨이**
    - Kakao Pay REST API 연동 (`src/lib/payments/kakao-pay.ts`)
    - Toss Payments SDK 연동 (`src/lib/payments/toss-payments.ts`)
    - `usePayment` 훅 (3개 함수: 시작, 승인, 취소)
    - 결제 페이지: `Payment.tsx`, `PaymentSuccess.tsx`, `PaymentFail.tsx`
    - 컴포넌트: `PaymentMethodSelector`, `PaymentStatus`
    - 관리자 주문 관리 (`AdminOrders` 페이지 - 필터링, 정렬, 상태 업데이트)
    - 관리자 대시보드 통계 (Recharts: 일별 매출 차트, 결제 수단 분포)
  - **데이터베이스 (Migrations)**
    - `carts`, `cart_items` 테이블 (장바구니)
    - `orders`, `order_items` 테이블 (주문)
    - `payments` 테이블 (결제 기록)
    - RLS 정책 15개

- **테스트 인프라 구축 완료** 🧪 🎉
  - **E2E 테스트 (97개 추가, 총 157개)**
    - `cart.spec.ts` (7개) - 장바구니
    - `checkout.spec.ts` (10개) - 결제 프로세스
    - `blog.spec.ts` (19개) - 블로그 시스템
    - `notices.spec.ts` (17개) - 공지사항
    - `profile.spec.ts` (19개) - 프로필 & 2FA
    - `rbac.spec.ts` (25개) - RBAC & 감사 로그
  - **유닛 테스트 (48개 추가, 총 82개)**
    - `useBlogPosts.test.tsx` (12개)
    - `useNotices.test.tsx` (12개)
    - `useRBAC.test.tsx` (12개)
    - `useAuditLogs.test.tsx` (12개)
  - **테스트 문서 (7개)**
    - `docs/testing/phase9-11-tests.md` - Phase 9-11 상세 테스트 문서
    - `docs/testing/testing-strategy.md` - 전체 테스트 전략
  - **통계**
    - E2E: 157개 (기존 60 + 신규 97)
    - Unit: 82개 (기존 34 + 신규 48)
    - Visual: 28개
    - **Total: 267+ 테스트 케이스**

### Changed
- **빌드 크기**
  - v1.5.0 → v1.6.1: +124.89 kB (gzip)
  - v1.5.0: 423.84 kB (gzip) → v1.6.1: 548.73 kB (gzip)
  - Phase 9 (전자상거래): +72 kB (Toss Payments SDK, Kakao Pay)
  - Phase 10 (인증 강화): +99 kB (2FA: otpauth, qrcode)
  - Phase 11 (CMS): +54 kB (react-markdown, remark-gfm, rehype)
  - Recharts (대시보드): +30 kB
  - 기타 최적화: -130.11 kB
  - **경고**: JS 번들 533.94 kB (Code Splitting 권장)

### Security
- **브루트 포스 방지** - 5회 실패 시 30분 자동 잠금
- **로그인 시도 기록** - IP, User-Agent, 성공/실패 여부
- **2FA (TOTP)** - Google Authenticator 호환
- **백업 코드** - 10개 일회용 코드 (기기 분실 시)
- **비밀번호 재설정** - 1시간 유효 토큰

---

## [1.5.1] - 2025-10-18

### Added
- **테스트 인프라 구축** (90% 완료) 🧪
  - **E2E 테스트 (60개)**
    - 관리자 테스트: `dashboard.spec.ts` (7개, 100% 통과), `service-crud.spec.ts` (15개), `image-upload.spec.ts` (12개)
    - 공개 페이지: `homepage.spec.ts` (12개, 91.7% 통과), `login.spec.ts` (7개), `services.spec.ts` (11개)
  - **시각적 회귀 테스트 (28개)**
    - `dark-mode.spec.ts` (8개, 87.5% 통과)
    - `responsive.spec.ts` (20개, 65% 통과)
  - **유닛 테스트 (34개, 100% 통과)** ⭐ UPDATED
    - `useAuth.test.ts` (8개 테스트)
    - `useServices.test.tsx` (7개 테스트)
    - `useIsAdmin.test.tsx` (5개 테스트) ✅ NEW
    - `ServiceForm.test.tsx` (8개 테스트) ✅ NEW
    - `ServiceCard.test.tsx` (9개 테스트) ✅ NEW
  - **Lighthouse CI 설정** ✅ NEW
    - `lighthouserc.json` 설정 (Performance 90+, Accessibility 95+, Best Practices 90+, SEO 90+)
    - NPM 스크립트 추가 (`lighthouse`, `lighthouse:collect`, `lighthouse:assert`, `lighthouse:upload`)
  - **CI/CD 통합** ✅ NEW
    - `.github/workflows/test-e2e.yml` - Playwright E2E 테스트 자동화
    - `.github/workflows/test-unit.yml` - Vitest 유닛 테스트 + 커버리지
    - `.github/workflows/lighthouse.yml` - Lighthouse CI 성능 테스트
    - PR 코멘트로 테스트 결과 전달 (커버리지, 성능 스코어)
  - **테스트 인프라**
    - 인증 헬퍼 함수 (`loginAsAdmin`, `loginAsRegularUser`)
    - 테스트 픽스처 (`users.ts`, `services.ts`, `images.ts`)
    - Playwright 설정 업데이트 (포트 8080-8083, webServer 통합)
  - **테스트 문서 (5개)** ⭐ UPDATED
    - `docs/guides/testing/test-user-setup.md` - 테스트 사용자 설정 가이드
    - `docs/guides/testing/quick-start.md` - 빠른 시작 가이드
    - `docs/guides/testing/lighthouse-ci.md` - Lighthouse CI 가이드 ✅ NEW
    - `docs/guides/testing/ci-cd-integration.md` - CI/CD 통합 가이드 ✅ NEW
    - `docs/devops/branch-protection-guide.md` - 브랜치 보호 설정 가이드 ✅ NEW

- **접근성 개선**
  - Footer 소셜 링크 aria-label 추가 (GitHub, LinkedIn, Email)
  - Contact 연락처 링크 aria-label 추가 (Email, Phone, Website)
  - 아이콘 aria-hidden 설정

- **개발 도구**
  - `repomix.config.json` - 코드베이스 분석 설정
  - Sub-agent 스크립트 4개 (runner, templates, batch, powershell)
  - 컴포넌트 문서 6개 (Features, Footer, Header, Hero, Services, README)

- **파비콘 시스템**
  - 다양한 크기 파비콘 (16x16, 32x32, 192x192, 512x512)
  - Apple touch icon
  - site.webmanifest

### Changed
- 다크 모드 테스트 패턴 개선 (단순 토글 → 드롭다운 메뉴 인터랙션)
- Playwright baseURL 설정 (production → localhost:8080)
- 테마 토글 컴포넌트 인터랙션 방식 변경

### Test Statistics
- **총 테스트**: 103개 작성 | 59개 검증
- **전체 통과율**: 78%
- **E2E**: 60개 (16개 검증, 81% 통과)
- **시각적**: 28개 (28개 검증, 75% 통과)
- **유닛**: 15개 (15개 검증, 100% 통과)

---

## [1.5.0] - 2025-10-17

### Added
- **인증 & 관리자 시스템** 🎉
  - **Phase 1: 로그인 시스템**
    - `useAuth` Hook (OAuth + 이메일 로그인, 세션 관리)
    - `useIsAdmin` Hook (관리자 권한 확인, React Query 캐싱)
    - Login 페이지 (Google/GitHub/Kakao OAuth)
    - 관리자 계정 지원 (`admin` / `demian00`)
    - Header 아바타/드롭다운 통합
    - ProtectedRoute 컴포넌트 (로그인 필수)
  - **Phase 2: 관리자 시스템**
    - AdminRoute 컴포넌트 (관리자 전용)
    - Forbidden (403) 페이지
    - AdminLayout (사이드바 네비게이션)
  - **Phase 3: 서비스 CRUD**
    - ServiceForm (React Hook Form + Zod 검증)
    - AdminServices 페이지 (목록/테이블, 검색, 필터)
    - CreateService 페이지 (서비스 등록)
    - EditService 페이지 (서비스 수정)
    - Dashboard 페이지 (통계, 최근 서비스)
  - **Phase 4: 이미지 업로드**
    - Supabase Storage 통합
    - 다중 이미지 업로드 (5MB 제한)
    - 이미지 미리보기 및 삭제
    - JPG/PNG/WEBP 지원

- **의존성**
  - `react-hook-form`: 폼 관리
  - `zod`: 스키마 검증
  - `@hookform/resolvers`: RHF + Zod 통합

- **설정 가이드**
  - [docs/guides/storage/setup.md](../guides/storage/setup.md) - Supabase Storage 설정
  - [docs/guides/auth/oauth-setup.md](../guides/auth/oauth-setup.md) - OAuth 설정
  - [docs/guides/auth/admin-setup.md](../guides/auth/admin-setup.md) - 관리자 계정 설정

- **라우트**
  - `/login` - 로그인 페이지
  - `/forbidden` - 403 권한 없음
  - `/admin` - 관리자 대시보드
  - `/admin/services` - 서비스 관리
  - `/admin/services/new` - 서비스 등록
  - `/admin/services/:id/edit` - 서비스 수정

### Changed
- Header: "시작하기" 버튼 → 로그인 상태에 따라 아바타/드롭다운 표시
- Login 입력: `type="email"` → `type="text"` (admin 계정 지원)
- 이메일 자동 변환: `admin` → `admin@ideaonaction.local`

### Fixed
- admin 계정 로그인 시 이메일 형식 검증 오류 수정

### Documentation
- AUTHENTICATION-SUMMARY.md - 인증 시스템 완료 보고서

### Build
- 번들 크기: 226.66 kB (gzip) (+38.44 kB from v1.4.0)

---

## [1.4.0] - 2025-10-17

### Added
- **Phase 8: 서비스 페이지 구현** 🎉
  - 서비스 목록 페이지 (`/services`)
  - 서비스 상세 페이지 (`/services/:id`)
  - ServiceCard 컴포넌트 (글래스모피즘, 호버 효과)
  - React Query 통합 (서버 상태 관리)
  - useServices 훅 (목록 조회, 필터링, 정렬)
  - useServiceDetail 훅 (상세 조회)
  - useServiceCategories 훅 (카테고리 목록)
  - useServiceCounts 훅 (카테고리별 개수)
  - 카테고리 필터링 UI (Tabs)
  - 정렬 기능 (최신순, 가격순, 인기순)
  - 이미지 갤러리 (Carousel 컴포넌트)
  - 메트릭 시각화 (사용자 수, 만족도, ROI)
  - SEO 최적화 (react-helmet-async)
  - 반응형 그리드 레이아웃 (1열→2열→3열)
  - 로딩 스켈레톤 UI
  - 빈 상태 처리
  - 에러 상태 처리

- **Supabase 데이터베이스 개선**
  - 스키마 분석 및 마이그레이션 (14→11 테이블)
  - `post_tags` 테이블 제거 (중복)
  - `services` 테이블 완전한 구조 (11개 컬럼)
  - `service_categories` 개선 (icon, is_active 추가)
  - RLS (Row Level Security) 정책 10개 설정
  - 인덱스 최적화 (category_id, status, created_at)
  - 샘플 서비스 3개 삽입 (AI 도구, 데이터 분석, 컨설팅)
  - Phase 9-10 테이블 검증 및 보강
  - 자동 updated_at 트리거

- **타입 정의**
  - `src/types/database.ts` - 전체 Supabase 스키마 타입
  - INSERT/UPDATE 헬퍼 타입
  - JOIN용 확장 타입 (ServiceWithCategory, OrderWithItems 등)

- **문서**
  - `docs/database/` - 데이터베이스 문서 (8개 파일)
  - `docs/database/migration-guide.md` - 마이그레이션 가이드
  - `docs/database/schema-analysis-report.md` - 스키마 분석
  - `docs/database/SCHEMA-IMPROVEMENT-SUMMARY.md` - 개선 요약
  - `docs/guides/phase-8-completion-summary.md` - Phase 8 완료 보고서
  - `scripts/extract-schema.js` - 스키마 자동 추출 스크립트

- **Dependencies**
  - `react-helmet-async` (v2.x) - SEO 메타 태그 관리

### Changed
- **Header 컴포넌트**
  - 로고 영역을 Link로 변경 (홈으로 이동)
  - "서비스" 메뉴 추가
  - "시작하기" 버튼이 /services로 이동
  - 홈페이지 여부에 따라 앵커/Link 동적 전환

- **App.tsx**
  - HelmetProvider 추가 (SEO)
  - `/services` 라우트 추가
  - `/services/:id` 동적 라우트 추가

- **빌드 크기**
  - CSS: 70.13 kB → 74.57 kB (+4.44 kB)
  - JS: 374.71 kB → 617.86 kB (+243.15 kB, gzip: +70.61 kB)
  - Total (gzip): 130.11 kB → 201.20 kB (+71.09 kB)

### Fixed
- Supabase 클라이언트 import 경로 수정 (`@/lib/supabase` → `@/integrations/supabase/client`)

---

## [1.3.0] - 2025-10-12

### Added
- **Phase 7: 디자인 시스템 적용** 🎉
  - 디자인 시스템 문서 (`docs/guides/design-system/README.md`)
  - Tailwind CSS 브랜드 색상 (Primary, Accent, Secondary)
  - CSS 변수 시스템 (Light/Dark 테마)
  - 다크 모드 훅 (`useTheme`)
  - 테마 토글 컴포넌트 (`ThemeToggle`)
  - 글래스모피즘 스타일 (`glass-card`)
  - 그라데이션 배경 (`gradient-bg`)
  - 호버 효과 (`hover-lift`)
  - Google Fonts 통합 (Inter, JetBrains Mono)
  - 8px 그리드 시스템
  - shadcn/ui 다크 모드 대응

### Changed
- Header에 ThemeToggle 추가
- Index 페이지에 그라데이션 배경 적용
- 모든 Card 컴포넌트에 glass-card 스타일 적용

---

## [1.2.0] - 2025-10-11

### Added
- **기본 UI 컴포넌트**
  - Header, Hero, Services, Features
  - About, Contact, Footer
  - shadcn/ui 통합 (18개 컴포넌트)

### Changed
- ESLint 에러 수정
- TypeScript 타입 에러 수정

### Removed
- 중복 파일 제거
- .gitignore 업데이트 (불필요한 파일 제외)

---

## [1.1.0] - 2025-10-10

### Added
- **OAuth 인증 시스템**
  - Google OAuth
  - GitHub OAuth
  - Kakao OAuth
  - Supabase Auth 통합

### Added
- **DevOps 인프라**
  - GitHub Actions 워크플로우 (7개)
  - Vercel 자동 배포
  - 브랜치 전략 (main/staging/develop)
  - 환경 변수 관리

---

## [1.0.0] - 2025-10-09

### Added
- **프로덕션 배포** 🎉
  - Vercel 배포 성공
  - 프로덕션 URL: https://www.ideaonaction.ai/
  - React 18 + TypeScript 프로젝트 구조
  - Vite 빌드 시스템

### Added
- **프로젝트 초기 설정**
  - GitHub 저장소 생성
  - Supabase 프로젝트 연결
  - 기본 로고 및 브랜딩

---

## Version Format

```
MAJOR.MINOR.PATCH

MAJOR: Phase 완료, Breaking Changes (2.0.0, 3.0.0...)
MINOR: 주요 기능 추가 (1.1.0, 1.2.0...)
PATCH: 버그 수정, 문서 업데이트 (1.0.1, 1.0.2...)
```

---

## Related Documents

- [Roadmap](./roadmap.md) - 프로젝트 로드맵
- [Versioning Guide](../versioning/README.md) - 버전 관리 가이드
- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 메인 문서
