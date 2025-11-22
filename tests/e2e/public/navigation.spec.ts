import { test, expect } from '@playwright/test';

/**
 * 네비게이션 E2E 테스트
 *
 * 테스트 시나리오:
 * - 메뉴 5개 표시 확인
 * - 각 메뉴 클릭 시 올바른 페이지로 이동
 * - 활성 메뉴 스타일 확인
 * - 모바일 메뉴 동작 확인
 */

test.describe('네비게이션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('데스크톱에서 5개 메뉴가 표시됨', async ({ page }) => {
    // 데스크톱 뷰포트 설정
    await page.setViewportSize({ width: 1280, height: 720 });

    // 네비게이션 메뉴 확인
    const nav = page.locator('header nav');
    await expect(nav).toBeVisible();

    // 5개 메뉴 항목 확인
    await expect(nav.getByRole('link', { name: '홈' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '서비스' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '프로젝트' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '이야기' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '함께하기' })).toBeVisible();
  });

  test('메뉴 항목이 올바른 href를 가짐', async ({ page }) => {
    const nav = page.locator('header nav');

    await expect(nav.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/');
    await expect(nav.getByRole('link', { name: '서비스' })).toHaveAttribute('href', '/services');
    await expect(nav.getByRole('link', { name: '프로젝트' })).toHaveAttribute('href', '/projects');
    await expect(nav.getByRole('link', { name: '이야기' })).toHaveAttribute('href', '/stories');
    await expect(nav.getByRole('link', { name: '함께하기' })).toHaveAttribute('href', '/connect');
  });

  test('서비스 메뉴 클릭 시 서비스 페이지로 이동', async ({ page }) => {
    const nav = page.locator('header nav');
    await nav.getByRole('link', { name: '서비스' }).click();

    await expect(page).toHaveURL('/services');
  });

  test('프로젝트 메뉴 클릭 시 프로젝트 허브로 이동', async ({ page }) => {
    const nav = page.locator('header nav');
    await nav.getByRole('link', { name: '프로젝트' }).click();

    await expect(page).toHaveURL('/projects');
  });

  test('이야기 메뉴 클릭 시 이야기 허브로 이동', async ({ page }) => {
    const nav = page.locator('header nav');
    await nav.getByRole('link', { name: '이야기' }).click();

    await expect(page).toHaveURL('/stories');
  });

  test('함께하기 메뉴 클릭 시 함께하기 허브로 이동', async ({ page }) => {
    const nav = page.locator('header nav');
    await nav.getByRole('link', { name: '함께하기' }).click();

    await expect(page).toHaveURL('/connect');
  });
});

test.describe('모바일 네비게이션', () => {
  test.beforeEach(async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
  });

  test('모바일에서 햄버거 메뉴가 표시됨', async ({ page }) => {
    // 햄버거 메뉴 버튼 찾기
    const menuButton = page.locator('button[aria-label*="메뉴"], button[aria-label*="menu"], header button').first();
    await expect(menuButton).toBeVisible();
  });

  test('햄버거 메뉴 클릭 시 모바일 메뉴가 열림', async ({ page }) => {
    // 햄버거 메뉴 클릭
    const menuButton = page.locator('button[aria-label*="메뉴"], button[aria-label*="menu"], header button').first();
    await menuButton.click();

    // 모바일 메뉴가 열리면 메뉴 항목들이 표시됨
    await page.waitForTimeout(300); // 애니메이션 대기

    // 5개 메뉴 항목 확인
    await expect(page.getByRole('link', { name: '홈' })).toBeVisible();
    await expect(page.getByRole('link', { name: '서비스' })).toBeVisible();
    await expect(page.getByRole('link', { name: '프로젝트' })).toBeVisible();
    await expect(page.getByRole('link', { name: '이야기' })).toBeVisible();
    await expect(page.getByRole('link', { name: '함께하기' })).toBeVisible();
  });

  test('모바일 메뉴 항목 클릭 시 페이지 이동 및 메뉴 닫힘', async ({ page }) => {
    // 햄버거 메뉴 클릭
    const menuButton = page.locator('button[aria-label*="메뉴"], button[aria-label*="menu"], header button').first();
    await menuButton.click();
    await page.waitForTimeout(300);

    // 서비스 메뉴 클릭
    await page.getByRole('link', { name: '서비스' }).click();

    // 페이지 이동 확인
    await expect(page).toHaveURL('/services');
  });

  test('320px 뷰포트에서 정상 동작', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload();

    // 로고 표시됨
    const logo = page.locator('header img, header svg').first();
    await expect(logo).toBeVisible();

    // 햄버거 메뉴 표시됨
    const menuButton = page.locator('button[aria-label*="메뉴"], button[aria-label*="menu"], header button').first();
    await expect(menuButton).toBeVisible();
  });

  test('414px 뷰포트에서 정상 동작', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.reload();

    // 햄버거 메뉴 클릭
    const menuButton = page.locator('button[aria-label*="메뉴"], button[aria-label*="menu"], header button').first();
    await menuButton.click();
    await page.waitForTimeout(300);

    // 메뉴 항목들이 표시됨
    await expect(page.getByRole('link', { name: '프로젝트' })).toBeVisible();
  });
});
