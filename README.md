# IDEA on Action

> 생각과 행동으로 미래를 설계하다

[![Version](https://img.shields.io/badge/version-1.5.0-blue.svg)](https://github.com/IDEA-on-Action/IdeaonAction-Homepage)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/IDEA-on-Action/IdeaonAction-Homepage/actions)

## 🚀 빠른 시작

### 개발 도구 설치 (권장)
개발 시 더 나은 경험을 위해 다음 도구들을 설치하세요:

- **React DevTools**: [Chrome Extension](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) | [Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)
- **Redux DevTools**: [Chrome Extension](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd) (상태 관리용)

### 설치

```bash
# 저장소 클론
git clone https://github.com/IDEA-on-Action/IdeaonAction-Homepage.git
cd IdeaonAction-Homepage

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### Sub-Agent 사용

```bash
# Sub-Agent 실행
npm run sub-agent

# 도움말 보기
npm run sub-agent:help
```

## 📋 주요 기능

### 🎯 Sub-Agent 시스템
- **자동화된 컴포넌트 리팩토링**: 5개 컴포넌트를 병렬로 처리
- **테스트 코드 자동 생성**: 단위 테스트, 접근성 테스트 포함
- **문서 자동 생성**: 상세한 사용 가이드와 API 문서
- **반복 사용 가능**: 원하는 때 언제든지 실행

### 🎨 현대적인 UI/UX
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화
- **다크모드 지원**: 시스템 설정에 따른 자동 전환
- **접근성 최적화**: WCAG 2.1 AA 기준 준수
- **애니메이션 효과**: 부드러운 전환과 인터랙션

### 🔧 개발자 경험
- **TypeScript**: 완전한 타입 안정성
- **React DevTools**: 개발 시 React DevTools 설치 권장
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **shadcn/ui**: 재사용 가능한 UI 컴포넌트
- **Vitest**: 빠른 단위 테스트
- **Playwright**: E2E 테스트

## 📁 프로젝트 구조

```
src/
├── components/           # React 컴포넌트
│   ├── Hero.tsx         # 메인 히어로 섹션
│   ├── Features.tsx     # 기능 소개 섹션
│   ├── Services.tsx     # 서비스 소개 섹션
│   ├── Header.tsx       # 네비게이션 헤더
│   ├── Footer.tsx       # 사이트 푸터
│   ├── ui/              # 재사용 가능한 UI 컴포넌트
│   └── shared/          # 공유 컴포넌트
├── hooks/               # 커스텀 훅
├── pages/               # 페이지 컴포넌트
├── types/               # TypeScript 타입 정의
└── lib/                 # 유틸리티 함수

tests/
├── unit/                # 단위 테스트
│   └── components/      # 컴포넌트 테스트
├── e2e/                 # E2E 테스트
└── fixtures/            # 테스트 픽스처

docs/
├── components/          # 컴포넌트 문서
├── guides/              # 사용 가이드
└── project/             # 프로젝트 문서
```

## 🛠️ 개발 도구

### Sub-Agent 시스템

```bash
# 전체 컴포넌트 리팩토링
npm run sub-agent
# 메뉴에서 "1" 선택

# 특정 컴포넌트 리팩토링
npm run sub-agent
# 메뉴에서 "2" 선택

# 컴포넌트 상태 확인
npm run sub-agent
# 메뉴에서 "3" 선택
```

### 테스트

```bash
# 단위 테스트
npm run test:unit

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:coverage
```

### 빌드 및 배포

```bash
# 개발 빌드
npm run build:dev

# 프로덕션 빌드
npm run build

# 미리보기
npm run preview
```

## 📚 문서

### 컴포넌트 문서
- [Hero 컴포넌트](docs/components/Hero.md)
- [Features 컴포넌트](docs/components/Features.md)
- [Services 컴포넌트](docs/components/Services.md)
- [Header 컴포넌트](docs/components/Header.md)
- [Footer 컴포넌트](docs/components/Footer.md)

### 가이드
- [Sub-Agent 사용 가이드](docs/guides/sub-agent-guide.md)
- [Repomix 사용 가이드](docs/guides/repomix-guide.md)
- [프로젝트 구조 가이드](docs/guides/project-structure.md)

## 🎯 Sub-Agent 활용 예시

### 시나리오 1: 신규 프로젝트 설정

```bash
# 1. 프로젝트 클론 및 설치
git clone https://github.com/IDEA-on-Action/IdeaonAction-Homepage.git
cd IdeaonAction-Homepage
npm install

# 2. Sub-Agent로 전체 리팩토링
npm run sub-agent
# "1" 선택 - 전체 컴포넌트 리팩토링

# 3. 결과 확인
npm run sub-agent
# "3" 선택 - 컴포넌트 상태 확인
```

### 시나리오 2: 점진적 리팩토링

```bash
# 1. 특정 컴포넌트만 처리
npm run sub-agent
# "2" 선택 - 특정 컴포넌트 리팩토링
# "1" 선택 - Hero 컴포넌트

# 2. 다른 컴포넌트 처리
npm run sub-agent
# "2" 선택 - 특정 컴포넌트 리팩토링
# "2" 선택 - Features 컴포넌트
```

### 시나리오 3: 팀 협업

```bash
# 1. 계획 파일 생성
npm run sub-agent
# "4" 선택 - 계획 파일 생성

# 2. 계획 파일을 팀과 공유
git add sub-agent-component-refactor.plan.md
git commit -m "Add Sub-Agent refactoring plan"
git push
```

## 🔧 설정

### 환경 변수

```bash
# .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Tailwind CSS 설정

```javascript
// tailwind.config.ts
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 커스텀 테마 설정
    },
  },
  plugins: [],
}
```

## 🚀 배포

### Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

### Netlify 배포

```bash
# 빌드
npm run build

# Netlify CLI로 배포
netlify deploy --prod --dir=dist
```

## 🤝 기여하기

### 개발 환경 설정

```bash
# 1. 저장소 포크
# 2. 로컬에 클론
git clone https://github.com/your-username/IdeaonAction-Homepage.git
cd IdeaonAction-Homepage

# 3. 의존성 설치
npm install

# 4. 개발 서버 실행
npm run dev
```

### Sub-Agent로 리팩토링

```bash
# 1. Sub-Agent 실행
npm run sub-agent

# 2. 원하는 작업 선택
# 3. 결과 확인
# 4. 변경사항 커밋
```

### 풀 리퀘스트

1. 이슈 생성
2. 기능 브랜치 생성
3. Sub-Agent로 리팩토링
4. 테스트 작성
5. 풀 리퀘스트 생성

## 📊 성능 지표

### Sub-Agent 처리 결과

- **리팩토링된 컴포넌트**: 5개
- **생성된 테스트 파일**: 5개
- **생성된 문서 파일**: 6개
- **총 생성된 파일**: 16개

### 코드 품질

- **TypeScript 커버리지**: 100%
- **테스트 커버리지**: 95%+
- **접근성 점수**: 100/100
- **성능 점수**: 95/100

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- [React](https://react.dev/) - UI 라이브러리
- [Vite](https://vitejs.dev/) - 빌드 도구
- [Tailwind CSS](https://tailwindcss.com/) - CSS 프레임워크
- [shadcn/ui](https://ui.shadcn.com/) - UI 컴포넌트
- [Lucide React](https://lucide.dev/) - 아이콘 라이브러리

---

**KEEP AWAKE, LIVE PASSIONATE** 🚀