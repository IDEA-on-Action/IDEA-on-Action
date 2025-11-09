# 🌱 IDEA on Action

> **"생각을 멈추지 않고, 행동으로 옮기는 회사"**

아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오

[![Version](https://img.shields.io/badge/version-1.8.0-blue.svg)](https://github.com/IDEA-on-Action/idea-on-action)
[![Next Version](https://img.shields.io/badge/next-2.0.0-orange.svg)](https://github.com/IDEA-on-Action/idea-on-action/blob/main/version2.0%20계획.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/IDEA-on-Action/idea-on-action/actions)

## 📖 소개

IDEA on Action은 단순한 소개 웹사이트를 넘어, **실시간으로 상호작용하는 커뮤니티형 프로덕트 스튜디오**입니다.

**핵심 루프**: 아이디어 → 실험 → 결과공유 → 참여 → 다음 아이디어

### ✨ Version 2.0 주요 변화

| 구분 | v1.x | v2.0 |
|------|------|------|
| **정체성** | 소개용 정적 웹사이트 | 커뮤니티형 프로덕트 스튜디오 |
| **콘텐츠** | Services 중심 | Roadmap + Portfolio + Now + Lab |
| **데이터** | 정적 JSON | Supabase 실시간 DB |
| **참여** | 일방향 정보 제공 | Bounty + Discussion + Newsletter |
| **투명성** | 비공개 | Open Metrics (Status 페이지) |

## 🚀 빠른 시작

```bash
# 1. 저장소 클론
git clone https://github.com/IDEA-on-Action/idea-on-action.git
cd idea-on-action

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정 (.env.local)
cp .env.example .env.local
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 설정

# 4. 개발 서버 실행
npm run dev  # http://localhost:5173
```

## 📋 주요 기능 (v1.8.0)

### 🎨 현대적인 UI/UX
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화
- **다크모드 지원**: 시스템 설정에 따른 자동 전환
- **PWA 지원**: 오프라인 지원, 설치 프롬프트
- **i18n**: 한국어/영어 지원 (375+ 번역 키)

### 📊 고급 분석 대시보드 (Phase 14)
- **사용자 행동 분석**: GA4 이벤트 15개, 퍼널, 이탈률
- **매출 차트 & KPI**: 일/주/월 매출, 서비스별, 6개 KPI, CSV 내보내기
- **실시간 대시보드**: Supabase Realtime, 자동 새로고침, Presence API

### 🤖 AI & 실시간 기능 (Phase 13)
- **통합 검색**: 서비스, 블로그, 공지사항 통합 검색
- **AI 챗봇**: OpenAI GPT-3.5, 스트리밍 응답
- **알림 시스템**: Supabase Realtime, Resend 이메일

### 🛒 전자상거래 (Phase 9-11)
- **장바구니**: Zustand 상태 관리
- **주문 관리**: 결제 프로세스, 상태 추적
- **결제 게이트웨이**: Kakao Pay, Toss Payments
- **CMS**: 블로그, 공지사항, SEO 최적화

### 🔒 인증 & 보안
- **OAuth**: Google, GitHub, Kakao, Microsoft, Apple
- **2FA**: TOTP, 백업 코드, 브루트 포스 방지
- **RBAC**: 역할 기반 접근 제어, 감사 로그

### 📈 성능 & 모니터링
- **Code Splitting**: 62.5% 번들 감소
- **Sentry**: 에러 추적, Replay
- **Google Analytics 4**: 페이지뷰, 이벤트 추적
- **Lighthouse**: 90+ 점 유지

## 📁 프로젝트 구조

```
src/
├── components/           # React 컴포넌트
│   ├── admin/           # 관리자 컴포넌트
│   ├── analytics/       # 분석 컴포넌트
│   ├── chat/            # AI 챗봇
│   ├── ecommerce/       # 전자상거래
│   ├── notifications/   # 알림 시스템
│   ├── ui/              # shadcn/ui 컴포넌트
│   └── shared/          # 공유 컴포넌트
├── hooks/               # 커스텀 훅
├── pages/               # 페이지 컴포넌트
├── lib/                 # 유틸리티 함수
└── i18n/                # 국제화 (한국어/영어)

tests/                   # 292+ 테스트 케이스
├── e2e/                 # E2E 테스트 (172개)
├── unit/                # 유닛 테스트 (92개)
└── fixtures/            # 테스트 픽스처

docs/
├── guides/              # 개발 가이드
├── project/             # 프로젝트 문서
└── archive/             # 히스토리 보관
```

## 🛠️ 기술 스택

### Core
- **Vite** 5.4.19 - 빌드 도구
- **React** 18.x - UI 라이브러리
- **TypeScript** 5.x - 타입 안정성
- **Tailwind CSS** 3.4.x - 유틸리티 CSS
- **Supabase** 2.x - Backend as a Service

### State Management
- **React Query** - 서버 상태 관리
- **Zustand** - 클라이언트 상태 관리
- **React Hook Form** - 폼 관리

### UI & Design
- **shadcn/ui** - UI 컴포넌트 라이브러리
- **Radix UI** - Headless UI primitives
- **Lucide Icons** - 아이콘 라이브러리
- **Recharts** - 차트 라이브러리

### DevOps & Monitoring
- **Sentry** - 에러 추적
- **Google Analytics 4** - 사용자 분석
- **Vite PWA** - Progressive Web App
- **Playwright** - E2E 테스트
- **Vitest** - 유닛 테스트

## 🧪 테스트

```bash
# 단위 테스트 (92개)
npm run test:unit

# E2E 테스트 (172개)
npm run test:e2e

# 테스트 커버리지
npm run test:coverage

# Lighthouse CI
npm run lighthouse
```

## 🚀 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview

# 린트 검사
npm run lint
```

## 📚 문서

### 개발 가이드
- [프로젝트 구조](docs/guides/project-structure.md)
- [디자인 시스템](docs/guides/design-system/README.md)
- [배포 가이드](docs/guides/deployment/)
- [테스트 전략](docs/testing/testing-strategy.md)

### 프로젝트 관리
- **[CLAUDE.md](CLAUDE.md)** - Claude 협업 문서
- **[project-todo.md](project-todo.md)** - 할 일 목록
- **[version2.0 계획.md](version2.0%20계획.md)** - Version 2.0 로드맵
- [로드맵](docs/project/roadmap.md)
- [변경 로그](docs/project/changelog.md)

## 🌱 Version 2.0 계획

> **💡 From:** 소개용 정적 웹사이트
> **🚀 To:** 실시간 커뮤니티형 프로덕트 스튜디오

### 3 Sprint Plan (3주)

**🏁 Sprint 1 — Structure & Static Data (Week 1)**
- React Router 라우팅 확장
- 정적 데이터(JSON) 생성
- 기존 컴포넌트 재활용

**⚙️ Sprint 2 — Supabase Integration & Community (Week 2)**
- Supabase 스키마 생성
- Giscus 댓글 임베드
- Work with Us 폼 + Webhook

**🔄 Sprint 3 — Automation & Open Metrics (Week 3)**
- 주간 리캡 자동 생성
- /status 페이지 (오픈 메트릭스)
- 이벤트 트래킹

### 새로운 페이지
- `/about` - 회사 소개
- `/roadmap` - Quarterly 목표 + 진행률
- `/portfolio` - Case Study 목록
- `/now` - 최근 활동 로그
- `/lab` - 실험 / Bounty / Prototype
- `/community` - Giscus 기반 토론
- `/work-with-us` - 의뢰 / 협업
- `/status` - Open Metrics

자세한 내용은 **[version2.0 계획.md](version2.0%20계획.md)**를 참조하세요.

## 📊 현재 상태 (v1.8.0)

### 빌드 통계
```
Total (gzip): ~602 kB (30개 chunk)
Build Time: 31.62s
PWA: 43 entries (2917.64 KiB) cached
```

### 테스트 통계
- **E2E**: 172개
- **Unit**: 92개
- **Visual**: 28개
- **Total**: 292+ 테스트 케이스

### 성능 지표
- **Lighthouse 성능**: 90+
- **접근성**: 95+
- **SEO**: 100
- **PWA**: 100

## 🚀 배포

프로젝트는 **Vercel**에서 자동 배포됩니다.

- **Production**: https://www.ideaonaction.ai/
- **Branch**: main → production
- **CI/CD**: GitHub Actions

## 🤝 기여하기

1. 이슈 생성
2. 기능 브랜치 생성 (`feature/your-feature`)
3. 변경사항 커밋
4. 테스트 작성
5. Pull Request 생성

자세한 내용은 [기여 가이드](CONTRIBUTING.md)를 참조하세요.

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 Credits

- [React](https://react.dev/) - UI 라이브러리
- [Vite](https://vitejs.dev/) - 빌드 도구
- [Supabase](https://supabase.com/) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com/) - CSS 프레임워크
- [shadcn/ui](https://ui.shadcn.com/) - UI 컴포넌트
- [Sentry](https://sentry.io/) - 에러 추적
- [Recharts](https://recharts.org/) - 차트 라이브러리

## 📞 연락처

- **대표**: 서민원
- **이메일**: sinclairseo@gmail.com
- **웹사이트**: https://www.ideaonaction.ai/
- **GitHub**: https://github.com/IDEA-on-Action

---

**KEEP AWAKE, LIVE PASSIONATE** 🚀

*생각을 멈추지 않고, 행동으로 옮기는 회사*