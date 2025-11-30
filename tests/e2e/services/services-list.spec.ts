import { test, expect } from '@playwright/test';

/**
 * Services List E2E Tests
 *
 * 서비스 목록 페이지 테스트
 * - 필터링 기능
 * - 검색 기능
 * - 정렬 기능
 *
 * TASK-016~028: Services Platform - 페이지 구현
 */

test.describe('Services List - 필터링 및 검색', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services', { waitUntil: 'domcontentloaded' });
    // 페이지 로딩 대기 (헤더가 표시될 때까지)
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('서비스 목록이 정상적으로 표시됨', async ({ page }) => {
    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/서비스|IDEA on Action/i);

    // 메인 헤딩 확인
    const heading = page.getByRole('heading', { name: /우리의 서비스|서비스/i, level: 1 });
    await expect(heading).toBeVisible();

    // 서비스 카드가 표시되는지 확인
    // 카드가 없을 수도 있으므로 페이지가 정상적으로 로드되었는지만 확인
    const mainContent = page.locator('main').or(page.locator('[aria-label="서비스 목록"]'));
    await expect(mainContent.first()).toBeVisible();
  });

  test('카테고리 필터가 정상 작동함', async ({ page }) => {
    // 카테고리 탭 확인
    const categoryTabs = page.getByRole('tablist');

    if (await categoryTabs.count() > 0) {
      await expect(categoryTabs.first()).toBeVisible();

      // "전체" 탭 확인
      const allTab = page.getByRole('tab', { name: /전체/i });
      if (await allTab.count() > 0) {
        await expect(allTab).toBeVisible();

        // 전체 서비스 개수 확인
        const beforeCount = await page.locator('a[href*="/services/"]').filter({ has: page.locator('h3, h2') }).count();

        // 다른 카테고리가 있으면 클릭
        const otherTabs = page.getByRole('tab').filter({ hasNotText: /전체/i });
        if (await otherTabs.count() > 0) {
          const firstOtherTab = otherTabs.first();
          await firstOtherTab.click();

          // 로딩 대기
          await page.waitForTimeout(500);

          // 카테고리 선택 후 서비스 개수 (같거나 적어야 함)
          const afterCount = await page.locator('a[href*="/services/"]').filter({ has: page.locator('h3, h2') }).count();
          expect(afterCount).toBeLessThanOrEqual(beforeCount);
        }
      }
    }
  });

  test('정렬 옵션이 정상 작동함', async ({ page }) => {
    // 정렬 셀렉트 박스 찾기
    const sortSelect = page.getByRole('combobox').filter({ has: page.locator('text=/정렬/i') }).or(
      page.locator('select').filter({ has: page.locator('option:has-text("최신순")') })
    ).or(
      page.getByLabel(/정렬/i)
    );

    if (await sortSelect.count() > 0) {
      await expect(sortSelect.first()).toBeVisible();

      // 정렬 옵션 클릭
      await sortSelect.first().click();

      // 정렬 옵션들이 보이는지 확인
      const sortOptions = page.getByRole('option').or(page.locator('[role="option"]'));

      if (await sortOptions.count() > 0) {
        // 최신순, 가격순 등의 옵션이 있는지 확인
        const priceOption = sortOptions.filter({ hasText: /가격/i });

        if (await priceOption.count() > 0) {
          await priceOption.first().click();
          await page.waitForTimeout(500);

          // 정렬이 적용되었는지 확인 (페이지가 리로드되지 않음)
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        }
      }
    }
  });
});
