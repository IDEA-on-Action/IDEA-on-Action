# 🎨 AXpert 디자인 시스템

## 📖 개요
이 문서는 AXpert AI-Powered Business Opportunity Platform의 일관된 디자인 시스템을 제공합니다. 현대적인 글래스모피즘과 그라데이션 배경을 활용한 모든 UI/UX 컴포넌트와 디자인 결정사항이 이 가이드라인을 따릅니다.

## 🎯 디자인 원칙

### 1. **일관성 (Consistency)**
- 모든 컴포넌트는 동일한 색상 팔레트와 타이포그래피를 사용
- 간격과 크기는 8px 그리드 시스템을 따름
- 상호작용 상태는 일관된 패턴을 따름

### 2. **접근성 (Accessibility)**
- 색상 대비는 WCAG AA 기준을 충족
- 키보드 네비게이션 지원
- 스크린 리더 호환성

### 3. **반응형 (Responsive)**
- 모바일 우선 접근법
- 모든 브레이크포인트에서 최적화된 경험 제공
- 터치 친화적인 인터페이스

### 4. **성능 (Performance)**
- CSS-in-JS 최소화
- 불필요한 리렌더링 방지
- 최적화된 애니메이션

### 5. **현대적 UI/UX (Modern Design)**
- 글래스모피즘 효과 (backdrop-blur, 투명도)
- 그라데이션 배경과 호버 효과
- 부드러운 전환 애니메이션
- 다국어 지원 (한국어/영어)

## 🎨 현대적 UI 스타일

### 글래스모피즘 (Glassmorphism)
- **배경**: `bg-white/80 dark:bg-gray-800/80`
- **백드롭 블러**: `backdrop-blur-sm`
- **테두리**: `border border-white/20 dark:border-gray-700/50`
- **그림자**: `shadow-lg`

### 그라데이션 배경
- **메인 배경**: `bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950`
- **카드 호버**: `group-hover:opacity-10 transition-opacity duration-300`
- **버튼 그라데이션**: `bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800`

### 호버 효과
- **카드 호버**: `hover:shadow-xl hover:scale-105 transition-all duration-300`
- **버튼 호버**: `transform hover:scale-105`
- **그라데이션 호버**: `opacity-0 group-hover:opacity-5`

### 둥근 모서리
- **카드**: `rounded-2xl`
- **버튼**: `rounded-xl`
- **입력 필드**: `rounded-xl`
- **배지**: `rounded-full`

## 🌈 색상 시스템

### 기본 색상
- **Primary Colors**: `#3b82f6` (blue), `#ef4444` (red), `#10b981` (green), `#f59e0b` (orange), `#8b5cf6` (purple), `#06b6d4` (cyan)
- **AXpert Brand Colors**: `#1e40af` (primary), `#dc2626` (danger), `#059669` (success), `#d97706` (warning)

### 라이트 테마 색상

#### 텍스트 색상 (Light)
- **Primary**: `#111827` - 주요 텍스트 (제목, 본문)
- **Secondary**: `#6b7280` - 보조 텍스트 (설명, 메타데이터)
- **Tertiary**: `#9ca3af` - 3차 텍스트 (플레이스홀더)
- **Quaternary**: `#d1d5db` - 4차 텍스트 (비활성화)
- **Disabled**: `#f3f4f6` - 비활성화 텍스트

#### 배경 색상 (Light)
- **Primary**: `#ffffff` - 주요 배경 (카드, 모달)
- **Secondary**: `#f9fafb` - 보조 배경 (페이지 배경)
- **Tertiary**: `#f3f4f6` - 3차 배경 (사이드바)
- **Quaternary**: `#e5e7eb` - 4차 배경 (구분선)
- **Overlay**: `rgba(0,0,0,0.5)` - 오버레이 배경 (모달 배경)

#### 테두리 색상 (Light)
- **Primary**: `#e5e7eb` - 주요 테두리 (카드, 입력 필드)
- **Secondary**: `#d1d5db` - 보조 테두리 (구분선)
- **Tertiary**: `#9ca3af` - 3차 테두리 (비활성화)
- **Focus**: `#3b82f6` - 포커스 테두리 (입력 필드)
- **Transparent**: `rgba(0,0,0,0.1)` - 투명 테두리

### 다크 테마 색상

#### 텍스트 색상 (Dark)
- **Primary**: `#f9fafb` - 주요 텍스트 (제목, 본문)
- **Secondary**: `#d1d5db` - 보조 텍스트 (설명, 메타데이터)
- **Tertiary**: `#9ca3af` - 3차 텍스트 (플레이스홀더)
- **Quaternary**: `#6b7280` - 4차 텍스트 (비활성화)
- **Disabled**: `#374151` - 비활성화 텍스트

#### 배경 색상 (Dark)
- **Primary**: `#111827` - 주요 배경 (카드, 모달)
- **Secondary**: `#1f2937` - 보조 배경 (페이지 배경)
- **Tertiary**: `#374151` - 3차 배경 (사이드바)
- **Quaternary**: `#4b5563` - 4차 배경 (구분선)
- **Overlay**: `rgba(0,0,0,0.8)` - 오버레이 배경 (모달 배경)

#### 테두리 색상 (Dark)
- **Primary**: `#374151` - 주요 테두리 (카드, 입력 필드)
- **Secondary**: `#4b5563` - 보조 테두리 (구분선)
- **Tertiary**: `#6b7280` - 3차 테두리 (비활성화)
- **Focus**: `#60a5fa` - 포커스 테두리 (입력 필드)
- **Transparent**: `rgba(255,255,255,0.1)` - 투명 테두리

### 상태 색상 (Light & Dark)
- **Success**: `#10b981` (텍스트) / `#d1fae5` (라이트 배경) / `#064e3b` (다크 배경) - 성공 상태
- **Warning**: `#f59e0b` (텍스트) / `#fef3c7` (라이트 배경) / `#451a03` (다크 배경) - 경고 상태
- **Danger**: `#ef4444` (텍스트) / `#fee2e2` (라이트 배경) / `#7f1d1d` (다크 배경) - 위험 상태
- **Info**: `#3b82f6` (텍스트) / `#dbeafe` (라이트 배경) / `#1e3a8a` (다크 배경) - 정보 상태

## 🔤 타이포그래피

### 폰트 패밀리
- **Inter**: 메인 폰트 (100-900 weight) - UI 텍스트
- **JetBrains Mono**: 모노스페이스 폰트 (100-900 weight) - 코드, 데이터

### 폰트 웨이트 사용 가이드
- **100-300**: 매우 가벼운 텍스트, 캡션
- **400-500**: 본문 텍스트, 기본 가중치
- **600-700**: 제목, 강조 텍스트
- **800-900**: 매우 굵은 제목, 헤드라인

### 타이포그래피 규칙
- **모든 텍스트 요소는 줄간격 1.5배** 유지
- **문단 간 여백은 ≥ 16px**
- **본문**: Inter, 16px / Regular (400)
- **제목(H1~H3)**: Inter, 20~32px / SemiBold (600)
- **버튼**: Inter, 14px / Medium (500)
- **캡션**: Inter, 12px / Regular (400)

## 📱 브레이크포인트
- **sm**: `640px` - 모바일
- **md**: `768px` - 태블릿
- **lg**: `1024px` - 데스크톱
- **xl**: `1280px` - 큰 데스크톱
- **2xl**: `1536px` - 초대형 데스크톱

## 🎨 브랜드 보이스 & 톤

### 톤 & 목소리
- **톤**: 전문적이고 신뢰할 수 있는 비즈니스 파트너
- **목소리**: 명확하고 효율적, 복잡한 정보를 쉽게 전달

### 표현 예시
- ❌ "AI가 사업기회를 분석합니다."
- ✅ "새로운 사업기회를 발견했어요! 확인해보시겠어요?"
- ❌ "브리핑이 생성되었습니다."
- ✅ "팀원들과 공유할 브리핑이 준비되었습니다."

### 색상 사용 가이드 (WCAG AA 명도 기준 준수)
| 역할        | 색상 예시       | 설명                      |
|-------------|------------------|----------------------------|
| 주색상      | #3b82f6          | 신뢰 + 전문성을 유도       |
| 강조 색상   | #f59e0b          | 중요 정보, 알림 강조       |
| 상태 색상   | #10b981/#ef4444/#6b7280 | 성공/실패/대기 상태 표시   |

## 📐 레이아웃 베스트 프랙티스

### 그리드 시스템
- ✅ **모바일 퍼스트**: 최소 360px 너비 기준으로 설계
- ✅ **12-column 플루이드 그리드** 사용
- ✅ **8px 그리드 시스템**으로 일관된 간격 유지

### 페이지 설계 원칙
- ✅ **한 화면 = 하나의 집중 태스크**
  - 예: 기회 상세 페이지에는 '상세 정보 확인' 외 요소 최소화
- ✅ **스캔 가능한 정보 구조**: 제목 → 요약 → 상세정보 → 액션 순서
- ✅ **빠른 의사결정 지원**: 핵심 정보를 상단에 배치, 액션 버튼을 명확히 표시

## ♿ 접근성 필수 사항

### 상호작용 요소
- **모든 상호작용 요소**: `button`, `label`, `input` 태그에 `aria-*` 속성 사용
- **색상만으로 정보 전달 금지** (예: 오답은 "색 + 텍스트"로 표현)
- **키보드 탐색 보장**: 탭 이동 + 포커스 스타일 강조

### 콘텐츠 접근성
- **이미지/도표**에는 반드시 대체 텍스트(alt) 삽입
- **모든 상호작용 요소**는 키보드로 접근 가능해야 함

## ✍️ 콘텐츠 스타일 가이드

### 헤딩 스타일
- 명확하고 구체적인 정보 전달
  - ❌ "사업기회 정보"
  - ✅ "정부 AI 플랫폼 구축 사업 (5억원)"

### 불릿 문법
- 핵심 정보를 간결하게
- 마감일, 예산, 발주처 등 중요 정보 우선
- 3-5개 항목으로 제한

### 링크 문구
- **동작 중심 + 결과 예고**
  - ❌ "자세히 보기"
  - ✅ "상세 정보 확인하기", "브리핑 생성하기"

## 🌙 다크 테마 구현

### CSS 변수 시스템
```css
:root {
  /* Light theme variables */
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
  --color-border-primary: #e5e7eb;
  --color-border-secondary: #d1d5db;
  --color-focus: #3b82f6;
}

[data-theme="dark"] {
  /* Dark theme variables */
  --color-text-primary: #f9fafb;
  --color-text-secondary: #d1d5db;
  --color-text-tertiary: #9ca3af;
  --color-bg-primary: #111827;
  --color-bg-secondary: #1f2937;
  --color-bg-tertiary: #374151;
  --color-border-primary: #374151;
  --color-border-secondary: #4b5563;
  --color-focus: #60a5fa;
}
```

### 테마 전환 훅
```tsx
import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('axpert-theme') as 'light' | 'dark'
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(savedTheme || systemTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('axpert-theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return { theme, toggleTheme }
}
```

### Tailwind CSS 다크 모드 설정
```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // 또는 'media'
  theme: {
    extend: {
      colors: {
        // 다크 모드 색상 확장
        'dark-bg': '#111827',
        'dark-surface': '#1f2937',
        'dark-border': '#374151',
      }
    }
  }
}
```

## 🧩 컴포넌트 구조

### 기본 구조
```tsx
interface ComponentProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface ThemeProps {
  theme?: 'light' | 'dark' | 'auto';
}

// 다크 모드 지원 컴포넌트 예시
interface DarkModeComponentProps extends ComponentProps {
  darkMode?: boolean;
  darkClassName?: string;
}
```

### 변형 (Variants)
- **default**: 기본 스타일 (`bg-blue-600 dark:bg-blue-700`)
- **outline**: 테두리만 있는 스타일 (`border border-gray-300 dark:border-gray-600`)
- **ghost**: 배경이 투명한 스타일 (`hover:bg-gray-100 dark:hover:bg-gray-800`)
- **link**: 링크처럼 보이는 스타일 (`text-blue-600 dark:text-blue-400`)

### 크기 (Sizes)
- **sm**: 작은 크기 (24px) - `h-6 px-2 text-xs`
- **md**: 중간 크기 (32px) - `h-8 px-3 text-sm`
- **lg**: 큰 크기 (40px) - `h-10 px-4 text-base`
- **xl**: 매우 큰 크기 (48px) - `h-12 px-6 text-lg`

### 다크 모드 변형 예시
```tsx
// 기본 버튼 (라이트/다크 자동 적용)
<Button 
  variant="default" 
  className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white"
>
  기본 버튼
</Button>

// 아웃라인 버튼
<Button 
  variant="outline" 
  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
>
  아웃라인 버튼
</Button>

// 고스트 버튼
<Button 
  variant="ghost" 
  className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
>
  고스트 버튼
</Button>
```

## 🎭 애니메이션 & 전환

### 전환 효과
- **기본 전환**: `transition-all duration-300`
- **호버 효과**: `transform hover:scale-[1.02]`
- **그림자 효과**: `shadow-elegant`, `shadow-custom-md`, `shadow-custom-lg`
- **다크 모드 전환**: `transition-colors duration-200`

### 다크 모드 전환 애니메이션
```tsx
// 부드러운 테마 전환
<div className="transition-colors duration-200 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <p className="transition-colors duration-200 text-gray-600 dark:text-gray-400">
    부드러운 색상 전환
  </p>
</div>

// 호버 효과와 다크 모드 조합
<button className="transition-all duration-200 hover:scale-105 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600">
  호버 + 다크 모드
</button>
```

### 로딩 상태
- **스피너**: `Loader2` 아이콘 사용
- **스켈레톤**: `Skeleton` 컴포넌트 사용
- **프로그레스 바**: `Progress` 컴포넌트 사용

### 다크 모드 로딩 상태
```tsx
// 스켈레톤 로더 (다크 모드 지원)
<div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-4 w-3/4"></div>

// 프로그레스 바 (다크 모드 지원)
<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
  <div className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300" style={{width: '60%'}}></div>
</div>
```

## 🔧 사용법

### 컴포넌트 임포트
```tsx
import { Button, Input, Card, Badge, Alert } from "@/components/design-system";
```

### 기본 사용 예시
```tsx
<Button 
  variant="default" 
  size="lg" 
  className="bg-primary hover:bg-primary-hover dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-gray-100"
>
  기회 상세보기
</Button>

<Card 
  variant="elevated" 
  padding="md"
  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20"
>
  <CardHeader>
    <CardTitle className="text-gray-900 dark:text-gray-100">
      정부 AI 플랫폼 구축 사업
    </CardTitle>
    <CardDescription className="text-gray-600 dark:text-gray-400">
      예산: 5억원 | 마감: 2024-12-31
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-gray-700 dark:text-gray-300">
      인공지능 기반 공공서비스 플랫폼 구축을 위한 사업입니다.
    </p>
  </CardContent>
</Card>
```

### 다크 테마 사용 예시
```tsx
// 테마 토글 버튼
import { useTheme } from '@/hooks/useTheme'
import { Sun, Moon } from 'lucide-react'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  )
}

// 다크 테마 지원 카드
<Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
  <CardHeader>
    <CardTitle className="text-gray-900 dark:text-gray-100">
      정부 AI 플랫폼 구축 사업
    </CardTitle>
    <CardDescription className="text-gray-600 dark:text-gray-400">
      예산: 5억원 | 마감: 2024-12-31
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-gray-700 dark:text-gray-300">
      인공지능 기반 공공서비스 플랫폼 구축을 위한 사업입니다.
    </p>
  </CardContent>
</Card>
```

### 다크 테마 CSS 클래스 가이드
```css
/* 다크 테마 전용 클래스 */
.dark-mode {
  @apply bg-gray-900 text-gray-100;
}

.dark-card {
  @apply bg-gray-800 border-gray-700;
}

.dark-input {
  @apply bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400;
}

.dark-button {
  @apply bg-gray-700 hover:bg-gray-600 text-gray-100 border-gray-600;
}

/* 다크 테마 지원 컴포넌트 클래스 */
.dark-supported-card {
  @apply bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700;
}

.dark-supported-text {
  @apply text-gray-900 dark:text-gray-100;
}

.dark-supported-text-secondary {
  @apply text-gray-600 dark:text-gray-400;
}

.dark-supported-button {
  @apply bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white;
}

.dark-supported-input {
  @apply bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400;
}

.dark-supported-badge {
  @apply bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200;
}

.dark-supported-alert {
  @apply bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200;
}
```

### 컴포넌트별 다크 모드 적용 가이드

#### Button 컴포넌트
```tsx
// Primary Button
<Button className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white">
  기본 버튼
</Button>

// Secondary Button
<Button className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
  보조 버튼
</Button>

// Ghost Button
<Button className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
  투명 버튼
</Button>
```

#### Input 컴포넌트
```tsx
<Input 
  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 dark:focus:ring-blue-400"
  placeholder="입력하세요..."
/>
```

#### Badge 컴포넌트
```tsx
// Success Badge
<Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
  성공
</Badge>

// Warning Badge
<Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
  경고
</Badge>

// Error Badge
<Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
  오류
</Badge>
```

#### Alert 컴포넌트
```tsx
<Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
  <AlertTitle className="text-blue-800 dark:text-blue-200">
    정보
  </AlertTitle>
  <AlertDescription className="text-blue-700 dark:text-blue-300">
    이것은 정보 알림입니다.
  </AlertDescription>
</Alert>
```

---

> **마지막 업데이트**: 2025년 1월  
> **문서 버전**: 3.0  
> **작성자**: AXpert 팀  
> **적용 프로젝트**: AXpert 사업기회 탐색·요약·브리핑 플랫폼
