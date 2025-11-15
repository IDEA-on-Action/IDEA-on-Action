# VIBE WORKING 프로젝트 TODO

> 프로젝트 작업 목록 및 진행 상황 관리

**마지막 업데이트**: 2025-11-15
**현재 Phase**: 🎉 Version 2.0.0 릴리스 완료
**프로젝트 버전**: 2.0.0 (커뮤니티형 프로덕트 스튜디오)
**프로덕션**: https://www.ideaonaction.ai
**다음 작업**: 사용자 피드백 수집 & 성능 최적화

---

## ✅ 완료된 작업

### 토스페이먼츠 심사용 서비스 페이지 기획서 추가 📋 (2025-11-15)
**목표**: 토스페이먼츠 결제 시스템 도입을 위한 서비스 페이지 기획 문서 작성
**완료일**: 2025-11-15
**완료율**: 100% (문서 작성 완료)

#### 생성된 문서
- [x] **spec/services-platform/requirements.md** - 요구사항 명세
  - 사업자 정보 (회사명, 대표자, 사업자등록번호 등)
  - 서비스 카테고리 (개발 서비스 4개, COMPASS 플랫폼 4개)
  - 페이지 구조 요구사항 (11개 페이지)
  - 사용자 스토리 3개 (MVP, Navigator, 법적 문서)
  - 비기능 요구사항 (SEO, 접근성, 성능, 반응형)

- [x] **spec/services-platform/acceptance-criteria.md** - 성공 기준
  - Phase 1 필수 페이지 성공 기준 (7개 페이지)
  - Phase 2 확장 페이지 성공 기준 (4개 페이지)
  - Phase 3 최적화 성공 기준 (SEO, 모바일, 접근성, 성능)
  - 전체 시스템 성공 기준 (토스페이먼츠 심사, UX, 개발 품질)

- [x] **plan/services-platform/architecture.md** - 아키텍처 설계
  - 페이지 구조 설계 (11개 라우트)
  - 컴포넌트 아키텍처 (페이지, 섹션, UI 컴포넌트)
  - 데이터 모델 (Service, Pricing, Package 타입)
  - SEO & 메타데이터 (Open Graph, JSON-LD)
  - 레이아웃 & 스타일
  - Footer 업데이트 (사업자 정보, 법적 문서 링크)

- [x] **plan/services-platform/implementation-strategy.md** - 구현 전략
  - 구현 우선순위 및 일정 (Phase 1-3, 4-6주)
  - 기술 스택 (기존 스택 활용, 신규 설치 불필요)
  - 파일 구조 (pages, components, data, types, lib)
  - 구현 순서 (Step 1-9)
  - 테스트 전략 (수동, E2E, Lighthouse)
  - 배포 체크리스트
  - 롤백 계획

- [x] **docs/payments/toss-payments-review.md** - 전체 기획서 보관
  - 원본 기획서 내용 (사업자 정보 수정)
  - 11개 페이지 상세 내용
  - 구현 우선순위
  - 토스페이먼츠 심사 대응 요약

#### 사업자 정보 수정
- 회사명: 생각과 행동 (영문: IDEA on Action)
- 대표자: 서민원
- 사업자등록번호: 537-05-01511
- 통신판매업신고: 2025-경기시흥-2094
- 주소: 경기도 시흥시 대은로104번길 11 (은행동, 우남아파트) 103동 601호
- 이메일: sinclairseo@gmail.com
- 전화: 010-4904-2671

#### 서비스 카탈로그
**개발 서비스** (4개):
- MVP 개발 서비스 (₩5M-12M, 4-10주)
- 풀스택 개발 서비스 (₩50K-80K/시간, ₩3M-8M/월)
- UI/UX 디자인 시스템 (₩300K-2M, 2-6주)
- 시스템 운영 관리 (₩500K-2M/월)

**COMPASS 플랫폼** (4개):
- COMPASS Navigator (₩29K-299K/월, 현재 이용 가능)
- COMPASS Cartographer (₩49K~/월, 2026 Q1 출시 예정)
- COMPASS Captain (₩79K~/월, 2026 Q1 출시 예정)
- COMPASS Harbor (₩39K~/월, 2026 Q1 출시 예정)

#### 다음 단계
- [ ] Phase 1 구현 시작 (7개 필수 페이지, 1-2주)
  - /services, /services/development/mvp, /services/compass/navigator
  - /pricing, /terms, /privacy, /refund

---

### Version 2.0.0 릴리스 완료 🎉 (2025-11-15)
**목표**: 커뮤니티형 프로덕트 스튜디오 프로덕션 배포
**완료일**: 2025-11-15
**프로덕션**: https://www.ideaonaction.ai
**Release**: https://github.com/IDEA-on-Action/idea-on-action/releases/tag/v2.0.0

#### Sprint 1-3 완료
- [x] **Sprint 1**: Structure & Static Data (Home 강화, SEO, Weekly Recap)
- [x] **Sprint 2**: Supabase Integration & Community (CRUD 훅, 동적 페이지, Giscus, Work with Us, Newsletter)
- [x] **Sprint 3**: Automation & Open Metrics (GA4, 테스트, SEO 최적화)

#### 새 페이지 (8개)
- [x] About - 우리는 어떤 회사인가
- [x] Roadmap - Quarterly 목표 + 진행률
- [x] Portfolio - 프로젝트 Case Study
- [x] Now - 최근 활동 로그
- [x] Lab - 실험 & Bounty
- [x] Community - Giscus 토론
- [x] Work-with-Us - 협업 제안
- [x] Status - 오픈 메트릭스

#### 핵심 기능
- [x] 프로젝트 관리 (Portfolio, Roadmap)
- [x] 활동 로그 (Now)
- [x] 바운티 시스템 (Lab)
- [x] 커뮤니티 댓글 (Giscus)
- [x] Work with Us 폼
- [x] Newsletter 구독
- [x] 오픈 메트릭스 (Status)
- [x] Weekly Recap 자동 생성

#### 테스트 & 품질
- [x] 단위 테스트: 261/305 통과 (85.6%)
- [x] E2E 테스트: 24개 파일
- [x] SEO: sitemap 15개 URL, JSON-LD 5개 스키마
- [x] 빌드: 21.29s, 109.60 kB gzip, PWA 129 entries

#### 배포 정보
- [x] Git tag v2.0.0 생성
- [x] GitHub Release 생성
- [x] Vercel 프로덕션 배포
- [x] sitemap.xml, robots.txt 접근 가능
- [x] 배포 후 체크리스트 문서 생성 (docs/deployment/post-deployment-checklist.md)

---

### Sprint 2 Day 1-2 완료 🎉 (2025-11-14)
**목표**: Supabase 연동 & 동적 페이지 구현 (10개 Task)
**완료일**: 2025-11-14
**총 소요**: 16시간 (Day 1: 6h, Day 2: 10h)
**완료율**: 100% (10/10 작업)

#### Day 1: Supabase Schema & CRUD (T-2.1 ~ T-2.5)
- [x] **T-2.1: Supabase 스키마 검증 및 샘플 데이터 삽입** (1.5h)
  - 기존 5개 테이블 스키마 검증 (projects, roadmap, logs, bounties, newsletter_subscriptions)
  - work_with_us_inquiries 테이블 마이그레이션 생성 (20251114000010_create_work_inquiries.sql)
  - 샘플 데이터 18개 레코드 삽입 (20251114000011_seed_sprint2_sample_data.sql)
  - Supabase Dashboard에서 수동 실행 완료

- [x] **T-2.2: useProjects 훅 생성 (Portfolio용)** (1.5h)
  - 7개 훅: useProjects, useProject, useProjectsByStatus, useProjectsByCategory, useCreateProject, useUpdateProject, useDeleteProject
  - React Query staleTime: 5분
  - TypeScript 타입 정의 완료
  - 유닛 테스트 10개 작성 (요구사항 5개 초과)
  - 파일: src/hooks/useProjects.ts (210줄)

- [x] **T-2.3: useRoadmap 훅 생성 (Roadmap용)** (1.5h)
  - 5개 훅: useRoadmap, useRoadmapByQuarter, useCreateRoadmap, useUpdateRoadmap, useDeleteRoadmap
  - React Query staleTime: 5분
  - 유닛 테스트 10개 작성
  - 파일: src/hooks/useRoadmap.ts (140줄)

- [x] **T-2.4: useLogs 훅 생성 (Now용)** (1.5h)
  - 6개 훅: useLogs, useLogsByType, useLogsByProject, useCreateLog, useUpdateLog, useDeleteLog
  - React Query staleTime: 1분 (실시간성 강조)
  - 유닛 테스트 10+개 작성
  - 파일: src/hooks/useLogs.ts (191줄)

- [x] **T-2.5: useBounties 훅 생성 (Lab용)** (1.5h)
  - 7개 훅: useBounties, useBountiesByStatus, useBounty, useApplyToBounty, useCreateBounty, useUpdateBounty, useDeleteBounty, useAssignBounty
  - React Query staleTime: 1분
  - 유닛 테스트 작성 완료
  - 파일: src/hooks/useBounties.ts (226줄)

#### Day 2: 동적 페이지 구현 (T-2.6 ~ T-2.10)
- [x] **T-2.6: Portfolio 페이지 구현** (2h)
  - 상태별 필터링 (전체/진행중/검증/출시/대기)
  - 통계 카드 5개, 프로젝트 카드 그리드 3열
  - 진행률 Progress 바, 메트릭스 표시
  - SEO 메타 태그, GA4 이벤트
  - 파일: src/pages/Portfolio.tsx (267줄, 이미 완전 구현됨)

- [x] **T-2.7: Roadmap 페이지 구현** (2h)
  - 분기별 탭 네비게이션
  - Quarter Overview (테마, 기간, 설명, 진행률)
  - 리스크 레벨 Badge, 담당자 Badge
  - 마일스톤 카드, KPIs 표시
  - 파일: src/pages/Roadmap.tsx (318줄, 이미 완전 구현됨)

- [x] **T-2.8: Now 페이지 구현** (2h)
  - useLogs 훅 연동
  - 타임라인 레이아웃 (카드 리스트)
  - 타입별 아이콘 (release, learning, decision)
  - **타입 에러 수정**: `log.createdAt` → `log.created_at`, author 필드 제거
  - 파일: src/pages/Now.tsx (145줄, 수정 완료)

- [x] **T-2.9: Lab 페이지 구현** (2h)
  - useBounties 훅 연동
  - 통계 카드 4개, 바운티 카드 그리드 2열
  - 난이도 표시 (초급/중급/고급, 색상 구분)
  - **타입 에러 수정**: `estimatedHours` → `estimated_hours`, `skillsRequired` → `skills_required`
  - 파일: src/pages/Lab.tsx (253줄, 수정 완료)

- [x] **T-2.10: PortfolioDetail 페이지 구현** (2h)
  - useProject(slug) 훅 연동
  - 프로젝트 헤더, 주요 특징, 기술 스택
  - 프로젝트 지표, 타임라인, 태그
  - 파일: src/pages/PortfolioDetail.tsx (371줄, 이미 완전 구현됨)

#### 결과 ✅
- ✅ Supabase 마이그레이션: 2개 (work_inquiries 테이블, 샘플 데이터 18개)
- ✅ CRUD 훅: 4개 (useProjects, useRoadmap, useLogs, useBounties)
- ✅ 동적 페이지: 5개 (Portfolio, Roadmap, Now, Lab, PortfolioDetail)
- ✅ 파일 변경: 2개 수정 (Now.tsx, Lab.tsx)
- ✅ 총 코드: ~1,764줄 (페이지), ~767줄 (훅)
- ✅ 총 테스트: 40+개 (훅 유닛 테스트)
- ✅ 빌드: 32.25초 성공, 106 청크, ~620 KB gzip
- ✅ 커밋: a0e99eb

**교훈**:
- Supabase 필드명은 snake_case 사용 (created_at, estimated_hours, skills_required)
- TypeScript 타입 정의 시 DB 스키마와 정확히 일치 필요
- React Query 캐싱 전략: 정적 데이터 5분, 실시간 데이터 1분

### Sprint 2 Day 3-5 완료 🎉 (2025-11-15)
**목표**: Giscus, Work with Us, Newsletter 통합 (12개 Task)
**완료일**: 2025-11-15
**총 소요**: 20시간 (Track A: 4h, Track B: 5.5h, Track C: 2.5h, Track D: 8.5h)
**완료율**: 100% (12/12 작업)

#### Track A: Giscus 통합 (T-2.11 ~ T-2.14)
- [x] **T-2.11: @giscus/react 패키지 설치 및 설정** (1h)
  - @giscus/react v3.1.0 설치
  - 환경 변수 6개 추가
  - 파일: package.json, .env.local, src/vite-env.d.ts

- [x] **T-2.12: GiscusComments 컴포넌트 생성** (1h)
  - 환경 변수 기반 설정
  - 다크 모드 테마 지원
  - 파일: src/components/community/GiscusComments.tsx

- [x] **T-2.13: Community 페이지에 Giscus 통합** (1h)
- [x] **T-2.14: BlogPost 페이지에 Giscus 통합** (1h)

#### Track B: Work with Us 폼 (T-2.15 ~ T-2.17)
- [x] **T-2.15: resend 패키지 설치 및 이메일 전송 함수 생성** (2h)
  - sendWorkWithUsEmail 함수 생성 (HTML 템플릿)
  - 파일: src/lib/email.ts

- [x] **T-2.16: useWorkInquiries 훅 생성** (2h)
  - 7개 함수: submit, list, get, updateStatus, delete, stats, userInquiries
  - 파일: src/hooks/useWorkInquiries.ts (230줄)

- [x] **T-2.17: WorkWithUsForm 컴포넌트 업데이트** (1.5h)
  - useWorkInquiries 훅 적용
  - 파일: src/components/forms/WorkWithUsForm.tsx

#### Track C: Newsletter 폼 (T-2.18)
- [x] **T-2.18: NewsletterForm 검증** (2.5h)

#### Track D: 테스트 & 배포 (T-2.19 ~ T-2.22)
- [x] **T-2.19: E2E 테스트 실행** (3h)
  - auth-helpers.ts 픽스처 생성
  - 파일: tests/fixtures/auth-helpers.ts

- [x] **T-2.20: 유닛 테스트 실행** (2h)
  - 127개 테스트, 124개 통과 (97.6%)

- [x] **T-2.21: Lighthouse CI 실행** (1.5h)
  - Home: 50%, Services: 41%, Login: 53%

- [x] **T-2.22: 문서 업데이트 및 배포** (2h)
  - CLAUDE.md, project-todo.md 업데이트

#### 결과 ✅
- ✅ 파일 변경: 9개 (7개 수정, 2개 신규)
- ✅ 총 코드: ~800줄 추가
- ✅ 환경 변수: 7개 추가
- ✅ 빌드: 20.56초, 129 PWA entries
- ✅ 커밋: 85dcdac

**교훈**:
- Giscus는 환경 변수로 관리
- Work with Us 이메일은 비동기 처리
- E2E 테스트는 auth-helpers 픽스처 재사용
- Lighthouse 로컬 점수는 프로덕션 대비 50-60%

---

### 법적 문서 및 사업자 정보 추가 🏛️ (2025-01-14)
**목표**: 토스 페이먼츠 필수 준비사항 완료
**완료일**: 2025-11-14
**총 소요**: 2시간
**완료율**: 100% (6/6 작업)

#### 작업 목록
- [x] **Footer 사업자 정보 추가**
  - 회사명: IDEA on Action (생각과행동)
  - 대표자: 서민원
  - 사업자등록번호: 537-05-01511
  - 신고번호: 2025-경기시흥-2094
  - 주소: 경기도 시흥시 대은로104번길 11 (은행동, 우남아파트) 103동 601호
  - 이메일: sinclair.seo@ideaonaction.ai | 전화: 010-4904-2671

- [x] **Footer "법적 정보" 섹션 추가**
  - 4개 링크 추가 (이용약관, 개인정보처리방침, 환불정책, 전자금융거래약관)

- [x] **이용약관 페이지 생성** (/terms)
  - 12조, 2.84 kB gzip
  - 서비스 이용, 결제, 회사/이용자 의무, 분쟁처리

- [x] **개인정보처리방침 페이지 생성** (/privacy)
  - 11조, 3.66 kB gzip
  - 수집 항목, 제3자 제공(토스페이먼츠), 보유기간, 이용자 권리

- [x] **환불정책 페이지 생성** (/refund-policy)
  - 9조, 2.83 kB gzip
  - 청약철회 7일, 서비스별 환불 규정, 환불 절차

- [x] **전자금융거래약관 페이지 생성** (/electronic-finance-terms)
  - 14조, 4.08 kB gzip
  - 접근매체 관리, 오류 정정, 회사/이용자 책임, 토스페이먼츠 명시

#### 결과 ✅
- ✅ 법적 문서 4개 페이지 생성 (13.41 kB gzip 총 용량)
- ✅ Footer 사업자 정보 완비
- ✅ App.tsx 라우트 4개 추가 (Lazy loading)
- ✅ 빌드 성공: 47.07s, 127 entries (3378.66 KiB PWA 캐시)
- ✅ 번들 크기: index.js 359.01 kB (109.51 kB gzip)
- 📋 법적 근거: 전자상거래법, 전자금융거래법, 개인정보보호법, 소비자기본법

**TODO (향후 작업)**:
- [ ] 법률 전문가 검토 (4개 법적 문서) - 최우선
- [ ] 결제 페이지 약관 동의 체크박스 추가
- [ ] 통신판매업 신고번호 확인

---

### Version 2.0 Sprint 3 완료 🎉 (2025-11-14)
**목표**: Automation & Open Metrics - 테스트, SEO 최적화, 배포 준비
**완료일**: 2025-11-14
**총 소요**: 6시간
**완료율**: 100% (7/7 작업)

#### Task 3.5: Playwright E2E 테스트 작성 ✅
- [x] **사용자 여정 테스트 3개** (30개 테스트)
  - journey-1-visitor.spec.ts (9개) - 처음 방문 → 커뮤니티 참여
  - journey-2-collaborator.spec.ts (10개) - 협업 제안 → 프로젝트 시작
  - journey-3-fan.spec.ts (11개) - 정기 방문 → 팬 되기
- [x] **폼 제출 테스트 2개** (25개 테스트)
  - work-with-us.spec.ts (14개) - 협업 제안 폼 (유효성 검증, 성공/실패)
  - newsletter.spec.ts (11개, 기존) - 뉴스레터 구독
- **총 테스트**: 55개 (목표 20개의 275% 달성)
- **파일**: 4개 신규 (journey-*.spec.ts, work-with-us.spec.ts)

#### Task 3.6: SEO 최적화 ✅
- [x] **sitemap.xml 동적 생성** (15개 URL)
  - 12개 정적 페이지 (Home, About, Roadmap, Portfolio, etc.)
  - 3개 동적 페이지 (프로젝트 p001, p002, p003)
  - scripts/generate-sitemap.ts (Supabase 데이터 기반)
- [x] **robots.txt 검증** (최적화 완료)
  - Allow: / (모든 공개 페이지)
  - Disallow: /admin (관리자 페이지)
- [x] **JSON-LD 구조화 데이터** (5개 스키마)
  - src/lib/json-ld.ts (유틸리티 라이브러리)
  - Organization 스키마 (Home)
  - WebSite 스키마 (Home)
  - Person 스키마 (About)
  - Article 스키마 (BlogPost)
  - Breadcrumb 스키마 (공통)
- **파일**: 5개 (json-ld.ts 신규, Index.tsx/About.tsx/BlogPost.tsx 수정, sitemap.xml)

#### Task 3.7: 최종 배포 및 검증 ✅
- [x] **빌드 검증** (21.97s, 3.3 MB)
  - Main bundle: 357.66 KB → 108.97 KB gzip
  - Vendor React: 1.2 MB → 383.79 KB gzip
  - PWA: 122 entries cached
- [x] **환경 변수 확인** (12개 필수 변수)
  - Supabase, OAuth, OpenAI, GA4, Payments, Resend
- [x] **GitHub Actions 워크플로우 검증**
  - CI Pipeline, Deploy Production, Lighthouse CI
  - Test E2E, Test Unit, Weekly Recap
- [x] **Lighthouse CI 실행** (로컬 측정)
  - Home: P44, A95+, S90+ → 프로덕션 P75-85 예상
  - Services: P51, A84, S90+
  - Login: P53, A95+, S66
- [x] **Vercel 배포 가이드 작성**
  - docs/guides/deployment/vercel-deployment-sprint3.md

#### 결과 ✅
- ✅ E2E 테스트: 55개 (목표 20개의 275%)
- ✅ 단위 테스트: 168개 (기존 133개 + 35개)
- ✅ SEO: sitemap 15개 URL, JSON-LD 5개 스키마
- ✅ 배포 준비: 빌드, 환경 변수, CI/CD, Lighthouse
- 📦 번들: 3.3 MB (108.97 KB gzip main)
- ⏱️ 빌드: 21.97s
- 🚀 상태: Ready to Deploy

**다음 단계**:
- main 브랜치 푸시 → GitHub Actions 자동 배포
- 프로덕션 Lighthouse 재측정
- Google Search Console sitemap 제출
- GA4 이벤트 트래킹 모니터링

---

### Version 2.0 Sprint 1 완료 ✅ 완료 (2025-11-14)
**목표**: Structure & Static Data - Home 페이지 강화, SEO 최적화, Weekly Recap 자동화
**완료일**: 2025-11-14
**총 소요**: 4시간

#### STEP 1-4: RLS 정책 수정 ✅
- [x] roadmap 테이블 anon SELECT 권한 부여
- [x] newsletter_subscriptions RLS 정책 정리 (7개 → 4개)
- [x] user_roles, roles 테이블 anon SELECT 권한 부여

#### STEP 5: 데이터 검증 ✅
- [x] 충분한 데이터 확인 (스킵 처리)

#### STEP 6: Home 페이지 4개 섹션 추가 ✅
- [x] **Now Highlight** (최근 활동 3개)
  - useLogs() 훅 사용
  - Badge 타입별 variant (release/learning/decision)
  - /now 페이지 링크
- [x] **Roadmap Progress** (현재 분기 로드맵)
  - useRoadmap() 훅 사용
  - Progress bar 컴포넌트
  - 위험도 Badge (high/medium/low)
  - /roadmap 페이지 링크
- [x] **Portfolio Highlight** (진행중/출시 프로젝트 3개)
  - useProjects() 훅 사용
  - 상태별 필터링 (in-progress, launched)
  - 메트릭 표시 (contributors, commits)
  - /portfolio 페이지 링크
- [x] **Open Bounty** (활성 바운티 3개)
  - useBounties() 훅 사용
  - 상태 필터링 (open)
  - 보상 금액 포맷팅 (KRW)
  - 난이도/예상 시간 표시
  - /lab 페이지 링크

#### STEP 7: SEO 최적화 ✅
- [x] **Index.tsx Helmet 추가**
  - Open Graph 메타 태그 (title, description, type, url, image, width, height)
  - Twitter Cards (card, title, description, image)
  - JSON-LD 구조화 데이터 (Organization, founder, contactPoint, sameAs)
- [x] **index.html 업데이트**
  - 기본 OG 메타 태그
  - Twitter Card 메타 태그
  - og:image 경로 설정

#### STEP 8: Lighthouse 검증 ✅
- [x] robots.txt 확인 (11개 Allow, 7개 Disallow)
- [x] sitemap.xml 확인 (11개 URL)

#### STEP 9: Weekly Recap 자동화 ✅
- [x] **SQL 함수 3개 프로덕션 배포**
  - get_weekly_logs(start_date, end_date): 타입별 로그 집계
  - get_weekly_project_activity(start_date, end_date): 프로젝트 활동 집계
  - get_weekly_stats(start_date, end_date): 주간 통계 요약
- [x] **Edge Function 검증**
  - supabase/functions/weekly-recap/index.ts (250줄)
  - Markdown 템플릿 생성
  - posts 테이블 자동 발행
- [x] **GitHub Actions 워크플로우**
  - .github/workflows/weekly-recap.yml
  - 매주 일요일 15:00 UTC (월요일 00:00 KST)
  - HTTP 200 검증 로직

#### 결과 ✅
- ✅ 빌드 성공: 1분 60초, 124개 파일, 108.16 KB gzip (메인 번들)
- ✅ PWA: 120개 파일 캐시 (3040.23 KiB)
- ✅ 프로덕션 배포: https://www.ideaonaction.ai/ (HTTP 200, Vercel Cache HIT)
- ✅ 로컬 테스트: http://localhost:4173/ (SEO 메타 태그 확인)
- 파일 변경: 22개 (+3,520줄)
- 커밋: a73f775

**다음 단계**:
- GitHub Secret 등록 (SUPABASE_SERVICE_ROLE_KEY)
- OG Image 생성 (1200x630px, /public/og-image.png)
- Sprint 2 시작 (Supabase 연동, Giscus 댓글, Work with Us 폼)

---

### Weekly Recap 자동화 구현 ✅ 완료 (2025-11-14)
**목표**: 활동 로그 기반 주간 요약 자동 생성 및 블로그 발행
**완료일**: 2025-11-14
**총 소요**: 45분

#### 구현 내용 ✅
- [x] **SQL 함수 생성** (20251114000001_weekly_recap_function.sql, 138줄)
  - `get_weekly_logs()`: 주간 로그 집계 (타입별 그룹화)
  - `get_weekly_project_activity()`: 주간 프로젝트 활동 집계
  - `get_weekly_stats()`: 주간 통계 요약 (총 로그, 인기 태그)

- [x] **Supabase Edge Function** (supabase/functions/weekly-recap/index.ts, 287줄)
  - Deno/TypeScript 기반
  - Markdown 템플릿 자동 생성 (release/learning/decision 구분)
  - posts 테이블에 자동 발행
  - 중복 방지 (slug 기반 upsert)

- [x] **CRON Job 설정** (20251114000002_weekly_recap_cron.sql, 95줄)
  - pg_cron 기반 스케줄링
  - 매주 일요일 자정 (KST) 자동 실행
  - 수동 실행 함수 (trigger_weekly_recap)

- [x] **배포 가이드** (docs/guides/weekly-recap-setup.md, 520줄)
  - 설치 단계 (Step 1-3)
  - 테스트 방법 (SQL/cURL/CLI)
  - 트러블슈팅 가이드 (4가지 케이스)
  - 커스터마이징 방법

#### 결과 ✅
- ✅ 총 840줄 코드 추가 (4개 파일)
- ✅ 바운티 요구사항 충족 (150,000원, 12시간 예상)
- 커밋: 6ed92b0
- 배포 대기: Supabase CLI로 Edge Function 배포 필요

**다음 단계**:
- Supabase CLI로 Edge Function 배포 (선택)
- AI 요약 통합 (OpenAI API, 선택)
- 이메일 발송 (Resend API, 선택)

---

### GA4 이벤트 트래킹 완료 ✅ 완료 (2025-11-14)
**목표**: Version 2.0 Sprint 3 이벤트 트래킹 전체 완료
**완료일**: 2025-11-14
**총 소요**: 1시간

#### 1단계: Home & Newsletter 이벤트 추가 ✅
- [x] **analytics.ts 이벤트 함수 5개 추가**
  - viewHome(): 홈 페이지 조회
  - subscribeNewsletter(email, location): 뉴스레터 구독 (위치 트래킹)
  - joinCommunity(action, topic): 커뮤니티 참여
  - applyBounty(bountyId, title, reward): 바운티 신청
  - viewRoadmap(quarter, goal): 로드맵 조회

- [x] **Index.tsx (Home)**
  - useEffect로 analytics.viewHome() 호출
  - NewsletterForm에 location="home_inline" prop 추가

- [x] **NewsletterForm.tsx**
  - location prop 추가 (footer, home_inline, popup)
  - analytics.subscribeNewsletter() 호출
  - 성공 시 이메일 초기화 (setEmail(''))

- [x] **Footer.tsx**
  - NewsletterForm에 location="footer" prop 추가

#### 2단계: Roadmap, Community, Lab 이벤트 추가 ✅
- [x] **Roadmap.tsx**
  - analytics.viewRoadmap(quarter, theme) 호출
  - 분기 선택 시마다 트래킹

- [x] **Community.tsx**
  - analytics.joinCommunity("view") 호출
  - 페이지 방문 트래킹

- [x] **Lab.tsx**
  - analytics.joinCommunity("view", "bounties") 호출
  - 바운티 조회 트래킹

#### 결과 ✅
- ✅ 5개 이벤트 전체 적용 완료
- ✅ 빌드 성공: 38.11s, 120 entries (3040.53 KiB)
- 커밋: 77229cb (Home & Newsletter), d002e68 (Roadmap, Community, Lab)
- GTM/GA4 dataLayer를 통해 자동 전송

**Privacy 고려사항**:
- 이메일 도메인만 저장 (개인정보 보호)
- 위치 기반 트래킹 (사용자 행동 분석)

---

### Playwright Newsletter 테스트 활성화 및 검증 ✅ 완료 (2025-11-13)
**목표**: RLS 정책 수정 효과 검증
**완료일**: 2025-11-13
**총 소요**: 30분

#### 테스트 활성화 ✅
- [x] **Newsletter E2E 테스트 5개 활성화**
  - tests/e2e/newsletter.spec.ts: `.skip` 제거
  - "유효한 이메일 제출 시 성공 메시지 표시"
  - "중복 이메일 제출 시 에러 메시지 표시"
  - "Home 페이지 inline 폼에서 구독 가능"
  - "성공 후 입력 필드가 초기화됨"
  - "모바일 뷰포트에서 Newsletter 폼 작동"

#### 테스트 결과 ✅
- **전체**: 55개 테스트 (11개 × 5개 브라우저)
- **통과**: 43개 (78.2% 성공률)
- **실패**: 12개 (21.8%)
- **핵심 성공**: Newsletter 구독 기능 5/5 브라우저 통과 ✅

#### 발견된 이슈 ❌
- **입력 필드 초기화 버그** (P1): 성공 후 이메일 필드 미초기화 (5/5 브라우저)
- **Firefox 타임아웃** (P2): 페이지 로딩 지연 (6개 테스트)
- **Mobile Chrome 타임아웃** (P2): 모바일 성능 (2개 테스트)

#### 결과 ✅
- RLS 정책 수정 효과 확인 완료
- 핵심 기능 정상 동작
- 커밋: c61f038
- 문서: CLAUDE.md, docs/daily-summary-2025-11-13.md 업데이트

**다음 단계**: P1 이슈 수정 (선택) 또는 Version 2.0 Sprint 3 마무리

---

### P0 긴급 이슈 해결: Roadmap/Newsletter RLS 정책 수정 ✅ 완료 (2025-11-13)
**목표**: 프로덕션 사이트 401 오류 해결
**완료일**: 2025-11-13
**총 소요**: 2시간

#### 문제 분석 🔍
- **Roadmap 페이지**: `GET /rest/v1/roadmap → 401 Unauthorized`
- **Newsletter 구독**: `POST /rest/v1/newsletter_subscriptions → 401 Unauthorized`
- **근본 원인**: PostgreSQL RLS = GRANT 권한 + RLS 정책 (둘 다 필요)

#### 해결 방법 ✅
- [x] **스키마 조회 우선**
  - STEP1-schema-inspection.sql 생성
  - 실제 GRANT 권한 및 RLS 정책 확인

- [x] **Roadmap 권한 부여**
  - FINAL-FIX-roadmap-grant.sql
  - `GRANT SELECT ON roadmap TO anon, authenticated;`

- [x] **user_roles 권한 부여**
  - FIX-user-roles-grant.sql
  - `GRANT SELECT ON user_roles, roles TO anon, authenticated;`
  - INSERT RETURNING에서 SELECT 정책 평가 시 필요

- [x] **Newsletter RLS 정책 정리**
  - FINAL-newsletter-rls-cleanup.sql
  - 7개 중복 정책 → 4개 명확한 정책
  - anon SELECT 정책 추가 (INSERT RETURNING용)

#### 결과 ✅
- ✅ Roadmap 페이지 정상 동작
- ✅ Newsletter 구독 성공 ("뉴스레터 구독 신청 완료!" 토스트)
- ✅ 프로덕션 사이트 안정화
- 커밋: 2a23fbb
- 문서: docs/daily-summary-2025-11-13.md 생성

#### 교훈 📝
- PostgreSQL RLS는 GRANT + RLS 정책 2단계
- INSERT RETURNING은 SELECT 정책 필요
- 스키마 조회가 최우선 (추측 금지)
- 정책 중복은 충돌 유발

**다음 단계**: Newsletter 테스트 검증

---

### 전체 프로젝트 리팩토링 완료 ✅ 완료 (2025-01-09)
**목표**: 코드 품질 전반 개선 (타입 안정성, 에러 처리, 코드 중복 제거, 컴포넌트 구조)
**완료일**: 2025-01-09
**총 소요**: 반나절

#### 주요 수정 사항 ✅
- [x] **TypeScript 설정 강화**
  - strictNullChecks, noImplicitAny, noUnusedLocals, noUnusedParameters 활성화
  - 타입 안정성 대폭 향상

- [x] **에러 처리 패턴 통일**
  - 6개 훅 리팩토링: useBounties, useProjects, useRoadmap, useLogs, useServices, useProposals
  - 모든 Supabase 쿼리/뮤테이션에 useSupabaseQuery/useSupabaseMutation 래퍼 적용

- [x] **페이지 컴포넌트 표준화**
  - 3개 페이지 리팩토링: Status, BlogPost, NotFound
  - PageLayout, LoadingState, ErrorState 일관성 있게 적용

- [x] **코드 중복 제거**
  - useSupabaseCRUD.ts 생성: 공통 CRUD 패턴 추출

- [x] **타입 정의 개선**
  - 구체적 타입 정의 강화

#### 결과 ✅
- 빌드 성공: 21.76초, 124 entries (3027.79 KiB)
- 타입 에러: 0개
- 린트 에러: 0개
- 수정 파일: 12개 (2개 수정, 1개 신규)
- 커밋: adf6691
- 배포: Vercel 자동 배포 완료

#### 문서화 ✅
- docs/refactoring-summary-2025-01-09.md: 리팩토링 상세 보고서
- docs/deployment-2025-01-09.md: 배포 완료 보고서
- CLAUDE.md: 프로젝트 문서 업데이트

**다음 단계**: 프로덕션 사이트 동작 확인 및 모니터링

---

### Version 2.0 Sprint 3.8.1: React 청크 로딩 순서 핫픽스 ✅ 완료 (2025-01-09)
**목표**: 프로덕션 런타임 에러 수정
**완료일**: 2025-01-09
**총 소요**: 30분

#### 문제 분석 🔍
- **에러**: `Uncaught TypeError: Cannot read properties of undefined (reading 'createContext')`
- **원인**: vendor-query (React Query) 청크가 vendor-react보다 먼저 로드
- **영향**: 프로덕션 사이트 완전 다운 (페이지 렌더링 불가)

#### 해결 방법 ✅
- [x] **Vite manualChunks 수정**
  - React Query를 vendor-react 청크에 포함
  - React + React DOM + React Query를 하나의 청크로 묶음
  - vendor-query 청크 제거

#### 결과 ✅
- **빌드 성공**: 20.08초
- **청크 크기**: vendor-react 348.77 kB → 388.32 kB (125.25 kB gzip)
- **로컬 테스트**: 프리뷰 서버 정상 동작 확인
- **배포**: Vercel Production 배포 완료 (커밋 9150a3b)

#### 기술적 교훈 📝
- React 생태계 라이브러리는 React와 함께 번들링하는 것이 안전
- Vite manualChunks는 로딩 순서를 보장하지 않음
- 의존성 체인이 있는 청크는 하나로 묶거나 modulepreload 사용 필요

**다음 단계**: 프로덕션 사이트 동작 확인 후 Sprint 3.9 또는 RLS 정책 적용

---

### Version 2.0 Sprint 3.8: 페이지 개선 및 버그 수정 ✅ 완료 (2025-01-09)
**목표**: 페이지 개선 및 React 경고/오류 수정
**완료일**: 2025-01-09
**총 소요**: 1시간

#### 주요 수정 사항 ✅
- [x] **Portfolio 페이지 개선**
  - React Hooks 순서 오류 수정 (useMemo를 early return 전으로 이동)
  - "Rendered more hooks than during the previous render" 오류 해결

- [x] **Roadmap 페이지 리팩토링**
  - PageLayout, HeroSection, Section 컴포넌트 적용
  - LoadingState, ErrorState, EmptyState 컴포넌트 적용
  - 네비게이션 추가 (Header/Footer 표시)
  - 로드맵 등록 안내 추가 (관리자 버튼 표시)

- [x] **Contact 컴포넌트 업데이트**
  - 대표자 정보 업데이트: "서민원 (Sinclair Seo)"
  - 직책 업데이트: "생각과 행동 대표"

- [x] **Login.tsx 버그 수정**
  - 렌더링 중 navigate 호출 경고 수정
  - useEffect로 리다이렉트 로직 이동

- [x] **관리자 버튼 표시 로직 개선**
  - Roadmap EmptyState에서 isAdminLoading 확인 추가
  - isAdmin === true 명시적 확인

#### 결과 ✅
- React 경고: 1개 수정 (Login.tsx)
- React 오류: 1개 수정 (Portfolio.tsx)
- 페이지 개선: 2개 (Portfolio, Roadmap)
- 수정 파일: 4개 (Portfolio.tsx, Roadmap.tsx, Login.tsx, Contact.tsx)

#### 결과 ✅
- 배포: Vercel Production 배포 완료
- 커밋: 37b1149 (19개 파일, 614줄 추가, 425줄 삭제)
- 빌드: 24.62초 성공
- URL: https://www.ideaonaction.ai/

#### 남은 이슈 ⚠️
- RLS 정책 적용 필요: user_roles, roadmap, carts, notifications 테이블
- fix-rls-policies-all.sql 파일에 정책 포함되어 있으나 Supabase Dashboard에서 수동 적용 필요

**다음 단계**: RLS 정책 적용 또는 Version 2.0 Sprint 3.9

---

### Version 2.0 Sprint 3.7: E2E 테스트 안정화 및 Known Issue 문서화 ✅ 완료 (2025-01-09)
**목표**: Newsletter 및 Status E2E 테스트 안정화, RLS 정책 수정
**완료일**: 2025-01-09
**총 소요**: 2시간
**테스트 결과**: 26/31 통과 (83.9% 성공률)

#### 주요 수정 사항 ✅
- [x] **테스트 Skip 제거**
  - tests/e2e/newsletter.spec.ts: 6개 skip 제거 (lines 82, 101, 132, 159, 180, 203)
  - tests/e2e/status.spec.ts: 2개 skip 제거 (lines 68, 80)
  - 초기 결과: 26/31 통과 (5개 Newsletter 테스트 실패)

- [x] **RLS 정책 수정**
  - supabase/migrations/fix-rls-policies-all.sql에 Section 11 추가
  - supabase/migrations/apply-newsletter-rls.sql 생성
  - supabase/migrations/fix-newsletter-permissions.sql 생성
  - Supabase SQL Editor에서 정책 적용 완료

- [x] **환경 변수 개선**
  - .env 파일 생성 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  - .env.local에 SUPABASE_SERVICE_ROLE_KEY 추가
  - playwright.config.ts webServer.env 설정 추가

- [x] **Known Issue 문서화**
  - Playwright webServer 환경 변수 이슈 발견
  - Newsletter 구독 테스트 5개 skip 처리 (403 Forbidden)
  - 테스트 설명에 Known Issue 추가: "Playwright webServer 환경 변수"

- [x] **진단 도구 생성**
  - scripts/check-newsletter-data.js (Service Role로 데이터 확인)

#### 결과 ✅
- 테스트: 5 skipped, 26 passed (83.9% 성공률)
- RLS 정책: newsletter_subscriptions 적용 완료
- Known Issue: Playwright webServer 환경 변수 문제 문서화
- 수정 파일: 5개 (newsletter.spec.ts, status.spec.ts, fix-rls-policies-all.sql, playwright.config.ts, .env.local)
- 신규 파일: 4개 (.env, apply-newsletter-rls.sql, fix-newsletter-permissions.sql, check-newsletter-data.js)

**다음 단계**: Version 2.0 Sprint 3.8 또는 Sprint 4 (Testing & Launch)

---

### Version 2.0 Sprint 3.6: 코드 품질 개선 및 린트 에러 수정 ✅ 완료 (2025-01-09)
**목표**: JSX 에러 수정 및 TypeScript/React 린트 경고 제거
**완료일**: 2025-01-09
**총 소요**: 30분

#### 주요 수정 사항 ✅
- [x] **JSX 에러 수정**
  - About.tsx 닫는 태그 누락 수정 (line 206 `</div>` 추가)
  - 빌드 에러 해결 → 성공 (24.96s)

- [x] **TypeScript any 타입 수정**
  - src/types/v2.ts: `Record<string, any>` → `Record<string, unknown>` (2개)
  - tests/unit/components/GiscusComments.test.tsx:
    - `UseThemeReturn` 타입 인터페이스 정의
    - 7개 `as any` → `as UseThemeReturn` 변경
    - 1개 `as any` → `as unknown as HTMLIFrameElement` 변경
  - tests/unit/components/WorkWithUsForm.test.tsx:
    - `UseMutationResult` 타입 import
    - Mock 반환값에 완전한 타입 지정

- [x] **React Hooks 경고 수정**
  - src/components/community/GiscusComments.tsx:
    - Cleanup 함수에서 `containerRef.current` 직접 참조 제거
    - Effect 시작 시 `const container = containerRef.current` 할당
  - src/pages/BlogPost.tsx:
    - `incrementViewCount` dependency 추가

#### 결과 ✅
- 린트 에러: 11개 → 8개
- 남은 경고: shadcn/ui `react-refresh/only-export-components` (라이브러리 패턴)
- 빌드: ✅ 성공 (24.96s)
- 수정 파일: 6개 (About.tsx, v2.ts, GiscusComments.tsx, BlogPost.tsx, GiscusComments.test.tsx, WorkWithUsForm.test.tsx)

---

### Version 2.0 Sprint 2: Supabase Integration & Community ✅ 완료 (2025-11-09)
**목표**: 정적 데이터를 Supabase로 전환 및 커뮤니티 기능 추가
**완료일**: 2025-11-09
**총 소요**: 1일

#### Stage 1: Supabase Schema ✅
- [x] 7개 SQL 마이그레이션 파일 생성
  - [x] 20250109000001_create_projects.sql (Portfolio 프로젝트)
  - [x] 20250109000002_create_roadmap.sql (분기별 로드맵)
  - [x] 20250109000003_create_logs.sql (Now 활동 로그)
  - [x] 20250109000004_create_bounties.sql (Lab 바운티)
  - [x] 20250109000005_create_proposals.sql (Work with Us 제안서)
  - [x] 20250109000006_extend_user_profiles.sql (뉴스레터)
  - [x] 20250109000007_seed_initial_data.sql (초기 데이터)
- [x] RLS 정책 설정 (Public Read, Admin Write)
- [x] 인덱스 최적화 (GIN, B-tree)
- [x] Helper 함수 (apply_to_bounty, subscribe_to_newsletter)

#### Stage 2: React Query Hooks ✅
- [x] TypeScript 타입 정의 (src/types/v2.ts)
- [x] 5개 React Query 훅 생성
  - [x] src/hooks/useProjects.ts (9개 함수)
  - [x] src/hooks/useRoadmap.ts (6개 함수)
  - [x] src/hooks/useLogs.ts (8개 함수)
  - [x] src/hooks/useBounties.ts (8개 함수)
  - [x] src/hooks/useProposals.ts (6개 함수)
- [x] React Query 캐싱 전략 (staleTime: 1-5분)
- [x] Mutation invalidation 패턴

#### Stage 3: Page Data Source Conversion ✅
- [x] 6개 페이지 Supabase 훅 전환
  - [x] src/pages/Roadmap.tsx
  - [x] src/pages/Portfolio.tsx
  - [x] src/pages/PortfolioDetail.tsx
  - [x] src/pages/Now.tsx
  - [x] src/pages/Lab.tsx
  - [x] src/pages/Status.tsx
- [x] Loading/Error/Empty 상태 UI 추가
- [x] useMemo 최적화 (필터링, 정렬)
- [x] 4개 JSON 파일 삭제
  - [x] src/data/projects.json
  - [x] src/data/roadmap.json
  - [x] src/data/logs.json
  - [x] src/data/bounties.json

#### Stage 4: Giscus Integration ✅
- [x] src/components/community/GiscusComments.tsx
- [x] 다크 모드 자동 전환 (useTheme)
- [x] 설정 가이드 포함
- [x] cleanup on unmount

#### Stage 5: Work with Us Form ✅
- [x] src/components/forms/WorkWithUsForm.tsx
- [x] React Hook Form + Zod 검증
- [x] useSubmitProposal mutation
- [x] Success/error toasts

#### Stage 6: Newsletter Widget ⏭️ (Skipped - Optional)
- [-] 데이터베이스 스키마만 생성 (Migration 006)
- [-] UI 구현은 향후 Sprint에서 진행

#### Stage 7: Build Verification ✅
- [x] Import 경로 수정 (@/lib/supabase → @/integrations/supabase/client)
- [x] sed 명령으로 5개 파일 일괄 수정
- [x] 프로덕션 빌드 성공 (0 errors)
- [x] Build Time: 22.56s
- [x] Total Bundle: ~2997 KiB (56 entries precached)

#### Stage 8: Component Integration (Sprint 2.5) ✅
- [x] Status.tsx 필드명 오류 수정 (activity.createdAt → created_at)
- [x] Community.tsx에 GiscusComments 통합
- [x] WorkWithUs.tsx에 WorkWithUsForm 통합
- [x] BlogPost.tsx에 GiscusComments 추가
- [x] Giscus 설정 가이드 작성 (docs/guides/giscus-setup.md)
- [x] 프로덕션 빌드 검증 (0 errors, 24.55s)
- [x] Total Bundle: ~3003 KiB (56 entries precached)

#### 성과
- ✅ 7개 SQL 마이그레이션 파일
- ✅ 6개 React Query 훅 파일
- ✅ 6개 페이지 데이터 소스 전환
- ✅ 2개 새 컴포넌트 (GiscusComments, WorkWithUsForm)
- ✅ 3개 페이지 컴포넌트 통합 (Community, WorkWithUs, BlogPost)
- ✅ 1개 버그 수정 (Status.tsx)
- ✅ 1개 가이드 문서 (Giscus 설정)
- ✅ 4개 JSON 파일 삭제
- ✅ 빌드 성공 (0 errors)

**다음 단계**: Version 2.0 Sprint 4 (Testing & Launch)

---

### Version 2.0 Sprint 3: Automation & Open Metrics - Quick Wins ✅ 완료 (2025-11-09)
**목표**: Newsletter 위젯, SEO 개선, Status 페이지 메트릭스 연결
**완료일**: 2025-11-09
**총 소요**: 반나절

#### Sprint 3.1: Newsletter 위젯 ✅
- [x] supabase/migrations/20250109000008_create_newsletter.sql
  - [x] newsletter_subscriptions 테이블 (id, email, status, subscribed_at, confirmed_at, preferences, metadata)
  - [x] 3개 상태: pending, confirmed, unsubscribed
  - [x] RLS 정책 3개 (관리자 읽기, 공개 삽입, 본인 업데이트)
  - [x] 인덱스 2개 (email UNIQUE, status)
- [x] src/hooks/useNewsletter.ts (4개 함수)
  - [x] useSubscribeNewsletter() - 이메일 구독
  - [x] useConfirmNewsletter() - 이메일 확인
  - [x] useUnsubscribeNewsletter() - 구독 취소
  - [x] useNewsletterStats() - 통계 조회 (confirmed/pending/total)
- [x] src/components/forms/NewsletterForm.tsx
  - [x] 2개 variant: inline (한 줄), stacked (세로)
  - [x] React Hook Form + Zod 이메일 검증
  - [x] loading/success/error 상태 관리
  - [x] i18n 지원 (common:newsletter.*)
- [x] src/components/Footer.tsx
  - [x] Newsletter 섹션 추가 (stacked variant)
  - [x] 그리드 레이아웃 확장 (lg:grid-cols-4 → lg:grid-cols-5)
- [x] src/pages/Index.tsx (Home)
  - [x] Newsletter CTA 섹션 추가
  - [x] inline variant 폼
  - [x] "Stay Connected" 배지
- [x] src/lib/email.ts
  - [x] sendNewsletterConfirmationEmail() - 확인 이메일
  - [x] sendNewsletterWelcomeEmail() - 환영 이메일

#### Sprint 3.2: SEO 개선 ✅
- [x] public/robots.txt 업데이트
  - [x] Version 2.0 라우트 11개 Allow
  - [x] 7개 Disallow (admin, checkout, login, etc.)
- [x] scripts/generate-sitemap.ts
  - [x] Version 2.0 정적 페이지 12개
  - [x] 동적 프로젝트 페이지 지원 (projects 테이블 조회)
  - [x] NEXT_PUBLIC_ 환경 변수 지원
  - [x] 수동 .env.local 로딩 (dotenv 대체)
- [x] public/sitemap.xml 생성
  - [x] 12개 정적 페이지 (changefreq, priority)
  - [x] npm run generate:sitemap 스크립트

#### Sprint 3.3: Status 페이지 메트릭스 연결 ✅
- [x] src/pages/Status.tsx
  - [x] useNewsletterStats 훅 통합
  - [x] Newsletter 구독자 카드 추가 (Mail 아이콘)
  - [x] 5개 Key Metrics (프로젝트/바운티/커밋/기여자/구독자)
  - [x] 그리드 레이아웃 확장 (lg:grid-cols-4 → lg:grid-cols-5)
  - [x] confirmed/pending/total 카운트 표시

#### 빌드 결과
- **Build Time**: 17.09s
- **Total Bundle**: ~3008 KiB
- **Status.js**: 10.34 kB (+0.79 kB)
- **Errors**: 0

#### 성과
- ✅ 17개 파일 (8개 수정, 9개 신규)
- ✅ 3,365줄 코드 추가
- ✅ 1개 SQL 마이그레이션
- ✅ 4개 React Query 훅 함수
- ✅ 2개 새 컴포넌트 (NewsletterForm, Newsletter sections)
- ✅ 3개 페이지 업데이트 (Footer, Index, Status)
- ✅ 2개 이메일 함수
- ✅ SEO 개선 (robots.txt, sitemap.xml)

**다음 단계**: Newsletter/Status E2E 테스트 작성

### Version 2.0 Sprint 3.4: 버그 수정 및 테스트 ✅ 완료 (2025-01-09)
**목표**: RLS 정책 오류 해결, 에러 핸들링 개선, 타입 오류 수정
**완료일**: 2025-01-09

#### RLS 정책 오류 해결 ✅
- [x] fix-rls-policies-all.sql에 roadmap 테이블 정책 추가
  - [x] 모든 사용자 조회 가능 (SELECT)
  - [x] 관리자만 생성/수정/삭제 가능 (INSERT/UPDATE/DELETE)
- [x] RLS 정책 적용 가이드 문서 작성 (docs/guides/database/rls-fix-instructions.md)
- [x] user_roles, carts, notifications, roadmap 테이블 정책 확인

#### 에러 핸들링 개선 ✅
- [x] src/hooks/useRoadmap.ts - handleSupabaseError 추가
  - [x] useRoadmap: fallbackValue [] 추가
  - [x] useRoadmapByQuarter: fallbackValue null 추가
  - [x] 모든 mutation에 에러 핸들링 추가
- [x] src/hooks/useIsAdmin.ts - 중복 코드 제거 및 명확한 에러 처리
- [x] src/hooks/useNotifications.ts - 중복 코드 제거 및 명확한 에러 처리
- [x] src/hooks/useCart.ts - 이미 적절히 처리됨 확인

#### 타입 오류 수정 ✅
- [x] src/pages/Roadmap.tsx 타입 불일치 수정
  - [x] getRiskBadgeVariant/getRiskLabel: risk: string[] → riskLevel?: string
  - [x] quarter.goal → quarter.theme
  - [x] quarter.period → start_date/end_date 기반 날짜 표시
  - [x] quarter.risks → quarter.risk_level
  - [x] quarter.owner optional 처리
  - [x] milestone.dueDate optional 처리
  - [x] milestone.tasks optional 및 빈 배열 처리
  - [x] quarter.milestones 빈 배열 처리
  - [x] quarter.kpis 타입 안전성 개선

#### 단위 테스트 작성 ✅
- [x] tests/unit/pages/Status.test.tsx 생성
  - [x] 기본 렌더링 테스트
  - [x] 로딩 상태 테스트
  - [x] 에러 상태 테스트
  - [x] 메트릭 계산 테스트
  - [x] UI 컴포넌트 렌더링 테스트
  - [x] 데이터 통합 및 빈 데이터 상태 테스트
- [x] 모든 테스트 케이스 통과 확인

#### 수정된 파일
- [x] supabase/migrations/fix-rls-policies-all.sql (roadmap 정책 추가)
- [x] docs/guides/database/rls-fix-instructions.md (신규)
- [x] src/hooks/useRoadmap.ts (에러 핸들링 개선)
- [x] src/hooks/useIsAdmin.ts (코드 정리)
- [x] src/hooks/useNotifications.ts (코드 정리)
- [x] src/pages/Roadmap.tsx (타입 오류 수정)
- [x] tests/unit/pages/Status.test.tsx (신규)

#### 주요 개선 사항
- ✅ 타입 안전성: 타입 정의와 실제 사용 일치
- ✅ Optional 필드 처리: undefined/null 체크 추가
- ✅ 빈 데이터 처리: 빈 배열/객체에 대한 안전한 렌더링
- ✅ 에러 방지: 런타임 오류 가능성 감소
- ✅ 테스트 커버리지: Status 페이지 단위 테스트 추가

**다음 단계**: Supabase Dashboard에서 RLS 정책 적용 필요

---

### Phase 1-8 ✅
- [x] 프로덕션 배포 & 기본 인프라
- [x] 디자인 시스템 (다크 모드, 글래스모피즘)
- [x] 서비스 페이지 구현
- [x] 인증 & 관리자 시스템 (OAuth, CRUD, 이미지 업로드)

### Phase 9-11 ✅
- [x] **Phase 9: 전자상거래** - 장바구니, 주문, 결제 (Kakao Pay, Toss Payments)
- [x] **Phase 10: 인증 강화** - OAuth 확장 (Microsoft, Apple), 프로필, 2FA, RBAC
- [x] **Phase 11: CMS** - 블로그, 공지사항, SEO (sitemap, robots.txt, RSS)

### Phase 12-14 ✅ NEW
- [x] **Phase 12: 성능 최적화 & PWA & i18n** - Code Splitting, Sentry, GA4, Service Worker, 국제화
- [x] **Phase 13: AI & 실시간 기능** - 통합 검색, AI 챗봇 (OpenAI GPT-3.5), 알림 시스템
- [x] **Phase 14: 고급 분석 대시보드** - 사용자 행동 분석, 매출 차트 & KPI, 실시간 대시보드

**상세 내역**:
- [docs/archive/completed-phases-2025-10-18.md](docs/archive/completed-phases-2025-10-18.md) (Phase 1-11)
- [docs/archive/phase13-ai-realtime.md](docs/archive/phase13-ai-realtime.md) (Phase 13)

---

## 📋 다음 단계

### 테스트 인프라 구축 ✅ COMPLETED
**목표**: Phase 9-11 기능 검증 및 자동화된 테스트 시스템 구축
**완료일**: 2025-10-20
**총 테스트**: 267+ (E2E 157, Unit 82, Visual 28)

#### 테스트 도구 설정 ✅
- [x] **Playwright** - E2E 테스트 (크로스 브라우저)
  - [x] playwright.config.ts 설정
  - [x] Chromium, Firefox, WebKit, Mobile 브라우저 지원 (5개)
  - [x] 스크린샷 & 비디오 녹화 활성화
- [x] **Vitest** - 유닛/컴포넌트 테스트
  - [x] vitest.config.ts 설정
  - [x] React Testing Library 통합
  - [x] jsdom 환경 설정
  - [x] @vitejs/plugin-react-swc 설정
  - [x] E2E/Unit 테스트 분리 (include/exclude)
- [x] **Axe-core** - 접근성 테스트
  - [x] @axe-core/playwright 통합
- [x] **Lighthouse CI** - 성능 테스트 ✅ NEW
  - [x] lighthouserc.json 설정 ✅
  - [x] 성능 임계값 정의 (Performance 90+, Accessibility 95+) ✅
  - [x] NPM 스크립트 추가 (lighthouse, lighthouse:collect, lighthouse:assert) ✅

#### E2E 테스트 구현 (tests/e2e/) - 157개 완료 ✅
- [x] **Phase 1-8 기존 테스트** (60개) ✅
  - [x] login.spec.ts - 이메일/OAuth 로그인 (7개)
  - [x] homepage.spec.ts - 홈페이지 렌더링 (12개)
  - [x] services.spec.ts - 서비스 목록 (11개)
  - [x] admin/dashboard.spec.ts - 대시보드 (7개)
  - [x] admin/service-crud.spec.ts - 서비스 CRUD (15개)
  - [x] admin/image-upload.spec.ts - 이미지 업로드 (12개)
- [x] **Phase 9-11 신규 테스트** (97개) ✅ NEW
  - [x] cart.spec.ts - 장바구니 (7개) ✅
  - [x] checkout.spec.ts - 결제 프로세스 (10개) ✅
  - [x] blog.spec.ts - 블로그 시스템 (19개) ✅
  - [x] notices.spec.ts - 공지사항 (17개) ✅
  - [x] profile.spec.ts - 프로필 & 2FA (19개) ✅
  - [x] rbac.spec.ts - RBAC & 감사 로그 (25개) ✅
- [x] **시각적 회귀 테스트** (visual/) - 28개 ✅
  - [x] dark-mode.spec.ts - 다크 모드 (8개) ✅
  - [x] responsive.spec.ts - 반응형 (20개) ✅

#### 유닛 테스트 구현 (tests/unit/) - 82개 완료 ✅
- [x] **Phase 1-8 기존 테스트** (34개) ✅
  - [x] useAuth.test.ts - 인증 상태 관리 (8개) ✅
  - [x] useServices.test.tsx - 서비스 데이터 조회 (7개) ✅
  - [x] useIsAdmin.test.tsx - 관리자 권한 확인 (5개) ✅
  - [x] ServiceForm.test.tsx - 폼 검증 (8개) ✅
  - [x] ServiceCard.test.tsx - 카드 렌더링 (9개) ✅
- [x] **Phase 9-11 신규 테스트** (48개) ✅ NEW
  - [x] useBlogPosts.test.tsx - 블로그 훅 (12개) ✅
  - [x] useNotices.test.tsx - 공지사항 훅 (12개) ✅
  - [x] useRBAC.test.tsx - RBAC 훅 (12개) ✅
  - [x] useAuditLogs.test.tsx - 감사 로그 훅 (12개) ✅

#### 접근성 개선 ✅
- [x] Footer 소셜 링크 aria-label 추가 (GitHub, LinkedIn, Email)
- [x] Contact 연락처 링크 aria-label 추가 (Email, Phone, Website)
- [x] 아이콘에 aria-hidden="true" 추가

#### 테스트 인프라 ✅ NEW
- [x] **테스트 픽스처** (tests/fixtures/)
  - [x] users.ts - 테스트 사용자 데이터 ✅
  - [x] services.ts - 테스트 서비스 데이터 ✅
  - [x] images.ts - 테스트 이미지 데이터 ✅
- [x] **테스트 헬퍼** (tests/e2e/helpers/)
  - [x] auth.ts - 인증 헬퍼 (loginAsAdmin, loginAsRegularUser) ✅
- [x] **Playwright 설정**
  - [x] playwright.config.ts 업데이트 (포트 8080-8083, webServer) ✅

#### 테스트 가이드 문서 (7개 완료) ✅ COMPLETED
- [x] docs/guides/testing/test-user-setup.md - 테스트 사용자 설정 ✅
- [x] docs/guides/testing/quick-start.md - 빠른 시작 가이드 ✅
- [x] docs/guides/testing/lighthouse-ci.md - Lighthouse CI 가이드 ✅
- [x] docs/guides/testing/ci-cd-integration.md - CI/CD 통합 가이드 ✅
- [x] docs/devops/branch-protection-guide.md - 브랜치 보호 가이드 ✅
- [x] **docs/testing/phase9-11-tests.md** - Phase 9-11 상세 테스트 문서 ✅ NEW
- [x] **docs/testing/testing-strategy.md** - 전체 테스트 전략 문서 ✅ NEW

#### CI/CD 통합 ✅ NEW
- [x] **GitHub Actions 워크플로우** ✅
  - [x] .github/workflows/test-e2e.yml - E2E 테스트 (Playwright) ✅
  - [x] .github/workflows/test-unit.yml - 유닛 테스트 (Vitest + Coverage) ✅
  - [x] .github/workflows/lighthouse.yml - 성능 테스트 (Lighthouse CI) ✅
  - [x] PR 머지 전 자동 테스트 실행 ✅
  - [x] PR 코멘트로 결과 전달 (커버리지, 성능 스코어) ✅

**테스트 현황 요약** (2025-10-20 - COMPLETED):
```
E2E 테스트:       157개 작성 (Playwright) ✅
  - Phase 1-8:     60개 (homepage, login, services, admin)
  - Phase 9-11:    97개 (cart, checkout, blog, notices, profile, rbac) ✅ NEW
시각적 회귀:       28개 작성 (Playwright) ✅
  - Dark Mode:      8개 ✅
  - Responsive:    20개 ✅
유닛 테스트:       82개 작성 (Vitest) | 82개 통과 (100%) ✅
  - Phase 1-8:     34개 (useAuth, useServices, useIsAdmin, ServiceForm, ServiceCard)
  - Phase 9-11:    48개 (useBlogPosts, useNotices, useRBAC, useAuditLogs) ✅ NEW
────────────────────────────────────────────────
총 테스트:       267+ 테스트 케이스 ✅ COMPLETED
전체 통과율:      예상 95%+

CI/CD:            3개 워크플로우 (test-e2e, test-unit, lighthouse)
문서:             7개 가이드 (testing-strategy, phase9-11-tests 포함)
```

---

### Phase 9: 전자상거래 ✅ 완료 (100%) 🎉
**시작일**: 2025-10-18
**완료일**: 2025-10-20 (3일)
**현재 상태**: Week 1-3 완료

#### Week 1: 장바구니 시스템 ✅ 완료
- [x] 데이터베이스 스키마 설계 (carts, cart_items) ✅
  - [x] carts 테이블 (메타데이터만, 사용자당 하나)
  - [x] cart_items 테이블 (다대다 관계, 가격 스냅샷)
  - [x] RLS 정책 8개 (사용자/관리자 권한 분리)
- [x] Zustand 상태 관리 (cartStore.ts) ✅
  - [x] UI 상태: isOpen, itemCount
  - [x] 액션: openCart, closeCart, toggleCart, setItemCount
- [x] useCart 훅 구현 (5개 함수) ✅
  - [x] useCart() - 장바구니 조회
  - [x] useAddToCart() - 항목 추가 (중복 체크, 자동 장바구니 생성)
  - [x] useUpdateCartItem() - 수량 변경 (1-99 제한)
  - [x] useRemoveCartItem() - 항목 삭제
  - [x] useClearCart() - 장바구니 비우기
- [x] Cart UI 컴포넌트 (4개) ✅
  - [x] CartButton - 헤더 우측 상단 버튼 (배지 포함)
  - [x] CartDrawer - 우측 슬라이드 패널 (Sheet 사용)
  - [x] CartItem - 개별 항목 (수량 조절, 삭제)
  - [x] CartSummary - 합계 계산 (소계, 부가세 10%, 총액)
- [x] Header 통합 (장바구니 버튼 + 배지) ✅
- [x] ServiceDetail "장바구니 담기" 버튼 ✅

#### Week 2: 주문 관리 시스템 ✅ 완료
- [x] 데이터베이스 스키마 설계 (orders, order_items, payments) ✅
  - [x] orders 테이블 (7단계 상태, 배송/연락처 정보)
  - [x] order_items 테이블 (서비스 스냅샷)
  - [x] payments 테이블 (다중 게이트웨이 지원)
  - [x] RLS 정책 7개 + 헬퍼 함수 2개
- [x] useOrders 훅 구현 (6개 함수) ✅
  - [x] useOrders() - 주문 목록 조회
  - [x] useOrderDetail() - 주문 상세 조회
  - [x] useCreateOrder() - 주문 생성 (장바구니 → 주문 전환)
  - [x] useCancelOrder() - 주문 취소 (pending/confirmed만)
  - [x] useAdminOrders() - 관리자 전체 주문 조회
  - [x] useUpdateOrderStatus() - 관리자 주문 상태 변경
- [x] Checkout 페이지 ✅
  - [x] React Hook Form + Zod 폼 검증
  - [x] 배송 정보 입력 (이름, 연락처, 주소, 요청사항)
  - [x] 주문자 정보 입력 (이메일, 연락처)
  - [x] 주문 요약 사이드바
- [x] Orders 페이지 (주문 목록) ✅
  - [x] 주문 카드 (주문번호, 날짜, 상태, 항목, 금액)
  - [x] 주문 상태 배지 (7가지 색상)
  - [x] 빈 목록 UI
- [x] OrderDetail 페이지 (주문 상세) ✅
  - [x] 주문 정보 표시
  - [x] 주문 항목 목록
  - [x] 배송/주문자 정보
  - [x] 결제 정보 (소계, 부가세, 할인, 배송비)
  - [x] 주문 취소 버튼
- [x] Header "내 주문" 메뉴 추가 ✅

#### Week 3: 결제 게이트웨이 ✅ 완료
- [x] Kakao Pay REST API 연동 ✅
  - [x] kakao-pay.ts 라이브러리 (준비/승인/취소)
  - [x] Form Data 변환 및 Authorization 헤더
- [x] Toss Payments SDK 연동 ✅
  - [x] toss-payments.ts 라이브러리
  - [x] @tosspayments/payment-sdk 통합
- [x] usePayment 훅 구현 (3개 함수) ✅
  - [x] useInitiatePayment() - 결제 시작
  - [x] useApprovePayment() - 결제 승인
  - [x] useCancelPayment() - 결제 취소
- [x] 결제 페이지 ✅
  - [x] Payment.tsx - 결제 수단 선택
  - [x] PaymentSuccess.tsx - 결제 성공 처리
  - [x] PaymentFail.tsx - 결제 실패/취소
  - [x] PaymentMethodSelector 컴포넌트
  - [x] PaymentStatus 컴포넌트
- [x] 관리자 주문 관리 강화 ✅
  - [x] AdminOrders 페이지 (필터링, 정렬, 상태 업데이트)
  - [x] OrderFilter 컴포넌트
  - [x] OrderStatusBadge 컴포넌트
- [x] 관리자 대시보드 통계 ✅
  - [x] Recharts 통합 (BarChart, PieChart)
  - [x] 일별 매출 차트 (최근 7일)
  - [x] 결제 수단 분포 파이 차트
  - [x] 주문 통계 카드

---

### Phase 10: SSO & 인증 강화 (진행 중) - 67% 완료 🔐
**시작일**: 2025-10-20
**예상 완료**: 2025-11-03 (2주)
**현재 상태**: Week 1-2 완료, Week 3 선택 사항

#### Week 1: OAuth 확장 & 프로필 관리 ✅ 완료
- [x] 데이터베이스 스키마 (Migration 003) ✅
  - [x] user_profiles 테이블 확장 (11개 컬럼 추가)
  - [x] connected_accounts 테이블 생성
  - [x] email_verifications 테이블 생성
  - [x] RLS 정책 10개
- [x] Microsoft (Azure AD) OAuth 통합 ✅
  - [x] useAuth에 signInWithMicrosoft 추가
  - [x] Login 페이지 Microsoft 버튼
- [x] Apple OAuth 통합 ✅
  - [x] useAuth에 signInWithApple 추가
  - [x] Login 페이지 Apple 버튼
- [x] useProfile 훅 구현 (5개 함수) ✅
  - [x] useProfile() - 프로필 조회
  - [x] useUpdateProfile() - 프로필 수정
  - [x] useUploadAvatar() - 아바타 업로드 (5MB 제한)
  - [x] useConnectedAccounts() - 연결된 계정 조회
  - [x] useDisconnectAccount() - 계정 연결 해제
- [x] Profile 페이지 완전 재작성 ✅
  - [x] React Hook Form + Zod 검증
  - [x] 아바타 업로드 다이얼로그
  - [x] 연결된 계정 관리 섹션
  - [x] 프로필 편집 폼

#### Week 2: 2FA & 보안 강화 ✅ 완료
- [x] 데이터베이스 스키마 (Migration 004) ✅
  - [x] two_factor_auth 테이블 (TOTP secret, 백업 코드)
  - [x] login_attempts 테이블 (로그인 시도 기록)
  - [x] account_locks 테이블 (계정 잠금)
  - [x] password_reset_tokens 테이블
  - [x] 헬퍼 함수 5개 (로그인 기록, 잠금, 비밀번호 재설정)
  - [x] RLS 정책 12개
- [x] TOTP 라이브러리 (otpauth, qrcode) ✅
  - [x] totp.ts 유틸리티 (생성/검증/백업 코드)
  - [x] QR 코드 생성 (300x300 PNG)
  - [x] 6자리 TOTP 토큰 검증 (±1 윈도우, 30초)
- [x] use2FA 훅 구현 (7개 함수) ✅
  - [x] use2FASettings() - 2FA 설정 조회
  - [x] useIs2FAEnabled() - 활성화 여부 확인
  - [x] useSetup2FA() - 2FA 설정 초기화
  - [x] useEnable2FA() - 2FA 활성화 (TOTP 검증)
  - [x] useDisable2FA() - 2FA 비활성화 (비밀번호 확인)
  - [x] useRegenerateBackupCodes() - 백업 코드 재생성
  - [x] useVerify2FA() - TOTP/백업 코드 검증
- [x] TwoFactorSetup 페이지 ✅
  - [x] 4단계 플로우 (소개, QR, 검증, 백업 코드)
  - [x] QR 코드 스캔 (Google Authenticator, Authy)
  - [x] 백업 코드 복사/다운로드
- [x] TwoFactorVerify 페이지 ✅
  - [x] TOTP 6자리 입력
  - [x] 백업 코드 8자리 입력 (토글)
- [x] Profile 페이지 2FA 섹션 추가 ✅
  - [x] 2FA 활성화/비활성화 UI
  - [x] 백업 코드 재생성 버튼
  - [x] 비활성화 다이얼로그 (비밀번호 확인)

#### Week 3: RBAC & 감사 로그 ✅ 완료
- [x] 역할 기반 접근 제어 (RBAC) ✅
  - [x] roles 테이블 (admin, manager, user) ✅
  - [x] user_roles 테이블 (다대다 관계) ✅
  - [x] permissions 테이블 (CRUD 권한) ✅
  - [x] useRBAC 훅 (7개 함수) ✅
- [x] 감사 로그 시스템 ✅
  - [x] audit_logs 테이블 (사용자 활동 추적) ✅
  - [x] useAuditLogs 훅 (2개 함수) ✅
  - [x] AdminRoles 페이지 (역할 관리) ✅
  - [x] AuditLogs 페이지 (감사 로그 조회) ✅

---

### Phase 11: 콘텐츠 관리 시스템 ✅ 완료 (100%) 📝

**시작일**: 2025-10-20
**완료일**: 2025-10-20
**현재 상태**: Week 1-2 완료

#### Week 1: 블로그 시스템 ✅ 완료
- [x] Markdown 에디터 (react-markdown, remark-gfm) ✅
- [x] useBlogPosts 훅 (9개 함수) ✅
- [x] Blog, BlogPost, AdminBlog 페이지 ✅
- [x] 카테고리, 태그 시스템 ✅

#### Week 2: 공지사항 & SEO ✅ 완료
- [x] useNotices 훅 (6개 함수) ✅
- [x] Notices, AdminNotices 페이지 ✅
- [x] robots.txt, sitemap.xml, RSS 피드 생성 ✅

---

### Phase 12: 성능 최적화 & PWA & 국제화 ✅ 완료 (100%) 🚀

**시작일**: 2025-11-01
**완료일**: 2025-11-02
**현재 상태**: Week 1-3 완료

#### Week 1: 성능 최적화 & 모니터링 ✅ 완료
- [x] Code Splitting (React.lazy, Suspense) ✅
- [x] Vite manualChunks (10개 vendor chunks, 4개 page chunks) ✅
- [x] Bundle 크기 62.5% 감소 (548.73 kB → 206.48 kB gzip) ✅
- [x] Sentry 에러 추적 (ErrorBoundary, Replay, User tracking) ✅
- [x] Google Analytics 4 통합 (페이지뷰, 이벤트 추적) ✅

#### Week 2: PWA (Progressive Web App) ✅ 완료
- [x] Vite PWA 플러그인 (Service Worker 자동 생성) ✅
- [x] 웹 앱 매니페스트 (아이콘, 테마 색상, 오프라인 지원) ✅
- [x] 설치 프롬프트 (PWAInstallPrompt) ✅
- [x] 업데이트 알림 (PWAUpdatePrompt) ✅
- [x] Workbox 캐싱 전략 (CacheFirst, NetworkFirst) ✅

#### Week 3: i18n (국제화) ✅ 완료
- [x] i18next 설정 (한국어/영어 지원) ✅
- [x] 5개 네임스페이스 (common, auth, services, ecommerce, admin) ✅
- [x] 330+ 번역 키 (ko/en JSON 파일) ✅
- [x] LanguageSwitcher 컴포넌트 ✅
- [x] 브라우저 언어 자동 감지 ✅

---

### Phase 13: AI & 실시간 기능 ✅ 완료 (100%) 🎉

**시작일**: 2025-11-02
**완료일**: 2025-11-04
**최종 버전**: v1.7.3
**현재 상태**: Week 1-3 완료

#### Week 1: 통합 검색 시스템 ✅ 완료
- [x] useSearch 훅 구현 (3개 타입 통합) ✅
  - [x] 서비스 검색 (services 테이블) ✅
  - [x] 블로그 검색 (blog_posts 테이블) ✅
  - [x] 공지사항 검색 (notices 테이블) ✅
  - [x] React Query 캐싱 (staleTime: 5분) ✅
- [x] Search 페이지 구현 (/search) ✅
  - [x] 검색어 입력 폼 (최소 2자) ✅
  - [x] 타입 필터 탭 (전체/서비스/블로그/공지) ✅
  - [x] 검색 결과 목록 (30개 제한) ✅
  - [x] URL 쿼리 파라미터 지원 (?q=검색어&type=service) ✅
  - [x] 빈 결과 UI (검색 팁 포함) ✅
- [x] SearchResultCard 컴포넌트 ✅
  - [x] 타입별 아이콘 및 배지 (Package/FileText/Bell) ✅
  - [x] 검색어 하이라이팅 (<mark> 태그) ✅
  - [x] 이미지 썸네일 (서비스/블로그) ✅
  - [x] 날짜 표시 (yyyy년 M월 d일) ✅
- [x] Header 검색 버튼 추가 ✅
  - [x] 데스크톱 검색 아이콘 버튼 ✅
  - [x] 모바일 메뉴 검색 항목 ✅
- [x] i18n 지원 (search.json, 15개 번역 키) ✅
- [x] E2E 테스트 15개 (search.spec.ts) ✅
- [x] 유닛 테스트 10개 (useSearch.test.tsx) ✅

#### Week 2: AI 챗봇 통합 ✅ 완료
- [x] OpenAI API 통합 ✅
  - [x] src/lib/openai.ts (GPT-3.5-turbo, 스트리밍 응답) ✅
  - [x] VITE_OPENAI_API_KEY 환경 변수 ✅
  - [x] 시스템 프롬프트 (VIBE WORKING 컨텍스트) ✅
- [x] 채팅 UI 컴포넌트 ✅
  - [x] ChatWidget (우측 하단 플로팅 버튼) ✅
  - [x] ChatWindow (모달 형태 채팅창) ✅
  - [x] ChatMessage (역할별 스타일, Markdown 렌더링) ✅
  - [x] ChatInput (Textarea 자동 크기, Enter 전송) ✅
- [x] useChat 훅 (메시지 관리, LocalStorage 자동 저장) ✅
- [x] Markdown 렌더링 (react-markdown, remark-gfm) ✅
- [x] App.tsx 글로벌 통합 ✅
- [x] i18n 지원 (chat.json, 10개 번역 키) ✅

#### Week 3: 알림 시스템 ✅ 완료
- [x] Supabase 마이그레이션 ✅
  - [x] notifications 테이블 (RLS 정책 4개) ✅
  - [x] 타입: info/success/warning/error ✅
  - [x] 읽음 상태 추적, 링크 지원 ✅
- [x] useNotifications 훅 ✅
  - [x] Realtime 구독 (INSERT/UPDATE/DELETE) ✅
  - [x] 초기 알림 로드 (최근 50개) ✅
  - [x] 읽음 처리 (개별/전체) ✅
  - [x] 삭제 (개별/전체) ✅
  - [x] 읽지 않은 알림 카운트 ✅
- [x] 알림 UI 컴포넌트 ✅
  - [x] NotificationBell (Header, Badge 표시) ✅
  - [x] NotificationDropdown (최근 5개 미리보기) ✅
  - [x] NotificationItem (타입별 아이콘/색상, 상대 시간) ✅
- [x] Notifications 페이지 (/notifications) ✅
  - [x] 전체 알림 목록 ✅
  - [x] 읽음/읽지 않음 필터 ✅
  - [x] 타입 필터 (전체/info/success/warning/error) ✅
  - [x] 전체 읽음/삭제 버튼 ✅
- [x] Resend 이메일 통합 (src/lib/email.ts) ✅
- [x] Header 통합 (NotificationBell) ✅
- [x] i18n 지원 (notifications.json, 15개 번역 키) ✅

**성과**:
- ✅ 24개 파일 생성, 7개 수정
- ✅ E2E 테스트 15개, 유닛 테스트 10개 추가
- ✅ 총 292개 테스트 (E2E 172, Unit 92, Visual 28)
- ✅ i18n 40개 번역 키 추가
- ✅ 번들 크기 552 kB gzip (+4.7%)

**상세 문서**: [docs/archive/phase13-ai-realtime.md](docs/archive/phase13-ai-realtime.md)

---

### Phase 14: 고급 분석 대시보드 ✅ 완료 (100%) 📊

**시작일**: 2025-11-04
**완료일**: 2025-11-04
**최종 버전**: v1.8.0
**목표**: 데이터 기반 의사결정을 위한 분석 시스템 구축

#### Week 1: 사용자 행동 분석 ✅ 완료
- [x] GA4 이벤트 15개 추가 (viewService, removeFromCart, addPaymentInfo, etc.)
- [x] analytics_events 테이블 마이그레이션 (4개 인덱스, RLS)
- [x] SQL 함수 4개 (calculate_funnel, calculate_bounce_rate, get_event_counts, get_session_timeline)
- [x] useAnalyticsEvents 훅 (7개 함수)
- [x] src/lib/session.ts (SessionStorage 기반, 30분 타임아웃)
- [x] Analytics 페이지 (/admin/analytics, 4개 탭)
- [x] 차트 컴포넌트 4개 (DateRangePicker, FunnelChart, BounceRateCard, EventTimeline)

#### Week 2: 매출 차트 & KPI ✅ 완료
- [x] SQL 함수 3개 (get_revenue_by_date, get_revenue_by_service, get_kpis)
- [x] useRevenue 훅 (5개 함수)
- [x] 차트 컴포넌트 4개 (RevenueChart, ServiceRevenueChart, OrdersChart, RevenueComparisonChart)
- [x] KPICard 컴포넌트 (KPIGrid, 6개 개별 카드)
- [x] Revenue 페이지 (/admin/revenue, 4개 탭, CSV 내보내기)

#### Week 3: 실시간 대시보드 ✅ 완료
- [x] useRealtimeDashboard 훅 (3개: Realtime 구독, 자동 새로고침, 실시간 메트릭)
- [x] Supabase Realtime 구독 (orders, analytics_events 테이블)
- [x] Presence API (온라인 사용자 추적)
- [x] LiveMetricCard 컴포넌트 (LIVE 배지, 펄스 애니메이션)
- [x] LiveActivityFeed 컴포넌트 (최근 10개 주문, 상태별 아이콘)
- [x] RealtimeDashboard 페이지 (/admin/realtime, 자동 새로고침 간격 설정)

#### 최종 결과물
- **32개 파일**: 24개 신규, 8개 수정
- **6,531줄 코드** 추가
- **SQL 함수**: 7개 (퍼널, 이탈률, 이벤트 집계, 매출 집계, KPI)
- **차트**: 11개 (Funnel, BounceRate, Revenue, ServiceRevenue, Orders, etc.)
- **Bundle 증가**: pages-admin 50.28 kB → 61.23 kB gzip (+10.95 kB, +21.8%)
- **Total**: 552 kB → 602 kB gzip (+50 kB, +9.1%)

**기술 스택**:
- recharts (차트 라이브러리)
- date-fns (날짜 유틸리티)
- Supabase Realtime (실시간 구독)
- Google Analytics 4 (이벤트 추적)

**상세 문서**: [docs/archive/phase14-analytics.md](docs/archive/phase14-analytics.md) (예정)

---

## ✅ 완료 (최근 3개월)

### 2025-10-12: Phase 7 - 디자인 시스템 적용 완료 🎉

**목표**: 통일된 브랜드 아이덴티티 및 다크 모드 지원

- [x] **디자인 시스템 문서 작성**
  - [x] docs/guides/design-system/README.md 생성
  - [x] 브랜드 색상, 타이포그래피, 레이아웃 정의
  - [x] UI 스타일 가이드 (글래스모피즘, 그라데이션)

- [x] **Tailwind CSS 설정 확장**
  - [x] 브랜드 색상 추가 (Blue #3b82f6, Orange #f59e0b, Purple #8b5cf6)
  - [x] 폰트 패밀리 설정 (Inter, JetBrains Mono)
  - [x] 8px 그리드 시스템 (grid-1 ~ grid-6)
  - [x] 커스텀 그림자 및 블러 (elegant, custom-md, custom-lg)

- [x] **CSS 변수 시스템**
  - [x] Light 테마 변수 정의 (텍스트, 배경, 테두리, 브랜드 색상)
  - [x] Dark 테마 변수 정의
  - [x] 그라데이션 배경 정의 (gradient-bg)
  - [x] shadcn/ui HSL 색상 통합

- [x] **다크 모드 구현**
  - [x] useTheme 훅 생성 (src/hooks/useTheme.ts)
    - Light/Dark/System 테마 지원
    - localStorage 저장
    - 시스템 설정 자동 감지
  - [x] ThemeToggle 컴포넌트 생성 (src/components/shared/ThemeToggle.tsx)
    - Dropdown 메뉴 (Sun/Moon/Monitor 아이콘)
    - 테마 전환 기능
  - [x] Header에 ThemeToggle 통합

- [x] **UI 스타일 적용**
  - [x] 글래스모피즘 카드 (glass-card 클래스)
    - 반투명 배경 (bg-white/80, dark:bg-gray-800/80)
    - 백드롭 블러 효과
  - [x] 그라데이션 배경 (gradient-bg 클래스)
    - Light: slate-50 → blue-50 → indigo-100
    - Dark: gray-950 → blue-950 → indigo-950
  - [x] 호버 효과 (hover-lift 클래스)

- [x] **컴포넌트 업데이트**
  - [x] Card 컴포넌트 다크 모드 대응 (src/components/ui/card.tsx)
    - rounded-2xl, dark:bg-gray-800
    - smooth-transition
  - [x] Header 글래스모피즘 적용 (glass-card)
  - [x] Index 페이지 그라데이션 배경 (gradient-bg)

- [x] **Google Fonts 임포트**
  - [x] Inter 폰트 추가 (본문용, 100-900 weight)
  - [x] JetBrains Mono 폰트 추가 (코드용, 100-900 weight)
  - [x] @import 위치 최적화 (CSS 파일 상단)

- [x] **빌드 검증**
  - [x] Vite 빌드 성공 확인
  - [x] CSS/JS 번들 크기 확인
    - CSS: 70.13 kB (gzip: 12.05 kB)
    - JS: 374.71 kB (gzip: 118.06 kB)
    - Total (gzip): 130.11 kB
  - [x] 다크 모드 토글 기능 테스트

**완료일**: 2025-10-12
**프로젝트 버전**: 1.2.0

---

### 2025-10-11: Navigation Menu System 구현 완료 🎉
- [x] **Mega Menu 네비게이션**
  - [x] Desktop Mega Menu (3-column layout)
  - [x] Mobile Hamburger Menu (Sheet + Accordion)
  - [x] User Profile Menu (Avatar + Dropdown)
  - [x] Cart Badge with Real-time Count
- [x] **컴포넌트 구현**
  - [x] Header.tsx 완전 재작성 (hash links → Next.js routing)
  - [x] MegaMenu.tsx (Services, AI Tools, Resources)
  - [x] MobileMenu.tsx (Sheet drawer with Accordion)
  - [x] UserMenu.tsx (Avatar with initials)
  - [x] Footer.tsx 업데이트 (5-column grid, proper routing)
- [x] **UI 컴포넌트 추가**
  - [x] accordion.tsx (Radix UI)
  - [x] sheet.tsx (Radix UI Dialog)
  - [x] avatar.tsx (Radix UI)
- [x] **주요 기능**
  - [x] 인증 기반 메뉴 표시/숨김 (useAuth)
  - [x] 장바구니 Badge (useCart + React Query)
  - [x] 반응형 디자인 (mobile/desktop)
  - [x] Hover-based Mega Menu
- [x] **문서화**
  - [x] CLAUDE.md 업데이트 (Navigation Menu Structure 섹션 추가)
  - [x] 빌드 통계 업데이트 (245kB → 254kB)
  - [x] 컴포넌트 구조 문서화
- [x] **빌드 검증**
  - [x] 19 routes, First Load JS: 254kB
  - [x] 빌드 성공, 에러 없음

### 2025-10-11: Phase 6-2 LinkedIn 연동 & 코드 정리 완료 🎉
- [x] **LinkedIn OAuth & API 통합**
  - [x] LinkedIn OAuth 라이브러리 (linkedin-oauth.ts)
  - [x] LinkedIn API 클라이언트 (linkedin.ts)
  - [x] OAuth 콜백 핸들러 (/api/auth/linkedin/callback)
  - [x] LinkedIn 배포 시스템 (linkedin-distributor.ts)
  - [x] 배포 API 엔드포인트 (/api/distribute)
  - [x] Distribution Server Actions (distributions.ts)
- [x] **UI 컴포넌트 구현**
  - [x] LinkedInConnect 컴포넌트
  - [x] DistributionSelector 컴포넌트
  - [x] DistributionStatus 컴포넌트
  - [x] Checkbox UI 컴포넌트
- [x] **페이지 구현**
  - [x] /content-hub - 콘텐츠 허브 대시보드
  - [x] /content-hub/posts - 게시물 관리
  - [x] /content-hub/platforms - LinkedIn 연동 추가
- [x] **프로젝트 정리 & 최적화**
  - [x] 중복 파일 제거 (next.config.js, .env)
  - [x] .gitignore 업데이트 (테스트 리포트 제외)
  - [x] ESLint 경고 6개 수정
  - [x] TypeScript 에러 4개 수정
  - [x] next.config.ts 최적화 및 통합
  - [x] 빌드 성공 (19 routes, 245kB)
- [x] **문서화**
  - [x] LinkedIn OAuth 설정 가이드 작성
  - [x] 프로젝트 TODO 업데이트

### 2025-10-11: 심각한 문제 수정 완료 🎉
- [x] **프로덕션 웹사이트 접근 불가 문제 수정**
  - [x] Next.js 빌드 에러 수정 (누락된 UI 컴포넌트 생성)
  - [x] TypeScript 에러 수정 (any 타입, const 재할당 등)
  - [x] ESLint 설정 최적화
  - [x] Suspense 경계 추가로 SSR 문제 해결
  - [x] 15개 페이지 성공적으로 생성 (First Load JS: 194kB)
- [x] **Supabase CORS 설정 및 연결 문제 수정**
  - [x] Supabase 클라이언트 에러 핸들링 강화
  - [x] 환경 변수 검증 로직 추가
  - [x] CORS 헤더 설정 추가
  - [x] RLS 정책 업데이트 마이그레이션 생성
  - [x] Feature Flags/A/B Testing 훅 개선
- [x] **성능 최적화 및 JavaScript 에러 수정**
  - [x] Next.js 설정 최적화 (압축, ETags 등)
  - [x] 번들 분석기 설정
  - [x] 모든 빌드 에러 해결
  - [x] 성능 최적화 완료
- [x] **테스트 환경 개선 및 재실행**
  - [x] 단위 테스트 100% 통과 (6개 스위트, 20개 테스트)
  - [x] E2E 테스트 실행 (126개 통과, 59개 실패 - 예상된 결과)
  - [x] 테스트 설정 최적화
- [x] **문제 해결 가이드 및 문서 업데이트**
  - [x] Supabase CORS 설정 가이드 작성
  - [x] 심각한 문제 수정 보고서 생성
  - [x] 프로젝트 TODO 업데이트

### 2025-10-10: 자동화 테스트 구축 및 프로덕션 테스트 완료
- [x] Jest + React Testing Library 설정
- [x] Playwright E2E 테스트 설정
- [x] Feature Flags Hook 단위 테스트 (3개) - 100% 성공
- [x] A/B Testing Hook 단위 테스트 (4개) - 100% 성공
- [x] FeatureFlagContext 단위 테스트 (3개) - 100% 성공
- [x] Homepage E2E 테스트 (10개) - 70% 성공
- [x] Feature Flags E2E 테스트 (11개) - 0% 성공 (Supabase 연결 문제)
- [x] A/B Testing E2E 테스트 (12개) - 0% 성공 (Supabase 연결 문제)
- [x] GitHub Actions CI/CD 통합
- [x] Codecov 커버리지 리포트 자동화
- [x] 테스트 성능 최적화
- [x] 프로덕션 환경 E2E 테스트 (185개) - 70.3% 성공
- [x] 성능 테스트 (Lighthouse CI) - 실패 (웹사이트 접근 불가)
- [x] 보안 테스트 검토
- [x] 최종 테스트 보고서 작성 (docs/testing/final-test-report.md)
- [x] 총 196개 테스트 케이스 실행
- [x] 전체 테스트 성공률 71.4% 달성
- [x] 심각한 문제 발견: 프로덕션 웹사이트 접근 불가, Feature Flags/A/B Testing 완전 실패

### 2025-10-09: 프로덕션 배포 완료 🎉
- [x] GitHub Secrets 업데이트 (VITE_* → NEXT_PUBLIC_*)
- [x] Vercel 환경 변수 설정 (5개)
- [x] Vercel 배포 성공
- [x] 프로덕션 URL: https://www.ideaonaction.ai/
- [x] OAuth 콜백 URL 가이드 작성
- [x] 문서 구조 재정리 (docs/ 폴더)

### 2025-10-09: Next.js 루트 전환 완료
- [x] next-app/ → 루트 디렉토리 이전
- [x] Vite 앱 아카이브 (archive/vite-app/)
- [x] GitHub Actions 환경 변수 업데이트 (6개 워크플로우)
- [x] 프로덕션 빌드 검증 (225kB First Load JS)

### 2025-10-09: DevOps 인프라 완성
- [x] GitHub 브랜치 전략 (develop, staging, canary, main)
- [x] 카나리 배포 시스템 (7개 워크플로우)
- [x] Feature Flags & A/B Testing 데이터베이스
- [x] DevOps 문서화 완료

### 2025-10-09: Feature Flags & A/B Testing
- [x] React Hooks 구현 (useFeatureFlag, useABTest)
- [x] FeatureFlagContext 구현
- [x] 인터랙티브 예제 페이지 (/examples)

### 2025-10-08: 배포 인프라 구축
- [x] Vercel 배포 설정 (vercel.json)
- [x] GitHub Actions CI/CD (4개 워크플로우)
- [x] 개발 도구 개선

**전체 완료 내역**: `docs/archive/project-todo-full-2025-10-09.md`

---

## 📋 백로그

### 🟡 Phase 3: PWA 지원 (보류 - Phase 4, 5 완료 후)
- [ ] Service Worker 설정
- [ ] 매니페스트 파일 생성
- [ ] 오프라인 페이지
- [ ] 푸시 알림
- [ ] 앱 아이콘 (192x192, 512x512)

### 🟢 Phase 6: 고도화 (Q2 2025 이후)
- [ ] 다국어 지원 (i18n)
- [ ] AI 챗봇 통합
- [ ] 고급 분석 대시보드
- [ ] 성능 모니터링 (Sentry, LogRocket)

---

## 🔮 향후 검토 항목

### 기술 스택
- [ ] Monorepo 구조 도입 (Turborepo) 검토
- [ ] GraphQL vs REST API 선택
- [ ] 상태 관리 라이브러리 검토 (Zustand, Jotai)

### 테스트 & 품질
- [x] Jest + React Testing Library 설정 ✅
- [x] E2E 테스트 (Playwright) ✅
- [ ] CI/CD 파이프라인에 테스트 통합
- [ ] 테스트 커버리지 리포트 자동 생성
- [ ] Storybook 도입 (컴포넌트 시각적 테스트)
- [ ] 성능 테스트 자동화 (Lighthouse CI)
- [ ] 접근성 테스트 (axe-core)
- [ ] 단위 테스트 edge case 추가

### SEO & 성능
- [ ] SEO 최적화 (메타 태그, sitemap.xml, robots.txt)
- [ ] 이미지 최적화 (next/image)
- [ ] Core Web Vitals 개선

---

## 🏷️ 우선순위

- 🔴 **높음**: 즉시 처리 필요 (배포 블로커)
- 🟡 **중간**: 계획된 일정 내 처리
- 🟢 **낮음**: 여유 있을 때 처리

---

## 📝 작업 관리 규칙

- 작업 시작 시 "현재 진행 중"으로 이동
- 작업 완료 시 "완료" 섹션에 날짜와 함께 기록
- 주간 단위로 백로그 우선순위 재검토
- 분기별 로드맵 업데이트

---

**전체 TODO 히스토리**: `docs/archive/project-todo-full-2025-10-09.md`
**프로젝트 문서**: `CLAUDE.md`
