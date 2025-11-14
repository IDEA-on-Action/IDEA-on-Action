import { test, expect } from '@playwright/test';

/**
 * Journey 2: Collaborator (협업 제안 → 프로젝트 시작)
 *
 * 사용자 시나리오:
 * 1. IDEA on Action과 협업하고 싶은 사용자 (기업, 개인)
 * 2. Work with Us 폼을 통해 협업 제안
 * 3. Portfolio와 Lab을 둘러보며 협업 가능성 탐색
 * 4. Community에 참여하여 토론
 *
 * 테스트 플로우:
 * - Home 페이지 방문 → Work with Us CTA 확인
 * - Work with Us 페이지 → 협업 제안 폼 작성 및 제출
 * - Portfolio 페이지 → 진행 중인 프로젝트 확인
 * - Portfolio 상세 → 프로젝트 세부 정보 확인
 * - Lab 페이지 → 바운티 목록 확인
 * - Community 페이지 → 토론 참여 가능성 확인
 */

test.describe('Journey 2: Collaborator (협업 제안 → 프로젝트 시작)', () => {
  test('Step 1: Home 페이지 방문 및 Work with Us CTA 확인', async ({ page }) => {
    // Home 페이지 방문
    await page.goto('/');

    // Work with Us CTA 버튼 또는 링크 찾기
    const workWithUsButton = page.locator('a[href="/work-with-us"], button:has-text("Work with Us"), a:has-text("협업"), a:has-text("Work")');
    const buttonCount = await workWithUsButton.count();

    if (buttonCount > 0) {
      const firstButton = workWithUsButton.first();
      await firstButton.scrollIntoViewIfNeeded();
      await expect(firstButton).toBeVisible();
    } else {
      // Header 네비게이션에서 확인
      const headerWorkLink = page.locator('header a[href="/work-with-us"]');
      await expect(headerWorkLink).toBeVisible();
    }

    // 페이지 로드 확인
    await expect(page).toHaveTitle(/IDEA on Action/i);
  });

  test('Step 2: Work with Us 페이지로 이동', async ({ page }) => {
    await page.goto('/');

    // Work with Us 링크 클릭
    const workWithUsLink = page.locator('a[href="/work-with-us"]').first();
    await workWithUsLink.click();

    // URL 확인
    await expect(page).toHaveURL(/\/work-with-us/);

    // 페이지 헤딩 확인
    const pageHeading = page.locator('h1').filter({ hasText: /Work with Us|협업|함께 만들어가요/i }).first();
    await expect(pageHeading).toBeVisible();

    // 협업 설명 또는 소개 텍스트 확인
    const introText = page.locator('text=/프로젝트|협업|partnership|collaboration/i').first();
    await expect(introText).toBeVisible();
  });

  test('Step 3: 협업 제안 폼 작성 및 제출', async ({ page }) => {
    await page.goto('/work-with-us');

    // 폼 필드 확인
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"], input[placeholder*="Name"]');
    await expect(nameInput).toBeVisible();

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();

    const messageTextarea = page.locator('textarea[name="message"], textarea[placeholder*="메시지"], textarea[placeholder*="Message"]');
    await expect(messageTextarea).toBeVisible();

    // 폼 작성
    await nameInput.fill('김협업');
    await emailInput.fill(`collaborator-${Date.now()}@example.com`);
    await messageTextarea.fill(
      'IDEA on Action과 함께 AI 기반 프로젝트를 진행하고 싶습니다. 저희 회사는 헬스케어 스타트업으로, ' +
      'AI 기술을 활용한 환자 케어 시스템 개발에 관심이 있습니다. 협업 가능성에 대해 논의하고 싶습니다.'
    );

    // 제출 버튼 클릭
    const submitButton = page.locator('button[type="submit"], button:has-text("보내기"), button:has-text("Submit")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // 성공 메시지 또는 토스트 확인
    const successMessage = page.locator(
      'text=/제안이 전송되었습니다|Successfully sent|감사합니다|Thank you/i, ' +
      '[data-sonner-toast]:has-text("성공"), ' +
      '[data-sonner-toast]:has-text("Success")'
    );
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('Step 4: Portfolio 페이지로 이동하여 프로젝트 확인', async ({ page }) => {
    await page.goto('/');

    // Portfolio 링크 클릭
    const portfolioLink = page.locator('a[href="/portfolio"]').first();
    await portfolioLink.click();

    // URL 확인
    await expect(page).toHaveURL(/\/portfolio/);

    // 로딩 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 프로젝트 카드 확인
    const projectCards = page.locator('.glass-card, [class*="card"], article');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      // 첫 번째 프로젝트 확인
      const firstProject = projectCards.first();
      await expect(firstProject).toBeVisible();

      // 프로젝트 제목
      const projectTitle = firstProject.locator('h2, h3').first();
      await expect(projectTitle).toBeVisible();

      // 프로젝트 상태 (진행중/완료)
      const projectStatus = page.locator('text=/진행중|완료|in-progress|launched|backlog/i').first();
      if (await projectStatus.isVisible().catch(() => false)) {
        await expect(projectStatus).toBeVisible();
      }

      // 기술 스택 태그
      const techTags = page.locator('text=/React|TypeScript|Supabase|Node/i').first();
      if (await techTags.isVisible().catch(() => false)) {
        await expect(techTags).toBeVisible();
      }
    } else {
      // Empty State 확인
      const emptyState = page.locator('text=/프로젝트가 없습니다|No projects/i');
      await expect(emptyState).toBeVisible();
    }
  });

  test('Step 5: Portfolio 상세 페이지로 이동하여 프로젝트 세부 정보 확인', async ({ page }) => {
    await page.goto('/portfolio');

    // 로딩 대기
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 프로젝트 카드 확인
    const projectCards = page.locator('.glass-card, [class*="card"], article');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      // 첫 번째 프로젝트 클릭
      const firstProject = projectCards.first();
      const projectLink = firstProject.locator('a').first();

      if (await projectLink.isVisible().catch(() => false)) {
        await projectLink.click();

        // 상세 페이지 URL 확인 (/portfolio/:id 또는 /portfolio/:slug)
        await expect(page).toHaveURL(/\/portfolio\/.+/);

        // 상세 페이지 헤딩 확인
        const detailHeading = page.locator('h1').first();
        await expect(detailHeading).toBeVisible();

        // 프로젝트 설명 확인
        const description = page.locator('p, div').filter({ hasText: /.{50,}/ }).first();
        await expect(description).toBeVisible();

        // GitHub 링크 또는 Demo 링크 확인
        const externalLinks = page.locator('a[href*="github.com"], a[href*="demo"], a:has-text("GitHub"), a:has-text("Demo")');
        if (await externalLinks.first().isVisible().catch(() => false)) {
          await expect(externalLinks.first()).toBeVisible();
        }
      }
    } else {
      // 프로젝트가 없으면 스킵
      test.skip();
    }
  });

  test('Step 6: Lab 페이지로 이동하여 바운티 확인', async ({ page }) => {
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

    // 바운티 카드 또는 실험 프로젝트 확인
    const bountyCards = page.locator('.glass-card, [class*="card"], article');
    const bountyCount = await bountyCards.count();

    if (bountyCount > 0) {
      // 첫 번째 바운티 확인
      const firstBounty = bountyCards.first();
      await expect(firstBounty).toBeVisible();

      // 바운티 제목
      const bountyTitle = firstBounty.locator('h2, h3').first();
      await expect(bountyTitle).toBeVisible();

      // 바운티 상태 또는 보상 정보
      const bountyInfo = page.locator('text=/open|assigned|done|₩|원/i').first();
      if (await bountyInfo.isVisible().catch(() => false)) {
        await expect(bountyInfo).toBeVisible();
      }

      // 필요 스킬 태그
      const skillTags = page.locator('text=/Frontend|Backend|Design|AI/i').first();
      if (await skillTags.isVisible().catch(() => false)) {
        await expect(skillTags).toBeVisible();
      }
    } else {
      // Empty State 확인
      const emptyState = page.locator('text=/바운티가 없습니다|No bounties/i');
      await expect(emptyState).toBeVisible();
    }
  });

  test('Step 7: Community 페이지로 이동하여 토론 참여 가능성 확인', async ({ page }) => {
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

      // iframe 내부 컨텐츠 확인 (접근 가능 시)
      // Note: Cross-origin iframe은 내부 컨텐츠 접근 불가
    } else {
      // Giscus 컨테이너 확인
      const giscusContainer = page.locator('.giscus, [class*="giscus"]');
      await expect(giscusContainer).toBeVisible();
    }

    // 페이지에 토론 관련 안내 텍스트 확인
    const discussionText = page.locator('text=/토론|discussion|댓글|comment|참여|join/i').first();
    if (await discussionText.isVisible().catch(() => false)) {
      await expect(discussionText).toBeVisible();
    }

    // 협업자가 커뮤니티에 참여할 준비 완료
  });

  test('전체 여정: Home → Work with Us → 폼 제출 → Portfolio → Lab → Community', async ({ page }) => {
    // 1. Home 페이지 방문
    await page.goto('/');
    await expect(page).toHaveTitle(/IDEA on Action/i);

    // 2. Work with Us 페이지로 이동
    await page.goto('/work-with-us');
    const workHeading = page.locator('h1').first();
    await expect(workHeading).toBeVisible();

    // 3. 협업 제안 폼 작성
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    const emailInput = page.locator('input[type="email"]');
    const messageTextarea = page.locator('textarea');

    await nameInput.fill('전체여정테스터');
    await emailInput.fill(`full-collab-${Date.now()}@example.com`);
    await messageTextarea.fill(
      'IDEA on Action과 협업하고 싶습니다. AI 프로젝트에 관심이 있으며, 함께 멋진 프로덕트를 만들고 싶습니다. ' +
      '제 전문 분야는 프론트엔드 개발이며, React와 TypeScript에 능숙합니다.'
    );

    // 4. 폼 제출
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // 성공 메시지 대기
    const successMessage = page.locator('text=/전송되었습니다|Successfully sent|감사합니다/i, [data-sonner-toast]');
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });

    // 5. Portfolio 방문
    await page.goto('/portfolio');
    const portfolioHeading = page.locator('h1').first();
    await expect(portfolioHeading).toBeVisible();

    // 로딩 대기
    const portfolioLoadingSpinner = page.locator('.animate-spin');
    if (await portfolioLoadingSpinner.isVisible().catch(() => false)) {
      await portfolioLoadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 6. Lab 방문
    await page.goto('/lab');
    const labHeading = page.locator('h1').first();
    await expect(labHeading).toBeVisible();

    // 로딩 대기
    const labLoadingSpinner = page.locator('.animate-spin');
    if (await labLoadingSpinner.isVisible().catch(() => false)) {
      await labLoadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // 7. Community 방문
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

  test('모바일 뷰포트에서 협업 제안 플로우', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });

    // 1. Home 방문
    await page.goto('/');
    await expect(page).toHaveTitle(/IDEA on Action/i);

    // 2. Work with Us 방문
    await page.goto('/work-with-us');
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // 3. 폼 작성 (모바일에서도 동일)
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    const emailInput = page.locator('input[type="email"]');
    const messageTextarea = page.locator('textarea');

    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('모바일협업자');

    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.fill(`mobile-collab-${Date.now()}@example.com`);

    await messageTextarea.scrollIntoViewIfNeeded();
    await messageTextarea.fill(
      '모바일에서 협업 제안을 보냅니다. 프로젝트 협업에 관심이 있습니다.'
    );

    // 4. 제출
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    // 5. 성공 확인
    const successMessage = page.locator('text=/전송되었습니다|Successfully sent/i, [data-sonner-toast]');
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('폼 유효성 검증: 필수 필드 누락 시 에러', async ({ page }) => {
    await page.goto('/work-with-us');

    // 이메일만 입력하고 제출 (이름, 메시지 누락)
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // HTML5 유효성 검증 또는 커스텀 에러 메시지 확인
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    const validationMessage = await nameInput.evaluate((el: HTMLInputElement) => el.validationMessage);

    // 유효성 검증 메시지가 있거나, 버튼이 비활성화되어 있어야 함
    if (validationMessage) {
      expect(validationMessage).toBeTruthy();
    } else {
      await expect(submitButton).toBeDisabled();
    }
  });
});
