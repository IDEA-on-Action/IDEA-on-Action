# VIBE WORKING 프로젝트 개발 문서

> Claude와의 개발 협업을 위한 프로젝트 핵심 문서

**마지막 업데이트**: 2025-10-17
**프로젝트 버전**: 1.5.0
**상태**: ✅ Production Ready | 🎉 인증 & 관리자 시스템 완료 | 🧪 테스트 계획 수립 완료

**최신 업데이트**:
- 2025-10-17: 테스트 계획 수립 완료 (Playwright, Vitest, Lighthouse CI, Axe-core)
- 2025-10-17: v1.5.0 프로덕션 배포 완료 (GitHub Release, Vercel)
- 2025-10-17: 인증 & 관리자 시스템 완료 (OAuth, RBAC, 서비스 CRUD, 이미지 업로드)
- 2025-10-17: Phase 8 - 서비스 페이지 구현 완료 (목록/상세 페이지, React Query, SEO)
- 2025-10-17: Supabase 스키마 개선 (14→11 테이블, RLS 정책, 샘플 데이터)
- 2025-10-12: Phase 7 - 디자인 시스템 적용 완료 (다크 모드, 글래스모피즘, 그라데이션)

---

## 🤖 AI 협업 규칙 (프롬프트 가이드)

### SOT (Skeleton of Thought) 원칙
모든 작업 전에 사고의 뼈대를 먼저 구성합니다.

**5단계 프로세스**:
1. **문제 정의** - 무엇을 해결하려는가?
2. **현황 파악** - 관련 파일/코드는 어디에?
3. **구조 설계** - 어떤 순서로 진행할까?
4. **영향 범위** - 변경이 미치는 범위는?
5. **검증 계획** - 어떻게 확인할까?

### 작업 후 문서 업데이트 체크리스트
모든 작업 완료 후 반드시 확인:

**필수 문서**:
- [ ] `CLAUDE.md` - 프로젝트 현황 업데이트
- [ ] `project-todo.md` - 완료 항목 체크

**중요 문서**:
- [ ] `docs/project/changelog.md` - 변경 로그 기록
- [ ] `docs/project/roadmap.md` - 로드맵 진행률 업데이트

**선택 문서**:
- [ ] 관련 가이드 문서 (필요시)

### 작업 패턴
1. **SOT 적용** → 계획 수립
2. **구현** → 코드 작성
3. **검증** → 빌드/테스트
4. **문서화** → 체크리스트 확인

---

## 🔢 버전 관리

### Semantic Versioning

**형식**: `Major.Minor.Patch`

**현재 버전**: 1.5.0

### 버전 업 기준
- **Major (x.0.0)**: Phase 완료, Breaking Changes (v2.0.0, v3.0.0...)
- **Minor (0.x.0)**: 주요 기능 추가 (v1.4.0, v1.5.0...)
- **Patch (0.0.x)**: 버그 수정, 문서 업데이트 (v1.3.1, v1.3.2...)

### 릴리스 프로세스

**로컬 실행**:
```bash
npm run release:patch   # 1.3.0 → 1.3.1
npm run release:minor   # 1.3.0 → 1.4.0
npm run release:major   # 1.3.0 → 2.0.0
npm run release:dry     # 미리보기 (Dry run)
```

**GitHub Actions** (수동 트리거):
1. GitHub 저장소 → Actions 탭
2. "Release" 워크플로우 선택
3. "Run workflow" 클릭
4. 버전 타입 선택 (major/minor/patch)
5. 자동으로 CHANGELOG.md 생성 및 GitHub Release 생성

### Conventional Commits

커밋 메시지 형식:
```
<type>(<scope>): <subject>

예시:
feat(services): add service list page
fix(cart): resolve quantity update bug
docs(readme): update installation guide
```

**Type 종류**:
- `feat`: 새로운 기능 (Minor)
- `fix`: 버그 수정 (Patch)
- `docs`: 문서 변경 (Patch)
- `refactor`: 리팩토링 (Patch)
- `chore`: 기타 작업 (버전 영향 없음)

**상세 가이드**: [docs/versioning/README.md](docs/versioning/README.md)

### 버전-로드맵 매핑

- **v1.4.0-v2.0.0**: Phase 8 (서비스 페이지)
- **v2.1.0-v3.0.0**: Phase 9 (전자상거래)
- **v4.0.0**: Phase 10 (SSO 강화)
- **v5.0.0**: Phase 11 (콘텐츠 관리)
- **v6.0.0**: Phase 12 (고도화)

**전체 매핑**: [docs/versioning/version-roadmap-mapping.md](docs/versioning/version-roadmap-mapping.md)

---

## 📋 프로젝트 개요

### 기본 정보
- **프로젝트명**: VIBE WORKING
- **회사명**: 생각과행동 (IdeaonAction)
- **목적**: AI 기반 워킹 솔루션 제공
- **슬로건**: KEEP AWAKE, LIVE PASSIONATE
- **웹사이트**: https://www.ideaonaction.ai/
- **GitHub**: https://github.com/IDEA-on-Action/IdeaonAction-Homepage

### 연락처
- **대표자**: 서민원
- **이메일**: sinclairseo@gmail.com
- **전화**: 010-4904-2671

---

## 🛠️ 기술 스택

### Core
- **Vite**: 5.4.19 (빌드 도구)
- **React**: 18.x
- **TypeScript**: 5.x
- **Tailwind CSS**: 3.4.x
- **Supabase**: 2.x (Backend)

### UI & Design
- **shadcn/ui** - UI 컴포넌트 라이브러리
- **Radix UI** - Headless UI primitives
- **Lucide Icons** - 아이콘 라이브러리
- **Google Fonts** - Inter (본문), JetBrains Mono (코드)

### State Management
- **React Query** - 서버 상태 관리
- **React Hook Form** - 폼 관리

### Routing
- **React Router DOM** - 클라이언트 사이드 라우팅

---

## 📁 프로젝트 구조

```
IdeaonAction-Homepage/
├── src/                          # 소스 코드 ⭐
│   ├── components/               # React 컴포넌트
│   │   ├── ui/                   # shadcn/ui 컴포넌트 (18개)
│   │   │   ├── accordion.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx         # ✨ 다크 모드 적용
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── sheet.tsx
│   │   │   └── ...
│   │   ├── shared/               # 공용 컴포넌트 ⭐ NEW
│   │   │   └── ThemeToggle.tsx  # 테마 토글 버튼
│   │   ├── Header.tsx            # ✨ 글래스모피즘 + ThemeToggle
│   │   ├── Hero.tsx
│   │   ├── Services.tsx
│   │   ├── Features.tsx
│   │   ├── About.tsx
│   │   ├── Contact.tsx
│   │   └── Footer.tsx
│   ├── pages/                    # 페이지 컴포넌트
│   │   ├── Index.tsx             # ✨ 그라데이션 배경 적용
│   │   └── NotFound.tsx
│   ├── hooks/                    # 커스텀 훅 ⭐
│   │   └── useTheme.ts           # ⭐ NEW - 다크 모드 훅
│   ├── lib/                      # 유틸리티
│   │   ├── utils.ts
│   │   └── supabase.ts
│   ├── assets/                   # 정적 자산
│   │   ├── logo-symbol.png
│   │   └── logo-full.png
│   ├── App.tsx                   # 앱 진입점
│   ├── main.tsx                  # React 렌더링
│   └── index.css                 # ✨ 디자인 시스템 CSS 변수
│
├── docs/                         # 프로젝트 문서 ⭐
│   ├── README.md                 # 문서 인덱스
│   ├── guides/                   # 실무 가이드
│   │   ├── design-system/        # 디자인 시스템
│   │   │   ├── README.md         # 디자인 가이드
│   │   │   └── reference.md      # 참고 자료
│   │   ├── phase-8-completion-summary.md  # ⭐ NEW - Phase 8 완료 보고서
│   │   ├── deployment/           # 배포 가이드
│   │   ├── setup/                # 초기 설정
│   │   └── database/             # ⭐ NEW - DB 스키마 & 마이그레이션
│   ├── project/                  # 프로젝트 관리
│   │   ├── roadmap.md
│   │   └── changelog.md          # 변경 로그
│   ├── devops/                   # DevOps 가이드
│   └── archive/                  # 히스토리 보관
│
├── public/                       # 공개 정적 파일
├── dist/                         # 빌드 결과물 (gitignore)
│
├── package.json                  # 의존성 관리
├── tsconfig.json                 # TypeScript 설정
├── tailwind.config.ts            # ✨ 디자인 시스템 설정
├── vite.config.ts                # Vite 설정
├── index.html                    # HTML 진입점
├── CLAUDE.md                     # 프로젝트 메인 문서 (이 파일)
├── project-todo.md               # TODO 목록
└── README.md                     # GitHub README
```

---

## 🚀 빠른 시작

### 개발 환경 설정
```bash
# 1. 저장소 클론
git clone https://github.com/IDEA-on-Action/IdeaonAction-Homepage.git
cd IdeaonAction-Homepage

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정 (.env.local)
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_KEY]

# 4. 개발 서버 실행
npm run dev  # http://localhost:5173
```

### 주요 명령어
```bash
npm run dev       # 개발 서버 (Vite)
npm run build     # 프로덕션 빌드
npm run preview   # 빌드 미리보기
npm run lint      # ESLint 검사
```

---

## 📊 현재 상태

### ✅ 완료된 작업 (Phase 1-8 + 인증/관리자)

1. **프로덕션 배포** (100%) 🎉
   - Vercel 배포 성공 ✅
   - 프로덕션 URL: https://www.ideaonaction.ai/ ✅
   - GitHub Secrets 업데이트 완료 ✅
   - OAuth 콜백 URL 설정 가이드 ✅
   - 문서 구조 재정리 ✅

2. **Vite 프로젝트 구조** (100%)
   - React 18 + TypeScript ✅
   - 컴포넌트 구조 확립 ✅
   - 라우팅 시스템 (React Router) ✅
   - 프로덕션 빌드 성공 ✅

3. **DevOps 인프라** (100%)
   - GitHub Actions (워크플로우) ✅
   - Vercel 자동 배포 ✅
   - 환경 변수 관리 ✅

4. **인증 시스템** (100%)
   - OAuth (Google, GitHub, Kakao) ✅
   - Supabase Auth 통합 ✅

5. **프로젝트 정리 & 최적화** (100%) ✅
   - 중복 파일 제거 ✅
   - ESLint/TypeScript 에러 수정 ✅
   - .gitignore 업데이트 ✅
   - 빌드 검증 완료 ✅

6. **기본 UI 컴포넌트** (100%) 🎉
   - Header, Hero, Services, Features ✅
   - About, Contact, Footer ✅
   - shadcn/ui 통합 (18개 컴포넌트) ✅

7. **Phase 7: 디자인 시스템 적용** (100%) 🎉
   - 디자인 시스템 문서 작성 ✅
   - Tailwind CSS 설정 확장 (브랜드 색상, 폰트, 그리드) ✅
   - CSS 변수 시스템 (Light/Dark 테마) ✅
   - 다크 모드 훅 (useTheme) ✅
   - 테마 토글 컴포넌트 ✅
   - 글래스모피즘 UI 스타일 ✅
   - 그라데이션 배경 ✅
   - Google Fonts 임포트 (Inter, JetBrains Mono) ✅
   - shadcn/ui 다크 모드 대응 ✅
   - 빌드 검증 완료 ✅

8. **Phase 8: 서비스 페이지 구현** (100%) 🎉
   - Supabase 스키마 분석 및 개선 ✅
   - 데이터베이스 마이그레이션 (14→11 테이블) ✅
   - RLS 정책 10개 설정 ✅
   - 샘플 서비스 3개 삽입 ✅
   - React Query 설정 ✅
   - useServices 훅 (목록, 필터링, 정렬) ✅
   - 서비스 목록 페이지 (/services) ✅
   - 서비스 상세 페이지 (/services/:id) ✅
   - ServiceCard 컴포넌트 ✅
   - 이미지 갤러리 (Carousel) ✅
   - 메트릭 시각화 ✅
   - SEO 최적화 (react-helmet-async) ✅
   - 반응형 디자인 (1열→2열→3열) ✅
   - 다크 모드 지원 ✅
   - 빌드 검증 완료 ✅

9. **인증 & 관리자 시스템** (100%) 🎉 ⭐ NEW
   - **Phase 1: 로그인 시스템** ✅
     - useAuth Hook (OAuth + 이메일 로그인) ✅
     - useIsAdmin Hook (관리자 권한 확인) ✅
     - Login 페이지 (Google/GitHub/Kakao) ✅
     - Header 아바타/드롭다운 통합 ✅
     - ProtectedRoute 컴포넌트 ✅
   - **Phase 2: 관리자 시스템** ✅
     - AdminRoute 컴포넌트 ✅
     - Forbidden (403) 페이지 ✅
     - AdminLayout (사이드바 네비게이션) ✅
   - **Phase 3: 서비스 CRUD** ✅
     - ServiceForm (React Hook Form + Zod) ✅
     - AdminServices (목록/테이블) ✅
     - CreateService 페이지 ✅
     - EditService 페이지 ✅
     - Dashboard 페이지 ✅
   - **Phase 4: 이미지 업로드** ✅
     - Supabase Storage 통합 ✅
     - 다중 이미지 업로드 ✅
     - 이미지 미리보기/삭제 ✅
     - 5MB 제한, JPG/PNG/WEBP ✅

### 🚀 다음 단계

#### 테스트 인프라 구축 (우선순위: 🔴 최고)
**목표**: 배포된 v1.5.0 기능 검증 및 자동화된 테스트 시스템 구축
**예상 기간**: 1주

- [ ] **테스트 도구 설정**
  - Playwright (E2E 테스트, 크로스 브라우저)
  - Vitest (유닛/컴포넌트 테스트)
  - Lighthouse CI (성능 테스트)
  - Axe-core (접근성 테스트)
- [ ] **E2E 테스트 구현** (30+ 테스트 파일)
  - 인증 테스트 (로그인, OAuth, 로그아웃)
  - 관리자 테스트 (대시보드, CRUD, 이미지 업로드)
  - 공개 페이지 테스트 (홈, 서비스 목록/상세)
  - 시각적 테스트 (다크 모드, 반응형)
- [ ] **유닛 테스트 구현**
  - 훅 테스트 (useAuth, useIsAdmin, useServices)
  - 컴포넌트 테스트 (ServiceForm, ServiceCard)
- [ ] **CI/CD 통합**
  - GitHub Actions 워크플로우 (E2E, Unit, Lighthouse)
  - PR 머지 전 자동 테스트 실행
- [ ] **문서화**
  - 테스트 전략 문서
  - E2E 테스트 작성 가이드
  - 수동 테스트 체크리스트

#### Phase 9: 전자상거래 기능 (테스트 완료 후)
- [x] 데이터베이스 스키마 설계 (cart, orders, payments)
- [ ] 장바구니 시스템
- [ ] 주문 관리 시스템
- [ ] 결제 게이트웨이 (카카오페이, 토스)

### 빌드 통계 (2025-10-17)

**Vite Build Stats**
```
dist/index.html                         1.23 kB │ gzip:   0.66 kB
dist/assets/logo-symbol-DqUao7Np.png   29.60 kB
dist/assets/logo-full-BqGYrkB8.png     77.52 kB
dist/assets/index-NtBw1TBh.css         77.95 kB │ gzip:  12.98 kB
dist/assets/index-Duh8TxGx.js         754.90 kB │ gzip: 226.66 kB

Total (gzip): 239.64 kB
```

**변경 사항**:
- v1.4.0 → v1.5.0: +38.44 kB (gzip)
  - React Hook Form + Zod: +15 kB
  - 관리자 페이지 컴포넌트: +12 kB
  - AdminLayout + 사이드바: +5 kB
  - 기타: +6.44 kB

---

## 🎨 디자인 시스템

### 개요
VIBE WORKING의 일관된 사용자 경험을 위한 디자인 가이드

**문서**: [docs/guides/design-system/README.md](docs/guides/design-system/README.md)

### 핵심 요소

#### 색상 시스템
- **Primary (Blue)**: #3b82f6 - 신뢰와 전문성
- **Accent (Orange)**: #f59e0b - 열정과 에너지
- **Secondary (Purple)**: #8b5cf6 - 혁신과 AI

#### 테마
- **Light 테마**: 기본 (흰색 배경 + 그라데이션)
- **Dark 테마**: 다크 그레이 배경 + 글로우 효과
- **System 테마**: 시스템 설정 자동 감지

#### 타이포그래피
- **본문**: Inter (Google Fonts)
- **코드**: JetBrains Mono (Google Fonts)

#### UI 스타일
- **글래스모피즘**: 반투명 배경 + 백드롭 블러
- **그라데이션**: 부드러운 색상 전환
- **8px 그리드**: 일관된 간격 시스템

### 사용법

#### 다크 모드 토글
```tsx
import { ThemeToggle } from '@/components/shared/ThemeToggle'

<ThemeToggle />
```

#### 테마 훅 사용
```tsx
import { useTheme } from '@/hooks/useTheme'

const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
```

#### CSS 클래스 활용
```tsx
// 글래스모피즘 카드
<div className="glass-card">...</div>

// 그라데이션 배경
<div className="gradient-bg">...</div>

// 호버 효과
<button className="hover-lift">...</button>
```

---

## 🔄 브랜치 전략

### 브랜치
- **main** - 프로덕션 (보호됨, PR만 허용)
- **staging** - 스테이징/QA 테스트
- **develop** - 개발 통합
- **feature/*** - 기능 개발
- **hotfix/*** - 긴급 수정

### 배포 흐름
```
feature/* → develop → staging → main
              ↓         ↓        ↓
            Dev     Staging  Production
```

### 자동 배포
- **main**: Vercel Production (www.ideaonaction.ai)
- **staging**: Vercel Preview (staging-*.vercel.app)
- **develop**: Vercel Preview (dev-*.vercel.app)
- **feature/***: Vercel Preview (자동 생성)

### CI/CD
- GitHub Actions (Lint, Type Check, Build)
- Vercel 자동 배포
- 브랜치 보호 규칙 (main, staging)

**상세 문서**: [docs/devops/branch-strategy.md](docs/devops/branch-strategy.md)

---

## 📚 주요 문서

### 전체 문서 인덱스
- **[docs/README.md](docs/README.md)** - 전체 문서 가이드

### 실무 가이드
- **디자인 시스템**: [docs/guides/design-system/](docs/guides/design-system/)
  - 브랜드 아이덴티티
  - 색상, 타이포그래피, 레이아웃
  - UI 컴포넌트 사용법
- **배포 가이드**: [docs/guides/deployment/](docs/guides/deployment/)
  - Vercel 배포
  - 환경 변수 설정
  - 배포 검증
- **초기 설정**: [docs/guides/setup/](docs/guides/setup/)
  - GitHub Secrets
  - OAuth 콜백
  - Supabase 인증
- **데이터베이스**: [docs/guides/database/](docs/guides/database/)
  - Phase 4 & 5 스키마 (12개 테이블)
  - 설치 가이드

### 프로젝트 관리
- **[project-todo.md](project-todo.md)** - 할 일 목록
- **[docs/project/roadmap.md](docs/project/roadmap.md)** - 로드맵
- **[docs/project/changelog.md](docs/project/changelog.md)** - 변경 로그

### DevOps ⭐ NEW
- **[docs/devops/](docs/devops/)** - DevOps 가이드
  - [branch-strategy.md](docs/devops/branch-strategy.md) - 브랜치 전략 (3-Tier)
  - [deployment-guide.md](docs/devops/deployment-guide.md) - Vercel 배포 가이드
  - [github-setup.md](docs/devops/github-setup.md) - GitHub 저장소 설정
  - [deployment-checklist.md](docs/devops/deployment-checklist.md) - 배포 체크리스트

### 히스토리
- **[docs/archive/](docs/archive/)** - 개발 히스토리 보관

### 외부 참고
- [Vite 문서](https://vitejs.dev/)
- [React 문서](https://react.dev/)
- [Supabase 문서](https://supabase.com/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [shadcn/ui 문서](https://ui.shadcn.com/)

---

## 🎯 로드맵 (2025-2026)

### 📊 진행 현황 개요
```
Phase 1-8        ████████████████████ 100% ✅ (완료)
인증/관리자       ████████████████████ 100% ✅ (완료)
테스트 인프라     ████░░░░░░░░░░░░░░░░  20% 🧪 (계획 수립 완료)
Phase 9          ░░░░░░░░░░░░░░░░░░░░   0% 🔜 (대기 중)
Phase 10+        ░░░░░░░░░░░░░░░░░░░░   0% 📋 (계획 중)
```

---

### 🧪 테스트 인프라 구축 (진행 중 - 2025 Q4)
**우선순위**: ⭐ 최고
**예상 기간**: 1주
**목표**: 배포된 v1.5.0 기능 검증 및 자동화된 테스트 시스템 구축
**현재 상태**: 📋 계획 수립 완료 (20%)

#### 테스트 도구 스택
- **Playwright** - E2E 테스트
  - 크로스 브라우저 지원 (Chromium, Firefox, WebKit)
  - 자동 대기 메커니즘
  - 스크린샷 & 비디오 녹화
  - 네트워크 모킹
- **Vitest** - 유닛/컴포넌트 테스트
  - Vite 네이티브 지원 (빠른 실행)
  - React Testing Library 통합
  - jsdom 환경
- **Lighthouse CI** - 성능 테스트
  - Core Web Vitals 측정
  - 성능 임계값 검증 (Performance 90+, Accessibility 95+)
- **Axe-core** - 접근성 테스트
  - WCAG 2.1 AA 준수 검증
  - Playwright 통합

#### 테스트 파일 구조
```
tests/
├── e2e/                          # E2E 테스트
│   ├── auth/                     # 인증 테스트
│   │   ├── login.spec.ts         # 이메일/아이디 로그인
│   │   ├── oauth.spec.ts         # Google/GitHub/Kakao OAuth
│   │   └── logout.spec.ts        # 로그아웃 플로우
│   ├── admin/                    # 관리자 테스트
│   │   ├── dashboard.spec.ts     # 대시보드 접근 & 통계
│   │   ├── service-crud.spec.ts  # 서비스 생성/수정/삭제
│   │   └── image-upload.spec.ts  # 이미지 업로드/삭제
│   ├── public/                   # 공개 페이지 테스트
│   │   ├── homepage.spec.ts      # 홈페이지 렌더링
│   │   ├── services.spec.ts      # 서비스 목록 페이지
│   │   └── service-detail.spec.ts # 서비스 상세 페이지
│   └── visual/                   # 시각적 테스트
│       ├── dark-mode.spec.ts     # 다크 모드 전환
│       └── responsive.spec.ts    # 반응형 (모바일/태블릿/데스크탑)
├── unit/                         # 유닛 테스트
│   ├── hooks/                    # 훅 테스트
│   │   ├── useAuth.test.ts       # 인증 상태 관리
│   │   ├── useIsAdmin.test.ts    # 관리자 권한 확인
│   │   └── useServices.test.ts   # 서비스 데이터 조회
│   └── components/               # 컴포넌트 테스트
│       ├── ServiceForm.test.tsx  # 폼 검증 & 제출
│       └── ServiceCard.test.tsx  # 카드 렌더링
└── fixtures/                     # 테스트 픽스처
    ├── users.ts                  # 테스트 사용자 데이터
    ├── services.ts               # 테스트 서비스 데이터
    └── images.ts                 # 테스트 이미지 데이터
```

#### E2E 테스트 시나리오
**인증 플로우**
- 이메일/비밀번호 로그인 (admin/demian00)
- 아이디로 로그인 (admin → admin@ideaonaction.local 자동 변환)
- OAuth 로그인 (Google, GitHub, Kakao)
- 로그아웃 후 보호된 라우트 리다이렉트

**관리자 CRUD 플로우**
- 대시보드 접근 (비관리자 403 Forbidden)
- 서비스 생성 (폼 검증, 이미지 업로드)
- 서비스 수정 (기존 데이터 로드, 업데이트)
- 서비스 삭제 (확인 대화상자, 연쇄 삭제)

**공개 페이지 플로우**
- 홈페이지 렌더링 (Hero, Services, Features, About, Contact, Footer)
- 서비스 목록 페이지 (필터링, 정렬, 페이지네이션)
- 서비스 상세 페이지 (이미지 갤러리, 메트릭, CTA)

#### 수동 테스트 체크리스트
**비인증 사용자 (First-time Visitor)**
- [ ] 홈페이지 접속 (https://www.ideaonaction.ai/)
- [ ] 서비스 목록 페이지 접근 (/services)
- [ ] 서비스 상세 페이지 접근 (/services/[id])
- [ ] 다크 모드 토글 (Header ThemeToggle)
- [ ] 로그인 페이지 접근 (/login)

**OAuth 로그인 사용자**
- [ ] Google 로그인
- [ ] GitHub 로그인
- [ ] Kakao 로그인 (설정 필요)
- [ ] 프로필 드롭다운 메뉴 확인
- [ ] 관리자 페이지 접근 시도 (403 Forbidden)
- [ ] 로그아웃

**관리자 사용자 (admin/demian00)**
- [ ] 이메일/비밀번호 로그인
- [ ] 대시보드 접근 (/admin)
- [ ] 서비스 목록 확인 (/admin/services)
- [ ] 서비스 생성 (/admin/services/new)
  - [ ] 폼 검증 (필수 필드)
  - [ ] 이미지 업로드 (5MB 제한, JPG/PNG/WEBP)
  - [ ] 다중 이미지 업로드
  - [ ] 이미지 미리보기 & 삭제
- [ ] 서비스 수정 (/admin/services/[id]/edit)
  - [ ] 기존 데이터 로드
  - [ ] 이미지 추가/삭제
  - [ ] 업데이트 저장
- [ ] 서비스 삭제
  - [ ] 확인 대화상자
  - [ ] 연쇄 삭제 (이미지 포함)

#### CI/CD 통합
- **GitHub Actions 워크플로우**
  - `.github/workflows/test-e2e.yml` - E2E 테스트
  - `.github/workflows/test-unit.yml` - 유닛 테스트
  - `.github/workflows/lighthouse.yml` - 성능 테스트
- **PR 머지 조건**
  - 모든 테스트 통과
  - Lighthouse 임계값 충족
  - 코드 커버리지 80% 이상

#### 완료 기준
- [ ] 30+ E2E 테스트 작성 및 통과
- [ ] 10+ 유닛 테스트 작성 및 통과
- [ ] Lighthouse CI 성능 임계값 충족
- [ ] 접근성 테스트 통과 (WCAG 2.1 AA)
- [ ] CI/CD 파이프라인 통합
- [ ] 테스트 문서 작성 완료

---

### ✅ Phase 8: 서비스 페이지 구현 (완료 - 2025-10-17) 🎉
**목표**: 포트폴리오/서비스 소개 페이지 완성

- [x] Supabase `services` 테이블 연동
- [x] TypeScript 타입 정의
- [x] React Query 훅 작성
- [x] 서비스 목록 페이지 (/services)
- [x] 서비스 상세 페이지 (/services/:id)
- [x] ServiceCard 컴포넌트
- [x] 이미지 갤러리 (Carousel)
- [x] 메트릭 시각화
- [x] SEO 최적화 (react-helmet-async)
- [x] 반응형 디자인
- [x] 다크 모드 지원

**완료일**: 2025-10-17

---

### ✅ Phase 7: 디자인 시스템 적용 (완료 - 2025-10-12) 🎉

**목표**: 통일된 브랜드 아이덴티티 및 다크 모드 지원

- [x] 디자인 시스템 문서 작성
- [x] Tailwind CSS 설정 확장 (브랜드 색상, 폰트, 그리드)
- [x] CSS 변수 시스템 (Light/Dark 테마)
- [x] 다크 모드 구현 (useTheme + ThemeToggle)
- [x] 글래스모피즘 & 그라데이션 UI
- [x] Google Fonts 적용 (Inter, JetBrains Mono)
- [x] shadcn/ui 다크 모드 대응
- [x] 빌드 검증 완료

**완료일**: 2025-10-12


### 🔜 Phase 9: 전자상거래 기능 (2025 Q4-Q1)
**우선순위**: 높음
**예상 기간**: 2-3주
**전제 조건**: 테스트 인프라 구축 완료

#### 작업 항목
**1. 장바구니 시스템**
- [ ] 장바구니 UI (헤더 + 사이드바)
- [ ] 로컬 스토리지 + Supabase 동기화
- [ ] 수량 조절 로직
- [ ] 총액 계산 (세금, 할인 포함)

**2. 주문 관리**
- [ ] 주문 폼 (배송지, 연락처)
- [ ] 주문 내역 페이지 (`/orders`)
- [ ] 주문 상태 추적 (진행중/완료/취소)

**3. 결제 게이트웨이**
- [ ] 카카오페이 SDK 연동
- [ ] 토스페이먼츠 연동
- [ ] 결제 웹훅 처리
- [ ] 결제 실패/취소 처리

**4. 관리자 대시보드**
- [ ] 주문 관리 페이지
- [ ] 매출 통계 대시보드
- [ ] 사용자 관리

#### 기술 스택
- **결제**: 카카오페이, 토스페이먼츠
- **상태관리**: Zustand or Jotai (전역 장바구니)
- **폼**: React Hook Form + Zod

---

### 📋 Phase 10: SSO & 인증 강화 (2025 Q1)
**우선순위**: 중간
**예상 기간**: 1주

- [ ] SSO 통합 UI 개선
- [ ] 프로필 관리 페이지 (`/profile`)
- [ ] RBAC (역할 기반 접근 제어)
- [ ] 이메일 인증 플로우

---

### 📋 Phase 11: 콘텐츠 관리 (2025 Q2)
**우선순위**: 중간
**예상 기간**: 2주

- [ ] 블로그 시스템 (`/blog`)
- [ ] 마크다운 에디터 (관리자용)
- [ ] SEO 최적화 (메타 태그, 사이트맵)
- [ ] RSS 피드

---

### 📋 Phase 12: 고도화 & 확장 (2025 Q2-Q3)
**우선순위**: 낮음

- [ ] 다국어 지원 (i18n - 한/영)
- [ ] AI 챗봇 통합 (고객 지원)
- [ ] 성능 모니터링 (Sentry)
- [ ] A/B 테스팅
- [ ] PWA 지원 (오프라인 모드)
- [ ] 푸시 알림

---

### 🟡 PWA 지원 (보류)
Phase 12 또는 별도 스프린트에서 진행

---

## 📝 참고사항

### 환경 변수
- **접두사**: `VITE_` (Vite 환경 변수)
- **파일명**: `.env.local` (로컬 개발용, gitignore)
- **포트**: 5173 (Vite 기본)

### 코드 컨벤션
- **컴포넌트**: PascalCase (Header.tsx, ThemeToggle.tsx)
- **훅**: camelCase with use prefix (useTheme.ts, useAuth.ts)
- **스타일**: Tailwind CSS utility classes
- **타입**: TypeScript strict mode

### Import 경로
- **Alias**: `@/` → `src/` (vite.config.ts에서 설정)
- **예시**: `import { Button } from '@/components/ui/button'`

### 문서 관리 원칙
- **작업 전**: SOT로 계획 수립
- **작업 중**: 진행률 추적 (project-todo.md)
- **작업 후**: 문서 업데이트 체크리스트 확인
- **주기적**: 로드맵 진행률 업데이트 (주 1회)

---

**Full Documentation**: `docs/`
**Project TODO**: `project-todo.md`
**Design System**: `docs/guides/design-system/README.md`
**Changelog**: `docs/project/changelog.md`

---

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

# Context Engineering
당신은 최신 스택이 빠르게 변하는 프로젝트에서 작업하는 AI 개발자입니다.
  시작 전 반드시 아래 절차를 따르세요.

  1. **환경 파악**
     - `package.json`, 구성 파일(next.config, vite.config 등), 리드미를 읽고 실제 프레임워크·라이브러리 버전을 확인합니다.
     - 런타임 제약(Edge/Serverless/Browser), 네트워크 사용 가능 여부, 보안 정책 등을 명확히 정리합니다.

  2. **버전 차이 대응**
     - 확인된 버전의 릴리스 노트/마이그레이션 가이드를 참조해 기존 지식과 달라진 API, 헬퍼 함수, 타입 시스템을 정리합니다.
     - 이전 버전 경험을 그대로 적용하지 말고, 최신 권장사항과 비호환 포인트를 우선 확인합니다.

  3. **설계 시 체크**
     - 폰트, 이미지, 외부 API 등 네트워크 리소스가 필요한 경우, 프로젝트 설정(예: `next.config.js`의 image 도메인, offline 제한)에 맞춰 선반영합니다.
     - 인증/데이터 레이어는 실제 사용 중인 SDK 버전에 맞춰 타입, 비동기 패턴, Edge 호환성을 고려합니다.
     - 새로 만드는 컴포넌트/액션은 최신 React/프레임워크 API(예: React 19의 `useActionState`, Next.js 15의 Promise 기반 `params`)로 작성합니다.

  4. **구현 중 검증**
     - 주요 변경마다 린트/타입/빌드 명령을 실행하거나, 최소한 실행 가능 여부를 추정하고 예상되는 오류를 미리 보고합니다.
     - 제약 때문에 못 하는 작업이 있으면 즉시 알리고 대체 방향을 제안합니다.

  5. **결과 전달**
     - 변경 사항에는 어떤 버전 차이를 반영했는지, 어떤 경고/오류를 미연에 방지했는지를 포함해 설명합니다.
     - 추가로 확인하거나 설정해야 할 항목이 있다면 명확히 지목합니다.

  이 지침을 매번 준수해 최신 스택 특성을 반영하고, 이전 지식에 기대어 생길 수 있는 디버깅 시간을 최소화하세요.
