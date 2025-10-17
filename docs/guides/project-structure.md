# 프로젝트 폴더 구조 가이드

> VIBE WORKING (IdeaonAction) 프로젝트의 폴더 구조 설명

**업데이트**: 2025-10-12
**프로젝트 버전**: 1.2.0

---

## 📁 전체 구조

```
IdeaonAction-Homepage/
├── src/                    # React 소스 코드
├── docs/                   # 프로젝트 문서
├── public/                 # 정적 파일 (빌드 시 복사됨)
├── dist/                   # 빌드 결과물 (gitignore)
├── node_modules/           # npm 의존성 (gitignore)
├── [설정 파일들]
└── README.md
```

---

## 📂 src/ - 소스 코드

### 개요
Vite + React 18 + TypeScript 기반 프로젝트

### 구조
```
src/
├── components/             # React 컴포넌트
│   ├── ui/                 # shadcn/ui 기본 컴포넌트 (18개)
│   ├── shared/             # 공용 컴포넌트 ⭐ NEW
│   └── [페이지별 컴포넌트]
│
├── pages/                  # 페이지 컴포넌트
│   ├── Index.tsx           # 메인 페이지
│   └── NotFound.tsx        # 404 페이지
│
├── hooks/                  # 커스텀 React 훅 ⭐ NEW
│   └── useTheme.ts         # 다크 모드 훅
│
├── lib/                    # 유틸리티 & 라이브러리
│   ├── utils.ts            # 공통 유틸리티
│   └── supabase.ts         # Supabase 클라이언트
│
├── assets/                 # 이미지, 폰트 등
│   ├── logo-symbol.png
│   └── logo-full.png
│
├── App.tsx                 # 앱 루트 컴포넌트
├── main.tsx                # React 진입점
└── index.css               # 글로벌 CSS (디자인 시스템) ⭐
```

---

## 🧩 컴포넌트 구조 상세

### components/ui/ - shadcn/ui 컴포넌트

재사용 가능한 기본 UI 컴포넌트 (18개)

```
ui/
├── accordion.tsx           # Accordion 컴포넌트
├── avatar.tsx              # Avatar 컴포넌트
├── button.tsx              # Button 컴포넌트
├── card.tsx                # Card 컴포넌트 ⭐ 다크 모드 적용
├── dropdown-menu.tsx       # Dropdown Menu
├── input.tsx               # Input Field
├── label.tsx               # Label
├── sheet.tsx               # Sheet (Drawer)
├── sonner.tsx              # Toast Notifications
├── toaster.tsx             # Toaster
├── tooltip.tsx             # Tooltip
└── ...
```

**특징**:
- Radix UI 기반
- Tailwind CSS 스타일링
- TypeScript 타입 지원
- 다크 모드 대응 ⭐

---

### components/shared/ - 공용 컴포넌트 ⭐ NEW

프로젝트 전반에 사용되는 커스텀 컴포넌트

```
shared/
└── ThemeToggle.tsx         # 다크 모드 토글 버튼
```

**ThemeToggle 컴포넌트**:
- Light/Dark/System 테마 선택
- Dropdown 메뉴 (Sun/Moon/Monitor 아이콘)
- useTheme 훅 사용

**사용 예시**:
```tsx
import { ThemeToggle } from '@/components/shared/ThemeToggle'

<ThemeToggle />
```

---

### components/ - 페이지별 컴포넌트

메인 페이지의 섹션별 컴포넌트

```
components/
├── Header.tsx              # 헤더 ⭐ 글래스모피즘 + ThemeToggle
├── Hero.tsx                # 히어로 섹션
├── Services.tsx            # 서비스 섹션
├── Features.tsx            # 특징 섹션
├── About.tsx               # 회사 소개
├── Contact.tsx             # 문의 섹션
└── Footer.tsx              # 푸터
```

**Header 컴포넌트** (주요 변경):
- 글래스모피즘 스타일 (`.glass-card`)
- ThemeToggle 버튼 통합
- 반응형 네비게이션

---

## 📄 pages/ - 페이지 컴포넌트

React Router 기반 페이지

```
pages/
├── Index.tsx               # 메인 페이지 (/) ⭐ 그라데이션 배경
└── NotFound.tsx            # 404 페이지 (/*)
```

**Index.tsx** (주요 변경):
- 그라데이션 배경 (`.gradient-bg`)
- 모든 섹션 컴포넌트 통합

---

## 🔗 hooks/ - 커스텀 훅 ⭐ NEW

재사용 가능한 React 훅

```
hooks/
└── useTheme.ts             # 다크 모드 테마 훅
```

**useTheme 훅**:
```typescript
const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

// theme: 'light' | 'dark' | 'system'
// resolvedTheme: 'light' | 'dark'
// setTheme: (theme: Theme) => void
// toggleTheme: () => void
```

**기능**:
- Light/Dark/System 테마 지원
- localStorage 저장
- 시스템 설정 자동 감지 (prefers-color-scheme)
- document.documentElement 클래스 자동 업데이트

---

## 🛠️ lib/ - 유틸리티 & 라이브러리

공통 유틸리티 함수 및 라이브러리 설정

```
lib/
├── utils.ts                # 공통 유틸리티
│   └── cn() - Tailwind 클래스 병합
└── supabase.ts             # Supabase 클라이언트 설정
```

---

## 🎨 index.css - 디자인 시스템 ⭐

글로벌 CSS 및 디자인 시스템

```css
/* Import Google Fonts */
@import url('...')

@tailwind base;
@tailwind components;
@tailwind utilities;

/* CSS 변수 정의 */
:root {
  /* Light 테마 */
}

.dark {
  /* Dark 테마 */
}

/* 커스텀 클래스 */
.glass-card { ... }
.gradient-bg { ... }
.hover-lift { ... }
```

**주요 내용**:
- Google Fonts 임포트 (Inter, JetBrains Mono)
- CSS 변수 (Light/Dark 테마)
- 글래스모피즘 스타일 (`.glass-card`)
- 그라데이션 배경 (`.gradient-bg`)
- 유틸리티 클래스

---

## 📚 docs/ - 프로젝트 문서

문서 구조는 [docs/README.md](../README.md) 참조

```
docs/
├── README.md               # 문서 인덱스
├── guides/                 # 실무 가이드
│   ├── design-system/      # 디자인 시스템 ⭐
│   ├── deployment/         # 배포 가이드
│   ├── setup/              # 초기 설정
│   └── database/           # 데이터베이스
├── project/                # 프로젝트 관리
│   ├── roadmap.md
│   └── changelog.md        # ⭐ NEW
├── devops/                 # DevOps
└── archive/                # 히스토리 보관 ⭐
    ├── CLAUDE-full-2025-10-09.md
    └── project-todo-full-2025-10-09.md
```

---

## 🌐 public/ - 정적 파일

빌드 시 `dist/`로 복사되는 공개 파일

```
public/
└── vite.svg                # Vite 로고
```

---

## 📦 dist/ - 빌드 결과물

Vite 빌드 후 생성되는 정적 파일들 (gitignore)

```
dist/
├── index.html              # 진입 HTML
├── assets/
│   ├── index-[hash].css    # 번들 CSS (70.13 kB)
│   ├── index-[hash].js     # 번들 JS (374.71 kB)
│   └── [이미지 파일들]
```

**배포 대상**: Vercel, Netlify 등

**최신 빌드 통계** (2025-10-12):
```
CSS: 70.13 kB (gzip: 12.05 kB)
JS: 374.71 kB (gzip: 118.06 kB)
Total (gzip): 130.11 kB
```

---

## ⚙️ 설정 파일

### 빌드 & 번들링
- **vite.config.ts**: Vite 설정 (포트, 플러그인, 경로 alias)
- **tsconfig.json**: TypeScript 컴파일러 설정
- **package.json**: npm 스크립트 & 의존성

### 스타일링
- **tailwind.config.ts**: Tailwind CSS 설정 ⭐
  - 브랜드 색상 (Blue, Orange, Purple)
  - 폰트 패밀리 (Inter, JetBrains Mono)
  - 8px 그리드 시스템
  - 커스텀 그림자 & 블러
- **src/index.css**: CSS 변수 & 글로벌 스타일 ⭐

### 기타
- **.env.local**: 환경 변수 (gitignore)
- **.gitignore**: Git 제외 파일
- **index.html**: HTML 진입점

---

## 📝 폴더 구조 규칙

### 파일 명명
- **컴포넌트**: PascalCase (Header.tsx, ThemeToggle.tsx)
- **훅**: camelCase with 'use' prefix (useTheme.ts, useAuth.ts)
- **유틸리티**: camelCase (utils.ts, supabase.ts)
- **페이지**: PascalCase (Index.tsx, NotFound.tsx)

### Import 경로
- **Alias**: `@/` → `src/` (vite.config.ts에서 설정)
- **예시**:
  ```typescript
  import { Button } from '@/components/ui/button'
  import { useTheme } from '@/hooks/useTheme'
  import { cn } from '@/lib/utils'
  ```

### 컴포넌트 구조
```tsx
// 1. Imports
import React from 'react'
import { cn } from '@/lib/utils'

// 2. Types
interface Props {
  children: React.ReactNode
}

// 3. Component
export function MyComponent({ children }: Props) {
  return (
    <div className="p-4">
      {children}
    </div>
  )
}
```

---

## 🚀 프로젝트 확장 시

### 새 컴포넌트 추가
1. **공용 컴포넌트**: `src/components/shared/`
2. **페이지 컴포넌트**: `src/components/`
3. **UI 컴포넌트**: `src/components/ui/` (shadcn/ui 사용)

### 새 페이지 추가
1. `src/pages/` 에 페이지 컴포넌트 생성
2. `src/App.tsx` 에 라우트 추가
3. 네비게이션 메뉴 업데이트 (Header.tsx)

### 새 훅 추가
1. `src/hooks/` 에 훅 파일 생성
2. `use` prefix 사용 (예: useModal.ts)
3. TypeScript 타입 정의

### 문서 추가
1. `docs/` 에 적절한 디렉토리 선택
2. Markdown 형식 (.md) 사용
3. `docs/README.md` 에 링크 추가

---

## 🔗 관련 문서

- **[CLAUDE.md](../../CLAUDE.md)** - 프로젝트 전체 개요
- **[docs/README.md](../README.md)** - 문서 인덱스
- **[docs/guides/design-system/README.md](design-system/README.md)** - 디자인 시스템 가이드

---

**Last Updated**: 2025-10-12
**Project Version**: 1.2.0
