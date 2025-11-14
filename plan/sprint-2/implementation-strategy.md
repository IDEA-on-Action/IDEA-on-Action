# Sprint 2 구현 전략
## Supabase Integration & Community

**작성일**: 2025-11-14
**Sprint**: 2 / 3
**기간**: 5 영업일 (2025-11-18 ~ 2025-11-22)
**상태**: 📋 Draft

---

## 📖 목차

1. [구현 순서](#구현-순서)
2. [일정 분배](#일정-분배)
3. [에러 처리 패턴](#에러-처리-패턴)
4. [보안 고려사항](#보안-고려사항)
5. [테스트 전략](#테스트-전략)

---

## 🎯 구현 순서

### 우선순위 기준

| 우선순위 | 기능 | 이유 | 일정 |
|---------|------|------|------|
| **P0** | 동적 콘텐츠 (FR-2.1) | 핵심 가치: 투명성 | Day 1-2 |
| **P1** | 커뮤니티 댓글 (FR-2.2) | 커뮤니티 기반 핵심 | Day 3 |
| **P2** | Work with Us 폼 (FR-2.3) | 비즈니스 연결 | Day 4 |
| **P3** | Newsletter (FR-2.4) | 관계 유지 | Day 4 |
| **QA** | 테스트 & 문서화 | 품질 보증 | Day 5 |

---

## 📅 일정 분배 (5일)

### Day 1: Supabase 스키마 & 기본 CRUD (P0 - 50%)

**목표**: 데이터베이스 테이블 및 RLS 정책 설정

**작업**:
1. **신규 테이블 생성** (2시간)
   - `work_with_us_inquiries` 테이블 마이그레이션
   - RLS 정책 4개 (SELECT, INSERT, UPDATE, DELETE)
   - 인덱스 2개 (`status`, `created_at DESC`)
   - `updated_at` 트리거

2. **기존 테이블 확인** (1시간)
   - `projects`, `roadmap`, `logs`, `bounties` 테이블 존재 확인
   - RLS 정책 검증 (Sprint 1에서 설정됨)
   - 샘플 데이터 확인 (3개 이상)

3. **useWorkInquiries 훅 생성** (2시간)
   - React Query 기반
   - `submitInquiry` 뮤테이션
   - 에러 처리 (`handleSupabaseError`)

**완료 기준**:
- [ ] 마이그레이션 파일 생성 완료
- [ ] Supabase 대시보드에서 테이블 확인
- [ ] `useWorkInquiries` 훅 유닛 테스트 통과

**파일**:
- `supabase/migrations/20251118000001_create_work_inquiries.sql`
- `src/hooks/useWorkInquiries.ts`
- `tests/unit/useWorkInquiries.test.tsx`

---

### Day 2: 페이지 동적 데이터 연결 (P0 - 50%)

**목표**: Portfolio/Roadmap/Now/Lab 페이지를 동적 데이터로 전환

**작업**:
1. **Portfolio 페이지 업데이트** (2시간)
   - `useProjects` 훅 사용 (이미 존재)
   - 필터링 UI (All, Backlog, In Progress, Launched)
   - LoadingState, ErrorState, EmptyState 추가

2. **Roadmap 페이지 업데이트** (1.5시간)
   - `useRoadmap` 훅 사용 (이미 존재)
   - ProgressRing 컴포넌트 (진행률 차트)
   - 분기별 탭 네비게이션

3. **Now 페이지 업데이트** (1.5시간)
   - `useLogs` 훅 사용 (이미 존재)
   - 타입별 아이콘 (Decision/Learning/Release)
   - 최신 10개 표시 (무한 스크롤 또는 페이지네이션)

4. **Lab 페이지 업데이트** (1시간)
   - `useBounties` 훅 사용 (이미 존재)
   - 상태별 필터 (Open/Assigned/Done)
   - 바운티 카드 레이아웃

**완료 기준**:
- [ ] 4개 페이지 모두 동적 데이터 표시
- [ ] 로딩/에러/빈 상태 처리 완료
- [ ] E2E 테스트 4개 작성

**파일**:
- `src/pages/Portfolio.tsx` (업데이트)
- `src/pages/Roadmap.tsx` (업데이트)
- `src/pages/Now.tsx` (업데이트)
- `src/pages/Lab.tsx` (업데이트)
- `tests/e2e/portfolio.spec.ts`
- `tests/e2e/roadmap.spec.ts`

---

### Day 3: Giscus 댓글 통합 (P1)

**목표**: Community/Blog 페이지에 댓글 기능 추가

**작업**:
1. **Giscus 설정 완료** (1시간)
   - Giscus App 설치 (https://github.com/apps/giscus)
   - `repoId`, `categoryId` 복사
   - 환경변수 6개 추가 (.env.local, Vercel)

2. **GiscusComments 컴포넌트 생성** (2시간)
   - `@giscus/react` 패키지 설치
   - Props: `category`, `term`
   - 다크 모드 테마 자동 전환 (`useTheme` 훅)
   - Lazy Loading (스크롤 시 로드)

3. **Community 페이지 통합** (1시간)
   - GiscusComments 임베드
   - category: "General"
   - 설명 섹션 추가

4. **BlogPost 페이지 통합** (1시간)
   - GiscusComments 임베드
   - category: "Blog Comments"
   - 댓글 수 배지 ("💬 5 comments")

**완료 기준**:
- [ ] Giscus 위젯 로드 성공
- [ ] 다크 모드 전환 동작 확인
- [ ] GitHub Discussions에 댓글 저장 확인
- [ ] E2E 테스트 3개 작성

**파일**:
- `src/components/community/GiscusComments.tsx` (신규)
- `src/pages/Community.tsx` (업데이트)
- `src/pages/BlogPost.tsx` (업데이트)
- `tests/e2e/community.spec.ts` (신규)

---

### Day 4: Work with Us & Newsletter (P2, P3)

**목표**: 문의 폼 및 뉴스레터 구독 폼 구현

**작업**:

#### 오전: Work with Us 폼 (P2 - 3시간)

1. **WorkWithUsForm 컴포넌트 생성** (2시간)
   - React Hook Form + Zod 스키마
   - 필드 7개 (이름, 이메일, 회사, 패키지, 예산, 브리프)
   - 폼 검증 (이메일 형식, 브리프 50자 이상)
   - 제출 로직: Supabase INSERT + Resend 이메일

2. **Resend 이메일 함수 생성** (1시간)
   - `src/lib/email.ts`
   - `sendWorkWithUsEmail` 함수
   - HTML 템플릿 (문의자 정보, 프로젝트 브리프)

#### 오후: Newsletter (P3 - 2시간)

3. **NewsletterForm 컴포넌트 생성** (1.5시간)
   - 이메일 입력 폼
   - 중복 확인 로직
   - Supabase INSERT

4. **Footer 통합** (0.5시간)
   - NewsletterForm 임베드
   - 섹션 레이아웃

#### QA (1시간)

5. **테스트 작성**
   - E2E: 문의 폼 제출, 뉴스레터 구독
   - Unit: 폼 검증 로직

**완료 기준**:
- [ ] Work with Us 폼 제출 성공
- [ ] Resend 이메일 발송 확인
- [ ] Newsletter 구독 성공 (중복 방지)
- [ ] E2E 테스트 5개 작성

**파일**:
- `src/components/work-with-us/WorkWithUsForm.tsx` (신규)
- `src/components/newsletter/NewsletterForm.tsx` (신규)
- `src/lib/email.ts` (신규)
- `src/pages/WorkWithUs.tsx` (업데이트)
- `src/components/layout/Footer.tsx` (업데이트)
- `tests/e2e/work-with-us.spec.ts` (신규)
- `tests/unit/WorkWithUsForm.test.tsx` (신규)

---

### Day 5: 테스트 & QA & 문서화

**목표**: 전체 기능 검증 및 문서 업데이트

**작업**:

#### 오전: E2E 테스트 (3시간)

1. **E2E 테스트 실행** (1시간)
   - Playwright 5개 브라우저 테스트
   - 주요 시나리오 10개 확인

2. **테스트 실패 수정** (1.5시간)
   - 타임아웃, 선택자 오류 수정
   - 스크린샷 확인

3. **Lighthouse CI 실행** (0.5시간)
   - Performance 90+ 확인
   - Accessibility 95+ 확인

#### 오후: 문서화 & 배포 (2시간)

4. **문서 업데이트** (1시간)
   - CLAUDE.md 업데이트 (Sprint 2 완료)
   - README 환경변수 섹션 추가
   - project-todo.md 체크

5. **프로덕션 배포** (1시간)
   - Vercel 환경변수 7개 추가
   - main 브랜치 푸시
   - 배포 확인 (https://www.ideaonaction.ai/)
   - 프로덕션 테스트 (댓글, 폼 제출, 이메일 발송)

**완료 기준**:
- [ ] E2E 테스트 90% 이상 통과
- [ ] Lighthouse 점수 90+ (Performance, Accessibility)
- [ ] 프로덕션 배포 성공
- [ ] 프로덕션에서 모든 기능 동작 확인

**파일**:
- CLAUDE.md
- README.md
- project-todo.md

---

## 🛡️ 에러 처리 패턴

### 1. Supabase 에러 처리

**공통 에러 핸들러** (이미 존재):
```typescript
// src/lib/supabase.ts
export function handleSupabaseError(error: PostgrestError): string {
  if (error.code === '23505') {
    return '이미 존재하는 데이터입니다';
  }
  if (error.code === '42501') {
    return '권한이 없습니다';
  }
  return error.message || '알 수 없는 오류가 발생했습니다';
}
```

**사용 예시**:
```typescript
const { error } = await supabase.from('work_inquiries').insert(data);
if (error) {
  toast.error(handleSupabaseError(error));
  return;
}
```

---

### 2. React Query 에러 처리

**onError 콜백**:
```typescript
export function useWorkInquiries() {
  return useMutation({
    mutationFn: submitInquiry,
    onError: (error) => {
      console.error('Work inquiry submission failed:', error);
      toast.error('문의 접수에 실패했습니다');
    },
    onSuccess: () => {
      toast.success('문의가 접수되었습니다');
    },
  });
}
```

---

### 3. 이메일 발송 에러 처리

**비동기 발송 (Non-blocking)**:
```typescript
// 1. Supabase에 저장 (동기)
const { error: dbError } = await supabase
  .from('work_inquiries')
  .insert(data);

if (dbError) {
  toast.error('문의 접수에 실패했습니다');
  return;
}

// 2. 이메일 발송 (비동기, 실패해도 사용자에게는 성공 표시)
sendWorkWithUsEmail(data).catch((error) => {
  console.error('Email send failed (non-blocking):', error);
  // 관리자 대시보드에 로그 남기기 (Optional)
});

// 3. 사용자에게 성공 메시지
toast.success('문의가 접수되었습니다');
```

**이유**:
- 사용자 경험 개선 (이메일 발송 실패가 사용자 경험을 해치지 않음)
- 문의 데이터는 DB에 저장되어 있으므로 나중에 수동 처리 가능

---

### 4. 폼 검증 에러

**Zod 에러 메시지 한글화**:
```typescript
const workWithUsSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  brief: z.string().min(50, '최소 50자 이상 입력해주세요'),
});
```

**React Hook Form 에러 표시**:
```tsx
<Input {...register('email')} />
{errors.email && (
  <p className="text-sm text-destructive">{errors.email.message}</p>
)}
```

---

## 🔒 보안 고려사항

### 1. RLS (Row Level Security) 정책

**원칙**:
- **SELECT**: Public 데이터는 모두 허용
- **INSERT**: 제한적 허용 (문의, 구독)
- **UPDATE/DELETE**: 관리자만

**work_with_us_inquiries 정책**:
```sql
-- Public: Insert only
CREATE POLICY "Anyone can submit work inquiries"
  ON work_with_us_inquiries
  FOR INSERT
  WITH CHECK (true);

-- Admin: Read all
CREATE POLICY "Admins can read all work inquiries"
  ON work_with_us_inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );
```

---

### 2. XSS 방지

**사용자 입력 이스케이프**:
- React는 기본적으로 XSS 방지 (자동 이스케이프)
- Markdown 렌더링 시 HTML 태그 필터링

**Markdown 렌더링**:
```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    // 허용된 태그만 렌더링
    h1: ({ children }) => <h1 className="...">{children}</h1>,
    // HTML 태그는 무시
  }}
>
  {content}
</ReactMarkdown>
```

---

### 3. CSRF 방지

**Supabase**:
- Supabase는 자동으로 CSRF 토큰 처리
- SameSite 쿠키 설정 (`Lax`)

**추가 조치** (Optional):
- Rate Limiting (IP별 요청 제한)

---

### 4. Rate Limiting

**Vercel Edge Functions** (Optional, Sprint 3):
```typescript
// api/submit-inquiry.ts
import rateLimit from '@/lib/rateLimit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1분
  uniqueTokenPerInterval: 500, // IP당
});

export async function POST(request: Request) {
  try {
    await limiter.check(5, 'SUBMIT_INQUIRY'); // 1분에 5회
  } catch {
    return new Response('Too Many Requests', { status: 429 });
  }

  // ... 실제 로직
}
```

**Sprint 2**: ❌ 미구현 (Supabase RLS만 의존)

---

### 5. 환경변수 보안

**분리 원칙**:
- **클라이언트 노출 가능**: `VITE_` 접두사
- **서버 전용**: 접두사 없음 (Vercel 환경변수만)

**검증**:
```bash
# 빌드 후 번들에 포함되었는지 확인
npm run build
grep -r "re_" dist/ # RESEND_API_KEY가 있으면 안됨
```

---

## 🧪 테스트 전략

### 1. E2E 테스트 (Playwright)

**테스트 파일**:
```
tests/e2e/
├── portfolio.spec.ts       # 프로젝트 목록, 필터링
├── roadmap.spec.ts         # 로드맵 진행률
├── community.spec.ts       # Giscus 댓글 (신규)
├── work-with-us.spec.ts    # 문의 폼 제출 (신규)
└── newsletter.spec.ts      # 뉴스레터 구독 (기존)
```

**주요 시나리오**:
1. **Portfolio**: 프로젝트 필터링 (In Progress 탭 클릭)
2. **Roadmap**: 진행률 링 차트 표시 (75%)
3. **Community**: Giscus 로드, GitHub 로그인, 댓글 작성
4. **Work with Us**: 폼 제출, 성공 토스트
5. **Newsletter**: 이메일 구독, 중복 방지

---

### 2. 유닛 테스트 (Vitest)

**테스트 파일**:
```
tests/unit/
├── useWorkInquiries.test.tsx  # 훅 테스트 (신규)
└── WorkWithUsForm.test.tsx    # 폼 검증 (신규)
```

**테스트 케이스**:
```typescript
// useWorkInquiries.test.tsx
describe('useWorkInquiries', () => {
  it('should submit inquiry successfully', async () => {
    const { result } = renderHook(() => useWorkInquiries());
    await act(async () => {
      result.current.submitInquiry({
        name: '홍길동',
        email: 'hong@example.com',
        brief: 'AI 챗봇 도입 상담 요청...',
      });
    });
    expect(result.current.isSuccess).toBe(true);
  });
});
```

---

### 3. Lighthouse CI

**성능 임계값**:
```json
// lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "performance": ["error", { "minScore": 0.9 }],
        "accessibility": ["error", { "minScore": 0.95 }],
        "best-practices": ["error", { "minScore": 0.9 }],
        "seo": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

---

## 📊 진행률 추적

### 일일 체크리스트

**Day 1**:
- [ ] `work_with_us_inquiries` 테이블 생성
- [ ] RLS 정책 4개 설정
- [ ] `useWorkInquiries` 훅 생성 및 테스트

**Day 2**:
- [ ] Portfolio/Roadmap/Now/Lab 페이지 업데이트
- [ ] 로딩/에러/빈 상태 처리
- [ ] E2E 테스트 4개 작성

**Day 3**:
- [ ] Giscus 설정 완료 (App 설치, 환경변수)
- [ ] GiscusComments 컴포넌트 생성
- [ ] Community/BlogPost 페이지 통합
- [ ] E2E 테스트 3개 작성

**Day 4**:
- [ ] WorkWithUsForm 컴포넌트 생성
- [ ] Resend 이메일 함수 생성
- [ ] NewsletterForm 컴포넌트 생성
- [ ] Footer 통합
- [ ] E2E 테스트 5개 작성

**Day 5**:
- [ ] E2E 테스트 전체 실행 (90% 이상 통과)
- [ ] Lighthouse CI (Performance 90+, Accessibility 95+)
- [ ] 문서 업데이트 (CLAUDE.md, README.md)
- [ ] 프로덕션 배포 및 검증

---

## 🚨 리스크 관리

### 주요 리스크

| 리스크 | 영향 | 확률 | 완화 방안 |
|--------|------|------|-----------|
| Resend 도메인 검증 지연 | 높음 | 중간 | Day 0에 미리 시작 (24-48시간 대기) |
| Giscus iframe 로딩 실패 | 중간 | 낮음 | 에러 바운더리, "댓글을 불러올 수 없습니다" 표시 |
| RLS 정책 디버깅 | 중간 | 중간 | Sprint 1 RLS 정책 템플릿 재사용 |
| 이메일 발송 실패 | 낮음 | 낮음 | 비동기 발송 (사용자 경험 미영향) |

---

## ✅ 구현 전략 완료 체크리스트

Sprint 2 시작 전 확인:

### 사전 준비
- [ ] Resend 도메인 검증 완료 (Day 0)
- [ ] Giscus App 설치 완료 (Day 0)
- [ ] 환경변수 템플릿 준비 (`.env.sprint2.template`)

### Day 1 시작 전
- [ ] 마이그레이션 파일 템플릿 준비
- [ ] `useWorkInquiries` 훅 구조 설계

### Day 3 시작 전
- [ ] Giscus `repoId`, `categoryId` 복사
- [ ] Vercel 환경변수 추가

### Day 4 시작 전
- [ ] Resend API Key 발급
- [ ] GitHub Secrets, Vercel 환경변수 추가

### Day 5 시작 전
- [ ] 모든 E2E 테스트 작성 완료
- [ ] Lighthouse CI 설정 확인

---

**문서 변경 이력**:
- 2025-11-14: 초안 작성 (v1.0)
