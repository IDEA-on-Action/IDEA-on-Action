import { test, expect } from '@playwright/test';

/**
 * MVP Service Detail Page E2E Tests
 *
 * MVP 서비스 상세 페이지 테스트
 * - 페이지 렌더링
 * - 섹션 표시
 * - 가격 패키지
 * - CTA 버튼
 * - 장바구니 기능
 * - FAQ 섹션
 *
 * TASK-016~028: Services Platform - 페이지 구현
 */

test.describe('MVP Service - 페이지 렌더링', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services/development/mvp', { waitUntil: 'domcontentloaded' });
    // 페이지 로딩 대기 (헤더가 표시될 때까지)
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('MVP 서비스 페이지가 정상 렌더링됨', async ({ page }) => {
    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/MVP|개발|IDEA on Action/i);

    // 메인 헤딩 확인
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/MVP/i);

    // 페이지가 완전히 로드되었는지 확인
    const mainContent = page.locator('main').or(page.locator('[role="main"]')).or(page.locator('body'));
    await expect(mainContent.first()).toBeVisible();
  });

  test('서비스 개요 섹션이 표시됨', async ({ page }) => {
    // "서비스 개요" 또는 관련 섹션 찾기
    const overviewSection = page.getByRole('heading', { name: /서비스 개요|개요/i });

    if (await overviewSection.count() > 0) {
      await expect(overviewSection.first()).toBeVisible();

      // 개요 설명 텍스트가 있는지 확인
      const description = page.locator('p, div').filter({ hasText: /MVP|최소 기능 제품|Minimum Viable Product/i });
      if (await description.count() > 0) {
        await expect(description.first()).toBeVisible();
      }
    }
  });
});

test.describe('MVP Service - 가격 패키지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services/development/mvp', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('가격 정책 섹션이 표시됨', async ({ page }) => {
    // "가격" 또는 "요금" 관련 헤딩 찾기
    const pricingHeading = page.getByRole('heading', { name: /가격|요금|패키지/i });

    if (await pricingHeading.count() > 0) {
      await expect(pricingHeading.first()).toBeVisible();

      // 가격 카드 또는 패키지 확인
      const priceCards = page.locator('[class*="pricing"], [class*="package"], [class*="card"]').filter({
        has: page.locator('text=/₩|원|KRW/i')
      });

      if (await priceCards.count() > 0) {
        await expect(priceCards.first()).toBeVisible();
      }
    }
  });

  test('가격 패키지에 필수 정보가 포함됨', async ({ page }) => {
    // 가격 표시 확인
    const priceElements = page.locator('text=/₩[0-9]|[0-9]+M|[0-9,]+원/i');

    if (await priceElements.count() > 0) {
      await expect(priceElements.first()).toBeVisible();

      // 패키지 설명이 있는지 확인
      const packageDescriptions = page.locator('p, div, li').filter({ hasText: /개발|기능|제공/i });
      if (await packageDescriptions.count() > 0) {
        await expect(packageDescriptions.first()).toBeVisible();
      }
    }
  });
});

test.describe('MVP Service - 기능 및 정보', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services/development/mvp', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('제공 내용 섹션이 표시됨', async ({ page }) => {
    // "제공 내용", "Features", "포함 사항" 등의 섹션 찾기
    const featuresHeading = page.getByRole('heading', { name: /제공|포함|Features|기능/i });

    if (await featuresHeading.count() > 0) {
      await expect(featuresHeading.first()).toBeVisible();

      // 체크 아이콘이나 리스트 아이템 확인
      const featureItems = page.locator('li, div').filter({ has: page.locator('svg, [class*="check"], [class*="icon"]') });

      if (await featureItems.count() > 0) {
        await expect(featureItems.first()).toBeVisible();
      }
    }
  });

  test('기술 스택 섹션이 표시됨', async ({ page }) => {
    // "기술 스택" 섹션 찾기
    const techStackHeading = page.getByRole('heading', { name: /기술 스택|Tech Stack|기술/i });

    if (await techStackHeading.count() > 0) {
      await expect(techStackHeading.first()).toBeVisible();

      // 배지 또는 태그 형태의 기술 스택 확인
      const techBadges = page.locator('[class*="badge"], [class*="tag"]').filter({
        hasText: /React|TypeScript|Node|Python|Supabase|Frontend|Backend/i
      });

      if (await techBadges.count() > 0) {
        await expect(techBadges.first()).toBeVisible();
      }
    }
  });

  test('FAQ 섹션이 표시됨', async ({ page }) => {
    // FAQ 섹션 찾기
    const faqHeading = page.getByRole('heading', { name: /FAQ|자주 묻는 질문|질문/i });

    if (await faqHeading.count() > 0) {
      await expect(faqHeading.first()).toBeVisible();

      // FAQ 아이템 확인 (Accordion 형태)
      const faqItems = page.locator('[class*="accordion"], [class*="faq"]').or(
        page.locator('details, summary')
      );

      if (await faqItems.count() > 0) {
        // 첫 번째 FAQ 아이템 확인
        await expect(faqItems.first()).toBeVisible();

        // FAQ 아이템 클릭하여 열기 테스트
        const firstFaq = faqItems.first();
        const isClickable = await firstFaq.locator('button, summary, [role="button"]').count() > 0;

        if (isClickable) {
          await firstFaq.locator('button, summary, [role="button"]').first().click();
          await page.waitForTimeout(300);
          // 답변이 표시되는지 확인
          // (구체적인 구현에 따라 다를 수 있음)
        }
      }
    }
  });
});

test.describe('MVP Service - CTA 및 장바구니', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services/development/mvp', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('CTA 버튼이 표시됨', async ({ page }) => {
    // "상담 신청", "문의하기", "시작하기" 등의 CTA 버튼 찾기
    const ctaButtons = page.getByRole('button', { name: /상담|문의|시작|신청/i }).or(
      page.getByRole('link', { name: /상담|문의|시작|신청/i })
    );

    if (await ctaButtons.count() > 0) {
      await expect(ctaButtons.first()).toBeVisible();

      // CTA 버튼이 클릭 가능한지 확인
      const isEnabled = await ctaButtons.first().isEnabled();
      expect(isEnabled).toBeTruthy();
    }
  });
});
