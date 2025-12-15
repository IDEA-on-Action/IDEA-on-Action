import { test, expect } from '@playwright/test';

/**
 * 로그인 E2E 테스트
 *
 * 테스트 시나리오:
 * - 로그인 페이지 접근
 * - 이메일/비밀번호 로그인
 * - 아이디로 로그인 (자동 이메일 변환)
 * - OAuth 로그인 버튼 확인
 * - 로그인 후 리다이렉트
 * - 로그아웃
 */

test.describe('인증: 로그인', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('로그인 페이지가 표시됨', async ({ page }) => {
    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/로그인|Login|Sign In|IDEA on Action/i);

    // 로그인 폼 확인
    const emailInput = page.locator('input[type="text"], input[type="email"]').first();
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    // 로그인 버튼 확인 (제출 버튼)
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();
  });

  test('OAuth 로그인 버튼이 표시됨', async ({ page }) => {
    // Google 로그인 버튼
    const googleButton = page.getByRole('button', { name: /Google|구글/i });
    await expect(googleButton).toBeVisible();

    // GitHub 로그인 버튼
    const githubButton = page.getByRole('button', { name: /GitHub|깃허브/i });
    await expect(githubButton).toBeVisible();

    // Kakao 로그인 버튼 (선택적)
    const kakaoButton = page.getByRole('button', { name: /Kakao|카카오/i });
    if (await kakaoButton.count() > 0) {
      await expect(kakaoButton.first()).toBeVisible();
    }
  });

  test('빈 폼 제출 시 검증 오류', async ({ page }) => {
    // 로그인 버튼 클릭 (빈 폼)
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();

    // 오류 메시지 또는 HTML5 validation 확인
    const emailInput = page.locator('input[type="text"], input[type="email"]').first();
    const isRequired = await emailInput.evaluate(el => (el as HTMLInputElement).required);
    expect(isRequired).toBeTruthy();
  });

  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    // 존재하지 않는 계정으로 로그인 시도
    await page.locator('input[type="text"], input[type="email"]').first().fill('nonexistent@test.com');
    await page.locator('input[type="password"]').first().fill('wrongpassword');

    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();

    // 오류 메시지 확인 (toast, alert, inline error 등)
    await page.waitForTimeout(2000); // 로그인 처리 대기

    // 여전히 로그인 페이지에 있거나 오류 메시지 표시
    const errorSelectors = [
      'text=/invalid|incorrect|error|실패|오류/i',
      '[role="alert"]',
      '.error',
      '.text-destructive'
    ];

    let errorFound = false;
    for (const selector of errorSelectors) {
      if (await page.locator(selector).count() > 0) {
        errorFound = true;
        break;
      }
    }

    // 오류 메시지가 있거나 여전히 로그인 페이지에 있음
    const stillOnLoginPage = page.url().includes('/login');
    expect(errorFound || stillOnLoginPage).toBeTruthy();
  });

  test('로그인 페이지에서 홈으로 돌아가기', async ({ page }) => {
    // 홈으로 가기 링크/버튼 찾기
    const homeLink = page.locator('a[href="/"], a[href="/#"]').first();

    if (await homeLink.isVisible()) {
      await homeLink.click();
      await page.waitForURL('/');
      expect(page.url()).toMatch(/\/$|\/$/);
    }
  });

  test('로그인 후 보호된 페이지 접근', async ({ page }) => {
    // 관리자 페이지에 직접 접근 시도 (로그인 안한 상태)
    await page.goto('/admin');

    // 로그인 페이지로 리다이렉트되어야 함
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/login/);
  });
});

test.describe('인증: 로그아웃', () => {
  test('로그아웃 기능 테스트 (수동 로그인 필요)', async ({ page }) => {
    // 홈페이지로 이동
    await page.goto('/');

    // 로그인 버튼이 표시되는지 확인 (로그아웃 상태)
    const loginButton = page.getByRole('link', { name: /로그인|Login/i });
    const profileAvatar = page.locator('button >> img, button >> svg').filter({ hasText: '' });

    const isLoggedOut = await loginButton.isVisible().catch(() => false);
    const isLoggedIn = await profileAvatar.count().then(c => c > 0);

    if (isLoggedIn) {
      // 프로필 메뉴 클릭
      await profileAvatar.first().click();

      // 로그아웃 버튼 클릭
      const logoutButton = page.getByRole('menuitem', { name: /로그아웃|Logout|Sign Out/i });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();

        // 로그아웃 후 로그인 버튼이 다시 표시됨
        await page.waitForTimeout(1000);
        await expect(page.getByRole('link', { name: /로그인|Login/i })).toBeVisible();
      }
    } else {
      // 이미 로그아웃 상태
      test.skip();
    }
  });
});
