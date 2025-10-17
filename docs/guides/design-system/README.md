# 🎨 VIBE WORKING 디자인 시스템

> 생각과행동(IdeaonAction)의 일관된 사용자 경험을 위한 디자인 가이드

**버전**: 1.0.0
**업데이트**: 2025-10-12

---

## 📌 브랜드 아이덴티티

### 핵심 가치
- **슬로건**: KEEP AWAKE, LIVE PASSIONATE
- **미션**: AI 기반 워킹 솔루션으로 일하는 방식을 혁신
- **톤 & 보이스**: 전문적이고 열정적인 AI 워킹 솔루션 파트너

### 색상 철학
- **Primary (Blue)**: 신뢰와 전문성
- **Accent (Orange)**: 열정과 에너지
- **Secondary (Purple)**: 혁신과 AI 기술

---

## 🎨 색상 시스템

### 브랜드 색상
```css
--color-brand-primary: #3b82f6    /* Blue - 신뢰, 전문성 */
--color-brand-accent: #f59e0b     /* Orange - 열정, 에너지 */
--color-brand-secondary: #8b5cf6  /* Purple - 혁신, AI */
```

### 라이트 테마
```css
/* 텍스트 */
--color-text-primary: #111827     /* 본문 텍스트 */
--color-text-secondary: #6b7280   /* 보조 텍스트 */
--color-text-tertiary: #9ca3af    /* 비활성 텍스트 */

/* 배경 */
--color-bg-primary: #ffffff       /* 메인 배경 */
--color-bg-secondary: #f9fafb     /* 카드 배경 */
--color-bg-tertiary: #f3f4f6      /* 호버 배경 */

/* 테두리 */
--color-border-primary: #e5e7eb
--color-border-secondary: #d1d5db
```

### 다크 테마
```css
/* 텍스트 */
--color-text-primary: #f9fafb
--color-text-secondary: #d1d5db
--color-text-tertiary: #9ca3af

/* 배경 */
--color-bg-primary: #111827
--color-bg-secondary: #1f2937
--color-bg-tertiary: #374151

/* 테두리 */
--color-border-primary: #374151
--color-border-secondary: #4b5563

/* 브랜드 색상 (밝기 조정) */
--color-brand-primary: #60a5fa
--color-brand-accent: #fbbf24
--color-brand-secondary: #a78bfa
```

### 접근성
- **명도 대비**: WCAG AA 기준 준수 (4.5:1 이상)
- **포커스 표시**: 모든 인터랙티브 요소에 명확한 포커스 링

---

## 📐 타이포그래피

### 폰트 패밀리
```css
font-family-sans: 'Inter', system-ui, sans-serif;
font-family-mono: 'JetBrains Mono', monospace;
```

### 타입 스케일
```css
/* 제목 */
H1: 32px / 2rem / font-semibold (600)
H2: 28px / 1.75rem / font-semibold (600)
H3: 20px / 1.25rem / font-semibold (600)

/* 본문 */
Body Large: 18px / 1.125rem / font-regular (400)
Body: 16px / 1rem / font-regular (400)
Body Small: 14px / 0.875rem / font-regular (400)

/* 코드 */
Code: 14px / 0.875rem / font-mono
```

### 행간(Line Height)
```css
Tight: 1.25
Normal: 1.5
Relaxed: 1.75
```

---

## 📏 레이아웃 시스템

### 8px 그리드 시스템
모든 간격과 크기는 8의 배수를 사용합니다.

```css
--grid-1: 8px
--grid-2: 16px
--grid-3: 24px
--grid-4: 32px
--grid-5: 40px
--grid-6: 48px
--grid-8: 64px
--grid-10: 80px
```

### 12-Column 그리드
```css
/* Container */
max-width: 1280px
padding: 0 16px (mobile) | 0 24px (tablet) | 0 32px (desktop)

/* Columns */
desktop: 12 columns
tablet: 8 columns
mobile: 4 columns
```

### 반응형 브레이크포인트
```css
sm: 640px   /* 스마트폰 (가로) */
md: 768px   /* 태블릿 */
lg: 1024px  /* 데스크톱 */
xl: 1280px  /* 대형 데스크톱 */
2xl: 1536px /* 초대형 화면 */
```

---

## 🎭 UI 스타일

### 글래스모피즘
```css
.glass-card {
  background: rgba(255, 255, 255, 0.8); /* Light mode */
  background: rgba(31, 41, 55, 0.8);    /* Dark mode */
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
}
```

### 그라데이션 배경
```css
/* Light mode */
background: linear-gradient(135deg, #f8fafc 0%, #dbeafe 50%, #e0e7ff 100%);

/* Dark mode */
background: linear-gradient(135deg, #030712 0%, #1e3a8a 50%, #312e81 100%);
```

### 그림자
```css
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)
shadow-md: 0 4px 10px rgba(0, 0, 0, 0.1)
shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.15)
shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.2)
```

---

## 🎬 애니메이션

### 전환 시간
```css
duration-200: 200ms  /* 빠른 전환 (hover, focus) */
duration-300: 300ms  /* 표준 전환 */
duration-500: 500ms  /* 느린 전환 (페이지 전환) */
```

### Easing
```css
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
ease-out: cubic-bezier(0, 0, 0.2, 1)
```

### 애니메이션 패턴
```css
/* Hover 효과 */
.hover-lift {
  transition: all 300ms ease-in-out;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  }
}

/* Scale 효과 */
.hover-scale {
  transition: transform 200ms ease-out;
  &:hover {
    transform: scale(1.05);
  }
}
```

---

## 🧩 컴포넌트 스타일

### 버튼
```css
/* Primary Button */
.btn-primary {
  background: linear-gradient(to right, #3b82f6, #2563eb);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 500;
  transition: all 200ms;
}

/* Secondary Button */
.btn-secondary {
  background: #f3f4f6;
  color: #111827;
  border: 1px solid #e5e7eb;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 500;
}
```

### 입력 필드
```css
.input-field {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 16px;
}

.input-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

### 카드
```css
.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
}
```

---

## 🛠️ 사용 가이드

### Tailwind CSS 클래스 활용

#### 글래스모피즘 카드
```jsx
<div className="glass-card">
  {/* Content */}
</div>
```

#### 그라데이션 배경
```jsx
<div className="gradient-bg min-h-screen">
  {/* Content */}
</div>
```

#### 호버 효과
```jsx
<button className="hover-lift btn-primary">
  Click me
</button>
```

#### 다크 모드 대응
```jsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  {/* Content */}
</div>
```

---

## 📚 참고 자료

- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [shadcn/ui 컴포넌트](https://ui.shadcn.com)
- [WCAG 접근성 가이드](https://www.w3.org/WAI/WCAG21/quickref/)
- [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/)

---

**업데이트 히스토리**
- 2025-10-12: 초기 버전 생성
