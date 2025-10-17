# VIBE WORKING 프로젝트 TODO

> 프로젝트 작업 목록 및 진행 상황 관리

**마지막 업데이트**: 2025-10-09

---

## 🚀 현재 진행 중

### 배포 모니터링
- [ ] Development 환경 안정성 확인
- [ ] /examples 페이지 기능 테스트
- [ ] Feature Flags 데모 동작 확인
- [ ] A/B Testing 데모 동작 확인

### Next.js 마이그레이션 (Week 3-4 예정)
- [ ] Next.js 15 프로젝트 생성
- [ ] 프로젝트 구조 설정
  - [ ] app/ 디렉토리 구조 생성
  - [ ] components/ 재구성
  - [ ] lib/ 유틸리티 이전
- [ ] 기존 컴포넌트 마이그레이션
  - [ ] Index.tsx → app/page.tsx
  - [ ] AuthCallback.tsx → app/auth/callback/page.tsx
  - [ ] App.tsx → app/layout.tsx
  - [ ] UI 컴포넌트 (shadcn/ui) 이전
- [ ] 환경 변수 재설정
  - [ ] VITE_ → NEXT_PUBLIC_ 변경
  - [ ] .env.local 생성
- [ ] Supabase 클라이언트 재구성
  - [ ] 클라이언트용 (lib/supabase/client.ts)
  - [ ] 서버용 (lib/supabase/server.ts)
- [ ] App Router 구조 설정
  - [ ] (marketing) 그룹
  - [ ] (auth) 그룹
  - [ ] (dashboard) 그룹
- [ ] Server Components 적용
  - [ ] 정적 컴포넌트 변환
  - [ ] 동적 컴포넌트 'use client' 표시
- [ ] API Routes 구현
  - [ ] /api/auth
  - [ ] /api/products
- [ ] 빌드 및 배포 설정 변경
  - [ ] next.config.js 생성
  - [ ] vercel.json 업데이트
  - [ ] GitHub Actions 워크플로우 수정
- [ ] 테스트 및 검증
  - [ ] 로컬 빌드 테스트
  - [ ] Preview 배포 테스트
  - [ ] Production 배포

---

## ✅ 완료

### 2025-10-09 (오후): Feature Flags & A/B Testing 프론트엔드 완성
- [x] **React Hooks 구현**
  - [x] useFeatureFlag.ts - 4가지 타입 지원 (boolean, percentage, user_segment, ab_test)
  - [x] useABTest.ts - A/B 테스트 variant 할당, exposure/conversion 트래킹
  - [x] Context 최적화 - 초기 로드 시 모든 플래그 캐싱

- [x] **Context Provider**
  - [x] FeatureFlagContext.tsx - 중앙화된 플래그 관리
  - [x] App.tsx에 FeatureFlagProvider 통합
  - [x] 인증 상태 변경 시 자동 새로고침

- [x] **인터랙티브 예제 페이지**
  - [x] /examples 라우트 추가
  - [x] FeatureFlagExample.tsx - 3가지 플래그 타입 데모
  - [x] ABTestExample.tsx - 버튼 색상 A/B 테스트 데모
  - [x] 탭 기반 UI (Feature Flags / A/B Testing)

- [x] **예제 데이터**
  - [x] 004_insert_example_flags.sql 마이그레이션
  - [x] 4개 예제 플래그 생성
  - [x] 1개 A/B 테스트 실험 생성

- [x] **배포 및 검증**
  - [x] Supabase 마이그레이션 적용 (003, 004)
  - [x] develop 브랜치에 병합
  - [x] Development 환경 재배포
  - [x] API 키 업데이트 및 검증

### 2025-10-09 (오전): GitHub 브랜치 전략 및 DevOps 완성
- [x] **브랜치 전략 구축**
  - [x] develop, staging, canary 브랜치 생성
  - [x] GitFlow 기반 브랜치 전략 설계
  - [x] 브랜치 보호 규칙 문서화

- [x] **카나리 배포 시스템**
  - [x] deploy-canary.yml - 점진적 트래픽 증가 (10% → 50% → 100%)
  - [x] monitor-canary.yml - 5분마다 자동 헬스 체크
  - [x] canary-rollback.yml - 긴급 롤백 및 이슈 자동 생성
  - [x] canary-promote.yml - 카나리 → 프로덕션 프로모션

- [x] **환경별 배포 워크플로우**
  - [x] deploy-develop.yml - Development 환경 자동 배포
  - [x] deploy-staging.yml - Staging 환경 자동 배포
  - [x] 각 환경별 URL 및 환경 변수 설정

- [x] **Feature Flags & A/B Testing 데이터베이스**
  - [x] 003_create_feature_flags.sql 마이그레이션
  - [x] 8개 테이블 생성 (feature_flag, ab_test_experiment, 등)
  - [x] 4가지 Flag 타입 지원 (boolean, percentage, user_segment, ab_test)
  - [x] Row Level Security (RLS) 정책 적용

- [x] **DevOps 문서화**
  - [x] docs/08-devops/branch-strategy.md
  - [x] docs/08-devops/canary-deployment.md
  - [x] docs/08-devops/ab-testing.md

- [x] **Vercel 환경 변수 설정**
  - [x] VITE_SUPABASE_URL
  - [x] VITE_SUPABASE_ANON_KEY
  - [x] VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID

- [x] **배포 테스트 및 검증**
  - [x] Development 환경 배포 성공 (https://dev-ideaonaction.vercel.app)
  - [x] GitHub Actions 권한 문제 해결
  - [x] Supabase 연동 확인

### 2025-10-08: 배포 인프라 구축
- [x] **Vercel 배포 설정**
  - [x] vercel.json 생성
  - [x] 프레임워크: Vite
  - [x] 보안 헤더 설정
  - [x] Rewrites 설정 (SPA)

- [x] **GitHub Actions CI/CD 구축**
  - [x] CI 워크플로우 (.github/workflows/ci.yml)
    - [x] ESLint 실행
    - [x] TypeScript 타입 체크
    - [x] 빌드 테스트 (Node 18.x, 20.x)
    - [x] 빌드 아티팩트 업로드
  - [x] Production 배포 (.github/workflows/deploy-production.yml)
    - [x] main 브랜치 푸시 시 자동 배포
    - [x] 수동 트리거 지원 (workflow_dispatch)
    - [x] 배포 결과 요약
  - [x] Preview 배포 (.github/workflows/deploy-preview.yml)
    - [x] PR 생성 시 자동 배포
    - [x] PR에 Preview URL 코멘트
    - [x] Staging 환경 변수 사용
  - [x] Cleanup 워크플로우 (.github/workflows/cleanup.yml)
    - [x] PR 종료 시 Preview 배포 정리
    - [x] 오래된 워크플로우 실행 기록 삭제

- [x] **개발 도구 개선**
  - [x] package.json 스크립트 추가
    - [x] build:staging
    - [x] build:production
    - [x] lint:fix
    - [x] type-check
    - [x] deploy, deploy:prod
  - [x] .gitignore 업데이트
    - [x] .vercel 추가
    - [x] 빌드 디렉토리 추가
    - [x] 환경 변수 파일 추가

- [x] **문서화**
  - [x] vercel-deployment-guide.md 작성
  - [x] GitHub Secrets 설정 가이드
  - [x] 배포 프로세스 문서화
  - [x] 문제 해결 가이드

### 이전 작업 (2025-10-07 이전)
- [x] **소셜 로그인 구현**
  - [x] Google OAuth 연동
  - [x] GitHub OAuth 연동
  - [x] Kakao OAuth 연동
  - [x] SocialLogin 컴포넌트
  - [x] UserProfile 컴포넌트

- [x] **인증 시스템 구축**
  - [x] useAuth 커스텀 훅
  - [x] AuthCallback 페이지
  - [x] 세션 관리
  - [x] 로그아웃 기능

- [x] **Supabase 통합**
  - [x] Supabase 클라이언트 설정
  - [x] 환경 변수 설정
  - [x] 데이터베이스 연결

- [x] **랜딩 페이지**
  - [x] 히어로 섹션
  - [x] 상품 소개 섹션
  - [x] "Why VIBE WORKING?" 섹션
  - [x] 연락처 모달
  - [x] 반응형 디자인

- [x] **상품 카탈로그**
  - [x] AI 워킹 플랫폼 (₩8,800,000)
  - [x] AI 워킹 교육 과정 (₩6,800,000)
  - [x] AI 온라인 마스터 클래스 (₩4,800,000)

---

## 📋 백로그

### 우선순위: 높음 🔴
- [ ] **Next.js 마이그레이션 완료** (Week 2-3)
- [ ] **PWA 지원 추가** (Week 4)
  - [ ] Service Worker 설정
  - [ ] 매니페스트 파일 생성
  - [ ] 오프라인 페이지
  - [ ] 푸시 알림 설정
  - [ ] 앱 아이콘 (192x192, 512x512)
- [ ] **SEO 최적화** (Week 3)
  - [ ] 메타 태그 설정
  - [ ] Open Graph 설정
  - [ ] sitemap.xml
  - [ ] robots.txt
  - [ ] 구조화된 데이터 (JSON-LD)
- [ ] **성능 최적화** (Week 3-4)
  - [ ] 이미지 최적화 (next/image)
  - [ ] 코드 스플리팅
  - [ ] Lazy loading
  - [ ] Core Web Vitals 개선

### 우선순위: 중간 🟡
- [ ] **Feature Flags 관리자 UI** (Week 5-6)
  - [ ] Feature Flag 목록 페이지
  - [ ] Feature Flag 생성/수정 폼
  - [ ] A/B Test 실험 대시보드
  - [ ] 실시간 통계 및 차트
  - [ ] Variant 성과 비교

- [ ] **포트폴리오 페이지 구현** (Week 6-8)
  - [ ] 데이터베이스 스키마 확장
    - [ ] service 테이블
    - [ ] service_gallery 테이블
    - [ ] service_metrics 테이블
  - [ ] 서비스 목록 페이지
  - [ ] 서비스 상세 페이지
  - [ ] 프로젝트 갤러리
  - [ ] 필터링 및 검색

- [ ] **서비스 연동 시스템** (Week 9-10)
  - [ ] SSO (Single Sign-On) 구현
  - [ ] JWT 토큰 발급/검증
  - [ ] 서비스 리디렉션
  - [ ] 서비스 임베딩 (iframe)

- [ ] **이메일 인증 기능**
  - [ ] 회원가입 이메일 인증
  - [ ] 비밀번호 재설정
  - [ ] 이메일 템플릿

- [ ] **사용자 대시보드**
  - [ ] 프로필 페이지
  - [ ] 주문 내역
  - [ ] 설정 페이지

### 우선순위: 낮음 🟢
- [ ] **다국어 지원 (i18n)**
  - [ ] next-intl 설정
  - [ ] 한국어/영어 지원
  - [ ] 번역 파일 관리

- [ ] **테스트 코드 작성**
  - [ ] Jest 설정
  - [ ] React Testing Library
  - [ ] 단위 테스트
  - [ ] 통합 테스트
  - [ ] E2E 테스트 (Playwright)

- [ ] **Storybook 도입**
  - [ ] Storybook 설정
  - [ ] 컴포넌트 스토리 작성
  - [ ] 디자인 시스템 문서화

- [ ] **디자인 시스템 문서화**
  - [ ] 컬러 팔레트
  - [ ] 타이포그래피
  - [ ] 스페이싱 시스템
  - [ ] 컴포넌트 가이드라인

---

## 🔮 미래 계획

### Q1 2025 (1-3월)
- [ ] **전자상거래 기능 완성**
  - [ ] 장바구니 시스템
    - [ ] 장바구니 추가/제거
    - [ ] 수량 변경
    - [ ] 장바구니 영속성
  - [ ] 주문 관리 시스템
    - [ ] 주문 생성
    - [ ] 주문 상태 추적
    - [ ] 주문 내역 조회
  - [ ] 결제 게이트웨이 통합
    - [ ] 카카오페이 연동
    - [ ] 토스페이먼츠 연동
    - [ ] 결제 성공/실패 처리
    - [ ] 환불 처리
  - [ ] 관리자 대시보드
    - [ ] 주문 관리
    - [ ] 상품 관리
    - [ ] 사용자 관리
    - [ ] 통계 및 분석

### Q2 2025 (4-6월)
- [ ] **모바일 앱 출시**
  - [ ] React Native 프로젝트 생성
  - [ ] 공유 컴포넌트 라이브러리
  - [ ] iOS 앱 개발
  - [ ] Android 앱 개발
  - [ ] 앱 스토어 등록

- [ ] **AI 챗봇 통합**
  - [ ] ChatGPT API 연동
  - [ ] 챗봇 UI 구현
  - [ ] 대화 이력 저장
  - [ ] 컨텍스트 관리

- [ ] **고급 분석 대시보드**
  - [ ] Google Analytics 4
  - [ ] Vercel Analytics
  - [ ] 커스텀 이벤트 트래킹
  - [ ] 사용자 행동 분석

### Q3 2025 (7-9월)
- [ ] **이메일 마케팅 시스템**
  - [ ] SendGrid 또는 Mailchimp 연동
  - [ ] 뉴스레터 구독
  - [ ] 자동화된 이메일 캠페인
  - [ ] 이메일 템플릿 관리

- [ ] **A/B 테스팅**
  - [ ] 테스트 프레임워크 설정
  - [ ] 실험 관리
  - [ ] 결과 분석

- [ ] **성능 모니터링**
  - [ ] Sentry 통합 (에러 트래킹)
  - [ ] LogRocket (세션 리플레이)
  - [ ] 성능 메트릭 수집

---

## 🏷️ 레이블 및 카테고리

### 카테고리
- 🎨 **Frontend**: UI/UX 관련 작업
- ⚙️ **Backend**: API, 데이터베이스 작업
- 🔐 **Auth**: 인증/인가 관련
- 📱 **Mobile**: 모바일 앱 관련
- 📚 **Docs**: 문서화
- 🧪 **Testing**: 테스트 코드
- 🚀 **DevOps**: 배포, CI/CD
- 🐛 **Bug**: 버그 수정
- ✨ **Feature**: 새 기능
- 🔧 **Refactor**: 리팩토링

### 우선순위
- 🔴 **높음**: 즉시 처리 필요
- 🟡 **중간**: 계획된 일정 내 처리
- 🟢 **낮음**: 여유 있을 때 처리

---

## 📝 작업 노트

### 진행 중인 이슈
- 없음

### 블로커
- 없음

### 향후 검토 필요 항목
1. Monorepo 구조 도입 (Turborepo) 검토
2. Micro-frontend 아키텍처 도입 검토
3. GraphQL vs REST API 선택
4. 상태 관리 라이브러리 (Zustand, Jotai) 검토

---

**관리 규칙**:
- 작업 시작 시 상태를 "진행 중"으로 변경
- 작업 완료 시 "완료" 섹션으로 이동
- 주간 단위로 백로그 우선순위 재검토
- 분기별 로드맵 업데이트
