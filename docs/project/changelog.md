# Changelog

> VIBE WORKING 프로젝트 변경 로그

모든 주요 변경 사항이 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 기반으로 하며,
버전 관리는 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

---

## [1.10.0] - 2025-11-28

### Added
- **Phase 10: SSO & 인증 강화** 🎉
  - **v1.9.0: 프로필 관리**
    - Profile 페이지 (`/profile`) - 프로필 정보 조회/수정
    - `useProfile` 훅 (프로필 CRUD, React Query)
    - `useUploadAvatar` 훅 (아바타 이미지 업로드)
    - `ProfileImageUpload` 컴포넌트 (드래그앤드롭 지원)
    - Supabase Storage 아바타 버킷 연동
  - **v1.10.0: RBAC 강화 & 이메일 인증**
    - `user_profiles` 테이블 (이메일 인증 필드 추가)
    - `user_roles` 테이블 (admin, user, guest)
    - RLS 정책 8개 (프로필/역할 접근 제어)
    - 자동 프로필 생성 트리거 (auth.users → user_profiles)
    - 이메일 인증 플로우 (토큰 기반, 24시간 만료)
    - EmailVerify 페이지 (`/email/verify`)
    - `useVerifyEmail`, `useRequestEmailVerification` 훅

- **라우트**
  - `/profile` - 프로필 설정 페이지
  - `/email/verify` - 이메일 인증 처리 페이지

- **Supabase 마이그레이션**
  - `20251128000004_create_profile_tables.sql`

### Build
- 번들 크기: 254.83 kB (gzip) (+2.93 kB from v1.8.0)

---

## [1.8.0] - 2025-11-28

### Added
- **Phase 9: 결제 연동** 🎉
  - `payments` 테이블 (Supabase)
  - `paymentService.ts` - 결제 준비/승인/취소/환불
  - `usePayments` 훅 (결제 처리, React Query)
  - Payment 페이지 (`/payment`) - 결제 수단 선택
  - PaymentComplete 페이지 (`/payment/complete`) - 결제 완료/실패 처리
  - 카카오페이, 토스페이, Stripe 결제사 지원 (Mock)

- **라우트**
  - `/payment` - 결제 수단 선택 페이지
  - `/payment/complete` - 결제 완료 페이지

- **Supabase 마이그레이션**
  - `20251128000003_create_payment_tables.sql`

### Build
- 번들 크기: 251.90 kB (gzip)

---

## [1.7.0] - 2025-11-28

### Added
- **Phase 9: 주문 관리 시스템** 🎉
  - `orders`, `order_items` 테이블 (Supabase)
  - `useOrders` 훅 (주문 목록/상세/생성/취소)
  - Checkout 페이지 (`/checkout`) - 주문 정보 입력
  - Orders 페이지 (`/orders`) - 주문 내역 조회
  - React Hook Form + Zod 검증

- **라우트**
  - `/checkout` - 결제/주문 페이지
  - `/orders` - 주문 내역 페이지

- **Supabase 마이그레이션**
  - `20251128000002_create_order_tables.sql`

### Build
- 번들 크기: 247.48 kB (gzip)

---

## [1.6.0] - 2025-11-28

### Added
- **Phase 9: 장바구니 시스템** 🎉
  - `carts` 테이블 (Supabase)
  - Zustand 기반 장바구니 상태 관리 (`cartStore.ts`)
  - localStorage 영속화 (persist middleware)
  - CartDrawer 컴포넌트 (Sheet 기반 사이드바)
  - Header 장바구니 버튼 + 배지
  - ServiceDetail "장바구니 담기" 버튼

- **Dependencies**
  - `zustand` (v5.x) - 클라이언트 상태 관리

- **Supabase 마이그레이션**
  - `20251128000001_create_cart_tables.sql`

### Build
- 번들 크기: 226.99 kB (gzip)

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
