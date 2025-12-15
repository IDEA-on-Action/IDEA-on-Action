/**
 * Authentication Helper Functions for E2E Tests
 *
 * Provides reusable login functions for different user roles
 */

import { Page } from '@playwright/test';
import { testUsers, getLoginCredentials } from '../../fixtures/users';

/**
 * Login as admin user
 * @param page - Playwright page object
 */
export async function loginAsAdmin(page: Page) {
  const credentials = getLoginCredentials('admin');

  // First, go to home page to clear storage (prevents auto-redirect from /login)
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Clear all storage
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Now go to login page (user is logged out)
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Wait for login form to be visible
  await page.waitForSelector('input[placeholder="이메일 또는 아이디"]', { state: 'visible', timeout: 10000 });

  // Fill in login form (exact placeholder matching)
  await page.fill('input[placeholder="이메일 또는 아이디"]', credentials.email);
  await page.fill('input[placeholder="비밀번호"]', credentials.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation away from login page
  await page.waitForFunction(
    () => !globalThis.location.pathname.includes('/login'),
    { timeout: 15000 }
  );

  // Wait for authentication and admin status to be fetched (React Query)
  await page.waitForTimeout(2000);
}

/**
 * Login as regular user
 * @param page - Playwright page object
 */
export async function loginAsRegularUser(page: Page) {
  const credentials = getLoginCredentials('regularUser');

  // First, go to home page to clear storage (prevents auto-redirect from /login)
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Clear all storage
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Now go to login page (user is logged out)
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Wait for login form to be visible
  await page.waitForSelector('input[placeholder="이메일 또는 아이디"]', { state: 'visible', timeout: 10000 });

  // Fill in login form (exact placeholder matching)
  await page.fill('input[placeholder="이메일 또는 아이디"]', credentials.email);
  await page.fill('input[placeholder="비밀번호"]', credentials.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation away from login page
  await page.waitForFunction(
    () => !globalThis.location.pathname.includes('/login'),
    { timeout: 15000 }
  );

  // Wait for authentication to be established
  await page.waitForTimeout(2000);
}

/**
 * Login as editor user
 * @param page - Playwright page object
 */
export async function loginAsEditor(page: Page) {
  const credentials = getLoginCredentials('editor');

  // First, go to home page to clear storage (prevents auto-redirect from /login)
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Clear all storage
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Now go to login page (user is logged out)
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Wait for login form to be visible
  await page.waitForSelector('input[placeholder="이메일 또는 아이디"]', { state: 'visible', timeout: 10000 });

  // Fill in login form (exact placeholder matching)
  await page.fill('input[placeholder="이메일 또는 아이디"]', credentials.email);
  await page.fill('input[placeholder="비밀번호"]', credentials.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation away from login page
  await page.waitForFunction(
    () => !globalThis.location.pathname.includes('/login'),
    { timeout: 15000 }
  );

  // Wait for authentication to be established
  await page.waitForTimeout(2000);
}

/**
 * Login as super admin user
 * @param page - Playwright page object
 */
export async function loginAsSuperAdmin(page: Page) {
  const credentials = getLoginCredentials('superAdmin');

  // First, go to home page to clear storage (prevents auto-redirect from /login)
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Clear all storage
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Now go to login page (user is logged out)
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Wait for login form to be visible
  await page.waitForSelector('input[placeholder="이메일 또는 아이디"]', { state: 'visible', timeout: 15000 });

  // Fill in login form (exact placeholder matching)
  await page.fill('input[placeholder="이메일 또는 아이디"]', credentials.email);
  await page.fill('input[placeholder="비밀번호"]', credentials.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation away from login page (either home or admin)
  await page.waitForFunction(
    () => !globalThis.location.pathname.includes('/login'),
    { timeout: 15000 }
  );

  // Wait for authentication and admin status to be fetched (React Query)
  await page.waitForTimeout(2000);
}

/**
 * Logout current user
 * @param page - Playwright page object
 */
export async function logout(page: Page) {
  // Click on user avatar/menu
  await page.click('[data-testid="user-menu"], button[aria-label*="사용자"], button:has-text("로그아웃")');

  // Click logout button
  await page.click('button:has-text("로그아웃"), a:has-text("로그아웃")');

  // Wait for redirect to home or login page
  await page.waitForURL(/\/(login)?$/, { timeout: 5000 });
}

/**
 * Check if user is logged in
 * @param page - Playwright page object
 * @returns true if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check for user avatar or logout button
    const userMenu = await page.locator('[data-testid="user-menu"], button[aria-label*="사용자"]').count();
    return userMenu > 0;
  } catch {
    return false;
  }
}

/**
 * Check if user is admin
 * @param page - Playwright page object
 * @returns true if user is admin
 */
export async function isAdmin(page: Page): Promise<boolean> {
  try {
    // Try to navigate to admin page
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Check if we're still on admin page (not redirected to 403)
    const url = page.url();
    return url.includes('/admin') && !url.includes('403');
  } catch {
    return false;
  }
}
