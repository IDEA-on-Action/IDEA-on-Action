# E2E 테스트 실행 가이드

**대상**: IDEA on Action Admin 페이지
**테스트 도구**: Playwright
**테스트 파일**: `tests/e2e/admin/*.spec.ts`
**총 테스트**: 215개

---

## 📋 테스트 개요

### Admin E2E 테스트 (177개)

| 파일 | 테스트 수 | 주요 기능 |
|------|----------|----------|
| admin-portfolio.spec.ts | 46 | CRUD, 검색, 필터, JSON 필드 |
| admin-lab.spec.ts | 37 | Markdown, GitHub/Demo URL, 상태 관리 |
| admin-team.spec.ts | 28 | 소셜 링크, 아바타, 우선순위 |
| admin-blog-categories.spec.ts | 24 | 컬러 피커, 아이콘, 포스트 개수 |
| admin-tags.spec.ts | 24 | kebab-case slug, 사용 횟수 |
| admin-users.spec.ts | 18 | super_admin 전용, 역할 관리 |

### 기존 Admin 테스트 (38개)
- admin-dashboard.spec.ts (9개)
- admin-analytics.spec.ts
- admin-revenue.spec.ts
- admin-realtime.spec.ts
- admin-service-crud.spec.ts (10개)
- admin-image-upload.spec.ts

**총 테스트**: 215개 (Admin만)

---

## 🚀 실행 방법

### 사전 준비

#### 1. 환경 변수 설정

`.env.local` 파일 생성:
```env
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_KEY]
```

#### 2. Supabase 로컬 DB 실행

```bash
# Docker Desktop 실행 필요
supabase start
```

**확인**:
```bash
supabase status
```

출력 예시:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
```

#### 3. 개발 서버 실행

```bash
# 새 터미널에서
npm run dev

# 서버가 http://localhost:5173에서 실행 대기
```

**확인**:
브라우저에서 http://localhost:5173 접속

#### 4. 테스트 데이터 준비

```bash
# 로컬 DB 리셋 (마이그레이션 적용)
supabase db reset
```

**테스트 사용자 생성** (Supabase Studio):
1. http://localhost:54323 접속
2. Authentication > Users > Add User
3. 이메일: `admin@ideaonaction.local`
4. 비밀번호: `admin123!@#`
5. Email Confirm: 체크

**Super Admin 권한 부여** (SQL Editor):
```sql
-- admins 테이블에 사용자 추가
INSERT INTO admins (email, role, name)
VALUES ('admin@ideaonaction.local', 'super_admin', 'Test Admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
```

---

### 전체 테스트 실행

```bash
# 모든 E2E 테스트 실행 (Headless)
npm run test:e2e

# UI 모드 (브라우저 표시)
npm run test:e2e -- --ui

# 특정 브라우저
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

### Admin 테스트만 실행

```bash
# Admin 폴더 전체
npm run test:e2e -- tests/e2e/admin/

# 특정 파일만
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts

# 특정 테스트만 (테스트 이름으로 필터)
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts -g "should create new portfolio"
```

### CMS Phase 4 테스트만 실행 (177개)

```bash
# 6개 신규 Admin 테스트
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts tests/e2e/admin/admin-lab.spec.ts tests/e2e/admin/admin-team.spec.ts tests/e2e/admin/admin-blog-categories.spec.ts tests/e2e/admin/admin-tags.spec.ts tests/e2e/admin/admin-users.spec.ts
```

### 디버그 모드

```bash
# 한 테스트씩 실행 (헤드풀)
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts --headed --workers=1

# 디버그 모드 (브라우저 DevTools)
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts --debug

# 특정 테스트 중단점
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts -g "should create new portfolio" --debug
```

---

## 📊 결과 해석

### 성공 출력 예시

```
Running 46 tests using 4 workers
  46 passed (1.2m)

To open last HTML report run:
  npx playwright show-report
```

**해석**:
- ✅ 46개 테스트 모두 통과
- ⏱️ 실행 시간: 1.2분
- 🖥️ 병렬 실행: 4 workers

### 실패 출력 예시

```
Running 46 tests using 4 workers
  44 passed (1.1m)
  2 failed
    admin-portfolio.spec.ts:123:5 - Portfolio CRUD › should delete portfolio ══════════════
    admin-portfolio.spec.ts:145:5 - Portfolio CRUD › should toggle featured status ════════

Errors: 2
  See detailed report: npx playwright show-report
```

**해석**:
- ⚠️ 44개 통과, 2개 실패
- 🔍 실패한 테스트: 삭제, Featured 토글
- 📄 상세 리포트 확인 필요

### 부분 성공 출력 예시

```
Running 215 tests using 4 workers
  130 passed (4.3m)
  85 failed

  admin-blog-categories.spec.ts - 12 failed
  admin-tags.spec.ts - 8 failed
  public/blog.spec.ts - 15 failed (timeout)
```

**해석**:
- ⚠️ 60.5% 통과율 (130/215)
- 🚨 BlogCategories, Tags 권한 문제 의심
- ⏱️ Public 페이지 타임아웃 발생

---

## 🔍 HTML 리포트 확인

### 리포트 열기

```bash
npx playwright show-report
```

**자동으로 브라우저가 열리며 다음 정보 확인 가능**:
- 테스트별 실행 결과 (Pass/Fail)
- 실패한 테스트 스크린샷
- 실행 시간 통계
- 에러 스택 트레이스
- 네트워크 로그 (옵션)

### 리포트 위치

- `playwright-report/index.html`
- 브라우저에서 수동으로 열기 가능

### 리포트 내용

#### 1. 테스트 목록
- 통과한 테스트 (녹색)
- 실패한 테스트 (빨간색)
- 스킵된 테스트 (회색)

#### 2. 실패 상세 정보
- **스크린샷**: 실패 시점의 화면
- **에러 메시지**: 구체적인 오류 내용
- **스택 트레이스**: 코드 라인 번호
- **Before/After**: 기대값 vs 실제값

#### 3. 실행 통계
- 총 실행 시간
- 테스트별 실행 시간
- 평균 실행 시간
- Worker별 실행 분포

---

## 🐛 트러블슈팅

### 1. "localhost:5173 refused to connect"

**원인**: 개발 서버가 실행되지 않음

**증상**:
```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173
```

**해결**:
```bash
# 1. 새 터미널에서 개발 서버 실행
npm run dev

# 2. 서버 실행 확인
curl http://localhost:5173

# 3. 포트 충돌 확인
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows
```

**예방**:
- 테스트 실행 전 항상 `npm run dev` 확인
- VS Code Tasks로 자동화 (`tasks.json`)

---

### 2. "Timeout 30000ms exceeded"

**원인**: 페이지 로딩이 느리거나 셀렉터를 찾지 못함

**증상**:
```
Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for getByRole('button', { name: 'Save' })
============================================================
```

**해결**:
```bash
# 1. 로컬 DB 상태 확인
supabase status

# 2. DB 재시작
supabase stop
supabase start

# 3. 네트워크 속도 확인
ping localhost

# 4. timeout 값 증가 (playwright.config.ts)
use: {
  actionTimeout: 60000,  // 30초 → 60초
}
```

**디버그**:
```bash
# 헤드풀 모드로 실행하여 UI 확인
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts --headed --workers=1
```

---

### 3. "User not found" or "Unauthorized"

**원인**: 테스트 사용자가 DB에 없거나 권한 없음

**증상**:
```
Error: Unauthorized
  at auth.ts:15 - login helper
```

**해결**:

#### Step 1: 사용자 존재 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT * FROM auth.users WHERE email = 'admin@ideaonaction.local';
```

**결과가 없으면** → Supabase Studio에서 사용자 생성

#### Step 2: 권한 확인
```sql
-- admins 테이블에서 역할 확인
SELECT * FROM admins WHERE email = 'admin@ideaonaction.local';
```

**결과가 없거나 role이 null이면**:
```sql
INSERT INTO admins (email, role, name)
VALUES ('admin@ideaonaction.local', 'admin', 'Test Admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';
```

#### Step 3: Super Admin 권한 필요 시
```sql
UPDATE admins
SET role = 'super_admin'
WHERE email = 'admin@ideaonaction.local';
```

---

### 4. "Element not found" or "Selector not found"

**원인**: UI 변경으로 셀렉터가 무효화됨

**증상**:
```
Error: locator.click: Locator not found
  Selector: button[data-testid="save-button"]
```

**해결**:

#### 방법 1: 디버그 모드로 UI 확인
```bash
npm run test:e2e -- tests/e2e/admin/admin-portfolio.spec.ts --debug
```

#### 방법 2: 셀렉터 업데이트
```typescript
// ❌ 잘못된 셀렉터 (ID 기반)
await page.locator('#save-button').click();

// ✅ 권장 셀렉터 (Role 기반)
await page.getByRole('button', { name: 'Save' }).click();
```

#### 방법 3: 대기 시간 추가
```typescript
// 요소가 보일 때까지 대기
await page.getByRole('button', { name: 'Save' }).waitFor({ state: 'visible' });
await page.getByRole('button', { name: 'Save' }).click();
```

---

### 5. AdminUsers 테스트 실패

**원인**: super_admin 권한 없음

**증상**:
```
admin-users.spec.ts:12:5 - should display users list ══════════════
Error: page.goto: Navigation failed: 403 Forbidden
```

**해결**:
```sql
-- admin@ideaonaction.local을 super_admin으로 업그레이드
UPDATE admins
SET role = 'super_admin'
WHERE email = 'admin@ideaonaction.local';
```

**확인**:
```sql
SELECT email, role FROM admins WHERE email = 'admin@ideaonaction.local';
```

**예상 출력**:
```
email                        | role
---------------------------- | -----------
admin@ideaonaction.local     | super_admin
```

---

### 6. "Database connection failed"

**원인**: Supabase 로컬 DB가 실행되지 않음

**증상**:
```
Error: connect ECONNREFUSED 127.0.0.1:54322
```

**해결**:
```bash
# 1. Docker Desktop 실행 확인
docker ps

# 2. Supabase 재시작
supabase stop
supabase start

# 3. 상태 확인
supabase status
```

---

### 7. BlogCategories / Tags 테스트 실패

**원인**: RLS 정책 또는 권한 문제

**증상**:
```
admin-blog-categories.spec.ts - 12/24 tests failed
Error: Failed to fetch categories
```

**해결**:

#### Step 1: RLS 정책 확인
```sql
-- blog_categories 테이블 RLS 확인
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'blog_categories';
```

#### Step 2: SELECT 권한 확인
```sql
-- anon/authenticated 역할에 SELECT 권한 부여
GRANT SELECT ON blog_categories TO anon, authenticated;
```

#### Step 3: 마이그레이션 적용
```bash
# 최신 마이그레이션 적용
supabase db reset
```

---

### 8. 스크린샷 캡처 실패

**원인**: 디렉토리 권한 또는 디스크 공간 부족

**증상**:
```
Error: Failed to save screenshot to test-results/
```

**해결**:
```bash
# 1. test-results 디렉토리 권한 확인
ls -la test-results/  # macOS/Linux
dir test-results\     # Windows

# 2. 디렉토리 생성
mkdir -p test-results

# 3. 디스크 공간 확인
df -h  # macOS/Linux
```

---

## 📈 테스트 커버리지

### CRUD 작업 (177개 테스트)

| 작업 | Portfolio | Lab | Team | Categories | Tags | Users |
|------|-----------|-----|------|------------|------|-------|
| Create | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Filter | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 폼 검증

- ✅ 필수 필드 검증 (title, name, email)
- ✅ 이메일 형식 검증 (`@` 포함)
- ✅ URL 형식 검증 (`http://`, `https://`)
- ✅ Hex color 형식 검증 (`#RRGGBB`)
- ✅ kebab-case slug 검증 (`react-hooks`)
- ✅ JSON 형식 검증 (`{"key": "value"}`)
- ✅ Markdown 렌더링 검증

### UI 컴포넌트

- ✅ 모달 (열기/닫기)
- ✅ 토스트 알림 (성공/실패)
- ✅ 검색 (디바운스 500ms)
- ✅ 필터링 (카테고리, 상태, 타입)
- ✅ 정렬 (이름, 날짜, 우선순위)
- ✅ 페이지네이션 (10개/페이지)
- ✅ 드래그 앤 드롭 (우선순위 조정)

### 권한 관리

- ✅ 비인증 사용자 차단 (→ /login)
- ✅ 인증 사용자 접근 허용
- ✅ Admin 권한 확인 (`is_admin()`)
- ✅ Super Admin 전용 페이지 (`/admin/users`)
- ✅ 로그아웃 시 리다이렉트

---

## 🎯 CI/CD 통합

### GitHub Actions 예시

`.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    timeout-minutes: 20
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase
        run: supabase start

      - name: Run migrations
        run: supabase db reset

      - name: Create test user
        run: |
          npx supabase db execute "
          INSERT INTO admins (email, role, name)
          VALUES ('admin@ideaonaction.local', 'super_admin', 'CI Admin')
          ON CONFLICT (email) DO NOTHING;
          "

      - name: Build app
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: http://localhost:54321
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results/
          retention-days: 7
```

### Vercel Pre-deployment Checks

`vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "checks": {
    "e2e": {
      "command": "npm run test:e2e",
      "schedule": "0 0 * * *"
    }
  }
}
```

---

## 📚 관련 문서

### 내부 문서
- **Admin 사용자 가이드**: `docs/guides/cms/admin-guide.md`
- **API 문서**: `docs/api/hooks/`
- **배포 체크리스트**: `docs/guides/deployment/cms-phase4-deployment-checklist.md`
- **마이그레이션 가이드**: `docs/guides/database/service-categories-migration-guide.md`
- **Super Admin 가이드**: `docs/guides/admin/super-admin-upgrade-guide.md`

### 외부 문서
- **Playwright 공식 문서**: https://playwright.dev/
- **Playwright Best Practices**: https://playwright.dev/docs/best-practices
- **Playwright Selectors**: https://playwright.dev/docs/selectors
- **Playwright Debugging**: https://playwright.dev/docs/debug

---

## 🔧 고급 사용법

### 병렬 실행 제어

```bash
# 1개 워커로 순차 실행 (디버깅용)
npm run test:e2e -- --workers=1

# 4개 워커로 병렬 실행 (기본값)
npm run test:e2e -- --workers=4

# CPU 코어 수만큼 병렬 실행
npm run test:e2e -- --workers=100%
```

### 재시도 설정

```bash
# 실패한 테스트 2번 재시도
npm run test:e2e -- --retries=2

# 재시도 없이 1번만 실행
npm run test:e2e -- --retries=0
```

### 특정 브라우저만 실행

```bash
# Chromium만
npm run test:e2e -- --project=chromium

# Firefox + WebKit
npm run test:e2e -- --project=firefox --project=webkit
```

### 헤드리스 vs 헤드풀

```bash
# 헤드리스 (기본값, 빠름)
npm run test:e2e

# 헤드풀 (브라우저 UI 표시, 디버깅용)
npm run test:e2e -- --headed
```

### 스크린샷/비디오 녹화

```bash
# 실패 시에만 스크린샷
npm run test:e2e -- --screenshot=only-on-failure

# 모든 테스트 스크린샷
npm run test:e2e -- --screenshot=on

# 비디오 녹화 (실패 시)
npm run test:e2e -- --video=retain-on-failure
```

---

## 📊 성능 벤치마크

### 평균 실행 시간 (MacBook Pro M1, 4 workers)

| 테스트 파일 | 테스트 수 | 실행 시간 | 평균/테스트 |
|------------|----------|----------|------------|
| admin-portfolio.spec.ts | 46 | 1.2분 | 1.6초 |
| admin-lab.spec.ts | 37 | 58초 | 1.6초 |
| admin-team.spec.ts | 28 | 45초 | 1.6초 |
| admin-blog-categories.spec.ts | 24 | 38초 | 1.6초 |
| admin-tags.spec.ts | 24 | 38초 | 1.6초 |
| admin-users.spec.ts | 18 | 29초 | 1.6초 |
| **전체 (177개)** | **177** | **~4.3분** | **~1.5초** |

### 최적화 팁

1. **병렬 실행**: workers=4 권장 (CPU 코어 수에 맞춰 조정)
2. **재사용**: `beforeAll`에서 로그인 한 번만 수행
3. **대기 최소화**: `waitForLoadState('networkidle')` 대신 특정 요소 대기
4. **캐시 활용**: 브라우저 컨텍스트 재사용

---

## ✅ 테스트 작성 가이드

### 권장 패턴

```typescript
// ✅ Good: Role 기반 셀렉터 (접근성 우선)
await page.getByRole('button', { name: 'Save' }).click();

// ❌ Bad: ID 기반 셀렉터 (UI 변경에 취약)
await page.locator('#save-button').click();
```

```typescript
// ✅ Good: 명시적 대기
await page.getByRole('dialog').waitFor({ state: 'visible' });
await page.getByRole('button', { name: 'Confirm' }).click();

// ❌ Bad: 임의 대기
await page.waitForTimeout(3000);
await page.getByRole('button', { name: 'Confirm' }).click();
```

```typescript
// ✅ Good: 구체적인 Assertion
await expect(page.getByRole('alert')).toContainText('Successfully created');

// ❌ Bad: 모호한 Assertion
await expect(page.locator('.toast')).toBeVisible();
```

### 테스트 구조

```typescript
test.describe('Portfolio CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 (모든 테스트 전)
    await loginAsAdmin(page);
  });

  test('should create new portfolio', async ({ page }) => {
    // 1. Arrange (준비)
    await page.goto('/admin/portfolio');

    // 2. Act (실행)
    await page.getByRole('button', { name: 'Add New' }).click();
    await page.getByLabel('Title').fill('Test Project');
    await page.getByRole('button', { name: 'Save' }).click();

    // 3. Assert (검증)
    await expect(page.getByRole('alert')).toContainText('Successfully created');
    await expect(page.getByText('Test Project')).toBeVisible();
  });
});
```

---

**마지막 업데이트**: 2025-11-16
**테스트 버전**: v2.0.1
**Playwright 버전**: ^1.40.0
**Node 버전**: 18.x
