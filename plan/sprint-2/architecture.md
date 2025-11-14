# Sprint 2 아키텍처 설계
## Supabase Integration & Community

**작성일**: 2025-11-14
**Sprint**: 2 / 3
**상태**: 📋 Draft

---

## 📖 목차

1. [시스템 개요](#시스템-개요)
2. [데이터베이스 스키마](#데이터베이스-스키마)
3. [컴포넌트 구조](#컴포넌트-구조)
4. [데이터 플로우](#데이터-플로우)
5. [외부 서비스 통합](#외부-서비스-통합)

---

## 🏗️ 시스템 개요

### 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                     프론트엔드 (React)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │Portfolio │  │ Roadmap  │  │   Now    │  │   Lab    │    │
│  │  Page    │  │  Page    │  │  Page    │  │  Page    │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │              │             │           │
│  ┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐  ┌───▼──────┐   │
│  │useProjects│ │useRoadmap│  │ useLogs  │  │useBounties│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │              │             │           │
│       └─────────────┴──────────────┴─────────────┘           │
│                        │                                     │
│              ┌─────────▼────────────┐                        │
│              │  React Query Cache   │                        │
│              └─────────┬────────────┘                        │
│                        │                                     │
├────────────────────────┼─────────────────────────────────────┤
│                        │                                     │
│              ┌─────────▼────────────┐                        │
│              │  Supabase Client     │                        │
│              └─────────┬────────────┘                        │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │
            ┌────────────▼────────────┐
            │  Supabase PostgreSQL    │
            │  (RLS Enabled)          │
            │                         │
            │  ┌──────────────────┐   │
            │  │  projects        │   │
            │  │  roadmap         │   │
            │  │  logs            │   │
            │  │  bounties        │   │
            │  │  work_inquiries  │   │
            │  │  newsletter_subs │   │
            │  └──────────────────┘   │
            └─────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              외부 서비스 통합 (Sprint 2)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Giscus     │  │   Resend     │  │  Supabase    │      │
│  │  (댓글)       │  │  (이메일)     │  │ (Newsletter) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│       ↓                 ↓                  ↓                 │
│  GitHub          관리자 이메일        구독자 이메일          │
│  Discussions     알림 발송            (Optional)            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 주요 레이어

1. **프레젠테이션 레이어** (React Components)
   - 페이지 컴포넌트 (Portfolio, Roadmap, Now, Lab)
   - UI 컴포넌트 (shadcn/ui)

2. **비즈니스 로직 레이어** (React Hooks)
   - 커스텀 훅 (useProjects, useRoadmap, useLogs, useBounties)
   - React Query 캐싱

3. **데이터 액세스 레이어** (Supabase Client)
   - Supabase JavaScript Client
   - RLS 정책 자동 적용

4. **데이터 레이어** (Supabase PostgreSQL)
   - 6개 테이블 (5개 기존 + 1개 신규)
   - RLS (Row Level Security) 정책

5. **외부 서비스 레이어**
   - Giscus (댓글 시스템)
   - Resend (이메일 발송)

---

## 🗄️ 데이터베이스 스키마

### 기존 테이블 (Sprint 1에서 생성됨)

#### 1. projects (포트폴리오 프로젝트)

**용도**: Portfolio 페이지에서 프로젝트 목록 표시

**스키마**:
```sql
CREATE TABLE public.projects (
  id TEXT PRIMARY KEY,                -- 프로젝트 ID (예: "ai-chatbot")
  slug TEXT UNIQUE NOT NULL,          -- URL 슬러그
  title TEXT NOT NULL,                -- 제목 (예: "AI 챗봇")
  summary TEXT NOT NULL,              -- 요약 (1-2줄)
  description TEXT,                   -- 상세 설명 (Markdown)
  status TEXT NOT NULL CHECK (status IN ('backlog', 'in-progress', 'validate', 'launched')),
  category TEXT NOT NULL,             -- 카테고리 (AI, Automation, Community)
  image TEXT,                         -- 대표 이미지 URL
  tags TEXT[] DEFAULT '{}',           -- 태그 배열
  metrics JSONB DEFAULT '{}',         -- {progress: 75, contributors: 3, commits: 120}
  tech JSONB DEFAULT '{}',            -- {frontend: ["React"], backend: ["Supabase"]}
  links JSONB DEFAULT '{}',           -- {github: "URL", demo: "URL"}
  timeline JSONB DEFAULT '{}',        -- {start: "2025-01", end: "2025-03"}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**인덱스**:
- `idx_projects_status` (status) - 상태별 필터링
- `idx_projects_category` (category) - 카테고리별 필터링
- `idx_projects_slug` (slug) - URL 라우팅
- `idx_projects_created_at` (created_at DESC) - 최신순 정렬

**RLS 정책**:
- ✅ SELECT: 모두 허용
- ✅ INSERT/UPDATE/DELETE: 관리자만

**파일**: `supabase/migrations/20250109000001_create_projects.sql`

---

#### 2. roadmap (분기별 로드맵)

**용도**: Roadmap 페이지에서 분기별 목표 및 진행률 표시

**스키마**:
```sql
CREATE TABLE public.roadmap (
  id BIGSERIAL PRIMARY KEY,
  quarter TEXT NOT NULL,              -- "2025 Q4"
  goal TEXT NOT NULL,                 -- 목표 (예: "커뮤니티 기능 구축")
  progress INT NOT NULL CHECK (progress >= 0 AND progress <= 100),
  risk TEXT,                          -- 리스크 (Low/Medium/High)
  owner TEXT NOT NULL,                -- 책임자 (예: "Sinclair Seo")
  related_projects TEXT[],            -- 관련 프로젝트 ID 배열
  period TEXT,                        -- 기간 (예: "2025-10 ~ 2025-12")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**인덱스**:
- `idx_roadmap_quarter` (quarter) - 분기별 조회

**RLS 정책**:
- ✅ SELECT: 모두 허용 (anon 역할 GRANT 완료)
- ✅ INSERT/UPDATE/DELETE: 관리자만

**파일**: `supabase/migrations/20250109000002_create_roadmap.sql`

---

#### 3. logs (활동 로그)

**용도**: Now 페이지에서 최근 의사결정/학습/릴리스 로그 표시

**스키마**:
```sql
CREATE TABLE public.logs (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('decision', 'learning', 'release')),
  content TEXT NOT NULL,              -- 로그 내용
  project_id TEXT,                    -- 관련 프로젝트 ID (FOREIGN KEY)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**인덱스**:
- `idx_logs_type` (type) - 타입별 필터링
- `idx_logs_created_at` (created_at DESC) - 최신순 정렬

**RLS 정책**:
- ✅ SELECT: 모두 허용
- ✅ INSERT/UPDATE/DELETE: 관리자만

**파일**: `supabase/migrations/20250109000003_create_logs.sql`

---

#### 4. bounties (오픈 바운티)

**용도**: Lab 페이지에서 바운티 목록 표시

**스키마**:
```sql
CREATE TABLE public.bounties (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,                -- 바운티 제목
  skill TEXT NOT NULL,                -- 필요 스킬 (Frontend, Backend, Design)
  reward INT NOT NULL,                -- 보상 금액 (KRW)
  deadline DATE,                      -- 마감일
  status TEXT NOT NULL CHECK (status IN ('open', 'assigned', 'done')),
  description TEXT,                   -- 상세 설명
  applicants UUID[],                  -- 지원자 ID 배열
  assigned_to UUID,                   -- 배정된 사용자 ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

**인덱스**:
- `idx_bounties_status` (status) - 상태별 필터링
- `idx_bounties_deadline` (deadline) - 마감일 정렬

**RLS 정책**:
- ✅ SELECT: 모두 허용
- ✅ INSERT: 관리자만
- ✅ UPDATE: 지원자는 본인 신청만, 관리자는 모두
- ✅ DELETE: 관리자만

**파일**: `supabase/migrations/20250109000004_create_bounties.sql`

---

#### 5. newsletter_subscriptions (뉴스레터 구독자)

**용도**: Newsletter 구독 관리 (Sprint 1에서 이미 구현됨)

**스키마**:
```sql
CREATE TABLE public.newsletter_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);
```

**인덱스**:
- `idx_newsletter_email` (email) - 중복 확인

**RLS 정책**:
- ✅ SELECT: 모두 허용 (anon 역할 GRANT 완료)
- ✅ INSERT: 모두 허용 (구독 신청)
- ✅ UPDATE: 본인만 (구독 취소)
- ✅ DELETE: 관리자만

**파일**: `supabase/migrations/20250109000008_create_newsletter.sql`

---

### 신규 테이블 (Sprint 2에서 생성)

#### 6. work_with_us_inquiries (문의 접수)

**용도**: Work with Us 폼 제출 시 문의 내용 저장

**스키마**:
```sql
CREATE TABLE public.work_with_us_inquiries (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,                 -- 이름
  email TEXT NOT NULL,                -- 이메일
  company TEXT,                       -- 회사명 (선택)
  package TEXT NOT NULL,              -- 선택 패키지 (AI 컨설팅, 프로덕트 개발, 워크플로우 자동화)
  budget TEXT,                        -- 예산 범위 (선택)
  brief TEXT NOT NULL,                -- 프로젝트 브리프 (최소 50자)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'rejected', 'completed')),
  admin_notes TEXT,                   -- 관리자 메모 (선택)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**인덱스**:
- `idx_work_inquiries_status` (status) - 상태별 필터링
- `idx_work_inquiries_created_at` (created_at DESC) - 최신순 정렬

**RLS 정책**:
```sql
-- Public: Insert only (문의 제출)
CREATE POLICY "Anyone can submit work inquiries"
  ON public.work_with_us_inquiries
  FOR INSERT
  WITH CHECK (true);

-- Admin: Read all (관리자 조회)
CREATE POLICY "Admins can read all work inquiries"
  ON public.work_with_us_inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (SELECT id FROM public.roles WHERE name = 'admin')
    )
  );

-- Admin: Update all (관리자 상태 업데이트)
CREATE POLICY "Admins can update work inquiries"
  ON public.work_with_us_inquiries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (SELECT id FROM public.roles WHERE name = 'admin')
    )
  );

-- Admin: Delete all (관리자 삭제)
CREATE POLICY "Admins can delete work inquiries"
  ON public.work_with_us_inquiries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (SELECT id FROM public.roles WHERE name = 'admin')
    )
  );
```

**Trigger**: `updated_at` 자동 갱신
```sql
CREATE OR REPLACE FUNCTION update_work_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_inquiries_updated_at
  BEFORE UPDATE ON public.work_with_us_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_work_inquiries_updated_at();
```

**파일**: `supabase/migrations/20251114000001_create_work_inquiries.sql` (Sprint 2에서 생성)

---

## 🧩 컴포넌트 구조

### 디렉토리 구조

```
src/
├── components/
│   ├── community/               # Sprint 2 신규
│   │   └── GiscusComments.tsx   # Giscus 댓글 위젯
│   ├── newsletter/              # Sprint 2 신규
│   │   └── NewsletterForm.tsx   # 뉴스레터 구독 폼
│   ├── work-with-us/            # Sprint 2 신규
│   │   └── WorkWithUsForm.tsx   # 문의 폼
│   └── portfolio/               # 기존
│       ├── ProjectCard.tsx
│       └── ProjectFilters.tsx
├── hooks/
│   ├── useProjects.ts           # 기존 (Sprint 1)
│   ├── useRoadmap.ts            # 기존 (Sprint 1)
│   ├── useLogs.ts               # 기존 (Sprint 1)
│   ├── useBounties.ts           # 기존 (Sprint 1)
│   ├── useNewsletter.ts         # 기존 (Sprint 1)
│   └── useWorkInquiries.ts      # Sprint 2 신규
├── lib/
│   ├── supabase.ts              # 기존
│   └── email.ts                 # Sprint 2 신규 (Resend)
└── pages/
    ├── Portfolio.tsx            # Sprint 2 업데이트 (동적 데이터)
    ├── Roadmap.tsx              # Sprint 2 업데이트 (동적 데이터)
    ├── Now.tsx                  # Sprint 2 업데이트 (동적 데이터)
    ├── Lab.tsx                  # Sprint 2 업데이트 (동적 데이터)
    ├── Community.tsx            # Sprint 2 업데이트 (Giscus 추가)
    ├── BlogPost.tsx             # Sprint 2 업데이트 (Giscus 추가)
    └── WorkWithUs.tsx           # Sprint 2 업데이트 (폼 추가)
```

### 주요 컴포넌트

#### 1. GiscusComments (댓글 위젯)

**파일**: `src/components/community/GiscusComments.tsx`

**Props**:
```typescript
interface GiscusCommentsProps {
  category: 'General' | 'Blog Comments';
  term?: string; // Discussion 제목 (optional)
}
```

**기능**:
- GitHub Discussions 기반 댓글
- 다크 모드 자동 전환
- pathname 기반 매핑 (URL → Discussion)

---

#### 2. NewsletterForm (뉴스레터 구독)

**파일**: `src/components/newsletter/NewsletterForm.tsx`

**기능**:
- 이메일 입력 폼 (React Hook Form + Zod)
- 중복 확인
- 성공/에러 토스트

**Supabase 연동**:
```typescript
await supabase
  .from('newsletter_subscriptions')
  .insert({ email });
```

---

#### 3. WorkWithUsForm (문의 폼)

**파일**: `src/components/work-with-us/WorkWithUsForm.tsx`

**Fields**:
- 이름 (필수)
- 이메일 (필수, 이메일 형식 검증)
- 회사명 (선택)
- 패키지 선택 (필수)
- 예산 범위 (선택)
- 프로젝트 브리프 (필수, 최소 50자)

**Zod Schema**:
```typescript
const workWithUsSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  company: z.string().optional(),
  package: z.enum(['AI 컨설팅', '프로덕트 개발', '워크플로우 자동화']),
  budget: z.string().optional(),
  brief: z.string().min(50, '최소 50자 이상 입력해주세요'),
});
```

**제출 플로우**:
1. Supabase에 문의 저장
2. Resend로 관리자 이메일 발송 (비동기)
3. 사용자에게 성공 토스트 표시

---

## 🔄 데이터 플로우

### 1. 프로젝트 목록 조회 (Portfolio 페이지)

```
사용자 → Portfolio.tsx
   ↓
useProjects() 훅 호출
   ↓
React Query (useQuery)
   ↓
Supabase Client
   ↓
SELECT * FROM projects WHERE status = 'in-progress'
   ↓
RLS 정책 확인 (✅ Public SELECT 허용)
   ↓
결과 반환 (Project[])
   ↓
React Query 캐싱 (staleTime: 5분)
   ↓
ProjectCard 컴포넌트 렌더링
```

### 2. 로드맵 조회 (Roadmap 페이지)

```
사용자 → Roadmap.tsx
   ↓
useRoadmap() 훅 호출
   ↓
Supabase Client
   ↓
SELECT * FROM roadmap ORDER BY quarter DESC
   ↓
RLS 정책 확인 (✅ anon SELECT 허용)
   ↓
결과 반환 (Roadmap[])
   ↓
ProgressRing 컴포넌트 렌더링 (진행률 차트)
```

### 3. 문의 폼 제출 (Work with Us 페이지)

```
사용자 → WorkWithUs.tsx → WorkWithUsForm
   ↓
폼 입력 & 검증 (React Hook Form + Zod)
   ↓
"문의하기" 버튼 클릭
   ↓
handleSubmit 함수
   ↓
┌─────────────────┬─────────────────┐
│   Supabase DB   │  Resend Email   │
│   (동기)         │   (비동기)       │
└─────────────────┴─────────────────┘
   ↓                    ↓
INSERT INTO            sendWorkWithUsEmail()
work_inquiries            ↓
   ↓                 관리자 이메일 발송
RLS 확인 (✅ INSERT)     ↓
   ↓                 (실패해도 사용자에게 성공 표시)
성공 반환
   ↓
토스트: "문의가 접수되었습니다"
   ↓
폼 초기화 (reset())
```

### 4. 댓글 작성 (Community 페이지)

```
사용자 → Community.tsx
   ↓
GiscusComments 컴포넌트 로드
   ↓
<iframe src="https://giscus.app/..." />
   ↓
Giscus App → GitHub Discussions API
   ↓
사용자 GitHub 로그인 (OAuth)
   ↓
댓글 작성
   ↓
GitHub Discussions에 저장
   ↓
Giscus iframe 리로드 → 댓글 표시
```

---

## 🌐 외부 서비스 통합

### 1. Giscus (댓글 시스템)

**통합 방법**:
```tsx
import Giscus from '@giscus/react';

<Giscus
  repo="IDEA-on-Action/idea-on-action"
  repoId={import.meta.env.VITE_GISCUS_REPO_ID}
  category="General"
  categoryId={import.meta.env.VITE_GISCUS_CATEGORY_GENERAL_ID}
  mapping="pathname"
  theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
/>
```

**데이터 흐름**:
- 댓글 데이터는 **GitHub Discussions**에 저장 (Supabase 아님)
- 실시간 업데이트 (Giscus가 자동 처리)

---

### 2. Resend (이메일 발송)

**통합 방법**:
```typescript
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'IDEA on Action <noreply@ideaonaction.ai>',
  to: ['sinclairseo@gmail.com'],
  subject: `[문의] ${name} - ${package}`,
  html: `...`,
});
```

**사용 케이스**:
- Work with Us 문의 시 관리자 이메일 알림
- Newsletter 환영 이메일 (Optional)

---

### 3. Newsletter (Supabase 자체)

**통합 방법**:
```typescript
// 구독 저장
await supabase
  .from('newsletter_subscriptions')
  .insert({ email });

// 구독자 목록 조회 (Admin)
const { data } = await supabase
  .from('newsletter_subscriptions')
  .select('*')
  .eq('status', 'active');
```

**Weekly Recap 발송** (Sprint 3 범위):
- Supabase Function + Resend API
- 매주 월요일 자동 발송

---

## 📊 성능 고려사항

### 1. React Query 캐싱 전략

**staleTime 설정**:
```typescript
// useProjects.ts
useQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects,
  staleTime: 5 * 60 * 1000, // 5분
});

// useRoadmap.ts
useQuery({
  queryKey: ['roadmap'],
  queryFn: fetchRoadmap,
  staleTime: 10 * 60 * 1000, // 10분
});

// useLogs.ts
useQuery({
  queryKey: ['logs'],
  queryFn: fetchLogs,
  staleTime: 2 * 60 * 1000, // 2분 (자주 업데이트)
});
```

---

### 2. 데이터베이스 인덱스

**필수 인덱스**:
- `projects(status)` - 상태별 필터링
- `logs(created_at DESC)` - 최신순 정렬
- `bounties(status)` - 상태별 필터링
- `work_inquiries(created_at DESC)` - 최신 문의 조회

---

### 3. 이미지 최적화

**프로젝트 이미지**:
- WebP 포맷 권장
- Lazy Loading (`loading="lazy"`)
- Supabase Storage CDN 활용

---

## 🔒 보안 고려사항

### 1. RLS (Row Level Security) 정책

**모든 테이블 RLS 활성화**:
```sql
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_with_us_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
```

**정책 원칙**:
- SELECT: 모두 허용 (public 데이터)
- INSERT: 제한적 허용 (문의, 구독)
- UPDATE/DELETE: 관리자만

---

### 2. 환경변수 보안

**클라이언트 노출 가능** (VITE_ 접두사):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GISCUS_REPO_ID`

**서버 전용** (노출 금지):
- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### 3. XSS 방지

**마크다운 렌더링**:
```typescript
import ReactMarkdown from 'react-markdown';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    // HTML 태그 필터링 (허용 목록 방식)
  }}
>
  {content}
</ReactMarkdown>
```

---

## ✅ 아키텍처 완료 체크리스트

Sprint 2 구현 시 다음 항목을 확인하세요:

### 데이터베이스
- [ ] 기존 테이블 5개 확인 (projects, roadmap, logs, bounties, newsletter)
- [ ] 신규 테이블 1개 생성 (work_with_us_inquiries)
- [ ] RLS 정책 모두 설정
- [ ] 인덱스 최적화 완료

### 컴포넌트
- [ ] GiscusComments 컴포넌트 생성
- [ ] NewsletterForm 컴포넌트 생성
- [ ] WorkWithUsForm 컴포넌트 생성

### 훅
- [ ] useProjects, useRoadmap, useLogs, useBounties 동작 확인
- [ ] useWorkInquiries 신규 생성

### 외부 서비스
- [ ] Giscus 설정 완료 (repoId, categoryId)
- [ ] Resend 도메인 검증 완료
- [ ] Resend API Key 발급

### 성능
- [ ] React Query 캐싱 설정
- [ ] Lazy Loading 적용
- [ ] Lighthouse Performance 90+

### 보안
- [ ] RLS 정책 테스트
- [ ] 환경변수 분리 (VITE_ / 서버 전용)
- [ ] XSS 방지 (Markdown 필터링)

---

**문서 변경 이력**:
- 2025-11-14: 초안 작성 (v1.0)
