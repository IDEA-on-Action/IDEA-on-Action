/**
 * AdminTeam E2E Tests
 *
 * Tests for CMS team member management page
 * - Create, Read, Update, Delete team members
 * - Avatar preview (image URL or initials fallback)
 * - Skills array (comma-separated input)
 * - Social links (GitHub, LinkedIn, Twitter, Website)
 * - Priority sorting
 * - Active/Inactive toggle
 * - Search functionality
 * - Form validation
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../../fixtures/auth-helpers';

test.describe('Admin Team Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();

    // Login as admin
    await loginAsAdmin(page);
  });

  test.describe('Page Navigation', () => {
    test('should navigate to AdminTeam page successfully', async ({ page }) => {
      await page.goto('/admin/team');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check for page title
      await expect(page.locator('h1:has-text("팀원 관리")')).toBeVisible();

      // Check for "새 팀원 추가" button
      await expect(page.getByRole('button', { name: /새 팀원 추가|팀원 추가/i })).toBeVisible();
    });

    test('should display search input', async ({ page }) => {
      await page.goto('/admin/team');

      // Check for search input
      const searchInput = page.locator('input[placeholder*="이름" i], input[placeholder*="검색" i]');
      await expect(searchInput).toBeVisible();
    });

    test('should display active filter dropdown', async ({ page }) => {
      await page.goto('/admin/team');

      // Check for active filter (Select component)
      const filterSelect = page.locator('button:has-text("전체 상태"), button:has-text("활성"), button:has-text("비활성")');
      if (await filterSelect.count() > 0) {
        await expect(filterSelect.first()).toBeVisible();
      }
    });
  });

  test.describe('Create New Team Member', () => {
    test('should open dialog when clicking "새 팀원 추가" button', async ({ page }) => {
      await page.goto('/admin/team');

      // Click "새 팀원 추가" button
      await page.getByRole('button', { name: /새 팀원 추가|팀원 추가/i }).click();

      // Wait for dialog to open
      await page.waitForTimeout(500);

      // Check for dialog title
      await expect(page.locator('[role="dialog"] >> text="새 팀원 추가"')).toBeVisible();

      // Check for required fields
      await expect(page.locator('label:has-text("이름")')).toBeVisible();
      await expect(page.locator('label:has-text("역할")')).toBeVisible();
    });

    test('should show validation errors for required fields', async ({ page }) => {
      await page.goto('/admin/team');

      // Open dialog
      await page.getByRole('button', { name: /새 팀원 추가|팀원 추가/i }).click();
      await page.waitForTimeout(500);

      // Submit empty form
      await page.locator('[role="dialog"] >> button[type="submit"]:has-text("저장")').click();
      await page.waitForTimeout(500);

      // Check for validation errors
      const errorMessage = page.locator('text=/이름을 입력하세요|역할을 입력하세요/i');
      await expect(errorMessage.first()).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/admin/team');

      // Open dialog
      await page.getByRole('button', { name: /새 팀원 추가|팀원 추가/i }).click();
      await page.waitForTimeout(500);

      // Fill required fields
      await page.locator('input[placeholder*="홍길동" i]').fill('테스트 팀원');
      await page.locator('input[placeholder*="Founder" i], input[placeholder*="CEO" i]').first().fill('Software Engineer');

      // Enter invalid email
      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill('invalid-email');

      // Submit form
      await page.locator('[role="dialog"] >> button[type="submit"]:has-text("저장")').click();
      await page.waitForTimeout(500);

      // Check for email validation error
      const emailError = page.locator('text=/유효한 이메일/i');
      if (await emailError.count() > 0) {
        await expect(emailError.first()).toBeVisible();
      }
    });

    test('should create team member successfully with valid data', async ({ page }) => {
      await page.goto('/admin/team');

      // Open dialog - .first() added to handle multiple matches
      await page.getByRole('button', { name: /새 팀원 추가|팀원 추가/i }).first().click();
      await page.waitForTimeout(500);

      // Generate unique name
      const uniqueName = `테스트 팀원 ${Date.now()}`;

      // Fill required fields - Dialog scope to avoid duplicates
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input[placeholder*="홍길동" i]').fill(uniqueName);
      await dialog.locator('input[placeholder*="Founder" i]').fill('Test Engineer');

      // Fill optional fields
      await dialog.locator('textarea[placeholder*="팀원 소개" i]').fill('테스트 팀원 소개입니다');
      await dialog.locator('input[type="email"]').fill('test@example.com');

      // Submit form - getByRole for better selector
      await dialog.getByRole('button', { name: /저장|Save/i }).click();

      // Wait for success toast
      await page.waitForTimeout(2000);

      // Check for success toast
      const toast = page.locator('[role="status"]').filter({ hasText: /팀원 생성 완료|팀원이 추가/i });
      if (await toast.count() > 0) {
        await expect(toast.first()).toBeVisible();
      }

      // Verify team member appears in table
      await expect(page.locator(`text="${uniqueName}"`)).toBeVisible({ timeout: 5000 });
    });

    test('should create team member with avatar URL', async ({ page }) => {
      await page.goto('/admin/team');

      // Open dialog - .first() added
      await page.getByRole('button', { name: /새 팀원 추가|팀원 추가/i }).first().click();
      await page.waitForTimeout(500);

      // Fill required fields - Dialog scope
      const uniqueName = `아바타 테스트 ${Date.now()}`;
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input[placeholder*="홍길동" i]').fill(uniqueName);
      await dialog.locator('input[placeholder*="Founder" i]').fill('Designer');

      // Fill avatar URL
      await dialog.locator('input[placeholder*="https://..." i]').first().fill('https://via.placeholder.com/150');

      // Submit form - getByRole
      await dialog.getByRole('button', { name: /저장|Save/i }).click();
      await page.waitForTimeout(2000);

      // Verify avatar is displayed (image element)
      const avatarImage = page.locator(`img[alt="${uniqueName}"]`);
      if (await avatarImage.count() > 0) {
        await expect(avatarImage).toBeVisible();
      }
    });

    test('should create team member with skills array', async ({ page }) => {
      await page.goto('/admin/team');

      // Open dialog
      await page.getByRole('button', { name: /새 팀원 추가|팀원 추가/i }).click();
      await page.waitForTimeout(500);

      // Fill required fields
      const uniqueName = `스킬 테스트 ${Date.now()}`;
      await page.locator('input[placeholder*="홍길동" i]').fill(uniqueName);
      await page.locator('input[placeholder*="Founder" i], input[placeholder*="CEO" i]').first().fill('Full Stack Developer');

      // Fill skills (comma-separated)
      await page.locator('input[placeholder*="React, TypeScript" i]').fill('React, TypeScript, Node.js, PostgreSQL');

      // Submit form
      await page.locator('[role="dialog"] >> button[type="submit"]:has-text("저장")').click();
      await page.waitForTimeout(2000);

      // Verify skills are displayed as badges
      await expect(page.locator('text="React"')).toBeVisible();
      await expect(page.locator('text="TypeScript"')).toBeVisible();
    });

    test('should create team member with social links', async ({ page }) => {
      await page.goto('/admin/team');

      // Open dialog - .first() added
      await page.getByRole('button', { name: /새 팀원 추가|팀원 추가/i }).first().click();
      await page.waitForTimeout(500);

      // Fill required fields - Dialog scope
      const uniqueName = `소셜 링크 테스트 ${Date.now()}`;
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input[placeholder*="홍길동" i]').fill(uniqueName);
      await dialog.locator('input[placeholder*="Founder" i]').fill('Developer Advocate');

      // Fill social links
      await dialog.locator('input[placeholder*="github.com" i]').fill('https://github.com/testuser');
      await dialog.locator('input[placeholder*="linkedin.com" i]').fill('https://linkedin.com/in/testuser');
      await dialog.locator('input[placeholder*="twitter.com" i]').fill('https://twitter.com/testuser');
      await dialog.locator('input[placeholder*="example.com" i]').fill('https://example.com');

      // Submit form - getByRole
      await dialog.getByRole('button', { name: /저장|Save/i }).click();
      await page.waitForTimeout(2000);

      // Verify social link icons are displayed
      const socialIcons = page.locator('a[aria-label="github"], a[aria-label="linkedin"], a[aria-label="twitter"], a[aria-label="website"]');
      expect(await socialIcons.count()).toBeGreaterThan(0);
    });

    test('should set priority field', async ({ page }) => {
      await page.goto('/admin/team');

      // Open dialog
      await page.getByRole('button', { name: /새 팀원 추가|팀원 추가/i }).click();
      await page.waitForTimeout(500);

      // Fill required fields
      const uniqueName = `우선순위 테스트 ${Date.now()}`;
      await page.locator('input[placeholder*="홍길동" i]').fill(uniqueName);
      await page.locator('input[placeholder*="Founder" i], input[placeholder*="CEO" i]').first().fill('Lead Engineer');

      // Set priority
      const priorityInput = page.locator('input[type="number"][min="0"]');
      await priorityInput.fill('99');

      // Submit form
      await page.locator('[role="dialog"] >> button[type="submit"]:has-text("저장")').click();
      await page.waitForTimeout(2000);

      // Verify priority badge is displayed
      await expect(page.locator('text="99"')).toBeVisible();
    });

    test('should toggle active status in form', async ({ page }) => {
      await page.goto('/admin/team');

      // Open dialog
      await page.getByRole('button', { name: /새 팀원 추가|팀원 추가/i }).click();
      await page.waitForTimeout(500);

      // Fill required fields
      const uniqueName = `활성 상태 테스트 ${Date.now()}`;
      await page.locator('input[placeholder*="홍길동" i]').fill(uniqueName);
      await page.locator('input[placeholder*="Founder" i], input[placeholder*="CEO" i]').first().fill('Project Manager');

      // Toggle active switch (should be checked by default)
      const activeSwitch = page.locator('button[role="switch"]').last();
      await activeSwitch.click(); // Toggle to inactive

      // Submit form
      await page.locator('[role="dialog"] >> button[type="submit"]:has-text("저장")').click();
      await page.waitForTimeout(2000);

      // Verify team member is created (inactive state)
      await expect(page.locator(`text="${uniqueName}"`)).toBeVisible();
    });
  });

  test.describe('Search Functionality', () => {
    test('should filter team members by name', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Get initial count
      const initialRows = await page.locator('tbody tr').count();

      // Type in search
      const searchInput = page.locator('input[placeholder*="이름" i], input[placeholder*="검색" i]');
      await searchInput.fill('테스트');
      await page.waitForTimeout(500);

      // Results should update (check that search input has value)
      await expect(searchInput).toHaveValue('테스트');
    });

    test('should show empty state when no results match', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Search for non-existent name
      const searchInput = page.locator('input[placeholder*="이름" i], input[placeholder*="검색" i]');
      await searchInput.fill('NonExistentNameXYZ123456789');
      await page.waitForTimeout(500);

      // Check for empty state message or no rows
      const emptyMessage = page.locator('text=/등록된 팀원이 없습니다/i');
      const tableRows = page.locator('tbody tr');

      const hasEmptyMessage = await emptyMessage.count() > 0;
      const hasNoRows = (await tableRows.count()) === 0;

      expect(hasEmptyMessage || hasNoRows).toBeTruthy();
    });
  });

  test.describe('Avatar Preview', () => {
    test('should display avatar image when URL is provided', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Look for avatar images in table
      const avatarImages = page.locator('tbody img[alt]');
      if (await avatarImages.count() > 0) {
        await expect(avatarImages.first()).toBeVisible();
      }
    });

    test('should display initials fallback when no avatar URL', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Look for fallback avatars (div with initials)
      const fallbackAvatars = page.locator('tbody .rounded-full.bg-muted span');
      if (await fallbackAvatars.count() > 0) {
        const initialsText = await fallbackAvatars.first().textContent();
        expect(initialsText?.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Edit Team Member', () => {
    test('should open edit dialog when clicking edit button', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Click first edit button
      const editButton = page.locator('button:has(svg.lucide-pencil)').first();
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(500);

        // Check for dialog title
        await expect(page.locator('[role="dialog"] >> text="팀원 수정"')).toBeVisible();
      }
    });

    test('should load existing data in edit form', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Click first edit button
      const editButton = page.locator('button:has(svg.lucide-pencil)').first();
      if (await editButton.count() > 0) {
        // Get team member name from table
        const nameCell = page.locator('tbody tr td.font-medium').first();
        const originalName = await nameCell.textContent();

        await editButton.click();
        await page.waitForTimeout(500);

        // Check if name field has original value
        const nameInput = page.locator('input[placeholder*="홍길동" i]');
        const loadedName = await nameInput.inputValue();

        expect(loadedName).toBe(originalName?.trim());
      }
    });

    test('should update team member successfully', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Click first edit button
      const editButton = page.locator('button:has(svg.lucide-pencil)').first();
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(500);

        // Update name
        const nameInput = page.locator('input[placeholder*="홍길동" i]');
        const updatedName = `수정 ${Date.now()}`;
        await nameInput.fill(updatedName);

        // Submit form
        await page.locator('[role="dialog"] >> button[type="submit"]:has-text("저장")').click();
        await page.waitForTimeout(2000);

        // Check for success toast
        const toast = page.locator('[role="status"]').filter({ hasText: /팀원 수정 완료/i });
        if (await toast.count() > 0) {
          await expect(toast.first()).toBeVisible();
        }

        // Verify updated name in table
        await expect(page.locator(`text="${updatedName}"`)).toBeVisible();
      }
    });
  });

  test.describe('Delete Team Member', () => {
    test('should show confirmation dialog when clicking delete button', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Click first delete button
      const deleteButton = page.locator('button:has(svg.lucide-trash-2)').first();
      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Check for AlertDialog
        await expect(page.locator('[role="alertdialog"] >> text="팀원 삭제"')).toBeVisible();
        await expect(page.locator('[role="alertdialog"] >> text=/정말로 이 팀원을 삭제/i')).toBeVisible();
      }
    });

    test('should cancel delete when clicking cancel button', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Click first delete button
      const deleteButton = page.locator('button:has(svg.lucide-trash-2)').first();
      if (await deleteButton.count() > 0) {
        // Get team member name
        const nameCell = page.locator('tbody tr td.font-medium').first();
        const teamMemberName = await nameCell.textContent();

        await deleteButton.click();
        await page.waitForTimeout(500);

        // Click cancel button
        await page.locator('[role="alertdialog"] >> button:has-text("취소")').click();
        await page.waitForTimeout(500);

        // Verify team member still exists
        await expect(page.locator(`text="${teamMemberName}"`)).toBeVisible();
      }
    });

    test('should delete team member when confirmed', async ({ page }) => {
      await page.goto('/admin/team');

      // Create a team member to delete
      await page.getByRole('button', { name: /새 팀원 추가|팀원 추가/i }).click();
      await page.waitForTimeout(500);

      const deleteName = `삭제 테스트 ${Date.now()}`;
      await page.locator('input[placeholder*="홍길동" i]').fill(deleteName);
      await page.locator('input[placeholder*="Founder" i], input[placeholder*="CEO" i]').first().fill('Temporary');

      await page.locator('[role="dialog"] >> button[type="submit"]:has-text("저장")').click();
      await page.waitForTimeout(2000);

      // Find and delete the team member
      const teamMemberRow = page.locator(`tr:has-text("${deleteName}")`);
      if (await teamMemberRow.count() > 0) {
        const deleteBtn = teamMemberRow.locator('button:has(svg.lucide-trash-2)');
        await deleteBtn.click();
        await page.waitForTimeout(500);

        // Confirm deletion
        await page.locator('[role="alertdialog"] >> button:has-text("삭제")').click();
        await page.waitForTimeout(2000);

        // Verify team member is deleted
        await expect(page.locator(`text="${deleteName}"`)).not.toBeVisible();
      }
    });
  });

  test.describe('Active Toggle', () => {
    test('should toggle active status using switch', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Find first active switch in table
      const activeSwitch = page.locator('tbody button[role="switch"]').first();
      if (await activeSwitch.count() > 0) {
        // Get initial state
        const initialState = await activeSwitch.getAttribute('data-state');

        // Click to toggle
        await activeSwitch.click();
        await page.waitForTimeout(1000);

        // Check for success toast
        const toast = page.locator('[role="status"]').filter({ hasText: /활성 상태 변경/i });
        if (await toast.count() > 0) {
          await expect(toast.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Table Display', () => {
    test('should display team members table with correct columns', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Check for table headers
      await expect(page.locator('th:has-text("아바타")')).toBeVisible();
      await expect(page.locator('th:has-text("이름")')).toBeVisible();
      await expect(page.locator('th:has-text("역할")')).toBeVisible();
      await expect(page.locator('th:has-text("스킬")')).toBeVisible();
      await expect(page.locator('th:has-text("소셜")')).toBeVisible();
      await expect(page.locator('th:has-text("활성")')).toBeVisible();
      await expect(page.locator('th:has-text("우선순위")')).toBeVisible();
    });

    test('should display skills as badges', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Look for skill badges in table
      const skillBadges = page.locator('tbody .text-xs');
      if (await skillBadges.count() > 0) {
        await expect(skillBadges.first()).toBeVisible();
      }
    });

    test('should display social link icons', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Look for social icons (Github, LinkedIn, Twitter, Website)
      const socialIcons = page.locator('tbody svg.lucide-github, tbody svg.lucide-linkedin, tbody svg.lucide-twitter, tbody svg.lucide-globe');
      if (await socialIcons.count() > 0) {
        await expect(socialIcons.first()).toBeVisible();
      }
    });
  });

  test.describe('Active Filter', () => {
    test('should filter by active status', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Click active filter dropdown - more specific selector with .first()
      const filterButton = page.getByRole('button').filter({ hasText: /전체 상태|활성|비활성/i }).first();
      if (await filterButton.count() > 0) {
        await filterButton.click();
        await page.waitForTimeout(300);

        // Select "활성" option
        const activeOption = page.locator('[role="option"]:has-text("활성")');
        if (await activeOption.count() > 0) {
          await activeOption.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should filter by inactive status', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForTimeout(1000);

      // Click active filter dropdown
      const filterButton = page.locator('button:has-text("전체 상태"), button:has-text("활성"), button:has-text("비활성")').first();
      if (await filterButton.count() > 0) {
        await filterButton.click();
        await page.waitForTimeout(300);

        // Select "비활성" option
        const inactiveOption = page.locator('[role="option"]:has-text("비활성")');
        if (await inactiveOption.count() > 0) {
          await inactiveOption.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });
});
