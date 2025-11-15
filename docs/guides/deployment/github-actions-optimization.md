# GitHub Actions 워크플로우 최적화

> GitHub Actions 워크플로우 통합 및 최적화 가이드

**작성일**: 2025-11-16
**최종 업데이트**: 2025-11-16

---

## 📊 최적화 개요

### Before (11개 워크플로우)
```
CI/CD:
├── ci.yml (Lint + Build)
├── test-unit.yml (Unit Tests)
├── test-e2e.yml (E2E Tests)
├── lighthouse.yml (Lighthouse CI)
├── deploy-production.yml (Production Deploy)
└── deploy-staging.yml (Staging Deploy)

정기 실행:
├── weekly-recap.yml (Weekly Recap)
├── weekly-docs-check.yml (Docs Size Check)
├── monthly-docs-maintenance.yml (TODO Archive)
├── quarterly-backlog-review.yml (Backlog Review)
└── release.yml (Manual Release)
```

### After (6개 워크플로우)
```
CI/CD:
├── ci.yml (통합: Lint + Test + Lighthouse)
└── deploy.yml (통합: Production + Staging)

정기 실행:
├── weekly-maintenance.yml (통합: Docs + Recap)
├── monthly-docs-maintenance.yml (TODO Archive)
├── quarterly-backlog-review.yml (Backlog Review)
└── release.yml (Manual Release)
```

**감소율**: 11개 → 6개 (**-45%**)

---

## 🎯 최적화 효과

### 1. CI 통합 워크플로우

#### Before (4개 워크플로우)
- PR 생성 시 4개 워크플로우 동시 실행
- 각각 `npm ci` 실행 (4번 중복)
- 각각 `npm run build` 실행 (4번 중복)
- 총 실행 시간: ~15분

#### After (1개 워크플로우)
- PR 생성 시 1개 워크플로우 실행
- `npm ci` 1번만 실행 (setup job)
- `npm run build` 1번만 실행
- Build artifact 재사용 (lint, test-unit, test-e2e, lighthouse)
- 총 실행 시간: ~8분 (**-47%**)

**구조**:
```yaml
jobs:
  setup:
    - npm ci (1회만)
    - npm run build (1회만)
    - Upload build artifacts

  lint:
    needs: setup
    - Restore node_modules cache
    - ESLint + TypeScript

  test-unit:
    needs: setup
    - Restore node_modules cache
    - Vitest + Coverage

  test-e2e:
    needs: setup
    - Restore node_modules cache
    - Download build artifacts
    - Playwright

  lighthouse:
    needs: setup
    - Restore node_modules cache
    - Download build artifacts
    - Lighthouse CI
```

**효과**:
- ✅ GitHub Actions 사용 시간 47% 감소
- ✅ 중복 작업 제거 (npm ci, build)
- ✅ 병렬 실행으로 시간 단축
- ✅ 관리 포인트 감소 (4개 → 1개)

### 2. Deploy 통합 워크플로우

#### Before (2개 워크플로우)
- deploy-production.yml (main 브랜치)
- deploy-staging.yml (staging 브랜치)
- 각각 build 실행 (중복)

#### After (1개 워크플로우)
- deploy.yml (main + staging)
- Build 1번만 실행
- Artifact 재사용 (production + staging)

**구조**:
```yaml
jobs:
  build:
    - npm ci
    - npm run build
    - Upload artifact

  deploy-production:
    needs: build
    if: main branch
    - Download artifact
    - Deploy to Vercel

  deploy-staging:
    needs: build
    if: staging branch
    - Download artifact
    - Deploy to Vercel Preview
```

**효과**:
- ✅ 빌드 중복 제거
- ✅ 환경별 분리 (production, staging)
- ✅ 배포 시간 단축 (~30%)

### 3. Weekly Maintenance 통합

#### Before (2개 워크플로우)
- weekly-recap.yml (일요일 15:00 UTC)
- weekly-docs-check.yml (일요일 00:00 UTC)
- 같은 날 2번 실행

#### After (1개 워크플로우)
- weekly-maintenance.yml (일요일 00:00 UTC)
- 한 번에 2개 작업 실행 (순차)

**구조**:
```yaml
jobs:
  docs-check:
    - 문서 크기 체크
    - 경고 시 Issue 생성

  weekly-recap:
    needs: docs-check
    - Weekly Recap 생성

  summary:
    needs: [docs-check, weekly-recap]
    - 주간 요약 리포트
```

**효과**:
- ✅ 통일된 실행 시간
- ✅ 로그 확인 편의성
- ✅ 전체 작업 상태 한눈에 파악

---

## 📋 워크플로우 상세

### 1. ci.yml - 통합 CI Pipeline

**트리거**:
- `pull_request`: main, staging, develop
- `push`: main, staging, develop

**Jobs** (5개):
1. **setup**: 의존성 설치 & 빌드
   - Node 20
   - npm ci (1회)
   - npm run build (1회)
   - Cache node_modules
   - Upload build artifacts

2. **lint**: ESLint & TypeScript
   - Restore cache
   - npm run lint
   - npx tsc --noEmit

3. **test-unit**: Vitest Unit Tests
   - Restore cache
   - npm run test:unit
   - npm run test:coverage
   - PR 커멘트 (커버리지)

4. **test-e2e**: Playwright E2E Tests
   - Restore cache
   - Download build artifacts
   - npm run test:e2e
   - PR 커멘트 (결과)

5. **lighthouse**: Lighthouse CI
   - Restore cache
   - Download build artifacts
   - npx lhci autorun
   - PR 커멘트 (성능)

**특징**:
- ✅ 병렬 실행 (lint, test-unit, test-e2e, lighthouse)
- ✅ Build artifact 재사용
- ✅ node_modules 캐싱
- ✅ PR 커멘트 자동화

### 2. deploy.yml - 통합 Deploy

**트리거**:
- `push`: main, staging

**Jobs** (3개):
1. **build**: 빌드
   - Node 20
   - npm ci
   - npm run build
   - Upload artifact

2. **deploy-production**: 프로덕션 배포
   - if: main branch
   - Download artifact
   - Deploy to Vercel (--prod)

3. **deploy-staging**: 스테이징 배포
   - if: staging branch
   - Download artifact
   - Deploy to Vercel (--preview)

**특징**:
- ✅ 조건부 실행 (브랜치별)
- ✅ Build artifact 재사용
- ✅ 환경별 분리 (production, staging)

### 3. weekly-maintenance.yml - 주간 유지보수

**트리거**:
- `schedule`: 매주 일요일 00:00 UTC (월요일 09:00 KST)
- `workflow_dispatch`: 수동 실행

**Jobs** (3개):
1. **docs-check**: 문서 크기 체크
   - npm run docs:check
   - 경고 시 Issue 생성

2. **weekly-recap**: Weekly Recap 생성
   - Supabase Edge Function 호출

3. **summary**: 주간 요약
   - 전체 작업 결과 요약

**특징**:
- ✅ 순차 실행 (docs-check → weekly-recap → summary)
- ✅ 자동 Issue 생성
- ✅ 주간 요약 리포트

### 4. monthly-docs-maintenance.yml - 월간 TODO 아카이브

**트리거**:
- `schedule`: 매월 1일 00:00 UTC
- `workflow_dispatch`: 수동 실행

**Jobs** (1개):
1. **archive-completed-todos**
   - npm run docs:archive
   - PR 자동 생성

**특징**:
- ✅ 완료 작업 자동 아카이브
- ✅ PR 자동 생성 (리뷰 후 머지)

### 5. quarterly-backlog-review.yml - 분기별 백로그 검토

**트리거**:
- `schedule`: 3/6/9/12월 1일 00:00 UTC
- `workflow_dispatch`: 수동 실행

**Jobs** (1개):
1. **create-backlog-review-issue**
   - 분기별 백로그 검토 Issue 생성
   - 체크리스트 포함

**특징**:
- ✅ 분기별 자동 Issue 생성
- ✅ 로드맵 업데이트 가이드

### 6. release.yml - 버전 릴리스

**트리거**:
- `workflow_dispatch`: 수동 실행 (version-type 선택)

**Jobs** (1개):
1. **release**
   - standard-version 실행
   - GitHub Release 생성
   - CHANGELOG.md 업데이트

**특징**:
- ✅ 수동 실행 전용
- ✅ Semantic Versioning
- ✅ 자동 태깅

---

## 🚀 주요 개선 사항

### 1. Node 버전 통일

**Before**:
- ci.yml, deploy-*.yml: Node 18
- test-*.yml, lighthouse.yml: Node 20

**After**:
- 모든 워크플로우: **Node 20**

### 2. 중복 제거

**npm ci 실행 횟수**:
- Before: PR당 4회 (ci, test-unit, test-e2e, lighthouse)
- After: PR당 1회 (setup)
- 감소율: **-75%**

**Build 실행 횟수**:
- Before: PR당 4회, 배포당 1회
- After: PR당 1회, 배포당 1회
- 감소율: **-75%**

### 3. Artifact 재사용

**Before**:
- 각 워크플로우에서 개별 빌드
- Artifact 공유 없음

**After**:
- Setup job에서 1회 빌드
- Artifact upload/download로 공유
- Test/Lighthouse/Deploy에서 재사용

### 4. 캐싱 전략

**node_modules 캐싱**:
```yaml
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-modules-${{ hashFiles('package-lock.json') }}
```

**효과**:
- npm ci 시간 단축 (~50%)
- 네트워크 사용량 감소

---

## 📊 성능 비교

### GitHub Actions 사용 시간

| 작업 | Before | After | 개선율 |
|------|--------|-------|--------|
| **PR 빌드** | ~15분 | ~8분 | **-47%** |
| **배포 (main)** | ~5분 | ~3분 | **-40%** |
| **주간 유지보수** | 2번 실행 | 1번 실행 | **-50%** |

### 비용 절감 (예상)

**가정**:
- PR 월 100개
- 배포 월 20회
- GitHub Actions 무료 플랜: 2,000분/월

**Before**:
- PR: 100 × 15분 = 1,500분
- 배포: 20 × 5분 = 100분
- **총**: 1,600분/월

**After**:
- PR: 100 × 8분 = 800분
- 배포: 20 × 3분 = 60분
- **총**: 860분/월

**절감율**: 1,600 → 860분 (**-46%**)

---

## 🔧 마이그레이션 가이드

### 기존 PR/Branch 영향

**주의사항**:
- 기존 열린 PR은 새 워크플로우 트리거
- 기존 배포 히스토리는 유지
- Artifact 이름 변경으로 호환성 확인 필요

### 문제 해결

#### 1. "workflow not found" 오류
- 새 워크플로우가 main 브랜치에 머지되지 않음
- 해결: main 브랜치 머지 후 재시도

#### 2. Artifact 다운로드 실패
- Artifact 이름 불일치
- 해결: `build-artifacts` → `dist-${{ github.sha }}` 확인

#### 3. Cache 복원 실패
- package-lock.json 변경
- 해결: npm ci 재실행 (자동)

---

## 📝 모니터링

### 워크플로우 상태 확인

**GitHub UI**:
```
Repository → Actions 탭
```

**워크플로우 목록**:
1. CI Pipeline (모든 PR/Push)
2. Deploy (main/staging Push)
3. Weekly Maintenance (일요일)
4. Monthly Docs Maintenance (매월 1일)
5. Quarterly Backlog Review (분기별 1일)
6. Release (수동)

### 성능 모니터링

**지표**:
- 평균 실행 시간
- 성공률
- 병렬 실행 효율
- Cache hit rate

**도구**:
- GitHub Actions Insights
- Workflow run history

---

## 🔮 향후 개선 계획

### 1. Self-hosted Runner

**목적**: 빌드 시간 단축, 비용 절감

**예상 효과**:
- 빌드 시간 50% 단축
- 무제한 실행 시간

### 2. Matrix Strategy

**목적**: 다양한 환경 테스트

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
    os: [ubuntu-latest, windows-latest]
```

### 3. Dependency Caching 개선

**목적**: npm ci 시간 단축

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
```

---

## 📚 참고 문서

- [GitHub Actions 공식 문서](https://docs.github.com/actions)
- [Workflow 최적화 가이드](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions)
- [Artifact 사용법](https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts)
- [Caching 전략](https://docs.github.com/actions/using-workflows/caching-dependencies-to-speed-up-workflows)

---

**작성**: IDEA on Action Team
**최종 업데이트**: 2025-11-16
**버전**: 1.0.0
