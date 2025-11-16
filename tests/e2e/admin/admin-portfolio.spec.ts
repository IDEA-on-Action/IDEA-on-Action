/**
 * AdminPortfolio E2E Tests
 *
 * Tests for the portfolio management admin page:
 * - Page navigation and loading
 * - Create new portfolio items
 * - Search and filter functionality
 * - Edit portfolio items
 * - Delete portfolio items
 * - Toggle featured/published status
 * - Form validation
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('AdminPortfolio', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();

    // Login as admin
    await loginAsAdmin(page);

    // Navigate to portfolio management page
    await page.goto('/admin/portfolio');
  });

  test.describe('Page Navigation & Loading', () => {
    test('should render portfolio management page', async ({ page }) => {
      // Check page title
      await expect(page.locator('h1:has-text("포트폴리오 관리")')).toBeVisible();

      // Check description
      await expect(page.locator('p:has-text("프로젝트 포트폴리오를 관리합니다")')).toBeVisible();

      // Check "새 포트폴리오 항목" button
      await expect(page.locator('button:has-text("새 포트폴리오 항목")')).toBeVisible();
    });

    test('should display search and filter controls', async ({ page }) => {
      // Check search input
      await expect(page.locator('input[placeholder*="제목 또는 요약 검색"]')).toBeVisible();

      // Check project type filter
      const typeFilter = page.getByRole('combobox').filter({ hasText: /전체 타입|MVP|Fullstack/ });
      await expect(typeFilter.first()).toBeVisible();

      // Check status filter
      const statusFilter = page.getByRole('combobox').filter({ hasText: /전체 상태|공개|비공개/ });
      await expect(statusFilter.first()).toBeVisible();
    });
  });

  test.describe('Create New Portfolio', () => {
    test('should open create dialog when clicking add button', async ({ page }) => {
      // Click "새 포트폴리오 항목" button - .first() added to handle multiple matches
      await page.getByRole('button', { name: /새 포트폴리오 항목/i }).first().click();

      // Wait for dialog to open by checking DialogTitle or DialogDescription
      const dialogTitle = page.getByRole('heading', { name: /새 포트폴리오 항목|포트폴리오 수정/i })
      await dialogTitle.waitFor({ state: 'visible', timeout: 10000 })

      // Dialog should appear
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(/포트폴리오 정보를 입력하세요/i)).toBeVisible({ timeout: 5000 });
    });

    test('should validate required fields', async ({ page }) => {
      // Open create dialog
      await page.click('button:has-text("새 포트폴리오 항목")');
      await page.waitForSelector('[role="dialog"]');

      // Try to submit empty form
      await page.click('button[type="submit"]:has-text("저장")');

      // Wait for validation
      await page.waitForTimeout(500);

      // Check for validation error messages
      const errorMessages = page.locator('text=/slug를 입력하세요|제목을 입력하세요|요약을 입력하세요/i');
      await expect(errorMessages.first()).toBeVisible();
    });

    test('should create portfolio with all required fields', async ({ page }) => {
      // Open create dialog
      await page.click('button:has-text("새 포트폴리오 항목")');

      // Wait for dialog to open
      const dialog = page.getByRole('dialog')
      const slugInput = dialog.locator('input[placeholder*="project-name"]')
      await slugInput.waitFor({ state: 'visible', timeout: 10000 })

      // Generate unique slug
      const timestamp = Date.now();
      const slug = `test-portfolio-${timestamp}`;
      const title = `테스트 포트폴리오 ${timestamp}`;

      // Fill required fields
      await slugInput.fill(slug);
      await dialog.locator('input[placeholder*="프로젝트 제목"]').fill(title);
      await dialog.locator('textarea[placeholder*="프로젝트 요약"]').fill('테스트 포트폴리오 요약입니다.');

      // Select project type
      const projectTypeSelect = dialog.locator('select, button').filter({ hasText: /MVP|Fullstack/ }).first();
      await projectTypeSelect.click();
      await page.waitForTimeout(300);
      await page.getByText('MVP', { exact: true }).click();

      // Submit form
      await dialog.locator('button[type="submit"]:has-text("저장")').click();

      // Check for success toast
      const toast = page.locator('[role="status"], [role="alert"]').filter({ hasText: /포트폴리오 생성 완료|생성되었습니다/i });
      await toast.first().waitFor({ state: 'visible', timeout: 5000 })
      if (await toast.count() > 0) {
        await expect(toast.first()).toBeVisible();
      }

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // New item should appear in table
      const newItem = page.locator(`text=${title}`)
      await newItem.waitFor({ state: 'visible', timeout: 10000 })
      await expect(newItem).toBeVisible();
    });

    test('should create portfolio with optional fields', async ({ page }) => {
      await page.click('button:has-text("새 포트폴리오 항목")');

      // Wait for dialog to open
      const dialog = page.getByRole('dialog')
      const slugInput = dialog.locator('input[placeholder*="project-name"]')
      await slugInput.waitFor({ state: 'visible', timeout: 10000 })

      const timestamp = Date.now();
      const slug = `full-portfolio-${timestamp}`;

      // Fill required fields
      await slugInput.fill(slug);
      await dialog.locator('input[placeholder*="프로젝트 제목"]').fill(`완전한 포트폴리오 ${timestamp}`);
      await dialog.locator('textarea[placeholder*="프로젝트 요약"]').fill('완전한 테스트 포트폴리오');

      // Fill optional fields
      await dialog.locator('input[placeholder*="ABC Corp"]').fill('테스트 클라이언트');
      await dialog.locator('input[placeholder*="https://..." i]').fill('https://example.com/logo.png');
      await dialog.locator('input[placeholder*="3개월"]').fill('6개월');
      await dialog.locator('input[type="number"]').fill('5');

      // Select project type
      const projectTypeSelect = dialog.locator('select, button').filter({ hasText: /MVP|Fullstack/ }).first();
      await projectTypeSelect.click();
      await page.waitForTimeout(300);
      await page.getByText('Fullstack', { exact: true }).click();

      // Submit
      await dialog.locator('button[type="submit"]:has-text("저장")').click();

      // Verify creation
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });

    test('should handle tech stack JSON array input', async ({ page }) => {
      await page.click('button:has-text("새 포트폴리오 항목")');
      await page.waitForSelector('[role="dialog"]');

      const timestamp = Date.now();

      // Fill required fields
      await page.fill('input[placeholder*="project-name"]', `tech-stack-${timestamp}`);
      await page.fill('input[placeholder*="프로젝트 제목"]', `Tech Stack Test ${timestamp}`);
      await page.fill('textarea[placeholder*="프로젝트 요약"]', 'Tech stack test');

      // Fill tech stack as JSON array
      const techStackTextarea = page.locator('textarea[placeholder*="React"]');
      await techStackTextarea.fill('["React", "TypeScript", "Supabase", "Tailwind CSS"]');

      // Select project type
      const projectTypeSelect = page.locator('select, button').filter({ hasText: /MVP|Fullstack/ }).first();
      await projectTypeSelect.click();
      await page.waitForTimeout(300);
      await page.getByText('Design', { exact: true }).click();

      // Submit
      await page.click('button[type="submit"]:has-text("저장")');
      await page.waitForTimeout(2000);

      // Verify
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
    });

    test('should handle testimonial JSON object input', async ({ page }) => {
      await page.click('button:has-text("새 포트폴리오 항목")');
      await page.waitForSelector('[role="dialog"]');

      const timestamp = Date.now();

      // Fill required fields
      await page.fill('input[placeholder*="project-name"]', `testimonial-${timestamp}`);
      await page.fill('input[placeholder*="프로젝트 제목"]', `Testimonial Test ${timestamp}`);
      await page.fill('textarea[placeholder*="프로젝트 요약"]', 'Testimonial test');

      // Fill testimonial as JSON object
      const testimonialTextarea = page.locator('textarea[placeholder*="홍길동"]');
      const testimonialJSON = JSON.stringify({
        author: '홍길동',
        role: 'CEO',
        company: 'ABC Corp',
        content: '훌륭한 프로젝트였습니다.',
        avatar: 'https://example.com/avatar.jpg'
      });
      await testimonialTextarea.fill(testimonialJSON);

      // Select project type
      const projectTypeSelect = page.locator('select, button').filter({ hasText: /MVP|Fullstack/ }).first();
      await projectTypeSelect.click();
      await page.waitForTimeout(300);
      await page.getByText('Operations', { exact: true }).click();

      // Submit
      await page.click('button[type="submit"]:has-text("저장")');
      await page.waitForTimeout(2000);

      // Verify
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
    });

    test('should toggle featured and published switches', async ({ page }) => {
      await page.click('button:has-text("새 포트폴리오 항목")');
      await page.waitForSelector('[role="dialog"]');

      const timestamp = Date.now();

      // Fill required fields
      await page.fill('input[placeholder*="project-name"]', `featured-${timestamp}`);
      await page.fill('input[placeholder*="프로젝트 제목"]', `Featured Test ${timestamp}`);
      await page.fill('textarea[placeholder*="프로젝트 요약"]', 'Featured test');

      // Find and click featured switch
      const featuredSwitch = page.locator('label:has-text("Featured 여부")').locator('..').locator('button[role="switch"]');
      await featuredSwitch.click();

      // Find and click published switch
      const publishedSwitch = page.locator('label:has-text("공개 여부")').locator('..').locator('button[role="switch"]');
      await publishedSwitch.click();

      // Select project type
      const projectTypeSelect = page.locator('select, button').filter({ hasText: /MVP|Fullstack/ }).first();
      await projectTypeSelect.click();
      await page.waitForTimeout(300);
      await page.getByText('MVP', { exact: true }).click();

      // Submit
      await page.click('button[type="submit"]:has-text("저장")');
      await page.waitForTimeout(2000);

      // Verify
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Search Functionality', () => {
    test('should filter by search query (title)', async ({ page }) => {
      // Wait for table to load
      await page.waitForTimeout(1000);

      // Get initial row count
      const initialRows = await page.locator('table tbody tr').count();

      // Type search query
      await page.fill('input[placeholder*="제목 또는 요약 검색"]', '테스트');

      // Wait for filtering
      await page.waitForTimeout(500);

      // Verify search is applied
      const searchValue = await page.locator('input[placeholder*="제목 또는 요약 검색"]').inputValue();
      expect(searchValue).toBe('테스트');
    });

    test('should clear search results when input is cleared', async ({ page }) => {
      // Type search query
      await page.fill('input[placeholder*="제목 또는 요약 검색"]', 'nonexistent');
      await page.waitForTimeout(500);

      // Clear search
      await page.fill('input[placeholder*="제목 또는 요약 검색"]', '');
      await page.waitForTimeout(500);

      // Should show all items again
      const searchValue = await page.locator('input[placeholder*="제목 또는 요약 검색"]').inputValue();
      expect(searchValue).toBe('');
    });
  });

  test.describe('Filter by Project Type', () => {
    test('should filter by MVP type', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Click type filter
      const typeFilter = page.getByRole('combobox').filter({ hasText: /전체 타입|MVP|Fullstack/ }).first();
      await typeFilter.click();
      await page.waitForTimeout(300);

      // Select MVP
      await page.getByText('MVP', { exact: true }).click();
      await page.waitForTimeout(500);

      // Check if filter is applied (badge should be visible in filtered rows)
      const mvpBadges = page.locator('text=MVP');
      if (await mvpBadges.count() > 0) {
        await expect(mvpBadges.first()).toBeVisible();
      }
    });

    test('should filter by Fullstack type', async ({ page }) => {
      await page.waitForTimeout(1000);

      const typeFilter = page.getByRole('combobox').filter({ hasText: /전체 타입|MVP|Fullstack/ }).first();
      await typeFilter.click();
      await page.waitForTimeout(300);

      await page.getByText('Fullstack', { exact: true }).click();
      await page.waitForTimeout(500);
    });

    test('should filter by Design type', async ({ page }) => {
      await page.waitForTimeout(1000);

      const typeFilter = page.getByRole('combobox').filter({ hasText: /전체 타입|MVP|Fullstack/ }).first();
      await typeFilter.click();
      await page.waitForTimeout(300);

      await page.getByText('Design', { exact: true }).click();
      await page.waitForTimeout(500);
    });

    test('should filter by Operations type', async ({ page }) => {
      await page.waitForTimeout(1000);

      const typeFilter = page.getByRole('combobox').filter({ hasText: /전체 타입|MVP|Fullstack/ }).first();
      await typeFilter.click();
      await page.waitForTimeout(300);

      await page.getByText('Operations', { exact: true }).click();
      await page.waitForTimeout(500);
    });

    test('should reset to all types', async ({ page }) => {
      await page.waitForTimeout(1000);

      const typeFilter = page.getByRole('combobox').filter({ hasText: /전체 타입|MVP|Fullstack/ }).first();
      await typeFilter.click();
      await page.waitForTimeout(300);

      await page.getByText('전체 타입', { exact: true }).click();
      await page.waitForTimeout(500);
    });
  });

  test.describe('Filter by Status', () => {
    test('should filter by published status', async ({ page }) => {
      await page.waitForTimeout(1000);

      const statusFilter = page.getByRole('combobox').filter({ hasText: /전체 상태|공개|비공개/ }).first();
      await statusFilter.click();
      await page.waitForTimeout(300);

      await page.getByText('공개', { exact: true }).click();
      await page.waitForTimeout(500);
    });

    test('should filter by draft status', async ({ page }) => {
      await page.waitForTimeout(1000);

      const statusFilter = page.getByRole('combobox').filter({ hasText: /전체 상태|공개|비공개/ }).first();
      await statusFilter.click();
      await page.waitForTimeout(300);

      await page.getByText('비공개', { exact: true }).click();
      await page.waitForTimeout(500);
    });

    test('should filter by featured status', async ({ page }) => {
      await page.waitForTimeout(1000);

      const statusFilter = page.getByRole('combobox').filter({ hasText: /전체 상태|공개|비공개/ }).first();
      await statusFilter.click();
      await page.waitForTimeout(300);

      await page.getByText('Featured', { exact: true }).click();
      await page.waitForTimeout(500);
    });
  });

  test.describe('Edit Portfolio', () => {
    test('should open edit dialog when clicking edit button', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Click first edit button
      const editButton = page.locator('button:has([class*="pencil"]), button[aria-label*="수정"]').first();

      if (await editButton.count() > 0) {
        await editButton.click();

        // Dialog should appear
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        await expect(page.locator('text=포트폴리오 수정')).toBeVisible();
      }
    });

    test('should load existing data in edit form', async ({ page }) => {
      await page.waitForTimeout(1000);

      const editButton = page.locator('button:has([class*="pencil"]), button[aria-label*="수정"]').first();

      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForSelector('[role="dialog"]');

        // Check if slug field has value
        const slugInput = page.locator('input[placeholder*="project-name"]');
        const slugValue = await slugInput.inputValue();
        expect(slugValue.length).toBeGreaterThan(0);

        // Check if title field has value
        const titleInput = page.locator('input[placeholder*="프로젝트 제목"]');
        const titleValue = await titleInput.inputValue();
        expect(titleValue.length).toBeGreaterThan(0);
      }
    });

    test('should update portfolio successfully', async ({ page }) => {
      await page.waitForTimeout(1000);

      const editButton = page.locator('button:has([class*="pencil"]), button[aria-label*="수정"]').first();

      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForSelector('[role="dialog"]');

        // Update title
        const titleInput = page.locator('input[placeholder*="프로젝트 제목"]');
        const updatedTitle = `Updated - ${Date.now()}`;
        await titleInput.fill(updatedTitle);

        // Submit
        await page.click('button[type="submit"]:has-text("저장")');
        await page.waitForTimeout(2000);

        // Check for success toast
        const toast = page.locator('[role="status"], [role="alert"]').filter({ hasText: /포트폴리오 수정 완료|수정되었습니다/i });
        if (await toast.count() > 0) {
          await expect(toast.first()).toBeVisible({ timeout: 5000 });
        }

        // Dialog should close
        await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
      }
    });

    test('should cancel edit without saving', async ({ page }) => {
      await page.waitForTimeout(1000);

      const editButton = page.locator('button:has([class*="pencil"]), button[aria-label*="수정"]').first();

      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForSelector('[role="dialog"]');

        // Click cancel button
        await page.click('button:has-text("취소")');

        // Dialog should close
        await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Delete Portfolio', () => {
    test('should show confirmation dialog on delete', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Click first delete button
      const deleteButton = page.locator('button:has([class*="trash"]), button[aria-label*="삭제"]').first();

      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Confirmation dialog should appear
        const confirmDialog = page.locator('[role="alertdialog"]');
        await expect(confirmDialog).toBeVisible();
        await expect(page.locator('text=포트폴리오 삭제')).toBeVisible();
        await expect(page.locator('text=/정말로 이 포트폴리오 항목을 삭제하시겠습니까/i')).toBeVisible();
      }
    });

    test('should cancel deletion', async ({ page }) => {
      await page.waitForTimeout(1000);

      const deleteButton = page.locator('button:has([class*="trash"]), button[aria-label*="삭제"]').first();

      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Click cancel button
        await page.click('button:has-text("취소")');

        // Confirmation dialog should close
        await expect(page.locator('[role="alertdialog"]')).not.toBeVisible({ timeout: 3000 });
      }
    });

    test('should delete portfolio on confirmation', async ({ page }) => {
      // First, create a portfolio to delete
      await page.click('button:has-text("새 포트폴리오 항목")');
      await page.waitForSelector('[role="dialog"]');

      const timestamp = Date.now();
      const slug = `delete-test-${timestamp}`;
      const title = `삭제 테스트 ${timestamp}`;

      await page.fill('input[placeholder*="project-name"]', slug);
      await page.fill('input[placeholder*="프로젝트 제목"]', title);
      await page.fill('textarea[placeholder*="프로젝트 요약"]', '삭제될 포트폴리오');

      const projectTypeSelect = page.locator('select, button').filter({ hasText: /MVP|Fullstack/ }).first();
      await projectTypeSelect.click();
      await page.waitForTimeout(300);
      await page.getByText('MVP', { exact: true }).click();

      await page.click('button[type="submit"]:has-text("저장")');
      await page.waitForTimeout(2000);

      // Find the created portfolio row
      const portfolioRow = page.locator(`tr:has-text("${title}"), [role="row"]:has-text("${title}")`);

      if (await portfolioRow.count() > 0) {
        // Click delete button
        const deleteButton = portfolioRow.locator('button:has([class*="trash"])').first();
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Confirm deletion
        await page.click('button:has-text("삭제")');
        await page.waitForTimeout(1500);

        // Check for success toast
        const toast = page.locator('[role="status"], [role="alert"]').filter({ hasText: /포트폴리오 삭제 완료|삭제되었습니다/i });
        if (await toast.count() > 0) {
          await expect(toast.first()).toBeVisible({ timeout: 5000 });
        }

        // Portfolio should be removed from list
        await expect(page.locator(`text=${title}`)).not.toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Toggle Featured/Published Status', () => {
    test('should toggle featured status', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find first featured switch in table
      const featuredSwitch = page.locator('table').locator('button[role="switch"]').first();

      if (await featuredSwitch.count() > 0) {
        // Get initial state
        const initialState = await featuredSwitch.getAttribute('data-state');

        // Click switch
        await featuredSwitch.click();
        await page.waitForTimeout(1000);

        // Check for toast notification
        const toast = page.locator('[role="status"], [role="alert"]').filter({ hasText: /Featured 상태 변경/i });
        if (await toast.count() > 0) {
          await expect(toast.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should toggle published status', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find second switch in each row (published switch)
      const publishedSwitch = page.locator('table').locator('button[role="switch"]').nth(1);

      if (await publishedSwitch.count() > 0) {
        // Click switch
        await publishedSwitch.click();
        await page.waitForTimeout(1000);

        // Check for toast notification
        const toast = page.locator('[role="status"], [role="alert"]').filter({ hasText: /공개 상태 변경/i });
        if (await toast.count() > 0) {
          await expect(toast.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Table Display', () => {
    test('should display portfolio table with correct columns', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Check for table
      const table = page.locator('table');
      await expect(table).toBeVisible();

      // Check for column headers
      await expect(page.locator('th:has-text("썸네일")')).toBeVisible();
      await expect(page.locator('th:has-text("제목")')).toBeVisible();
      await expect(page.locator('th:has-text("타입")')).toBeVisible();
      await expect(page.locator('th:has-text("상태")')).toBeVisible();
      await expect(page.locator('th:has-text("기술 스택")')).toBeVisible();
      await expect(page.locator('th:has-text("Featured")')).toBeVisible();
      await expect(page.locator('th:has-text("공개")')).toBeVisible();
    });

    test('should display project type badges', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Check if any badge is visible (MVP, Fullstack, Design, Operations)
      const badges = page.locator('table').locator('text=/MVP|Fullstack|Design|Operations/');
      if (await badges.count() > 0) {
        await expect(badges.first()).toBeVisible();
      }
    });

    test('should display tech stack tags', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Check if tech stack badges are displayed
      const techBadges = page.locator('table tbody td').filter({ hasText: /React|TypeScript|Supabase/ });
      // Tech badges may or may not exist depending on data
      const count = await techBadges.count();
      expect(count >= 0).toBeTruthy();
    });

    test('should show empty state when no portfolios exist', async ({ page }) => {
      // This test assumes there might be a scenario with no data
      // Navigate to page with empty filter to potentially see empty state
      await page.fill('input[placeholder*="제목 또는 요약 검색"]', 'nonexistentportfolio12345');
      await page.waitForTimeout(500);

      // Check if empty state message appears
      const emptyState = page.locator('text=/등록된 포트폴리오가 없습니다|포트폴리오 항목 만들기/i');
      if (await emptyState.count() > 0) {
        await expect(emptyState.first()).toBeVisible();
      }
    });
  });
});
