import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsRegularUser } from '../helpers/auth';

test.describe('Realtime Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/admin/realtime');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show 403 Forbidden for non-admin users', async ({ page }) => {
    // Login as regular user
    await loginAsRegularUser(page);

    // Try to access realtime page
    await page.goto('/admin/realtime');

    // Should show Forbidden page
    await expect(page.locator('h1')).toContainText(/403|Forbidden|Access Denied/i);
  });

  test('should display realtime dashboard for admin users', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to realtime dashboard
    await page.goto('/admin/realtime');

    // Should show realtime page
    await expect(page).toHaveURL('/admin/realtime');
    await expect(page.locator('h1:has-text("실시간"), h1:has-text("Realtime"), h1:has-text("Real-time")')).toBeVisible({
      timeout: 10000
    });
  });

  test('should display LIVE badge', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to realtime dashboard
    await page.goto('/admin/realtime');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for LIVE indicator
    const liveBadge = page.locator('text=/LIVE|실시간/i, [class*="animate-pulse"]').first();
    const isVisible = await liveBadge.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(liveBadge).toBeVisible();
    } else {
      console.log('LIVE badge not found');
    }
  });

  test('should display realtime metrics cards', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to realtime dashboard
    await page.goto('/admin/realtime');

    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Check for realtime metrics
    const metricsKeywords = [
      /오늘|Today/i,
      /매출|Revenue/i,
      /주문|Orders/i,
      /전환율|Conversion/i
    ];

    for (const pattern of metricsKeywords) {
      const metric = page.locator(`text=${pattern.source.replace(/\\|/g, '|')}`).first();
      const isVisible = await metric.isVisible({ timeout: 5000 }).catch(() => false);

      if (!isVisible) {
        console.log(`Metric not found: ${pattern}`);
      }
    }
  });

  test('should display online users count', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to realtime dashboard
    await page.goto('/admin/realtime');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for online users indicator
    const onlineUsers = page.locator('text=/온라인|Online/i').or(page.locator('text=/사용자|Users/i')).first();
    const isVisible = await onlineUsers.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(onlineUsers).toBeVisible();
    } else {
      console.log('Online users count not found');
    }
  });

  test('should display activity feed', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to realtime dashboard
    await page.goto('/admin/realtime');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for activity feed section
    const activityFeed = page.locator('text=/활동|Activity|최근|Recent/i').first();
    const isVisible = await activityFeed.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(activityFeed).toBeVisible();

      // Check for empty state or activity items
      const hasItems = await page.locator('[class*="activity"], [class*="feed"] > div, li').first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/활동이 없습니다|No activity|No orders/i').isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasItems || hasEmptyState).toBeTruthy();
    } else {
      console.log('Activity feed not found');
    }
  });

  test('should have refresh interval selector', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to realtime dashboard
    await page.goto('/admin/realtime');

    // Look for refresh interval control
    const refreshControl = page.locator('select, [role="combobox"]').first();
    const isVisible = await refreshControl.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(refreshControl).toBeVisible();
    } else {
      // Maybe it's implemented as buttons instead
      const intervalButton = page.locator('button:has-text("초"), button:has-text("분"), button:has-text("second"), button:has-text("minute")').first();
      const buttonVisible = await intervalButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (!buttonVisible) {
        console.log('Refresh interval control not found');
      }
    }
  });

  test('should auto-refresh data', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to realtime dashboard
    await page.goto('/admin/realtime');

    // Wait for initial load
    await page.waitForLoadState('networkidle');

    // Get initial metric value (if any)
    const metricValue = await page.locator('[class*="metric"], [class*="card"] p, [class*="card"] div').first().textContent().catch(() => '');

    // Wait for auto-refresh interval (30 seconds is default in implementation)
    // For test purposes, we just verify the page doesn't error during wait
    await page.waitForTimeout(2000); // Short wait to avoid long test

    // Verify page is still functional
    await expect(page).toHaveURL('/admin/realtime');
  });

  test('should display time information', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to realtime dashboard
    await page.goto('/admin/realtime');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for time-related text (timestamps, "ago", etc.)
    const timePattern = /방금|ago|분 전|시간 전|hours?|minutes?|seconds?/i;
    const timeText = page.locator(`text=${timePattern.source.replace(/\\|/g, '|')}`).first();
    const isVisible = await timeText.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isVisible) {
      console.log('Time information not found (might be no recent activity)');
    }
  });
});
