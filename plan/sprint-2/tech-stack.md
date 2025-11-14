# Sprint 2 기술 스택
## Supabase Integration & Community

**작성일**: 2025-11-14
**Sprint**: 2 / 3
**상태**: 📋 Draft

---

## 📖 목차

1. [기술 스택 개요](#기술-스택-개요)
2. [프론트엔드](#프론트엔드)
3. [백엔드](#백엔드)
4. [외부 서비스](#외부-서비스)
5. [개발 도구](#개발-도구)

---

## 🎯 기술 스택 개요

### 변경 사항 (Sprint 1 → Sprint 2)

| 구분 | Sprint 1 (기존) | Sprint 2 (추가) | 이유 |
|------|----------------|----------------|------|
| **댓글 시스템** | ❌ 없음 | ✅ Giscus | GitHub Discussions 기반, 무료 |
| **이메일 발송** | ❌ 없음 | ✅ Resend | 간단한 API, 무료 티어 충분 |
| **폼 관리** | React Hook Form + Zod (Admin) | ✅ 동일 (확장) | 일관성 유지 |
| **데이터베이스** | Supabase PostgreSQL | ✅ 동일 | RLS 정책 확장 |

### 선택 원칙

1. **기존 스택 유지**: 학습 곡선 최소화
2. **무료 티어 우선**: 예산 $0 제약
3. **빠른 구현**: 외부 서비스 활용
4. **타입 안전성**: TypeScript Strict Mode

---

## 🎨 프론트엔드

### Core (기존)

#### React 18.x
**용도**: UI 프레임워크
**버전**: 18.3.1
**선택 이유**:
- ✅ React Query와 완벽한 통합
- ✅ Concurrent Features (Suspense, Transitions)
- ✅ 팀의 숙련도 높음

**패키지**:
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

---

#### TypeScript 5.x
**용도**: 타입 안전성
**버전**: 5.6.2
**설정**: Strict Mode 활성화

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**선택 이유**:
- ✅ 컴파일 타임 에러 감지
- ✅ IDE 자동완성
- ✅ 리팩토링 안전성

---

#### Tailwind CSS 3.4.x
**용도**: 스타일링
**버전**: 3.4.14
**선택 이유**:
- ✅ Utility-first 접근
- ✅ 빌드 최적화 (PurgeCSS)
- ✅ 다크 모드 지원 (`class` strategy)

**설정**:
```javascript
// tailwind.config.js
export default {
  darkMode: 'class', // useTheme 훅과 통합
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        accent: '#f59e0b',
        secondary: '#8b5cf6',
      },
    },
  },
};
```

---

### UI Components (기존)

#### shadcn/ui
**용도**: UI 컴포넌트 라이브러리
**선택 이유**:
- ✅ 복사 붙여넣기 방식 (의존성 최소화)
- ✅ Radix UI 기반 (접근성 내장)
- ✅ Tailwind CSS 통합
- ✅ 커스터마이징 쉬움

**사용 컴포넌트** (Sprint 2):
- `Button`, `Input`, `Textarea` (폼)
- `Card`, `Badge` (레이아웃)
- `Toast` (알림)
- `Dialog` (모달, 확인 창)

---

#### Radix UI
**용도**: Headless UI Primitives
**버전**: ^1.1.x
**선택 이유**:
- ✅ WAI-ARIA 준수
- ✅ 키보드 네비게이션 지원
- ✅ shadcn/ui의 기반

**사용 컴포넌트**:
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-toast`

---

### State Management

#### React Query (TanStack Query)
**용도**: 서버 상태 관리
**버전**: ^5.62.x
**선택 이유**:
- ✅ 자동 캐싱 및 재검증
- ✅ 낙관적 업데이트 지원
- ✅ Supabase와 완벽한 통합

**설정**:
```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**사용 패턴**:
```typescript
// src/hooks/useProjects.ts
export function useProjects(status?: string) {
  return useQuery({
    queryKey: ['projects', status],
    queryFn: () => fetchProjects(status),
    staleTime: 5 * 60 * 1000,
  });
}
```

---

#### Zustand (기존, Sprint 2에서 미사용)
**용도**: 클라이언트 상태 관리 (장바구니 등)
**버전**: ^5.0.x
**Sprint 2 사용**: ❌ (Cart 시스템은 Phase 9에서 이미 구현됨)

---

### Form & Validation

#### React Hook Form
**용도**: 폼 관리
**버전**: ^7.54.x
**선택 이유**:
- ✅ 성능 최적화 (uncontrolled components)
- ✅ Zod 통합
- ✅ 기존 Admin 폼에서 이미 사용 중

**Sprint 2 사용**:
- `WorkWithUsForm` (문의 폼)
- `NewsletterForm` (뉴스레터 구독 폼)

---

#### Zod
**용도**: 스키마 검증
**버전**: ^3.23.x
**선택 이유**:
- ✅ TypeScript 타입 자동 생성
- ✅ React Hook Form 통합 (zodResolver)
- ✅ 명확한 에러 메시지

**사용 예시**:
```typescript
import { z } from 'zod';

const workWithUsSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  brief: z.string().min(50, '최소 50자 이상 입력해주세요'),
});

type WorkWithUsForm = z.infer<typeof workWithUsSchema>;
```

---

### Routing

#### React Router DOM
**용도**: 클라이언트 사이드 라우팅
**버전**: ^7.1.x
**선택 이유**:
- ✅ React 생태계 표준
- ✅ Code Splitting 지원 (React.lazy)
- ✅ 기존 코드베이스 사용 중

**Sprint 2 라우트 추가**: 없음 (기존 라우트 재사용)

---

## 🗄️ 백엔드

### Database

#### Supabase PostgreSQL
**용도**: 관계형 데이터베이스
**버전**: PostgreSQL 15.x
**선택 이유**:
- ✅ 이미 Phase 1-14에서 구축됨
- ✅ RLS (Row Level Security) 정책
- ✅ Real-time 구독 기능
- ✅ 무료 티어 (500MB DB)

**Sprint 2 스키마**:
- 기존 5개: `projects`, `roadmap`, `logs`, `bounties`, `newsletter_subscriptions`
- 신규 1개: `work_with_us_inquiries`

**인덱스 최적화**:
```sql
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX idx_work_inquiries_created_at ON work_with_us_inquiries(created_at DESC);
```

---

### Client

#### Supabase JavaScript Client
**용도**: 데이터베이스 액세스
**버전**: ^2.x
**패키지**: `@supabase/supabase-js`

**설정**:
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**사용 패턴**:
```typescript
// SELECT
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('status', 'in-progress');

// INSERT
const { error } = await supabase
  .from('work_with_us_inquiries')
  .insert({ name, email, brief });
```

---

## 🌐 외부 서비스

### 댓글 시스템

#### Giscus
**용도**: GitHub Discussions 기반 댓글
**버전**: `@giscus/react` ^3.1.x
**선택 이유**:
- ✅ 완전 무료
- ✅ GitHub 계정 기반 (추가 회원가입 불필요)
- ✅ Markdown 지원
- ✅ 다크 모드 지원
- ✅ React 컴포넌트 제공

**대안 검토**:
| 서비스 | 장점 | 단점 | 선택 |
|--------|------|------|------|
| **Giscus** | 무료, GitHub 통합 | GitHub 계정 필수 | ✅ 선택 |
| Utterances | 무료, 가벼움 | GitHub Issues 사용 (오염 가능) | ❌ |
| Disqus | 성숙한 플랫폼 | 무료 버전 광고, 느림 | ❌ |
| Commento | 오픈소스 | 자체 호스팅 필요 | ❌ |

**통합 방법**:
```typescript
import Giscus from '@giscus/react';

<Giscus
  repo="IDEA-on-Action/idea-on-action"
  repoId={import.meta.env.VITE_GISCUS_REPO_ID}
  category="General"
  categoryId={import.meta.env.VITE_GISCUS_CATEGORY_GENERAL_ID}
  mapping="pathname"
  theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
  lang="ko"
/>
```

**제한사항**:
- GitHub 계정이 없는 사용자는 댓글 작성 불가 (읽기만 가능)
- 댓글 데이터는 GitHub에 저장 (자체 DB 아님)

---

### 이메일 발송

#### Resend
**용도**: 트랜잭션 이메일 발송
**버전**: `resend` ^4.0.x
**선택 이유**:
- ✅ 간단한 API
- ✅ 무료 티어 (월 3,000 이메일)
- ✅ 도메인 검증 쉬움
- ✅ React Email 템플릿 지원

**대안 검토**:
| 서비스 | 무료 티어 | API 복잡도 | 선택 |
|--------|-----------|------------|------|
| **Resend** | 3,000/월 | 간단 ⭐ | ✅ 선택 |
| SendGrid | 100/일 | 복잡 | ❌ |
| Mailgun | 5,000/월 (3개월만) | 중간 | ❌ |
| AWS SES | 62,000/월 | 복잡 (IAM) | ❌ |

**통합 방법**:
```typescript
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'IDEA on Action <noreply@ideaonaction.ai>',
  to: ['sinclairseo@gmail.com'],
  subject: `[문의] ${name}`,
  html: `...`,
});
```

**Sprint 2 사용 케이스**:
- Work with Us 문의 시 관리자 이메일 알림
- (Optional) Newsletter 환영 이메일

**제한사항**:
- 도메인 검증 필수 (DNS 설정 24-48시간 소요)
- 무료 티어: 일일 100 이메일 제한

---

### Newsletter (자체 구현)

#### Supabase + Resend
**용도**: 뉴스레터 구독 관리
**선택 이유**:
- ✅ 데이터 소유권 (Supabase 테이블)
- ✅ 비용 절감 (Beehiiv 유료 회피)
- ✅ 기존 인프라 활용

**대안 검토**:
| 서비스 | 무료 티어 | 기능 | 선택 |
|--------|-----------|------|------|
| **Supabase 자체** | 무제한 | 기본 | ✅ 선택 (Sprint 2) |
| Beehiiv | 2,500명 | 고급 (A/B 테스트, 분석) | ⏳ 나중에 검토 |
| Substack | 무제한 | 수익화 | ❌ |
| Mailchimp | 500명 | 복잡한 UI | ❌ |

**구현 방법**:
```sql
-- newsletter_subscriptions 테이블 (이미 존재)
CREATE TABLE newsletter_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);
```

```typescript
// 구독 저장
await supabase
  .from('newsletter_subscriptions')
  .insert({ email });

// 발송 (Sprint 3 범위)
// Weekly Recap → 구독자 이메일 (Resend API)
```

---

## 🛠️ 개발 도구

### Build Tool

#### Vite
**버전**: 5.4.19
**선택 이유**:
- ✅ 빠른 HMR (Hot Module Replacement)
- ✅ ES Modules 기반
- ✅ React SWC 플러그인
- ✅ 기존 프로젝트 사용 중

**설정**:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', '@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', 'sonner'],
        },
      },
    },
  },
});
```

---

### Testing

#### Playwright (E2E)
**버전**: ^1.49.x
**Sprint 2 테스트**:
- 댓글 작성/수정/삭제 (Giscus)
- Work with Us 폼 제출
- Newsletter 구독

**테스트 파일**:
```
tests/e2e/
├── community.spec.ts       # 댓글 테스트 (신규)
├── work-with-us.spec.ts    # 문의 폼 테스트 (신규)
└── newsletter.spec.ts      # 이미 존재 (Sprint 1)
```

---

#### Vitest (Unit)
**버전**: ^2.1.x
**Sprint 2 테스트**:
- `useWorkInquiries` 훅 테스트
- `WorkWithUsForm` 검증 로직 테스트

---

### Linting & Formatting

#### ESLint
**버전**: ^9.17.x
**설정**: `eslint.config.js`
**규칙**:
- `no-explicit-any`: warning (임시, 추후 error)
- `react-hooks/exhaustive-deps`: error

---

#### Prettier (선택사항)
**Sprint 2**: ❌ 미사용 (EditorConfig만 사용)

---

## 📦 패키지 종속성

### Sprint 2 신규 설치 패키지

```bash
# Giscus 댓글
npm install @giscus/react

# Resend 이메일
npm install resend
```

### 전체 dependencies (Sprint 2 후)

```json
{
  "dependencies": {
    // Core
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.1.x",

    // State Management
    "@tanstack/react-query": "^5.62.x",
    "zustand": "^5.0.x",

    // UI
    "@radix-ui/react-dialog": "^1.1.x",
    "@radix-ui/react-dropdown-menu": "^2.1.x",
    "@radix-ui/react-toast": "^1.2.x",
    "sonner": "^1.7.x",
    "lucide-react": "^0.468.x",

    // Forms
    "react-hook-form": "^7.54.x",
    "zod": "^3.23.x",
    "@hookform/resolvers": "^3.9.x",

    // Backend
    "@supabase/supabase-js": "^2.x",

    // External Services (신규)
    "@giscus/react": "^3.1.x",
    "resend": "^4.0.x",

    // Utilities
    "clsx": "^2.1.x",
    "tailwind-merge": "^2.6.x"
  },
  "devDependencies": {
    // Build
    "vite": "^5.4.19",
    "@vitejs/plugin-react-swc": "^3.7.x",

    // TypeScript
    "typescript": "~5.6.2",

    // Testing
    "@playwright/test": "^1.49.x",
    "vitest": "^2.1.x",

    // Linting
    "eslint": "^9.17.x"
  }
}
```

---

## 🔒 보안 고려사항

### 환경변수 관리

**클라이언트 노출 가능** (VITE_ 접두사):
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_GISCUS_REPO_ID=xxx
VITE_GISCUS_CATEGORY_GENERAL_ID=xxx
```

**서버 전용** (노출 금지):
```bash
RESEND_API_KEY=re_xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

**저장 위치**:
- 로컬: `.env.local` (gitignore)
- GitHub: Secrets
- Vercel: 환경변수

---

### API Key 보안

**Resend API Key**:
- ❌ 클라이언트에서 직접 사용 금지
- ✅ 서버 함수 또는 Edge Function에서만 사용
- ✅ GitHub Secrets, Vercel 환경변수 등록

**Supabase Anon Key**:
- ✅ 클라이언트 노출 가능 (RLS 정책으로 보호됨)
- ❌ Service Role Key는 서버 전용

---

## 📊 번들 크기 예상

### Sprint 1 (현재)
```
Total: ~602 KB gzip
- vendor-react: 113.60 KB
- vendor-ui: 42.11 KB
- index: 54.73 KB
```

### Sprint 2 (예상)
```
Total: ~650 KB gzip (+48 KB)
- vendor-react: 113.60 KB (변화 없음)
- vendor-ui: 42.11 KB (변화 없음)
- vendor-giscus: +15 KB (Giscus iframe, 경량)
- vendor-resend: +8 KB (서버 전용, 클라이언트 번들 미포함)
- index: 54.73 KB (변화 없음)
- pages: +25 KB (WorkWithUsForm, NewsletterForm)
```

**제약 준수**: ✅ +50KB 이하 (+48KB 예상)

---

## ✅ 기술 스택 완료 체크리스트

Sprint 2 구현 시 다음 패키지를 설치해야 합니다:

### 필수 설치
- [ ] `@giscus/react` (댓글 시스템)
- [ ] `resend` (이메일 발송)

### 환경변수 추가
- [ ] `VITE_GISCUS_REPO_ID`
- [ ] `VITE_GISCUS_CATEGORY_GENERAL_ID`
- [ ] `VITE_GISCUS_CATEGORY_BLOG_ID`
- [ ] `VITE_RESEND_FROM_EMAIL`
- [ ] `RESEND_API_KEY` (서버 전용)

### 외부 서비스 설정
- [ ] Giscus App 설치 (https://github.com/apps/giscus)
- [ ] Resend 계정 생성 (https://resend.com)
- [ ] Resend 도메인 검증 (ideaonaction.ai)

---

**문서 변경 이력**:
- 2025-11-14: 초안 작성 (v1.0)
