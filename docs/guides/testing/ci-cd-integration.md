# CI/CD 통합 가이드

## 📋 개요

GitHub Actions를 사용한 자동화된 테스트 및 배포 파이프라인 가이드입니다.

**목표**:
- 코드 품질 자동 검증
- 테스트 자동 실행 (유닛, E2E, 성능)
- 안전한 배포 보장

---

## 🔄 CI/CD 파이프라인 구조

```
PR 생성
  │
  ├─► CI Pipeline (Lint, Type Check, Build)
  ├─► Unit Tests (Vitest + Coverage)
  ├─► E2E Tests (Playwright)
  └─► Lighthouse CI (Performance)
        │
        ├─ 모든 체크 통과 → 머지 가능
        └─ 실패 → 머지 불가
```

---

## 📦 워크플로우 구성

### 1. CI Pipeline (.github/workflows/ci.yml)

**목적**: 코드 품질 검증

**Jobs**:
- **Lint & Type Check**
  - ESLint 실행
  - TypeScript 타입 체크
- **Build**
  - 프로덕션 빌드
  - 번들 사이즈 확인
  - Artifacts 업로드 (7일 보관)

**트리거**:
```yaml
on:
  pull_request:
    branches: [main, staging, develop]
  push:
    branches: [main, staging, develop]
```

**실행 시간**: ~2분

---

### 2. Unit Tests (.github/workflows/test-unit.yml)

**목적**: 유닛 테스트 + 커버리지 측정

**Jobs**:
- **Vitest Unit Tests**
  - 모든 유닛 테스트 실행
  - 커버리지 리포트 생성
  - PR에 커버리지 코멘트 추가

**커버리지 임계값**: 80%

**트리거**:
```yaml
on:
  pull_request:
    branches: [main, staging, develop]
  push:
    branches: [main, staging, develop]
```

**실행 시간**: ~1-2분

**PR 코멘트 예시**:
```markdown
## 🧪 Unit Test Coverage

| Metric | Coverage |
|--------|----------|
| Statements | 85.2% |
| Branches | 78.4% |
| Functions | 82.1% |
| Lines | 84.9% |

**Status**: ✅ Meets threshold (80%)
```

---

### 3. E2E Tests (.github/workflows/test-e2e.yml)

**목적**: 브라우저 E2E 테스트

**Jobs**:
- **Playwright E2E Tests**
  - Chromium, Firefox, WebKit 테스트
  - 스크린샷/비디오 캡처
  - Playwright 리포트 생성

**테스트 스위트**:
- Homepage (12개)
- Login (7개)
- Services (11개)
- Admin Dashboard (7개)
- Admin CRUD (15개)
- Admin Image Upload (12개)
- Dark Mode (8개)
- Responsive (20개)

**트리거**:
```yaml
on:
  pull_request:
    branches: [main, staging, develop]
  push:
    branches: [main, staging]
```

**실행 시간**: ~5-10분

---

### 4. Lighthouse CI (.github/workflows/lighthouse.yml)

**목적**: 성능 테스트

**Jobs**:
- **Lighthouse CI**
  - 3회 측정 후 평균값 사용
  - Core Web Vitals 측정
  - PR에 성능 스코어 코멘트 추가

**임계값**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+
- FCP: <2000ms
- LCP: <2500ms
- CLS: <0.1
- TBT: <300ms

**트리거**:
```yaml
on:
  pull_request:
    branches: [main, staging, develop]
  push:
    branches: [main, staging]
```

**실행 시간**: ~3-5분

**PR 코멘트 예시**:
```markdown
## 🔍 Lighthouse CI Results

| URL | Performance | Accessibility | Best Practices | SEO |
|-----|-------------|---------------|----------------|-----|
| / | 92 | 98 | 95 | 100 |
| /services | 90 | 97 | 93 | 98 |
| /login | 94 | 99 | 96 | 100 |

### Core Web Vitals
| URL | FCP (ms) | LCP (ms) | CLS | TBT (ms) |
|-----|----------|----------|-----|----------|
| / | 1234 | 1890 | 0.05 | 145 |
```

---

## 🚀 사용 방법

### 로컬 테스트 (PR 전)

```bash
# 1. Lint & Type Check
npm run lint
npx tsc --noEmit

# 2. Unit Tests
npm run test:unit

# 3. Build
npm run build

# 4. E2E Tests (선택)
npm run test:e2e

# 5. Lighthouse (선택)
npm run lighthouse
```

### PR 생성 후

1. **PR 생성**
   ```bash
   git checkout -b feature/new-feature
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

2. **GitHub에서 PR 생성**
   - Base: `develop`
   - Compare: `feature/new-feature`

3. **자동 실행 확인**
   - CI Pipeline ✅
   - Unit Tests ✅
   - E2E Tests ✅
   - Lighthouse CI ✅

4. **PR 코멘트 확인**
   - 유닛 테스트 커버리지
   - E2E 테스트 결과
   - Lighthouse 성능 스코어

5. **코드 리뷰**
   - Reviewer 지정
   - Approve 받기 (main 브랜치: 1명 필수)

6. **머지**
   - 모든 Status Checks 통과 후
   - Squash and merge (권장)

---

## 📊 Status Checks

### 필수 Status Checks (main 브랜치)

- ✅ `Lint & Type Check` (CI Pipeline)
- ✅ `Build` (CI Pipeline)
- ✅ `Vitest Unit Tests` (Unit Tests)
- ✅ `Playwright E2E Tests` (E2E Tests)
- ✅ `Lighthouse CI` (Performance)

### 선택 Status Checks (staging 브랜치)

- ✅ `Lint & Type Check`
- ✅ `Build`
- ✅ `Vitest Unit Tests`

---

## 🔧 환경 변수 설정

### GitHub Secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description |
|-------------|-------------|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Key |

---

## 📋 브랜치 보호 설정

**Settings → Branches → Add rule**

**main 브랜치**:
- ✅ Require a pull request before merging (1 approval)
- ✅ Require status checks to pass before merging
- ✅ Require conversation resolution before merging
- ✅ Require linear history
- ✅ Do not allow bypassing
- ❌ Allow force pushes
- ❌ Allow deletions

**staging 브랜치**:
- ✅ Require a pull request before merging (0 approval)
- ✅ Require status checks to pass before merging
- ✅ Require conversation resolution before merging

**상세 가이드**: [Branch Protection 설정](../../devops/branch-protection-guide.md)

---

## 🔍 트러블슈팅

### 1. Unit Tests 실패

**증상**: "Vitest Unit Tests" 실패

**확인**:
```bash
npm run test:unit
```

**해결**:
- 로컬에서 테스트 수정
- 커버리지 80% 이상 확인

### 2. E2E Tests 실패

**증상**: "Playwright E2E Tests" 실패

**확인**:
```bash
npm run build
npm run test:e2e
```

**해결**:
- Playwright 리포트 확인 (Artifacts)
- 스크린샷/비디오로 실패 원인 파악

### 3. Lighthouse CI 실패

**증상**: "Lighthouse CI" 임계값 미달

**확인**:
```bash
npm run build
npm run lighthouse
```

**해결**:
- Performance: 이미지 최적화, 코드 분할
- Accessibility: aria-label 추가, 색상 대비 개선
- Best Practices: 콘솔 에러 제거, HTTPS 사용
- SEO: meta 태그 추가, 시맨틱 HTML

### 4. Build 실패

**증상**: "Build" 실패

**확인**:
```bash
npm run build
```

**해결**:
- TypeScript 에러 수정 (`npx tsc --noEmit`)
- Import 경로 확인
- 환경 변수 확인 (`.env.local`)

---

## 📚 참고 자료

- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
- [Playwright CI 가이드](https://playwright.dev/docs/ci)
- [Vitest 공식 문서](https://vitest.dev/)
- [Lighthouse CI 공식 문서](https://github.com/GoogleChrome/lighthouse-ci)

---

## 📝 체크리스트

**GitHub 설정**:
- [ ] Secrets 등록 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Branch Protection 설정 (main, staging)

**워크플로우 파일**:
- [ ] `.github/workflows/ci.yml`
- [ ] `.github/workflows/test-unit.yml`
- [ ] `.github/workflows/test-e2e.yml`
- [ ] `.github/workflows/lighthouse.yml`

**로컬 테스트**:
- [ ] `npm run lint` 통과
- [ ] `npm run test:unit` 통과 (커버리지 80%+)
- [ ] `npm run build` 성공
- [ ] `npm run test:e2e` 통과 (선택)

**PR 프로세스**:
- [ ] Feature 브랜치에서 작업
- [ ] PR 생성 (`develop` ← `feature/*`)
- [ ] 모든 Status Checks 통과
- [ ] 코드 리뷰 Approve
- [ ] Squash and merge
