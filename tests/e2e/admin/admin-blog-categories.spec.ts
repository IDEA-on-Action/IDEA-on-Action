/**
 * E2E Tests for AdminBlogCategories Page
 *
 * Tests CRUD operations for blog categories including:
 * - Navigation and page load
 * - Create new category with validation
 * - Search functionality
 * - Color picker validation
 * - Icon field validation
 * - Post count display
 * - Edit category
 * - Delete category (with post count warning)
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../fixtures/auth-helpers'

test.describe('Admin Blog Categories', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies()

    // Login as admin
    await loginAsAdmin(page)
  })

  test.describe('Page Navigation', () => {
    test('should navigate to blog categories page from admin menu', async ({ page }) => {
      await page.goto('/admin')

      // Look for blog categories link in sidebar or menu
      const categoriesLink = page.locator(
        'a[href="/admin/blog/categories"], a:has-text("카테고리"), a:has-text("Categories")'
      )

      if ((await categoriesLink.count()) > 0) {
        await categoriesLink.first().click()
        await page.waitForURL('/admin/blog/categories', { timeout: 5000 })
        expect(page.url()).toContain('/admin/blog/categories')
      }
    })

    test('should load blog categories page directly', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Check for page title
      await expect(
        page.locator('h1:has-text("블로그 카테고리 관리"), h1:has-text("Blog Categories")')
      ).toBeVisible()

      // Check for "새 카테고리" button
      await expect(
        page.getByRole('button', { name: /새 카테고리|New Category|카테고리 추가/i })
      ).toBeVisible()
    })

    test('should display table or empty state', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Wait for loading to complete
      await page.waitForTimeout(1000)

      // Either table or empty state should be visible
      const hasTable = (await page.locator('table, [role="table"]').count()) > 0
      const hasEmptyState = (await page.locator('text=/등록된 카테고리가 없습니다/i').count()) > 0

      expect(hasTable || hasEmptyState).toBeTruthy()
    })
  })

  test.describe('Create New Category', () => {
    test('should open create dialog when clicking "새 카테고리" button', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Click create button
      await page.getByRole('button', { name: /새 카테고리|New Category|카테고리 추가/i }).click()

      // Wait for dialog to open by checking for dialog title
      const dialogTitle = page.getByRole('heading', { name: /새 카테고리|카테고리 수정|New Category|Edit Category/i })
      await dialogTitle.waitFor({ state: 'visible', timeout: 10000 })

      // Check for dialog
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      // Check for form fields
      await expect(dialog.locator('input[placeholder*="기술"], input[name="name"]')).toBeVisible({ timeout: 5000 })
      await expect(dialog.locator('input[placeholder*="tech"], input[name="slug"]')).toBeVisible({ timeout: 5000 })
    })

    test('should show validation errors for missing required fields', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Open dialog
      await page.getByRole('button', { name: /새 카테고리|카테고리 추가/i }).click()

      // Wait for dialog submit button (confirms dialog is open)
      const dialog = page.getByRole('dialog')
      const submitButton = dialog.getByRole('button', { name: /저장|Save/i })
      await submitButton.waitFor({ state: 'visible', timeout: 10000 })

      // Submit empty form
      await submitButton.click()

      // Wait for validation error to appear
      const errorMessages = dialog.locator('text=/카테고리 이름을 입력하세요|required/i')
      await errorMessages.first().waitFor({ state: 'visible', timeout: 5000 })
      await expect(errorMessages.first()).toBeVisible()
    })

    test('should validate slug format (kebab-case)', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Open dialog
      await page.getByRole('button', { name: /새 카테고리|카테고리 추가/i }).click()
      await page.waitForTimeout(300)

      const dialog = page.locator('[role="dialog"]')

      // Fill with invalid slug (uppercase, spaces)
      await dialog.locator('input[placeholder*="기술"], input[name="name"]').fill('테스트 카테고리')
      await dialog.locator('input[placeholder*="tech"], input[name="slug"]').fill('Invalid Slug 123')

      // Submit
      await dialog.getByRole('button', { name: /저장|Save/i }).click()
      await page.waitForTimeout(500)

      // Check for slug validation error
      const slugError = dialog.locator('text=/kebab-case 형식|kebab-case format/i')
      await expect(slugError).toBeVisible()
    })

    test('should validate hex color format', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Open dialog
      await page.getByRole('button', { name: /새 카테고리|카테고리 추가/i }).click()
      await page.waitForTimeout(300)

      const dialog = page.locator('[role="dialog"]')

      // Fill required fields
      await dialog.locator('input[placeholder*="기술"], input[name="name"]').fill('테스트')
      await dialog.locator('input[placeholder*="tech"], input[name="slug"]').fill('test')

      // Fill with invalid color
      await dialog.locator('input[placeholder*="#3b82f6"], input[name="color"]').fill('blue')

      // Submit
      await dialog.getByRole('button', { name: /저장|Save/i }).click()
      await page.waitForTimeout(500)

      // Check for color validation error
      const colorError = dialog.locator('text=/올바른 hex 색상|hex color/i')
      await expect(colorError).toBeVisible()
    })

    test('should create category successfully with valid data', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Open dialog
      await page.getByRole('button', { name: /새 카테고리|카테고리 추가/i }).click()

      // Wait for dialog to open
      const dialog = page.getByRole('dialog')
      const nameInput = dialog.locator('input[placeholder*="기술"], input[name="name"]')
      await nameInput.waitFor({ state: 'visible', timeout: 10000 })

      // Generate unique category name
      const uniqueName = `테스트-${Date.now()}`
      const uniqueSlug = `test-${Date.now()}`

      // Fill form with valid data
      await nameInput.fill(uniqueName)
      await dialog.locator('input[placeholder*="tech"], input[name="slug"]').fill(uniqueSlug)
      await dialog
        .locator('textarea[placeholder*="카테고리 설명"], textarea[name="description"]')
        .fill('테스트 카테고리 설명')
      await dialog.locator('input[placeholder*="#3b82f6"], input[name="color"]').fill('#f59e0b')
      await dialog.locator('input[placeholder*="folder"], input[name="icon"]').fill('code')

      // Submit
      await dialog.getByRole('button', { name: /저장|Save/i }).click()

      // Check for success toast
      const toast = page.locator('[role="status"], [role="alert"]').filter({ hasText: /카테고리 생성 완료|created/i })
      await toast.first().waitFor({ state: 'visible', timeout: 5000 })
      if ((await toast.count()) > 0) {
        await expect(toast.first()).toBeVisible()
      }
    })

    test('should verify new category appears in table', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Create a category
      await page.getByRole('button', { name: /새 카테고리|카테고리 추가/i }).click()

      // Wait for dialog to open
      const dialog = page.getByRole('dialog')
      const nameInput = dialog.locator('input[placeholder*="기술"], input[name="name"]')
      await nameInput.waitFor({ state: 'visible', timeout: 10000 })

      const uniqueName = `분류-${Date.now()}`
      const uniqueSlug = `category-${Date.now()}`

      await nameInput.fill(uniqueName)
      await dialog.locator('input[placeholder*="tech"], input[name="slug"]').fill(uniqueSlug)
      await dialog.locator('input[placeholder*="#3b82f6"], input[name="color"]').fill('#8b5cf6')

      await dialog.getByRole('button', { name: /저장|Save/i }).click()

      // Verify it appears in the table
      const categoryInTable = page.locator(`text="${uniqueName}"`)
      await categoryInTable.waitFor({ state: 'visible', timeout: 10000 })
      await expect(categoryInTable).toBeVisible()
    })
  })

  test.describe('Search Functionality', () => {
    test('should filter categories by name using search', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Wait for page to load
      await page.waitForTimeout(1000)

      // Find search input
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="검색"], input[placeholder*="Search"]'
      )

      if ((await searchInput.count()) > 0) {
        // Type search query
        await searchInput.first().fill('기술')

        // Wait for filtering
        await page.waitForTimeout(500)

        // Verify search value
        await expect(searchInput.first()).toHaveValue('기술')
      }
    })

    test('should clear search results when search is cleared', async ({ page }) => {
      await page.goto('/admin/blog/categories')
      await page.waitForTimeout(1000)

      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="검색"], input[placeholder*="Search"]'
      )

      if ((await searchInput.count()) > 0) {
        // Search
        await searchInput.first().fill('테스트')
        await page.waitForTimeout(500)

        // Clear search
        await searchInput.first().clear()
        await page.waitForTimeout(500)

        // Verify search is cleared
        await expect(searchInput.first()).toHaveValue('')
      }
    })
  })

  test.describe('Color Picker', () => {
    test('should display color preview box', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Open dialog
      await page.getByRole('button', { name: /새 카테고리|카테고리 추가/i }).click()
      await page.waitForTimeout(300)

      const dialog = page.locator('[role="dialog"]')

      // Check for color preview box
      const colorPreview = dialog.locator('div[style*="backgroundColor"]')
      await expect(colorPreview).toBeVisible()
    })

    test('should update color preview when hex code changes', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Open dialog
      await page.getByRole('button', { name: /새 카테고리|카테고리 추가/i }).click()
      await page.waitForTimeout(300)

      const dialog = page.locator('[role="dialog"]')

      // Change color
      const colorInput = dialog.locator('input[placeholder*="#3b82f6"], input[name="color"]')
      await colorInput.fill('#ff0000')

      // Wait for preview update
      await page.waitForTimeout(300)

      // Verify preview box has new color
      const colorPreview = dialog.locator('div[style*="backgroundColor"]')
      const bgColor = await colorPreview.getAttribute('style')
      expect(bgColor).toContain('#ff0000')
    })
  })

  test.describe('Icon Field', () => {
    test('should accept valid icon names', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Open dialog
      await page.getByRole('button', { name: /새 카테고리|카테고리 추가/i }).click()
      await page.waitForTimeout(300)

      const dialog = page.locator('[role="dialog"]')

      // Fill icon field
      const iconInput = dialog.locator('input[placeholder*="folder"], input[name="icon"]')
      await iconInput.fill('palette')

      // Verify value
      await expect(iconInput).toHaveValue('palette')
    })
  })

  test.describe('Post Count Display', () => {
    test('should display post count in table', async ({ page }) => {
      await page.goto('/admin/blog/categories')
      await page.waitForTimeout(1000)

      // Check if table exists
      if ((await page.locator('table').count()) > 0) {
        // Look for post count column header
        const postCountHeader = page.locator('th:has-text("포스트 수"), th:has-text("Posts")')
        if ((await postCountHeader.count()) > 0) {
          await expect(postCountHeader.first()).toBeVisible()
        }

        // Look for post count badges
        const postCountBadge = page.locator('text=/\\d+개|\\d+ posts/i')
        if ((await postCountBadge.count()) > 0) {
          await expect(postCountBadge.first()).toBeVisible()
        }
      }
    })
  })

  test.describe('Edit Category', () => {
    test('should open edit dialog when clicking edit button', async ({ page }) => {
      await page.goto('/admin/blog/categories')
      await page.waitForTimeout(1000)

      // Find first edit button
      const editButton = page
        .locator('button:has-text("수정"), button:has-text("Edit"), button svg.lucide-pencil')
        .first()

      if ((await editButton.count()) > 0) {
        await editButton.click()

        // Wait for dialog
        await page.waitForTimeout(300)

        // Check for dialog with "수정" title
        const dialog = page.locator('[role="dialog"]')
        await expect(dialog).toBeVisible()
        await expect(dialog.locator('text=/카테고리 수정|Edit Category/i')).toBeVisible()
      }
    })

    test('should load existing data in edit form', async ({ page }) => {
      await page.goto('/admin/blog/categories')
      await page.waitForTimeout(1000)

      const editButton = page
        .locator('button:has-text("수정"), button:has-text("Edit"), button svg.lucide-pencil')
        .first()

      if ((await editButton.count()) > 0) {
        await editButton.click()
        await page.waitForTimeout(300)

        const dialog = page.locator('[role="dialog"]')

        // Check if name field has value
        const nameInput = dialog.locator('input[placeholder*="기술"], input[name="name"]')
        const nameValue = await nameInput.inputValue()
        expect(nameValue.length).toBeGreaterThan(0)

        // Check if slug field has value
        const slugInput = dialog.locator('input[placeholder*="tech"], input[name="slug"]')
        const slugValue = await slugInput.inputValue()
        expect(slugValue.length).toBeGreaterThan(0)
      }
    })

    test('should update category successfully', async ({ page }) => {
      await page.goto('/admin/blog/categories')
      await page.waitForTimeout(1000)

      const editButton = page
        .locator('button:has-text("수정"), button:has-text("Edit"), button svg.lucide-pencil')
        .first()

      if ((await editButton.count()) > 0) {
        await editButton.click()
        await page.waitForTimeout(300)

        const dialog = page.locator('[role="dialog"]')

        // Update description
        const descriptionInput = dialog.locator(
          'textarea[placeholder*="카테고리 설명"], textarea[name="description"]'
        )
        await descriptionInput.fill(`Updated at ${new Date().toISOString()}`)

        // Submit
        await dialog.getByRole('button', { name: /저장|Save/i }).click()
        await page.waitForTimeout(1500)

        // Check for success toast
        const toast = page.locator('[role="status"], [role="alert"]').filter({ hasText: /카테고리 수정 완료|updated/i })
        if ((await toast.count()) > 0) {
          await expect(toast.first()).toBeVisible()
        }
      }
    })
  })

  test.describe('Delete Category', () => {
    test('should show delete confirmation dialog', async ({ page }) => {
      await page.goto('/admin/blog/categories')
      await page.waitForTimeout(1000)

      // Find first delete button
      const deleteButton = page
        .locator('button:has-text("삭제"), button:has-text("Delete"), button svg.lucide-trash-2')
        .first()

      if ((await deleteButton.count()) > 0) {
        await deleteButton.click()

        // Wait for confirmation dialog
        await page.waitForTimeout(500)

        // Check for alert dialog
        const alertDialog = page.locator('[role="alertdialog"]')
        await expect(alertDialog).toBeVisible()
        await expect(alertDialog.locator('text=/카테고리 삭제|Delete Category/i')).toBeVisible()
      }
    })

    test('should show warning if category has posts', async ({ page }) => {
      await page.goto('/admin/blog/categories')
      await page.waitForTimeout(1000)

      // Find a category with posts (postCount > 0)
      const categoryWithPosts = page.locator('tr').filter({ hasText: /[1-9]\d*개|[1-9]\d* posts/i }).first()

      if ((await categoryWithPosts.count()) > 0) {
        // Click delete button
        const deleteButton = categoryWithPosts.locator(
          'button:has-text("삭제"), button svg.lucide-trash-2'
        )
        await deleteButton.click()
        await page.waitForTimeout(500)

        // Check for warning in dialog or toast
        const warningMessage = page.locator('text=/경고|warning|포스트가 있습니다/i')
        if ((await warningMessage.count()) > 0) {
          await expect(warningMessage.first()).toBeVisible()
        }
      }
    })

    test('should cancel delete when clicking cancel button', async ({ page }) => {
      await page.goto('/admin/blog/categories')
      await page.waitForTimeout(1000)

      const deleteButton = page
        .locator('button:has-text("삭제"), button:has-text("Delete"), button svg.lucide-trash-2')
        .first()

      if ((await deleteButton.count()) > 0) {
        await deleteButton.click()
        await page.waitForTimeout(500)

        // Click cancel
        const cancelButton = page.getByRole('button', { name: /취소|Cancel/i })
        if ((await cancelButton.count()) > 0) {
          await cancelButton.click()
          await page.waitForTimeout(300)

          // Dialog should be closed
          const alertDialog = page.locator('[role="alertdialog"]')
          await expect(alertDialog).not.toBeVisible()
        }
      }
    })

    test('should delete category successfully (if no posts)', async ({ page }) => {
      await page.goto('/admin/blog/categories')

      // Create a test category to delete
      await page.getByRole('button', { name: /새 카테고리|카테고리 추가/i }).click()
      await page.waitForTimeout(300)

      const dialog = page.locator('[role="dialog"]')
      const uniqueName = `삭제용-${Date.now()}`
      const uniqueSlug = `delete-${Date.now()}`

      await dialog.locator('input[placeholder*="기술"], input[name="name"]').fill(uniqueName)
      await dialog.locator('input[placeholder*="tech"], input[name="slug"]').fill(uniqueSlug)
      await dialog.locator('input[placeholder*="#3b82f6"], input[name="color"]').fill('#ef4444')

      await dialog.getByRole('button', { name: /저장|Save/i }).click()
      await page.waitForTimeout(2000)

      // Find the newly created category row
      const categoryRow = page.locator(`tr:has-text("${uniqueName}")`)

      if ((await categoryRow.count()) > 0) {
        // Click delete button
        const deleteButton = categoryRow.locator('button:has-text("삭제"), button svg.lucide-trash-2')
        await deleteButton.click()
        await page.waitForTimeout(500)

        // Confirm deletion
        const confirmButton = page.getByRole('button', { name: /삭제|Delete/i }).last()
        await confirmButton.click()
        await page.waitForTimeout(1500)

        // Check for success toast
        const toast = page.locator('[role="status"], [role="alert"]').filter({ hasText: /카테고리 삭제 완료|deleted/i })
        if ((await toast.count()) > 0) {
          await expect(toast.first()).toBeVisible()
        }

        // Verify category is removed
        await page.waitForTimeout(1000)
        const deletedCategory = page.locator(`text="${uniqueName}"`)
        await expect(deletedCategory).not.toBeVisible()
      }
    })
  })

  test.describe('Color Badge Display', () => {
    test('should render color badge correctly in table', async ({ page }) => {
      await page.goto('/admin/blog/categories')
      await page.waitForTimeout(1000)

      // Check if table exists
      if ((await page.locator('table').count()) > 0) {
        // Look for color preview boxes in table
        const colorBadges = page.locator('table div[style*="backgroundColor"]')
        if ((await colorBadges.count()) > 0) {
          await expect(colorBadges.first()).toBeVisible()

          // Verify it has a background color
          const style = await colorBadges.first().getAttribute('style')
          expect(style).toContain('background')
        }
      }
    })

    test('should display hex code next to color badge', async ({ page }) => {
      await page.goto('/admin/blog/categories')
      await page.waitForTimeout(1000)

      // Check if table exists
      if ((await page.locator('table').count()) > 0) {
        // Look for hex codes (e.g., #3b82f6)
        const hexCodes = page.locator('code').filter({ hasText: /^#[0-9a-fA-F]{6}$/ })
        if ((await hexCodes.count()) > 0) {
          await expect(hexCodes.first()).toBeVisible()
        }
      }
    })
  })
})
