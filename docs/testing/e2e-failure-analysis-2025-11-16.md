# E2E 테스트 실패 분석 보고서

**작성일**: 2025-11-16
**분석 대상**: Admin E2E 테스트 215개
**실행 환경**: Chromium (9 workers)

---

## 1. Executive Summary

| 구분 | 개수 | 비율 |
|------|------|------|
| **전체 테스트** | 215 | 100% |
| **통과** | 130 | 60.5% |
| **실패** | 85 | 39.5% |

**주요 실패 원인**:
1. **AdminUsers 권한 문제** (20개, 23.5%) - `super_admin` 역할 필요, `admin` 역할로 테스트 실패
2. **Create/Edit Dialog 타임아웃** (32개, 37.6%) - 30초 타임아웃, 버튼 클릭 대기 중 시간 초과
3. **Selector 불일치** (18개, 21.2%) - Strict mode violation, 다중 요소 매칭
4. **Timeout (beforeEach)** (2개, 2.4%) - beforeEach 훅에서 3초 대기 중 타임아웃
5. **기타** (13개, 15.3%) - 정규식 구문 오류, CSS selector 오류 등

---

## 2. 실패 원인 분류

### 2.1. AdminUsers 권한 문제 (20개, 23.5%)

**근본 원인**: AdminUsers 페이지는 `super_admin` 역할만 접근 가능하나, E2E 테스트는 `admin` 역할로 로그인

**에러 메시지**:
```
Expected substring: "권한이 없습니다"
Received: "분석 대시보드"
```

**실패한 테스트**:
1. `admin-users.spec.ts:24` - should show access denied message for non-super_admin users
2. `admin-users.spec.ts:37` - should display page content for super_admin users
3. `admin-users.spec.ts:54` - should navigate to admin users page from sidebar
4. `admin-users.spec.ts:74` - should search users by email with debounced autocomplete
5. `admin-users.spec.ts:105` - should display search results when user is found
6. `admin-users.spec.ts:136` - should open add admin dialog
7. `admin-users.spec.ts:155` - should select user from search results
8. `admin-users.spec.ts:185` - should select role from dropdown
9. `admin-users.spec.ts:215` - should display role badges with correct colors
10. `admin-users.spec.ts:241` - should search admins by email
11. `admin-users.spec.ts:269` - should filter admins by role
12. `admin-users.spec.ts:302` - should open edit dialog with pre-filled data
13. `admin-users.spec.ts:332` - should show delete confirmation dialog
14. `admin-users.spec.ts:359` - should cancel delete operation
15. `admin-users.spec.ts:389` - should show empty state when no admins exist
16. `admin-users.spec.ts:413` - should show loading spinner while fetching data
17. `admin-users.spec.ts:429` - should show validation error when submitting without user selection
18. `admin-users.spec.ts:449` - should close dialog on cancel
19. `analytics.spec.ts:17` - Analytics Page: should show 403 Forbidden for non-admin users
20. `dashboard.spec.ts:17` - Admin Dashboard: should show 403 Forbidden for non-admin users

**해결 방안**:
- **P0 (긴급)**: `tests/fixtures/auth-helpers.ts`에 `loginAsSuperAdmin()` 함수 추가
- **예상 작업**: 0.5시간
- **필요 파일**: `auth-helpers.ts`, `admin-users.spec.ts`

---

### 2.2. Create/Edit Dialog 타임아웃 (32개, 37.6%)

**근본 원인**: 다이얼로그 열기/닫기 버튼 클릭 시 30초 타임아웃

**에러 메시지**:
```
Test timeout of 30000ms exceeded.
Error: locator.click: Test timeout of 30000ms exceeded.
```

**실패한 테스트 (페이지별)**:

#### AdminBlogCategories (10개)
1. `admin-blog-categories.spec.ts:72` - should open create dialog when clicking "새 카테고리" button
2. `admin-blog-categories.spec.ts:90` - should show validation errors for missing required fields
3. `admin-blog-categories.spec.ts:109` - should validate slug format (kebab-case)
4. `admin-blog-categories.spec.ts:131` - should validate hex color format
5. `admin-blog-categories.spec.ts:156` - should create category successfully with valid data
6. `admin-blog-categories.spec.ts:191` - should verify new category appears in table
7. `admin-blog-categories.spec.ts:263` - should display color preview box
8. `admin-blog-categories.spec.ts:277` - should update color preview when hex code changes
9. `admin-blog-categories.spec.ts:301` - should accept valid icon names
10. `admin-blog-categories.spec.ts:494` - should delete category successfully (if no posts)

#### AdminLab (5개)
1. `admin-lab.spec.ts:99` - should create lab item with valid data
2. `admin-lab.spec.ts:245` - should show all categories when "전체 카테고리" selected
3. `admin-lab.spec.ts:339` - should update lab item successfully
4. `admin-lab.spec.ts:386` - should cancel delete when clicking "취소"
5. `admin-lab.spec.ts:410` - should delete lab item when confirmed

#### AdminPortfolio (10개)
1. `admin-portfolio.spec.ts:82` - should create portfolio with all required fields
2. `admin-portfolio.spec.ts:122` - should create portfolio with optional fields
3. `admin-portfolio.spec.ts:154` - should handle tech stack JSON array input
4. `admin-portfolio.spec.ts:183` - should handle testimonial JSON object input
5. `admin-portfolio.spec.ts:219` - should toggle featured and published switches
6. `admin-portfolio.spec.ts:340` - should reset to all types
7. `admin-portfolio.spec.ts:353` - should filter by published status (beforeEach timeout)
8. `admin-portfolio.spec.ts:507` - should delete portfolio on confirmation

#### AdminTags (4개)
1. `admin-tags.spec.ts:112` - should validate kebab-case format for slug
2. `admin-tags.spec.ts:378` - should load existing tag data in edit form
3. `admin-tags.spec.ts:403` - should update tag successfully
4. `admin-tags.spec.ts:524` - should delete tag successfully on confirmation
5. `admin-tags.spec.ts:567` - should cancel deletion when clicking cancel

#### ServiceCRUD (3개)
1. `service-crud.spec.ts:26` - should show validation errors for missing required fields
2. `service-crud.spec.ts:50` - should create service successfully with valid data
3. `service-crud.spec.ts:80` - should show created service in list
4. `service-crud.spec.ts:99` - should show success toast notification
5. `service-crud.spec.ts:296` - should delete service on confirmation

**해결 방안**:
- **P1 (높음)**: Selector 수정 (더 구체적인 ARIA role 또는 data-testid 사용)
- **예상 작업**: 4-6시간
- **필요 파일**: 위 5개 spec 파일 + 해당 페이지 컴포넌트

---

### 2.3. Selector 불일치 (18개, 21.2%)

**근본 원인**: Strict mode violation - 하나의 locator가 여러 요소와 매칭

**에러 메시지**:
```
Error: strict mode violation: locator('text=새 포트폴리오 항목') resolved to 2 elements
```

**실패한 테스트**:

#### AdminPortfolio (3개)
1. `admin-portfolio.spec.ts:56` - should open create dialog when clicking add button
2. `admin-portfolio.spec.ts:597` - should display portfolio table with correct columns

#### AdminTags (3개)
1. `admin-tags.spec.ts:42` - should display tags table
2. `admin-tags.spec.ts:140` - should create tag successfully with valid kebab-case slug
3. `admin-tags.spec.ts:178` - should initialize usage_count to 0 for new tags
4. `admin-tags.spec.ts:302` - should show "미사용" badge for tags with 0 usage

#### AdminTeam (12개)
1. `admin-team.spec.ts:28` - should navigate to AdminTeam page successfully
2. `admin-team.spec.ts:94` - should validate email format
3. `admin-team.spec.ts:120` - should create team member successfully with valid data
4. `admin-team.spec.ts:154` - should create team member with avatar URL
5. `admin-team.spec.ts:180` - should create team member with skills array
6. `admin-team.spec.ts:204` - should create team member with social links
7. `admin-team.spec.ts:231` - should set priority field
8. `admin-team.spec.ts:255` - should toggle active status in form
9. `admin-team.spec.ts:507` - should display team members table with correct columns
10. `admin-team.spec.ts:545` - should filter by active status

**해결 방안**:
- **P2 (중간)**: `.first()` 추가 또는 더 구체적인 selector 사용
- **예상 작업**: 2-3시간
- **필요 파일**: admin-portfolio.spec.ts, admin-tags.spec.ts, admin-team.spec.ts

---

### 2.4. Timeout (beforeEach) (2개, 2.4%)

**근본 원인**: `beforeEach` 훅에서 `page.waitForTimeout(3000)` 중 30초 타임아웃

**실패한 테스트**:
1. `admin-lab.spec.ts:339` - should update lab item successfully
2. `admin-portfolio.spec.ts:353` - should filter by published status

**해결 방안**:
- **P2 (중간)**: `waitForTimeout` 제거, `waitForSelector` 사용
- **예상 작업**: 0.5시간
- **필요 파일**: admin-lab.spec.ts, admin-portfolio.spec.ts

---

### 2.5. 기타 (13개, 15.3%)

#### CSS Selector 오류 (2개)
1. `admin-blog-categories.spec.ts:43` - CSS.escape 누락 (CSS selector에 `=` 포함)
2. `admin-lab.spec.ts:26` - CSS.escape 누락 (href 값에 `=` 포함)

**에러 메시지**:
```
Error: page.click: Unexpected token "=" while parsing css selector "a[href="/admin/lab"]"
```

#### 정규식 구문 오류 (3개)
1. `admin-blog-categories.spec.ts:446` - has-text에 정규식 사용 불가
2. `admin-tags.spec.ts:140` - role selector에 정규식 사용 불가

**에러 메시지**:
```
Error: locator.count: Unexpected token "/" while parsing css selector
```

#### 페이지 로드 실패 (3개)
1. `admin-blog-categories.spec.ts:43` - h1 요소 찾기 실패
2. `admin-blog-categories.spec.ts:57` - 테이블 또는 빈 상태 표시 실패

#### 이미지 업로드 실패 (2개)
1. `image-upload.spec.ts:115` - should upload images to Supabase on form submit
2. `image-upload.spec.ts:245` - should display existing images on edit page

#### 기타 Selector 문제 (3개)
1. `admin-lab.spec.ts:132` - 토스트 메시지 selector 오류
2. `admin-lab.spec.ts:582` - 토스트 메시지 selector 오류
3. `realtime.spec.ts:28` - 실시간 대시보드 페이지 로드 실패
4. `revenue.spec.ts:28` - Revenue 페이지 로드 실패

**해결 방안**:
- **P3 (낮음)**: 개별 수정
- **예상 작업**: 1-2시간

---

## 3. 페이지별 통계

| 페이지 | 전체 | 통과 | 실패 | 실패율 |
|--------|------|------|------|--------|
| **AdminBlogCategories** | 24 | 14 | 10 | 41.7% |
| **AdminLab** | 28 | 23 | 5 | 17.9% |
| **AdminPortfolio** | 32 | 22 | 10 | 31.3% |
| **AdminTags** | 24 | 17 | 7 | 29.2% |
| **AdminTeam** | 28 | 18 | 10 | 35.7% |
| **AdminUsers** | 20 | 0 | 20 | 100% |
| **Analytics** | 9 | 8 | 1 | 11.1% |
| **Dashboard** | 7 | 5 | 2 | 28.6% |
| **ImageUpload** | 12 | 10 | 2 | 16.7% |
| **Realtime** | 10 | 9 | 1 | 10.0% |
| **Revenue** | 9 | 7 | 2 | 22.2% |
| **ServiceCRUD** | 15 | 10 | 5 | 33.3% |
| **총합** | **215** | **130** | **85** | **39.5%** |

**실패율 Top 3**:
1. **AdminUsers**: 100% (20/20) - `super_admin` 권한 필요
2. **AdminBlogCategories**: 41.7% (10/24) - Dialog 타임아웃
3. **AdminTeam**: 35.7% (10/28) - Strict mode violation

---

## 4. 실패 테스트 상세 목록

### AdminBlogCategories (10개 실패)

| # | 테스트명 | 라인 | 원인 | 우선순위 |
|---|----------|------|------|----------|
| 1 | should load blog categories page directly | 43 | CSS selector 오류 (href에 `=`) | P3 |
| 2 | should display table or empty state | 57 | h1 요소 찾기 실패 | P2 |
| 3 | should open create dialog when clicking "새 카테고리" button | 72 | 30초 타임아웃 | P1 |
| 4 | should show validation errors for missing required fields | 90 | 30초 타임아웃 | P1 |
| 5 | should validate slug format (kebab-case) | 109 | 30초 타임아웃 | P1 |
| 6 | should validate hex color format | 131 | 30초 타임아웃 | P1 |
| 7 | should create category successfully with valid data | 156 | 30초 타임아웃 | P1 |
| 8 | should verify new category appears in table | 191 | 30초 타임아웃 | P1 |
| 9 | should display color preview box | 263 | 30초 타임아웃 | P1 |
| 10 | should update color preview when hex code changes | 277 | 30초 타임아웃 | P1 |
| 11 | should accept valid icon names | 301 | 30초 타임아웃 | P1 |
| 12 | should show warning if category has posts | 446 | 정규식 구문 오류 | P3 |
| 13 | should delete category successfully (if no posts) | 494 | 30초 타임아웃 | P1 |

### AdminLab (5개 실패)

| # | 테스트명 | 라인 | 원인 | 우선순위 |
|---|----------|------|------|----------|
| 1 | should navigate to /admin/lab from admin dashboard | 26 | CSS selector 오류 (href에 `=`) | P3 |
| 2 | should create lab item with valid data | 99 | 30초 타임아웃 | P1 |
| 3 | should create lab item with GitHub and Demo URLs | 132 | 토스트 메시지 selector 오류 | P2 |
| 4 | should show all categories when "전체 카테고리" selected | 245 | 30초 타임아웃 | P1 |
| 5 | should update lab item successfully | 339 | beforeEach 타임아웃 | P2 |
| 6 | should cancel delete when clicking "취소" | 386 | beforeEach 타임아웃 | P2 |
| 7 | should delete lab item when confirmed | 410 | 토스트 메시지 selector 오류 | P2 |
| 8 | should save markdown content | 582 | 토스트 메시지 selector 오류 | P2 |

### AdminPortfolio (10개 실패)

| # | 테스트명 | 라인 | 원인 | 우선순위 |
|---|----------|------|------|----------|
| 1 | should open create dialog when clicking add button | 56 | Strict mode (2 elements) | P2 |
| 2 | should create portfolio with all required fields | 82 | 30초 타임아웃 | P1 |
| 3 | should create portfolio with optional fields | 122 | 30초 타임아웃 | P1 |
| 4 | should handle tech stack JSON array input | 154 | 30초 타임아웃 | P1 |
| 5 | should handle testimonial JSON object input | 183 | 30초 타임아웃 | P1 |
| 6 | should toggle featured and published switches | 219 | 30초 타임아웃 | P1 |
| 7 | should reset to all types | 340 | 30초 타임아웃 | P1 |
| 8 | should filter by published status | 353 | beforeEach 타임아웃 | P2 |
| 9 | should delete portfolio on confirmation | 507 | 30초 타임아웃 | P1 |
| 10 | should display portfolio table with correct columns | 597 | table 요소 찾기 실패 | P2 |

### AdminTags (7개 실패)

| # | 테스트명 | 라인 | 원인 | 우선순위 |
|---|----------|------|------|----------|
| 1 | should display tags table | 42 | table 요소 찾기 실패 | P2 |
| 2 | should validate kebab-case format for slug | 112 | 30초 타임아웃 | P1 |
| 3 | should create tag successfully with valid kebab-case slug | 140 | 정규식 구문 오류 | P3 |
| 4 | should initialize usage_count to 0 for new tags | 178 | tr 요소 찾기 실패 | P2 |
| 5 | should show "미사용" badge for tags with 0 usage | 302 | badge 요소 찾기 실패 | P2 |
| 6 | should load existing tag data in edit form | 378 | 30초 타임아웃 | P1 |
| 7 | should update tag successfully | 403 | 30초 타임아웃 | P1 |
| 8 | should delete tag successfully on confirmation | 524 | 30초 타임아웃 | P1 |
| 9 | should cancel deletion when clicking cancel | 567 | 30초 타임아웃 | P1 |

### AdminTeam (10개 실패)

| # | 테스트명 | 라인 | 원인 | 우선순위 |
|---|----------|------|------|----------|
| 1 | should navigate to AdminTeam page successfully | 28 | Strict mode (2 elements) | P2 |
| 2 | should validate email format | 94 | Strict mode (2 elements) | P2 |
| 3 | should create team member successfully with valid data | 120 | Strict mode (2 elements) | P2 |
| 4 | should create team member with avatar URL | 154 | Strict mode (2 elements) | P2 |
| 5 | should create team member with skills array | 180 | skills badge 찾기 실패 | P2 |
| 6 | should create team member with social links | 204 | Strict mode (input) | P2 |
| 7 | should set priority field | 231 | priority 값 표시 실패 | P2 |
| 8 | should toggle active status in form | 255 | 생성된 팀원 찾기 실패 | P2 |
| 9 | should display team members table with correct columns | 507 | th 요소 찾기 실패 | P2 |
| 10 | should filter by active status | 545 | Strict mode (2 elements) | P2 |

### AdminUsers (20개 실패)

| # | 테스트명 | 라인 | 원인 | 우선순위 |
|---|----------|------|------|----------|
| 1-20 | 전체 테스트 | 전체 | `super_admin` 권한 필요 | **P0** |

### 기타 페이지 실패 (5개)

| 페이지 | 테스트명 | 라인 | 원인 | 우선순위 |
|--------|----------|------|------|----------|
| Analytics | should show 403 Forbidden for non-admin users | 17 | `super_admin` 권한 필요 | P0 |
| Dashboard | should show 403 Forbidden for non-admin users | 17 | `super_admin` 권한 필요 | P0 |
| Dashboard | should display dashboard for admin users | 28 | 대시보드 로드 실패 | P2 |
| ImageUpload | should upload images to Supabase on form submit | 115 | 30초 타임아웃 | P1 |
| ImageUpload | should display existing images on edit page | 245 | 30초 타임아웃 | P1 |
| Realtime | should show 403 Forbidden for non-admin users | 17 | `super_admin` 권한 필요 | P0 |
| Realtime | should display realtime dashboard for admin users | 28 | 페이지 로드 실패 | P2 |
| Revenue | should show 403 Forbidden for non-admin users | 17 | `super_admin` 권한 필요 | P0 |
| Revenue | should display revenue page for admin users | 28 | 페이지 로드 실패 | P2 |
| ServiceCRUD | should show empty form on new service page | 17 | 페이지 로드 실패 | P2 |
| ServiceCRUD | should render services table | 117 | 페이지 로드 실패 | P2 |
| ServiceCRUD | should show validation errors for missing required fields | 26 | 30초 타임아웃 | P1 |
| ServiceCRUD | should create service successfully with valid data | 50 | 30초 타임아웃 | P1 |
| ServiceCRUD | should show created service in list | 80 | 30초 타임아웃 | P1 |
| ServiceCRUD | should show success toast notification | 99 | 30초 타임아웃 | P1 |
| ServiceCRUD | should delete service on confirmation | 296 | 30초 타임아웃 | P1 |

---

## 5. 우선순위별 해결 방안

### P0 (긴급) - AdminUsers 권한 수정 ✅ **진행 중**

**작업 내용**:
1. `tests/fixtures/auth-helpers.ts`에 `loginAsSuperAdmin()` 함수 추가
2. AdminUsers 테스트 파일에서 `loginAsAdmin()` → `loginAsSuperAdmin()` 변경
3. Analytics/Dashboard/Realtime/Revenue 테스트에서 권한 체크 부분 수정

**예상 시간**: 0.5시간
**영향 범위**: 24개 테스트 (AdminUsers 20개 + 기타 4개)

**구현 방법**:
```typescript
// auth-helpers.ts
export async function loginAsSuperAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'super@ideaonaction.ai'); // super_admin 계정
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}
```

---

### P1 (높음) - Create/Edit Dialog 타임아웃 해결

**작업 내용**:
1. 버튼 selector를 더 구체적으로 수정 (data-testid 또는 ARIA role)
2. `page.waitForTimeout()` → `page.waitForSelector()` 변경
3. Dialog 열기/닫기 동작에 명시적 대기 추가

**예상 시간**: 4-6시간
**영향 범위**: 32개 테스트 (5개 페이지)

**구현 예시**:
```typescript
// Before (Timeout 발생)
await page.click('button:has-text("새 카테고리")');

// After (명시적 대기)
const createButton = page.getByRole('button', { name: /새 카테고리|New Category/i });
await createButton.waitFor({ state: 'visible', timeout: 5000 });
await createButton.click();
await page.waitForSelector('[role="dialog"]', { state: 'visible' });
```

**필요 작업**:
- [ ] AdminBlogCategories (10개 테스트)
- [ ] AdminLab (2개 테스트)
- [ ] AdminPortfolio (7개 테스트)
- [ ] AdminTags (5개 테스트)
- [ ] ServiceCRUD (5개 테스트)
- [ ] ImageUpload (2개 테스트)

---

### P2 (중간) - Selector 불일치 해결

**작업 내용**:
1. Strict mode violation 해결 (`.first()` 추가)
2. 테이블/리스트 요소 selector 개선
3. Toast 메시지 selector 수정

**예상 시간**: 2-3시간
**영향 범위**: 18개 테스트 (3개 페이지 + 기타)

**구현 예시**:
```typescript
// Before (Strict mode violation)
await page.click('button:has-text("새 팀원 추가")');

// After (.first() 추가)
await page.locator('button:has-text("새 팀원 추가")').first().click();

// 또는 더 구체적인 selector
await page.getByRole('button', { name: /새 팀원 추가/i }).first().click();
```

**필요 작업**:
- [ ] AdminTeam (10개 테스트) - Strict mode violation
- [ ] AdminTags (4개 테스트) - 테이블/badge 요소
- [ ] AdminPortfolio (2개 테스트) - 테이블/버튼
- [ ] AdminLab (2개 테스트) - Toast 메시지

---

### P3 (낮음) - CSS Selector/정규식 오류 해결

**작업 내용**:
1. CSS selector에서 `CSS.escape()` 사용
2. 정규식을 일반 문자열로 변경

**예상 시간**: 1-2시간
**영향 범위**: 5개 테스트

**구현 예시**:
```typescript
// Before (CSS 오류)
await page.click('a[href="/admin/lab"]');

// After (CSS.escape)
await page.click(`a[href="${CSS.escape('/admin/lab')}"]`);

// 또는 더 안전한 방법
await page.click('a:has-text("Lab")');

// Before (정규식 오류)
const row = page.locator('tr:has-text(/[1-9]\\d*개|[1-9]\\d* posts/i)');

// After (getByText 사용)
const row = page.getByText(/[1-9]\d*개|[1-9]\d* posts/i).locator('xpath=ancestor::tr');
```

**필요 작업**:
- [ ] AdminBlogCategories (3개 테스트)
- [ ] AdminLab (1개 테스트)
- [ ] AdminTags (1개 테스트)

---

## 6. 예상 작업량

| 우선순위 | 작업 내용 | 예상 시간 | 영향 테스트 |
|----------|-----------|-----------|-------------|
| **P0** | AdminUsers 권한 수정 | 0.5시간 | 24개 |
| **P1** | Create/Edit Dialog 타임아웃 | 4-6시간 | 32개 |
| **P2** | Selector 불일치 해결 | 2-3시간 | 18개 |
| **P3** | CSS/정규식 오류 | 1-2시간 | 5개 |
| **버퍼** | 예상치 못한 이슈 | 1-2시간 | - |
| **총합** | | **9-14시간** | **79개** |

**남은 실패 (미분류)**: 6개 (beforeEach timeout 2개, 기타 페이지 로드 4개)

---

## 7. Next Steps

### 즉시 진행 (P0)
1. ✅ `loginAsSuperAdmin()` 함수 추가 (auth-helpers.ts)
2. ✅ AdminUsers 테스트 20개 수정
3. ✅ Analytics/Dashboard/Realtime/Revenue 권한 테스트 4개 수정

### 다음 단계 (P1)
1. AdminBlogCategories Dialog 타임아웃 수정 (10개)
2. AdminPortfolio Dialog 타임아웃 수정 (7개)
3. AdminTags Dialog 타임아웃 수정 (5개)
4. ServiceCRUD Dialog 타임아웃 수정 (5개)
5. ImageUpload 타임아웃 수정 (2개)
6. AdminLab Dialog 타임아웃 수정 (2개)

### 후속 작업 (P2-P3)
1. AdminTeam Strict mode 수정 (10개)
2. AdminTags/AdminPortfolio/AdminLab Selector 수정 (8개)
3. CSS/정규식 오류 수정 (5개)
4. beforeEach 타임아웃 해결 (2개)

---

## 8. 참고 사항

### 공통 에러 패턴

**1. Dialog 타임아웃 해결 패턴**:
```typescript
// Pattern 1: 버튼 클릭 + Dialog 대기
const createButton = page.getByRole('button', { name: /새 항목|New Item/i });
await createButton.waitFor({ state: 'visible', timeout: 5000 });
await createButton.click();
await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 10000 });

// Pattern 2: Form submit + Toast 대기
await page.locator('[role="dialog"] button[type="submit"]').click();
await page.waitForSelector('[role="status"]:has-text(/완료|success/i)', { state: 'visible', timeout: 10000 });
```

**2. Strict Mode 해결 패턴**:
```typescript
// Pattern 1: .first() 사용
await page.locator('button:has-text("버튼")').first().click();

// Pattern 2: 더 구체적인 selector
await page.locator('[role="dialog"] button:has-text("버튼")').click();

// Pattern 3: getByRole 사용
await page.getByRole('button', { name: /버튼/i }).first().click();
```

**3. CSS Selector 안전 패턴**:
```typescript
// Pattern 1: CSS.escape 사용
await page.click(`a[href="${CSS.escape('/admin/lab')}"]`);

// Pattern 2: 텍스트 기반 selector
await page.click('a:has-text("Lab")');

// Pattern 3: getByRole 사용
await page.getByRole('link', { name: /Lab/i }).click();
```

### 테스트 안정성 개선 제안

1. **data-testid 속성 추가** (권장):
   - Dialog 버튼: `data-testid="create-button"`, `data-testid="save-button"`
   - Form 필드: `data-testid="name-input"`, `data-testid="slug-input"`
   - Toast: `data-testid="success-toast"`, `data-testid="error-toast"`

2. **ARIA 속성 개선**:
   - Dialog: `aria-labelledby`, `aria-describedby`
   - Button: `aria-label="새 항목 추가"`
   - Toast: `role="alert"` 또는 `role="status"`

3. **Timeout 설정 최적화**:
   - 기본 timeout: 30초 → 10초
   - Dialog 대기: 5초
   - Toast 대기: 3초
   - beforeEach: 3초 → 제거 (waitForSelector 사용)

---

**작성자**: Claude (AI Assistant)
**리뷰 필요**: 서민원 (super_admin 계정 정보, data-testid 추가 여부)
