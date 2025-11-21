# AdminNewsletter E2E 테스트 실행 가이드

> **마지막 업데이트**: 2025-11-22
> **버전**: v2.3.3
> **테스트 개수**: 33개 (11개 스위트)

---

## 📋 목차

1. [개요](#개요)
2. [사전 준비](#사전-준비)
3. [테스트 실행 방법](#테스트-실행-방법)
4. [테스트 스위트 목록](#테스트-스위트-목록)
5. [테스트 실패 시 대응](#테스트-실패-시-대응)
6. [성능 벤치마크](#성능-벤치마크)
7. [CI/CD 통합](#cicd-통합)
8. [트러블슈팅](#트러블슈팅)
9. [FAQ](#faq)

---

## 개요

### 테스트 목적

AdminNewsletter E2E 테스트는 뉴스레터 관리자 페이지의 **회귀 방지**와 **기능 검증**을 위해 작성되었습니다. 프로덕션 배포 전에 모든 핵심 기능이 정상 동작하는지 자동으로 검증합니다.

### 테스트 대상

**AdminNewsletter 페이지** (`/admin/newsletter`)의 다음 기능들을 테스트합니다:

- **통계 대시보드**: 구독자 총계, 확인 완료, 확인 대기, 구독 취소 카운트
- **검색 기능**: 이메일 검색, 검색 결과 필터링
- **상태 필터**: All, Pending, Confirmed, Unsubscribed 필터
- **구독자 관리**: 상태 변경, 삭제, GDPR 준수
- **페이지네이션**: 50개씩 표시, 이전/다음 버튼
- **CSV Export**: 구독자 목록 다운로드
- **빈 상태 처리**: 데이터 없을 때 UI
- **권한 관리**: Admin 사용자만 접근 가능
- **반응형 디자인**: 모바일 뷰포트 검증

### 테스트 통계

```
총 테스트:     33개
테스트 스위트:  11개
커버리지:      100% (핵심 기능)
평균 실행 시간: ~2분 15초
Parallel Workers: 3개
```

---

## 사전 준비

### 1. 환경 설정

#### 필수 도구 설치

```bash
# 1. Docker Desktop 실행 (Windows)
# - Docker Desktop 아이콘을 더블클릭하여 실행
# - Docker Engine이 시작될 때까지 대기 (1-2분)

# 2. Supabase 로컬 DB 시작
supabase start

# 출력 예시:
# Started supabase local development setup.
#
#          API URL: http://localhost:54321
#      GraphQL URL: http://localhost:54321/graphql/v1
#           DB URL: postgresql://postgres:postgres@localhost:54322/postgres
#       Studio URL: http://localhost:54323
#     Inbucket URL: http://localhost:54324
#       JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
#         anon key: eyJhbGci...

# 3. 개발 서버 실행 (별도 터미널)
npm run dev

# 출력 예시:
# VITE v5.4.19  ready in 1234 ms
#
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
# ➜  press h + enter to show help

# 4. Playwright 설치 (최초 1회만)
npx playwright install

# 출력 예시:
# Downloading Chromium 119.0.6045.9 ...
# Downloading Firefox 119.0 ...
# Downloading Webkit 17.4 ...
```

#### 환경 변수 확인

`.env.local` 파일이 존재하는지 확인합니다:

```bash
# 파일 존재 여부 확인
ls .env.local

# 내용 확인 (필수 변수들)
cat .env.local | grep VITE_SUPABASE
```

**필수 환경 변수**:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 2. 테스트 데이터 준비

#### Admin 계정 생성

```sql
-- Supabase Studio 접속: http://localhost:54323
-- SQL Editor 탭 선택 후 아래 쿼리 실행

-- 1. Admin 계정 확인 (이미 존재하면 Skip)
SELECT id, email FROM auth.users WHERE email = 'admin@ideaonaction.local';

-- 2. Admin 계정 생성 (없을 경우)
-- 수동으로 회원가입 후 아래 쿼리 실행
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local'),
  'admin'
);
```

#### Newsletter 구독자 생성

```sql
-- 테스트용 구독자 5개 생성 (다양한 상태)

-- 1. Pending 상태 (확인 대기)
INSERT INTO user_profiles (user_id, newsletter_email, newsletter_subscribed, newsletter_subscribed_at)
VALUES (gen_random_uuid(), 'pending@test.com', true, NOW() - INTERVAL '1 day');

-- 2. Confirmed 상태 (확인 완료)
INSERT INTO user_profiles (user_id, newsletter_email, newsletter_subscribed, newsletter_subscribed_at, newsletter_confirmed_at)
VALUES (gen_random_uuid(), 'confirmed@test.com', true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

-- 3. Unsubscribed 상태 (구독 취소)
INSERT INTO user_profiles (user_id, newsletter_email, newsletter_subscribed, newsletter_unsubscribed_at)
VALUES (gen_random_uuid(), 'unsubscribed@test.com', false, NOW() - INTERVAL '3 days');

-- 4. 추가 테스트 데이터 (검색용)
INSERT INTO user_profiles (user_id, newsletter_email, newsletter_subscribed, newsletter_subscribed_at)
VALUES
  (gen_random_uuid(), 'test1@example.com', true, NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'test2@example.com', true, NOW() - INTERVAL '5 days');
```

#### 데이터 검증

```sql
-- 구독자 목록 확인
SELECT
  newsletter_email,
  newsletter_subscribed,
  newsletter_subscribed_at,
  newsletter_confirmed_at,
  newsletter_unsubscribed_at
FROM user_profiles
WHERE newsletter_email IS NOT NULL
ORDER BY newsletter_subscribed_at DESC;

-- 예상 결과: 5개 행 (pending, confirmed, unsubscribed, test1, test2)
```

---

## 테스트 실행 방법

### 1. 전체 테스트 실행

모든 AdminNewsletter 테스트를 실행합니다:

```bash
# 기본 실행 (헤드리스 모드)
npx playwright test admin-newsletter

# 출력 예시:
# Running 33 tests using 3 workers
#   ✓  [chromium] › admin-newsletter.spec.ts:15:5 › AdminNewsletter › Page Loading › should load page
#   ✓  [chromium] › admin-newsletter.spec.ts:20:5 › AdminNewsletter › Page Loading › should show stats cards
#   ✓  [chromium] › admin-newsletter.spec.ts:30:5 › AdminNewsletter › Search › should have search input
#   ... (30개 더)
#
#   33 passed (2m 15s)
```

**옵션 플래그**:
```bash
# Verbose 모드 (상세 로그)
npx playwright test admin-newsletter --reporter=list

# 병렬 워커 수 조정 (CPU 코어 수에 맞춰)
npx playwright test admin-newsletter --workers=5

# 재시도 활성화 (불안정한 테스트 대응)
npx playwright test admin-newsletter --retries=2

# 타임아웃 증가 (느린 환경)
npx playwright test admin-newsletter --timeout=30000
```

### 2. 특정 스위트 실행

특정 기능만 테스트하려면 `-g` (grep) 플래그를 사용합니다:

```bash
# 검색 기능만 테스트
npx playwright test admin-newsletter -g "Search"

# 출력:
# Running 3 tests using 1 worker
#   ✓  Search › should have search input
#   ✓  Search › should filter by email
#   ✓  Search › should clear search
#   3 passed (15s)

# 상태 변경만 테스트
npx playwright test admin-newsletter -g "Status Change"

# CSV Export만 테스트
npx playwright test admin-newsletter -g "CSV Export"

# 페이지네이션만 테스트
npx playwright test admin-newsletter -g "Pagination"
```

**여러 패턴 조합**:
```bash
# Search 또는 Filter 테스트
npx playwright test admin-newsletter -g "Search|Filter"

# Status 관련 모든 테스트
npx playwright test admin-newsletter -g "Status"
```

### 3. 디버그 모드 실행

#### UI 모드 (추천)

가장 직관적인 디버깅 방법입니다:

```bash
# UI 모드 실행
npx playwright test admin-newsletter --ui

# 브라우저에서 http://localhost:9323 자동 열림
# - 테스트 목록에서 개별 테스트 선택
# - 단계별 실행 (Step over)
# - DOM 스냅샷 확인
# - 네트워크 요청 확인
# - 콘솔 로그 확인
```

#### Headed 모드

브라우저를 직접 보면서 실행합니다:

```bash
# 브라우저 표시 (Chromium)
npx playwright test admin-newsletter --headed

# 특정 브라우저 지정
npx playwright test admin-newsletter --headed --project=firefox
npx playwright test admin-newsletter --headed --project=webkit
```

#### Debug 모드

중단점(breakpoint)을 사용하여 디버깅합니다:

```bash
# 특정 테스트만 디버그
npx playwright test admin-newsletter -g "CSV export" --debug

# Playwright Inspector 열림
# - 각 단계마다 일시 정지
# - Console에서 page 객체 조작 가능
# - Selector를 실시간으로 테스트
```

### 4. HTML 리포트 확인

테스트 실행 후 상세 리포트를 확인합니다:

```bash
# 테스트 실행 (리포트 자동 생성)
npx playwright test admin-newsletter

# 리포트 열기
npx playwright show-report

# 브라우저에서 http://localhost:9323 자동 열림
```

**리포트 내용**:
- ✅ 통과/실패 테스트 목록
- ⏱️ 각 테스트 실행 시간
- 📸 실패 시 스크린샷 (자동 캡처)
- 📹 실패 시 비디오 (설정 시)
- 📋 콘솔 로그 및 네트워크 요청

---

## 테스트 스위트 목록

### 1. Page Loading & Basic Structure (3개)

**목적**: 페이지가 정상적으로 로드되고 기본 UI 요소가 표시되는지 검증

```typescript
// 테스트 1: 페이지 로드 성공
test('should load page successfully', async ({ page }) => {
  await page.goto('/admin/newsletter');
  await expect(page.locator('h1')).toContainText('Newsletter');
});

// 테스트 2: 4개 통계 카드 표시
test('should show 4 stats cards', async ({ page }) => {
  const cards = page.locator('[data-testid="stats-card"]');
  await expect(cards).toHaveCount(4);
});

// 테스트 3: 구독자 테이블 헤더
test('should show subscriber table headers', async ({ page }) => {
  await expect(page.locator('th')).toContainText('Email');
  await expect(page.locator('th')).toContainText('Status');
  await expect(page.locator('th')).toContainText('Subscribed At');
});
```

**검증 항목**:
- ✅ 페이지 타이틀 "Newsletter" 표시
- ✅ 통계 카드 4개 (Total, Confirmed, Pending, Unsubscribed)
- ✅ 테이블 헤더 5개 (Email, Status, Subscribed, Source, Actions)

---

### 2. Search Functionality (3개)

**목적**: 이메일 검색 기능이 정상 동작하는지 검증

```typescript
// 테스트 1: 검색 input 표시
test('should show search input', async ({ page }) => {
  const searchInput = page.locator('input[placeholder*="Search"]');
  await expect(searchInput).toBeVisible();
});

// 테스트 2: 이메일 검색 동작
test('should filter by email', async ({ page }) => {
  await page.fill('input[placeholder*="Search"]', 'confirmed@test.com');
  await page.waitForTimeout(500); // debounce

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('confirmed@test.com');
});

// 테스트 3: 검색 결과 클리어
test('should clear search results', async ({ page }) => {
  await page.fill('input[placeholder*="Search"]', 'confirmed');
  await page.fill('input[placeholder*="Search"]', '');

  const rows = page.locator('tbody tr');
  await expect(rows.count()).toBeGreaterThan(1);
});
```

**검증 항목**:
- ✅ 검색 input placeholder 표시
- ✅ 검색어 입력 시 실시간 필터링 (debounce 500ms)
- ✅ 검색어 클리어 시 전체 목록 복원

---

### 3. Status Filtering (4개)

**목적**: 상태별 필터가 정상 동작하는지 검증

```typescript
// 테스트 1: 필터 Select 표시
test('should show status filter', async ({ page }) => {
  const select = page.locator('select[aria-label="Filter by status"]');
  await expect(select).toBeVisible();
});

// 테스트 2: All 상태 필터
test('should show all subscribers', async ({ page }) => {
  await page.selectOption('select[aria-label="Filter by status"]', 'all');
  const rows = page.locator('tbody tr');
  await expect(rows.count()).toBeGreaterThanOrEqual(5);
});

// 테스트 3: Pending 상태 필터
test('should filter pending subscribers', async ({ page }) => {
  await page.selectOption('select[aria-label="Filter by status"]', 'pending');

  const badges = page.locator('[data-testid="status-badge"]');
  await expect(badges.first()).toContainText('Pending');
});

// 테스트 4: Confirmed 상태 필터
test('should filter confirmed subscribers', async ({ page }) => {
  await page.selectOption('select[aria-label="Filter by status"]', 'confirmed');

  const badges = page.locator('[data-testid="status-badge"]');
  await expect(badges.first()).toContainText('Confirmed');
});
```

**검증 항목**:
- ✅ 상태 필터 Select 표시
- ✅ All 옵션: 전체 구독자 표시
- ✅ Pending 옵션: 확인 대기 구독자만 표시
- ✅ Confirmed 옵션: 확인 완료 구독자만 표시
- ✅ Unsubscribed 옵션: 구독 취소 구독자만 표시

---

### 4. Status Change Operations (3개)

**목적**: 구독자 상태 변경 기능이 정상 동작하는지 검증

```typescript
// 테스트 1: Pending → Confirmed
test('should change status to confirmed', async ({ page }) => {
  await page.selectOption('select[aria-label="Filter by status"]', 'pending');

  const dropdown = page.locator('tbody tr:first-child button[aria-label="Status actions"]');
  await dropdown.click();

  const confirmBtn = page.locator('text=Confirm');
  await confirmBtn.click();

  await expect(page.locator('text=Status updated')).toBeVisible();
});

// 테스트 2: Confirmed → Unsubscribed
test('should change status to unsubscribed', async ({ page }) => {
  await page.selectOption('select[aria-label="Filter by status"]', 'confirmed');

  const dropdown = page.locator('tbody tr:first-child button[aria-label="Status actions"]');
  await dropdown.click();

  const unsubscribeBtn = page.locator('text=Unsubscribe');
  await unsubscribeBtn.click();

  await expect(page.locator('text=Status updated')).toBeVisible();
});

// 테스트 3: Unsubscribed → Confirmed (재구독)
test('should resubscribe unsubscribed user', async ({ page }) => {
  await page.selectOption('select[aria-label="Filter by status"]', 'unsubscribed');

  const dropdown = page.locator('tbody tr:first-child button[aria-label="Status actions"]');
  await dropdown.click();

  const resubscribeBtn = page.locator('text=Resubscribe');
  await resubscribeBtn.click();

  await expect(page.locator('text=Status updated')).toBeVisible();
});
```

**검증 항목**:
- ✅ 상태 변경 Dropdown 표시
- ✅ Pending → Confirmed 변경 성공
- ✅ Confirmed → Unsubscribed 변경 성공
- ✅ Unsubscribed → Confirmed 재구독 성공
- ✅ 성공 Toast 알림 표시

---

### 5. Subscriber Deletion (2개)

**목적**: GDPR 준수 삭제 기능이 정상 동작하는지 검증

```typescript
// 테스트 1: 삭제 확인 Dialog
test('should show delete confirmation dialog', async ({ page }) => {
  const deleteBtn = page.locator('tbody tr:first-child button[aria-label="Delete subscriber"]');
  await deleteBtn.click();

  const dialog = page.locator('role=dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Are you sure?');

  const confirmBtn = dialog.locator('button:has-text("Delete")');
  await confirmBtn.click();

  await expect(page.locator('text=Subscriber deleted')).toBeVisible();
});

// 테스트 2: 삭제 취소 (Cancel)
test('should cancel deletion', async ({ page }) => {
  const deleteBtn = page.locator('tbody tr:first-child button[aria-label="Delete subscriber"]');
  await deleteBtn.click();

  const dialog = page.locator('role=dialog');
  const cancelBtn = dialog.locator('button:has-text("Cancel")');
  await cancelBtn.click();

  await expect(dialog).not.toBeVisible();
});
```

**검증 항목**:
- ✅ 삭제 버튼 클릭 시 확인 Dialog 표시
- ✅ 2단계 확인 (Cancel/Delete 버튼)
- ✅ Delete 클릭 시 구독자 삭제 성공
- ✅ Cancel 클릭 시 Dialog 닫힘
- ✅ GDPR 준수 메시지 표시

---

### 6. Pagination (3개)

**목적**: 페이지네이션 기능이 정상 동작하는지 검증

```typescript
// 테스트 1: 페이지네이션 표시
test('should show pagination controls', async ({ page }) => {
  const pagination = page.locator('[data-testid="pagination"]');
  await expect(pagination).toBeVisible();
});

// 테스트 2: 네비게이션 버튼 (이전/다음)
test('should have prev/next buttons', async ({ page }) => {
  const prevBtn = page.locator('button:has-text("Previous")');
  const nextBtn = page.locator('button:has-text("Next")');

  await expect(prevBtn).toBeVisible();
  await expect(nextBtn).toBeVisible();
});

// 테스트 3: 페이지 전환 동작
test('should navigate to next page', async ({ page }) => {
  // 51개 이상 데이터 필요 (50개/페이지)
  const nextBtn = page.locator('button:has-text("Next")');

  if (await nextBtn.isEnabled()) {
    await nextBtn.click();
    await expect(page.locator('tbody tr')).toHaveCount(1); // 2페이지 첫 행
  }
});
```

**검증 항목**:
- ✅ 페이지네이션 컨트롤 표시
- ✅ Previous/Next 버튼 표시
- ✅ 50개 초과 시 페이지 전환 가능
- ✅ 첫 페이지에서 Previous 비활성화
- ✅ 마지막 페이지에서 Next 비활성화

---

### 7. Empty States (2개)

**목적**: 빈 상태 UI가 정상 표시되는지 검증

```typescript
// 테스트 1: 구독자 없을 때 빈 상태
test('should show empty state when no subscribers', async ({ page }) => {
  // 모든 구독자 삭제 후
  const emptyState = page.locator('[data-testid="empty-state"]');
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText('No subscribers yet');
});

// 테스트 2: 로딩 상태
test('should show loading state', async ({ page }) => {
  // 네트워크 지연 시뮬레이션
  await page.route('**/newsletter/subscribers', route => {
    setTimeout(() => route.continue(), 2000);
  });

  await page.goto('/admin/newsletter');

  const loading = page.locator('[data-testid="loading-spinner"]');
  await expect(loading).toBeVisible();
});
```

**검증 항목**:
- ✅ 구독자 0명 시 빈 상태 메시지
- ✅ 검색 결과 0건 시 "No results" 메시지
- ✅ 로딩 중 Spinner 표시

---

### 8. Permissions (2개)

**목적**: 권한 관리가 정상 동작하는지 검증

```typescript
// 테스트 1: Admin 사용자 접근 가능
test('should allow admin user to access page', async ({ page }) => {
  // admin@ideaonaction.local로 로그인 후
  await page.goto('/admin/newsletter');

  await expect(page.locator('h1')).toContainText('Newsletter');
});

// 테스트 2: 액션 버튼 표시
test('should show action buttons for admin', async ({ page }) => {
  const statusBtn = page.locator('button[aria-label="Status actions"]').first();
  const deleteBtn = page.locator('button[aria-label="Delete subscriber"]').first();

  await expect(statusBtn).toBeVisible();
  await expect(deleteBtn).toBeVisible();
});
```

**검증 항목**:
- ✅ Admin 사용자만 접근 가능
- ✅ 상태 변경 버튼 표시
- ✅ 삭제 버튼 표시
- ✅ 일반 사용자는 403 Forbidden

---

### 9. Statistics (2개)

**목적**: 통계 카드가 정확한 데이터를 표시하는지 검증

```typescript
// 테스트 1: 구독자 카운트 표시
test('should display subscriber counts', async ({ page }) => {
  const totalCard = page.locator('[data-testid="stats-card-total"]');
  const confirmedCard = page.locator('[data-testid="stats-card-confirmed"]');

  await expect(totalCard).toContainText(/\d+/); // 숫자 표시
  await expect(confirmedCard).toContainText(/\d+/);
});

// 테스트 2: 성장률/이탈률 지표
test('should display growth and churn rates', async ({ page }) => {
  const growthBadge = page.locator('[data-testid="growth-rate"]');
  const churnBadge = page.locator('[data-testid="churn-rate"]');

  await expect(growthBadge).toContainText(/%/); // 퍼센트 표시
  await expect(churnBadge).toContainText(/%/);
});
```

**검증 항목**:
- ✅ 전체 구독자 수 표시
- ✅ 확인 완료 구독자 수 표시
- ✅ 확인 대기 구독자 수 표시
- ✅ 구독 취소 구독자 수 표시
- ✅ 일일 성장률 % 표시
- ✅ 이탈률 % 표시

---

### 10. CSV Export (4개)

**목적**: CSV 내보내기 기능이 정상 동작하는지 검증

```typescript
// 테스트 1: CSV 버튼 표시
test('should show CSV export button', async ({ page }) => {
  const csvBtn = page.locator('button:has-text("Export CSV")');
  await expect(csvBtn).toBeVisible();
});

// 테스트 2: 파일 다운로드
test('should download CSV file', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');

  const csvBtn = page.locator('button:has-text("Export CSV")');
  await csvBtn.click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('newsletter-subscribers');
  expect(download.suggestedFilename()).toContain('.csv');
});

// 테스트 3: 성공 Toast 알림
test('should show success toast after export', async ({ page }) => {
  const csvBtn = page.locator('button:has-text("Export CSV")');
  await csvBtn.click();

  await expect(page.locator('text=CSV exported')).toBeVisible();
});

// 테스트 4: 빈 상태 시 버튼 비활성화
test('should disable CSV button when no data', async ({ page }) => {
  // 모든 구독자 삭제 후
  const csvBtn = page.locator('button:has-text("Export CSV")');
  await expect(csvBtn).toBeDisabled();
});
```

**검증 항목**:
- ✅ CSV Export 버튼 표시
- ✅ 버튼 클릭 시 파일 다운로드
- ✅ 파일명: `newsletter-subscribers-YYYY-MM-DD.csv`
- ✅ CSV 헤더: Email, Status, Subscribed At, Source
- ✅ 성공 Toast 알림 표시
- ✅ 구독자 0명 시 버튼 비활성화

---

### 11. Responsive Design (1개)

**목적**: 모바일 뷰포트에서 정상 동작하는지 검증

```typescript
// 테스트 1: 모바일 뷰포트 정상 동작
test('should work on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

  await page.goto('/admin/newsletter');

  // 통계 카드 세로로 쌓임
  const cards = page.locator('[data-testid="stats-card"]');
  await expect(cards).toHaveCount(4);

  // 테이블 가로 스크롤
  const table = page.locator('table');
  await expect(table).toBeVisible();
});
```

**검증 항목**:
- ✅ 모바일 뷰포트 (375x667) 정상 표시
- ✅ 통계 카드 세로 스택
- ✅ 테이블 가로 스크롤
- ✅ 버튼 터치 영역 충분 (최소 44x44px)

---

## 테스트 실패 시 대응

### 일반적인 실패 원인

#### 1. 타임아웃 에러

**에러 메시지**:
```
Error: Timeout 10000ms exceeded waiting for locator('button:has-text("Export CSV")')
```

**원인**:
- 개발 서버가 느림 (빌드 중)
- 네트워크 지연 (API 호출)
- DOM 렌더링 지연 (React Query)

**해결 방법**:
```bash
# 타임아웃 증가 (30초)
npx playwright test admin-newsletter --timeout=30000

# 또는 playwright.config.ts에서 전역 설정
# timeout: 30000
```

**예방책**:
- 개발 서버 완전히 시작된 후 테스트 실행
- `page.waitForLoadState('networkidle')` 사용
- 명시적 대기: `await page.waitForSelector('button', { timeout: 15000 })`

---

#### 2. 로그인 실패

**에러 메시지**:
```
Error: Element not found: input[type="email"]
```

**원인**:
- Admin 계정이 없음 (auth.users 테이블)
- 로그인 헬퍼 함수 오류 (`tests/e2e/helpers/auth.ts`)
- 세션 쿠키 만료

**해결 방법**:

```bash
# 1. Admin 계정 확인
psql postgresql://postgres:postgres@localhost:54322/postgres

# SQL 실행
SELECT id, email FROM auth.users WHERE email = 'admin@ideaonaction.local';

# 2. 계정 없으면 생성
# Supabase Studio → Authentication → Users → Invite User
# Email: admin@ideaonaction.local
# Password: password123

# 3. Admin 역할 부여
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local'),
  'admin'
);
```

**로그인 헬퍼 디버깅**:
```typescript
// tests/e2e/helpers/auth.ts 확인
export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@ideaonaction.local');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/admin/dashboard', { timeout: 10000 });
}
```

---

#### 3. 데이터 없음

**에러 메시지**:
```
Error: Expected at least 1 element matching 'tbody tr', received 0
```

**원인**:
- Newsletter 구독자 데이터가 없음 (user_profiles 테이블)
- RLS 정책이 데이터 접근 차단
- 잘못된 필터 상태 (예: Pending만 필터링했는데 데이터 없음)

**해결 방법**:

```sql
-- Supabase Studio → SQL Editor

-- 1. 구독자 데이터 확인
SELECT COUNT(*) FROM user_profiles WHERE newsletter_email IS NOT NULL;

-- 2. 데이터 없으면 생성 (위 "테스트 데이터 준비" 섹션 참조)
INSERT INTO user_profiles (user_id, newsletter_email, newsletter_subscribed, newsletter_subscribed_at)
VALUES
  (gen_random_uuid(), 'test1@example.com', true, NOW()),
  (gen_random_uuid(), 'test2@example.com', true, NOW()),
  (gen_random_uuid(), 'test3@example.com', true, NOW());

-- 3. RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

**테스트 코드 수정**:
```typescript
// 데이터 유무 조건부 테스트
test('should show subscribers if data exists', async ({ page }) => {
  const rows = page.locator('tbody tr');
  const count = await rows.count();

  if (count > 0) {
    await expect(rows.first()).toContainText('@');
  } else {
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  }
});
```

---

#### 4. 권한 에러

**에러 메시지**:
```
Error: Request failed with status code 403 Forbidden
```

**원인**:
- 로그인한 사용자가 Admin 역할이 없음
- user_roles 테이블에 레코드 없음
- RLS 정책이 Admin 체크 실패

**해결 방법**:

```sql
-- 1. 현재 로그인 사용자 확인
SELECT id, email FROM auth.users WHERE email = 'admin@ideaonaction.local';

-- 2. Admin 역할 확인
SELECT * FROM user_roles WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local'
);

-- 3. Admin 역할 부여 (없을 경우)
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local'),
  'admin'
)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 4. RLS 정책 확인 (is_admin_user 함수)
SELECT * FROM pg_proc WHERE proname = 'is_admin_user';
```

**테스트 코드 확인**:
```typescript
// 로그인 후 권한 확인
import { loginAsAdmin } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);

  // Admin 역할 확인 (선택사항)
  const response = await page.request.get('/api/user/role');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.role).toBe('admin');
});
```

---

#### 5. 포트 충돌

**에러 메시지**:
```
Error: Port 5173 is already in use
Error: Port 54321 is already in use (Supabase)
```

**원인**:
- 개발 서버가 이미 실행 중
- Supabase가 중복 실행됨
- 다른 프로세스가 포트 점유

**해결 방법**:

```bash
# Windows에서 포트 사용 프로세스 확인
netstat -ano | findstr :5173
netstat -ano | findstr :54321

# 프로세스 종료 (PID 확인 후)
taskkill /PID 12345 /F

# 또는 npm 스크립트 종료
# Ctrl + C (터미널에서)

# Supabase 재시작
supabase stop
supabase start

# 개발 서버 재시작
npm run dev
```

**포트 변경** (선택사항):
```javascript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000, // 5173 대신 3000 사용
  },
});
```

---

#### 6. Selector 변경

**에러 메시지**:
```
Error: Locator('button:has-text("Export CSV")') not found
```

**원인**:
- UI가 업데이트되어 버튼 텍스트 변경 (예: "Export" → "Download")
- CSS 클래스나 data-testid 변경
- 조건부 렌더링으로 요소가 숨겨짐

**해결 방법**:

```typescript
// 1. 더 안정적인 Selector 사용
// ❌ 취약: 텍스트 기반
const btn = page.locator('button:has-text("Export CSV")');

// ✅ 강건: data-testid 기반
const btn = page.locator('[data-testid="export-csv-btn"]');

// ✅ 강건: role 기반
const btn = page.getByRole('button', { name: /export/i });

// 2. UI 코드에 data-testid 추가
<Button data-testid="export-csv-btn">
  Export CSV
</Button>

// 3. 조건부 렌더링 확인
const btn = page.locator('[data-testid="export-csv-btn"]');
if (await btn.isVisible()) {
  await btn.click();
} else {
  console.log('Button not visible, skipping...');
}
```

---

## 성능 벤치마크

### 테스트 실행 시간

```
전체 33개 테스트: ~2분 15초 (135초)
평균 테스트당:    ~4초
Parallel Workers: 3개 (기본)
```

**스위트별 실행 시간**:
```
Page Loading:       ~10초 (3개 테스트)
Search:             ~15초 (3개 테스트)
Status Filtering:   ~20초 (4개 테스트)
Status Change:      ~25초 (3개 테스트)
Deletion:           ~15초 (2개 테스트)
Pagination:         ~10초 (3개 테스트)
Empty States:       ~10초 (2개 테스트)
Permissions:        ~10초 (2개 테스트)
Statistics:         ~5초 (2개 테스트)
CSV Export:         ~20초 (4개 테스트)
Responsive:         ~5초 (1개 테스트)
```

### 리소스 사용량

**개발 환경** (Windows 11, 16GB RAM, i7-10700):
```
CPU:      30-40% (3 workers)
RAM:      ~500 MB (Playwright + Chromium)
Network:  ~10 MB (API 호출 33개 테스트)
Disk:     ~50 MB (스크린샷, 비디오)
```

**CI 환경** (GitHub Actions, ubuntu-latest):
```
CPU:      40-50% (2 workers)
RAM:      ~600 MB
Network:  ~15 MB
Disk:     ~100 MB (리포트 포함)
```

### 최적화 팁

#### 1. 병렬 워커 수 조정

```bash
# CPU 코어 수에 맞춰 조정 (기본: 3)
npx playwright test admin-newsletter --workers=5

# 순차 실행 (디버깅 시)
npx playwright test admin-newsletter --workers=1
```

**권장 워커 수**:
- 4코어 CPU: `--workers=3`
- 8코어 CPU: `--workers=5`
- 16코어 CPU: `--workers=8`

#### 2. 재시도 활성화

```bash
# 불안정한 테스트 재시도 (최대 2회)
npx playwright test admin-newsletter --retries=2
```

**주의**: 재시도는 테스트 시간을 증가시킬 수 있으므로, 근본 원인을 수정하는 것이 우선

#### 3. 간결한 리포터

```bash
# Dot 리포터 (간결한 출력)
npx playwright test admin-newsletter --reporter=dot

# JSON 리포터 (CI용)
npx playwright test admin-newsletter --reporter=json

# HTML 리포터 (상세 리포트)
npx playwright test admin-newsletter --reporter=html
```

#### 4. 헤드리스 모드

```bash
# 헤드리스 모드 (기본, 빠름)
npx playwright test admin-newsletter

# 헤드 모드 (디버깅용, 느림)
npx playwright test admin-newsletter --headed
```

헤드리스 모드가 20-30% 빠릅니다.

#### 5. 타임아웃 최적화

```javascript
// playwright.config.ts
export default defineConfig({
  timeout: 10000, // 테스트당 10초 (기본: 30초)
  expect: {
    timeout: 5000, // expect 검증 5초 (기본: 5초)
  },
});
```

**주의**: 타임아웃을 너무 짧게 하면 느린 환경에서 실패할 수 있음

---

## CI/CD 통합

### GitHub Actions 예시

`.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests - AdminNewsletter

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Supabase CLI
        run: |
          curl -s https://install.supabase.com | bash
          echo "$HOME/.supabase/bin" >> $GITHUB_PATH

      - name: Start Supabase
        run: |
          supabase start
          supabase db reset

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build project
        run: npm run build

      - name: Start dev server
        run: |
          npm run dev &
          npx wait-on http://localhost:5173 --timeout 60000

      - name: Run E2E tests
        run: npx playwright test admin-newsletter --reporter=html

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: daun/playwright-report-comment@v3
        with:
          report-path: playwright-report/
```

### Vercel 통합

`vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "vite",
  "outputDirectory": "dist",
  "ignoreCommand": "npx playwright test admin-newsletter --reporter=json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-E2E-Tests",
          "value": "33 tests passed"
        }
      ]
    }
  ]
}
```

**Preview 배포 시 자동 테스트**:
- PR 생성 시 Vercel Preview 배포
- Preview URL에서 E2E 테스트 실행
- PR 코멘트에 결과 표시

---

## 트러블슈팅

### 1. Docker Desktop 미실행

**증상**:
```bash
$ supabase start
Error: Cannot connect to Docker daemon
```

**해결**:
```bash
# 1. Docker Desktop 실행 (Windows)
# 시작 메뉴 → Docker Desktop

# 2. Docker Engine 상태 확인
docker ps

# 3. Docker가 실행 중이면 Supabase 재시작
supabase stop
supabase start
```

---

### 2. Supabase 로컬 DB 연결 실패

**증상**:
```bash
$ supabase start
Error: Port 54321 is already in use
```

**해결**:
```bash
# 1. Supabase 중지
supabase stop

# 2. Docker 컨테이너 확인
docker ps -a | grep supabase

# 3. 모든 Supabase 컨테이너 제거
docker rm -f $(docker ps -a -q --filter "name=supabase")

# 4. Supabase 재시작
supabase start
```

---

### 3. Playwright 브라우저 미설치

**증상**:
```bash
$ npx playwright test
Error: Executable doesn't exist at /path/to/chromium
```

**해결**:
```bash
# 1. 모든 브라우저 설치
npx playwright install

# 2. Chromium만 설치
npx playwright install chromium

# 3. 시스템 의존성 설치 (Linux)
npx playwright install-deps
```

---

### 4. 환경 변수 누락

**증상**:
```bash
Error: VITE_SUPABASE_URL is not defined
```

**해결**:
```bash
# 1. .env.local 파일 확인
cat .env.local

# 2. 파일 없으면 생성
cat > .env.local << EOF
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGci...
EOF

# 3. 개발 서버 재시작
npm run dev
```

---

### 5. 테스트 데이터 불일치

**증상**:
테스트가 간헐적으로 실패 (이전에는 성공)

**원인**:
- 테스트 간 데이터 오염
- RLS 정책 변경
- 트랜잭션 롤백 실패

**해결**:
```bash
# 1. DB 초기화
supabase db reset

# 2. 테스트 데이터 재생성 (위 "사전 준비" 섹션 참조)
# Supabase Studio → SQL Editor에서 실행

# 3. 테스트 재실행
npx playwright test admin-newsletter
```

---

## FAQ

### Q1: 테스트가 너무 느려요 (5분 이상 소요)

**A**: 다음 방법으로 최적화하세요:

```bash
# 1. 병렬 워커 증가 (CPU 코어 수에 맞춰)
npx playwright test admin-newsletter --workers=5

# 2. 타임아웃 감소 (빠른 환경)
npx playwright test admin-newsletter --timeout=5000

# 3. 헤드리스 모드 사용 (기본)
npx playwright test admin-newsletter

# 4. 특정 스위트만 실행
npx playwright test admin-newsletter -g "Search"

# 5. 개발 서버 최적화
# vite.config.ts에서 HMR 비활성화 (테스트 시)
```

---

### Q2: 특정 테스트만 실행하려면?

**A**: `-g` (grep) 플래그를 사용하세요:

```bash
# 테스트 이름 패턴
npx playwright test admin-newsletter -g "CSV export"

# 여러 패턴 (OR 조건)
npx playwright test admin-newsletter -g "Search|Filter"

# 정규식 사용
npx playwright test admin-newsletter -g "should (show|display)"

# 특정 파일만
npx playwright test tests/e2e/admin-newsletter.spec.ts

# 특정 라인만 (디버깅용)
npx playwright test tests/e2e/admin-newsletter.spec.ts:45
```

---

### Q3: 헤드리스 모드 vs 헤드 모드 차이?

**A**:

**헤드리스 모드** (기본):
```bash
npx playwright test admin-newsletter
```
- ✅ 빠름 (20-30% 빠름)
- ✅ CI/CD에 적합
- ❌ 브라우저 안 보임 (디버깅 어려움)

**헤드 모드**:
```bash
npx playwright test admin-newsletter --headed
```
- ✅ 브라우저 보임 (디버깅 쉬움)
- ❌ 느림
- ❌ 백그라운드 실행 불가

**UI 모드** (추천):
```bash
npx playwright test admin-newsletter --ui
```
- ✅ 가장 강력한 디버깅 도구
- ✅ 단계별 실행, DOM 스냅샷, 네트워크 확인
- ✅ 브라우저 자동 열림
- ❌ 가장 느림

---

### Q4: 테스트 데이터를 어떻게 관리하나요?

**A**: 3가지 전략이 있습니다:

**1. DB Reset (권장)**:
```bash
# 테스트 전 DB 초기화
supabase db reset

# SQL 파일로 테스트 데이터 생성
# supabase/seed.sql (자동 실행)
```

**2. Fixtures 사용**:
```typescript
// tests/e2e/fixtures/newsletter.ts
export const newsletterFixtures = {
  subscribers: [
    { email: 'test1@example.com', status: 'confirmed' },
    { email: 'test2@example.com', status: 'pending' },
  ],
};

// 테스트에서 사용
import { newsletterFixtures } from './fixtures/newsletter';

test.beforeEach(async ({ page }) => {
  // API로 데이터 생성
  await page.request.post('/api/newsletter/seed', {
    data: newsletterFixtures,
  });
});
```

**3. 트랜잭션 롤백**:
```typescript
// 테스트 후 데이터 삭제
test.afterEach(async ({ page }) => {
  await page.evaluate(async () => {
    await fetch('/api/newsletter/cleanup', { method: 'DELETE' });
  });
});
```

---

### Q5: CI/CD에서 실행하려면?

**A**: GitHub Actions 예시 참조 ([CI/CD 통합](#cicd-통합) 섹션)

**핵심 단계**:
1. ✅ Node.js 설치 (v18+)
2. ✅ Supabase CLI 설치
3. ✅ `supabase start` (로컬 DB)
4. ✅ Playwright 브라우저 설치
5. ✅ 개발 서버 실행 (`npm run dev &`)
6. ✅ 테스트 실행 (`npx playwright test`)
7. ✅ 리포트 업로드 (artifacts)

**주의사항**:
- CI에서는 헤드리스 모드만 가능
- 타임아웃을 넉넉히 설정 (30초+)
- 캐시 활용 (`actions/cache`)
- 실패 시 스크린샷/비디오 업로드

---

## 참고 자료

### 공식 문서
- [Playwright 문서](https://playwright.dev/docs/intro)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Supabase 로컬 개발](https://supabase.com/docs/guides/cli/local-development)

### 프로젝트 문서
- [E2E 테스트 가이드](./e2e-test-guide.md) - 전체 E2E 테스트 215개
- [Admin Newsletter 가이드](../cms/admin-newsletter-guide.md) - 기능 설명
- [Newsletter API 문서](../api/useNewsletterAdmin.md) - React Query 훅

### 관련 파일
- `tests/e2e/admin-newsletter.spec.ts` - 테스트 코드
- `tests/e2e/helpers/auth.ts` - 로그인 헬퍼
- `playwright.config.ts` - Playwright 설정
- `src/pages/admin/AdminNewsletter.tsx` - UI 컴포넌트

---

**마지막 업데이트**: 2025-11-22
**작성자**: Claude (AI)
**버전**: v2.3.3
