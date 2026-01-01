# GitHub Actions 워크플로우

> CI/CD 워크플로우 가이드

**최종 업데이트**: 2026-01-01

---

## 현재 워크플로우 (2개)

```text
.github/workflows/
├── ci.yml       # CI 파이프라인 (Lint, Test, Deploy)
└── release.yml  # 수동 버전 릴리스
```

---

## CI Pipeline (ci.yml)

### 트리거

- `pull_request`: main, staging, develop
- `push`: main, staging, develop

### Jobs

```text
setup (Build) ─┬─ lint (Lint & Type Check)
               └─ test-unit (Unit Tests)
                        ↓
              deploy-cloudflare (main/staging만)
```

| Job                   | 설명                            | Timeout |
| --------------------- | ------------------------------- | ------- |
| **setup**             | npm ci, build, artifact 업로드  | 10분    |
| **lint**              | ESLint, TypeScript 체크         | 5분     |
| **test-unit**         | Vitest 단일 실행 (6GB 메모리)   | 15분    |
| **deploy-cloudflare** | Cloudflare Pages 배포           | 10분    |

### 예상 실행 시간

- PR 빌드: **5-7분**
- 배포 포함: **7-10분**

---

## Release (release.yml)

### 트리거 조건

- `workflow_dispatch` (수동 실행)

### 입력 파라미터

- `version-type`: patch | minor | major

### 동작

1. standard-version 실행
2. Git 태그 생성
3. GitHub Release 자동 생성

---

## 로컬 테스트 명령어

```bash
# Lint
npm run lint

# Unit Test
npm run test:unit

# E2E Test (로컬 전용)
npm run test:e2e

# Lighthouse (로컬 전용)
npm run lighthouse
```

---

## 참고

- **Lighthouse CI**: CI에서 제거됨, 로컬에서 `npm run lighthouse` 사용
- **E2E Tests**: CI에서 비활성화, 로컬에서 실행
- **Cloudflare 배포**: main/staging 브랜치만 자동 배포
