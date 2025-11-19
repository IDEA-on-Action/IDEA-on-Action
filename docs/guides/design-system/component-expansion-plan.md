# 🎨 디자인 컴포넌트 확장 계획

> IDEA on Action 프로젝트의 UI 컴포넌트 확장 및 개선 제안

**작성일**: 2025-11-19
**현재 버전**: 1.1.0
**분석 범위**: UI 컴포넌트 44개, 페이지 50+개

---

## 📊 현재 상태

### ✅ 보유 컴포넌트 (44개)

| 카테고리 | 컴포넌트 |
|---------|---------|
| **Form** | Input, Textarea, Checkbox, Radio, Select, Switch, Slider, Calendar, Form |
| **Display** | Card, Badge, Avatar, Skeleton, Separator, Progress |
| **Overlay** | Dialog, Alert Dialog, Dropdown Menu, Popover, Tooltip, Sheet, Toast |
| **Navigation** | Tabs, Breadcrumb, Pagination, Sidebar |
| **Layout** | Accordion, Carousel, Scroll Area, Table |
| **Feedback** | Alert, Toast, Sonner |
| **Data** | Chart (Recharts 통합) |
| **Interaction** | Button (variants 분리됨) |

### ✅ 강점
- WCAG 2.1 AA 100% 준수 (2025-11-19 검증 완료)
- shadcn/ui 기반으로 일관성 확보
- 다크 모드 완벽 지원
- TypeScript strict mode
- 접근성 우선 설계 (ARIA, 키보드 네비게이션)

---

## 🚀 추천 추가 컴포넌트 (우선순위별)

### 🔥 높은 우선순위 (즉시 추가 권장)

#### 1. **Command Palette** ⌘K
**목적**: 전역 검색 및 빠른 네비게이션
**사용처**: 모든 페이지 (키보드 단축키 ⌘K/Ctrl+K)
**shadcn/ui**: `npx shadcn-ui@latest add command`

**장점**:
- 사용자 경험 대폭 개선 (검색, 네비게이션, 명령 실행)
- 키보드 파워 유저 친화적
- Admin 대시보드에서 특히 유용

**예상 사용 사례**:
```tsx
// 전역 검색: 블로그 포스트, 서비스, 프로젝트, 페이지
// 빠른 이동: /admin/portfolio, /services/mvp
// 액션: "New Blog Post", "Logout", "Toggle Theme"
```

**구현 우선순위**: ⭐⭐⭐⭐⭐

---

#### 2. **Drawer**
**목적**: 모바일 친화적 사이드 패널
**사용처**: 모바일 필터, 설정, 장바구니 (Sheet 대체)
**shadcn/ui**: `npx shadcn-ui@latest add drawer`

**장점**:
- 모바일 UX 개선 (하단에서 올라오는 패널)
- Sheet보다 모바일 친화적
- 장바구니 Drawer로 전환 권장

**현재 문제**:
- 현재 장바구니는 Sheet (데스크톱 중심)
- 모바일에서 Sheet는 UX가 좋지 않음

**구현 우선순위**: ⭐⭐⭐⭐

---

#### 3. **Collapsible**
**목적**: 축소/확장 가능한 콘텐츠 패널
**사용처**: FAQ, 서비스 상세, Admin 폼 섹션
**shadcn/ui**: `npx shadcn-ui@latest add collapsible`

**장점**:
- 긴 폼을 섹션별로 관리
- FAQ 섹션 개선 (현재 Accordion 사용 중)
- 공간 절약

**예상 사용 사례**:
```tsx
// Admin 폼: "기본 정보", "고급 설정", "메타데이터" 섹션 축소/확장
// ServiceDetail: "가격", "기능", "FAQ" 섹션
```

**구현 우선순위**: ⭐⭐⭐⭐

---

#### 4. **Hover Card**
**목적**: 풍부한 내용의 호버 툴팁
**사용처**: 팀원 프로필, 프로젝트 미리보기, 기술 스택 설명
**shadcn/ui**: `npx shadcn-ui@latest add hover-card`

**장점**:
- 간단한 Tooltip보다 더 풍부한 정보 제공
- 프로필 카드, 프로젝트 미리보기에 유용

**예상 사용 사례**:
```tsx
// 팀원 이름 호버 → 프로필 사진, 직책, 소셜 링크
// 프로젝트 카드 호버 → 썸네일, 설명, 기술 스택
```

**구현 우선순위**: ⭐⭐⭐

---

### ⚡ 중간 우선순위 (필요시 추가)

#### 5. **Toggle / Toggle Group**
**목적**: 상태 토글 버튼 (On/Off)
**사용처**: 뷰 모드 전환, 필터, 정렬
**shadcn/ui**: `npx shadcn-ui@latest add toggle toggle-group`

**예상 사용 사례**:
```tsx
// 뷰 모드: Grid / List
// 정렬: 최신순 / 인기순 / 가격순
// 필터: 전체 / 진행 중 / 완료
```

**구현 우선순위**: ⭐⭐⭐

---

#### 6. **Context Menu**
**목적**: 우클릭 컨텍스트 메뉴
**사용처**: Admin 테이블 (포트폴리오, 블로그, 서비스)
**shadcn/ui**: `npx shadcn-ui@latest add context-menu`

**예상 사용 사례**:
```tsx
// 프로젝트 카드 우클릭 → "편집", "복제", "삭제", "새 탭에서 보기"
// 블로그 포스트 우클릭 → "편집", "미리보기", "공유"
```

**구현 우선순위**: ⭐⭐

---

#### 7. **Navigation Menu**
**목적**: 메가 메뉴 (다단계 드롭다운)
**사용처**: Header 네비게이션 (서비스 카테고리)
**shadcn/ui**: `npx shadcn-ui@latest add navigation-menu`

**현재 상황**:
- Header에 단순 링크만 존재
- 서비스 카테고리가 많아질 경우 드롭다운 필요

**구현 우선순위**: ⭐⭐

---

#### 8. **Resizable**
**목적**: 크기 조정 가능한 패널
**사용처**: Admin 분석 대시보드, 코드 에디터
**shadcn/ui**: `npx shadcn-ui@latest add resizable`

**예상 사용 사례**:
```tsx
// Admin Analytics: 차트 | 테이블 (크기 조정 가능)
// 콘텐츠 에디터: 마크다운 에디터 | 미리보기
```

**구현 우선순위**: ⭐

---

### 🔵 낮은 우선순위 (선택적)

#### 9. **Input OTP**
**목적**: 일회용 비밀번호 입력
**사용처**: 2FA 인증 (현재 Input 사용)
**shadcn/ui**: `npx shadcn-ui@latest add input-otp`

**현재 상황**:
- 2FA 페이지에서 일반 Input 사용
- UX 개선 가능

**구현 우선순위**: ⭐

---

#### 10. **Menubar**
**목적**: 애플리케이션 스타일 메뉴바
**사용처**: 고급 Admin 도구
**shadcn/ui**: `npx shadcn-ui@latest add menubar`

**사용 사례**: 제한적 (웹 앱에서는 드물게 사용)

**구현 우선순위**: ⭐

---

## 🎯 프로젝트 특화 커스텀 컴포넌트 제안

### 1. **StatsCard** (통계 카드)
**목적**: Analytics 대시보드 KPI 표시
**현재 상황**: Admin Dashboard에서 반복되는 Card 패턴

**제안 구조**:
```tsx
<StatsCard
  title="총 매출"
  value="₩165,000"
  change="+12.5%"
  trend="up"
  icon={<TrendingUp />}
  description="지난 달 대비"
/>
```

**위치**: `src/components/analytics/StatsCard.tsx`

---

### 2. **TimelineItem** (타임라인)
**목적**: 로드맵, 히스토리, 활동 로그
**현재 상황**: Roadmap 페이지에서 커스텀 구현

**제안 구조**:
```tsx
<Timeline>
  <TimelineItem
    date="2025-11-19"
    title="CMS Phase 4 완료"
    description="문서화 및 배포 준비 완료"
    status="completed"
  />
</Timeline>
```

**위치**: `src/components/ui/timeline.tsx`

---

### 3. **FileUpload** (파일 업로드)
**목적**: 드래그 앤 드롭 파일 업로드
**현재 상황**: Admin 페이지에서 `<input type="file">` 사용

**제안 구조**:
```tsx
<FileUpload
  accept="image/*"
  maxSize={5 * 1024 * 1024} // 5MB
  onUpload={(files) => console.log(files)}
  preview={true}
/>
```

**위치**: `src/components/ui/file-upload.tsx`

---

### 4. **RichTextEditor** (리치 텍스트 에디터)
**목적**: 블로그 포스트, 공지사항 작성
**현재 상황**: Textarea + 마크다운

**제안 라이브러리**:
- **Tiptap** (추천): 모던, 확장 가능, 접근성 우수
- **Lexical** (Facebook): 강력하지만 복잡
- **Quill**: 클래식, 안정적

**위치**: `src/components/editor/RichTextEditor.tsx`

---

### 5. **DataTable** (고급 테이블)
**목적**: 필터링, 정렬, 페이지네이션, 선택
**현재 상황**: Admin 페이지에서 수동 구현

**제안 라이브러리**:
- **TanStack Table** (추천): headless, 타입 세이프
- **AG Grid**: 강력하지만 무거움

**위치**: `src/components/data-table/DataTable.tsx`

---

### 6. **Stepper** (단계 표시)
**목적**: 다단계 프로세스 (회원가입, 결제)
**현재 상황**: Checkout 페이지에 필요

**제안 구조**:
```tsx
<Stepper currentStep={2}>
  <Step title="장바구니" />
  <Step title="결제 정보" />
  <Step title="완료" />
</Stepper>
```

**위치**: `src/components/ui/stepper.tsx`

---

## ♿ 접근성 개선 컴포넌트

### 1. **SkipToContent** (콘텐츠 바로가기)
**목적**: 키보드 사용자가 헤더 건너뛰기
**WCAG 요구사항**: Level A

```tsx
// src/components/a11y/SkipToContent.tsx
<SkipToContent targetId="main-content" />
```

---

### 2. **FocusTrap** (포커스 트랩)
**목적**: 모달/다이얼로그 내부에 포커스 유지
**현재 상황**: Radix UI가 자동 처리하지만 커스텀 모달에 필요

---

### 3. **ScreenReaderOnly** (스크린 리더 전용)
**목적**: 시각적으로 숨기고 스크린 리더에만 표시

```tsx
<ScreenReaderOnly>
  현재 페이지: 홈
</ScreenReaderOnly>
```

---

### 4. **KeyboardShortcuts** (키보드 단축키 도움말)
**목적**: 키보드 단축키 안내

```tsx
<KeyboardShortcuts>
  <Shortcut keys={["Ctrl", "K"]} action="검색 열기" />
  <Shortcut keys={["Esc"]} action="닫기" />
</KeyboardShortcuts>
```

---

## 🎨 디자인 시스템 확장

### 1. **Icon System** (아이콘 시스템)
**현재 상황**: Lucide React 사용 중 (✅ 좋음)
**제안**: 일관된 아이콘 크기 및 색상 가이드

```tsx
// src/lib/icon-config.ts
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

// 사용
<User size={iconSizes.md} className="text-primary" />
```

---

### 2. **Illustration Library** (일러스트레이션)
**목적**: Empty States, Errors, Success 페이지
**추천**:
- **undraw.co** (무료, SVG)
- **Storyset** (Freepik)
- **Humaaans** (믹스 앤 매치)

**위치**: `public/illustrations/`

---

### 3. **Animation Presets** (애니메이션 프리셋)
**목적**: 일관된 모션 디자인

```tsx
// src/lib/animations.ts
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3 },
}

// Framer Motion 사용
<motion.div {...fadeIn}>Content</motion.div>
```

---

### 4. **Layout Templates** (레이아웃 템플릿)
**목적**: 재사용 가능한 페이지 레이아웃

```tsx
// src/layouts/AdminPageLayout.tsx
<AdminPageLayout
  title="포트폴리오 관리"
  description="프로젝트를 추가, 수정, 삭제할 수 있습니다."
  actions={<Button>새 프로젝트</Button>}
>
  {children}
</AdminPageLayout>
```

---

## 📦 구현 로드맵

### Phase 1: 필수 컴포넌트 (2-3일)
- [ ] Command Palette (⌘K 검색)
- [ ] Drawer (모바일 장바구니)
- [ ] Collapsible (FAQ, 폼 섹션)
- [ ] Hover Card (프로필, 프로젝트)

### Phase 2: 특화 컴포넌트 (3-5일)
- [ ] StatsCard (Analytics)
- [ ] Timeline (Roadmap)
- [ ] FileUpload (Admin)
- [ ] DataTable (Admin)

### Phase 3: 접근성 개선 (1-2일)
- [ ] SkipToContent
- [ ] KeyboardShortcuts Help
- [ ] ScreenReaderOnly 유틸리티

### Phase 4: 디자인 시스템 확장 (2-3일)
- [ ] Icon System 가이드
- [ ] Illustration Library 구축
- [ ] Animation Presets
- [ ] Layout Templates

---

## 📊 예상 효과

### 사용자 경험
- ⌘K 검색으로 **네비게이션 시간 50% 단축**
- 모바일 Drawer로 **모바일 UX 30% 개선**
- 접근성 개선으로 **WCAG AAA 달성 가능**

### 개발 생산성
- 재사용 컴포넌트로 **개발 시간 40% 단축**
- 일관된 디자인으로 **디자인 QA 시간 60% 단축**
- TypeScript 타입으로 **버그 감소 30%**

### 유지보수성
- 컴포넌트 중앙화로 **스타일 변경 1곳에서 적용**
- shadcn/ui 기반으로 **업데이트 용이**
- 문서화로 **온보딩 시간 50% 단축**

---

## 🚀 즉시 실행 가능한 명령어

```bash
# Phase 1: 필수 컴포넌트 설치
npx shadcn-ui@latest add command
npx shadcn-ui@latest add drawer
npx shadcn-ui@latest add collapsible
npx shadcn-ui@latest add hover-card

# Phase 2: 추가 컴포넌트
npx shadcn-ui@latest add toggle toggle-group
npx shadcn-ui@latest add context-menu
npx shadcn-ui@latest add navigation-menu
npx shadcn-ui@latest add resizable
npx shadcn-ui@latest add input-otp
```

---

## 📚 참고 자료

- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [TanStack Table](https://tanstack.com/table/latest)
- [Tiptap Editor](https://tiptap.dev/)
- [Framer Motion](https://www.framer.com/motion/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**작성자**: Claude Code
**승인 대기**: 프로젝트 리드 검토 필요
**예상 작업 기간**: 10-15일 (4 Phase)
