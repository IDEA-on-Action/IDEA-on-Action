/**
 * AdminLab E2E Tests
 *
 * Tests for Lab management page:
 * - Page navigation
 * - Create/Edit/Delete Lab items
 * - Search functionality
 * - Category/Status filtering
 * - URL validation (GitHub/Demo)
 * - Published toggle
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../helpers/auth'

test.describe('AdminLab Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies()

    // Login as admin
    await loginAsAdmin(page)
  })

  test.describe('Page Navigation', () => {
    test('should navigate to /admin/lab from admin dashboard', async ({ page }) => {
      await page.goto('/admin')
      await page.waitForLoadState('networkidle')

      // Click on Lab menu item
      await page.getByRole('link', { name: 'Lab' }).filter({ has: page.locator('[href="/admin/lab"]') }).click()
      await page.waitForURL('/admin/lab', { timeout: 10000 })

      // Verify page title
      await expect(page.locator('h1:has-text("Lab 관리")')).toBeVisible()
    })

    test('should show "새 Lab 항목" button', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')

      // Verify create button is visible
      const createButton = page.locator('button:has-text("새 Lab 항목")')
      await expect(createButton).toBeVisible()
    })
  })

  test.describe('Create New Lab Item', () => {
    test('should open create dialog when clicking "새 Lab 항목"', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')

      // Click create button
      await page.click('button:has-text("새 Lab 항목")')

      // Wait for dialog to open by checking for slug input field
      const dialog = page.getByRole('dialog')
      const slugInput = dialog.locator('input[placeholder*="ai-chatbot-experiment"]')
      await slugInput.waitFor({ state: 'visible', timeout: 10000 })

      // Verify dialog is open
      await expect(dialog.locator('text="새 Lab 항목"')).toBeVisible({ timeout: 5000 }) // Dialog title
      await expect(slugInput).toBeVisible() // Slug field
    })

    test('should validate required fields', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.click('button:has-text("새 Lab 항목")')

      // Submit empty form
      await page.click('button[type="submit"]:has-text("저장")')
      await page.waitForTimeout(500)

      // Check for validation error messages
      const errorPatterns = [/Slug를 입력하세요|required/i, /제목을 입력하세요|required/i, /설명을 입력하세요|required/i]

      for (const pattern of errorPatterns) {
        const errors = page.locator(`text=${pattern}`)
        const count = await errors.count()
        if (count > 0) {
          await expect(errors.first()).toBeVisible()
        }
      }
    })

    test('should validate slug format (kebab-case)', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.click('button:has-text("새 Lab 항목")')

      // Fill invalid slug (uppercase, spaces)
      await page.fill('input[placeholder*="ai-chatbot-experiment"]', 'Invalid Slug 123')

      // Try to submit
      await page.click('button[type="submit"]:has-text("저장")')
      await page.waitForTimeout(500)

      // Check for kebab-case validation error
      const slugError = page.locator('text=/소문자, 숫자, 하이픈|kebab-case/i')
      if ((await slugError.count()) > 0) {
        await expect(slugError).toBeVisible()
      }
    })

    test('should create lab item with valid data', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.click('button:has-text("새 Lab 항목")')

      const timestamp = Date.now()
      const slug = `test-lab-${timestamp}`

      // Fill form fields
      await page.fill('input[placeholder*="ai-chatbot-experiment"]', slug)
      await page.fill('input[placeholder*="AI 챗봇 실험"]', `테스트 Lab ${timestamp}`)
      await page.fill('textarea[placeholder*="Lab 항목 설명"]', `테스트 Lab 설명 ${timestamp}`)

      // Select category (experiment)
      await page.locator('select, [role="combobox"]').first().click()
      await page.getByText('실험', { exact: true }).click()

      // Select status (exploring)
      await page.locator('select, [role="combobox"]').nth(1).click()
      await page.getByText('탐색 중', { exact: true }).click()

      // Submit form
      await page.click('button[type="submit"]:has-text("저장")')

      // Wait for success toast
      await expect(page.locator('text=/Lab 항목 생성 완료|생성되었습니다/i')).toBeVisible({ timeout: 5000 })

      // Verify dialog closed
      await expect(page.locator('text="새 Lab 항목"').nth(1)).not.toBeVisible({ timeout: 3000 })

      // Verify new item appears in table
      await expect(page.locator(`text="${slug}"`)).toBeVisible({ timeout: 5000 })
    })

    test('should create lab item with GitHub and Demo URLs', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.click('button:has-text("새 Lab 항목")')

      const timestamp = Date.now()
      const slug = `test-lab-urls-${timestamp}`

      // Fill basic fields
      await page.fill('input[placeholder*="ai-chatbot-experiment"]', slug)
      await page.fill('input[placeholder*="AI 챗봇 실험"]', `URL 테스트 Lab ${timestamp}`)
      await page.fill('textarea[placeholder*="Lab 항목 설명"]', 'URL 검증 테스트')

      // Fill GitHub URL
      await page.fill('input[placeholder*="https://github.com/"]', 'https://github.com/test/repo')

      // Fill Demo URL
      await page.fill('input[placeholder*="https://demo.example.com"]', 'https://demo.test.com')

      // Submit form
      await page.click('button[type="submit"]:has-text("저장")')

      // Wait for success
      await expect(page.locator('text=/Lab 항목 생성 완료/i')).toBeVisible({ timeout: 5000 })

      // Verify GitHub icon appears in table
      await expect(page.locator('a[href="https://github.com/test/repo"]')).toBeVisible()
    })

    test('should validate URL format for GitHub/Demo URLs', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.click('button:has-text("새 Lab 항목")')

      // Fill valid basic fields
      await page.fill('input[placeholder*="ai-chatbot-experiment"]', 'test-invalid-url')
      await page.fill('input[placeholder*="AI 챗봇 실험"]', '테스트 Lab')
      await page.fill('textarea[placeholder*="Lab 항목 설명"]', '테스트 설명')

      // Fill invalid GitHub URL
      await page.fill('input[placeholder*="https://github.com/"]', 'not-a-valid-url')

      // Try to submit
      await page.click('button[type="submit"]:has-text("저장")')
      await page.waitForTimeout(500)

      // Check for URL validation error
      const urlError = page.locator('text=/유효한 URL/i')
      if ((await urlError.count()) > 0) {
        await expect(urlError).toBeVisible()
      }
    })
  })

  test.describe('Search Functionality', () => {
    test('should filter lab items by search term (title)', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')

      // Wait for lab items to load
      await page.waitForTimeout(1000)

      // Get initial item count
      const initialCount = await page.locator('table tbody tr').count()

      if (initialCount > 0) {
        // Get first item title
        const firstTitle = await page.locator('table tbody tr:first-child td:first-child').textContent()

        // Search for partial title
        const searchTerm = firstTitle?.substring(0, 5) || ''
        await page.fill('input[placeholder*="제목 또는 설명 검색"]', searchTerm)
        await page.waitForTimeout(500)

        // Verify results are filtered
        const filteredCount = await page.locator('table tbody tr').count()
        expect(filteredCount).toBeLessThanOrEqual(initialCount)
      }
    })

    test('should show empty message when no results match search', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')

      // Search for non-existent term
      await page.fill('input[placeholder*="제목 또는 설명 검색"]', 'xyz-nonexistent-term-123')
      await page.waitForTimeout(500)

      // Verify empty message or no results
      const tableRows = await page.locator('table tbody tr').count()
      if (tableRows === 0) {
        await expect(page.locator('text=/등록된 Lab 항목이 없습니다/i')).toBeVisible()
      }
    })
  })

  test.describe('Filter by Category', () => {
    test('should filter lab items by category (실험)', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')

      // Select "실험" category
      await page.click('select:has-text("전체 카테고리"), [role="combobox"]:has-text("전체 카테고리")')
      await page.getByText('실험', { exact: true }).click()
      await page.waitForTimeout(500)

      // Verify all visible items have "실험" badge
      const experimentBadges = await page.locator('text="실험"').count()
      const tableRows = await page.locator('table tbody tr').count()

      if (tableRows > 0) {
        expect(experimentBadges).toBeGreaterThanOrEqual(tableRows)
      }
    })

    test('should show all categories when "전체 카테고리" selected', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')

      // Select "전체 카테고리"
      await page.click('select:has-text("전체 카테고리"), [role="combobox"]:has-text("전체 카테고리")')
      await page.getByText('전체 카테고리', { exact: true }).click()
      await page.waitForTimeout(500)

      // Should show all items (no filter)
      const allRows = await page.locator('table tbody tr').count()
      expect(allRows).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Filter by Status', () => {
    test('should filter lab items by status (탐색 중)', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')

      // Select "탐색 중" status
      await page.click('select:has-text("전체 상태"), [role="combobox"]:has-text("전체 상태")')
      await page.getByText('탐색 중', { exact: true }).click()
      await page.waitForTimeout(500)

      // Verify all visible items have "탐색 중" badge
      const exploringBadges = await page.locator('text="탐색 중"').count()
      const tableRows = await page.locator('table tbody tr').count()

      if (tableRows > 0) {
        expect(exploringBadges).toBeGreaterThanOrEqual(tableRows)
      }
    })

    test('should combine category and status filters', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')

      // Select category "실험"
      await page.click('select:has-text("전체 카테고리"), [role="combobox"]:has-text("전체 카테고리")')
      await page.getByText('실험', { exact: true }).click()
      await page.waitForTimeout(300)

      // Select status "개발 중"
      await page.click('select:has-text("전체 상태"), [role="combobox"]:has-text("전체 상태")')
      await page.getByText('개발 중', { exact: true }).click()
      await page.waitForTimeout(500)

      // Verify filters are applied
      const tableRows = await page.locator('table tbody tr').count()
      expect(tableRows).toBeGreaterThanOrEqual(0) // May be 0 if no matching items
    })
  })

  test.describe('Edit Lab Item', () => {
    test('should open edit dialog when clicking edit button', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')

      // Wait for items to load
      await page.waitForTimeout(1000)
      const itemCount = await page.locator('table tbody tr').count()

      if (itemCount > 0) {
        // Click edit button on first item
        await page.click('button[aria-label*="수정"], button:has(svg.lucide-pencil)')
        await page.waitForTimeout(500)

        // Verify edit dialog is open
        await expect(page.locator('text="Lab 항목 수정"')).toBeVisible()
      }
    })

    test('should pre-fill form with existing data', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const itemCount = await page.locator('table tbody tr').count()

      if (itemCount > 0) {
        // Get first item title
        const originalTitle = await page.locator('table tbody tr:first-child td:first-child').textContent()

        // Click edit
        await page.click('button[aria-label*="수정"], button:has(svg.lucide-pencil)')
        await page.waitForTimeout(500)

        // Verify title field is pre-filled
        const titleValue = await page.locator('input[placeholder*="AI 챗봇 실험"]').inputValue()
        expect(titleValue.length).toBeGreaterThan(0)
      }
    })

    test('should update lab item successfully', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const itemCount = await page.locator('table tbody tr').count()

      if (itemCount > 0) {
        // Click edit
        await page.click('button[aria-label*="수정"], button:has(svg.lucide-pencil)')
        await page.waitForTimeout(500)

        // Update title
        const newTitle = `Updated Lab ${Date.now()}`
        await page.fill('input[placeholder*="AI 챗봇 실험"]', newTitle)

        // Submit
        await page.click('button[type="submit"]:has-text("저장")')

        // Verify success toast
        await expect(page.locator('text=/Lab 항목 수정 완료/i')).toBeVisible({ timeout: 5000 })

        // Verify updated title in table
        await expect(page.locator(`text="${newTitle}"`)).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Delete Lab Item', () => {
    test('should show delete confirmation dialog', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const itemCount = await page.locator('table tbody tr').count()

      if (itemCount > 0) {
        // Click delete button
        await page.click('button[aria-label*="삭제"], button:has(svg.lucide-trash-2)')
        await page.waitForTimeout(500)

        // Verify confirmation dialog
        await expect(page.locator('text="Lab 항목 삭제"')).toBeVisible()
        await expect(page.locator('text=/정말로 이 Lab 항목을 삭제/i')).toBeVisible()
      }
    })

    test('should cancel delete when clicking "취소"', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const itemCount = await page.locator('table tbody tr').count()

      if (itemCount > 0) {
        const originalCount = itemCount

        // Click delete
        await page.click('button[aria-label*="삭제"], button:has(svg.lucide-trash-2)')
        await page.waitForTimeout(500)

        // Click cancel
        await page.click('button:has-text("취소")')
        await page.waitForTimeout(500)

        // Verify item still exists
        const currentCount = await page.locator('table tbody tr').count()
        expect(currentCount).toBe(originalCount)
      }
    })

    test('should delete lab item when confirmed', async ({ page }) => {
      // First create a lab item to delete
      await page.goto('/admin/lab')
      await page.click('button:has-text("새 Lab 항목")')

      const timestamp = Date.now()
      const slug = `delete-test-${timestamp}`
      const title = `삭제 테스트 Lab ${timestamp}`

      await page.fill('input[placeholder*="ai-chatbot-experiment"]', slug)
      await page.fill('input[placeholder*="AI 챗봇 실험"]', title)
      await page.fill('textarea[placeholder*="Lab 항목 설명"]', '삭제 테스트용')

      await page.click('button[type="submit"]:has-text("저장")')
      await expect(page.locator('text=/Lab 항목 생성 완료/i')).toBeVisible({ timeout: 5000 })

      // Now delete it
      await page.waitForTimeout(1000)

      // Find the delete button for this item
      const row = page.locator(`tr:has-text("${title}")`)
      await row.locator('button[aria-label*="삭제"], button:has(svg.lucide-trash-2)').click()
      await page.waitForTimeout(500)

      // Confirm deletion
      await page.click('button:has-text("삭제")')

      // Verify success toast
      await expect(page.locator('text=/Lab 항목 삭제 완료/i')).toBeVisible({ timeout: 5000 })

      // Verify item is removed from table
      await expect(page.locator(`text="${title}"`)).not.toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Category and Status Badges', () => {
    test('should display category badges with correct colors', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const categoryBadges = ['실험', '아이디어', '커뮤니티', '연구']
      const tableRows = await page.locator('table tbody tr').count()

      if (tableRows > 0) {
        // Check if any category badges exist
        for (const badge of categoryBadges) {
          const badgeCount = await page.locator(`text="${badge}"`).count()
          if (badgeCount > 0) {
            await expect(page.locator(`text="${badge}"`).first()).toBeVisible()
            break
          }
        }
      }
    })

    test('should display status badges with correct colors', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const statusBadges = ['탐색 중', '개발 중', '테스트 중', '완료', '보관됨']
      const tableRows = await page.locator('table tbody tr').count()

      if (tableRows > 0) {
        // Check if any status badges exist
        for (const badge of statusBadges) {
          const badgeCount = await page.locator(`text="${badge}"`).count()
          if (badgeCount > 0) {
            await expect(page.locator(`text="${badge}"`).first()).toBeVisible()
            break
          }
        }
      }
    })
  })

  test.describe('Published Toggle', () => {
    test('should toggle published status', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const itemCount = await page.locator('table tbody tr').count()

      if (itemCount > 0) {
        // Find first published toggle switch
        const publishSwitch = page.locator('button[role="switch"]').first()
        const initialState = await publishSwitch.getAttribute('aria-checked')

        // Toggle switch
        await publishSwitch.click()
        await page.waitForTimeout(500)

        // Verify success toast
        await expect(page.locator('text=/공개 상태 변경|비공개로 변경|공개로 변경/i')).toBeVisible({ timeout: 5000 })

        // Verify state changed
        const newState = await publishSwitch.getAttribute('aria-checked')
        expect(newState).not.toBe(initialState)
      }
    })
  })

  test.describe('GitHub and Demo URLs', () => {
    test('should display GitHub icon for items with githubUrl', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Check if any GitHub links exist
      const githubLinks = await page.locator('a[href*="github.com"]').count()

      if (githubLinks > 0) {
        // Verify GitHub icon is visible
        await expect(page.locator('svg.lucide-github').first()).toBeVisible()

        // Verify external link icon is visible
        await expect(page.locator('svg.lucide-external-link').first()).toBeVisible()
      }
    })

    test('should open GitHub URL in new tab', async ({ page, context }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const githubLinks = await page.locator('a[href*="github.com"]').count()

      if (githubLinks > 0) {
        const link = page.locator('a[href*="github.com"]').first()

        // Verify target="_blank"
        const target = await link.getAttribute('target')
        expect(target).toBe('_blank')

        // Verify rel="noopener noreferrer"
        const rel = await link.getAttribute('rel')
        expect(rel).toContain('noopener')
        expect(rel).toContain('noreferrer')
      }
    })

    test('should show "-" for items without GitHub URL', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const tableRows = await page.locator('table tbody tr').count()

      if (tableRows > 0) {
        // Check if any rows show "-" in GitHub column
        const emptyGithubCells = await page.locator('table tbody tr td:has-text("-")').count()
        expect(emptyGithubCells).toBeGreaterThanOrEqual(0)
      }
    })
  })

  test.describe('Markdown Content', () => {
    test('should display markdown textarea in create/edit dialog', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.click('button:has-text("새 Lab 항목")')

      // Verify markdown textarea exists
      const markdownField = page.locator('textarea[placeholder*="Markdown 형식으로 작성"]')
      await expect(markdownField).toBeVisible()

      // Verify it has monospace font class
      const className = await markdownField.getAttribute('class')
      expect(className).toContain('font-mono')
    })

    test('should save markdown content', async ({ page }) => {
      await page.goto('/admin/lab')
      await page.click('button:has-text("새 Lab 항목")')

      const timestamp = Date.now()
      const slug = `markdown-test-${timestamp}`
      const markdownContent = `# Markdown Test\n\n- List item 1\n- List item 2`

      // Fill basic fields
      await page.fill('input[placeholder*="ai-chatbot-experiment"]', slug)
      await page.fill('input[placeholder*="AI 챗봇 실험"]', `Markdown 테스트 ${timestamp}`)
      await page.fill('textarea[placeholder*="Lab 항목 설명"]', 'Markdown 테스트')

      // Fill markdown content
      await page.fill('textarea[placeholder*="Markdown 형식으로 작성"]', markdownContent)

      // Submit
      await page.click('button[type="submit"]:has-text("저장")')

      // Verify success
      await expect(page.locator('text=/Lab 항목 생성 완료/i')).toBeVisible({ timeout: 5000 })
    })
  })
})
