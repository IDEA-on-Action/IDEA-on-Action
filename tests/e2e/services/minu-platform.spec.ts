import { test, expect } from '@playwright/test';

/**
 * Minu Platform E2E Tests
 * Minu 플랫폼 서비스 페이지 테스트
 */

test.describe('Minu Platform Pages', () => {
  test.describe('Minu Platform Overview', () => {
    test('should load Minu platform page', async ({ page }) => {
      await page.goto('/services/minu');

      // 페이지 제목 확인
      await expect(page.locator('h1')).toContainText('Minu');
    });

    test('should display all Minu services', async ({ page }) => {
      await page.goto('/services/minu');
      await page.waitForLoadState('networkidle');

      // 각 서비스 이름 확인 (카드 제목으로 구체적으로 선택)
      await expect(page.locator('text=Minu Find').first()).toBeVisible();
      await expect(page.locator('text=Minu Frame').first()).toBeVisible();
      await expect(page.locator('text=Minu Build').first()).toBeVisible();
      await expect(page.locator('text=Minu Keep').first()).toBeVisible();
    });

    test('should have correct SEO meta tags', async ({ page }) => {
      await page.goto('/services/minu');

      // 타이틀 확인
      await expect(page).toHaveTitle(/Minu|IDEA/);
    });
  });

  test.describe('Minu Find Page', () => {
    test('should load Minu Find page', async ({ page }) => {
      await page.goto('/services/minu/find');
      await page.waitForLoadState('networkidle');

      // 페이지 제목 확인
      await expect(page.locator('h1')).toContainText('Minu Find');
    });

    test('should display pricing plans', async ({ page }) => {
      await page.goto('/services/minu/find');

      // 플랜 이름 확인 (heading으로 더 구체적으로 선택)
      await expect(page.getByRole('heading', { name: 'Basic' }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Pro' }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Enterprise' }).first()).toBeVisible();
    });

    test('should display key features', async ({ page }) => {
      await page.goto('/services/minu/find');
      await page.waitForLoadState('networkidle');

      // 주요 기능 섹션 확인 - 기능 카드 확인
      // Section 타이틀이 h2로 렌더링되거나 특정 기능 텍스트가 보여야 함
      const featureContent = page.locator('text=산업·기술 시그널').or(page.locator('text=시그널 수집'));
      await expect(featureContent.first()).toBeVisible();
    });

    test('should display FAQ section', async ({ page }) => {
      await page.goto('/services/minu/find');

      // FAQ 섹션 확인
      await expect(page.getByRole('heading', { name: '자주 묻는 질문' })).toBeVisible();
    });

    test('should have CTA buttons', async ({ page }) => {
      await page.goto('/services/minu/find');
      await page.waitForLoadState('networkidle');

      // CTA 버튼 확인 (시작하기, 무료 체험 등)
      const ctaButton = page.getByRole('link', { name: /무료 체험|시작하기|가입/ });
      await expect(ctaButton.first()).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate from platform to Find page', async ({ page }) => {
      await page.goto('/services/minu');

      // Find 서비스 링크 클릭
      await page.getByRole('link', { name: /자세히 보기|Minu Find/ }).first().click();

      // URL 확인
      await expect(page).toHaveURL(/\/services\/minu\/find/);
    });

    test('should have breadcrumb navigation', async ({ page }) => {
      await page.goto('/services/minu/find');

      // 빵조각 네비게이션 확인 (있는 경우)
      const breadcrumb = page.locator('nav[aria-label*="breadcrumb"], [class*="breadcrumb"]');
      if (await breadcrumb.count() > 0) {
        await expect(breadcrumb.getByText('Minu')).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/services/minu');

      // 모바일에서도 제목이 보여야 함
      await expect(page.locator('h1')).toContainText('Minu');
    });

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/services/minu/find');

      // 태블릿에서도 플랜이 보여야 함 (heading으로 구체적으로 선택)
      await expect(page.getByRole('heading', { name: 'Basic' }).first()).toBeVisible();
    });
  });

  test.describe('Legacy COMPASS Compatibility', () => {
    test('should still load legacy COMPASS platform page', async ({ page }) => {
      await page.goto('/services/compass');

      // 리다이렉트 또는 페이지 로드 확인
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should still load legacy Navigator page', async ({ page }) => {
      await page.goto('/services/compass/navigator');

      // 리다이렉트 또는 페이지 로드 확인
      await expect(page.locator('h1')).toBeVisible();
    });
  });
});

test.describe('Minu Platform Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/services/minu');

    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');

    // h1이 존재해야 함
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('should have accessible buttons', async ({ page }) => {
    await page.goto('/services/minu/find');

    // 모든 버튼에 접근 가능한 이름이 있어야 함
    const buttons = page.getByRole('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const name = await button.getAttribute('aria-label') || await button.textContent();
      expect(name?.trim()).toBeTruthy();
    }
  });

  test('should have accessible links', async ({ page }) => {
    await page.goto('/services/minu');

    // 주요 링크가 접근 가능해야 함
    const links = page.getByRole('link');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });
});
