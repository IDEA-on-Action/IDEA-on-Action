# 사이트 재구조화 아키텍처

> 새로운 사이트 구조의 기술적 설계

**작성일**: 2025-11-23
**버전**: 1.0.0
**상태**: Draft

---

## 1. 전체 구조 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        Header                                │
│  [홈] [서비스] [프로젝트] [이야기] [함께하기]                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐         ┌─────────────┐       ┌──────────┐
   │   홈    │         │   서비스     │       │ 프로젝트  │
   │   (/)   │         │ (/services) │       │(/projects)│
   └─────────┘         └─────────────┘       └──────────┘
        │                     │                     │
        │              ┌──────┴──────┐       ┌──────┴──────┐
        │              │             │       │             │
        │         ┌────▼────┐  ┌─────▼────┐  │  진행중     │
        │         │Development│  │  Minu   │  │  출시됨     │
        │         └─────────┘  └──────────┘  │  실험중     │
        │                                    │  로드맵     │
        │                                    └─────────────┘
        │
        ├─────────────────────┬─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐         ┌─────────────┐       ┌──────────┐
   │ 이야기  │         │  함께하기    │       │  Footer   │
   │(/stories)│        │ (/connect)  │       │           │
   └─────────┘         └─────────────┘       └──────────┘
        │                     │
   ┌────┴────┐           ┌────┴────┐
   │ 블로그   │           │ 문의    │
   │ 뉴스레터 │           │ 채용    │
   │ Changelog│          │ 커뮤니티 │
   │ 공지사항 │           └─────────┘
   └─────────┘
```

---

## 2. 라우팅 구조

### 2.1 새로운 라우트 맵

```typescript
// App.tsx 라우트 구조

// 메인 페이지
"/" → Index.tsx (홈)

// 서비스
"/services" → ServicesHub.tsx (서비스 허브)
"/services/development" → DevelopmentServices.tsx
"/services/development/:slug" → ServiceDetail.tsx (mvp, fullstack, design, operations)
"/services/minu" → MinuPlatformPage.tsx
"/services/minu/:slug" → MinuServiceDetail.tsx (find, frame, build, keep)

// 프로젝트 (통합)
"/projects" → ProjectsHub.tsx (프로젝트 허브)
  ?tab=in-progress (기본값)
  ?tab=released
  ?tab=lab
  ?tab=roadmap
"/projects/:slug" → ProjectDetail.tsx

// 이야기
"/stories" → StoriesHub.tsx (이야기 허브)
"/stories/blog" → Blog.tsx
"/stories/blog/:slug" → BlogPost.tsx
"/stories/newsletter" → NewsletterArchive.tsx (신규)
"/stories/newsletter/:id" → NewsletterDetail.tsx (신규)
"/stories/changelog" → Changelog.tsx (신규)
"/stories/notices" → Notices.tsx

// 함께하기
"/connect" → ConnectHub.tsx (함께하기 허브)
"/connect/inquiry" → ProjectInquiry.tsx (WorkWithUs 이전)
"/connect/careers" → Careers.tsx (신규)
"/connect/community" → Community.tsx
```

### 2.2 리디렉션 맵

```typescript
// 301 Redirects
"/about" → "/"
"/roadmap" → "/projects?tab=roadmap"
"/portfolio" → "/projects"
"/portfolio/:slug" → "/projects/:slug"
"/lab" → "/projects?tab=lab"
"/work-with-us" → "/connect/inquiry"
"/blog" → "/stories/blog"
"/blog/:slug" → "/stories/blog/:slug"
"/notices" → "/stories/notices"
"/community" → "/connect/community"
```

---

## 3. 컴포넌트 구조

### 3.1 레이아웃 컴포넌트

```
src/components/layout/
├── Header.tsx          # 5개 메뉴로 수정
├── Footer.tsx          # 기존 유지
├── Layout.tsx          # 기존 유지
├── MobileMenu.tsx      # 5개 메뉴로 수정
└── Breadcrumb.tsx      # 신규 (선택적)
```

### 3.2 허브 페이지 컴포넌트

```
src/pages/
├── Index.tsx           # 홈 (수정)
│
├── services/
│   ├── ServicesHub.tsx       # 신규: 서비스 허브
│   ├── DevelopmentServices.tsx # 기존 이전
│   └── MinuPlatformPage.tsx  # 기존 유지
│
├── projects/
│   ├── ProjectsHub.tsx       # 신규: 통합 프로젝트
│   ├── ProjectDetail.tsx     # 기존 PortfolioDetail 이전
│   ├── components/
│   │   ├── ProjectCard.tsx   # 기존 수정
│   │   ├── ProjectFilters.tsx # 신규
│   │   ├── RoadmapTab.tsx    # 기존 Roadmap에서 추출
│   │   └── LabTab.tsx        # 기존 Lab에서 추출
│   └── tabs/
│       ├── InProgressTab.tsx
│       ├── ReleasedTab.tsx
│       ├── LabTab.tsx
│       └── RoadmapTab.tsx
│
├── stories/
│   ├── StoriesHub.tsx        # 신규: 이야기 허브
│   ├── Blog.tsx              # 기존 유지
│   ├── BlogPost.tsx          # 기존 유지
│   ├── NewsletterArchive.tsx # 신규
│   ├── NewsletterDetail.tsx  # 신규
│   ├── Changelog.tsx         # 신규
│   └── Notices.tsx           # 기존 이전
│
└── connect/
    ├── ConnectHub.tsx        # 신규: 함께하기 허브
    ├── ProjectInquiry.tsx    # 기존 WorkWithUs 이전
    ├── Careers.tsx           # 신규
    └── Community.tsx         # 기존 이전
```

### 3.3 공유 컴포넌트

```
src/components/shared/
├── ProgressBar.tsx      # 진척률 표시 (기존 확장)
├── StatusBadge.tsx      # 상태 배지 (기존 확장)
├── SectionHeader.tsx    # 섹션 헤더 (신규)
├── HubNavigation.tsx    # 허브 페이지 네비게이션 (신규)
└── TabNavigation.tsx    # 탭 네비게이션 (신규)
```

---

## 4. 데이터 흐름

### 4.1 기존 훅 재사용

```typescript
// 프로젝트
useProjects()       → ProjectsHub (진행중, 출시됨)
useBounties()       → ProjectsHub (실험중 탭)
useRoadmap()        → ProjectsHub (로드맵 탭)

// 서비스
useServices()       → ServicesHub
useServicePackages()
useSubscriptionPlans()

// 이야기
useWordPressPosts() → Blog
useLogs()           → Changelog (활동 로그)
useNotices()        → Notices

// 뉴스레터
useNewsletterSubscribers() → Admin만
// 신규 필요: 발송된 뉴스레터 조회 훅
```

### 4.2 신규 훅

```typescript
// src/hooks/useNewsletterArchive.ts
export function useNewsletterArchive(options?: {
  page?: number;
  limit?: number;
}): {
  newsletters: Newsletter[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
}

// src/hooks/useChangelog.ts
export function useChangelog(options?: {
  projectId?: string;
  limit?: number;
}): {
  releases: Release[];
  isLoading: boolean;
  error: Error | null;
}

// src/hooks/useGitHubStats.ts
export function useGitHubStats(repoUrl: string): {
  commits: number;
  contributors: number;
  stars: number;
  lastUpdated: Date;
  isLoading: boolean;
}
```

---

## 5. 데이터베이스 확장

### 5.1 신규 테이블

```sql
-- 발송된 뉴스레터 아카이브
CREATE TABLE newsletter_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Changelog / 릴리즈 노트
CREATE TABLE changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  changes JSONB, -- [{type: 'feature'|'fix'|'breaking', description: '...'}]
  project_id UUID REFERENCES projects(id),
  released_at TIMESTAMPTZ NOT NULL,
  github_release_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- GitHub 캐시 (선택적)
CREATE TABLE github_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT NOT NULL UNIQUE,
  commits INTEGER DEFAULT 0,
  contributors INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);
```

### 5.2 기존 테이블 확장

```sql
-- projects 테이블에 GitHub 정보 추가 (이미 있을 수 있음)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
```

---

## 6. 상태 관리

### 6.1 URL 기반 상태

```typescript
// ProjectsHub.tsx
const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get('tab') || 'in-progress';

// 탭 변경 시
const handleTabChange = (tab: string) => {
  setSearchParams({ tab });
};
```

### 6.2 React Query 캐싱

```typescript
// 프로젝트 데이터
queryKey: ['projects', { status, page }]
staleTime: 5 * 60 * 1000 // 5분

// 로드맵 데이터
queryKey: ['roadmap', { quarter }]
staleTime: 10 * 60 * 1000 // 10분

// 뉴스레터 아카이브
queryKey: ['newsletter-archive', { page }]
staleTime: 30 * 60 * 1000 // 30분

// Changelog
queryKey: ['changelog', { projectId }]
staleTime: 10 * 60 * 1000 // 10분

// GitHub 통계
queryKey: ['github-stats', repoUrl]
staleTime: 60 * 60 * 1000 // 1시간
```

---

## 7. 코드 스플리팅

### 7.1 Lazy Loading

```typescript
// App.tsx
const ServicesHub = lazy(() => import('./pages/services/ServicesHub'));
const ProjectsHub = lazy(() => import('./pages/projects/ProjectsHub'));
const StoriesHub = lazy(() => import('./pages/stories/StoriesHub'));
const ConnectHub = lazy(() => import('./pages/connect/ConnectHub'));
const Changelog = lazy(() => import('./pages/stories/Changelog'));
const NewsletterArchive = lazy(() => import('./pages/stories/NewsletterArchive'));
const Careers = lazy(() => import('./pages/connect/Careers'));
```

### 7.2 번들 분석

```
예상 청크 구조:
- vendor-react.js (~45 KB gzip)
- vendor-ui.js (~30 KB gzip)
- main.js (~50 KB gzip)
- pages/services.js (~20 KB gzip)
- pages/projects.js (~25 KB gzip)
- pages/stories.js (~15 KB gzip)
- pages/connect.js (~10 KB gzip)
```

---

## 8. SEO 구조

### 8.1 메타 태그 템플릿

```typescript
// 각 허브 페이지
const META = {
  '/': {
    title: 'IDEA on Action - 생각을 행동으로',
    description: '아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오',
  },
  '/services': {
    title: '서비스 - IDEA on Action',
    description: 'MVP 개발, 풀스택 개발, 디자인 시스템, Minu 플랫폼',
  },
  '/projects': {
    title: '프로젝트 - IDEA on Action',
    description: '진행중인 프로젝트와 출시된 서비스',
  },
  '/stories': {
    title: '이야기 - IDEA on Action',
    description: '블로그, 뉴스레터, 릴리즈 노트',
  },
  '/connect': {
    title: '함께하기 - IDEA on Action',
    description: '프로젝트 문의, 채용, 커뮤니티',
  },
};
```

### 8.2 sitemap.xml 구조

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 메인 -->
  <url><loc>https://www.ideaonaction.ai/</loc></url>

  <!-- 서비스 -->
  <url><loc>https://www.ideaonaction.ai/services</loc></url>
  <url><loc>https://www.ideaonaction.ai/services/mvp</loc></url>
  <url><loc>https://www.ideaonaction.ai/services/fullstack</loc></url>
  <url><loc>https://www.ideaonaction.ai/services/design</loc></url>
  <url><loc>https://www.ideaonaction.ai/services/operations</loc></url>
  <url><loc>https://www.ideaonaction.ai/services/minu/find</loc></url>
  <url><loc>https://www.ideaonaction.ai/services/minu/frame</loc></url>
  <url><loc>https://www.ideaonaction.ai/services/minu/build</loc></url>
  <url><loc>https://www.ideaonaction.ai/services/minu/keep</loc></url>

  <!-- 프로젝트 -->
  <url><loc>https://www.ideaonaction.ai/projects</loc></url>

  <!-- 이야기 -->
  <url><loc>https://www.ideaonaction.ai/stories</loc></url>
  <url><loc>https://www.ideaonaction.ai/stories/blog</loc></url>
  <url><loc>https://www.ideaonaction.ai/stories/changelog</loc></url>

  <!-- 함께하기 -->
  <url><loc>https://www.ideaonaction.ai/connect</loc></url>
  <url><loc>https://www.ideaonaction.ai/connect/inquiry</loc></url>
</urlset>
```

---

## 관련 문서

- [implementation-strategy.md](./implementation-strategy.md) - 구현 전략
- [spec/site-restructure/requirements.md](../../spec/site-restructure/requirements.md) - 요구사항
