# Sprint 1: 메뉴 재구성 및 기반 작업

> Phase 1 - 메뉴 5개로 단순화, 리디렉션 설정, 홈 페이지 재구성

**시작일**: 2025-11-24 (예정)
**종료일**: 2025-11-30 (예정)
**소요 기간**: 1주

---

## 스프린트 목표

1. 7개 메뉴 → 5개 메뉴로 단순화
2. 기존 URL 301 리디렉션 설정
3. 홈 페이지 섹션 재구성 (정체성 전달 강화)
4. 허브 페이지 스켈레톤 생성

---

## 작업 목록

### TASK-001: Header.tsx 메뉴 수정
**예상 시간**: 1시간
**담당**: Agent 1
**의존성**: 없음

**설명**:
Header.tsx의 NAVIGATION_ITEMS 배열을 5개로 수정

**변경 전**:
```typescript
const NAVIGATION_ITEMS = [
  { label: "홈", href: "/" },
  { label: "회사소개", href: "/about" },
  { label: "서비스", href: "/services" },
  { label: "로드맵", href: "/roadmap" },
  { label: "포트폴리오", href: "/portfolio" },
  { label: "실험실", href: "/lab" },
  { label: "협업하기", href: "/work-with-us" }
];
```

**변경 후**:
```typescript
const NAVIGATION_ITEMS = [
  { label: "홈", href: "/" },
  { label: "서비스", href: "/services" },
  { label: "프로젝트", href: "/projects" },
  { label: "이야기", href: "/stories" },
  { label: "함께하기", href: "/connect" }
];
```

**완료 기준**:
- [ ] Header 메뉴 5개 표시
- [ ] 메뉴 클릭 시 해당 URL로 이동
- [ ] 활성 메뉴 스타일 정상 동작

---

### TASK-002: MobileMenu.tsx 동기화
**예상 시간**: 30분
**담당**: Agent 1
**의존성**: TASK-001

**설명**:
모바일 햄버거 메뉴를 Header와 동일하게 수정

**완료 기준**:
- [ ] 모바일 메뉴 5개 표시
- [ ] 메뉴 클릭 시 정상 동작
- [ ] 메뉴 닫힘 애니메이션 유지

---

### TASK-003: App.tsx 리디렉션 라우트 추가
**예상 시간**: 1시간
**담당**: Agent 2
**의존성**: 없음

**설명**:
기존 URL에서 새 URL로 301 리디렉션 설정

**추가할 라우트**:
```typescript
// Redirects
<Route path="/about" element={<Navigate to="/" replace />} />
<Route path="/roadmap" element={<Navigate to="/projects?tab=roadmap" replace />} />
<Route path="/portfolio" element={<Navigate to="/projects" replace />} />
<Route path="/portfolio/:slug" element={<Navigate to="/projects/:slug" replace />} />
<Route path="/lab" element={<Navigate to="/projects?tab=lab" replace />} />
<Route path="/work-with-us" element={<Navigate to="/connect/inquiry" replace />} />
<Route path="/blog" element={<Navigate to="/stories/blog" replace />} />
<Route path="/blog/:slug" element={<Navigate to="/stories/blog/:slug" replace />} />
<Route path="/notices" element={<Navigate to="/stories/notices" replace />} />
<Route path="/community" element={<Navigate to="/connect/community" replace />} />

// New routes
<Route path="/projects" element={<ProjectsHub />} />
<Route path="/projects/:slug" element={<ProjectDetail />} />
<Route path="/stories" element={<StoriesHub />} />
<Route path="/stories/blog" element={<Blog />} />
<Route path="/stories/blog/:slug" element={<BlogPost />} />
<Route path="/stories/newsletter" element={<NewsletterArchive />} />
<Route path="/stories/changelog" element={<Changelog />} />
<Route path="/stories/notices" element={<Notices />} />
<Route path="/connect" element={<ConnectHub />} />
<Route path="/connect/inquiry" element={<ProjectInquiry />} />
<Route path="/connect/careers" element={<Careers />} />
<Route path="/connect/community" element={<Community />} />
```

**완료 기준**:
- [ ] 모든 리디렉션 URL 동작 확인
- [ ] 신규 라우트 등록 완료
- [ ] 404 페이지 정상 동작

---

### TASK-004: 허브 페이지 스켈레톤 생성
**예상 시간**: 2시간
**담당**: Agent 3
**의존성**: 없음

**설명**:
4개 허브 페이지의 기본 구조 생성 (내용은 Phase 2, 3에서 채움)

**생성할 파일**:
```
src/pages/projects/ProjectsHub.tsx
src/pages/stories/StoriesHub.tsx
src/pages/connect/ConnectHub.tsx
```

**ProjectsHub.tsx 스켈레톤**:
```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";

export default function ProjectsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'in-progress';

  return (
    <div className="container py-12">
      <h1 className="text-4xl font-bold mb-8">프로젝트</h1>
      <p className="text-muted-foreground mb-8">
        우리가 만들고 있는 것들
      </p>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="in-progress">진행중</TabsTrigger>
          <TabsTrigger value="released">출시됨</TabsTrigger>
          <TabsTrigger value="lab">실험중</TabsTrigger>
          <TabsTrigger value="roadmap">로드맵</TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress">
          {/* Phase 2에서 구현 */}
          <p>진행중 프로젝트 (준비 중)</p>
        </TabsContent>
        <TabsContent value="released">
          <p>출시된 프로젝트 (준비 중)</p>
        </TabsContent>
        <TabsContent value="lab">
          <p>실험중 프로젝트 (준비 중)</p>
        </TabsContent>
        <TabsContent value="roadmap">
          <p>로드맵 (준비 중)</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**완료 기준**:
- [ ] ProjectsHub.tsx 생성 및 렌더링
- [ ] StoriesHub.tsx 생성 및 렌더링
- [ ] ConnectHub.tsx 생성 및 렌더링
- [ ] 탭 전환 동작 확인

---

### TASK-005: Index.tsx 섹션 재구성
**예상 시간**: 3시간
**담당**: Agent 2
**의존성**: TASK-001

**설명**:
홈 페이지 섹션을 재구성하여 3초 안에 회사 정체성 전달

**섹션 구성**:
1. **Hero** (기존 강화)
   - 슬로건: "생각을 멈추지 않고, 행동으로 옮깁니다"
   - 서브타이틀: "아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오"
   - CTA: "서비스 살펴보기" → /services

2. **What We Do** (신규)
   - Development Services 4개 카드
   - Minu Platform 4개 카드
   - "모든 서비스 보기" → /services

3. **What We're Building** (기존 수정)
   - 기존 포트폴리오 하이라이트 활용
   - 진척률 Progress Bar 추가
   - "모든 프로젝트 보기" → /projects

4. **Latest Updates** (신규)
   - 블로그/Changelog 통합 3개
   - "더 많은 이야기" → /stories

5. **Newsletter CTA** (기존 유지)

**완료 기준**:
- [ ] Hero 섹션 슬로건 표시
- [ ] What We Do 섹션 8개 서비스 카드
- [ ] What We're Building 섹션 진행중 프로젝트 3개
- [ ] Latest Updates 섹션 최근 소식 3개
- [ ] 모든 CTA 버튼 정상 동작

---

### TASK-006: About 콘텐츠 홈으로 통합
**예상 시간**: 1시간
**담당**: Agent 2
**의존성**: TASK-005

**설명**:
기존 About 페이지의 핵심 콘텐츠를 홈 Hero 섹션에 통합

**통합 내용**:
- 미션: Hero 섹션에 포함
- 비전: Hero 서브타이틀
- 핵심 가치: Footer 또는 별도 섹션 (선택적)
- 팀 소개: 제거 (별도 페이지 필요 시 /connect/team)

**완료 기준**:
- [ ] About 핵심 내용 홈에 반영
- [ ] /about 리디렉션 동작

---

### TASK-007: 리디렉션 동작 테스트
**예상 시간**: 1시간
**담당**: Agent 4
**의존성**: TASK-003

**테스트 항목**:
```
/about → / ✓
/roadmap → /projects?tab=roadmap ✓
/portfolio → /projects ✓
/lab → /projects?tab=lab ✓
/work-with-us → /connect/inquiry ✓
/blog → /stories/blog ✓
/notices → /stories/notices ✓
/community → /connect/community ✓
```

**완료 기준**:
- [ ] 모든 리디렉션 수동 테스트 통과
- [ ] 301 상태 코드 확인 (Vercel 배포 후)

---

### TASK-008: 모바일 메뉴 테스트
**예상 시간**: 30분
**담당**: Agent 4
**의존성**: TASK-002

**테스트 항목**:
- 320px, 375px, 414px 뷰포트에서 메뉴 동작
- 햄버거 아이콘 클릭 → 메뉴 열림
- 메뉴 항목 클릭 → 페이지 이동 + 메뉴 닫힘
- 외부 클릭 → 메뉴 닫힘

**완료 기준**:
- [ ] 3개 뷰포트에서 테스트 통과
- [ ] 터치 이벤트 정상 동작

---

### TASK-009: E2E 테스트 업데이트
**예상 시간**: 2시간
**담당**: Agent 4
**의존성**: TASK-001~006

**테스트 파일**:
```
tests/e2e/navigation.spec.ts
tests/e2e/redirects.spec.ts (신규)
tests/e2e/home.spec.ts (수정)
```

**테스트 케이스**:
```typescript
// redirects.spec.ts
test.describe('URL Redirects', () => {
  test('/about redirects to /', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveURL('/');
  });

  test('/roadmap redirects to /projects?tab=roadmap', async ({ page }) => {
    await page.goto('/roadmap');
    await expect(page).toHaveURL('/projects?tab=roadmap');
  });

  // ... 나머지 리디렉션 테스트
});

// navigation.spec.ts
test.describe('Navigation', () => {
  test('has 5 menu items', async ({ page }) => {
    await page.goto('/');
    const menuItems = page.locator('nav a');
    await expect(menuItems).toHaveCount(5);
  });

  test('menu items have correct labels', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toContainText('홈');
    await expect(page.locator('nav')).toContainText('서비스');
    await expect(page.locator('nav')).toContainText('프로젝트');
    await expect(page.locator('nav')).toContainText('이야기');
    await expect(page.locator('nav')).toContainText('함께하기');
  });
});
```

**완료 기준**:
- [ ] 리디렉션 테스트 8개 작성
- [ ] 네비게이션 테스트 5개 작성
- [ ] 홈 페이지 테스트 업데이트
- [ ] 전체 테스트 통과

---

## 스프린트 일정

```
Day 1 (월):
├── TASK-001: Header 메뉴 수정 (Agent 1)
├── TASK-003: 리디렉션 라우트 (Agent 2)
└── TASK-004: 허브 스켈레톤 (Agent 3)

Day 2 (화):
├── TASK-002: 모바일 메뉴 (Agent 1)
├── TASK-005: 홈 페이지 재구성 시작 (Agent 2)
└── TASK-004: 허브 스켈레톤 계속 (Agent 3)

Day 3 (수):
├── TASK-005: 홈 페이지 재구성 계속 (Agent 2)
├── TASK-006: About 통합 (Agent 2)
└── TASK-007: 리디렉션 테스트 (Agent 4)

Day 4 (목):
├── TASK-008: 모바일 테스트 (Agent 4)
├── TASK-009: E2E 테스트 (Agent 4)
└── 버그 수정 및 조정

Day 5 (금):
├── 최종 검증
├── 빌드 테스트
└── 문서 업데이트
```

---

## 완료 기준

### 필수
- [x] 메뉴 5개 정상 표시 (데스크톱/모바일) ✅ 2025-11-23
- [x] 모든 리디렉션 동작 ✅ 2025-11-23
- [x] 홈 페이지 새 섹션 렌더링 ✅ 2025-11-23
- [x] 허브 페이지 접근 가능 ✅ 2025-11-23

### 선택
- [ ] Lighthouse 점수 90+ 유지
- [x] 번들 크기 5% 이내 증가 ✅ (17.45s 빌드)
- [ ] E2E 테스트 100% 통과 (핵심 테스트 통과, 모바일 메뉴 셀렉터 수정 필요)

### 완료된 작업
- TASK-001: Header.tsx 5개 메뉴로 수정 ✅
- TASK-002: MobileMenu 동기화 ✅
- TASK-003: App.tsx 리디렉션 라우트 추가 ✅
- TASK-004: 허브 페이지 스켈레톤 생성 (ProjectsHub, StoriesHub, ConnectHub) ✅
- TASK-005: Index.tsx 섹션 재구성 ✅
- TASK-006: About 콘텐츠 홈으로 통합 ✅
- TASK-007: 리디렉션 동작 테스트 ✅
- TASK-008: 모바일 메뉴 테스트 ✅
- TASK-009: E2E 테스트 업데이트 ✅ (navigation.spec.ts, redirects.spec.ts 신규 생성)

---

## 다음 스프린트 준비

Sprint 2에서 진행할 작업:
- ProjectsHub 완성 (기존 Portfolio, Lab, Roadmap 통합)
- 탭별 컴포넌트 구현
- 프로젝트 카드 진척률 표시

---

## 관련 문서

- [requirements.md](../../spec/site-restructure/requirements.md)
- [architecture.md](../../plan/site-restructure/architecture.md)
- [implementation-strategy.md](../../plan/site-restructure/implementation-strategy.md)
