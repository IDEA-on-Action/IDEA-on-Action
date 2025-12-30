# 🌱 IDEA on Action

> **"생각을 멈추지 않고, 행동으로 옮기는 회사"**

아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/IDEA-on-Action/IDEA-on-Action/releases/tag/v3.0.0)
[![Production](https://img.shields.io/badge/production-live-brightgreen.svg)](https://www.ideaonaction.ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/IDEA-on-Action/IDEA-on-Action/actions)

## 📖 소개

IDEA on Action은 단순한 소개 웹사이트를 넘어, **실시간으로 상호작용하는 커뮤니티형 프로덕트 스튜디오**입니다.

**핵심 루프**: 아이디어 → 실험 → 결과공유 → 참여 → 다음 아이디어

### ✨ Version 3.0 주요 변화

| 구분 | v2.x | v3.0 |
|------|------|------|
| **Backend** | Supabase Edge Functions | Cloudflare Workers (Hono) |
| **Database** | Supabase PostgreSQL | Cloudflare D1 (SQLite) |
| **Storage** | Supabase Storage | Cloudflare R2 |
| **Realtime** | Supabase Realtime | Durable Objects |
| **Hosting** | Vercel | Cloudflare Pages |

#### 🆕 v3.0 마이그레이션 성과

| 항목 | 수치 |
|------|------|
| Workers API 핸들러 | 31개 |
| D1 테이블 | 80개 |
| 삭제된 레거시 코드 | 480+ 파일, 120,000+ 줄 |
| Worker 크기 | 672.71 KiB (gzip 115.68 KiB) |

#### 🌐 주요 페이지

1. **[About](https://www.ideaonaction.ai/about)** - 우리는 어떤 회사인가
2. **[Roadmap](https://www.ideaonaction.ai/roadmap)** - Quarterly 목표 + 진행률
3. **[Portfolio](https://www.ideaonaction.ai/portfolio)** - 프로젝트 Case Study
4. **[Now](https://www.ideaonaction.ai/now)** - 최근 활동 로그
5. **[Lab](https://www.ideaonaction.ai/lab)** - 실험 & Bounty
6. **[Community](https://www.ideaonaction.ai/community)** - Giscus 토론
7. **[Work-with-Us](https://www.ideaonaction.ai/work-with-us)** - 협업 제안
8. **[Status](https://www.ideaonaction.ai/status)** - 오픈 메트릭스

## 🚀 빠른 시작

```bash
# 1. 저장소 클론
git clone https://github.com/IDEA-on-Action/IDEA-on-Action.git
cd IDEA-on-Action

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정 (.env.local)
cp .env.example .env.local
# VITE_WORKERS_API_URL 설정

# 4. 개발 서버 실행
npm run dev  # http://localhost:8080
```

## 📋 주요 기능 (v3.0.0)

### 🎨 현대적인 UI/UX
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화
- **다크모드 지원**: 시스템 설정에 따른 자동 전환
- **PWA 지원**: 오프라인 지원, 설치 프롬프트
- **i18n**: 한국어/영어 지원 (375+ 번역 키)

### 📊 고급 분석 대시보드
- **사용자 행동 분석**: GA4 이벤트 15개, 퍼널, 이탈률
- **매출 차트 & KPI**: 일/주/월 매출, 서비스별, 6개 KPI, CSV 내보내기
- **실시간 대시보드**: Durable Objects, 자동 새로고침

### 🤖 AI & 실시간 기능
- **통합 검색**: 서비스, 블로그, 공지사항 통합 검색
- **AI 챗봇**: Claude AI 스트리밍 응답
- **알림 시스템**: Cloudflare Workers, Resend 이메일

### 🛒 전자상거래
- **장바구니**: Zustand 상태 관리
- **주문 관리**: 결제 프로세스, 상태 추적
- **결제 게이트웨이**: Toss Payments (빌링키, 단건결제)
- **구독 관리**: 정기결제, 플랜 변경

### 🔒 인증 & 보안
- **OAuth**: Google, GitHub, Kakao, Microsoft, Apple
- **2FA**: TOTP, 백업 코드, 브루트 포스 방지
- **RBAC**: 역할 기반 접근 제어, 감사 로그

### 📈 성능 & 모니터링
- **Code Splitting**: 최적화된 번들 분리
- **Sentry**: 에러 추적, Replay
- **Google Analytics 4**: 페이지뷰, 이벤트 추적
- **Lighthouse**: 90+ 점 유지

## 📁 프로젝트 구조

```
src/
├── components/           # React 컴포넌트
│   ├── admin/           # 관리자 컴포넌트
│   ├── analytics/       # 분석 컴포넌트
│   ├── ai-chat/         # AI 챗봇
│   ├── ecommerce/       # 전자상거래
│   ├── notifications/   # 알림 시스템
│   ├── ui/              # shadcn/ui 컴포넌트
│   └── shared/          # 공유 컴포넌트
├── hooks/               # 커스텀 훅
├── pages/               # 페이지 컴포넌트
├── lib/                 # 유틸리티 함수
└── i18n/                # 국제화 (한국어/영어)

cloudflare-workers/      # Cloudflare Workers API
├── src/
│   ├── handlers/        # API 핸들러 (31개)
│   ├── durable-objects/ # Durable Objects
│   └── lib/             # 공용 유틸리티
└── migrations/          # D1 마이그레이션

tests/                   # 7300+ 테스트 케이스
├── e2e/                 # E2E 테스트 (5429개)
├── unit/                # 유닛 테스트 (1880개)
└── fixtures/            # 테스트 픽스처

docs/
├── guides/              # 개발 가이드
├── project/             # 프로젝트 문서
└── archive/             # 히스토리 보관
```

## 🛠️ 기술 스택

### Frontend
- **Vite** 5.4 - 빌드 도구
- **React** 18 - UI 라이브러리
- **TypeScript** 5 - 타입 안정성
- **Tailwind CSS** 3.4 - 유틸리티 CSS

### Backend (Cloudflare)
- **Cloudflare Workers** - 서버리스 API
- **Hono** - 경량 웹 프레임워크
- **Cloudflare D1** - SQLite 데이터베이스
- **Cloudflare R2** - 오브젝트 스토리지
- **Durable Objects** - 실시간/상태 관리

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
# 단위 테스트 (1880개)
npm run test:unit

# E2E 테스트 (5429개)
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

### 📍 전체 문서 인덱스
- **[전체 문서 인덱스](docs/INDEX.md)** - 문서 목록

### 핵심 문서
- **[CLAUDE.md](CLAUDE.md)** - Claude 협업 문서
- **[project-todo.md](project-todo.md)** - 할 일 목록
- [로드맵](docs/project/roadmap.md)
- [변경 로그](docs/project/changelog.md)

### 개발 가이드
- [프로젝트 구조](docs/guides/project-structure.md)
- [디자인 시스템](docs/guides/design-system/README.md)
- [배포 가이드](docs/guides/deployment/)
- [API 문서](docs/api/hooks/) - React 훅 55개

## 📊 현재 상태 (v3.0.0)

### 빌드 통계
```
Bundle Size: ~1,636 kB (PWA 11 entries)
Build Time: ~3분 30초
Lint Warnings: 0
```

### 테스트 통계
- **Unit**: 1,880개
- **E2E**: 5,429개
- **Total**: 7,300+ 테스트 케이스

### 성능 지표
- **Lighthouse 성능**: 90+
- **접근성**: 95+
- **SEO**: 100
- **PWA**: 100

## 🚀 배포

프로젝트는 **Cloudflare Pages**에서 자동 배포됩니다.

- **Production**: https://www.ideaonaction.ai/
- **API**: https://api.ideaonaction.ai/
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
- [Cloudflare](https://cloudflare.com/) - Edge Computing Platform
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
