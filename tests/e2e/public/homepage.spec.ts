import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * 홈페이지 E2E 테스트
 *
 * 테스트 시나리오:
 * - 기본 렌더링 확인
 * - 모든 주요 섹션 존재 확인
 * - 네비게이션 기능
 * - 다크 모드 토글
 * - 접근성 검증
 */

test.describe('홈페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('페이지가 정상적으로 로드됨', async ({ page }) => {
    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/VIBE WORKING|생각과행동/);

    // 로고 확인
    const logo = page.locator('img[alt*="logo"]').first();
    await expect(logo).toBeVisible();
  });

  test('Hero 섹션이 표시됨', async ({ page }) => {
    // Hero 섹션 헤딩 확인
    const heroHeading = page.getByRole('heading', { level: 1 });
    await expect(heroHeading).toBeVisible();

    // CTA 버튼 확인
    const ctaButton = page.getByRole('link', { name: /시작하기|Get Started/i });
    await expect(ctaButton).toBeVisible();
  });

  test('Services 섹션이 표시됨', async ({ page }) => {
    // Services 섹션으로 스크롤
    await page.locator('text=서비스').first().scrollIntoViewIfNeeded();

    // 서비스 카드가 최소 1개 이상 존재
    const serviceCards = page.locator('[data-testid="service-card"]');
    await expect(serviceCards.first()).toBeVisible();
  });

  test('Features 섹션이 표시됨', async ({ page }) => {
    // Features 섹션 헤딩 확인
    const featuresHeading = page.getByRole('heading', { name: /특징|Features/i });
    await expect(featuresHeading).toBeVisible();
  });

  test('About 섹션이 표시됨', async ({ page }) => {
    // About 섹션 헤딩 확인
    const aboutHeading = page.getByRole('heading', { name: /소개|About/i });
    await expect(aboutHeading).toBeVisible();
  });

  test('Contact 섹션이 표시됨', async ({ page }) => {
    // Contact 섹션 헤딩 확인
    const contactHeading = page.getByRole('heading', { name: /연락|Contact/i });
    await expect(contactHeading).toBeVisible();

    // 이메일 링크 확인
    const emailLink = page.getByRole('link', { name: /sinclairseo@gmail.com/i });
    await expect(emailLink).toBeVisible();
  });

  test('Footer가 표시됨', async ({ page }) => {
    // Footer로 스크롤
    await page.locator('footer').scrollIntoViewIfNeeded();

    // 저작권 표시 확인
    const copyright = page.locator('text=/© 2025|생각과행동/i');
    await expect(copyright).toBeVisible();
  });

  test('네비게이션 메뉴가 작동함', async ({ page }) => {
    // 서비스 링크 클릭
    await page.getByRole('link', { name: /서비스|Services/i }).first().click();

    // URL 변경 확인 또는 섹션으로 스크롤 확인
    await page.waitForTimeout(500);

    // 서비스 섹션이 뷰포트에 표시됨
    const servicesSection = page.locator('text=서비스').first();
    await expect(servicesSection).toBeInViewport();
  });

  test('다크 모드 토글이 작동함', async ({ page }) => {
    // 테마 토글 버튼 찾기
    const themeToggle = page.getByRole('button', { name: /theme|테마/i });

    if (await themeToggle.isVisible()) {
      // 현재 테마 확인
      const htmlElement = page.locator('html');
      const initialClass = await htmlElement.getAttribute('class');

      // 테마 토글 클릭
      await themeToggle.click();

      // 테마 변경 확인 (dark 클래스 추가/제거)
      await page.waitForTimeout(300); // 애니메이션 대기
      const newClass = await htmlElement.getAttribute('class');

      expect(initialClass).not.toBe(newClass);
    }
  });

  test('모바일 뷰포트에서 정상 작동', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });

    // 페이지 리로드
    await page.reload();

    // 로고 여전히 표시됨
    const logo = page.locator('img[alt*="logo"]').first();
    await expect(logo).toBeVisible();

    // Hero 섹션 표시됨
    const heroHeading = page.getByRole('heading', { level: 1 });
    await expect(heroHeading).toBeVisible();
  });

  test('접근성 검증 (WCAG 2.1 AA)', async ({ page }) => {
    // Axe 접근성 테스트 실행
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // 위반 사항이 없어야 함
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('성능: 페이지 로드 시간 < 3초', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    // 3초 이내 로드 확인
    expect(loadTime).toBeLessThan(3000);
  });
});
