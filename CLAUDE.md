# IDEA on Action 프로젝트 개발 문서

> Claude와의 개발 협업을 위한 프로젝트 핵심 문서

**현재 버전**: 3.2.0 | **상태**: ✅ Production | **방법론**: SSDD
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

### 주기적 정리 원칙 (월 1회 권장)

**문서 정리**:

- changelog.md: 1000줄 초과 시 이전 버전 → `docs/archive/changelog-YYYY-MM.md`
- project-todo.md: 완료 항목 3개월 경과 시 → `docs/archive/completed-todos-vX.X.X.md`
- 날짜별 리포트: `docs/archive/daily-summaries/`로 이동

**버전 동기화 체크**:

- package.json, CLAUDE.md, project-todo.md, docs/INDEX.md 버전 일치 확인
- Git 태그와 package.json 버전 일치 확인

**코드 품질 체크**:

- `npm run lint` 경고 0개 유지
- `npm run build` 성공 확인
- 불필요한 `@ts-ignore` → `@ts-expect-error` 변환

---

## 🔧 Sub Agent & Skills 시스템

### 사용 가능한 Sub Agent

| Agent | 용도 | 자동 호출 조건 |
|-------|------|----------------|
| `code-reviewer` | 코드 품질/보안 리뷰 | 코드 변경 후 |
| `debugger` | 에러 분석/수정 | 에러 발생 시 |
| `test-runner` | 테스트 실행/수정 | 코드 변경 후 |
| `data-analyst` | SQL/데이터 분석 | 분석 요청 시 |
| `project-organizer` | 문서/폴더 정리 | "프로젝트 정리해줘" |
| `project-inspector` | 프로젝트 상태 점검 | "프로젝트 상태 점검해줘" |
| `task-planner` | 다음 작업 계획/추천 | "다음 작업 뭐야" |

### 사용 가능한 Skills

| Skill | 용도 | 키워드 |
|-------|------|--------|
| `react-component` | React 컴포넌트/shadcn/ui | component, 컴포넌트, shadcn |
| `commit-helper` | 한글 커밋 메시지 생성 | commit, 커밋 |
| `project-cleanup` | 문서 정리/아카이브 | 정리, cleanup, organize |
| `project-health` | 상태 점검/건강 진단 | 상태, 점검, health, check |
| `task-planning` | 작업 계획/우선순위 분석 | 작업, 계획, 다음, next |

### 관리 및 사용법

- **목록 확인**: `/agents` 명령어
- **명시적 호출**: "code-reviewer로 리뷰해줘"
- **설정 위치**: `.claude/agents/`, `.claude/skills/`

---

## 🔄 Continuous Claude (자율 개발 루프)

Claude Code를 반복 실행하며 자동 PR 생성 → CI 체크 → 병합하는 자율 개발 방식
**참고**: [Continuous Claude](https://github.com/AnandChowdhary/continuous-claude)

### 컨텍스트 연속성

- **[.github/SHARED_TASK_NOTES.md](.github/SHARED_TASK_NOTES.md)**: 반복 간 진행 상황 전달
  - 완료된 작업, 실패한 시도, 다음 우선순위 기록
  - "시도했지만 실패: X → 다음에 Y 시도" 형식

### 적용 시나리오

| 시나리오 | 설정 | 예시 |
|----------|------|------|
| 테스트 커버리지 증가 | `--max-duration 8h` | 80% 달성까지 테스트 추가 |
| 의존성 업데이트 | `--max-cost 25.00` | npm 패키지 업데이트 + 호환성 수정 |
| 대규모 리팩토링 | `--worktree` | 여러 모듈 병렬 현대화 |

### 제약 조건

- **비용 제한**: 단일 세션 $10 이하 권장
- **시간 제한**: 최대 6시간 (CI 부하 고려)
- **반복 제한**: 10회 이하 권장
- **병합 전략**: squash (커밋 히스토리 정리)

### 브랜치 네이밍

- 접두어: `claude/` (예: `claude/add-unit-tests`)
- 자동 생성 브랜치와 수동 브랜치 구분

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

### 버전 동기화 원칙 ⚠️ 필수
**package.json 버전과 GitHub Tag/Release는 반드시 일치해야 합니다.**

| 항목 | 위치 | 동기화 |
|------|------|--------|
| 시스템 버전 | `package.json` → `version` | 기준값 |
| GitHub Tag | `git tag vX.X.X` | 자동 동기화 |
| GitHub Release | `gh release create` | 자동 동기화 |

**버전 업데이트 체크리스트**:
1. `package.json` 버전 변경
2. `git tag -a vX.X.X -m "메시지"` 태그 생성
3. `git push origin vX.X.X` 태그 푸시
4. `gh release create vX.X.X` 릴리스 생성

**자동화 명령**:
```bash
# 버전 범프 + 태그 + 푸시 + 릴리스 (권장)
npm run release:patch && git push --follow-tags && gh release create v$(node -p "require('./package.json').version")
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

**Core**: Vite 5.4, React 18, TypeScript 5, Tailwind CSS 3.4, Cloudflare Workers (D1, R2)
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
VITE_WORKERS_API_URL=https://api.ideaonaction.ai
```

---

## 📊 현재 상태

- **총 테스트**: 7400개+ (Unit 1971, E2E 5429)
- **린트 경고**: 0개
- **번들 크기**: ~1636 kB (PWA 28 entries)

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
