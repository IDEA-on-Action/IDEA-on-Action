# VIBE WORKING 프로젝트 개발 문서

> Claude와의 개발 협업을 위한 프로젝트 핵심 문서

**마지막 업데이트**: 2025-10-20
**프로젝트 버전**: 1.6.1
**상태**: ✅ Production Ready | 🔐 인증 강화 완료 (Phase 10 Week 2)

**최신 업데이트**:
- 2025-10-20: **Phase 10 Week 2 완료** - 2FA & 보안 강화 (TOTP, 백업 코드, 브루트 포스 방지)
- 2025-10-20: **Phase 9 Week 3 완료** - 결제 게이트웨이 통합 (Kakao Pay, Toss Payments)
- 2025-10-20: **Phase 10 Week 1 완료** - OAuth 확장 (Microsoft, Apple) + 프로필 관리
- 2025-10-18: **Phase 9 Week 1-2 완료** - 전자상거래 시스템 (장바구니, 주문)
- 2025-10-18: **CI/CD 통합 완료** - GitHub Actions 워크플로우 3개 추가 (E2E, Unit, Lighthouse)
- 2025-10-18: **테스트 인프라 구축** - E2E 60개, 유닛 34개, 시각적 회귀 28개
- 2025-10-17: v1.5.0 프로덕션 배포 완료 (GitHub Release, Vercel)

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

**현재 버전**: 1.6.1
**형식**: Major.Minor.Patch

### 버전 업 기준
- **Major**: Phase 완료, Breaking Changes
- **Minor**: 주요 기능 추가
- **Patch**: 버그 수정, 문서 업데이트

### 릴리스
```bash
npm run release:patch  # 패치 버전
npm run release:minor  # 마이너 버전
npm run release:major  # 메이저 버전
```

**상세 가이드**: [docs/versioning/README.md](docs/versioning/README.md) | [아카이브 섹션](docs/archive/CLAUDE-sections-2025-10-18.md#버전-관리-상세)

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
├── src/                # 소스 코드
│   ├── components/     # React 컴포넌트
│   ├── pages/          # 페이지 (Index, ServiceList, Admin...)
│   ├── hooks/          # 커스텀 훅 (useAuth, useTheme...)
│   └── lib/            # 유틸리티
├── docs/               # 프로젝트 문서
│   ├── guides/         # 실무 가이드
│   ├── project/        # 로드맵, 변경 로그
│   └── archive/        # 히스토리 보관
├── tests/              # 테스트 (E2E 60개, Visual 28개, Unit 15개)
│   ├── e2e/            # E2E 테스트
│   ├── unit/           # 유닛 테스트
│   └── fixtures/       # 테스트 데이터
├── scripts/            # 개발 스크립트
└── public/             # 정적 파일
```

**상세 구조**: [docs/guides/project-structure.md](docs/guides/project-structure.md) | [아카이브 섹션](docs/archive/CLAUDE-sections-2025-10-18.md#프로젝트-구조-전체)

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

9. **인증 & 관리자 시스템** (100%) 🎉
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

10. **테스트 인프라 구축** (90%) 🧪 ⭐ UPDATED
    - **테스트 도구 설정** ✅
      - Playwright (5 브라우저, 스크린샷/비디오) ✅
      - Vitest (@vitejs/plugin-react-swc, jsdom) ✅
      - Axe-core (접근성 테스트 통합) ✅
      - **Lighthouse CI** (성능 테스트 자동화) ✅ NEW
    - **E2E 테스트** (60개 작성, 16개 검증) ✅
      - homepage.spec.ts (12개, 91.7% 통과) ✅
      - login.spec.ts (7개) ✅
      - services.spec.ts (11개) ✅
      - admin/dashboard.spec.ts (7개, 100% 통과) ✅
      - admin/service-crud.spec.ts (15개, 일부 검증) ✅
      - admin/image-upload.spec.ts (12개, 작성 완료) ✅
    - **시각적 회귀 테스트** (28개 작성, 28개 검증) ✅
      - dark-mode.spec.ts (8개, 87.5% 통과) ✅
      - responsive.spec.ts (20개, 65% 통과) ✅
    - **유닛 테스트** (34개 작성, 100% 통과) ✅ UPDATED
      - useAuth.test.ts (8개 테스트) ✅
      - useServices.test.tsx (7개 테스트) ✅
      - **useIsAdmin.test.tsx** (5개 테스트) ✅ NEW
      - **ServiceForm.test.tsx** (8개 테스트) ✅ NEW
      - **ServiceCard.test.tsx** (9개 테스트) ✅ NEW
    - **CI/CD 통합** ✅ NEW
      - **test-e2e.yml** (Playwright 자동화) ✅
      - **test-unit.yml** (Vitest + 커버리지) ✅
      - **lighthouse.yml** (성능 테스트) ✅
      - **branch-protection-guide.md** (브랜치 보호) ✅
      - **ci-cd-integration.md** (전체 가이드) ✅
    - **테스트 인프라** ✅
      - 인증 헬퍼 함수 (loginAsAdmin, loginAsRegularUser) ✅
      - 테스트 픽스처 (users, services, images) ✅
      - Playwright 설정 (포트 8080-8083, webServer) ✅
      - 테스트 가이드 문서 5개 (setup, quick-start, lighthouse-ci, ci-cd-integration) ✅
    - **접근성 개선** ✅
      - Footer/Contact aria-label 추가 ✅
      - 아이콘 aria-hidden 설정 ✅

10. **Phase 9: 전자상거래 시스템** (100%) 🎉 ⭐ NEW
    - **Week 1: 장바구니 시스템** ✅
      - Zustand 상태 관리 (cartStore)
      - useCart 훅 (5개 함수)
      - Cart UI 컴포넌트 (CartButton, CartDrawer, CartItem, CartSummary)
    - **Week 2: 주문 관리** ✅
      - useOrders 훅 (6개 함수)
      - Checkout, Orders, OrderDetail 페이지
      - 관리자 주문 관리 (필터링, 상태 업데이트)
    - **Week 3: 결제 게이트웨이** ✅
      - Kakao Pay REST API 통합
      - Toss Payments SDK 통합
      - Payment, PaymentSuccess, PaymentFail 페이지
      - usePayment 훅

11. **Phase 10: SSO & 인증 강화** (67%) 🔐 ⭐ NEW
    - **Week 1: OAuth 확장 & 프로필** ✅
      - Microsoft (Azure AD) OAuth
      - Apple OAuth
      - useProfile 훅 (프로필 CRUD, 아바타 업로드)
      - Profile 페이지 (연결된 계정 관리)
    - **Week 2: 2FA & 보안** ✅
      - TOTP 라이브러리 (otpauth, qrcode)
      - use2FA 훅 (7개 함수)
      - TwoFactorSetup, TwoFactorVerify 페이지
      - 백업 코드 시스템
      - 브루트 포스 방지 (5회 실패 → 30분 잠금)
      - 로그인 시도 기록, 계정 잠금, 비밀번호 재설정
    - **Week 3: RBAC & 감사 로그** (예정)

### 🚀 다음 단계

#### Phase 10 Week 3: RBAC & 감사 로그 (선택 사항)
**예상 기간**: 1주
- [ ] 역할 기반 접근 제어 (RBAC)
- [ ] 감사 로그 시스템 (사용자 활동 추적)
- [ ] 세션 관리 (디바이스별 세션 목록/종료)

#### Phase 11: 콘텐츠 관리 시스템 (계획)
**예상 기간**: 2주
- [ ] 블로그 시스템 (Markdown 에디터)
- [ ] 공지사항 관리
- [ ] SEO 최적화
- [ ] RSS 피드

#### 테스트 인프라 (백로그)
**남은 작업** (10%):
- [ ] Responsive 테스트 수정 (셀렉터 개선)
- [ ] 추가 컴포넌트 유닛 테스트 (Hero, Features, Services)
- [ ] 테스트 전략 문서 (testing-strategy.md)
- [ ] Manual 테스트 체크리스트

### 빌드 통계 (2025-10-20)

**Vite Build Stats**
```
dist/index.html                         1.54 kB │ gzip:   0.75 kB
dist/assets/logo-symbol-DqUao7Np.png   29.60 kB
dist/assets/logo-full-BqGYrkB8.png     77.52 kB
dist/assets/index-BrTg-w0S.css         82.64 kB │ gzip:  13.62 kB
dist/assets/index-zf8ZkRlI.js       1,388.73 kB │ gzip: 409.47 kB

Total (gzip): 423.84 kB
```

**변경 사항**:
- v1.5.0 → v1.6.1: +171.29 kB (gzip)
  - Phase 9 Week 3 (결제): +72 kB (Toss Payments SDK, Kakao Pay)
  - Phase 10 Week 1 (OAuth): +25 kB
  - Phase 10 Week 2 (2FA): +74 kB (otpauth, qrcode)
  - Recharts (대시보드): +30 kB
  - 기타: -29.71 kB (최적화)

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

### ✅ 완료된 Phase (1-8)

- **Phase 1-6**: 기본 인프라, UI 컴포넌트 (2025-10-09 ~ 2025-10-11)
- **Phase 7**: 디자인 시스템 적용 (2025-10-12)
- **Phase 8**: 서비스 페이지 구현 (2025-10-17)
- **인증/관리자**: 로그인, CRUD, 이미지 업로드 (2025-10-17)

**상세 내역**: [docs/archive/completed-phases-2025-10-18.md](docs/archive/completed-phases-2025-10-18.md)


### 🔜 다음 Phase

**Phase 9**: 전자상거래 (장바구니, 주문, 결제) - 2025 Q4-Q1
**Phase 10**: SSO & 인증 강화 - 2025 Q1
**Phase 11**: 콘텐츠 관리 (블로그, CMS) - 2025 Q2
**Phase 12**: 고도화 (i18n, AI, PWA) - 2025 Q2-Q3

**전체 로드맵**: [docs/project/roadmap.md](docs/project/roadmap.md)

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
