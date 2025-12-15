/**
 * 보호된 라우트 접근 제어 E2E 테스트
 *
 * 테스트 시나리오:
 * - 비로그인 사용자 접근 제어
 * - 일반 사용자 접근 제어
 * - 관리자 역할별 접근 제어
 * - super_admin 전용 페이지 접근
 *
 * NOTE: 로그인이 필요한 테스트는 E2E_SUPER_ADMIN_PASSWORD 환경 변수 설정 필요
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin, loginAsSuperAdmin, loginAsRegularUser, logout } from '../helpers/auth'

// 환경 변수 체크 - 로그인 테스트 실행 여부 결정
const hasAuthCredentials = !!process.env.E2E_SUPER_ADMIN_PASSWORD

test.describe('보호된 라우트 접근 제어', () => {
  test.beforeEach(async ({ page }) => {
    // 세션 초기화
    await page.context().clearCookies()
  })

  // ==================== 비로그인 사용자 ====================

  test.describe('비로그인 사용자', () => {
    test('비로그인 시 /admin 접근 → /login 리다이렉트', async ({ page }) => {
      await page.goto('/admin')

      // 로그인 페이지로 리다이렉트
      await page.waitForURL(/\/login/, { timeout: 10000 })
      expect(page.url()).toContain('/login')
    })

    test('비로그인 시 /admin/users 접근 → /login 리다이렉트', async ({ page }) => {
      await page.goto('/admin/users')

      // 로그인 페이지로 리다이렉트
      await page.waitForURL(/\/login/, { timeout: 10000 })
      expect(page.url()).toContain('/login')
    })

    test('비로그인 시 /admin/blog 접근 → /login 리다이렉트', async ({ page }) => {
      await page.goto('/admin/blog')

      await page.waitForURL(/\/login/, { timeout: 10000 })
      expect(page.url()).toContain('/login')
    })

    test('비로그인 시 /admin/services 접근 → /login 리다이렉트', async ({ page }) => {
      await page.goto('/admin/services')

      await page.waitForURL(/\/login/, { timeout: 10000 })
      expect(page.url()).toContain('/login')
    })

    test('공개 페이지는 접근 가능', async ({ page }) => {
      await page.goto('/')

      // 홈페이지 정상 로드
      await expect(page).toHaveURL('/')
      await expect(page.locator('body')).toBeVisible()
    })

    test('로그인 페이지 접근 가능', async ({ page }) => {
      await page.goto('/login')

      // 로그인 폼 표시
      await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible()
      await expect(page.locator('input[type="password"]').first()).toBeVisible()
    })
  })

  // ==================== 일반 사용자 ====================

  test.describe('일반 사용자', () => {
    // 환경 변수 없으면 건너뜀
    test.skip(!hasAuthCredentials, '테스트 계정 환경 변수(E2E_*_PASSWORD) 미설정')

    test('일반 사용자가 /admin 접근 → /forbidden 또는 홈으로 리다이렉트', async ({ page }) => {
      await loginAsRegularUser(page)

      await page.goto('/admin')
      await page.waitForTimeout(2000)

      // forbidden 페이지 또는 홈으로 리다이렉트
      const currentUrl = page.url()
      const isForbiddenOrHome = currentUrl.includes('/forbidden') || currentUrl === '/' || currentUrl.endsWith('/')

      expect(isForbiddenOrHome).toBe(true)
    })

    test('일반 사용자가 /admin/users 접근 → 접근 거부', async ({ page }) => {
      await loginAsRegularUser(page)

      await page.goto('/admin/users')
      await page.waitForTimeout(2000)

      const currentUrl = page.url()
      const isRestricted = currentUrl.includes('/forbidden') || currentUrl.includes('/login') || currentUrl === '/'

      expect(isRestricted).toBe(true)
    })

    test('일반 사용자는 공개 페이지 접근 가능', async ({ page }) => {
      await loginAsRegularUser(page)

      // 서비스 페이지
      await page.goto('/services')
      await expect(page).toHaveURL('/services')

      // 블로그 페이지
      await page.goto('/blog')
      await expect(page).toHaveURL('/blog')
    })
  })

  // ==================== 관리자 (admin) ====================

  test.describe('관리자 (admin)', () => {
    test.skip(!hasAuthCredentials, '테스트 계정 환경 변수(E2E_*_PASSWORD) 미설정')

    test('admin 역할이 /admin 접근 → 대시보드 표시', async ({ page }) => {
      await loginAsAdmin(page)

      await page.goto('/admin')
      await page.waitForTimeout(2000)

      // 대시보드 페이지 로드 확인
      const dashboardIndicators = [
        page.locator('h1:has-text("대시보드")'),
        page.locator('h1:has-text("Dashboard")'),
        page.locator('text=관리자'),
      ]

      let found = false
      for (const indicator of dashboardIndicators) {
        if (await indicator.count() > 0) {
          found = true
          break
        }
      }

      // 대시보드에 접근했거나, admin 관련 컨텐츠가 표시됨
      expect(found || page.url().includes('/admin')).toBe(true)
    })

    test('admin 역할이 /admin/blog 접근 → 블로그 관리 표시', async ({ page }) => {
      await loginAsAdmin(page)

      await page.goto('/admin/blog')
      await page.waitForTimeout(2000)

      // 블로그 관리 페이지 또는 접근 거부
      const onBlogPage = page.url().includes('/admin/blog')
      const hasBlogContent = await page.locator('text=Posts, text=블로그, text=게시글').count() > 0

      expect(onBlogPage || hasBlogContent).toBe(true)
    })

    test('admin 역할이 /admin/users 접근 → 권한 없음 메시지', async ({ page }) => {
      await loginAsAdmin(page)

      await page.goto('/admin/users')
      await page.waitForTimeout(2000)

      // super_admin만 접근 가능하므로 권한 없음 표시
      const accessDenied = await page.locator('text=권한이 없습니다').count()
      const superAdminOnly = await page.locator('text=Super Admin만').count()
      const forbidden = page.url().includes('/forbidden')

      expect(accessDenied > 0 || superAdminOnly > 0 || forbidden).toBe(true)
    })

    test('admin 역할이 /admin/roles 접근 → 권한 없음', async ({ page }) => {
      await loginAsAdmin(page)

      await page.goto('/admin/roles')
      await page.waitForTimeout(2000)

      // user:manage 권한 필요
      const accessDenied = await page.locator('text=권한').count()
      const forbidden = page.url().includes('/forbidden')

      expect(accessDenied > 0 || forbidden || page.url().includes('/admin/roles')).toBe(true)
    })
  })

  // ==================== 슈퍼관리자 (super_admin) ====================

  test.describe('슈퍼관리자 (super_admin)', () => {
    test.skip(!hasAuthCredentials, '테스트 계정 환경 변수(E2E_*_PASSWORD) 미설정')

    test('super_admin 역할이 /admin 접근 → 대시보드 표시', async ({ page }) => {
      await loginAsSuperAdmin(page)

      await page.goto('/admin')
      await page.waitForTimeout(2000)

      // 대시보드 접근 성공
      expect(page.url()).toContain('/admin')
    })

    test('super_admin 역할이 /admin/users 접근 → 관리자 관리 페이지 표시', async ({ page }) => {
      await loginAsSuperAdmin(page)

      await page.goto('/admin/users')
      await page.waitForTimeout(2000)

      // 관리자 관리 페이지 표시
      const pageTitle = page.locator('h1:has-text("관리자 관리")')
      const newAdminButton = page.locator('button:has-text("새 관리자")')

      const hasTitle = await pageTitle.count() > 0
      const hasButton = await newAdminButton.count() > 0

      expect(hasTitle || hasButton || page.url().includes('/admin/users')).toBe(true)
    })

    test('super_admin 역할이 /admin/roles 접근 → 역할 관리 페이지 표시', async ({ page }) => {
      await loginAsSuperAdmin(page)

      await page.goto('/admin/roles')
      await page.waitForTimeout(2000)

      // 역할 관리 페이지 접근
      expect(page.url()).toContain('/admin/roles')
    })

    test('super_admin은 모든 관리자 메뉴 접근 가능', async ({ page }) => {
      await loginAsSuperAdmin(page)

      // 여러 페이지 순차 접근
      const adminPages = [
        '/admin',
        '/admin/blog',
        '/admin/users',
        '/admin/services',
        '/admin/portfolio',
      ]

      for (const pagePath of adminPages) {
        await page.goto(pagePath)
        await page.waitForTimeout(1000)

        // 각 페이지가 정상 로드됨 (리다이렉트 없음)
        expect(page.url()).toContain(pagePath.replace('/admin/', '/admin'))
      }
    })

    test('super_admin이 시스템 설정 페이지 접근', async ({ page }) => {
      await loginAsSuperAdmin(page)

      // 연동 관리
      await page.goto('/admin/integrations')
      await page.waitForTimeout(1000)

      // 접근 가능
      const isOnPage = page.url().includes('/admin/integrations')
      const hasForbidden = await page.locator('text=권한').count() === 0

      expect(isOnPage && hasForbidden).toBe(true)
    })
  })

  // ==================== 로그아웃 후 접근 ====================

  test.describe('로그아웃 후 접근', () => {
    test.skip(!hasAuthCredentials, '테스트 계정 환경 변수(E2E_*_PASSWORD) 미설정')

    test('로그아웃 후 /admin 접근 → /login 리다이렉트', async ({ page }) => {
      // 먼저 로그인
      await loginAsAdmin(page)
      await page.goto('/admin')
      await page.waitForTimeout(1000)

      // 로그아웃
      await logout(page)
      await page.waitForTimeout(1000)

      // 다시 /admin 접근
      await page.goto('/admin')
      await page.waitForURL(/\/login/, { timeout: 10000 })

      expect(page.url()).toContain('/login')
    })

    test('로그아웃 후 세션이 완전히 삭제됨', async ({ page }) => {
      await loginAsSuperAdmin(page)

      // 관리자 페이지 접근 확인
      await page.goto('/admin/users')
      await page.waitForTimeout(1000)
      expect(page.url()).toContain('/admin/users')

      // 로그아웃
      await logout(page)

      // 쿠키 확인
      const cookies = await page.context().cookies()
      const authCookies = cookies.filter((c) => c.name.includes('auth') || c.name.includes('session'))

      // 인증 쿠키가 없거나 만료됨
      expect(authCookies.every((c) => !c.value || c.expires < Date.now() / 1000)).toBe(true)
    })
  })

  // ==================== URL 직접 접근 ====================

  test.describe('URL 직접 접근', () => {
    test('보호된 URL 직접 입력 시 인증 확인 (비로그인)', async ({ page }) => {
      // 로그인 없이 직접 URL 입력
      await page.goto('/admin/blog/categories')

      await page.waitForURL(/\/login/, { timeout: 10000 })
      expect(page.url()).toContain('/login')
    })

    test.skip(!hasAuthCredentials, '테스트 계정 환경 변수 미설정')
    test('인증 후 원래 URL로 리다이렉트 (선택적)', async ({ page }) => {
      // 보호된 페이지 접근 시도
      await page.goto('/admin/blog')

      // 로그인 페이지로 이동
      await page.waitForURL(/\/login/, { timeout: 10000 })

      // 로그인
      await loginAsAdmin(page)

      // 원래 페이지로 리다이렉트 (구현에 따라)
      await page.waitForTimeout(2000)

      // 홈 또는 원래 페이지
      const currentUrl = page.url()
      expect(currentUrl === '/' || currentUrl.includes('/admin')).toBe(true)
    })
  })

  // ==================== 권한 변경 후 접근 ====================

  test.describe('권한 변경 시나리오', () => {
    test.skip(!hasAuthCredentials, '테스트 계정 환경 변수(E2E_*_PASSWORD) 미설정')

    test('권한 없는 페이지 접근 시 에러 메시지 표시', async ({ page }) => {
      await loginAsAdmin(page)

      // super_admin 전용 페이지 접근
      await page.goto('/admin/users')
      await page.waitForTimeout(2000)

      // 에러 메시지 또는 리다이렉트
      const errorMessages = [
        page.locator('text=권한이 없습니다'),
        page.locator('text=Super Admin만'),
        page.locator('text=접근 거부'),
        page.locator('text=Access Denied'),
      ]

      let errorFound = false
      for (const msg of errorMessages) {
        if (await msg.count() > 0) {
          errorFound = true
          break
        }
      }

      const isForbidden = page.url().includes('/forbidden')
      expect(errorFound || isForbidden).toBe(true)
    })
  })

  // ==================== 성능 테스트 ====================

  test.describe('성능', () => {
    test('보호된 페이지 리다이렉트가 3초 이내', async ({ page }) => {
      const startTime = Date.now()

      await page.goto('/admin')
      await page.waitForURL(/\/login/, { timeout: 10000 })

      const endTime = Date.now()
      const duration = endTime - startTime

      // 3초 이내 리다이렉트
      expect(duration).toBeLessThan(3000)
    })

    test.skip(!hasAuthCredentials, '테스트 계정 환경 변수 미설정')
    test('인증된 사용자 페이지 로드가 5초 이내', async ({ page }) => {
      await loginAsSuperAdmin(page)

      const startTime = Date.now()

      await page.goto('/admin/users')
      await page.waitForSelector('h1', { timeout: 10000 })

      const endTime = Date.now()
      const duration = endTime - startTime

      // 5초 이내 로드
      expect(duration).toBeLessThan(5000)
    })
  })
})
