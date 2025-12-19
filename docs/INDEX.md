# IDEA on Action 문서 인덱스

**마지막 업데이트**: 2025-12-19
**프로젝트 버전**: 2.39.0
**개발 방법론**: SSDD (Skillful Spec-Driven Development)

---

## 🎯 SSDD 문서 체계

SSDD 방법론에 따른 핵심 문서 디렉토리:

```
idea-on-action/
├── spec/           # Stage 1: 명세 (무엇을/왜)
├── plan/           # Stage 2: 계획 (어떻게)
├── tasks/          # Stage 3: 작업 분해 (쪼갠 일감)
├── src/            # Stage 4: 구현 (코드)
└── docs/           # 참조 문서
```

### Stage 1: Specify (`/spec/`)

| 문서 | 설명 |
|------|------|
| [requirements.md](../spec/requirements.md) | 사용자 요구사항 |
| [acceptance-criteria.md](../spec/acceptance-criteria.md) | 성공 기준 |
| [constraints.md](../spec/constraints.md) | 비기능 요구사항 |
| [events-package-spec.md](../spec/events-package-spec.md) | 이벤트 패키지 명세 |

### Stage 2: Plan (`/plan/`)

| 문서 | 설명 |
|------|------|
| [architecture.md](../plan/architecture.md) | 시스템 아키텍처 |
| [tech-stack.md](../plan/tech-stack.md) | 기술 스택 |
| [implementation-strategy.md](../plan/implementation-strategy.md) | 구현 전략 |

### Stage 3: Tasks (`/tasks/`)

| 문서 | 설명 |
|------|------|
| [sprint-1.md](../tasks/sprint-1.md) | Sprint 1 작업 |
| [sprint-2.md](../tasks/sprint-2.md) | Sprint 2 작업 |
| [cms-backlog.md](../tasks/cms-backlog.md) | CMS 백로그 |

---

## 📚 문서 카테고리

### 프로젝트 핵심 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| CLAUDE.md | [CLAUDE.md](../CLAUDE.md) | 프로젝트 메인 문서 |
| 할 일 목록 | [project-todo.md](../project-todo.md) | 작업 목록 |
| 로드맵 | [roadmap.md](project/roadmap.md) | 장기 계획 |
| 변경 로그 | [changelog.md](project/changelog.md) | 버전별 변경사항 |
| 헌법 | [constitution.md](../constitution.md) | 핵심 원칙 |

### 가이드 문서 (`/docs/guides/`)

| 카테고리 | 설명 |
|---------|------|
| [methodology.md](guides/methodology.md) | SSDD 개발 방법론 |
| [cms/](guides/cms/) | CMS 관리자 가이드 (9개) |
| [database/](guides/database/) | 데이터베이스 가이드 (8개) |
| [deployment/](guides/deployment/) | 배포 가이드 (9개) |
| [testing/](guides/testing/) | 테스트 가이드 (6개) |

### API 문서 (`/docs/api/`)

| 문서 | 설명 |
|------|------|
| [hooks/](api/hooks/) | React 훅 문서 (7개, 55+ 훅) |

---

## 🚀 빠른 시작

### 개발자

1. [CLAUDE.md](../CLAUDE.md) - 프로젝트 개요
2. [methodology.md](guides/methodology.md) - SSDD 방법론
3. [project-todo.md](../project-todo.md) - 현재 작업

### 관리자

1. [Admin 종합 가이드](guides/cms/admin-guide.md)
2. [Portfolio 관리](guides/cms/admin-portfolio-guide.md)

### DevOps

1. [배포 체크리스트](guides/deployment/cms-phase4-deployment-checklist.md)
2. [CI/CD 통합](guides/testing/ci-cd-integration.md)

---

## 📁 아카이브

과거 문서는 `/docs/archive/`에 보관됩니다.

| 아카이브 | 설명 |
|---------|------|
| [changelog-2025-november.md](archive/changelog-2025-november.md) | 11월 변경 로그 |
| [completed-todos-v1.8.0-v2.0.0.md](archive/completed-todos-v1.8.0-v2.0.0.md) | 완료된 TODO |
| [CLAUDE-history-november-2025.md](archive/CLAUDE-history-november-2025.md) | CLAUDE.md 히스토리 |

---

## 🔗 관련 문서

- [DOCUMENT_MANAGEMENT.md](DOCUMENT_MANAGEMENT.md) - 문서 관리 규칙
- [README.md](README.md) - 문서 가이드

---

**Last Updated**: 2025-12-19
**Version**: v2.39.0
