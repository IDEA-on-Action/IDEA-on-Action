# IDEA on Action 프로젝트 개발 문서

> Claude와의 개발 협업을 위한 프로젝트 핵심 문서

**현재 버전**: 2.21.0 | **상태**: ✅ Production | **방법론**: SSDD
**변경 내역**: [docs/archive/CLAUDE-history-november-2025.md](docs/archive/CLAUDE-history-november-2025.md)

---

## 🎯 개발 방법론

**SSDD (Skillful Spec-Driven Development)** = SDD + Claude Skills Integration

| Skill | 용도 | 산출물 |
|-------|------|--------|
| xlsx | 데이터 분석 | Excel, 차트 |
| docx | 문서 생성 | RFP, 보고서 |
| pptx | 프레젠테이션 | 슬라이드 |
| RAG | 지식 검색 | 하이브리드 검색 |
| MCP | 서비스 연동 | Minu 통합 |

**상세 문서**: [docs/guides/methodology.md](docs/guides/methodology.md)

---

## 📜 프로젝트 헌법

핵심 가치: 사용자 우선, 품질 (테스트 80%+), 성능 (Lighthouse 90+)
기술 원칙: TypeScript Strict Mode, TDD, 컴포넌트 단일 책임

**상세 원칙**: [constitution.md](constitution.md)

---

## 🤖 AI 협업 규칙

### 언어 원칙
- **모든 출력은 한글로 작성**: 코드 주석, 커밋 메시지, 문서, 대화 응답
- **예외**: 코드 변수명, 함수명, 기술 용어는 영문 유지

### 날짜/시간 원칙
- **기준 시간대**: KST (Korea Standard Time, UTC+9)
- **날짜 표기**: YYYY-MM-DD 형식
- **마이그레이션 파일명**: YYYYMMDDHHMMSS 형식 (UTC 기준)

### 컨텍스트 관리
- **태스크마다 새 대화 시작**: 이전 대화의 오염 방지
- **명세 참조로 컨텍스트 제공**: 대화 히스토리 대신 명세 파일 공유
- **관련 파일만 공유**: 전체 코드베이스가 아닌 필요한 파일만

### 작업 체크리스트
**작업 전**: 관련 명세 검토, 아키텍처 확인, 작업 분해
**작업 후**: CLAUDE.md 업데이트, project-todo.md 체크, 버그 시 bug-fixes-log.md 기록

### 문서 효율화 원칙
- **중복 금지**: 정보는 한 곳에만 기록, 다른 곳에서는 링크 참조
- **링크 우선**: 상세 내용은 별도 문서로 분리 후 링크
- **헤더 통합**: 버전/상태/방법론 등 메타데이터는 문서 헤더에 통합
- **아카이브 활용**: 히스토리는 `docs/archive/`로 이동, 최신 요약만 유지
- **단일 책임**: 각 문서는 하나의 명확한 목적만 가짐

---

## 🔢 버전 관리

**형식**: Major.Minor.Patch (Semantic Versioning)

| 버전 | 변경 기준 | 승인 |
|------|-----------|------|
| Major (X.0.0) | Breaking Changes | ⚠️ 사용자 승인 필수 |
| Minor (0.X.0) | 새로운 기능 추가 | 자동 |
| Patch (0.0.X) | 버그 수정, Hotfix | 자동 |

```bash
npm run release:patch  # 패치 버전
npm run release:minor  # 마이너 버전
npm run release:major  # 메이저 버전
```

---

## 📋 프로젝트 개요

- **프로젝트명**: IDEA on Action
- **회사명**: 생각과행동 (IdeaonAction)
- **목적**: 아이디어 실험실 & 커뮤니티형 프로덕트 스튜디오
- **슬로건**: KEEP AWAKE, LIVE PASSIONATE
- **웹사이트**: https://www.ideaonaction.ai/
- **대표자**: 서민원 (sinclairseo@gmail.com)

---

## 🛠️ 기술 스택

**Core**: Vite 5.4, React 18, TypeScript 5, Tailwind CSS 3.4, Supabase 2
**UI**: shadcn/ui, Radix UI, Lucide Icons
**State**: React Query, React Hook Form, Zustand
**Routing**: React Router DOM, i18next

---

## 📁 프로젝트 구조

```
idea-on-action/
├── spec/, plan/, tasks/   # SDD 명세
├── src/                   # React 구현
├── docs/                  # 문서
├── supabase/              # DB 마이그레이션
└── tests/                 # 테스트
```

**상세 구조**: [docs/guides/project-structure.md](docs/guides/project-structure.md)

---

## 🚀 빠른 시작

```bash
npm install
npm run dev  # http://localhost:8080
```

**환경 변수** (`.env.local`):
```
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_KEY]
```

---

## 📊 현재 상태

- **총 테스트**: 292개 (E2E 172, Unit 92, Visual 28)
- **린트 경고**: 4개
- **번들 크기**: ~338 kB gzip

---

## 📚 주요 문서

| 문서 | 경로 |
|------|------|
| 문서 인덱스 | [docs/README.md](docs/README.md) |
| 할 일 목록 | [project-todo.md](project-todo.md) |
| 로드맵 | [docs/project/roadmap.md](docs/project/roadmap.md) |
| 변경 로그 | [docs/project/changelog.md](docs/project/changelog.md) |
| 개발 방법론 | [docs/guides/methodology.md](docs/guides/methodology.md) |

---

## 📝 참고사항

- **Import Alias**: `@/` → `src/`
- **코드 컨벤션**: PascalCase (컴포넌트), camelCase (함수/훅), kebab-case (파일)
- **문서 관리**: [docs/DOCUMENT_MANAGEMENT.md](docs/DOCUMENT_MANAGEMENT.md)

---

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files.

# Context Engineering
당신은 최신 스택이 빠르게 변하는 프로젝트에서 작업하는 AI 개발자입니다.

1. **환경 파악**: package.json, 구성 파일을 읽고 프레임워크·라이브러리 버전 확인
2. **버전 차이 대응**: 릴리스 노트 참조, 최신 권장사항 확인
3. **설계 시 체크**: 네트워크 리소스, 인증/데이터 레이어 호환성 고려
4. **구현 중 검증**: 린트/타입/빌드 명령 실행, 예상 오류 미리 보고
5. **결과 전달**: 버전 차이 반영 사항, 추가 확인 항목 명시
