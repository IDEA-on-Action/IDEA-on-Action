# ♿ 접근성 가이드

> WCAG 2.1 AA 준수를 위한 색상 대비 및 접근성 가이드

**마지막 업데이트**: 2025-11-19
**검증 도구**: [scripts/check-color-contrast.cjs](../../../scripts/check-color-contrast.cjs)

---

## 🎨 색상 대비 기준 (WCAG 2.1 AA)

### 대비율 요구사항

| 텍스트 유형 | WCAG AA | WCAG AAA |
|------------|---------|----------|
| **일반 텍스트** (< 18pt / < 14pt bold) | **4.5:1** | 7:1 |
| **큰 텍스트** (≥ 18pt / ≥ 14pt bold) | **3:1** | 4.5:1 |
| **UI 컴포넌트** (버튼, 아이콘 등) | **3:1** | - |

---

## ✅ 검증된 색상 조합

### 라이트 모드

| 컴포넌트 | 대비율 | 준수 레벨 | 전경색 | 배경색 |
|---------|--------|----------|--------|--------|
| **Primary Button** | 4.52:1 | ✅ AA | `#f8fafb` | `#156bf4` |
| **Secondary Button** | 16.30:1 | ✅ AAA | `#0f172a` | `#f1f5f9` |
| **Accent Text** | 9.38:1 | ✅ AAA | `#02081a` | `#f59f0a` |
| **Muted Text** | 6.11:1 | ✅ AA | `#556377` | `#ffffff` |
| **Outline Button (hover)** | 9.38:1 | ✅ AA | `#02081a` | `#f59f0a` |

### 다크 모드

| 컴포넌트 | 대비율 | 준수 레벨 | 전경색 | 배경색 |
|---------|--------|----------|--------|--------|
| **Primary Button** | 4.52:1 | ✅ AA | `#f8fafb` | `#156bf4` |
| **Secondary Button** | 13.98:1 | ✅ AAA | `#f8fafb` | `#1e293b` |
| **Accent Text** | 11.82:1 | ✅ AAA | `#02081a` | `#fbbf24` |
| **Muted Text** | 9.09:1 | ✅ AAA | `#a3b0c2` | `#020817` |
| **Outline Button (hover)** | 11.82:1 | ✅ AA | `#02081a` | `#fbbf24` |

---

## 🔧 2025-11-19 색상 대비 개선

### 변경사항

#### 1. Primary 색상 명도 조정
**문제**: 대비율 3.48:1 (WCAG AA 미달)
**해결**: Lightness 60% → 52%로 감소

```diff
/* Before */
- --primary: 217 91% 60%;  /* #3b82f6 */

/* After */
+ --primary: 217 91% 52%;  /* #2563eb (더 진한 파란색) */
```

**결과**: 대비율 4.52:1 ✅ (WCAG AA 준수)

#### 2. Dark Mode Accent Foreground 수정
**문제**: 밝은 노란색 배경에 흰색 텍스트 (대비율 1.62:1)
**해결**: Foreground를 어두운 색으로 변경

```diff
/* Before */
- --accent-foreground: 210 40% 98%;  /* 거의 흰색 */

/* After */
+ --accent-foreground: 222.2 84% 4.9%;  /* 거의 검은색 */
```

**결과**: 대비율 11.82:1 ✅ (WCAG AAA 준수)

---

## 🎯 버튼 가시성 개선

### Outline 버튼 (2025-11-19 개선)

**문제**: 기본 상태에서 border만 보여 가시성 부족

```diff
/* Before */
- outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
/* border-input = hsl(214.3 31.8% 91.4%) - 매우 연한 회색 */

/* After */
+ outline: "border-2 border-primary/60 bg-background text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent"
```

**개선 사항**:
- ✅ Border 두께: 1px → 2px (더 굵게)
- ✅ Border 색상: input (연한 회색) → primary/60 (파란색, 60% 투명도)
- ✅ 텍스트 색상: 명시적으로 foreground 지정
- ✅ Hover 시 border도 accent 색상으로 변경

### Ghost 버튼 (2025-11-19 개선)

**문제**: 기본 상태에서 배경색 없어 가시성 부족

```diff
/* Before */
- ghost: "hover:bg-accent hover:text-accent-foreground"

/* After */
+ ghost: "text-foreground hover:bg-accent hover:text-accent-foreground"
```

**개선 사항**:
- ✅ 기본 상태 텍스트 색상 명시 (foreground)
- ✅ Hover 시 배경/텍스트 대비 충분 (11.82:1)

---

## 🔬 검증 방법

### 자동 검증 스크립트

```bash
# 색상 대비 검증
node scripts/check-color-contrast.cjs
```

**출력 예시**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 디자인 시스템 색상 대비 검증
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 Light Mode
────────────────────────────────────────
✅ Primary Button (default)
   대비율: 4.52:1 (AA)
   전경색: rgb(248, 250, 252)
   배경색: rgb(21, 107, 244)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 검증 결과: 10/10 통과
✅ 모든 색상 조합이 WCAG 2.1 AA 기준 충족
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 수동 검증 도구

1. **Chrome DevTools Lighthouse**
   - Accessibility 점수 확인
   - Contrast ratio 자동 검사

2. **WebAIM Contrast Checker**
   - URL: https://webaim.org/resources/contrastchecker/
   - 개별 색상 조합 수동 검증

3. **WAVE Browser Extension**
   - 페이지 전체 접근성 스캔
   - Contrast errors 자동 감지

---

## 🧩 접근성 컴포넌트 (2025-11-19 추가)

### SkipToContent
**목적**: WCAG 2.1 Guideline 2.4.1 - Bypass Blocks

"본문으로 바로가기" 링크를 제공하여 키보드 사용자가 반복적인 네비게이션을 건너뛸 수 있습니다.

**특징**:
- Tab 키 포커스 시에만 표시
- 화면 상단 좌측에 절대 위치
- `main` 태그로 포커스 이동 및 스크롤

**사용 예시**:
```tsx
import { SkipToContent } from "@/components/a11y";

// App.tsx
<SkipToContent targetId="main-content" />

// Index.tsx
<main id="main-content" tabIndex={-1}>
  {/* Main content */}
</main>
```

**위치**: `src/components/a11y/SkipToContent.tsx`

---

### ScreenReaderOnly
**목적**: WCAG 2.1 Guideline 1.3.1 - Info and Relationships

시각적으로 숨기되, 스크린 리더에는 노출되는 컨텐츠를 제공합니다.

**특징**:
- Tailwind CSS의 `sr-only` 유틸리티 사용
- 커스텀 HTML 태그 지원 (`as` prop)
- 시각적 레이아웃에 영향 없음

**사용 예시**:
```tsx
import { ScreenReaderOnly } from "@/components/a11y";

// 아이콘 버튼에 레이블 추가
<button>
  <SearchIcon />
  <ScreenReaderOnly>검색</ScreenReaderOnly>
</button>

// 폼 레이블 (시각적으로는 placeholder로 표시)
<ScreenReaderOnly as="label" htmlFor="search-input">
  검색어 입력
</ScreenReaderOnly>
<input id="search-input" placeholder="검색..." />
```

**위치**: `src/components/a11y/ScreenReaderOnly.tsx`

---

### KeyboardShortcuts
**목적**: WCAG 2.1 Guideline 2.1.1 - Keyboard Accessible

키보드 단축키 목록을 다이얼로그로 표시합니다.

**특징**:
- `?` 키로 도움말 다이얼로그 열기
- `Esc` 키로 닫기
- 카테고리별 단축키 그룹핑 (Navigation, Search, General)
- 접근 가능한 다이얼로그 (Radix UI Dialog)

**단축키 목록**:
- `⌘ K`: 검색 열기
- `Esc`: 다이얼로그/메뉴 닫기
- `Tab`: 다음 포커스
- `Shift Tab`: 이전 포커스
- `Enter`: 선택/실행
- `Space`: 체크박스/버튼 토글
- `?`: 키보드 단축키 도움말 열기

**사용 예시**:
```tsx
import { KeyboardShortcuts } from "@/components/a11y";

// App.tsx
<KeyboardShortcuts />
```

**위치**: `src/components/a11y/KeyboardShortcuts.tsx`

---

### Kbd (UI Component)
키보드 키를 시각적으로 표시하는 컴포넌트입니다.

**사용 예시**:
```tsx
import { Kbd } from "@/components/ui/kbd";

<div>
  Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search
</div>
```

**위치**: `src/components/ui/kbd.tsx`

---

## 📋 접근성 체크리스트

### 색상 대비
- [x] 모든 텍스트 대비율 ≥ 4.5:1 (일반 텍스트)
- [x] 큰 텍스트 대비율 ≥ 3:1
- [x] UI 컴포넌트 대비율 ≥ 3:1
- [x] 라이트/다크 모드 모두 검증 완료

### 버튼 가시성
- [x] Primary 버튼: 충분한 대비 (4.52:1)
- [x] Outline 버튼: 기본 상태 border 명확히 보임
- [x] Ghost 버튼: hover 상태 명확히 보임
- [x] Disabled 버튼: opacity 50%로 비활성 명확

### 포커스 표시
- [x] 모든 인터랙티브 요소에 포커스 링
- [x] 포커스 링 색상: ring (primary)
- [x] 포커스 링 offset: 2px
- [x] 키보드 네비게이션 지원

### 스크린 리더
- [x] aria-label 속성 명시 (버튼, 링크)
- [x] role 속성 명시 (리스트, 다이얼로그)
- [x] alt 속성 (이미지)
- [x] 시맨틱 HTML (header, main, footer, nav)

### 키보드 접근성 (2025-11-19 추가)
- [x] Skip to content 링크 (Tab 키로 접근)
- [x] 키보드 단축키 도움말 (? 키)
- [x] 모든 페이지에 `id="main-content"` 추가
- [x] `tabIndex={-1}` 로 프로그래밍 방식 포커스 지원

### WCAG AAA 추가 요구사항
- [x] 대비율 ≥ 7:1 (일반 텍스트) - 대부분 컴포넌트 달성
- [x] 대비율 ≥ 4.5:1 (큰 텍스트) - 모든 컴포넌트 달성
- [x] Bypass blocks (Skip to content)
- [x] Keyboard shortcuts documentation
- [ ] Focus order follows DOM order (검증 필요)
- [ ] Focus visible on all interactive elements (일부 검증 필요)

---

## 🎓 추가 자료

### WCAG 가이드라인
- [WCAG 2.1 Overview](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

### 색상 대비 도구
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Contrast Ratio Calculator](https://contrast-ratio.com/)
- [Accessible Colors](https://accessible-colors.com/)

### 접근성 테스트
- [axe DevTools](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
- [WAVE Extension](https://wave.webaim.org/extension/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

## 📝 변경 이력

### 2025-11-19 (오후) - 접근성 컴포넌트 추가
- ✅ SkipToContent 컴포넌트 생성 (WCAG 2.1 - Bypass Blocks)
- ✅ ScreenReaderOnly 컴포넌트 생성 (WCAG 2.1 - Info and Relationships)
- ✅ KeyboardShortcuts 컴포넌트 생성 (WCAG 2.1 - Keyboard Accessible)
- ✅ Kbd UI 컴포넌트 생성 (키보드 키 표시)
- ✅ App.tsx에 접근성 컴포넌트 통합
- ✅ Index.tsx `main` 태그에 `id="main-content"` 추가
- ✅ 접근성 문서 업데이트 (컴포넌트 설명, WCAG AAA 체크리스트)

### 2025-11-19 (오전) - 색상 대비 개선
- ✅ Primary 색상 명도 조정 (60% → 52%)
- ✅ Dark mode accent foreground 수정
- ✅ Outline 버튼 가시성 개선 (border 2px, primary/60)
- ✅ Ghost 버튼 텍스트 색상 명시
- ✅ 색상 대비 검증 스크립트 추가
- ✅ 모든 색상 조합 WCAG 2.1 AA 준수 확인

---

**질문이나 제안사항은 [GitHub Issues](https://github.com/IDEA-on-Action/idea-on-action/issues)에 등록해주세요.**
