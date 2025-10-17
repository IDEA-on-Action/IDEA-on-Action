# 변경 로그 (Changelog)

> VIBE WORKING 프로젝트 버전별 변경 사항

**포맷**: [Keep a Changelog](https://keepachangelog.com/) 기반

---

## [1.3.0] - 2025-10-17

### 📚 Documentation - 프로젝트 관리 체계 개선

**AI 협업 규칙 추가** (`CLAUDE.md`)
- SOT (Skeleton of Thought) 원칙 정의
  - 5단계 프로세스: 문제 정의 → 현황 파악 → 구조 설계 → 영향 범위 → 검증 계획
- 작업 후 문서 업데이트 체크리스트
  - 필수: CLAUDE.md, project-todo.md
  - 중요: changelog.md, roadmap.md
  - 선택: 관련 가이드 문서
- 작업 패턴 표준화
  - SOT 적용 → 구현 → 검증 → 문서화

**로드맵 강화** (`CLAUDE.md`, `docs/project/roadmap.md`)
- Phase 8-12 상세 계획 수립
  - Phase 8: 서비스 페이지 구현 (2025 Q4)
  - Phase 9: 전자상거래 기능 (2025 Q4-Q1)
  - Phase 10: SSO & 인증 강화 (2025 Q1)
  - Phase 11: 콘텐츠 관리 (2025 Q2)
  - Phase 12: 고도화 & 확장 (2025 Q2-Q3)
- 각 Phase별 상세 정보
  - 우선순위, 예상 기간, 전제 조건
  - 작업 항목 세부 분류
  - 기술 스택 및 결정 사항
  - 완료 기준 (DoD)
  - 예상 리스크 및 대응 방안
- 성공 지표 (KPI) 정의
  - Phase별 목표 수치화
  - 진행 현황 시각화 (Progress Bar)

**문서 관리 원칙 추가**
- 작업 전: SOT로 계획 수립
- 작업 중: 진행률 추적 (project-todo.md)
- 작업 후: 문서 업데이트 체크리스트 확인
- 주기적: 로드맵 진행률 업데이트 (주 1회)

### ✨ Changed

**CLAUDE.md 업데이트**
- 버전: 1.2.0 → 1.3.0
- 상태: Phase 4 & 5 진행 중 → Phase 8 시작
- 로드맵 섹션 대폭 확장 (Phase 8-12 추가)
- AI 협업 규칙 섹션 신규 추가
- 문서 관리 원칙 추가

**project-todo.md 재정리**
- Phase 8 기준으로 작업 항목 재구성
- 진행 중 섹션 간소화 (Phase 8 중심)
- 다음 단계 섹션 추가 (Phase 9 미리보기)
- 완료 기준 체크리스트 추가

**docs/project/roadmap.md 신규 작성**
- 2025-2026 장기 개발 계획
- Phase 1-12 전체 로드맵
- 기술 스택 결정 사항 문서화
- 리스크 분석 및 대응 방안
- KPI 및 업데이트 주기 명시

### 📝 Files Changed

**신규 문서**
- `docs/project/roadmap.md` - 상세 로드맵 (17KB)

**업데이트**
- `CLAUDE.md` - AI 협업 규칙, 로드맵 강화
- `project-todo.md` - Phase 8 작업 항목 추가
- `docs/project/changelog.md` - 1.3.0 변경 로그

### 🎯 Impact

**개발 효율성 향상**
- SOT 원칙으로 작업 전 명확한 계획 수립
- 문서 업데이트 자동화 (체크리스트)

**프로젝트 관리 개선**
- Phase 8-12까지 명확한 방향성 확보
- 진행률 추적 용이 (시각화)
- 리스크 사전 식별 및 대응 가능

**협업 품질 향상**
- AI와 명확한 가이드라인 공유
- 작업 패턴 표준화

---

## [1.2.0] - 2025-10-12

### 🎨 Added - 디자인 시스템 (Phase 7)

**디자인 시스템 문서**
- `docs/guides/design-system/README.md` 생성
  - 브랜드 아이덴티티 가이드
  - 색상 시스템 (Light/Dark)
  - 타이포그래피 (Inter, JetBrains Mono)
  - UI 스타일 (글래스모피즘, 그라데이션)
  - 레이아웃 시스템 (8px 그리드)
  - 컴포넌트 사용법

**다크 모드 지원**
- `src/hooks/useTheme.ts` 추가
  - Light/Dark/System 테마 자동 전환
  - localStorage 저장
  - 시스템 설정 자동 감지 (prefers-color-scheme)
- `src/components/shared/ThemeToggle.tsx` 추가
  - Dropdown 메뉴 (Sun/Moon/Monitor 아이콘)
  - 테마 선택 UI

**Tailwind CSS 확장**
- 브랜드 색상 팔레트
  - Primary (Blue): #3b82f6 - 신뢰와 전문성
  - Accent (Orange): #f59e0b - 열정과 에너지
  - Secondary (Purple): #8b5cf6 - 혁신과 AI
- 폰트 패밀리
  - sans: Inter (본문)
  - mono: JetBrains Mono (코드)
- 8px 그리드 시스템
  - grid-1 (8px) ~ grid-6 (48px)
- 커스텀 그림자
  - elegant, custom-md, custom-lg
- 백드롭 블러
  - xs (2px)

**CSS 변수 시스템** (`src/index.css`)
- Light 테마 변수
  - 텍스트, 배경, 테두리, 브랜드 색상
  - 그라데이션 배경 (slate-50 → blue-50 → indigo-100)
- Dark 테마 변수
  - 밝기 조정된 브랜드 색상
  - 그라데이션 배경 (gray-950 → blue-950 → indigo-950)
- 글래스모피즘 스타일 클래스
  - `.glass-card`: 반투명 배경 + 백드롭 블러
  - `.gradient-bg`: 그라데이션 배경
  - `.hover-lift`: 호버 효과
- 버튼 & 입력 필드 스타일
  - `.btn-primary`, `.btn-secondary`
  - `.input-field`

**Google Fonts 임포트**
- Inter (100-900 weight)
- JetBrains Mono (100-900 weight)
- @import 위치 최적화 (CSS 파일 최상단)

### ✨ Changed

**Header 컴포넌트** (`src/components/Header.tsx`)
- 글래스모피즘 스타일 적용 (`.glass-card`)
- ThemeToggle 버튼 추가 (우측 상단)
- 다크 모드 테두리 색상 지원

**Card 컴포넌트** (`src/components/ui/card.tsx`)
- 다크 모드 색상 대응
  - Light: bg-white, border-gray-200
  - Dark: bg-gray-800, border-gray-700
- 둥근 모서리 (rounded-2xl)
- 부드러운 전환 효과 (smooth-transition)

**Index 페이지** (`src/pages/Index.tsx`)
- 그라데이션 배경 적용 (`.gradient-bg`)

### 📊 Build Stats

```
dist/index.html                         1.23 kB │ gzip:   0.66 kB
dist/assets/index-BNbuAXEi.css         70.13 kB │ gzip:  12.05 kB
dist/assets/index-DINIl4nc.js         374.71 kB │ gzip: 118.06 kB

Total (gzip): 130.11 kB
```

**변경점**:
- CSS: +0.18 kB (Google Fonts 추가)
- JS: +1 kB (useTheme 훅)
- 총 증가: +1.2 kB (최소화됨)

### 📝 Documentation

**신규 문서**
- `docs/guides/design-system/README.md` - 디자인 시스템 가이드
- `docs/README.md` - 문서 전체 인덱스
- `docs/project/changelog.md` - 변경 로그 (이 파일)

**업데이트**
- `CLAUDE.md` - 프로젝트 구조, 기술 스택 정정 (Next.js → Vite)
- `project-todo.md` - Phase 7 완료 표시

---

## [1.1.0] - 2025-10-11

### ✨ Added - Navigation Menu System

**Mega Menu 네비게이션**
- Desktop Mega Menu (3-column layout)
  - 서비스, AI 도구, 리소스 카테고리
  - Hover 기반 드롭다운
- Mobile Hamburger Menu
  - Sheet drawer (Radix UI)
  - Accordion 네비게이션
- User Profile Menu
  - Avatar with initials
  - Dropdown 메뉴
- Cart Badge
  - 실시간 아이템 수 표시
  - React Query 기반

**컴포넌트 추가**
- `src/components/landing/MegaMenu.tsx`
- `src/components/landing/MobileMenu.tsx`
- `src/components/landing/UserMenu.tsx`

**UI 컴포넌트 추가**
- `src/components/ui/accordion.tsx` (Radix UI)
- `src/components/ui/sheet.tsx` (Radix UI)
- `src/components/ui/avatar.tsx` (Radix UI)

### ✨ Changed

**Header 컴포넌트**
- 완전 재작성 (hash links → React Router)
- 반응형 네비게이션 (mobile/desktop)
- 인증 기반 메뉴 표시/숨김

**Footer 컴포넌트**
- 5-column 그리드 레이아웃
- React Router 링크로 변경

### 📊 Build Stats

- First Load JS: 245kB → 254kB (+9kB)
- 총 19 routes

### 📝 Documentation

- CLAUDE.md 업데이트 (Navigation Menu Structure 섹션 추가)

---

## [1.0.0] - 2025-10-09

### 🎉 Initial Release

**프로덕션 배포**
- Vercel 배포 성공
- 프로덕션 URL: https://www.ideaonaction.ai/

**기본 구조**
- Vite + React 18 + TypeScript
- React Router DOM 라우팅
- shadcn/ui 통합 (18개 컴포넌트)

**페이지**
- Index (메인 페이지)
- NotFound (404 페이지)

**컴포넌트**
- Header, Hero, Services, Features
- About, Contact, Footer

**인증 시스템**
- Supabase Auth 통합
- OAuth (Google, GitHub, Kakao)

**DevOps**
- GitHub Actions 워크플로우
- Vercel 자동 배포

---

## 변경 로그 포맷

```markdown
## [버전] - YYYY-MM-DD

### Added
- 새로 추가된 기능

### Changed
- 변경된 기능

### Deprecated
- 곧 제거될 기능

### Removed
- 제거된 기능

### Fixed
- 버그 수정

### Security
- 보안 관련 수정
```

---

**참고**:
- 주요 변경 사항만 기록합니다.
- 모든 커밋을 나열하지 않습니다.
- 사용자 관점에서 의미 있는 변경만 포함합니다.
