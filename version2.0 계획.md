# 🌱 IDEA on Action — Version 2.0 Plan  
_“아이디어가 움직이는 곳”_

---

## 0. Overview

**Version:** 2.0  
**Type:** Product Evolution / Community Transformation  
**Date:** 2025-11-09  
**Maintainer:** @SinclairSeo  
**Repository:** [IDEA-on-Action/idea-on-action](https://github.com/IDEA-on-Action/idea-on-action)

---

## 1. Vision & Direction

> **생각을 멈추지 않고, 행동으로 옮기는 회사.**
>
> IDEA on Action은 “아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오”로 진화합니다.  
> Version 2.0에서는 단순한 소개용 웹사이트를 넘어 **Roadmap, Portfolio, Now, Lab, Community**가 상호작용하는 형태로 확장합니다.

---

## 2. Key Goals

| 구분 | 목표 | KPI (지표) |
|------|------|-------------|
| **콘텐츠화** | About / Roadmap / Portfolio / Now / Lab 페이지 완성 | 페이지 정상동작, 3건 이상의 데이터 |
| **데이터 기반화** | 정적 JSON → Supabase Schema로 전환 | CRUD API 연결 및 Admin UI |
| **커뮤니티 구축** | Giscus 기반 피드백/토론 활성화 | 댓글/참여율 15% 이상 |
| **참여 유도** | Work with Us 폼 + Bounty 시스템 | 제안/참여 5건 이상 |
| **오픈 메트릭스** | 활동지표 투명 공개 | Status 페이지 1개 운영 |
| **자동화 운영** | 주간 리캡 자동 요약 및 발행 | Weekly Recap 자동 생성 성공 |

---

## 3. Roadmap (3 Sprint Plan)

### 🏁 Sprint 1 — Structure & Static Data (Week 1)
**목표:** 정보 구조 및 정적 데이터 기반 페이지 구축  
**작업 항목**
- [ ] React Router 라우팅 확장  
  `/about`, `/roadmap`, `/portfolio`, `/portfolio/:id`, `/now`, `/lab`, `/community`, `/work-with-us`, `/blog`
- [ ] 기존 Hero/Feature 컴포넌트 재활용 → Home 구성 강화  
- [ ] 정적 데이터(JSON) 생성  
  - `/src/data/projects.json`  
  - `/src/data/roadmap.json`  
  - `/src/data/logs.json`  
  - `/src/data/bounties.json`  
- [ ] SEO/OG/JSON-LD 메타태그 추가  
- [ ] Lighthouse 90+ 점 유지  

---

### ⚙️ Sprint 2 — Supabase Integration & Community (Week 2)
**목표:** 데이터베이스 및 참여 기능 활성화  
**작업 항목**
- [ ] Supabase 연결 및 테이블 스키마 생성  
  ```sql
  projects, roadmap, logs, bounties, posts, comments, profiles
 Supabase .env 구성

makefile
코드 복사
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
 Giscus 댓글 임베드 (Community + Blog)

 Work with Us 폼 + Webhook 알림 (Cal.com 또는 Google Calendar 연동)

 Newsletter (Resend / Beehiiv 위젯) 추가

🔄 Sprint 3 — Automation & Open Metrics (Week 3)
목표: 자동화, 분석, 공개지표 시스템 구축
작업 항목

 Now / Changelog 주간 리캡 자동 생성 (Supabase Function)

 /status 페이지 — 오픈 메트릭스 노출

프로젝트 수, 참여자, 커뮤니티 댓글 수, 바운티 완료율

 이벤트 트래킹 삽입

view_home, cta_click, subscribe_newsletter, join_community, apply_bounty

 Vitest 단위 테스트 + Playwright E2E 테스트

 SEO / 사이트맵 / robots.txt / 구조화 데이터

4. Information Architecture
pgsql
코드 복사
/
├── Home (Now, Roadmap, Portfolio, Bounty)
├── About (우리는 어떤 회사인가)
├── Roadmap (Quarterly 목표 + 진행률)
├── Portfolio (Case Study 목록)
│   └── [slug] (상세 페이지)
├── Now (최근 활동 / 로그)
├── Lab (실험 / Bounty / Prototype)
├── Community (Giscus 기반 토론)
├── Blog (Notes / Weekly Recap)
│   └── [slug] (상세 페이지)
├── Work-with-Us (의뢰 / 협업)
└── Status (Open Metrics)
5. Data Model (Supabase Schema)
sql
코드 복사
-- Projects
create table projects (
  id text primary key,
  title text,
  summary text,
  status text check (status in ('backlog','in-progress','validate','launched')),
  tags text[],
  metrics jsonb,
  links jsonb,
  created_at timestamptz default now()
);

-- Roadmap
create table roadmap (
  id bigserial primary key,
  quarter text,
  goal text,
  progress int,
  owner text,
  related_projects text[]
);

-- Logs / Now
create table logs (
  id bigserial primary key,
  type text check (type in ('decision','learning','release')),
  content text,
  project_id text references projects(id),
  created_at timestamptz default now()
);

-- Bounties
create table bounties (
  id bigserial primary key,
  title text,
  skill text,
  reward int,
  deadline date,
  status text check (status in ('open','assigned','done')),
  applicants uuid[]
);

-- Posts (Blog)
create table posts (
  id bigserial primary key,
  slug text unique,
  title text,
  body text,
  tags text[],
  series text,
  published_at timestamptz
);

-- Comments
create table comments (
  id bigserial primary key,
  parent_id bigint,
  author uuid references auth.users(id),
  content text,
  upvotes int default 0,
  created_at timestamptz default now()
);
6. Component Mapping
페이지	주요 컴포넌트	데이터 소스
Home	Hero, NowList, RoadmapProgress, PortfolioHighlight, OpenBounty	JSON/Supabase
About	Mission, Vision, Values, TeamSection	정적
Roadmap	QuarterTabs, ProgressRing, RiskBadge	Supabase
Portfolio	CaseCard, FilterBar, DetailLayout	Supabase
Now	LogCard, WeeklyRecap	Supabase
Lab	ExperimentCard, BountyCard	Supabase
Community	GiscusEmbed	GitHub Discussions
Blog	PostList, PostDetail	Markdown/Supabase
Work with Us	PackageTile, BriefForm	Supabase
Status	MetricCard, ChartBlock	Supabase / Plausible

7. Automation & AI Integration
기능	설명	구현 방법
Weekly Recap 자동 생성	Logs → 주간 요약 자동 Markdown 생성	Supabase Function + CRON
AI 요약/추천	프로젝트/실험 내용을 요약	Vibe Coding Agent 활용 (로컬 API)
Open Metrics	활동 데이터 자동 집계	API /api/metrics
뉴스레터 자동화	Recap → Newsletter 발행 초안	Beehiiv / Resend API

8. UI/UX Principles
“호기심 유발 + 진정성”

여백 중심, 타이포 강조, 포커스 컬러 1개

카드형 구조 / Micro Animation / Hover Reveal

접근성 (Lighthouse 90+ 유지)

9. Test & Quality
구분	도구	주요 시나리오
단위 테스트	Vitest	컴포넌트 렌더링, 데이터 매퍼
E2E 테스트	Playwright	Home → Portfolio → Detail / Form 제출 / 댓글
품질 검증	Lighthouse CI	성능/접근성/SEO 자동 체크

10. Deployment & Ops
Hosting: Vercel (CI/CD)

DB: Supabase

Analytics: Plausible / PostHog

Email: Resend

Community: Giscus (GitHub Discussions)

CI/CD: GitHub Actions

Branch: main → production / dev → preview

11. Issue Templates
이름	설명
[feat] 페이지 추가	신규 페이지/컴포넌트
[data] CMS 연동	Supabase/데이터 구조 변경
[community] 참여 기능	댓글, Bounty, Newsletter
[ops] 자동화	리캡/알림/오픈메트릭스
[test] 품질 검증	Vitest, Playwright, Lighthouse

12. Launch Checklist
 About / Roadmap / Portfolio / Now / Lab / Community 페이지 구현

 Supabase 연결 및 환경변수 설정

 목데이터(프로젝트 3 / 로그 10 / 로드맵 5 / 바운티 2)

 Giscus + Work with Us 폼 + Newsletter 위젯

 Open Metrics / 분석 이벤트 삽입

 SEO / Sitemap / robots.txt

 Vitest / Playwright 테스트 3건

 README 업데이트

13. Timeline (3 Weeks)
주차	목표	결과물
Week 1	IA 구조 / 정적 데이터 완성	라우팅 + 목데이터
Week 2	Supabase 연동 / 커뮤니티 기능	DB 연동 + 댓글/폼
Week 3	자동화 / 메트릭스 / 테스트	Status + Recap + QA

14. Outcome
💡 From: 소개용 정적 웹사이트

🚀 To: 실시간 커뮤니티형 프로덕트 스튜디오

핵심 루프:
“아이디어 → 실험 → 결과공유 → 참여 → 다음 아이디어”

15. Next Step
 Supabase Schema 초기화 및 연결 테스트

 /about, /roadmap, /portfolio 페이지 부터 차례대로 개발

 Home 4블록 (Now/Roadmap/Portfolio/Bounty) 데이터 연결

 주간 리캡 자동화 Function 작성

 Vibe Coding Agent 통합 논의

