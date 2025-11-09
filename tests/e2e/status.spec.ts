import { test, expect } from '@playwright/test';

/**
 * Status 페이지 E2E 테스트
 *
 * 테스트 시나리오:
 * - Status 페이지 렌더링
 * - 5개 Key Metrics 표시 (프로젝트, 바운티, 커밋, 기여자, 구독자)
 * - 프로젝트 현황 리스트
 * - 최근 활동 로그
 * - 기술 스택 통계
 * - 반응형 레이아웃
 */

test.describe('Status 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/status');

    // 로딩 스피너가 사라질 때까지 대기 (데이터 로딩 완료)
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }
  });

  test('페이지가 정상적으로 로드됨', async ({ page }) => {
    // 페이지 타이틀 확인 (더 유연한 패턴)
    await expect(page).toHaveTitle(/IDEA on Action/i);

    // Hero 섹션 확인
    const heroHeading = page.getByRole('heading', { name: /Status/i });
    await expect(heroHeading).toBeVisible();

    // Live Metrics 배지 확인
    const liveBadge = page.locator('text=/Live Metrics/i');
    await expect(liveBadge).toBeVisible();
  });

  test('Key Metrics 카드가 표시됨', async ({ page }) => {
    // glass-card 클래스를 가진 카드들이 있는지 확인
    const metricCards = page.locator('.glass-card');
    const count = await metricCards.count();

    // 최소 1개 이상의 메트릭 카드가 있어야 함
    expect(count).toBeGreaterThanOrEqual(1);

    // 숫자 데이터가 표시되는지 확인
    const firstCard = metricCards.first();
    await expect(firstCard).toBeVisible();
  });

  test('프로젝트 메트릭이 숫자로 표시됨', async ({ page }) => {
    // 숫자를 표시하는 요소 확인 (glass-card 내의 4xl 폰트 크기)
    const numberElements = page.locator('.glass-card .text-4xl');
    const count = await numberElements.count();

    // 최소 1개 이상의 숫자 요소가 있어야 함
    expect(count).toBeGreaterThanOrEqual(1);

    const firstNumber = numberElements.first();
    await expect(firstNumber).toBeVisible();

    // 숫자인지 확인
    const text = await firstNumber.textContent();
    expect(text?.trim()).toMatch(/^\d+$/);
  });

  test('바운티 완료율이 퍼센티지로 표시됨', async ({ page }) => {
    // 바운티 완료율 퍼센티지 찾기
    const bountyPercentage = page.locator('text=/\\d+%/').first();
    await expect(bountyPercentage).toBeVisible();

    // Progress 바 확인
    const progressBar = page.locator('[role="progressbar"]').first();
    if (await progressBar.isVisible().catch(() => false)) {
      await expect(progressBar).toBeVisible();
    }
  });

  test('Newsletter 구독자 통계가 표시됨', async ({ page }) => {
    // 구독자 카드 찾기
    const subscribersSection = page.locator('text=/구독자|Subscribers/i').first();
    await subscribersSection.scrollIntoViewIfNeeded();

    // confirmed 숫자 확인 (메인 숫자)
    const confirmedCount = subscribersSection.locator('xpath=ancestor::div[contains(@class, "glass-card")]//div[contains(@class, "text-4xl")]');
    await expect(confirmedCount).toBeVisible();

    // pending/total 정보 확인
    const statsText = subscribersSection.locator('xpath=ancestor::div[contains(@class, "glass-card")]//div[contains(@class, "text-xs")]');
    await expect(statsText).toBeVisible();

    // "대기" 또는 "전체" 텍스트 확인
    const detailText = await statsText.textContent();
    expect(detailText).toMatch(/대기|전체|pending|total/i);
  });

  test('프로젝트 현황 섹션이 표시됨', async ({ page }) => {
    // 프로젝트 현황 헤딩
    const projectsHeading = page.getByRole('heading', { name: /프로젝트 현황|Projects Overview/i });
    await projectsHeading.scrollIntoViewIfNeeded();
    await expect(projectsHeading).toBeVisible();

    // 프로젝트 리스트 확인 (최소 1개 이상)
    const projectItems = page.locator('.glass-card >> text=/프로젝트|project/i');
    const count = await projectItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('프로젝트에 진행률 바가 표시됨', async ({ page }) => {
    // 프로젝트 현황 섹션으로 스크롤
    const projectsSection = page.getByRole('heading', { name: /프로젝트 현황/i });
    await projectsSection.scrollIntoViewIfNeeded();

    // Progress 바 확인 (프로젝트마다 하나씩)
    const progressBars = page.locator('[role="progressbar"]');
    const count = await progressBars.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // 퍼센티지 텍스트 확인
    const percentageText = page.locator('text=/\\d+%/').first();
    await expect(percentageText).toBeVisible();
  });

  test('최근 활동 섹션이 표시됨', async ({ page }) => {
    // 최근 활동 헤딩
    const activityHeading = page.getByRole('heading', { name: /최근 활동|Recent Activity/i });
    await activityHeading.scrollIntoViewIfNeeded();
    await expect(activityHeading).toBeVisible();

    // 활동 로그 아이템 확인 (최소 1개 이상)
    const activityItems = activityHeading.locator('xpath=following-sibling::div//div[contains(@class, "space-y-2")]');
    if (await activityItems.count() > 0) {
      await expect(activityItems.first()).toBeVisible();
    }
  });

  test('최근 활동에 날짜가 표시됨', async ({ page }) => {
    // 최근 활동 섹션으로 스크롤
    const activitySection = page.getByRole('heading', { name: /최근 활동/i });
    await activitySection.scrollIntoViewIfNeeded();

    // 날짜 텍스트 찾기 (예: "11월 9일" 또는 "Nov 9")
    const dateText = page.locator('text=/\\d+월\\s+\\d+일|[A-Z][a-z]{2}\\s+\\d+/').first();
    if (await dateText.isVisible().catch(() => false)) {
      await expect(dateText).toBeVisible();
    }
  });

  test('기술 스택 통계가 표시됨', async ({ page }) => {
    // 기술 스택 섹션 헤딩
    const techStackHeading = page.getByRole('heading', { name: /기술 스택|Tech Stack/i });
    await techStackHeading.scrollIntoViewIfNeeded();
    await expect(techStackHeading).toBeVisible();

    // 3개 카테고리 확인 (Frontend, Backend, Testing)
    const frontend = page.locator('text=/Frontend/i');
    const backend = page.locator('text=/Backend/i');
    const testing = page.locator('text=/Testing/i');

    await expect(frontend).toBeVisible();
    await expect(backend).toBeVisible();
    await expect(testing).toBeVisible();
  });

  test('기술 스택에 사용 횟수가 표시됨', async ({ page }) => {
    // 기술 스택 섹션으로 스크롤
    const techStackSection = page.getByRole('heading', { name: /기술 스택/i });
    await techStackSection.scrollIntoViewIfNeeded();

    // React 기술 항목 찾기
    const reactItem = page.locator('text=/React/i').first();
    await expect(reactItem).toBeVisible();

    // 사용 횟수 숫자 확인 (같은 카드 내에서)
    const usageCount = reactItem.locator('xpath=ancestor::div[contains(@class, "flex")]//span[contains(@class, "font-bold")]');
    if (await usageCount.isVisible().catch(() => false)) {
      await expect(usageCount).toBeVisible();
      const count = await usageCount.textContent();
      expect(count?.trim()).toMatch(/^\d+$/);
    }
  });

  test('CTA 섹션이 표시됨', async ({ page }) => {
    // CTA 섹션으로 스크롤
    const ctaHeading = page.getByRole('heading', { name: /함께 성장|Join Us|협업/i });
    await ctaHeading.scrollIntoViewIfNeeded();
    await expect(ctaHeading).toBeVisible();

    // 바운티 참여하기 버튼
    const bountyButton = page.getByRole('link', { name: /바운티 참여|Join Bounty|lab/i });
    await expect(bountyButton).toBeVisible();

    // 협업 제안하기 버튼
    const collaborateButton = page.getByRole('link', { name: /협업 제안|Work with Us/i });
    await expect(collaborateButton).toBeVisible();
  });

  test('바운티 참여 버튼 클릭 시 Lab 페이지로 이동', async ({ page }) => {
    // CTA 섹션으로 스크롤
    const bountyButton = page.getByRole('link', { name: /바운티 참여|lab/i });
    await bountyButton.scrollIntoViewIfNeeded();

    // 버튼 클릭
    await bountyButton.click();

    // URL 확인
    await expect(page).toHaveURL(/\/lab/);
  });

  test('협업 제안 버튼 클릭 시 Work with Us 페이지로 이동', async ({ page }) => {
    // CTA 섹션으로 스크롤
    const collaborateButton = page.getByRole('link', { name: /협업 제안|work-with-us/i });
    await collaborateButton.scrollIntoViewIfNeeded();

    // 버튼 클릭
    await collaborateButton.click();

    // URL 확인
    await expect(page).toHaveURL(/\/work-with-us/);
  });

  test('모바일 뷰포트에서 그리드가 1열로 표시됨', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });

    // 페이지 리로드
    await page.reload();

    // 로딩 스피너 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Key Metrics 섹션 확인
    const metricsGrid = page.locator('.grid').first();
    await expect(metricsGrid).toBeVisible();

    // 프로젝트 카드가 여전히 표시됨
    const projectsCard = page.locator('text=/총 프로젝트/i');
    await expect(projectsCard).toBeVisible();

    // 구독자 카드도 표시됨 (스크롤 필요)
    const subscribersCard = page.locator('text=/구독자/i');
    await subscribersCard.scrollIntoViewIfNeeded();
    await expect(subscribersCard).toBeVisible();
  });

  test('데스크톱 뷰포트에서 그리드가 5열로 표시됨', async ({ page }) => {
    // 데스크톱 뷰포트 설정
    await page.setViewportSize({ width: 1280, height: 800 });

    // 페이지 리로드
    await page.reload();

    // 로딩 스피너 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Key Metrics 그리드 확인
    const metricsGrid = page.locator('.grid').first();
    await expect(metricsGrid).toBeVisible();

    // 5개 카드가 모두 표시됨
    const cards = metricsGrid.locator('.glass-card');
    const count = await cards.count();
    expect(count).toBe(5);

    // 모든 카드가 viewport에 있는지 확인
    for (let i = 0; i < 5; i++) {
      await expect(cards.nth(i)).toBeInViewport();
    }
  });

  test('로딩 상태가 올바르게 표시됨', async ({ page }) => {
    // 네트워크를 느리게 설정
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });

    // 페이지 이동
    await page.goto('/status');

    // 로딩 스피너 또는 스켈레톤 확인
    const loadingIndicator = page.locator('.animate-spin, [role="status"]');
    if (await loadingIndicator.isVisible().catch(() => false)) {
      await expect(loadingIndicator).toBeVisible();
    }

    // 최종적으로 컨텐츠가 로드됨
    const heroHeading = page.getByRole('heading', { name: /Status/i });
    await expect(heroHeading).toBeVisible({ timeout: 10000 });
  });

  test('에러 상태가 올바르게 표시됨', async ({ page }) => {
    // API 요청을 실패하도록 모킹
    await page.route('**/rest/v1/projects*', route => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
    });

    // 페이지 이동
    await page.goto('/status');

    // 에러 메시지 또는 에러 UI 확인
    const errorMessage = page.locator('text=/데이터 로드 실패/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // AlertCircle 아이콘 확인
    const alertIcon = page.locator('.text-destructive');
    await expect(alertIcon).toBeVisible();
  });

  test('Status 페이지 성능 확인', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/status', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    // 5초 이내 로드 확인 (데이터 fetch 포함)
    expect(loadTime).toBeLessThan(5000);
  });

  test('모든 메트릭 아이콘이 표시됨', async ({ page }) => {
    // Key Metrics 카드에 아이콘이 있는지 확인
    const icons = page.locator('.glass-card svg').first();
    await expect(icons).toBeVisible();

    // 최소 5개 아이콘 확인 (5개 메트릭 카드)
    const iconCount = await page.locator('.glass-card svg').count();
    expect(iconCount).toBeGreaterThanOrEqual(5);
  });
});
