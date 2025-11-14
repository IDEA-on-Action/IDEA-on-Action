import { test, expect } from '@playwright/test';

/**
 * Journey 1: Visitor (처음 방문 → 커뮤니티 참여)
 *
 * 사용자 시나리오:
 * 1. IDEA on Action을 처음 방문한 사용자
 * 2. 회사 소개 및 프로젝트 둘러보기
 * 3. 커뮤니티에 참여하고 Newsletter 구독
 *
 * 테스트 플로우:
 * - Home 페이지 방문 → Hero, 주요 섹션 확인
 * - About 페이지 → Mission, Vision 확인
 * - Roadmap 페이지 → 분기별 목표 확인
 * - Portfolio 페이지 → 프로젝트 목록 확인
 * - Community 페이지 → Giscus 댓글 위젯 확인
 * - Newsletter 구독 → 성공 메시지 확인
 */

test.describe('Journey 1: Visitor (처음 방문 → 커뮤니티 참여)', () => {
  test('Step 1: Home 페이지 방문 및 주요 섹션 확인', async ({ page }) => {
    // Home 페이지 방문
    await page.goto('/');

    // Hero 섹션 확인
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();

    // IDEA on Action 브랜드명 확인
    const brandText = page.locator('text=/IDEA on Action|생각과행동/i');
    await expect(brandText.first()).toBeVisible();

    // CTA 버튼 확인 (Work with Us, Portfolio 등)
    const ctaButtons = page.locator('a[href*="/work-with-us"], a[href*="/portfolio"], button');
    const buttonCount = await ctaButtons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // 페이지가 완전히 로드되었는지 확인
    await expect(page).toHaveTitle(/IDEA on Action/i);
  });

  test('Step 2: About 페이지로 이동 및 회사 소개 확인', async ({ page }) => {
    await page.goto('/');

    // About 링크 클릭 (Header 네비게이션)
    const aboutLink = page.locator('a[href="/about"]').first();
    await aboutLink.click();

    // URL 확인
    await expect(page).toHaveURL(/\/about/);

    // About 페이지 헤딩 확인
    const aboutHeading = page.locator('h1, h2').filter({ hasText: /About|회사소개|생각과행동/i }).first();
    await expect(aboutHeading).toBeVisible();

    // Mission/Vision 섹션 확인
    const missionSection = page.locator('text=/Mission|비전|미션/i').first();
    if (await missionSection.isVisible().catch(() => false)) {
      await missionSection.scrollIntoViewIfNeeded();
      await expect(missionSection).toBeVisible();
    }

    // 회사 소개 컨텐츠 확인 (최소 100자 이상)
    const pageContent = await page.textContent('main');
    expect(pageContent?.length).toBeGreaterThan(100);
  });

  test('Step 3: Roadmap 페이지로 이동 및 분기별 목표 확인', async ({ page }) => {
    await page.goto('/');

    // Roadmap 링크 클릭
    const roadmapLink = page.locator('a[href="/roadmap"]').first();
    await roadmapLink.click();

    // URL 확인
    await expect(page).toHaveURL(/\/roadmap/);

    // Roadmap 페이지 헤딩 확인
    const roadmapHeading = page.locator('h1').filter({ hasText: /Roadmap|로드맵/i }).first();
    await expect(roadmapHeading).toBeVisible();

    // 로딩 스피너가 사라질 때까지 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 로드맵 카드 또는 분기 정보 확인
    const roadmapCards = page.locator('.glass-card, [class*="card"]');
    const cardCount = await roadmapCards.count();

    if (cardCount > 0) {
      // 로드맵 데이터가 있는 경우
      const firstCard = roadmapCards.first();
      await expect(firstCard).toBeVisible();

      // 진행률 또는 상태 정보 확인
      const progressInfo = page.locator('text=/진행|progress|%/i').first();
      if (await progressInfo.isVisible().catch(() => false)) {
        await expect(progressInfo).toBeVisible();
      }
    } else {
      // 로드맵 데이터가 없는 경우 (Empty State)
      const emptyState = page.locator('text=/등록된 로드맵이 없습니다|No roadmap/i');
      await expect(emptyState).toBeVisible();
    }
  });

  test('Step 4: Portfolio 페이지로 이동 및 프로젝트 목록 확인', async ({ page }) => {
    await page.goto('/');

    // Portfolio 링크 클릭
    const portfolioLink = page.locator('a[href="/portfolio"]').first();
    await portfolioLink.click();

    // URL 확인
    await expect(page).toHaveURL(/\/portfolio/);

    // Portfolio 페이지 헤딩 확인
    const portfolioHeading = page.locator('h1').filter({ hasText: /Portfolio|포트폴리오|프로젝트/i }).first();
    await expect(portfolioHeading).toBeVisible();

    // 로딩 스피너가 사라질 때까지 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 프로젝트 카드 또는 리스트 확인
    const projectCards = page.locator('.glass-card, [class*="card"], article');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      // 프로젝트가 있는 경우
      const firstProject = projectCards.first();
      await expect(firstProject).toBeVisible();

      // 프로젝트 제목 확인
      const projectTitle = firstProject.locator('h2, h3').first();
      await expect(projectTitle).toBeVisible();

      // 프로젝트 상태 또는 태그 확인
      const projectStatus = firstProject.locator('text=/진행중|완료|launched|in-progress/i');
      if (await projectStatus.isVisible().catch(() => false)) {
        await expect(projectStatus).toBeVisible();
      }
    } else {
      // 프로젝트가 없는 경우 (Empty State)
      const emptyState = page.locator('text=/프로젝트가 없습니다|No projects/i');
      await expect(emptyState).toBeVisible();
    }
  });

  test('Step 5: Community 페이지로 이동 및 Giscus 댓글 위젯 확인', async ({ page }) => {
    await page.goto('/');

    // Community 링크 클릭
    const communityLink = page.locator('a[href="/community"]').first();
    await communityLink.click();

    // URL 확인
    await expect(page).toHaveURL(/\/community/);

    // Community 페이지 헤딩 확인
    const communityHeading = page.locator('h1').filter({ hasText: /Community|커뮤니티/i }).first();
    await expect(communityHeading).toBeVisible();

    // Giscus iframe 확인 (GitHub Discussions 기반 댓글 위젯)
    const giscusIframe = page.locator('iframe.giscus-frame');

    // iframe 로딩 대기 (최대 10초)
    if (await giscusIframe.isVisible().catch(() => false)) {
      await expect(giscusIframe).toBeVisible({ timeout: 10000 });
    } else {
      // Giscus가 로드되지 않은 경우, 컨테이너라도 확인
      const giscusContainer = page.locator('.giscus, [class*="giscus"]');
      await expect(giscusContainer).toBeVisible();
    }

    // 페이지에 커뮤니티 관련 텍스트 확인
    const communityContent = page.locator('text=/토론|discussion|댓글|comment/i').first();
    if (await communityContent.isVisible().catch(() => false)) {
      await expect(communityContent).toBeVisible();
    }
  });

  test('Step 6: Newsletter 구독 (여정 완료)', async ({ page }) => {
    // Community 페이지에서 Newsletter 구독
    await page.goto('/community');

    // Footer로 스크롤
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    // Newsletter 폼 확인
    const newsletterHeading = page.locator('footer >> text=/Newsletter|뉴스레터|Stay Updated/i');
    await expect(newsletterHeading).toBeVisible();

    // 이메일 입력
    const emailInput = page.locator('footer input[type="email"]');
    await expect(emailInput).toBeVisible();

    const testEmail = `visitor-journey-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    // 구독 버튼 클릭
    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await expect(subscribeButton).toBeVisible();
    await subscribeButton.click();

    // 성공 토스트 메시지 확인
    const successToast = page.locator('[data-sonner-toast]', { hasText: /뉴스레터 구독 신청 완료|Successfully subscribed/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // 여정 완료: Visitor가 커뮤니티 멤버가 됨
  });

  test('전체 여정: Home → About → Roadmap → Portfolio → Community → Newsletter 구독', async ({ page }) => {
    // 1. Home 페이지 방문
    await page.goto('/');
    await expect(page).toHaveTitle(/IDEA on Action/i);

    // 2. About 페이지 방문
    await page.goto('/about');
    const aboutHeading = page.locator('h1, h2').first();
    await expect(aboutHeading).toBeVisible();

    // 3. Roadmap 페이지 방문
    await page.goto('/roadmap');
    const roadmapHeading = page.locator('h1').first();
    await expect(roadmapHeading).toBeVisible();

    // 로딩 대기
    const roadmapLoadingSpinner = page.locator('.animate-spin');
    if (await roadmapLoadingSpinner.isVisible().catch(() => false)) {
      await roadmapLoadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 4. Portfolio 페이지 방문
    await page.goto('/portfolio');
    const portfolioHeading = page.locator('h1').first();
    await expect(portfolioHeading).toBeVisible();

    // 로딩 대기
    const portfolioLoadingSpinner = page.locator('.animate-spin');
    if (await portfolioLoadingSpinner.isVisible().catch(() => false)) {
      await portfolioLoadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 5. Community 페이지 방문
    await page.goto('/community');
    const communityHeading = page.locator('h1').first();
    await expect(communityHeading).toBeVisible();

    // 6. Newsletter 구독
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    const emailInput = page.locator('footer input[type="email"]');
    const testEmail = `full-journey-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await subscribeButton.click();

    // 성공 확인
    const successToast = page.locator('[data-sonner-toast]', { hasText: /뉴스레터 구독 신청 완료/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // 전체 여정 완료
  });

  test('모바일 뷰포트에서 전체 여정 테스트', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });

    // 1. Home 방문
    await page.goto('/');
    await expect(page).toHaveTitle(/IDEA on Action/i);

    // 2. 햄버거 메뉴 클릭 (모바일 네비게이션)
    const mobileMenuButton = page.locator('button[aria-label*="menu"], button[aria-label*="메뉴"]');
    if (await mobileMenuButton.isVisible().catch(() => false)) {
      await mobileMenuButton.click();

      // About 링크 클릭
      const aboutLink = page.locator('a[href="/about"]').first();
      await aboutLink.click();

      await expect(page).toHaveURL(/\/about/);
    } else {
      // 데스크톱 네비게이션 사용
      await page.goto('/about');
    }

    // About 페이지 확인
    const aboutHeading = page.locator('h1, h2').first();
    await expect(aboutHeading).toBeVisible();

    // 3. Portfolio 방문
    await page.goto('/portfolio');
    const portfolioHeading = page.locator('h1').first();
    await expect(portfolioHeading).toBeVisible();

    // 4. Newsletter 구독 (Footer)
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    const emailInput = page.locator('footer input[type="email"]');
    const testEmail = `mobile-journey-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await subscribeButton.click();

    // 성공 확인
    const successToast = page.locator('[data-sonner-toast]', { hasText: /뉴스레터 구독 신청 완료/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });
  });
});
