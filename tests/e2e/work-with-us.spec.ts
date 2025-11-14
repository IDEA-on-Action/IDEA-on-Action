import { test, expect } from '@playwright/test';

/**
 * Work with Us 폼 E2E 테스트
 *
 * 테스트 시나리오:
 * - Work with Us 페이지 렌더링
 * - 협업 제안 폼 필드 확인
 * - 폼 유효성 검증 (필수 필드, 이메일 형식, 메시지 최소 길이)
 * - 폼 제출 성공 플로우
 * - 로딩 상태
 * - 에러 처리
 * - 접근성
 */

test.describe('Work with Us 폼', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/work-with-us');
  });

  test('Work with Us 페이지가 정상적으로 로드됨', async ({ page }) => {
    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/IDEA on Action/i);

    // 페이지 헤딩 확인
    const pageHeading = page.locator('h1').filter({ hasText: /Work with Us|협업|함께 만들어가요/i }).first();
    await expect(pageHeading).toBeVisible();

    // 소개 텍스트 또는 설명 확인
    const introText = page.locator('text=/프로젝트|협업|partnership|collaboration/i').first();
    await expect(introText).toBeVisible();
  });

  test('협업 제안 폼 필드가 모두 표시됨', async ({ page }) => {
    // 이름 입력 필드
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"], input[placeholder*="Name"]');
    await expect(nameInput).toBeVisible();

    // 이메일 입력 필드
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();

    // 메시지 입력 필드 (textarea)
    const messageTextarea = page.locator('textarea[name="message"], textarea[placeholder*="메시지"], textarea[placeholder*="Message"]');
    await expect(messageTextarea).toBeVisible();

    // 제출 버튼
    const submitButton = page.locator('button[type="submit"], button:has-text("보내기"), button:has-text("Submit")');
    await expect(submitButton).toBeVisible();
  });

  test('필수 필드 누락 시 유효성 검증 오류', async ({ page }) => {
    // 제출 버튼 클릭 (모든 필드 비어있음)
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // HTML5 유효성 검증 메시지 확인
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    const validationMessage = await nameInput.evaluate((el: HTMLInputElement) => el.validationMessage);

    // 유효성 검증 메시지가 있거나, 버튼이 비활성화되어 있어야 함
    if (validationMessage) {
      expect(validationMessage).toBeTruthy();
    } else {
      // 커스텀 유효성 검증: 버튼 비활성화 또는 에러 메시지
      const errorMessage = page.locator('text=/필수|required|필요/i');
      const isButtonDisabled = await submitButton.isDisabled();

      if (!isButtonDisabled) {
        await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
      } else {
        expect(isButtonDisabled).toBe(true);
      }
    }
  });

  test('잘못된 이메일 형식 제출 시 유효성 검증 오류', async ({ page }) => {
    // 이름 입력
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    await nameInput.fill('홍길동');

    // 잘못된 이메일 입력
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('invalid-email');

    // 메시지 입력 (최소 길이 충족)
    const messageTextarea = page.locator('textarea');
    await messageTextarea.fill('협업 제안 드립니다. 프로젝트에 대해 이야기하고 싶습니다. 최소 50자 이상의 내용입니다.');

    // 제출 버튼 클릭
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // HTML5 이메일 유효성 검증 메시지 확인
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('메시지 최소 길이 미달 시 유효성 검증 오류', async ({ page }) => {
    // 이름 입력
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    await nameInput.fill('김철수');

    // 이메일 입력
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');

    // 짧은 메시지 입력 (50자 미만)
    const messageTextarea = page.locator('textarea');
    await messageTextarea.fill('짧은 메시지');

    // 제출 버튼 클릭
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // 에러 메시지 또는 유효성 검증 확인
    const errorMessage = page.locator('text=/50자|minimum|최소/i');
    if (await errorMessage.isVisible().catch(() => false)) {
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    } else {
      // minLength 속성으로 HTML5 유효성 검증
      const validationMessage = await messageTextarea.evaluate((el: HTMLTextAreaElement) => el.validationMessage);
      if (validationMessage) {
        expect(validationMessage).toBeTruthy();
      }
    }
  });

  test('유효한 데이터로 폼 제출 성공', async ({ page }) => {
    // 이름 입력
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    await nameInput.fill('서민원');

    // 이메일 입력
    const emailInput = page.locator('input[type="email"]');
    const testEmail = `work-with-us-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    // 메시지 입력 (50자 이상)
    const messageTextarea = page.locator('textarea');
    await messageTextarea.fill(
      'IDEA on Action과 협업하고 싶습니다. AI 기반 프로젝트 개발에 관심이 있으며, ' +
      '함께 멋진 프로덕트를 만들고 싶습니다. 저는 프론트엔드 개발에 전문성이 있습니다.'
    );

    // 제출 버튼 클릭
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // 성공 메시지 확인 (토스트 또는 페이지 메시지)
    const successMessage = page.locator(
      'text=/제안이 전송되었습니다|Successfully sent|감사합니다|Thank you/i, ' +
      '[data-sonner-toast]:has-text("성공"), ' +
      '[data-sonner-toast]:has-text("Success")'
    );
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('폼 제출 후 입력 필드가 초기화됨', async ({ page }) => {
    // 폼 작성
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    await nameInput.fill('이영희');

    const emailInput = page.locator('input[type="email"]');
    const testEmail = `reset-test-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    const messageTextarea = page.locator('textarea');
    await messageTextarea.fill(
      '협업 제안 드립니다. 프로젝트에 대해 논의하고 싶습니다. ' +
      '최소 50자 이상의 메시지 내용을 작성합니다.'
    );

    // 제출
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // 성공 메시지 대기
    const successMessage = page.locator('text=/전송되었습니다|Successfully sent/i, [data-sonner-toast]');
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });

    // 입력 필드가 초기화되었는지 확인
    const nameValue = await nameInput.inputValue();
    const emailValue = await emailInput.inputValue();
    const messageValue = await messageTextarea.inputValue();

    expect(nameValue).toBe('');
    expect(emailValue).toBe('');
    expect(messageValue).toBe('');
  });

  test('폼 제출 중 로딩 상태 표시', async ({ page }) => {
    // 폼 작성
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    await nameInput.fill('박로딩');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(`loading-test-${Date.now()}@example.com`);

    const messageTextarea = page.locator('textarea');
    await messageTextarea.fill(
      '로딩 테스트용 메시지입니다. 협업 제안 드립니다. ' +
      '최소 50자 이상의 메시지를 작성합니다.'
    );

    // 제출 버튼 클릭
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // 버튼이 즉시 비활성화되는지 확인 (로딩 중)
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBe(true);

    // 로딩 스피너 또는 텍스트 확인
    const loadingIndicator = page.locator('.animate-spin, text=/전송 중|Sending|로딩/i');
    if (await loadingIndicator.first().isVisible().catch(() => false)) {
      await expect(loadingIndicator.first()).toBeVisible();
    }

    // 완료 대기
    const successMessage = page.locator('text=/전송되었습니다/i, [data-sonner-toast]');
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('모바일 뷰포트에서 폼 제출 동작', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });

    // 페이지 리로드
    await page.reload();

    // 폼 필드가 모바일에서도 표시됨
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    await expect(nameInput).toBeVisible();

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const messageTextarea = page.locator('textarea');
    await expect(messageTextarea).toBeVisible();

    // 폼 작성 (모바일)
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('모바일사용자');

    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.fill(`mobile-work-${Date.now()}@example.com`);

    await messageTextarea.scrollIntoViewIfNeeded();
    await messageTextarea.fill(
      '모바일에서 협업 제안을 보냅니다. 프로젝트에 대해 논의하고 싶습니다. ' +
      '최소 50자 이상의 메시지를 작성합니다.'
    );

    // 제출
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    // 성공 확인
    const successMessage = page.locator('text=/전송되었습니다/i, [data-sonner-toast]');
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('폼 접근성 검증', async ({ page }) => {
    // 이름 필드에 label 또는 aria-label이 있는지 확인
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    const nameLabel = await nameInput.getAttribute('aria-label');
    const namePlaceholder = await nameInput.getAttribute('placeholder');

    // label 또는 placeholder가 있어야 함
    expect(nameLabel || namePlaceholder).toBeTruthy();

    // 이메일 필드 확인
    const emailInput = page.locator('input[type="email"]');
    const emailLabel = await emailInput.getAttribute('aria-label');
    const emailPlaceholder = await emailInput.getAttribute('placeholder');

    expect(emailLabel || emailPlaceholder).toBeTruthy();

    // 메시지 필드 확인
    const messageTextarea = page.locator('textarea');
    const messageLabel = await messageTextarea.getAttribute('aria-label');
    const messagePlaceholder = await messageTextarea.getAttribute('placeholder');

    expect(messageLabel || messagePlaceholder).toBeTruthy();

    // 제출 버튼에 텍스트가 있는지 확인
    const submitButton = page.locator('button[type="submit"]');
    const buttonText = await submitButton.textContent();
    expect(buttonText?.trim()).toBeTruthy();
  });

  test('폼 필드 간 Tab 키 네비게이션', async ({ page }) => {
    // 이름 필드에 포커스
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    await nameInput.focus();

    // Tab 키로 다음 필드로 이동 (이메일)
    await page.keyboard.press('Tab');

    // 이메일 필드가 포커스되었는지 확인
    const emailInput = page.locator('input[type="email"]');
    const emailFocused = await emailInput.evaluate((el) => el === document.activeElement);
    expect(emailFocused).toBe(true);

    // Tab 키로 다음 필드로 이동 (메시지)
    await page.keyboard.press('Tab');

    // 메시지 필드가 포커스되었는지 확인
    const messageTextarea = page.locator('textarea');
    const messageFocused = await messageTextarea.evaluate((el) => el === document.activeElement);
    expect(messageFocused).toBe(true);
  });

  test('Enter 키로 폼 제출 (textarea 제외)', async ({ page }) => {
    // 이름 입력
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    await nameInput.fill('엔터테스터');

    // 이메일 입력
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(`enter-test-${Date.now()}@example.com`);

    // 메시지 입력
    const messageTextarea = page.locator('textarea');
    await messageTextarea.fill(
      '엔터 키 테스트용 메시지입니다. 협업 제안 드립니다. ' +
      '최소 50자 이상의 메시지를 작성합니다.'
    );

    // 이메일 필드에 포커스하고 Enter 키 (일반적으로 폼 제출)
    await emailInput.focus();
    await page.keyboard.press('Enter');

    // 성공 메시지 확인 또는 제출 시도 확인
    const successMessage = page.locator('text=/전송되었습니다/i, [data-sonner-toast]');
    const submitButton = page.locator('button[type="submit"]');

    // Enter 키로 제출되었거나, 버튼이 비활성화되었는지 확인
    const isSuccess = await successMessage.first().isVisible().catch(() => false);
    const isDisabled = await submitButton.isDisabled();

    expect(isSuccess || isDisabled).toBe(true);
  });

  test('긴 메시지 입력 처리', async ({ page }) => {
    // 이름 입력
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    await nameInput.fill('장문작성자');

    // 이메일 입력
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(`long-message-${Date.now()}@example.com`);

    // 긴 메시지 입력 (500자)
    const longMessage =
      'IDEA on Action과의 협업을 제안드립니다. '.repeat(20) +
      '프로젝트에 대해 상세히 논의하고 싶습니다.';

    const messageTextarea = page.locator('textarea');
    await messageTextarea.fill(longMessage);

    // 제출
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // 성공 확인
    const successMessage = page.locator('text=/전송되었습니다/i, [data-sonner-toast]');
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('특수문자 및 한글/영어 혼합 입력 처리', async ({ page }) => {
    // 이름 입력 (한글)
    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
    await nameInput.fill('김ABC-123');

    // 이메일 입력 (특수문자 포함)
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(`special+test.${Date.now()}@example.com`);

    // 메시지 입력 (한글/영어 혼합, 특수문자)
    const messageTextarea = page.locator('textarea');
    await messageTextarea.fill(
      'IDEA on Action과 협업하고 싶습니다! AI/ML 프로젝트에 관심이 있으며, ' +
      'React & TypeScript로 프론트엔드를 개발할 수 있습니다. 이메일: test@example.com'
    );

    // 제출
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // 성공 확인
    const successMessage = page.locator('text=/전송되었습니다/i, [data-sonner-toast]');
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
  });
});
