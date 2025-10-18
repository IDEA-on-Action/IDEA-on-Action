# Branch Protection 설정 가이드

## 📋 개요

브랜치 보호 규칙을 통해 코드 품질을 유지하고 안전한 배포를 보장합니다.

**설정 대상 브랜치**:
- `main` (프로덕션)
- `staging` (스테이징)

---

## 🔧 GitHub 설정 방법

### 1. Repository Settings 접근

1. GitHub 저장소 페이지 접속
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Branches** 클릭

### 2. Branch Protection Rule 추가

**main 브랜치 설정**:

1. **Add rule** 버튼 클릭
2. **Branch name pattern**: `main`
3. 다음 옵션 활성화:

#### ✅ Require a pull request before merging
- **Require approvals**: 1 (최소 1명의 리뷰 필요)
- **Dismiss stale pull request approvals when new commits are pushed**: ✅
- **Require review from Code Owners**: ❌ (선택)

#### ✅ Require status checks to pass before merging
- **Require branches to be up to date before merging**: ✅
- **Status checks that are required**:
  - `Lint & Type Check` (CI Pipeline)
  - `Build` (CI Pipeline)
  - `Vitest Unit Tests` (Unit Tests)
  - `Playwright E2E Tests` (E2E Tests)
  - `Lighthouse CI` (Performance Tests)

#### ✅ Require conversation resolution before merging
- PR 코멘트 해결 필수

#### ✅ Require linear history
- Merge commit 방지, Rebase/Squash만 허용

#### ✅ Do not allow bypassing the above settings
- 관리자도 규칙 우회 불가

#### ❌ Allow force pushes
- Force push 금지 (보안)

#### ❌ Allow deletions
- 브랜치 삭제 금지

### 3. staging 브랜치 설정

**staging 브랜치**는 `main`보다 완화된 규칙:

1. **Branch name pattern**: `staging`
2. 다음 옵션 활성화:

#### ✅ Require a pull request before merging
- **Require approvals**: 0 (리뷰 선택)

#### ✅ Require status checks to pass before merging
- **Status checks that are required**:
  - `Lint & Type Check`
  - `Build`
  - `Vitest Unit Tests`

#### ✅ Require conversation resolution before merging

#### ❌ Require linear history (선택)

---

## 📊 Status Checks 구성

### CI Pipeline (.github/workflows/ci.yml)

**Jobs**:
- `Lint & Type Check` - ESLint + TypeScript
- `Build` - 프로덕션 빌드 검증

**트리거**:
- PR: main, staging, develop
- Push: main, staging, develop

### Unit Tests (.github/workflows/test-unit.yml)

**Job**:
- `Vitest Unit Tests` - 유닛 테스트 + 커버리지

**커버리지 임계값**: 80%

**트리거**:
- PR: main, staging, develop
- Push: main, staging, develop

### E2E Tests (.github/workflows/test-e2e.yml)

**Job**:
- `Playwright E2E Tests` - 브라우저 E2E 테스트

**브라우저**: Chromium, Firefox, WebKit

**트리거**:
- PR: main, staging, develop
- Push: main, staging

### Lighthouse CI (.github/workflows/lighthouse.yml)

**Job**:
- `Lighthouse CI` - 성능 테스트

**임계값**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

**트리거**:
- PR: main, staging, develop
- Push: main, staging

---

## 🚀 PR 머지 프로세스

### 1. PR 생성

```bash
# Feature 브랜치 생성
git checkout -b feature/new-feature

# 작업 후 커밋
git add .
git commit -m "feat: add new feature"

# 푸시
git push origin feature/new-feature
```

GitHub에서 PR 생성 → `develop` 브랜치로

### 2. Status Checks 자동 실행

- ✅ Lint & Type Check
- ✅ Build
- ✅ Vitest Unit Tests
- ✅ Playwright E2E Tests
- ✅ Lighthouse CI (선택)

### 3. 코드 리뷰

- 최소 1명의 Approve 필요 (main 브랜치)
- 모든 코멘트 해결

### 4. 머지

**Merge 옵션**:
- **Squash and merge** (권장) - 커밋 히스토리 정리
- **Rebase and merge** - 선형 히스토리 유지
- ~~Merge commit~~ (금지)

---

## 📋 체크리스트

**main 브랜치 보호 설정**:
- [ ] Require a pull request before merging (1 approval)
- [ ] Require status checks (5개: CI, Build, Unit, E2E, Lighthouse)
- [ ] Require conversation resolution
- [ ] Require linear history
- [ ] Disallow bypassing
- [ ] Disallow force pushes
- [ ] Disallow deletions

**staging 브랜치 보호 설정**:
- [ ] Require a pull request before merging (0 approval)
- [ ] Require status checks (3개: CI, Build, Unit)
- [ ] Require conversation resolution

**GitHub Secrets 확인**:
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`

**워크플로우 파일 존재**:
- [ ] `.github/workflows/ci.yml`
- [ ] `.github/workflows/test-unit.yml`
- [ ] `.github/workflows/test-e2e.yml`
- [ ] `.github/workflows/lighthouse.yml`

---

## 🔍 트러블슈팅

### Status Check가 표시되지 않을 때

**원인**: 워크플로우가 한 번도 실행되지 않음

**해결**:
1. 테스트 PR 생성
2. 워크플로우 실행 대기
3. Settings → Branches에서 Status Check 선택 가능

### PR 머지가 안 될 때

**확인 사항**:
- [ ] 모든 Status Checks 통과
- [ ] 최소 Approval 수 충족 (main: 1명)
- [ ] 모든 코멘트 해결
- [ ] 브랜치가 최신 상태 (Rebase 필요 시)

### Force Push가 필요할 때

**절차**:
1. Settings → Branches → Edit rule
2. **Allow force pushes** 일시적으로 활성화
3. Force push 실행
4. 즉시 비활성화

---

## 📚 참고 자료

- [GitHub Branch Protection 공식 문서](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [프로젝트 브랜치 전략](branch-strategy.md)
