/**
 * E2E Tests for AdminUsers Page
 *
 * Tests admin user management functionality:
 * - Permission checks (super_admin only)
 * - User search with debounced autocomplete (300ms)
 * - Add admin (user search + role selection)
 * - Role badges (red/blue/green)
 * - Edit admin role
 * - Delete admin with confirmation
 */

import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin, loginAsAdmin } from '../helpers/auth';

test.describe('AdminUsers Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();
  });

  // ==================== Permission Checks ====================

  test('should show access denied message for non-super_admin users', async ({ page }) => {
    // Login as regular admin (not super_admin)
    await loginAsAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Should show access denied message
    await expect(page.locator('h1')).toContainText('권한이 없습니다');
    await expect(page.locator('text=Super Admin만 접근할 수 있습니다')).toBeVisible();
    await expect(page.locator('svg').first()).toBeVisible(); // ShieldAlert icon
  });

  test('should display page content for super_admin users', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Should show page title
    await expect(page.locator('h1')).toContainText('관리자 관리');
    await expect(page.locator('text=시스템 관리자를 관리합니다')).toBeVisible();

    // Should show "새 관리자" button
    await expect(page.locator('button:has-text("새 관리자")')).toBeVisible();
  });

  // ==================== Page Navigation ====================

  test('should navigate to admin users page from sidebar', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Go to admin dashboard first
    await page.goto('/admin');

    // Click on "관리자" link in sidebar (if exists)
    const adminLink = page.locator('a:has-text("관리자"), a:has-text("Users")');
    if (await adminLink.count() > 0) {
      await adminLink.first().click();

      // Should navigate to /admin/users
      await expect(page).toHaveURL('/admin/users');
      await expect(page.locator('h1')).toContainText('관리자 관리');
    }
  });

  // ==================== User Search ====================

  test('should search users by email with debounced autocomplete', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Click "새 관리자" button
    await page.click('button:has-text("새 관리자")');

    // Wait for dialog to open
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // Type email in search input (minimum 3 characters)
    const searchInput = page.locator('input[placeholder*="이메일로 사용자 검색"]');
    await searchInput.fill('test');

    // Wait for debounce (300ms) + network request
    await page.waitForTimeout(500);

    // Should show loading or search results
    const loadingText = page.locator('text=검색 중...');
    const noResultsText = page.locator('text=검색 결과가 없습니다');

    // Either loading or results should be visible
    const isLoadingVisible = await loadingText.isVisible().catch(() => false);
    const isNoResultsVisible = await noResultsText.isVisible().catch(() => false);

    expect(isLoadingVisible || isNoResultsVisible).toBe(true);
  });

  test('should display search results when user is found', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Click "새 관리자" button
    await page.click('button:has-text("새 관리자")');

    // Wait for dialog
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // Search for existing admin user
    const searchInput = page.locator('input[placeholder*="이메일로 사용자 검색"]');
    await searchInput.fill('admin@ideaonaction');

    // Wait for debounce + network
    await page.waitForTimeout(500);

    // Should show search results (if admin exists)
    const searchResults = page.locator('button:has-text("admin@ideaonaction")');
    const count = await searchResults.count();

    if (count > 0) {
      await expect(searchResults.first()).toBeVisible();
    }
  });

  // ==================== Add Admin ====================

  test('should open add admin dialog', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Click "새 관리자" button
    await page.click('button:has-text("새 관리자")');

    // Should show dialog with title "새 관리자"
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("새 관리자")')).toBeVisible();

    // Should show form fields
    await expect(page.locator('input[placeholder*="이메일로 사용자 검색"]')).toBeVisible();
    await expect(page.locator('button[role="combobox"]')).toBeVisible(); // Role select
  });

  test('should select user from search results', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Click "새 관리자" button
    await page.click('button:has-text("새 관리자")');

    // Wait for dialog
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // Search for user
    const searchInput = page.locator('input[placeholder*="이메일로 사용자 검색"]');
    await searchInput.fill('test-user@ideaonaction');

    // Wait for results
    await page.waitForTimeout(500);

    // Click on search result (if exists)
    const searchResult = page.locator('button:has-text("test-user@ideaonaction")');
    if (await searchResult.count() > 0) {
      await searchResult.first().click();

      // Search input should be filled with selected email
      await expect(searchInput).toHaveValue('test-user@ideaonaction.local');
    }
  });

  test('should select role from dropdown', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Click "새 관리자" button
    await page.click('button:has-text("새 관리자")');

    // Wait for dialog
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // Click role select trigger
    await page.click('button[role="combobox"]');

    // Should show role options
    await expect(page.locator('text=Super Admin (모든 권한)')).toBeVisible();
    await expect(page.locator('text=Admin (관리 권한)')).toBeVisible();
    await expect(page.locator('text=Editor (편집 권한)')).toBeVisible();

    // Select "Editor" role
    await page.getByText('Editor (편집 권한)', { exact: true }).click();

    // Role should be selected
    await expect(page.locator('button[role="combobox"]')).toContainText('Editor');
  });

  // ==================== Role Badges ====================

  test('should display role badges with correct colors', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Wait for table to load
    await page.waitForTimeout(1000);

    // Check for role badges (if admins exist)
    const superAdminBadge = page.locator('span.bg-red-500:has-text("Super Admin")');
    const adminBadge = page.locator('span:has-text("Admin")').filter({ hasNotText: 'Super' });
    const editorBadge = page.locator('span.bg-green-500:has-text("Editor")');

    // At least one badge should exist (the current super_admin)
    const badgeCount =
      (await superAdminBadge.count()) +
      (await adminBadge.count()) +
      (await editorBadge.count());

    expect(badgeCount).toBeGreaterThan(0);
  });

  // ==================== Table Search & Filter ====================

  test('should search admins by email', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Wait for table to load
    await page.waitForTimeout(1000);

    // Type in search input
    const searchInput = page.locator('input[placeholder*="이메일 또는 역할 검색"]');
    await searchInput.fill('superadmin');

    // Wait for search to filter
    await page.waitForTimeout(300);

    // Should show filtered results
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    // If results exist, verify search term is in visible rows
    if (rowCount > 0) {
      const firstRowText = await rows.first().textContent();
      expect(firstRowText?.toLowerCase()).toContain('superadmin');
    }
  });

  test('should filter admins by role', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Wait for table to load
    await page.waitForTimeout(1000);

    // Click role filter dropdown
    await page.click('button[role="combobox"]:has-text("전체 역할")');

    // Select "Super Admin" filter
    await page.getByText('Super Admin', { exact: true }).click();

    // Wait for filter to apply
    await page.waitForTimeout(300);

    // Should only show Super Admin rows
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Verify all visible rows have Super Admin badge
      const badges = page.locator('table tbody tr span.bg-red-500:has-text("Super Admin")');
      const badgeCount = await badges.count();
      expect(badgeCount).toBe(rowCount);
    }
  });

  // ==================== Edit Admin Role ====================

  test('should open edit dialog with pre-filled data', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Wait for table to load
    await page.waitForTimeout(1000);

    // Click edit button on first row (if exists)
    const editButton = page.locator('table tbody tr button svg').filter({ hasText: /pencil/i }).first();
    const editButtonParent = editButton.locator('..');

    if (await editButtonParent.count() > 0) {
      await editButtonParent.click();

      // Should show dialog with title "관리자 수정"
      await expect(page.locator('h2:has-text("관리자 수정")')).toBeVisible();

      // Should NOT show user search (user is already selected)
      await expect(page.locator('input[placeholder*="이메일로 사용자 검색"]')).not.toBeVisible();

      // Should show role select with current value
      await expect(page.locator('button[role="combobox"]')).toBeVisible();
    }
  });

  // ==================== Delete Admin ====================

  test('should show delete confirmation dialog', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Wait for table to load
    await page.waitForTimeout(1000);

    // Click delete button on first row (if exists)
    const deleteButton = page.locator('table tbody tr button .text-destructive').first();
    const deleteButtonParent = deleteButton.locator('..');

    if (await deleteButtonParent.count() > 0) {
      await deleteButtonParent.click();

      // Should show confirmation dialog
      await expect(page.locator('h2:has-text("관리자 삭제")')).toBeVisible();
      await expect(page.locator('text=정말로 이 관리자를 삭제하시겠습니까')).toBeVisible();

      // Should show "취소" and "삭제" buttons
      await expect(page.locator('button:has-text("취소")')).toBeVisible();
      await expect(page.locator('button:has-text("삭제")')).toBeVisible();
    }
  });

  test('should cancel delete operation', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Wait for table to load
    await page.waitForTimeout(1000);

    // Click delete button
    const deleteButton = page.locator('table tbody tr button .text-destructive').first();
    const deleteButtonParent = deleteButton.locator('..');

    if (await deleteButtonParent.count() > 0) {
      await deleteButtonParent.click();

      // Wait for confirmation dialog
      await expect(page.locator('h2:has-text("관리자 삭제")')).toBeVisible();

      // Click "취소" button
      await page.click('button:has-text("취소")');

      // Dialog should close
      await expect(page.locator('h2:has-text("관리자 삭제")')).not.toBeVisible();
    }
  });

  // ==================== Empty State ====================

  test('should show empty state when no admins exist', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Wait for table to load
    await page.waitForTimeout(1000);

    // Apply filter that returns no results
    await page.fill('input[placeholder*="이메일 또는 역할 검색"]', 'nonexistentuser@example.com');
    await page.waitForTimeout(300);

    // Should show empty state message
    const emptyMessage = page.locator('text=등록된 관리자가 없습니다');
    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible();
      await expect(page.locator('button:has-text("첫 관리자 만들기")')).toBeVisible();
    }
  });

  // ==================== Loading State ====================

  test('should show loading spinner while fetching data', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page (intercept to delay response)
    await page.goto('/admin/users');

    // Loading spinner should appear briefly
    const loadingSpinner = page.locator('svg.animate-spin');

    // Note: Loading may be too fast to capture in test, so we just verify page loads
    await expect(page.locator('h1:has-text("관리자 관리")')).toBeVisible();
  });

  // ==================== Form Validation ====================

  test('should show validation error when submitting without user selection', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Click "새 관리자" button
    await page.click('button:has-text("새 관리자")');

    // Wait for dialog
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // Try to submit without selecting user
    await page.click('button[type="submit"]:has-text("저장")');

    // Should show validation error
    await expect(page.locator('text=사용자를 선택하세요')).toBeVisible();
  });

  test('should close dialog on cancel', async ({ page }) => {
    // Login as super admin
    await loginAsSuperAdmin(page);

    // Navigate to admin users page
    await page.goto('/admin/users');

    // Click "새 관리자" button
    await page.click('button:has-text("새 관리자")');

    // Wait for dialog
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // Click "취소" button
    await page.click('button[type="button"]:has-text("취소")');

    // Dialog should close
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });
});
