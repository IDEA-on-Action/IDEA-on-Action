# Changelog

> VIBE WORKING 프로젝트 변경 로그

모든 주요 변경 사항이 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 기반으로 하며,
버전 관리는 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

---

## [Unreleased] - Phase 11 계획 중

### Planned
- **Phase 11: 콘텐츠 관리 시스템** (계획)
  - 블로그 시스템 (Markdown 에디터)
  - 공지사항 관리
  - SEO 최적화
  - RSS 피드

---

## [1.6.1] - 2025-10-20

### Added
- **Phase 10 Week 2: 2FA & 보안 강화** 🔐
  - **데이터베이스 (Migration 004)**
    - `two_factor_auth` 테이블 (TOTP secret, 백업 코드)
    - `login_attempts` 테이블 (로그인 시도 기록)
    - `account_locks` 테이블 (계정 잠금 관리)
    - `password_reset_tokens` 테이블
    - 헬퍼 함수 5개 (로그인 기록, 계정 잠금, 비밀번호 재설정)
    - 브루트 포스 방지 (5회 실패 → 30분 잠금)
  - **TOTP 라이브러리**
    - `src/lib/auth/totp.ts` (otpauth, qrcode 기반)
    - TOTP secret 생성, QR 코드 생성, 토큰 검증
    - 백업 코드 생성 (10개)
  - **use2FA 훅 (7개)**
    - `use2FASettings`, `useSetup2FA`, `useEnable2FA`, `useDisable2FA`
    - `useRegenerateBackupCodes`, `useVerify2FA`
  - **2FA 페이지**
    - `TwoFactorSetup.tsx` - 4단계 설정 플로우 (QR 코드, 검증, 백업 코드)
    - `TwoFactorVerify.tsx` - 로그인 시 2FA 인증
    - `Profile.tsx` - 2FA 관리 섹션 추가

- **Phase 10 Week 1: OAuth 확장 & 프로필 관리** 👤
  - **데이터베이스 (Migration 003)**
    - `user_profiles` 테이블 확장 (11개 컬럼)
    - `connected_accounts` 테이블
    - `email_verifications` 테이블
  - **Microsoft (Azure AD) OAuth** 통합
  - **Apple OAuth** 통합
  - **useProfile 훅 (5개)**
    - 프로필 CRUD, 아바타 업로드, 연결된 계정 관리
  - **Profile 페이지 완전 재작성**
    - React Hook Form + Zod 검증
    - 아바타 업로드 다이얼로그

- **Phase 9 Week 3: 결제 게이트웨이** 💳
  - **Kakao Pay REST API 연동**
    - `src/lib/payments/kakao-pay.ts`
  - **Toss Payments SDK 연동**
    - `src/lib/payments/toss-payments.ts`
    - `@tosspayments/payment-sdk` 통합
  - **usePayment 훅 (3개)**
    - 결제 시작, 승인, 취소
  - **결제 페이지**
    - `Payment.tsx`, `PaymentSuccess.tsx`, `PaymentFail.tsx`
    - `PaymentMethodSelector`, `PaymentStatus` 컴포넌트
  - **관리자 주문 관리 강화**
    - `AdminOrders` 페이지 (필터링, 정렬, 상태 업데이트)
  - **관리자 대시보드 통계**
    - Recharts 통합 (일별 매출 차트, 결제 수단 분포)

### Changed
- **빌드 크기 증가**
  - v1.5.0 → v1.6.1: +171.29 kB (gzip)
  - Phase 9 Week 3 (결제): +72 kB
  - Phase 10 Week 2 (2FA): +74 kB
  - Recharts (대시보드): +30 kB

### Security
- **브루트 포스 방지** - 5회 실패 시 30분 자동 잠금
- **로그인 시도 기록** - IP, User-Agent, 성공/실패 여부
- **2FA (TOTP)** - Google Authenticator 호환
- **백업 코드** - 10개 일회용 코드 (기기 분실 시)
- **비밀번호 재설정** - 1시간 유효 토큰

---

## [1.5.1] - 2025-10-18

### Added
- **테스트 인프라 구축** (90% 완료) 🧪
  - **E2E 테스트 (60개)**
    - 관리자 테스트: `dashboard.spec.ts` (7개, 100% 통과), `service-crud.spec.ts` (15개), `image-upload.spec.ts` (12개)
    - 공개 페이지: `homepage.spec.ts` (12개, 91.7% 통과), `login.spec.ts` (7개), `services.spec.ts` (11개)
  - **시각적 회귀 테스트 (28개)**
    - `dark-mode.spec.ts` (8개, 87.5% 통과)
    - `responsive.spec.ts` (20개, 65% 통과)
  - **유닛 테스트 (34개, 100% 통과)** ⭐ UPDATED
    - `useAuth.test.ts` (8개 테스트)
    - `useServices.test.tsx` (7개 테스트)
    - `useIsAdmin.test.tsx` (5개 테스트) ✅ NEW
    - `ServiceForm.test.tsx` (8개 테스트) ✅ NEW
    - `ServiceCard.test.tsx` (9개 테스트) ✅ NEW
  - **Lighthouse CI 설정** ✅ NEW
    - `lighthouserc.json` 설정 (Performance 90+, Accessibility 95+, Best Practices 90+, SEO 90+)
    - NPM 스크립트 추가 (`lighthouse`, `lighthouse:collect`, `lighthouse:assert`, `lighthouse:upload`)
  - **CI/CD 통합** ✅ NEW
    - `.github/workflows/test-e2e.yml` - Playwright E2E 테스트 자동화
    - `.github/workflows/test-unit.yml` - Vitest 유닛 테스트 + 커버리지
    - `.github/workflows/lighthouse.yml` - Lighthouse CI 성능 테스트
    - PR 코멘트로 테스트 결과 전달 (커버리지, 성능 스코어)
  - **테스트 인프라**
    - 인증 헬퍼 함수 (`loginAsAdmin`, `loginAsRegularUser`)
    - 테스트 픽스처 (`users.ts`, `services.ts`, `images.ts`)
    - Playwright 설정 업데이트 (포트 8080-8083, webServer 통합)
  - **테스트 문서 (5개)** ⭐ UPDATED
    - `docs/guides/testing/test-user-setup.md` - 테스트 사용자 설정 가이드
    - `docs/guides/testing/quick-start.md` - 빠른 시작 가이드
    - `docs/guides/testing/lighthouse-ci.md` - Lighthouse CI 가이드 ✅ NEW
    - `docs/guides/testing/ci-cd-integration.md` - CI/CD 통합 가이드 ✅ NEW
    - `docs/devops/branch-protection-guide.md` - 브랜치 보호 설정 가이드 ✅ NEW

- **접근성 개선**
  - Footer 소셜 링크 aria-label 추가 (GitHub, LinkedIn, Email)
  - Contact 연락처 링크 aria-label 추가 (Email, Phone, Website)
  - 아이콘 aria-hidden 설정

- **개발 도구**
  - `repomix.config.json` - 코드베이스 분석 설정
  - Sub-agent 스크립트 4개 (runner, templates, batch, powershell)
  - 컴포넌트 문서 6개 (Features, Footer, Header, Hero, Services, README)

- **파비콘 시스템**
  - 다양한 크기 파비콘 (16x16, 32x32, 192x192, 512x512)
  - Apple touch icon
  - site.webmanifest

### Changed
- 다크 모드 테스트 패턴 개선 (단순 토글 → 드롭다운 메뉴 인터랙션)
- Playwright baseURL 설정 (production → localhost:8080)
- 테마 토글 컴포넌트 인터랙션 방식 변경

### Test Statistics
- **총 테스트**: 103개 작성 | 59개 검증
- **전체 통과율**: 78%
- **E2E**: 60개 (16개 검증, 81% 통과)
- **시각적**: 28개 (28개 검증, 75% 통과)
- **유닛**: 15개 (15개 검증, 100% 통과)

---

## [1.5.0] - 2025-10-17

### Added
- **인증 & 관리자 시스템** 🎉
  - **Phase 1: 로그인 시스템**
    - `useAuth` Hook (OAuth + 이메일 로그인, 세션 관리)
    - `useIsAdmin` Hook (관리자 권한 확인, React Query 캐싱)
    - Login 페이지 (Google/GitHub/Kakao OAuth)
    - 관리자 계정 지원 (`admin` / `demian00`)
    - Header 아바타/드롭다운 통합
    - ProtectedRoute 컴포넌트 (로그인 필수)
  - **Phase 2: 관리자 시스템**
    - AdminRoute 컴포넌트 (관리자 전용)
    - Forbidden (403) 페이지
    - AdminLayout (사이드바 네비게이션)
  - **Phase 3: 서비스 CRUD**
    - ServiceForm (React Hook Form + Zod 검증)
    - AdminServices 페이지 (목록/테이블, 검색, 필터)
    - CreateService 페이지 (서비스 등록)
    - EditService 페이지 (서비스 수정)
    - Dashboard 페이지 (통계, 최근 서비스)
  - **Phase 4: 이미지 업로드**
    - Supabase Storage 통합
    - 다중 이미지 업로드 (5MB 제한)
    - 이미지 미리보기 및 삭제
    - JPG/PNG/WEBP 지원

- **의존성**
  - `react-hook-form`: 폼 관리
  - `zod`: 스키마 검증
  - `@hookform/resolvers`: RHF + Zod 통합

- **설정 가이드**
  - [docs/guides/storage/setup.md](../guides/storage/setup.md) - Supabase Storage 설정
  - [docs/guides/auth/oauth-setup.md](../guides/auth/oauth-setup.md) - OAuth 설정
  - [docs/guides/auth/admin-setup.md](../guides/auth/admin-setup.md) - 관리자 계정 설정

- **라우트**
  - `/login` - 로그인 페이지
  - `/forbidden` - 403 권한 없음
  - `/admin` - 관리자 대시보드
  - `/admin/services` - 서비스 관리
  - `/admin/services/new` - 서비스 등록
  - `/admin/services/:id/edit` - 서비스 수정

### Changed
- Header: "시작하기" 버튼 → 로그인 상태에 따라 아바타/드롭다운 표시
- Login 입력: `type="email"` → `type="text"` (admin 계정 지원)
- 이메일 자동 변환: `admin` → `admin@ideaonaction.local`

### Fixed
- admin 계정 로그인 시 이메일 형식 검증 오류 수정

### Documentation
- AUTHENTICATION-SUMMARY.md - 인증 시스템 완료 보고서

### Build
- 번들 크기: 226.66 kB (gzip) (+38.44 kB from v1.4.0)

---

## [1.4.0] - 2025-10-17

### Added
- **Phase 8: 서비스 페이지 구현** 🎉
  - 서비스 목록 페이지 (`/services`)
  - 서비스 상세 페이지 (`/services/:id`)
  - ServiceCard 컴포넌트 (글래스모피즘, 호버 효과)
  - React Query 통합 (서버 상태 관리)
  - useServices 훅 (목록 조회, 필터링, 정렬)
  - useServiceDetail 훅 (상세 조회)
  - useServiceCategories 훅 (카테고리 목록)
  - useServiceCounts 훅 (카테고리별 개수)
  - 카테고리 필터링 UI (Tabs)
  - 정렬 기능 (최신순, 가격순, 인기순)
  - 이미지 갤러리 (Carousel 컴포넌트)
  - 메트릭 시각화 (사용자 수, 만족도, ROI)
  - SEO 최적화 (react-helmet-async)
  - 반응형 그리드 레이아웃 (1열→2열→3열)
  - 로딩 스켈레톤 UI
  - 빈 상태 처리
  - 에러 상태 처리

- **Supabase 데이터베이스 개선**
  - 스키마 분석 및 마이그레이션 (14→11 테이블)
  - `post_tags` 테이블 제거 (중복)
  - `services` 테이블 완전한 구조 (11개 컬럼)
  - `service_categories` 개선 (icon, is_active 추가)
  - RLS (Row Level Security) 정책 10개 설정
  - 인덱스 최적화 (category_id, status, created_at)
  - 샘플 서비스 3개 삽입 (AI 도구, 데이터 분석, 컨설팅)
  - Phase 9-10 테이블 검증 및 보강
  - 자동 updated_at 트리거

- **타입 정의**
  - `src/types/database.ts` - 전체 Supabase 스키마 타입
  - INSERT/UPDATE 헬퍼 타입
  - JOIN용 확장 타입 (ServiceWithCategory, OrderWithItems 등)

- **문서**
  - `docs/database/` - 데이터베이스 문서 (8개 파일)
  - `docs/database/migration-guide.md` - 마이그레이션 가이드
  - `docs/database/schema-analysis-report.md` - 스키마 분석
  - `docs/database/SCHEMA-IMPROVEMENT-SUMMARY.md` - 개선 요약
  - `docs/guides/phase-8-completion-summary.md` - Phase 8 완료 보고서
  - `scripts/extract-schema.js` - 스키마 자동 추출 스크립트

- **Dependencies**
  - `react-helmet-async` (v2.x) - SEO 메타 태그 관리

### Changed
- **Header 컴포넌트**
  - 로고 영역을 Link로 변경 (홈으로 이동)
  - "서비스" 메뉴 추가
  - "시작하기" 버튼이 /services로 이동
  - 홈페이지 여부에 따라 앵커/Link 동적 전환

- **App.tsx**
  - HelmetProvider 추가 (SEO)
  - `/services` 라우트 추가
  - `/services/:id` 동적 라우트 추가

- **빌드 크기**
  - CSS: 70.13 kB → 74.57 kB (+4.44 kB)
  - JS: 374.71 kB → 617.86 kB (+243.15 kB, gzip: +70.61 kB)
  - Total (gzip): 130.11 kB → 201.20 kB (+71.09 kB)

### Fixed
- Supabase 클라이언트 import 경로 수정 (`@/lib/supabase` → `@/integrations/supabase/client`)

---

## [1.3.0] - 2025-10-12

### Added
- **Phase 7: 디자인 시스템 적용** 🎉
  - 디자인 시스템 문서 (`docs/guides/design-system/README.md`)
  - Tailwind CSS 브랜드 색상 (Primary, Accent, Secondary)
  - CSS 변수 시스템 (Light/Dark 테마)
  - 다크 모드 훅 (`useTheme`)
  - 테마 토글 컴포넌트 (`ThemeToggle`)
  - 글래스모피즘 스타일 (`glass-card`)
  - 그라데이션 배경 (`gradient-bg`)
  - 호버 효과 (`hover-lift`)
  - Google Fonts 통합 (Inter, JetBrains Mono)
  - 8px 그리드 시스템
  - shadcn/ui 다크 모드 대응

### Changed
- Header에 ThemeToggle 추가
- Index 페이지에 그라데이션 배경 적용
- 모든 Card 컴포넌트에 glass-card 스타일 적용

---

## [1.2.0] - 2025-10-11

### Added
- **기본 UI 컴포넌트**
  - Header, Hero, Services, Features
  - About, Contact, Footer
  - shadcn/ui 통합 (18개 컴포넌트)

### Changed
- ESLint 에러 수정
- TypeScript 타입 에러 수정

### Removed
- 중복 파일 제거
- .gitignore 업데이트 (불필요한 파일 제외)

---

## [1.1.0] - 2025-10-10

### Added
- **OAuth 인증 시스템**
  - Google OAuth
  - GitHub OAuth
  - Kakao OAuth
  - Supabase Auth 통합

### Added
- **DevOps 인프라**
  - GitHub Actions 워크플로우 (7개)
  - Vercel 자동 배포
  - 브랜치 전략 (main/staging/develop)
  - 환경 변수 관리

---

## [1.0.0] - 2025-10-09

### Added
- **프로덕션 배포** 🎉
  - Vercel 배포 성공
  - 프로덕션 URL: https://www.ideaonaction.ai/
  - React 18 + TypeScript 프로젝트 구조
  - Vite 빌드 시스템

### Added
- **프로젝트 초기 설정**
  - GitHub 저장소 생성
  - Supabase 프로젝트 연결
  - 기본 로고 및 브랜딩

---

## Version Format

```
MAJOR.MINOR.PATCH

MAJOR: Phase 완료, Breaking Changes (2.0.0, 3.0.0...)
MINOR: 주요 기능 추가 (1.1.0, 1.2.0...)
PATCH: 버그 수정, 문서 업데이트 (1.0.1, 1.0.2...)
```

---

## Related Documents

- [Roadmap](./roadmap.md) - 프로젝트 로드맵
- [Versioning Guide](../versioning/README.md) - 버전 관리 가이드
- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 메인 문서
