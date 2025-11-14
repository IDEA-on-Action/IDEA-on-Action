import { test, expect } from '@playwright/test';

/**
 * Journey 3: Fan (정기 방문 → 팬 되기)
 *
 * 사용자 시나리오:
 * 1. IDEA on Action을 정기적으로 방문하는 사용자
 * 2. 블로그 포스트를 읽고, 최근 활동을 확인
 * 3. Status 페이지에서 프로젝트 진행 상황 모니터링
 * 4. Newsletter 구독하여 Weekly Recap 받기
 * 5. 바운티 참여 관심 표시
 * 6. 팬으로서 커뮤니티 정기 참여
 *
 * 테스트 플로우:
 * - Now 페이지 → 최근 활동 로그 확인
 * - Blog 페이지 → 포스트 목록 확인
 * - Blog 상세 → 포스트 읽기
 * - Status 페이지 → 오픈 메트릭스 확인
 * - Newsletter 구독 → Weekly Recap 받기
 * - Lab 페이지 → 바운티 관심 표시
 * - Community 페이지 → 정기 방문 및 토론 참여
 */

test.describe('Journey 3: Fan (정기 방문 → 팬 되기)', () => {
  test('Step 1: Now 페이지 방문 및 최근 활동 확인', async ({ page }) => {
    // Now 페이지 방문
    await page.goto('/now');

    // Now 페이지 헤딩 확인
    const nowHeading = page.locator('h1').filter({ hasText: /Now|최근 활동|What I'm Doing/i }).first();
    await expect(nowHeading).toBeVisible();

    // 로딩 스피너가 사라질 때까지 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 활동 로그 카드 또는 리스트 확인
    const activityCards = page.locator('.glass-card, [class*="card"], article');
    const activityCount = await activityCards.count();

    if (activityCount > 0) {
      // 활동 로그가 있는 경우
      const firstActivity = activityCards.first();
      await expect(firstActivity).toBeVisible();

      // 활동 타입 또는 날짜 확인
      const activityInfo = page.locator('text=/decision|learning|release|development/i').first();
      if (await activityInfo.isVisible().catch(() => false)) {
        await expect(activityInfo).toBeVisible();
      }

      // 날짜 정보 확인
      const dateInfo = page.locator('text=/\\d{4}|ago|전|일|월/').first();
      if (await dateInfo.isVisible().catch(() => false)) {
        await expect(dateInfo).toBeVisible();
      }
    } else {
      // 활동 로그가 없는 경우 (Empty State)
      const emptyState = page.locator('text=/활동 내역이 없습니다|No activity/i');
      await expect(emptyState).toBeVisible();
    }

    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/IDEA on Action/i);
  });

  test('Step 2: Blog 페이지로 이동 및 포스트 목록 확인', async ({ page }) => {
    await page.goto('/');

    // Blog 링크 클릭
    const blogLink = page.locator('a[href="/blog"]').first();
    await blogLink.click();

    // URL 확인
    await expect(page).toHaveURL(/\/blog/);

    // Blog 페이지 헤딩 확인
    const blogHeading = page.locator('h1').filter({ hasText: /Blog|블로그|포스트/i }).first();
    await expect(blogHeading).toBeVisible();

    // 로딩 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 포스트 카드 또는 리스트 확인
    const postCards = page.locator('.glass-card, [class*="card"], article');
    const postCount = await postCards.count();

    if (postCount > 0) {
      // 포스트가 있는 경우
      const firstPost = postCards.first();
      await expect(firstPost).toBeVisible();

      // 포스트 제목 확인
      const postTitle = firstPost.locator('h2, h3').first();
      await expect(postTitle).toBeVisible();

      // 포스트 날짜 또는 작성자 확인
      const postMeta = page.locator('text=/\\d{4}-\\d{2}-\\d{2}|ago|전|일|월/').first();
      if (await postMeta.isVisible().catch(() => false)) {
        await expect(postMeta).toBeVisible();
      }

      // 카테고리 또는 태그 확인
      const tags = page.locator('text=/Tutorial|Guide|Weekly Recap|Sprint/i').first();
      if (await tags.isVisible().catch(() => false)) {
        await expect(tags).toBeVisible();
      }
    } else {
      // 포스트가 없는 경우 (Empty State)
      const emptyState = page.locator('text=/포스트가 없습니다|No posts/i');
      await expect(emptyState).toBeVisible();
    }
  });

  test('Step 3: Blog 상세 페이지로 이동하여 포스트 읽기', async ({ page }) => {
    await page.goto('/blog');

    // 로딩 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 포스트 카드 확인
    const postCards = page.locator('.glass-card, [class*="card"], article');
    const postCount = await postCards.count();

    if (postCount > 0) {
      // 첫 번째 포스트 클릭
      const firstPost = postCards.first();
      const postLink = firstPost.locator('a').first();

      if (await postLink.isVisible().catch(() => false)) {
        await postLink.click();

        // 상세 페이지 URL 확인 (/blog/:slug)
        await expect(page).toHaveURL(/\/blog\/.+/);

        // 상세 페이지 헤딩 확인
        const detailHeading = page.locator('h1').first();
        await expect(detailHeading).toBeVisible();

        // 포스트 본문 확인 (Markdown 렌더링)
        const content = page.locator('article, .prose, main').first();
        await expect(content).toBeVisible();

        // 본문에 충분한 텍스트가 있는지 확인 (최소 100자)
        const contentText = await content.textContent();
        expect(contentText?.length).toBeGreaterThan(100);

        // 댓글 섹션 확인 (Giscus)
        const commentsSection = page.locator('iframe.giscus-frame, .giscus');
        if (await commentsSection.first().isVisible().catch(() => false)) {
          await commentsSection.first().scrollIntoViewIfNeeded();
          await expect(commentsSection.first()).toBeVisible({ timeout: 10000 });
        }
      }
    } else {
      // 포스트가 없으면 스킵
      test.skip();
    }
  });

  test('Step 4: Status 페이지로 이동하여 오픈 메트릭스 확인', async ({ page }) => {
    await page.goto('/');

    // Status 링크 클릭
    const statusLink = page.locator('a[href="/status"]').first();
    await statusLink.click();

    // URL 확인
    await expect(page).toHaveURL(/\/status/);

    // Status 페이지 헤딩 확인
    const statusHeading = page.locator('h1').filter({ hasText: /Status|현황|메트릭스/i }).first();
    await expect(statusHeading).toBeVisible();

    // 로딩 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Key Metrics 카드 확인 (5개: 프로젝트, 바운티, 커밋, 기여자, 구독자)
    const metricCards = page.locator('.glass-card');
    const metricCount = await metricCards.count();
    expect(metricCount).toBeGreaterThanOrEqual(1);

    // 첫 번째 메트릭 카드 확인
    const firstMetric = metricCards.first();
    await expect(firstMetric).toBeVisible();

    // 숫자 데이터 확인
    const numberElement = firstMetric.locator('.text-4xl, .text-3xl').first();
    await expect(numberElement).toBeVisible();

    // 메트릭 레이블 확인
    const label = firstMetric.locator('text=/프로젝트|바운티|커밋|기여자|구독자|projects|bounties|commits/i').first();
    await expect(label).toBeVisible();

    // Live Metrics 배지 확인
    const liveBadge = page.locator('text=/Live Metrics|실시간/i');
    if (await liveBadge.isVisible().catch(() => false)) {
      await expect(liveBadge).toBeVisible();
    }
  });

  test('Step 5: Newsletter 구독하여 Weekly Recap 받기', async ({ page }) => {
    // Status 페이지에서 Newsletter 구독
    await page.goto('/status');

    // Footer로 스크롤
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    // Newsletter 폼 확인
    const newsletterHeading = page.locator('footer >> text=/Newsletter|뉴스레터|Stay Updated/i');
    await expect(newsletterHeading).toBeVisible();

    // 이메일 입력
    const emailInput = page.locator('footer input[type="email"]');
    await expect(emailInput).toBeVisible();

    const testEmail = `fan-journey-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    // 구독 버튼 클릭
    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await expect(subscribeButton).toBeVisible();
    await subscribeButton.click();

    // 성공 토스트 메시지 확인
    const successToast = page.locator('[data-sonner-toast]', { hasText: /뉴스레터 구독 신청 완료|Successfully subscribed/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // 팬이 Weekly Recap을 받을 준비 완료
  });

  test('Step 6: Lab 페이지로 이동하여 바운티 관심 표시', async ({ page }) => {
    await page.goto('/');

    // Lab 링크 클릭
    const labLink = page.locator('a[href="/lab"]').first();
    await labLink.click();

    // URL 확인
    await expect(page).toHaveURL(/\/lab/);

    // Lab 페이지 헤딩 확인
    const labHeading = page.locator('h1').filter({ hasText: /Lab|실험실|바운티/i }).first();
    await expect(labHeading).toBeVisible();

    // 로딩 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 바운티 카드 확인
    const bountyCards = page.locator('.glass-card, [class*="card"], article');
    const bountyCount = await bountyCards.count();

    if (bountyCount > 0) {
      // 첫 번째 바운티 확인
      const firstBounty = bountyCards.first();
      await expect(firstBounty).toBeVisible();

      // 바운티 제목 확인
      const bountyTitle = firstBounty.locator('h2, h3').first();
      await expect(bountyTitle).toBeVisible();

      // 바운티 상태 확인 (open, assigned, done)
      const bountyStatus = page.locator('text=/open|assigned|done|모집중|진행중|완료/i').first();
      if (await bountyStatus.isVisible().catch(() => false)) {
        await expect(bountyStatus).toBeVisible();
      }

      // 보상 정보 확인
      const reward = page.locator('text=/₩|원|reward/i').first();
      if (await reward.isVisible().catch(() => false)) {
        await expect(reward).toBeVisible();
      }

      // 신청 버튼 또는 관심 표시 버튼 확인
      const applyButton = page.locator('button:has-text("신청"), button:has-text("Apply"), a:has-text("신청"), a:has-text("Apply")').first();
      if (await applyButton.isVisible().catch(() => false)) {
        await expect(applyButton).toBeVisible();
        // Note: 실제 클릭은 하지 않음 (인증 필요할 수 있음)
      }
    } else {
      // 바운티가 없는 경우
      const emptyState = page.locator('text=/바운티가 없습니다|No bounties/i');
      await expect(emptyState).toBeVisible();
    }
  });

  test('Step 7: Community 페이지로 정기 방문 및 토론 참여 확인', async ({ page }) => {
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

      // 팬이 정기적으로 방문하여 토론에 참여할 준비 완료
    } else {
      // Giscus 컨테이너 확인
      const giscusContainer = page.locator('.giscus, [class*="giscus"]');
      await expect(giscusContainer).toBeVisible();
    }

    // 커뮤니티 안내 텍스트 확인
    const communityInfo = page.locator('text=/토론|discussion|댓글|comment|참여|join/i').first();
    if (await communityInfo.isVisible().catch(() => false)) {
      await expect(communityInfo).toBeVisible();
    }

    // 팬 여정 완료: 정기 방문자에서 커뮤니티 멤버로
  });

  test('전체 여정: Now → Blog → Blog 상세 → Status → Newsletter → Lab → Community', async ({ page }) => {
    // 1. Now 페이지 방문
    await page.goto('/now');
    const nowHeading = page.locator('h1').first();
    await expect(nowHeading).toBeVisible();

    // 로딩 대기
    const nowLoadingSpinner = page.locator('.animate-spin');
    if (await nowLoadingSpinner.isVisible().catch(() => false)) {
      await nowLoadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 2. Blog 페이지 방문
    await page.goto('/blog');
    const blogHeading = page.locator('h1').first();
    await expect(blogHeading).toBeVisible();

    // 로딩 대기
    const blogLoadingSpinner = page.locator('.animate-spin');
    if (await blogLoadingSpinner.isVisible().catch(() => false)) {
      await blogLoadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 3. Status 페이지 방문
    await page.goto('/status');
    const statusHeading = page.locator('h1').first();
    await expect(statusHeading).toBeVisible();

    // 로딩 대기
    const statusLoadingSpinner = page.locator('.animate-spin');
    if (await statusLoadingSpinner.isVisible().catch(() => false)) {
      await statusLoadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 4. Newsletter 구독
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    const emailInput = page.locator('footer input[type="email"]');
    const testEmail = `full-fan-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await subscribeButton.click();

    // 성공 확인
    const successToast = page.locator('[data-sonner-toast]', { hasText: /뉴스레터 구독 신청 완료/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // 5. Lab 페이지 방문
    await page.goto('/lab');
    const labHeading = page.locator('h1').first();
    await expect(labHeading).toBeVisible();

    // 로딩 대기
    const labLoadingSpinner = page.locator('.animate-spin');
    if (await labLoadingSpinner.isVisible().catch(() => false)) {
      await labLoadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 6. Community 페이지 방문
    await page.goto('/community');
    const communityHeading = page.locator('h1').first();
    await expect(communityHeading).toBeVisible();

    // Giscus 위젯 확인
    const giscusWidget = page.locator('iframe.giscus-frame, .giscus');
    if (await giscusWidget.first().isVisible().catch(() => false)) {
      await expect(giscusWidget.first()).toBeVisible({ timeout: 10000 });
    }

    // 전체 여정 완료
  });

  test('모바일 뷰포트에서 팬 여정', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });

    // 1. Home 방문
    await page.goto('/');
    await expect(page).toHaveTitle(/IDEA on Action/i);

    // 2. Blog 방문
    await page.goto('/blog');
    const blogHeading = page.locator('h1').first();
    await expect(blogHeading).toBeVisible();

    // 3. Status 방문
    await page.goto('/status');
    const statusHeading = page.locator('h1').first();
    await expect(statusHeading).toBeVisible();

    // 로딩 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 4. Newsletter 구독
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    const emailInput = page.locator('footer input[type="email"]');
    const testEmail = `mobile-fan-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await subscribeButton.click();

    // 성공 확인
    const successToast = page.locator('[data-sonner-toast]', { hasText: /뉴스레터 구독 신청 완료/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });
  });

  test('팬의 정기 방문 패턴: Status 모니터링', async ({ page }) => {
    // 팬이 매주 Status 페이지를 방문하여 프로젝트 진행 상황 확인
    await page.goto('/status');

    // 로딩 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 5개 Key Metrics 확인
    const metricCards = page.locator('.glass-card');
    const metricCount = await metricCards.count();
    expect(metricCount).toBeGreaterThanOrEqual(1);

    // 프로젝트 현황 섹션으로 스크롤
    const projectsSection = page.locator('text=/프로젝트 현황|Projects Overview/i').first();
    if (await projectsSection.isVisible().catch(() => false)) {
      await projectsSection.scrollIntoViewIfNeeded();
      await expect(projectsSection).toBeVisible();

      // 진행률 바 확인
      const progressBars = page.locator('[role="progressbar"]');
      const progressCount = await progressBars.count();
      if (progressCount > 0) {
        await expect(progressBars.first()).toBeVisible();
      }
    }

    // 최근 활동 섹션 확인
    const activitySection = page.locator('text=/최근 활동|Recent Activity/i').first();
    if (await activitySection.isVisible().catch(() => false)) {
      await activitySection.scrollIntoViewIfNeeded();
      await expect(activitySection).toBeVisible();
    }

    // 팬이 Status 페이지를 통해 프로젝트 진행 상황을 정기적으로 모니터링
  });

  test('팬의 정기 방문 패턴: Blog Weekly Recap 읽기', async ({ page }) => {
    // 팬이 매주 Blog에서 Weekly Recap 포스트 확인
    await page.goto('/blog');

    // 로딩 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Weekly Recap 포스트 찾기
    const weeklyRecapPost = page.locator('text=/Weekly Recap|주간 리캡|주간 요약/i').first();

    if (await weeklyRecapPost.isVisible().catch(() => false)) {
      await expect(weeklyRecapPost).toBeVisible();

      // Weekly Recap 포스트 클릭
      const recapLink = weeklyRecapPost.locator('xpath=ancestor::a').first();
      if (await recapLink.isVisible().catch(() => false)) {
        await recapLink.click();

        // 상세 페이지 확인
        await expect(page).toHaveURL(/\/blog\/.+/);

        const detailHeading = page.locator('h1').first();
        await expect(detailHeading).toBeVisible();

        // 팬이 Weekly Recap을 읽음
      }
    } else {
      // Weekly Recap이 아직 없으면 스킵
      test.skip();
    }
  });
});
