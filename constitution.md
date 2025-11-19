# IDEA on Action 프로젝트 헌법 (Constitution)

> **협상 불가능한 원칙 (Non-Negotiable Principles)**
>
> 모든 의사결정은 이 원칙에 부합해야 합니다.

**작성일**: 2025-11-13
**버전**: 1.0.0
**상태**: 🔒 Locked (변경 시 팀 합의 필요)

---

## 📜 서문 (Preamble)

IDEA on Action 프로젝트는 "생각을 멈추지 않고, 행동으로 옮기는" 철학을 바탕으로, 아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오를 구축합니다. 이 헌법은 프로젝트의 정체성과 방향성을 보존하기 위한 불변의 기준입니다.

---

## 🎯 핵심 가치 (Core Values)

### 1. 사용자 우선 (User First)
- **원칙**: 모든 기능은 사용자 가치 제공이 목적
- **실천**:
  - 기능 추가 전 "이것이 사용자에게 어떤 가치를 제공하는가?" 질문
  - 사용자 피드백을 최우선으로 반영
  - 복잡한 기능보다 단순하고 직관적인 UX 선택
- **측정**: 사용자 만족도 설문, NPS 점수

### 2. 투명성 (Transparency)
- **원칙**: 의사결정 과정과 이유를 문서화
- **실천**:
  - 모든 주요 결정은 명세(spec/)에 기록
  - 변경 이유와 맥락을 커밋 메시지에 포함
  - 오픈 메트릭스 공개 (Status 페이지)
- **측정**: 문서화율, 의사결정 기록 추적

### 3. 품질 (Quality)
- **원칙**: 테스트 커버리지 80% 이상 유지
- **실천**:
  - TDD (Test-Driven Development) 적용
  - 모든 PR은 테스트 통과 필수
  - 린트/타입 에러 0개 유지
- **측정**: 코드 커버리지, 버그 발생률

### 4. 접근성 (Accessibility)
- **원칙**: WCAG 2.1 AA 준수
- **실천**:
  - 모든 인터랙티브 요소에 키보드 네비게이션 지원
  - 스크린 리더 테스트 필수
  - 색상 대비 비율 4.5:1 이상
- **측정**: Lighthouse Accessibility 점수 95+

### 5. 성능 (Performance)
- **원칙**: Lighthouse 점수 90+ 유지
- **실천**:
  - Code Splitting 적용
  - 이미지 최적화 (WebP, lazy loading)
  - Core Web Vitals 준수
- **측정**: Lighthouse CI, Core Web Vitals 지표

---

## 🛠️ 기술 원칙 (Technical Principles)

### 1. TypeScript Strict Mode
- **원칙**: 엄격한 타입 체크
- **설정**:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "strictNullChecks": true,
      "noImplicitAny": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true
    }
  }
  ```
- **예외**: 서드파티 라이브러리 타입 정의 불가 시 @ts-ignore 허용 (주석 필수)

### 2. TDD (Test-Driven Development)
- **원칙**: 테스트 먼저, 구현 나중
- **사이클**:
  1. **Red**: 실패하는 테스트 작성
  2. **Green**: 최소한의 코드로 테스트 통과
  3. **Refactor**: 코드 개선
- **예외**: 프로토타입 검증 시 TDD 생략 가능 (이후 리팩토링 시 적용)

### 3. 컴포넌트 단일 책임
- **원칙**: 한 가지 역할만 수행
- **기준**:
  - 컴포넌트는 200줄 이하 권장
  - 하나의 컴포넌트는 하나의 추상화 레벨
  - 비즈니스 로직은 훅으로 분리
- **예외**: 복잡한 폼 컴포넌트는 300줄까지 허용

### 4. 명시적 에러 처리
- **원칙**: try-catch 또는 Error Boundary
- **실천**:
  - 모든 비동기 작업은 에러 처리 필수
  - 사용자에게 의미 있는 에러 메시지 표시
  - 에러는 Sentry로 추적
- **예외**: 없음 (모든 에러는 처리되어야 함)

### 5. 반응형 디자인
- **원칙**: 모바일 퍼스트
- **브레이크포인트**:
  - Mobile: 0-640px
  - Tablet: 641-1024px
  - Desktop: 1025px+
- **예외**: 관리자 페이지는 Desktop 우선 가능

---

## 🎨 코드 스타일 (Code Style)

### 네이밍 규칙

#### 1. PascalCase
- **사용**: 컴포넌트, 타입, 인터페이스
- **예시**:
  ```typescript
  // 컴포넌트
  const HeaderComponent = () => { ... }

  // 타입
  type UserProfile = { ... }

  // 인터페이스
  interface ServiceData { ... }
  ```

#### 2. camelCase
- **사용**: 함수, 변수, 훅
- **예시**:
  ```typescript
  // 함수
  const fetchUserData = () => { ... }

  // 변수
  const userId = "123"

  // 훅
  const useAuth = () => { ... }
  ```

#### 3. kebab-case
- **사용**: 파일명, CSS 클래스
- **예시**:
  ```
  // 파일명
  header-component.tsx
  use-auth.ts

  // CSS 클래스
  .glass-card { ... }
  .hover-lift { ... }
  ```

#### 4. UPPER_SNAKE_CASE
- **사용**: 상수
- **예시**:
  ```typescript
  const MAX_FILE_SIZE = 5 * 1024 * 1024
  const API_BASE_URL = "https://api.example.com"
  ```

### Import 순서
```typescript
// 1. React
import React, { useState, useEffect } from 'react'

// 2. 외부 라이브러리
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

// 3. 내부 모듈
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

// 4. 스타일
import './styles.css'
```

---

## 📝 문서화 원칙 (Documentation Principles)

### 1. 명세 우선
- **원칙**: 구현 전 명세 작성
- **프로세스**: Specify → Plan → Tasks → Implement
- **예외**: 긴급 버그 수정 시 사후 명세 작성 허용 (24시간 내)

### 2. 변경 시 명세 먼저
- **원칙**: 코드 변경 전 명세 업데이트
- **실천**:
  - spec/ 파일 먼저 수정
  - plan/ 파일 업데이트
  - 코드 구현
  - tasks/ 파일 체크
- **예외**: 없음

### 3. 커밋 메시지
- **원칙**: Conventional Commits 준수
- **형식**:
  ```
  <type>(<scope>): <subject>

  <body>

  <footer>
  ```
- **타입**:
  - `feat`: 새 기능
  - `fix`: 버그 수정
  - `docs`: 문서 변경
  - `style`: 코드 포맷팅
  - `refactor`: 리팩토링
  - `test`: 테스트 추가
  - `chore`: 빌드/설정 변경

### 4. 코드 주석
- **원칙**: Why, not What
- **예시**:
  ```typescript
  // ❌ Bad: What
  // 사용자 ID를 가져온다
  const userId = user.id

  // ✅ Good: Why
  // 로그인 세션 검증을 위해 사용자 ID가 필요
  const userId = user.id
  ```

### 5. README
- **원칙**: 프로젝트 시작 가이드 포함
- **필수 섹션**:
  - Quick Start
  - 환경 변수 설정
  - 빌드 및 배포
  - 기여 가이드

### 6. 문서 및 SQL 관리 규칙
- **원칙**: 통합 관리 체계 준수
- **실천**:
  - 모든 문서는 `docs/` 아래 통합
  - SQL 스크립트는 `scripts/sql/` 또는 `supabase/migrations/`
  - 단일 진실 소스(SSoT): 정보 중복 금지, 참조 링크 사용
  - 명명 규칙: kebab-case (문서), 타임스탬프 (공식 마이그레이션)
  - 문서 생명주기: 생성 → 활성 → 완료 → 보관 (docs/archive/)
- **필수 업데이트**:
  - CLAUDE.md (프로젝트 현황)
  - project-todo.md (할 일 목록)
  - docs/project/changelog.md (변경 로그)
- **상세 가이드**: [문서 관리 규칙](docs/DOCUMENT_MANAGEMENT.md)

---

## 🔒 보안 원칙 (Security Principles)

### 1. 환경 변수
- **원칙**: 민감한 정보는 환경 변수로 관리
- **실천**:
  - `.env.local` 파일 사용 (gitignore)
  - `VITE_` 접두사로 클라이언트 노출 명시
  - 서버 전용 키는 백엔드에서만 사용
- **예외**: 없음

### 2. RLS (Row Level Security)
- **원칙**: Supabase RLS 정책 필수
- **실천**:
  - 모든 테이블에 RLS 적용
  - SELECT/INSERT/UPDATE/DELETE 정책 분리
  - 관리자 권한 검증
- **예외**: 없음

### 3. XSS/CSRF 방지
- **원칙**: 사용자 입력은 항상 검증 및 이스케이프
- **실천**:
  - Zod로 입력 검증
  - DOMPurify로 HTML 새니타이즈
  - CSRF 토큰 사용
- **예외**: 없음

---

## 🚫 금지 사항 (Prohibitions)

### 1. 하드코딩
- ❌ API 키, 비밀번호 하드코딩
- ❌ 환경별 설정 하드코딩
- ❌ 매직 넘버 (의미 없는 숫자)

### 2. 타입 우회
- ❌ `any` 타입 남발
- ❌ `@ts-ignore` 남용
- ❌ 타입 단언(as) 남용

### 3. 부작용(Side Effects)
- ❌ 컴포넌트 렌더링 중 상태 변경
- ❌ useEffect 무한 루프
- ❌ 전역 상태 직접 변경

### 4. 테스트 회피
- ❌ 테스트 없는 PR
- ❌ 테스트 skip 남용
- ❌ 커버리지 80% 미만

---

## 🔄 변경 프로세스 (Amendment Process)

### Constitution 수정 절차
1. **제안**: GitHub Issue로 수정 제안
2. **토론**: 팀 회의에서 논의 (최소 3일)
3. **투표**: 팀원 2/3 이상 찬성 필요
4. **승인**: constitution.md 업데이트
5. **공지**: CLAUDE.md에 변경 로그 기록

### 긴급 수정
- **조건**: 보안 취약점 또는 법적 요구사항
- **절차**: 즉시 수정 후 사후 승인

---

## 📚 참고 자료 (References)

- [SDD (Spec-Driven Development) Guide](https://github.com/github/spec-kit)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Best Practices](https://react.dev/learn/thinking-in-react)

---

**Last Updated**: 2025-11-13
**Version**: 1.0.0
**Status**: 🔒 Locked
