# VIBE WORKING 프로젝트 개발 문서

> Claude와의 개발 협업을 위한 프로젝트 상세 문서

---

## 📋 프로젝트 개요

### 프로젝트 정보
- **프로젝트명**: VIBE WORKING
- **회사명**: 생각과행동 (IdeaonAction)
- **목적**: AI 기반 워킹 솔루션을 제공하는 차세대 워킹 플랫폼
- **슬로건**: KEEP AWAKE, LIVE PASSIONATE
- **웹사이트**: ideaonaction.ai

### 회사 정보
- **대표자**: 서민원
- **사업자등록번호**: 537-05-01511
- **주소**: 경기도 시흥시 대은로104번길 11, 103호 6층 601호
- **전화**: 010-4904-2671
- **이메일**: sinclairseo@gmail.com

---

## 🛠️ 기술 스택 및 아키텍처

### Frontend
- **Next.js**: 15.5.4 - React 프레임워크 (App Router, Turbopack) ✨ 새로 추가
- **React**: 18.3.1 / 19.0.0 - 사용자 인터페이스 구축
- **TypeScript**: 5.8.3 - 타입 안전성 확보
- **Tailwind CSS**: 3.4.17 - 유틸리티 기반 CSS 프레임워크
- **Vite**: 5.4.19 - 레거시 개발 환경 (Vite 앱)

### UI 컴포넌트
- **shadcn/ui** - 재사용 가능한 UI 컴포넌트 라이브러리
- **Radix UI** - 접근성이 뛰어난 프리미티브 컴포넌트
  - @radix-ui/react-dialog, dropdown-menu, avatar 등 30+ 패키지
- **Lucide React**: 0.462.0 - 아이콘 라이브러리
- **Recharts**: 2.15.4 - 차트 라이브러리

### 상태 관리 & 데이터
- **React Query (TanStack Query)**: 5.83.0 - 서버 상태 관리
- **React Hook Form**: 7.61.1 - 폼 상태 관리
- **Zod**: 3.25.76 - 스키마 검증

### 백엔드 & 서비스
- **Supabase**: 2.55.0 - 백엔드 서비스 (데이터베이스, 인증, 실시간)
- **PostgreSQL** - Supabase가 제공하는 관계형 데이터베이스

### 라우팅
- **Next.js App Router** - 파일 기반 라우팅 (Next.js 15) ✨ 새로 추가
- **React Router DOM**: 6.30.1 - 클라이언트 사이드 라우팅 (Vite 앱)

### 개발 도구
- **ESLint**: 9.32.0 - 코드 품질 검사
- **TypeScript ESLint**: 8.38.0 - TypeScript 린팅
- **Lovable Tagger**: 1.1.9 - Lovable 플랫폼 통합

### 배포
- **Vercel** - 프로덕션 배포 플랫폼 (마이그레이션 완료)
- **GitHub Actions** - CI/CD 자동화
- **Lovable** - 초기 개발 및 호스팅 (레거시)
- **Lovable Project URL**: https://lovable.dev/projects/bbad9a20-b0d1-46fa-b32e-ce22447cb72a

---

## 🔄 최근 작업 내역

### 2025-10-09: Next.js 루트 전환 완료 ✅

#### 🎯 완전한 Next.js 전환 완료
- **프로젝트 구조**: `next-app/` → 루트 디렉토리로 완전 이전
- **Vite 앱 아카이브**: `archive/vite-app/`로 보존
- **백업 브랜치**: `backup/before-nextjs-migration` 생성

#### 📁 새로운 프로젝트 구조
```
project/
├── src/               # Next.js App Router 구조
│   ├── app/           # 라우트 (/, /auth/callback, /examples)
│   ├── components/    # 재사용 컴포넌트
│   │   ├── landing/   # 랜딩 페이지 컴포넌트 (8개)
│   │   ├── examples/  # Feature Flags 예제 (2개)
│   │   └── ui/        # shadcn/ui (10개)
│   ├── contexts/      # React Context (1개)
│   ├── hooks/         # 커스텀 훅 (4개)
│   └── lib/           # 유틸리티 및 Supabase 클라이언트
├── public/            # 정적 자산 (이미지 등)
├── archive/vite-app/  # 아카이브된 Vite 앱
└── next.config.ts     # Next.js 설정
```

#### ⚙️ 주요 설정 업데이트
1. **package.json**
   - 프로젝트명: "vibe-working"
   - 버전: 0.1.0
   - Next.js 15.5.4 전용 스크립트

2. **vercel.json**
   - framework: "nextjs"
   - Next.js 자동 감지 및 최적화

3. **GitHub Actions**
   - 6개 워크플로우 환경 변수 업데이트
   - `VITE_*` → `NEXT_PUBLIC_*`

4. **TypeScript & ESLint**
   - src 디렉토리만 포함
   - archive 디렉토리 제외
   - Next.js ESLint 설정

#### 📊 빌드 결과
```
Route (app)                         Size  First Load JS
┌ ○ /                            52.1 kB         225 kB
├ ○ /_not-found                      0 B         173 kB
├ ○ /auth/callback                 12 kB         185 kB
└ ○ /examples                    27.1 kB         200 kB
+ First Load JS shared by all     178 kB
ƒ Middleware                     76.8 kB
```

#### 📈 파일 통계
- **총 변경**: 137개 파일
- **추가**: +8,295줄
- **삭제**: -4,342줄
- **커밋**: `80e63b4` - feat: complete Next.js migration - move to root directory

### 2025-10-09: GitHub 브랜치 전략 및 DevOps 완성

#### ✅ 완료된 작업
1. **브랜치 전략 구축**
   - GitHub 브랜치 생성: `develop`, `staging`, `canary`
   - GitFlow 기반 브랜치 전략 설계
   - 브랜치별 자동 배포 워크플로우 구축

2. **카나리 배포 시스템**
   - `.github/workflows/deploy-canary.yml`: 점진적 트래픽 증가 (10% → 50% → 100%)
   - `.github/workflows/monitor-canary.yml`: 5분마다 자동 헬스 체크
   - `.github/workflows/canary-rollback.yml`: 긴급 롤백 및 이슈 자동 생성
   - `.github/workflows/canary-promote.yml`: 카나리 → 프로덕션 프로모션 및 릴리스 태깅

3. **환경별 배포 워크플로우**
   - `.github/workflows/deploy-develop.yml`: Development 환경 자동 배포
   - `.github/workflows/deploy-staging.yml`: Staging 환경 자동 배포 및 QA
   - 각 환경별 자동 URL 생성 및 배포

4. **Feature Flags & A/B Testing**
   - `supabase/migrations/003_create_feature_flags.sql`: 완전한 A/B 테스트 시스템
   - 8개 테이블: feature_flag, feature_flag_override, ab_test_experiment, ab_test_assignment, ab_test_event
   - 4가지 Flag 타입: boolean, percentage, user_segment, ab_test
   - Row Level Security (RLS) 정책 적용

5. **DevOps 문서화**
   - `docs/08-devops/branch-strategy.md`: 브랜치 전략 및 워크플로우 가이드
   - `docs/08-devops/canary-deployment.md`: 카나리 배포 프로세스 및 문제 해결
   - `docs/08-devops/ab-testing.md`: A/B 테스트 가이드 및 통계 분석

#### 📊 구축된 인프라
- **4개 환경**: Development, Staging, Canary, Production
- **7개 GitHub Actions 워크플로우**: CI, 4개 배포, 3개 카나리 관리
- **완전 자동화**: 코드 푸시 → 빌드 → 테스트 → 배포 → 모니터링 → 롤백/프로모션

### 2025-10-08: 배포 인프라 구축

#### ✅ 완료된 작업
1. **Vercel 배포 설정**
   - `vercel.json` 생성 및 설정
   - 프레임워크: Vite
   - 출력 디렉토리: dist
   - 보안 헤더 설정

2. **GitHub Actions CI/CD 기초 구축**
   - `.github/workflows/ci.yml`: 린트, 타입 체크, 빌드 테스트
   - `.github/workflows/deploy-production.yml`: main 브랜치 자동 배포
   - `.github/workflows/deploy-preview.yml`: PR 프리뷰 자동 배포
   - `.github/workflows/cleanup.yml`: 배포 정리 자동화

3. **개발 도구 개선**
   - package.json 스크립트 추가:
     - `build:staging`, `build:production`
     - `lint:fix`, `type-check`
     - `deploy`, `deploy:prod`
   - `.gitignore` 업데이트 (Vercel 관련)

4. **문서화**
   - `docs/vercel-deployment-guide.md` 작성
   - 배포 프로세스 상세 가이드
   - GitHub Secrets 설정 가이드
   - 문제 해결 가이드

#### 🚧 진행 예정 작업
1. **Next.js 마이그레이션** (2-3주 예정)
   - Next.js 15 App Router 도입
   - Server Components 활용
   - SEO 최적화
   - 성능 개선
   - Edge Middleware를 통한 트래픽 분할 구현

2. **PWA 지원 추가** (1-2주 예정)
   - Progressive Web App 구현
   - 오프라인 지원
   - 푸시 알림
   - 앱 아이콘 및 매니페스트

3. **포트폴리오 기능 구현** (2-3주 예정)
   - 서비스 목록 페이지
   - 서비스 상세 페이지
   - 프로젝트 갤러리

4. **서비스 연동 시스템** (1-2주 예정)
   - SSO (Single Sign-On)
   - 서비스 간 통합 인증
   - 마이크로프론트엔드 아키텍처

---

## 📅 프로젝트 로드맵

### Phase 1: 인프라 및 배포 최적화 ✅ (완료 - 2025-10-08~09)
- [x] Vercel 배포 설정
- [x] GitHub Actions CI/CD 구축
- [x] 환경별 배포 전략 (Development, Staging, Canary, Production)
- [x] 자동화 워크플로우 구축 (7개 워크플로우)
- [x] GitHub 브랜치 전략 (develop, staging, canary, main)
- [x] 카나리 배포 시스템 (점진적 트래픽 분할)
- [x] Feature Flags & A/B Testing 데이터베이스
- [x] DevOps 문서화 완료

### Phase 2: Next.js 마이그레이션 ✅ (완료 - 2025-10-09)
- [x] Next.js 15 프로젝트 생성
- [x] App Router 구조 설정
- [x] 기존 컴포넌트 마이그레이션 (35개 파일)
- [x] Server/Client Components 분리
- [x] 인증 시스템 마이그레이션 (OAuth 3종)
- [x] SEO 최적화 (Open Graph, Twitter Card)
- [x] 이미지 최적화 (Next.js Image, WebP)
- [x] 성능 개선 (코드 스플리팅, Lazy loading)
- [x] **루트 디렉토리 전환 완료** (next-app/ → 프로젝트 루트)
- [x] Vite 앱 아카이브 (archive/vite-app/)
- [x] GitHub Actions 환경 변수 업데이트 (6개 워크플로우)
- [x] 프로덕션 빌드 성공 (225kB First Load JS)

### Phase 3: 앱 지원 📋 (계획 중 - 4주차)
- [ ] PWA 구현
  - [ ] Service Worker 설정
  - [ ] 매니페스트 파일
  - [ ] 오프라인 지원
  - [ ] 푸시 알림
- [ ] 앱 아이콘 및 스플래시 화면
- [ ] 설치 프롬프트
- [ ] 앱 스토어 등록 (선택사항)

### Phase 4: 포트폴리오 & 서비스 연동 📋 (계획 중 - 6주차)
- [ ] 데이터베이스 스키마 확장
  - [ ] service 테이블
  - [ ] service_gallery 테이블
  - [ ] service_metrics 테이블
- [ ] 포트폴리오 페이지 구현
  - [ ] 서비스 목록 페이지
  - [ ] 서비스 상세 페이지
  - [ ] 프로젝트 갤러리
- [ ] 서비스 연동 시스템
  - [ ] SSO 구현
  - [ ] JWT 토큰 기반 인증
  - [ ] 서비스 임베딩 (iframe 또는 Module Federation)

### Phase 5: 전자상거래 기능 완성 📋 (계획 중 - Q1 2025)
- [ ] 장바구니 시스템
- [ ] 주문 관리 시스템
- [ ] 결제 게이트웨이 통합 (카카오페이, 토스페이먼츠)
- [ ] 관리자 대시보드
- [ ] 주문 상태 추적
- [ ] 재고 관리

### Phase 6: 고도화 📋 (계획 중 - Q2 2025)
- [ ] 다국어 지원 (i18n)
- [ ] 고급 분석 대시보드
- [ ] AI 챗봇 통합
- [ ] 이메일 마케팅 시스템
- [x] A/B 테스팅 시스템 (데이터베이스 스키마 완료)
- [ ] 성능 모니터링 (Sentry, LogRocket)

---

## 📚 개발 히스토리

### 최근 커밋 (최신순)
```
80e63b4 - feat: complete Next.js migration - move to root directory
059af25 - docs: update project status and create Next.js migration summary
072e2d3 - feat: complete Next.js Phase 4 - Optimization & Production Ready
1a5817a - feat: complete Next.js Phase 3 - Homepage Migration
4a4677d - feat: complete Next.js Phase 2 - Component Migration
a337b34 - feat: initialize Next.js 15 migration with App Router and Supabase
cd5e383 - docs: update project-todo.md with Feature Flags & A/B Testing completion
```

### 주요 개발 이정표
1. **초기 설정** (e9f4aeb ~ 4c2c6e6)
   - Vite + React + TypeScript 프로젝트 생성
   - 회사 정보 및 제품 추가
   - 로고 적용

2. **Supabase 통합** (99e0b4c ~ 447dc2f)
   - Supabase 프로젝트 연결
   - 소셜 로그인 기능 구현 (Google, GitHub, Kakao)
   - 인증 시스템 구축

3. **콘텐츠 업데이트** (5721925 ~ a0426f4)
   - 상품 가격 및 카테고리 조정
   - AI 제품 워딩 최적화
   - 컨설팅 서비스 제거
   - "Why VIBE WORKING?" 섹션 강화

4. **Vercel 배포 및 CI/CD** (fb5bd44)
   - Vercel 배포 설정 완료
   - GitHub Actions 워크플로우 구축
   - 문서화 및 마이그레이션 가이드 작성

5. **DevOps 인프라** (완료 - 2025-10-09)
   - GitHub 브랜치 전략 구축 (develop, staging, canary)
   - 카나리 배포 시스템 완성 (7개 워크플로우)
   - Feature Flags & A/B Testing 데이터베이스 구축
   - 완전한 DevOps 문서화

6. **Next.js 마이그레이션 및 루트 전환** (완료 - 2025-10-09)
   - Next.js 15 프로젝트 생성 및 설정
   - 35개 컴포넌트/훅 마이그레이션
   - 소셜 로그인 시스템 통합
   - 이미지 최적화 및 SEO 완성
   - **프로젝트 구조 전환**: next-app/ → 루트 디렉토리
   - Vite 앱 아카이브 및 백업 브랜치 생성
   - GitHub Actions 환경 변수 업데이트 (6개 워크플로우)
   - 프로덕션 빌드 성공 (225kB First Load JS)
   - 커밋: 80e63b4

---

## 🎯 주요 구현 기능

### 1. 인증 시스템

#### A. 소셜 로그인
**파일**: `src/components/SocialLogin.tsx`

- **지원 플랫폼**: Google, GitHub, Kakao
- **기능**:
  - OAuth 2.0 기반 인증
  - 로딩 상태 관리
  - 에러 핸들링 및 토스트 알림
  - 플랫폼별 커스텀 스타일링

**주요 코드**:
```typescript
const handleSocialLogin = async (provider: 'google' | 'github' | 'kakao') => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        ...(provider === 'kakao' && {
          scope: 'profile_nickname profile_image account_email'
        })
      }
    }
  });
};
```

#### B. 인증 훅
**파일**: `src/hooks/useAuth.ts`

- **상태 관리**:
  - `user`: 현재 로그인한 사용자 정보
  - `session`: Supabase 세션 객체
  - `loading`: 로딩 상태
  - `error`: 에러 메시지

- **제공 함수**:
  - `signOut()`: 로그아웃
  - `refreshSession()`: 세션 갱신
  - `updateProfile()`: 프로필 업데이트
  - `clearError()`: 에러 초기화

**인터페이스**:
```typescript
export interface AuthUser {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  provider?: string;
  createdAt: string;
}
```

#### C. 인증 콜백
**파일**: `src/pages/AuthCallback.tsx`

- OAuth 리디렉션 처리
- 세션 검증
- 자동 리디렉션 (성공 시 대시보드, 실패 시 로그인 페이지)

#### D. 사용자 프로필
**파일**: `src/components/UserProfile.tsx`

- 아바타 표시
- 사용자 이름 및 이메일 표시
- 로그아웃 버튼

#### E. Supabase 클라이언트
**파일**: `src/integrations/supabase/client.ts`

```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### 2. 상품 카탈로그

#### AI 솔루션 상품
1. **AI 워킹 플랫폼**
   - 가격: ₩8,800,000
   - 평점: 5.0/5.0
   - 설명: AI 기술로 구축된 자동화 워킹 플랫폼
   - 특징: 완전 맞춤형 AI 솔루션, 업무 자동화

2. **AI 워킹 교육 과정**
   - 가격: ₩6,800,000
   - 평점: 4.8/5.0
   - 설명: AI를 활용한 6개월 집중 워킹 실무 교육 프로그램
   - 특징: 수료증 발급, AI 튜터가 교육 진행

3. **AI 온라인 마스터 클래스**
   - 가격: ₩4,800,000
   - 평점: 4.9/5.0
   - 설명: AI를 활용한 24시간 온라인 워킹 강의 패키지
   - 특징: 언제든지 AI와 학습 가능

### 3. 랜딩 페이지

**파일**: `src/pages/Index.tsx`

#### 주요 섹션
- **히어로 섹션**: 메인 비주얼, CTA 버튼
- **상품 소개**: 그리드 레이아웃, 카드 디자인
- **Why VIBE WORKING?**: 특징 및 이점 설명
- **연락처**: 모달 기반 연락처 정보

#### 기능
- 반응형 디자인 (모바일, 태블릿, 데스크톱)
- 스크롤 애니메이션
- 연락처 모달
- 소셜 로그인 다이얼로그
- 사용자 프로필 드롭다운

---

## 🗄️ 데이터베이스 스키마

### 전자상거래 지원 스키마
**참조**: `docs/supabase-table-setup-guide.md`, `docs/ecommerce_db_guide_ko_v1.md`

#### 1. 인증/인가
- `app_user`: 사용자 계정 정보
- `user_identity`: 소셜 로그인 계정 매핑
- `user_session`: 세션/리프레시 토큰 관리
- `role`: 역할 정의
- `user_role`: 사용자-역할 매핑

#### 2. 카탈로그
- `product`: 상품 기본 정보
- `product_variant`: 상품 변형(SKU)
- `product_option`: 옵션 (색상, 사이즈 등)
- `product_option_value`: 옵션 값
- `variant_option_value`: 변형-옵션값 매핑
- `product_image`: 상품 이미지
- `category`: 카테고리
- `product_category`: 상품-카테고리 매핑

#### 3. 장바구니
- `cart`: 장바구니
- `cart_item`: 장바구니 항목

#### 4. 주문/배송
- `shop_order`: 주문 정보
- `order_item`: 주문 항목
- `order_status_history`: 상태 이력
- `shipment`: 배송 정보
- `address`: 주소

#### 5. 결제
- `payment_provider`: 결제 프로바이더 (카카오페이, 토스페이먼츠 등)
- `payment_intent`: 결제 의도/세션
- `payment_tx`: 실제 결제 거래
- `refund`: 환불
- `webhook_event`: PG 웹훅 이벤트

#### 6. 할인/쿠폰
- `coupon`: 쿠폰
- `coupon_redemption`: 쿠폰 사용 내역

#### 7. 재고
- `inventory_location`: 재고 위치
- `inventory_item`: 재고 항목
- `stock_movement`: 재고 이동

#### 8. 감사
- `audit_log`: 감사 로그

### 주요 인덱스
```sql
-- 이메일 검색
CREATE INDEX idx_app_user_email ON app_user(email) WHERE deleted_at IS NULL;

-- 상품 검색
CREATE INDEX idx_product_slug ON product(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_variant_sku ON product_variant(sku) WHERE deleted_at IS NULL;

-- 주문 검색
CREATE INDEX idx_shop_order_order_number ON shop_order(order_number) WHERE deleted_at IS NULL;

-- JSONB 검색 (GIN 인덱스)
CREATE INDEX idx_product_metadata ON product USING GIN (metadata);
```

---

## 📁 프로젝트 구조

```
IdeaonAction-Homepage/
├── .github/                    # GitHub Actions 워크플로우
│   └── workflows/             # CI/CD 파이프라인 (7개)
├── archive/                    # 아카이브된 레거시 코드
│   └── vite-app/              # Vite 기반 앱 (마이그레이션 전)
├── docs/                       # 프로젝트 문서
│   ├── 00-README.md           # 문서 인덱스
│   ├── 06-migration/          # 마이그레이션 문서
│   ├── 07-project-management/ # 프로젝트 관리
│   └── 08-devops/             # DevOps 가이드
├── node_modules/               # 의존성 (git 무시)
├── public/                     # 정적 자산 (Next.js)
│   ├── assets/                # 이미지 (5개 JPG)
│   ├── lovable-uploads/       # 업로드된 이미지
│   ├── file.svg, globe.svg    # Next.js 기본 아이콘
│   └── next.svg, vercel.svg   # Next.js/Vercel 로고
├── src/                        # Next.js 소스 코드 ⭐
│   ├── app/                   # App Router (Next.js 15)
│   │   ├── page.tsx           # 홈페이지 (/)
│   │   ├── layout.tsx         # 루트 레이아웃
│   │   ├── globals.css        # 글로벌 스타일
│   │   ├── auth/callback/     # OAuth 콜백
│   │   └── examples/          # Feature Flags 예제
│   ├── components/            # 재사용 가능한 컴포넌트
│   │   ├── landing/           # 랜딩 페이지 컴포넌트 (8개)
│   │   ├── examples/          # 예제 컴포넌트 (2개)
│   │   └── ui/                # shadcn/ui (10개)
│   ├── contexts/              # React Context
│   │   └── FeatureFlagContext.tsx
│   ├── hooks/                 # 커스텀 React 훅
│   │   ├── useAuth.ts         # 인증 훅
│   │   ├── useFeatureFlag.ts  # Feature Flag 훅
│   │   ├── useABTest.ts       # A/B Test 훅
│   │   └── use-toast.ts       # Toast 알림 훅
│   └── lib/                   # 유틸리티 및 서비스
│       ├── supabase/          # Supabase 클라이언트
│       │   ├── client.ts      # 브라우저 클라이언트
│       │   ├── server.ts      # 서버 컴포넌트 클라이언트
│       │   └── middleware.ts  # 미들웨어 헬퍼
│       └── utils/             # 유틸리티 함수
├── supabase/                  # Supabase 설정
│   ├── config.toml
│   └── migrations/            # 데이터베이스 마이그레이션
├── .env.local                 # 환경 변수 (git 무시)
├── .gitignore
├── CLAUDE.md                  # 프로젝트 개발 문서 ⭐
├── eslint.config.js           # ESLint 설정 (Next.js)
├── next.config.ts             # Next.js 설정 ⭐
├── next-env.d.ts              # Next.js 타입 정의
├── package.json               # Next.js 의존성 및 스크립트 ⭐
├── package-lock.json
├── postcss.config.js          # PostCSS 설정
├── README.md                  # 프로젝트 README (Next.js)
├── tailwind.config.ts         # Tailwind CSS 설정
├── tsconfig.json              # TypeScript 설정
└── vercel.json                # Vercel 배포 설정
```

**주요 변경사항 (2025-10-09):**
- ⭐ Next.js 15 App Router 구조로 완전 전환
- `next-app/` 디렉토리가 루트로 이동
- Vite 앱은 `archive/vite-app/`에 보존
- 프로덕션 배포 준비 완료

---

## ⚙️ 환경 변수

### .env.local 파일 (Next.js)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]

# App Configuration (선택사항)
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 환경 변수 설정 방법
1. `.env.local.example` 파일을 `.env.local`로 복사 (또는 직접 생성)
2. Supabase 대시보드에서 프로젝트 URL과 Anon Key 복사
3. `.env.local` 파일에 값 입력

### ⚠️ 중요: 환경 변수 마이그레이션
- **Vite → Next.js 변경사항**:
  - `VITE_*` → `NEXT_PUBLIC_*`
  - `.env` → `.env.local`
  - 포트: 5173 → 3000

### GitHub Secrets 업데이트 필요
GitHub Actions 워크플로우에서 사용하는 Secrets도 업데이트해야 합니다:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_STAGING_SUPABASE_URL (staging용)
NEXT_PUBLIC_STAGING_SUPABASE_ANON_KEY (staging용)
```

---

## 🚀 개발 가이드

### 개발 환경 설정

#### 필수 요구사항
- Node.js: 18.0.0 이상
- npm: 8.0.0 이상
- Git: 2.30.0 이상

#### Next.js 앱 (현재)
```bash
# 1. 저장소 클론
git clone https://github.com/IDEA-on-Action/IdeaonAction-Homepage.git
cd IdeaonAction-Homepage

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
# .env.local 파일 생성
echo "NEXT_PUBLIC_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]" >> .env.local

# 4. 개발 서버 실행
npm run dev  # http://localhost:3000
```

#### Vite 앱 (아카이브됨)
레거시 Vite 앱을 복구하려면:
```bash
# 백업 브랜치로 체크아웃
git checkout backup/before-nextjs-migration

# 또는 아카이브에서 복원
cd archive/vite-app
npm install
npm run dev  # http://localhost:5173
```

### 개발 스크립트

#### Next.js 앱 (현재)
```bash
npm run dev          # 개발 서버 실행 (http://localhost:3000) with Turbopack
npm run build        # 프로덕션 빌드 with Turbopack
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint 검사
```

**주요 특징:**
- **Turbopack**: Next.js 15의 새로운 빌드 시스템 (Webpack 대체)
- **Hot Reload**: 코드 변경 시 즉시 반영
- **빌드 최적화**: 자동 코드 스플리팅, 이미지 최적화

### 주요 컨벤션

#### 파일명
- **컴포넌트**: PascalCase (예: `SocialLogin.tsx`)
- **훅**: camelCase with `use` prefix (예: `useAuth.ts`)
- **유틸리티**: camelCase (예: `utils.ts`)
- **페이지**: PascalCase (예: `Index.tsx`)

#### 코드 스타일
- **컴포넌트**: 함수형 컴포넌트 + TypeScript
- **스타일링**: Tailwind CSS utility classes
- **상태 관리**: React Hooks + React Query
- **타입**: TypeScript strict mode

#### 컴포넌트 작성 예시
```typescript
import React from 'react';
import { cn } from '@/lib/utils';

interface ExampleComponentProps {
  title: string;
  description?: string;
  className?: string;
}

export const ExampleComponent: React.FC<ExampleComponentProps> = ({
  title,
  description,
  className
}) => {
  return (
    <div className={cn('p-4 border rounded-lg', className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-2">{description}</p>
      )}
    </div>
  );
};
```

#### Tailwind CSS 사용 패턴
```typescript
// 반응형 디자인
<div className="
  grid grid-cols-1          // 모바일: 1열
  md:grid-cols-2           // 태블릿: 2열
  lg:grid-cols-3           // 데스크톱: 3열
  gap-4 md:gap-6 lg:gap-8 // 반응형 간격
">

// 커스텀 색상 사용
<button className="
  bg-primary text-primary-foreground
  hover:bg-primary/90
  border border-primary
">
```

---

## 🔄 현재 작업 상태

### 프로젝트 현황 (2025-10-09 기준)

#### ✅ 완료된 작업
1. **Next.js 마이그레이션** (100% 완료)
   - Phase 1: 프로젝트 초기화 ✅
   - Phase 2: 컴포넌트 마이그레이션 ✅
   - Phase 3: 홈페이지 마이그레이션 ✅
   - Phase 4: 최적화 및 프로덕션 준비 ✅
   - **Phase 5: 루트 디렉토리 전환** ✅ (NEW)

2. **DevOps 인프라** (100% 완료)
   - GitHub 브랜치 전략 ✅
   - 카나리 배포 시스템 ✅
   - Feature Flags & A/B Testing DB ✅
   - 문서화 완료 ✅

3. **프로젝트 구조 전환** (100% 완료) ⭐ NEW
   - next-app/ → 루트 디렉토리 ✅
   - Vite 앱 아카이브 ✅
   - GitHub Actions 환경 변수 업데이트 ✅
   - 프로덕션 빌드 검증 ✅
   - 커밋 및 푸시 완료 ✅

#### 📁 현재 프로젝트 구조
```
IdeaonAction-Homepage/    # ⭐ 루트 = Next.js 앱
├── src/                   # Next.js App Router
│   ├── app/               # 라우트 (3개)
│   ├── components/        # 컴포넌트 (20개)
│   ├── hooks/             # 훅 (4개)
│   ├── contexts/          # Context (1개)
│   └── lib/               # 라이브러리 (4개)
├── public/                # 정적 자산
├── archive/vite-app/      # 아카이브된 Vite 앱
├── next.config.ts         # Next.js 설정
└── package.json           # Next.js 의존성

총 파일: 35개 TS/TSX (Next.js)
총 코드: ~1,500줄
```

#### 📊 빌드 통계
```
Route (app)                         Size  First Load JS
┌ ○ /                            52.1 kB         225 kB
├ ○ /_not-found                      0 B         173 kB
├ ○ /auth/callback                 12 kB         185 kB
└ ○ /examples                    27.1 kB         200 kB
+ First Load JS shared by all     178 kB
ƒ Middleware                     76.8 kB

✅ 빌드 성공 (경고 3개, 에러 0개)
```

### 다음 단계

#### ⚠️ 즉시 실행 필요 (배포 전)
- [ ] **GitHub Repository Secrets 업데이트**:
  - `VITE_*` → `NEXT_PUBLIC_*`로 변경
  - Staging 환경 변수도 함께 업데이트
- [ ] Vercel 배포 테스트
- [ ] 모든 라우트 검증 (/, /auth/callback, /examples)
- [ ] 소셜 로그인 테스트 (Google, GitHub, Kakao)

#### 🎯 즉시 실행 가능
- [x] Next.js 마이그레이션 완료
- [x] 루트 디렉토리 전환 완료
- [x] 프로덕션 빌드 검증
- [x] 문서 업데이트
- [ ] 도메인 연결 (ideaonaction.ai)

#### 단기 (1-2주)
- [ ] 404/500 에러 페이지 커스터마이징
- [ ] PWA 지원 (Service Worker, 매니페스트)
- [ ] 대시보드 페이지 구현
- [ ] 상품 상세 페이지

#### 중기 (1-2개월)
- [ ] 전자상거래 기능 (장바구니, 주문, 결제)
- [ ] 관리자 대시보드
- [ ] 결제 게이트웨이 통합 (카카오페이, 토스)
- [ ] 이메일 마케팅 시스템

#### 장기 (3-6개월)
- [ ] 다국어 지원 (i18n)
- [ ] AI 챗봇 통합
- [ ] 고급 분석 대시보드
- [ ] 성능 모니터링 (Sentry, LogRocket)

---

## 📖 참조 문서

### 내부 문서
- **docs/README.md**: 프로젝트 종합 가이드
- **docs/supabase-social-login-setup.md**: 소셜 로그인 설정 가이드
- **docs/supabase-table-setup-guide.md**: 데이터베이스 설정 가이드
- **docs/ecommerce_db_guide_ko_v1.md**: 전자상거래 DB 설계 가이드

### 외부 문서
- [Supabase 공식 문서](https://supabase.com/docs)
- [React 공식 문서](https://react.dev)
- [TypeScript 공식 문서](https://www.typescriptlang.org/docs)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/docs)
- [shadcn/ui 공식 문서](https://ui.shadcn.com)
- [React Query 공식 문서](https://tanstack.com/query/latest)
- [Vite 공식 문서](https://vitejs.dev)

### API 문서
- [Supabase Auth API](https://supabase.com/docs/guides/auth)
- [Supabase Database API](https://supabase.com/docs/guides/database)
- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)

---

## 🔐 보안 고려사항

### 인증 보안
- OAuth 2.0 표준 준수
- Client Secret은 서버 사이드에서만 사용
- HTTPS 사용 (프로덕션)
- CSRF 토큰 검증
- 세션 만료 시간 설정

### 데이터 보안
- 민감 정보는 암호화 저장 (pgcrypto 확장 사용)
- 카드 정보는 저장하지 않음 (PG 토큰만 저장)
- Row Level Security (RLS) 활성화 권장
- 환경 변수로 비밀 키 관리 (.env 파일은 git 무시)

### API 보안
- Supabase Anon Key는 공개 가능 (RLS로 보호)
- Rate limiting 설정
- CORS 정책 설정

---

## 🐛 문제 해결

### 일반적인 문제

#### 1. Supabase 연결 오류
```
Error: Invalid Supabase URL or Anon Key
```
**해결 방법**:
- `.env` 파일에서 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY` 확인
- Supabase 대시보드에서 올바른 값 복사
- 개발 서버 재시작 (`npm run dev`)

#### 2. OAuth 리디렉션 오류
```
Error: redirect_uri_mismatch
```
**해결 방법**:
- OAuth 제공자 설정에서 Redirect URI 확인
- Supabase 대시보드에서 허용된 Redirect URLs 추가
- `${window.location.origin}/auth/callback` 형식 사용

#### 3. TypeScript 타입 오류
```
Error: Property 'xxx' does not exist on type 'yyy'
```
**해결 방법**:
- `src/vite-env.d.ts`에 타입 정의 추가
- 인터페이스 업데이트
- `npm install` 재실행

#### 4. 빌드 오류
```
Error: Failed to build
```
**해결 방법**:
- `node_modules` 삭제 후 `npm install` 재실행
- TypeScript 에러 확인 및 수정
- ESLint 에러 확인 및 수정

---

## 📞 연락처 및 지원

### 개발 관련 문의
- **이메일**: sinclairseo@gmail.com
- **전화**: 010-4904-2671
- **운영시간**: 평일 09:00 - 18:00 (점심시간: 12:00 - 13:00)

### 프로젝트 링크
- **GitHub**: (저장소 URL)
- **Lovable**: https://lovable.dev/projects/bbad9a20-b0d1-46fa-b32e-ce22447cb72a
- **웹사이트**: https://ideaonaction.ai

---

## 📝 라이선스

이 프로젝트는 생각과행동(IdeaonAction)의 소유입니다.

---

**마지막 업데이트**: 2025-10-09
**문서 버전**: 1.1.0
**작성자**: Claude & Development Team

**주요 변경사항**:
- 2025-10-09: GitHub 브랜치 전략 및 DevOps 인프라 구축 완료
- 2025-10-08: Vercel 배포 및 초기 CI/CD 설정
