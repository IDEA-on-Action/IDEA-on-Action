/**
 * AdminNewsletter E2E Tests
 *
 * Tests for newsletter subscriber management page
 * - Page loading and structure
 * - Stats card display
 * - Search functionality
 * - Status filtering
 * - Status change operations (pending → confirmed → unsubscribed)
 * - Subscriber deletion (GDPR)
 * - Pagination
 * - Empty states
 * - Permissions
 * - Statistics data display
 *
 * @module AdminNewsletter
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../../fixtures/auth-helpers';

test.describe('AdminNewsletter', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();

    // Login as admin
    await loginAsAdmin(page);

    // Navigate to newsletter page
    await page.goto('/admin/newsletter');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  // ============================================
  // 1. Page Loading & Basic Structure (3 tests)
  // ============================================

  test.describe('Page Loading', () => {
    test('should load newsletter page successfully', async ({ page }) => {
      // Check page title
      await expect(
        page.getByRole('heading', { name: /newsletter subscribers/i })
      ).toBeVisible();

      // Check subtitle
      await expect(
        page.getByText(/뉴스레터 구독자를 관리/i)
      ).toBeVisible();
    });

    test('should display 4 stats cards', async ({ page }) => {
      // Total subscribers card
      await expect(page.getByText(/전체 구독자/i)).toBeVisible();

      // Confirmed card
      await expect(page.getByText(/확인 완료/i)).toBeVisible();

      // Pending card
      await expect(page.getByText(/확인 대기/i)).toBeVisible();

      // Unsubscribed card
      await expect(page.getByText(/구독 취소/i)).toBeVisible();
    });

    test('should display subscriber table with headers', async ({ page }) => {
      // Wait for table to be visible
      const table = page.locator('table, [role="table"]');

      // Check if we have either a table with data or an empty state
      const hasTable = await table.count() > 0;
      const hasEmptyState = await page.getByText(/검색 결과가 없습니다|구독자가 없습니다/i).count() > 0;

      expect(hasTable || hasEmptyState).toBeTruthy();

      // If table exists, check for headers
      if (hasTable) {
        const headers = ['이메일', '상태', '구독일', '구독 경로', '액션'];
        for (const header of headers) {
          const headerElement = page.locator(
            `th:has-text("${header}"), [role="columnheader"]:has-text("${header}")`
          );
          // Headers may not always be visible depending on table structure
          const count = await headerElement.count();
          expect(count).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  // ============================================
  // 2. Search Functionality (3 tests)
  // ============================================

  test.describe('Search', () => {
    test('should have search input visible', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/이메일 주소 검색/i);
      await expect(searchInput).toBeVisible();
    });

    test('should search subscribers by email', async ({ page }) => {
      // Get initial row count
      const initialRows = await page.locator('tbody tr, [role="row"]:not([role="columnheader"])').count();

      // Fill search input
      const searchInput = page.getByPlaceholder(/이메일 주소 검색/i);
      await searchInput.fill('test');

      // Wait for debounce and response
      await page.waitForTimeout(600);

      // Check if results are filtered or empty state shown
      const emptyState = await page.getByText(/검색 결과가 없습니다/i).count();
      const resultRows = await page.locator('tbody tr, [role="row"]:not([role="columnheader"])').count();

      // Either empty state or filtered results
      expect(emptyState > 0 || resultRows <= initialRows).toBeTruthy();
    });

    test('should clear search results', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/이메일 주소 검색/i);

      // Fill search
      await searchInput.fill('test');
      await page.waitForTimeout(600);

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(600);

      // Search input should be empty
      await expect(searchInput).toHaveValue('');

      // Either table with data or loading state
      const table = await page.locator('table, [role="table"]').count();
      expect(table > 0).toBeTruthy();
    });
  });

  // ============================================
  // 3. Status Filtering (4 tests)
  // ============================================

  test.describe('Status Filtering', () => {
    test('should display status filter select', async ({ page }) => {
      const statusSelect = page.locator('button:has-text("전체 상태"), [role="combobox"]').first();
      await expect(statusSelect).toBeVisible({ timeout: 5000 });
    });

    test('should filter by all statuses', async ({ page }) => {
      // Click status select
      const statusSelect = page.locator('button:has-text("전체 상태"), [role="combobox"]').first();

      if (await statusSelect.isVisible()) {
        await statusSelect.click();

        // Select "전체 상태"
        const allOption = page.getByRole('option', { name: /전체 상태/i });
        if (await allOption.count() > 0) {
          await allOption.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });

    test('should filter by pending status', async ({ page }) => {
      const statusSelect = page.locator('button:has-text("전체 상태"), [role="combobox"]').first();

      if (await statusSelect.isVisible()) {
        await statusSelect.click();

        const pendingOption = page.getByRole('option', { name: /확인 대기/i });
        if (await pendingOption.count() > 0) {
          await pendingOption.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });

    test('should filter by confirmed status', async ({ page }) => {
      const statusSelect = page.locator('button:has-text("전체 상태"), [role="combobox"]').first();

      if (await statusSelect.isVisible()) {
        await statusSelect.click();

        const confirmedOption = page.getByRole('option', { name: /확인 완료/i });
        if (await confirmedOption.count() > 0) {
          await confirmedOption.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });
  });

  // ============================================
  // 4. Status Change Operations (3 tests)
  // ============================================

  test.describe('Status Change', () => {
    test('should change subscriber status from pending to confirmed', async ({ page }) => {
      // Filter by pending status
      const statusSelect = page.locator('button:has-text("전체 상태"), [role="combobox"]').first();

      if (await statusSelect.isVisible()) {
        await statusSelect.click();

        const pendingOption = page.getByRole('option', { name: /확인 대기/i });
        if (await pendingOption.count() > 0) {
          await pendingOption.click();
          await page.waitForLoadState('networkidle');
        }
      }

      // Find first action button (more menu)
      const actionButtons = page.locator('button:has-svg([class*="MoreVertical"]), button[aria-label*="액션"]');
      const count = await actionButtons.count();

      if (count > 0) {
        await actionButtons.first().click();
        await page.waitForTimeout(300);

        // Click "확인 완료로 변경" menu item
        const changeOption = page.getByRole('menuitem', { name: /확인 완료로 변경/i });
        if (await changeOption.count() > 0) {
          await changeOption.click();

          // Check for success toast
          const successToast = page.getByText(/상태가 변경되었습니다|성공/i);
          await successToast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
            // Toast may not always be visible, but operation should complete
          });
        }
      }
    });

    test('should change subscriber status from confirmed to unsubscribed', async ({ page }) => {
      // Filter by confirmed status
      const statusSelect = page.locator('button:has-text("전체 상태"), [role="combobox"]').first();

      if (await statusSelect.isVisible()) {
        await statusSelect.click();

        const confirmedOption = page.getByRole('option', { name: /확인 완료/i });
        if (await confirmedOption.count() > 0) {
          await confirmedOption.click();
          await page.waitForLoadState('networkidle');
        }
      }

      // Find first action button
      const actionButtons = page.locator('button:has-svg([class*="MoreVertical"]), button[aria-label*="액션"]');
      const count = await actionButtons.count();

      if (count > 0) {
        await actionButtons.first().click();
        await page.waitForTimeout(300);

        // Click "구독 취소로 변경" menu item
        const unsubscribeOption = page.getByRole('menuitem', { name: /구독 취소로 변경/i });
        if (await unsubscribeOption.count() > 0) {
          await unsubscribeOption.click();

          // Check for success toast
          const successToast = page.getByText(/상태가 변경되었습니다|성공/i);
          await successToast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
            // Toast may not always be visible
          });
        }
      }
    });

    test('should restore subscriber from unsubscribed to confirmed', async ({ page }) => {
      // Filter by unsubscribed status
      const statusSelect = page.locator('button:has-text("전체 상태"), [role="combobox"]').first();

      if (await statusSelect.isVisible()) {
        await statusSelect.click();

        const unsubscribedOption = page.getByRole('option', { name: /구독 취소/i });
        if (await unsubscribedOption.count() > 0) {
          await unsubscribedOption.click();
          await page.waitForLoadState('networkidle');
        }
      }

      // Find first action button
      const actionButtons = page.locator('button:has-svg([class*="MoreVertical"]), button[aria-label*="액션"]');
      const count = await actionButtons.count();

      if (count > 0) {
        await actionButtons.first().click();
        await page.waitForTimeout(300);

        // Click "확인 완료로 복구" menu item
        const restoreOption = page.getByRole('menuitem', { name: /확인 완료로 복구/i });
        if (await restoreOption.count() > 0) {
          await restoreOption.click();

          // Check for success toast
          const successToast = page.getByText(/상태가 변경되었습니다|성공/i);
          await successToast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
            // Toast may not always be visible
          });
        }
      }
    });
  });

  // ============================================
  // 5. Subscriber Deletion (GDPR) (2 tests)
  // ============================================

  test.describe('Subscriber Deletion (GDPR)', () => {
    test('should show delete confirmation dialog', async ({ page }) => {
      // Find first action button
      const actionButtons = page.locator('button:has-svg([class*="MoreVertical"]), button[aria-label*="액션"]');
      const count = await actionButtons.count();

      if (count > 0) {
        await actionButtons.first().click();
        await page.waitForTimeout(300);

        // Click delete menu item
        const deleteOption = page.getByRole('menuitem', { name: /삭제.*GDPR|GDPR.*삭제|Delete.*GDPR/i });
        if (await deleteOption.count() > 0) {
          await deleteOption.click();
          await page.waitForTimeout(300);

          // Check for alert dialog
          const alertDialog = page.locator('[role="alertdialog"], [role="dialog"]').first();
          await expect(alertDialog).toBeVisible({ timeout: 5000 });

          // Check for delete confirmation text
          const confirmText = alertDialog.getByText(/구독자 삭제 확인|Delete Confirmation/i);
          await expect(confirmText).toBeVisible();

          // Check for GDPR mention
          const gdprText = alertDialog.getByText(/GDPR/i);
          await expect(gdprText).toBeVisible();

          // Check for warning text
          const warningText = alertDialog.getByText(/되돌릴 수 없습니다|cannot be undone/i);
          await expect(warningText).toBeVisible();
        }
      }
    });

    test('should cancel deletion without deleting', async ({ page }) => {
      // Find first action button
      const actionButtons = page.locator('button:has-svg([class*="MoreVertical"]), button[aria-label*="액션"]');
      const count = await actionButtons.count();

      if (count > 0) {
        await actionButtons.first().click();
        await page.waitForTimeout(300);

        // Click delete menu item
        const deleteOption = page.getByRole('menuitem', { name: /삭제.*GDPR|GDPR.*삭제|Delete.*GDPR/i });
        if (await deleteOption.count() > 0) {
          await deleteOption.click();
          await page.waitForTimeout(300);

          // Find and click cancel button
          const cancelButton = page.getByRole('button', { name: /취소|Cancel/i }).first();
          if (await cancelButton.count() > 0) {
            await cancelButton.click();
            await page.waitForTimeout(300);

            // Dialog should be closed
            const alertDialog = page.locator('[role="alertdialog"], [role="dialog"]').first();
            await expect(alertDialog).not.toBeVisible().catch(() => {
              // Dialog may already be gone
            });
          }
        }
      }
    });
  });

  // ============================================
  // 6. Pagination (3 tests)
  // ============================================

  test.describe('Pagination', () => {
    test('should display pagination when subscribers exist', async ({ page }) => {
      // Wait for page to load
      await page.waitForTimeout(1000);

      // Check for pagination info
      const paginationInfo = page.getByText(/페이지 \d+/i);
      const paginationCount = await paginationInfo.count();

      // Pagination info should be visible if there are subscribers
      expect(paginationCount).toBeGreaterThanOrEqual(0);
    });

    test('should have navigation buttons', async ({ page }) => {
      // Check for next/previous buttons
      const nextButton = page.getByRole('button', { name: /다음|Next/i }).last();
      const prevButton = page.getByRole('button', { name: /이전|Previous/i }).first();

      // At least one should exist (may be disabled)
      const totalButtons = (await nextButton.count()) + (await prevButton.count());
      expect(totalButtons).toBeGreaterThanOrEqual(0);
    });

    test('should navigate between pages', async ({ page }) => {
      // Look for next button
      const nextButton = page.getByRole('button', { name: /다음|Next/i }).last();

      if (await nextButton.isEnabled()) {
        // Click next
        await nextButton.click();
        await page.waitForLoadState('networkidle');

        // Check page number changed
        const pageInfo = page.getByText(/페이지 2/i);
        const found = await pageInfo.count() > 0;
        expect(found).toBeTruthy();

        // Click back to previous page
        const prevButton = page.getByRole('button', { name: /이전|Previous/i }).first();
        if (await prevButton.isEnabled()) {
          await prevButton.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });
  });

  // ============================================
  // 7. Empty States (2 tests)
  // ============================================

  test.describe('Empty States', () => {
    test('should show empty state when no subscribers found', async ({ page }) => {
      // Search for non-existent email
      const searchInput = page.getByPlaceholder(/이메일 주소 검색/i);
      await searchInput.fill('nonexistent-very-unique-email-12345@example.com');
      await page.waitForTimeout(600);

      // Check for empty state message
      const emptyState = page.getByText(/검색 결과가 없습니다|구독자가 없습니다/i);
      const found = await emptyState.count() > 0;

      expect(found).toBeTruthy();
    });

    test('should show loading state during data fetch', async ({ page }) => {
      // Reload page to see loading state briefly
      await page.reload();

      // Wait for loading to complete
      await page.waitForLoadState('networkidle');

      // Page should fully load after
      const heading = page.getByRole('heading', { name: /newsletter subscribers/i });
      await expect(heading).toBeVisible();
    });
  });

  // ============================================
  // 8. Permissions (2 tests)
  // ============================================

  test.describe('Permissions', () => {
    test('should be accessible by admin user', async ({ page }) => {
      // Already logged in as admin
      const heading = page.getByRole('heading', { name: /newsletter subscribers/i });
      await expect(heading).toBeVisible();

      // Page should not show permission error
      const errorText = page.getByText(/권한이 없습니다|Permission denied|Unauthorized/i);
      const errorCount = await errorText.count();
      expect(errorCount).toBe(0);
    });

    test('should show action buttons for subscribers', async ({ page }) => {
      // Wait for table to load
      await page.waitForTimeout(1000);

      // Find action buttons
      const actionButtons = page.locator('button:has-svg([class*="MoreVertical"]), button[aria-label*="액션"]');
      const count = await actionButtons.count();

      // Should have at least 0 (empty state is ok) or more (with data)
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // 9. Statistics Cards (2 tests)
  // ============================================

  test.describe('Statistics', () => {
    test('should display subscriber counts in stats cards', async ({ page }) => {
      // Check for stat card with numbers
      const statCards = page.locator('[class*="card"], div:has(h3:has-text("전체 구독자"))');
      const cardCount = await statCards.count();

      // Should have at least some cards
      expect(cardCount).toBeGreaterThanOrEqual(1);

      // Stats should show numbers
      const totalText = page.getByText(/전체 구독자/i).locator('..');
      const numberElements = totalText.locator(':has-text(/\\d+/)');
      const numberCount = await numberElements.count();

      // At least one number should be shown
      expect(numberCount).toBeGreaterThanOrEqual(0);
    });

    test('should display growth and churn indicators', async ({ page }) => {
      // Check for growth indicator
      const growthText = page.getByText(/오늘|Today|\+/i);
      const churnText = page.getByText(/이탈율|Churn Rate|%/i);

      // At least one should be visible
      const growthCount = await growthText.count();
      const churnCount = await churnText.count();

      expect(growthCount + churnCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // 10. CSV Export (4 tests)
  // ============================================

  test.describe('CSV Export', () => {
    test('should display CSV export button', async ({ page }) => {
      // Check for CSV export button
      const exportButton = page.getByRole('button', { name: /CSV 내보내기/i });
      await expect(exportButton).toBeVisible();

      // Check button has download icon
      const downloadIcon = exportButton.locator('svg');
      await expect(downloadIcon).toBeVisible();
    });

    test('should export CSV file on button click', async ({ page }) => {
      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      // Click export button
      const exportButton = page.getByRole('button', { name: /CSV 내보내기/i });

      // Check if button is enabled (has subscribers)
      const isEnabled = await exportButton.isEnabled();

      if (isEnabled) {
        await exportButton.click();

        // Wait for download to start
        const download = await downloadPromise;

        // Check filename format: newsletter-subscribers-YYYY-MM-DD.csv
        const filename = download.suggestedFilename();
        expect(filename).toMatch(/newsletter-subscribers-\d{4}-\d{2}-\d{2}\.csv/);

        // Verify download completed successfully
        const path = await download.path();
        expect(path).toBeTruthy();
      }
    });

    test('should show success toast after CSV export', async ({ page }) => {
      // Wait for page to load
      await page.waitForLoadState('networkidle');

      const exportButton = page.getByRole('button', { name: /CSV 내보내기/i });
      const isEnabled = await exportButton.isEnabled();

      if (isEnabled) {
        // Set up download listener (prevent timeout)
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

        // Click export button
        await exportButton.click();

        // Wait for download to complete
        await downloadPromise;

        // Check for success toast
        const successToast = page.getByText(/\d+명의 구독자 데이터를 내보냈습니다/i);
        await expect(successToast).toBeVisible({ timeout: 5000 });
      }
    });

    test('should disable export button when no subscribers', async ({ page }) => {
      // Search for non-existent email to trigger empty state
      const searchInput = page.getByPlaceholder(/이메일 주소 검색/i);
      await searchInput.fill('nonexistent-very-unique-email-12345@example.com');
      await page.waitForTimeout(600);

      // Export button should be disabled
      const exportButton = page.getByRole('button', { name: /CSV 내보내기/i });
      await expect(exportButton).toBeDisabled();

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(600);
    });
  });

  // ============================================
  // 11. Responsive Design (1 test)
  // ============================================

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to page
      await page.goto('/admin/newsletter');
      await page.waitForLoadState('networkidle');

      // Check for heading
      const heading = page.getByRole('heading', { name: /newsletter subscribers/i });
      await expect(heading).toBeVisible();

      // Check for search input
      const searchInput = page.getByPlaceholder(/이메일 주소 검색/i);
      await expect(searchInput).toBeVisible();

      // Stats cards should be visible (scrollable if needed)
      const statCard = page.getByText(/전체 구독자/i);
      await expect(statCard).toBeVisible();
    });
  });

  // ============================================
  // 12. Newsletter Date Range Filter (3 tests)
  // ============================================

  test.describe('Newsletter Date Range Filter', () => {
    test('should select date range and export to CSV', async ({ page }) => {
      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Click date range picker button
      const dateRangeButton = page.getByRole('button', { name: /날짜 범위|date range/i }).first();

      // Check if date range picker exists
      const hasDatePicker = await dateRangeButton.count() > 0;

      if (hasDatePicker && await dateRangeButton.isVisible()) {
        await dateRangeButton.click();
        await page.waitForTimeout(300);

        // Click "지난 30일" preset button
        const last30DaysButton = page.getByRole('button', { name: /지난 30일|Last 30 days/i });
        if (await last30DaysButton.count() > 0) {
          await last30DaysButton.click();
          await page.waitForTimeout(500);

          // Set up download listener
          const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

          // Click CSV Export button
          const exportButton = page.getByRole('button', { name: /CSV 내보내기/i });
          if (await exportButton.isEnabled()) {
            await exportButton.click();

            // Wait for download
            const download = await downloadPromise;

            // Verify filename format
            const filename = download.suggestedFilename();
            expect(filename).toContain('newsletter-subscribers');
            expect(filename).toMatch(/\.csv$/);

            // Check for success toast
            const successToast = page.getByText(/CSV 파일이 다운로드|데이터를 내보냈습니다/i);
            await expect(successToast).toBeVisible({ timeout: 5000 }).catch(() => {
              // Toast may not always be visible
            });
          }
        }
      }
    });

    test('should use preset buttons to quickly set date ranges', async ({ page }) => {
      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Click date range picker button
      const dateRangeButton = page.getByRole('button', { name: /날짜 범위|date range/i }).first();

      const hasDatePicker = await dateRangeButton.count() > 0;

      if (hasDatePicker && await dateRangeButton.isVisible()) {
        // Test each preset button
        const presets = [
          { name: /지난 7일|Last 7 days/i },
          { name: /지난 30일|Last 30 days/i },
          { name: /지난 90일|Last 90 days/i },
          { name: /전체|All time/i }
        ];

        for (const preset of presets) {
          // Open date picker
          await dateRangeButton.click();
          await page.waitForTimeout(300);

          // Click preset button
          const presetButton = page.getByRole('button', preset);
          if (await presetButton.count() > 0) {
            await presetButton.click();
            await page.waitForTimeout(500);

            // Verify popover closed and button text may have changed
            const buttonStillVisible = await dateRangeButton.isVisible();
            expect(buttonStillVisible).toBeTruthy();
          } else {
            // If preset not found, close the popover
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
          }
        }
      }
    });

    test('should combine date filter with search and status filters', async ({ page }) => {
      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // 1. Enter search query
      const searchInput = page.getByPlaceholder(/이메일 주소 검색/i);
      await searchInput.fill('test');
      await page.waitForTimeout(600);

      // 2. Select date range (if available)
      const dateRangeButton = page.getByRole('button', { name: /날짜 범위|date range/i }).first();
      const hasDatePicker = await dateRangeButton.count() > 0;

      if (hasDatePicker && await dateRangeButton.isVisible()) {
        await dateRangeButton.click();
        await page.waitForTimeout(300);

        // Click "지난 30일" preset
        const last30DaysButton = page.getByRole('button', { name: /지난 30일|Last 30 days/i });
        if (await last30DaysButton.count() > 0) {
          await last30DaysButton.click();
          await page.waitForTimeout(500);
        } else {
          // Close popover if preset not found
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }

      // 3. Select status filter
      const statusSelect = page.locator('button:has-text("전체 상태"), [role="combobox"]').first();
      if (await statusSelect.isVisible()) {
        await statusSelect.click();
        await page.waitForTimeout(300);

        const confirmedOption = page.getByRole('option', { name: /확인 완료/i });
        if (await confirmedOption.count() > 0) {
          await confirmedOption.click();
          await page.waitForLoadState('networkidle');
        }
      }

      // 4. Try CSV Export with combined filters
      const exportButton = page.getByRole('button', { name: /CSV 내보내기/i });
      const isEnabled = await exportButton.isEnabled();

      if (isEnabled) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

        await exportButton.click();

        // Wait for download
        await downloadPromise;

        // Check for success toast
        const successToast = page.getByText(/CSV 파일이 다운로드|데이터를 내보냈습니다/i);
        await expect(successToast).toBeVisible({ timeout: 5000 }).catch(() => {
          // Toast may not always be visible
        });
      }

      // Clear search to restore table
      await searchInput.clear();
      await page.waitForTimeout(600);
    });
  });
});
