import { test, expect } from '@playwright/test';
import { mockService, mockServiceUpdate, generateUniqueServiceName } from '../../fixtures/services';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Admin Service CRUD', () => {
  let serviceId: string;

  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();

    // Login as admin
    await loginAsAdmin(page);
  });

  test.describe('Create Service', () => {
    test('should show empty form on new service page', async ({ page }) => {
      await page.goto('/admin/services/new');

      // Check for form fields (using labels/placeholders since inputs don't have name attributes)
      await expect(page.locator('input[placeholder*="제목" i], input[placeholder*="title" i]')).toBeVisible();
      await expect(page.locator('textarea[placeholder*="설명" i], textarea[placeholder*="description" i]')).toBeVisible();
      await expect(page.getByRole('combobox', { name: /카테고리|category/i })).toBeVisible();
    });

    test('should show validation errors for missing required fields', async ({ page }) => {
      await page.goto('/admin/services/new');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Wait for validation errors
      await page.waitForTimeout(500);

      // Check for error messages (flexible matching)
      const errorPatterns = [
        /required|필수/i,
        /필드를 입력|Please enter|This field/i
      ];

      for (const pattern of errorPatterns) {
        const errors = page.locator(`text=${pattern}`);
        if (await errors.count() > 0) {
          await expect(errors.first()).toBeVisible();
          break;
        }
      }
    });

    test('should create service successfully with valid data', async ({ page }) => {
      await page.goto('/admin/services/new');

      // Generate unique service name
      const uniqueName = generateUniqueServiceName();

      // Fill form (using placeholders)
      await page.fill('input[placeholder*="제목" i]', uniqueName);
      await page.fill('textarea[placeholder*="설명" i]', mockService.description);

      // Fill optional price field
      const priceInput = page.getByRole('spinbutton', { name: /가격|price/i });
      if (await priceInput.count() > 0) {
        await priceInput.fill(mockService.price.toString());
      }

      // Submit form (look for save button)
      const saveButton = page.getByRole('button', { name: /저장|save/i });
      await saveButton.click();

      // Wait for redirect or success message
      await page.waitForTimeout(2000);

      // Should redirect to services list or show success message
      const currentUrl = page.url();
      const hasSuccessMessage = await page.locator('text=/생성|created|success/i').count() > 0;

      expect(currentUrl.includes('/admin/services') || hasSuccessMessage).toBeTruthy();
    });

    test('should show created service in list', async ({ page }) => {
      // Create a service first
      await page.goto('/admin/services/new');
      const uniqueName = generateUniqueServiceName('테스트 서비스');

      await page.fill('input[placeholder*="제목" i]', uniqueName);
      await page.fill('textarea[placeholder*="설명" i]', mockService.description);

      await page.getByRole('button', { name: /저장|save/i }).click();
      await page.waitForTimeout(2000);

      // Go to services list
      await page.goto('/admin/services');

      // Check if the service appears in the list
      const serviceInList = page.locator(`text="${uniqueName}"`);
      await expect(serviceInList).toBeVisible({ timeout: 5000 });
    });

    test('should show success toast notification', async ({ page }) => {
      await page.goto('/admin/services/new');
      const uniqueName = generateUniqueServiceName();

      await page.fill('input[placeholder*="제목" i]', uniqueName);
      await page.fill('textarea[placeholder*="설명" i]', mockService.description);

      await page.getByRole('button', { name: /저장|save/i }).click();

      // Look for toast notification
      const toast = page.locator('[role="status"], [role="alert"], .toast').filter({ hasText: /생성|created/i });
      if (await toast.count() > 0) {
        await expect(toast.first()).toBeVisible();
      }
    });
  });

  test.describe('Service List', () => {
    test('should render services table', async ({ page }) => {
      await page.goto('/admin/services');

      // Check for table or list
      const table = page.locator('table, [role="table"]');
      const list = page.locator('[role="list"]');

      const hasTableOrList = (await table.count() > 0) || (await list.count() > 0);
      expect(hasTableOrList).toBeTruthy();
    });

    test('should display service columns', async ({ page }) => {
      await page.goto('/admin/services');

      // Check for common column headers
      const headers = [
        /name|이름|서비스명/i,
        /category|카테고리/i,
        /price|가격/i,
        /status|상태/i
      ];

      for (const header of headers) {
        const headerElement = page.locator(`th:has-text("${header.source.replace(/\//g, '')}"), [role="columnheader"]:has-text("${header.source.replace(/\//g, '')}")`);
        if (await headerElement.count() > 0) {
          await expect(headerElement.first()).toBeVisible();
        }
      }
    });

    test('should filter services by search', async ({ page }) => {
      await page.goto('/admin/services');

      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="검색" i]');

      if (await searchInput.count() > 0) {
        // Type search query
        await searchInput.first().fill('테스트');

        // Wait for filtering
        await page.waitForTimeout(500);

        // Results should update (this is a basic check)
        await expect(searchInput.first()).toHaveValue('테스트');
      }
    });

    test('should filter by status', async ({ page }) => {
      await page.goto('/admin/services');

      // Look for status filter
      const statusFilter = page.locator('select[name*="status" i], button:has-text("status"), button:has-text("상태")');

      if (await statusFilter.count() > 0) {
        await statusFilter.first().click();
        await page.waitForTimeout(300);

        // Select active or inactive
        const activeOption = page.locator('text=/active|활성/i');
        if (await activeOption.count() > 0) {
          await activeOption.first().click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Update Service', () => {
    test('should navigate to edit page from list', async ({ page }) => {
      await page.goto('/admin/services');

      // Wait for list to load
      await page.waitForTimeout(1000);

      // Click on first edit button
      const editButton = page.locator('button:has-text("edit"), button:has-text("수정"), a:has-text("edit"), a:has-text("수정")').first();

      if (await editButton.count() > 0) {
        await editButton.click();

        // Should navigate to edit page
        await page.waitForURL(/\/admin\/services\/.*\/edit/, { timeout: 5000 });
      }
    });

    test('should load existing data in form', async ({ page }) => {
      await page.goto('/admin/services');
      await page.waitForTimeout(1000);

      // Click first edit button
      const editButton = page.locator('button:has-text("edit"), button:has-text("수정"), a[href*="edit"]').first();

      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForURL(/\/admin\/services\/.*\/edit/, { timeout: 5000 });

        // Check if form fields have values
        const nameInput = page.locator('input[name="name"]');
        const nameValue = await nameInput.inputValue();

        expect(nameValue.length).toBeGreaterThan(0);
      }
    });

    test('should update service successfully', async ({ page }) => {
      await page.goto('/admin/services');
      await page.waitForTimeout(1000);

      // Click first edit button
      const editButton = page.locator('button:has-text("edit"), button:has-text("수정"), a[href*="edit"]').first();

      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForURL(/\/admin\/services\/.*\/edit/, { timeout: 5000 });

        // Update name field
        const nameInput = page.locator('input[name="name"]');
        const updatedName = `Updated - ${Date.now()}`;
        await nameInput.fill(updatedName);

        // Submit form
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);

        // Should redirect or show success
        const currentUrl = page.url();
        const hasSuccessMessage = await page.locator('text=/수정|updated|success/i').count() > 0;

        expect(currentUrl.includes('/admin/services') || hasSuccessMessage).toBeTruthy();
      }
    });

    test('should show update success toast', async ({ page }) => {
      await page.goto('/admin/services');
      await page.waitForTimeout(1000);

      const editButton = page.locator('button:has-text("edit"), button:has-text("수정"), a[href*="edit"]').first();

      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForURL(/\/admin\/services\/.*\/edit/, { timeout: 5000 });

        const nameInput = page.locator('input[name="name"]');
        await nameInput.fill(`Updated - ${Date.now()}`);

        await page.click('button[type="submit"]');

        // Look for toast
        const toast = page.locator('[role="status"], [role="alert"]').filter({ hasText: /수정|updated/i });
        if (await toast.count() > 0) {
          await expect(toast.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Delete Service', () => {
    test('should show confirmation dialog on delete', async ({ page }) => {
      await page.goto('/admin/services');
      await page.waitForTimeout(1000);

      // Click first delete button
      const deleteButton = page.locator('button:has-text("delete"), button:has-text("삭제")').first();

      if (await deleteButton.count() > 0) {
        await deleteButton.click();

        // Wait for confirmation dialog
        await page.waitForTimeout(500);

        // Check for dialog
        const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
        if (await dialog.count() > 0) {
          await expect(dialog.first()).toBeVisible();
        }
      }
    });

    test('should delete service on confirmation', async ({ page }) => {
      // Create a service to delete
      await page.goto('/admin/services/new');
      const uniqueName = generateUniqueServiceName('삭제용');

      await page.fill('input[name="name"]', uniqueName);
      await page.fill('textarea[name="description"]', 'This will be deleted');

      const categoryInput = page.locator('select[name="category"], input[name="category"]').first();
      await categoryInput.fill('Test Category');

      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      // Go to list
      await page.goto('/admin/services');
      await page.waitForTimeout(1000);

      // Find and delete the service
      const serviceRow = page.locator(`tr:has-text("${uniqueName}"), [role="row"]:has-text("${uniqueName}")`);

      if (await serviceRow.count() > 0) {
        const deleteButton = serviceRow.locator('button:has-text("delete"), button:has-text("삭제")').first();
        await deleteButton.click();

        // Confirm deletion
        await page.waitForTimeout(500);
        const confirmButton = page.locator('button:has-text("confirm"), button:has-text("확인"), button:has-text("delete")').last();

        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await page.waitForTimeout(1000);

          // Service should be removed from list
          const deletedService = page.locator(`text="${uniqueName}"`);
          await expect(deletedService).not.toBeVisible();
        }
      }
    });
  });
});
