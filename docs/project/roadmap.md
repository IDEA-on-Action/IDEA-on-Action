# VIBE WORKING 프로젝트 로드맵

> 2025-2026 장기 개발 계획 및 마일스톤

**작성일**: 2025-11-28
**버전**: 1.10.0
**관리자**: 서민원 (sinclairseo@gmail.com)

---

## 📊 전체 진행 현황

```
Phase 1-8  ████████████████████ 100% ✅ (완료)
Phase 9    ████████████████████ 100% ✅ (v1.6.0~v1.8.0 완료)
Phase 10   ████████████████████ 100% ✅ (v1.9.0~v1.10.0 완료)
Phase 11   ░░░░░░░░░░░░░░░░░░░░   0% 🚀 (v1.11.0~v1.12.0)
Phase 12   ░░░░░░░░░░░░░░░░░░░░   0% 📋 (v2.0.0~, 안정화 후)
```

**총 진행률**: 83% (Phase 10/12 완료)
**다음 단계**: Phase 11 - 콘텐츠 관리

---

## 🎯 Phase별 상세 계획

### ✅ Phase 1-7: 완료된 단계 (2025 Q3-Q4)

#### Phase 1: 프로덕션 배포 (완료 - 2025-10-09)
- ✅ Vercel 배포 완료
- ✅ 프로덕션 URL: https://www.ideaonaction.ai/
- ✅ 환경 변수 설정 및 검증
- ✅ CI/CD 파이프라인 구축

#### Phase 2: Vite 프로젝트 구조 (완료 - 2025-10-09)
- ✅ React 18 + TypeScript 설정
- ✅ 컴포넌트 아키텍처 수립
- ✅ React Router 라우팅 시스템
- ✅ 프로덕션 빌드 최적화

#### Phase 3: DevOps 인프라 (완료 - 2025-10-09)
- ✅ GitHub Actions 워크플로우 (7개)
- ✅ Vercel 자동 배포
- ✅ 브랜치 전략 (main/staging/develop)
- ✅ 환경 변수 관리 체계

#### Phase 4: 인증 시스템 (완료 - 2025-10-09)
- ✅ OAuth 통합 (Google, GitHub, Kakao)
- ✅ Supabase Auth 연동
- ✅ 세션 관리 및 보안

#### Phase 5: 프로젝트 정리 (완료 - 2025-10-11)
- ✅ 중복 파일 제거
- ✅ ESLint/TypeScript 에러 수정
- ✅ .gitignore 최적화
- ✅ 빌드 검증 완료

#### Phase 6: 기본 UI 컴포넌트 (완료 - 2025-10-11)
- ✅ Header, Hero, Services, Features
- ✅ About, Contact, Footer
- ✅ shadcn/ui 통합 (18개 컴포넌트)
- ✅ 네비게이션 메뉴 시스템

#### Phase 7: 디자인 시스템 적용 (완료 - 2025-10-12) 🎉
- ✅ 디자인 시스템 문서 작성
- ✅ Tailwind CSS 확장 (브랜드 색상, 폰트, 그리드)
- ✅ CSS 변수 시스템 (Light/Dark 테마)
- ✅ 다크 모드 구현 (useTheme + ThemeToggle)
- ✅ 글래스모피즘 & 그라데이션 UI
- ✅ Google Fonts 적용 (Inter, JetBrains Mono)
- ✅ shadcn/ui 다크 모드 대응

**완료일**: 2025-10-12
**빌드 크기**: 130.11 kB (gzip)

---

### ✅ Phase 8: 서비스 페이지 구현 (완료 - 2025-10-17) 🎉

**우선순위**: ⭐ 최고
**실제 기간**: 1일
**시작일**: 2025-10-17
**완료일**: 2025-10-17
**목표**: 포트폴리오/서비스 소개 페이지 완성

#### 완료된 작업 항목

**1. 데이터 레이어 구축** ✅
- [x] Supabase 스키마 분석 및 개선 (14→11 테이블)
- [x] 데이터베이스 마이그레이션 실행
- [x] TypeScript 타입 정의 (`src/types/database.ts`)
  ```typescript
  interface Service {
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    images: string[];
    metrics: ServiceMetrics;
  }
  ```
- [x] React Query 훅 작성 (`src/hooks/useServices.ts`)
  - `useServices(filters?)` - 서비스 목록 조회 ✅
  - `useServiceDetail(id)` - 서비스 상세 조회 ✅
  - `useServiceCategories()` - 카테고리 조회 ✅
  - `useServiceCounts()` - 카테고리별 서비스 개수 ✅
- [x] RLS 정책 10개 설정 ✅
- [x] 샘플 서비스 3개 삽입 ✅

**2. 서비스 목록 페이지 (`/services`)** ✅
- [x] React Router 라우트 추가
- [x] 페이지 컴포넌트 생성 (`src/pages/Services.tsx`)
- [x] 그리드 레이아웃 (CSS Grid, 반응형)
  - Mobile: 1열 ✅
  - Tablet: 2열 ✅
  - Desktop: 3열 ✅
- [x] 카테고리 필터링 UI (Tabs)
- [x] 정렬 기능 (최신순, 인기순, 가격순)
- [x] 로딩 스켈레톤 UI (shadcn/ui Skeleton)
- [x] 에러 상태 처리 (Alert)
- [x] 빈 상태 처리

**3. 서비스 상세 페이지 (`/services/:id`)** ✅
- [x] 동적 라우팅 설정 (`/services/:id`)
- [x] 페이지 컴포넌트 생성 (`src/pages/ServiceDetail.tsx`)
- [x] 상세 정보 섹션 (제목, 설명, 가격, 카테고리)
- [x] 이미지 갤러리 컴포넌트 (Carousel)
- [x] 메트릭 시각화 (사용자 수, 만족도, ROI)
- [x] CTA 버튼
  - "문의하기" → Contact 페이지 ✅
  - "구매하기" → 준비 (Phase 9)
- [x] SEO 최적화 (react-helmet-async)

**4. 관리자 기능 (선택 사항)** → Phase 10으로 이동
- [ ] 서비스 CRUD 대시보드 (`/admin/services`)
- [ ] 이미지 업로드 (Supabase Storage)
- [ ] 갤러리 관리

#### 사용된 기술 스택

**라우팅**
- React Router v6 ✅
- 동적 라우팅 (`useParams`) ✅

**데이터 페칭**
- React Query v5 (서버 상태 관리) ✅
- Supabase Client (PostgreSQL) ✅

**UI 컴포넌트**
- Card, Badge, Tabs, Select ✅
- Skeleton (로딩 상태) ✅
- Alert (에러 상태) ✅
- Carousel (이미지 갤러리) ✅

**SEO**
- react-helmet-async ✅

**반응형 디자인**
- Tailwind CSS Breakpoints ✅
  - md: 768px (Tablet)
  - lg: 1024px (Desktop)

#### 완료 기준 (DoD) - 모두 달성 ✅
- [x] `/services` 접근 가능 (404 없음)
- [x] 최소 3개 샘플 서비스 표시
- [x] 다크 모드 완벽 지원
- [x] 모바일/태블릿/데스크탑 반응형
- [x] 빌드 에러 0개

#### 성과
- ✅ 1일 만에 완료 (예상: 1-2주)
- ✅ 빌드 크기: 201.20 kB (gzip)
- ✅ 샘플 데이터로 즉시 테스트 가능
- ✅ 완전한 타입 안정성 (TypeScript)

**완료 문서**: [docs/guides/phase-8-completion-summary.md](../guides/phase-8-completion-summary.md)

---

### ✅ Phase 9: 전자상거래 기능 (완료 - 2025-11-28) 🎉

**우선순위**: 높음
**버전**: v1.6.0 → v1.8.0
**완료일**: 2025-11-28

#### 완료된 작업 항목

**1. 장바구니 시스템** ✅
- [x] Zustand 기반 장바구니 상태 관리 (`cartStore.ts`)
- [x] localStorage 영속화 (persist middleware)
- [x] CartDrawer 컴포넌트 (Sheet 기반 사이드바)
- [x] Header 장바구니 버튼 + 배지
- [x] 수량 조절 로직 (증가/감소/삭제)
- [x] 총액 계산

**2. 주문 관리** ✅
- [x] `useOrders` 훅 (주문 목록/상세/생성/취소)
- [x] Checkout 페이지 (`/checkout`) - 주문 정보 입력
- [x] Orders 페이지 (`/orders`) - 주문 내역 조회
- [x] React Hook Form + Zod 검증
- [x] 주문 상태 추적 (pending → processing → completed)

**3. 결제 시스템** ✅
- [x] `usePayments` 훅 (결제 처리)
- [x] Payment 페이지 (`/payment`) - 결제 수단 선택
- [x] PaymentComplete 페이지 (`/payment/complete`) - 결제 완료/실패 처리
- [x] 카카오페이, 토스페이, Stripe 결제사 지원 (Mock)

**4. 데이터베이스** ✅
- [x] `carts` 테이블 마이그레이션
- [x] `orders`, `order_items` 테이블 마이그레이션
- [x] `payments` 테이블 마이그레이션

---

### ✅ Phase 10: SSO & 인증 강화 (완료 - 2025-11-28) 🎉

**우선순위**: 중간
**버전**: v1.9.0 → v1.10.0
**완료일**: 2025-11-28

#### 완료된 작업 항목

**v1.9.0: 프로필 관리** ✅
- [x] Profile 페이지 (`/profile`) - 프로필 정보 조회/수정
- [x] `useProfile` 훅 (프로필 CRUD, React Query)
- [x] `useUploadAvatar` 훅 (아바타 이미지 업로드)
- [x] Supabase Storage 아바타 버킷 연동

**v1.10.0: RBAC 강화 & 이메일 인증** ✅
- [x] `user_profiles` 테이블 (이메일 인증 필드 추가)
- [x] `user_roles` 테이블 (admin, user, guest)
- [x] RLS 정책 (프로필/역할 접근 제어)
- [x] 이메일 인증 플로우 (`useVerifyEmail`, `useRequestEmailVerification`)
- [x] EmailVerify 페이지 (`/email/verify`)

---

### 🚀 Phase 11: 콘텐츠 관리 (v1.11.0 ~ v1.12.0)

**우선순위**: 높음
**버전**: v1.11.0 → v1.12.0
**상태**: 다음 단계

#### 작업 항목
- [ ] 블로그 시스템 (`/blog`)
  - 블로그 목록 페이지
  - 블로그 상세 페이지 (마크다운 렌더링)
  - 태그/카테고리 필터링
- [ ] 마크다운 에디터 (관리자용)
  - react-markdown-editor-lite
  - 이미지 업로드 (Drag & Drop)
  - 미리보기
- [ ] SEO 최적화
  - 메타 태그 (react-helmet-async)
  - sitemap.xml 자동 생성
  - robots.txt
- [ ] RSS 피드
  - /rss.xml 생성
  - 자동 업데이트

#### 기술 스택
- react-markdown (렌더링)
- react-markdown-editor-lite (에디터)
- react-helmet-async (메타 태그)
- sitemap 라이브러리

#### 완료 기준
- [ ] 블로그 게시/수정/삭제 가능
- [ ] SEO 점수 90+ (Lighthouse)
- [ ] RSS 피드 생성 확인

---

### 📋 Phase 12: 고도화 & 확장 (v2.0.0 ~)

**우선순위**: 낮음
**기간**: TBD (시스템 안정화 후)
**버전**: v2.0.0 → v2.x.x

#### 작업 항목
- [ ] 다국어 지원 (i18n)
  - 한국어, 영어 지원
  - react-i18next
  - 언어 전환 UI
- [ ] AI 챗봇 통합
  - OpenAI API 연동
  - 채팅 UI (shadcn/ui Dialog)
  - 고객 지원 자동화
- [ ] 성능 모니터링
  - Sentry (에러 추적)
  - LogRocket (세션 리플레이)
  - Google Analytics 4
- [ ] A/B 테스팅
  - Optimizely or Google Optimize
  - 실험 설정 UI
- [ ] PWA 지원
  - Service Worker
  - 오프라인 모드
  - 푸시 알림
  - 앱 아이콘 (192x192, 512x512)

#### 기술 스택
- react-i18next (다국어)
- OpenAI API (챗봇)
- Sentry (모니터링)
- Workbox (PWA)

#### 완료 기준
- [ ] 한/영 언어 전환 가능
- [ ] AI 챗봇 응답 성공
- [ ] PWA 설치 가능 (모바일)

---

## 📈 성공 지표 (KPI)

### Phase 8 목표
- 서비스 페이지 방문자 수: 1,000명/월
- 서비스 상세 페이지 전환율: 20%
- 페이지 로딩 속도: < 2초

### Phase 9 목표
- 장바구니 추가율: 30%
- 결제 완료율: 70%
- 주문 건수: 100건/월

### Phase 10-12 목표
- 블로그 트래픽: 5,000명/월
- SEO 순위: 주요 키워드 Top 10
- PWA 설치 수: 500명

---

## 🔄 업데이트 주기

- **주간**: project-todo.md 진행률 업데이트
- **2주**: Phase별 진행률 검토
- **월간**: KPI 분석 및 로드맵 조정
- **분기**: 다음 Phase 상세 계획 수립

---

## 📝 변경 이력

### 2025-10-17
- Phase 8-12 상세 로드맵 작성
- 기술 스택 및 리스크 분석 추가
- KPI 정의

### 2025-10-12
- Phase 7 완료 기록

---

**관련 문서**:
- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 메인 문서
- [project-todo.md](../../project-todo.md) - TODO 목록
- [changelog.md](./changelog.md) - 변경 로그
