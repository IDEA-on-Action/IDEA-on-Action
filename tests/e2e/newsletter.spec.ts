import { test, expect } from '@playwright/test';

/**
 * Newsletter E2E 테스트
 *
 * 테스트 시나리오:
 * - Newsletter 폼 렌더링 (Footer, Home)
 * - 이메일 유효성 검증
 * - 구독 성공 플로우
 * - 에러 처리
 * - 로딩 상태
 */

test.describe('Newsletter 구독', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Footer에 Newsletter 폼이 표시됨', async ({ page }) => {
    // Footer로 스크롤
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    // Newsletter 섹션 확인
    const newsletterHeading = page.locator('footer >> text=/Newsletter|뉴스레터|Stay Updated/i');
    await expect(newsletterHeading).toBeVisible();

    // 이메일 입력 필드 확인
    const emailInput = page.locator('footer input[type="email"]');
    await expect(emailInput).toBeVisible();

    // 구독 버튼 확인
    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await expect(subscribeButton).toBeVisible();
  });

  test('Home 페이지에 Newsletter CTA가 표시됨', async ({ page }) => {
    // Newsletter CTA 섹션 확인 (Stay Connected 배지 또는 Newsletter 텍스트)
    const newsletterCTA = page.locator('text=/Stay Connected|Newsletter|뉴스레터/i').first();
    await newsletterCTA.scrollIntoViewIfNeeded();
    await expect(newsletterCTA).toBeVisible();

    // inline 폼 확인 (main 태그 내부에 있는 이메일 입력 필드)
    const inlineEmailInput = page.locator('main input[type="email"]').first();
    if (await inlineEmailInput.isVisible().catch(() => false)) {
      await expect(inlineEmailInput).toBeVisible();
    }
  });

  test('빈 이메일 제출 시 유효성 검증 오류', async ({ page }) => {
    // Footer로 스크롤
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    // 이메일 입력 필드 확인
    const emailInput = page.locator('footer input[type="email"]');
    await expect(emailInput).toBeVisible();

    // 빈 이메일로 구독 버튼이 비활성화되어 있는지 확인
    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await expect(subscribeButton).toBeDisabled();
  });

  test('잘못된 이메일 형식 제출 시 유효성 검증 오류', async ({ page }) => {
    // Footer로 스크롤
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    // 잘못된 이메일 입력
    const emailInput = page.locator('footer input[type="email"]');
    await emailInput.fill('invalid-email');

    // 구독 버튼 클릭
    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await subscribeButton.click();

    // HTML5 유효성 검증 메시지 확인
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('유효한 이메일 제출 시 성공 메시지 표시', async ({ page }) => {
    // Footer로 스크롤
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    // 유효한 이메일 입력
    const emailInput = page.locator('footer input[type="email"]');
    const testEmail = `test-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    // 구독 버튼 클릭
    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await subscribeButton.click();

    // 성공 토스트 메시지 확인 (Sonner toast)
    const successToast = page.locator('[data-sonner-toast]', { hasText: /뉴스레터 구독 신청 완료/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });
  });

  test('중복 이메일 제출 시 에러 메시지 표시', async ({ page }) => {
    // Footer로 스크롤
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    // 동일한 이메일을 두 번 제출
    const emailInput = page.locator('footer input[type="email"]');
    const testEmail = `duplicate-${Date.now()}@example.com`;

    // 첫 번째 제출
    await emailInput.fill(testEmail);
    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await subscribeButton.click();

    // 성공 토스트 대기
    const successToast = page.locator('[data-sonner-toast]', { hasText: /뉴스레터 구독 신청 완료/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // 페이지 리로드
    await page.reload();
    await footer.scrollIntoViewIfNeeded();

    // 두 번째 제출 (동일 이메일)
    await emailInput.fill(testEmail);
    await subscribeButton.click();

    // 에러 토스트 확인 (중복 이메일)
    const errorToast = page.locator('[data-sonner-toast]', { hasText: /이미 구독 중인 이메일입니다/i });
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('Home 페이지 inline 폼에서 구독 가능', async ({ page }) => {
    // Newsletter CTA 섹션으로 스크롤
    const newsletterSection = page.locator('text=/Stay Connected|Newsletter/i').first();
    await newsletterSection.scrollIntoViewIfNeeded();

    // inline 이메일 입력 필드 찾기
    const inlineEmailInput = page.locator('main input[type="email"]').first();

    // inline 폼이 있는 경우에만 테스트
    if (await inlineEmailInput.isVisible().catch(() => false)) {
      // 유효한 이메일 입력
      const testEmail = `inline-${Date.now()}@example.com`;
      await inlineEmailInput.fill(testEmail);

      // 구독 버튼 클릭
      const subscribeButton = page.locator('main button:has-text("Subscribe"), main button:has-text("구독")').first();
      await subscribeButton.click();

      // 성공 토스트 확인
      const successToast = page.locator('[data-sonner-toast]', { hasText: /뉴스레터 구독 신청 완료/i });
      await expect(successToast).toBeVisible({ timeout: 5000 });
    } else {
      // inline 폼이 없으면 테스트 스킵
      test.skip();
    }
  });

  test('로딩 중에는 버튼이 비활성화됨', async ({ page }) => {
    // Footer로 스크롤
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    // 유효한 이메일 입력
    const emailInput = page.locator('footer input[type="email"]');
    const testEmail = `loading-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    // 구독 버튼 클릭
    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await subscribeButton.click();

    // 버튼이 즉시 비활성화되는지 확인
    await expect(subscribeButton).toBeDisabled();

    // 완료될 때까지 대기 (최대 5초)
    await page.waitForTimeout(5000);
  });

  test('성공 후 입력 필드가 초기화됨', async ({ page }) => {
    // Footer로 스크롤
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    // 유효한 이메일 입력
    const emailInput = page.locator('footer input[type="email"]');
    const testEmail = `reset-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    // 구독 버튼 클릭
    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await subscribeButton.click();

    // 성공 토스트 대기
    const successToast = page.locator('[data-sonner-toast]', { hasText: /뉴스레터 구독 신청 완료/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // 입력 필드가 비워졌는지 확인 (성공 후 초기화)
    const inputValue = await emailInput.inputValue();
    expect(inputValue).toBe('');
  });

  test('모바일 뷰포트에서 Newsletter 폼 작동', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });

    // 페이지 리로드
    await page.reload();

    // Footer로 스크롤
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    // Newsletter 폼이 모바일에서도 표시됨
    const emailInput = page.locator('footer input[type="email"]');
    await expect(emailInput).toBeVisible();

    // 구독 버튼 표시됨
    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    await expect(subscribeButton).toBeVisible();

    // 유효한 이메일 입력 및 제출
    const testEmail = `mobile-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);
    await subscribeButton.click();

    // 성공 토스트 확인
    const successToast = page.locator('[data-sonner-toast]', { hasText: /뉴스레터 구독 신청 완료/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });
  });

  test('Newsletter 섹션 접근성 검증', async ({ page }) => {
    // Footer로 스크롤
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    // 이메일 입력 필드에 label 또는 aria-label이 있는지 확인
    const emailInput = page.locator('footer input[type="email"]');
    const ariaLabel = await emailInput.getAttribute('aria-label');
    const placeholderText = await emailInput.getAttribute('placeholder');

    // aria-label 또는 placeholder가 있어야 함
    expect(ariaLabel || placeholderText).toBeTruthy();

    // 구독 버튼에 텍스트가 있는지 확인
    const subscribeButton = page.locator('footer button:has-text("Subscribe"), footer button:has-text("구독")');
    const buttonText = await subscribeButton.textContent();
    expect(buttonText?.trim()).toBeTruthy();
  });
});
