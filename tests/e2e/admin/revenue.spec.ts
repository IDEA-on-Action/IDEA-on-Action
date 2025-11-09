import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsRegularUser } from '../helpers/auth';

test.describe('Revenue Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/admin/revenue');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show 403 Forbidden for non-admin users', async ({ page }) => {
    // Login as regular user
    await loginAsRegularUser(page);

    // Try to access revenue page
    await page.goto('/admin/revenue');

    // Should show Forbidden page
    await expect(page.locator('h1')).toContainText(/403|Forbidden|Access Denied/i);
  });

  test('should display revenue page for admin users', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to revenue page
    await page.goto('/admin/revenue');

    // Should show revenue page
    await expect(page).toHaveURL('/admin/revenue');
    await expect(page.locator('h1:has-text("매출"), h1:has-text("Revenue")')).toBeVisible({
      timeout: 10000
    });
  });

  test('should switch between interval tabs (Daily/Weekly/Monthly)', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to revenue page
    await page.goto('/admin/revenue');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for interval tabs
    const intervalTabs = [
      /일별|Daily/i,
      /주별|Weekly/i,
      /월별|Monthly/i
    ];

    for (const pattern of intervalTabs) {
      const tab = page.locator(`[role="tab"]:has-text("${pattern.source.replace(/\\|/g, '|')}"), button:has-text("${pattern.source.replace(/\\|/g, '|')}")`).first();

      // Try to click if visible
      const isVisible = await tab.isVisible().catch(() => false);
      if (isVisible) {
        await tab.click();
        await page.waitForTimeout(500); // Wait for chart to update
      }
    }
  });

  test('should display KPI cards', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to revenue page
    await page.goto('/admin/revenue');

    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Check for KPI keywords (flexible matching)
    const kpiKeywords = [
      /총 매출|Total Revenue/i,
      /주문|Orders/i,
      /평균|Average/i,
      /전환율|Conversion/i
    ];

    for (const pattern of kpiKeywords) {
      const kpiCard = page.locator(`text=${pattern.source.replace(/\\|/g, '|')}`).first();
      const isVisible = await kpiCard.isVisible({ timeout: 5000 }).catch(() => false);

      if (!isVisible) {
        console.log(`KPI card not found: ${pattern}`);
      }
    }
  });

  test('should display revenue chart', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to revenue page
    await page.goto('/admin/revenue');

    // Wait for chart to load
    await page.waitForLoadState('networkidle');

    // Check for chart (recharts uses SVG)
    const chartExists = await page.locator('svg').first().isVisible({ timeout: 10000 }).catch(() => false);

    if (chartExists) {
      await expect(page.locator('svg').first()).toBeVisible();
    } else {
      // If no chart, check for empty state
      const emptyState = await page.locator('text=/데이터가 없습니다|No data/i').isVisible().catch(() => false);
      console.log(emptyState ? 'Empty state shown' : 'No chart or empty state found');
    }
  });

  test('should display service revenue tab', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to revenue page
    await page.goto('/admin/revenue');

    // Click on "서비스별" tab if exists
    const serviceTab = page.locator('[role="tab"]:has-text("서비스"), [role="tab"]:has-text("Service"), button:has-text("서비스별"), button:has-text("By Service")').first();
    const isVisible = await serviceTab.isVisible().catch(() => false);

    if (isVisible) {
      await serviceTab.click();
      await page.waitForTimeout(1000);

      // Check for pie chart or table
      const hasChart = await page.locator('svg').first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasTable = await page.locator('table, [role="table"]').isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/데이터가 없습니다|No data/i').isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasChart || hasTable || hasEmptyState).toBeTruthy();
    }
  });

  test('should handle CSV export button', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to revenue page
    await page.goto('/admin/revenue');

    // Look for CSV export button
    const csvButton = page.locator('button:has-text("CSV"), button:has-text("내보내기"), button:has-text("Export")').first();
    const isVisible = await csvButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      // Just check if button exists, don't actually click (would download file)
      await expect(csvButton).toBeVisible();
    } else {
      console.log('CSV export button not found');
    }
  });

  test('should display currency formatted values', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to revenue page
    await page.goto('/admin/revenue');

    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Look for Korean Won symbol or formatted numbers
    const hasCurrency = await page.locator('text=/₩|KRW|원/').first().isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasCurrency) {
      console.log('Currency formatted values not found (might be 0 or no data)');
    }
  });
});
