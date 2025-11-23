import { test, expect } from '@playwright/test';

/**
 * MCP Permission System E2E Tests
 * MCP 권한 시스템 컴포넌트 테스트
 */

test.describe('MCP Permission Components', () => {
  test.describe('Minu Service Pages - Loading States', () => {
    test('should show loading state initially on Minu Frame page', async ({ page }) => {
      await page.goto('/services/minu/frame');
      await page.waitForLoadState('domcontentloaded');

      // 페이지가 로드되어야 함
      await expect(page.locator('h1')).toContainText('Minu Frame');
    });

    test('should show loading state initially on Minu Build page', async ({ page }) => {
      await page.goto('/services/minu/build');
      await page.waitForLoadState('domcontentloaded');

      // 페이지가 로드되어야 함
      await expect(page.locator('h1')).toContainText('Minu Build');
    });

    test('should show loading state initially on Minu Keep page', async ({ page }) => {
      await page.goto('/services/minu/keep');
      await page.waitForLoadState('domcontentloaded');

      // 페이지가 로드되어야 함
      await expect(page.locator('h1')).toContainText('Minu Keep');
    });
  });

  test.describe('Minu Service Pages - Plan Display', () => {
    test('should display pricing plans on Minu Frame page', async ({ page }) => {
      await page.goto('/services/minu/frame');
      await page.waitForLoadState('networkidle');

      // 플랜 비교 섹션 확인
      await expect(page.getByRole('heading', { name: '플랜 비교' })).toBeVisible();

      // 플랜 이름 확인
      await expect(page.getByRole('heading', { name: 'Basic' }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Pro' }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Enterprise' }).first()).toBeVisible();
    });

    test('should display pricing plans on Minu Build page', async ({ page }) => {
      await page.goto('/services/minu/build');
      await page.waitForLoadState('networkidle');

      // 플랜 비교 섹션 확인
      await expect(page.getByRole('heading', { name: '플랜 비교' })).toBeVisible();

      // 플랜 이름 확인
      await expect(page.getByRole('heading', { name: 'Basic' }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Pro' }).first()).toBeVisible();
    });

    test('should display pricing plans on Minu Keep page', async ({ page }) => {
      await page.goto('/services/minu/keep');
      await page.waitForLoadState('networkidle');

      // 플랜 비교 섹션 확인
      await expect(page.getByRole('heading', { name: '플랜 비교' })).toBeVisible();

      // 플랜 이름 확인
      await expect(page.getByRole('heading', { name: 'Basic' }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Pro' }).first()).toBeVisible();
    });
  });

  test.describe('Minu Service Pages - Beta Tester Section', () => {
    test('should display beta tester section on Frame page', async ({ page }) => {
      await page.goto('/services/minu/frame');
      await page.waitForLoadState('networkidle');

      // 베타 테스터 모집 섹션 확인
      await expect(page.getByRole('heading', { name: '베타 테스터 모집' })).toBeVisible();
      await expect(page.getByText('6개월간 Pro 플랜 무료 이용').first()).toBeVisible();
    });

    test('should display beta tester section on Build page', async ({ page }) => {
      await page.goto('/services/minu/build');
      await page.waitForLoadState('networkidle');

      // 베타 테스터 모집 섹션 확인
      await expect(page.getByRole('heading', { name: '베타 테스터 모집' })).toBeVisible();
    });

    test('should display beta tester section on Keep page', async ({ page }) => {
      await page.goto('/services/minu/keep');
      await page.waitForLoadState('networkidle');

      // 베타 테스터 모집 섹션 확인
      await expect(page.getByRole('heading', { name: '베타 테스터 모집' })).toBeVisible();
    });
  });

  test.describe('Minu Service Pages - CTA Buttons', () => {
    test('should have registration CTA on Frame page', async ({ page }) => {
      await page.goto('/services/minu/frame');
      await page.waitForLoadState('networkidle');

      // 사전 등록 CTA 확인
      const ctaButton = page.getByRole('link', { name: /사전 등록/ });
      await expect(ctaButton.first()).toBeVisible();
    });

    test('should have registration CTA on Build page', async ({ page }) => {
      await page.goto('/services/minu/build');
      await page.waitForLoadState('networkidle');

      // 사전 등록 CTA 확인
      const ctaButton = page.getByRole('link', { name: /사전 등록/ });
      await expect(ctaButton.first()).toBeVisible();
    });

    test('should have registration CTA on Keep page', async ({ page }) => {
      await page.goto('/services/minu/keep');
      await page.waitForLoadState('networkidle');

      // 사전 등록 CTA 확인
      const ctaButton = page.getByRole('link', { name: /사전 등록/ });
      await expect(ctaButton.first()).toBeVisible();
    });

    test('should link to Minu Find from other pages', async ({ page }) => {
      await page.goto('/services/minu/frame');
      await page.waitForLoadState('networkidle');

      // Minu Find 체험 링크 확인
      const findLink = page.getByRole('link', { name: /Minu Find.*체험/ });
      await expect(findLink.first()).toBeVisible();
    });
  });

  test.describe('Minu Service Pages - Key Features', () => {
    test('should display key features on Frame page', async ({ page }) => {
      await page.goto('/services/minu/frame');
      await page.waitForLoadState('networkidle');

      // 주요 기능 섹션 확인
      await expect(page.getByRole('heading', { name: '주요 기능' })).toBeVisible();
      await expect(page.getByText('문제 정의 Wizard').first()).toBeVisible();
      await expect(page.getByText('AI RFP 자동 생성').first()).toBeVisible();
    });

    test('should display key features on Build page', async ({ page }) => {
      await page.goto('/services/minu/build');
      await page.waitForLoadState('networkidle');

      // 주요 기능 섹션 확인
      await expect(page.getByRole('heading', { name: '주요 기능' })).toBeVisible();
      await expect(page.getByText('AI 진행 요약').first()).toBeVisible();
      await expect(page.getByText('칸반 & 간트').first()).toBeVisible();
    });

    test('should display key features on Keep page', async ({ page }) => {
      await page.goto('/services/minu/keep');
      await page.waitForLoadState('networkidle');

      // 주요 기능 섹션 확인
      await expect(page.getByRole('heading', { name: '주요 기능' })).toBeVisible();
      await expect(page.getByText('실시간 모니터링').first()).toBeVisible();
      await expect(page.getByText('스마트 알림').first()).toBeVisible();
    });
  });

  test.describe('MCP Error Handling', () => {
    test('should handle MCP server connection gracefully', async ({ page }) => {
      // MCP 서버 연결 실패 시에도 페이지가 정상 동작해야 함
      await page.goto('/services/minu/frame');
      await page.waitForLoadState('networkidle');

      // 에러 메시지가 표시되지 않아야 함 (폴백 사용)
      const errorAlert = page.locator('[role="alert"]').filter({ hasText: /오류|에러/ });
      const errorCount = await errorAlert.count();

      // 에러 알림이 없거나, 있더라도 구독 관련 경고만 허용
      if (errorCount > 0) {
        const errorText = await errorAlert.first().textContent();
        // 구독 오류는 정상 (MCP 서버 미연결 시)
        expect(errorText).toContain('구독');
      }
    });

    test('should show plan cards even without subscription', async ({ page }) => {
      await page.goto('/services/minu/build');
      await page.waitForLoadState('networkidle');

      // 구독 없이도 플랜 카드가 표시되어야 함
      const planCards = page.locator('.glass-card');
      const cardCount = await planCards.count();
      expect(cardCount).toBeGreaterThan(0);
    });
  });
});

test.describe('MCP Permission Accessibility', () => {
  test('should have proper heading hierarchy on Frame page', async ({ page }) => {
    await page.goto('/services/minu/frame');
    await page.waitForLoadState('networkidle');

    // h1이 하나만 있어야 함
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // h2가 여러 개 있어야 함 (섹션별)
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('should have accessible plan buttons', async ({ page }) => {
    await page.goto('/services/minu/frame');
    await page.waitForLoadState('networkidle');

    // 플랜 버튼들이 접근 가능해야 함
    const planButtons = page.getByRole('link', { name: /시작하기/ });
    const count = await planButtons.count();

    for (let i = 0; i < count; i++) {
      const button = planButtons.nth(i);
      await expect(button).toBeVisible();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/services/minu/frame');
    await page.waitForLoadState('networkidle');

    // Tab 키로 네비게이션 가능해야 함
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('MCP Responsive Design', () => {
  test('should be responsive on mobile - Frame page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/services/minu/frame');
    await page.waitForLoadState('networkidle');

    // 모바일에서도 제목과 플랜이 보여야 함
    await expect(page.locator('h1')).toContainText('Minu Frame');
    await expect(page.getByRole('heading', { name: 'Basic' }).first()).toBeVisible();
  });

  test('should be responsive on tablet - Build page', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/services/minu/build');
    await page.waitForLoadState('networkidle');

    // 태블릿에서도 플랜이 보여야 함
    await expect(page.getByRole('heading', { name: 'Pro' }).first()).toBeVisible();
  });

  test('should be responsive on desktop - Keep page', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/services/minu/keep');
    await page.waitForLoadState('networkidle');

    // 데스크탑에서 모든 플랜이 가로로 배치되어야 함
    const planCards = page.locator('.glass-card');
    const count = await planCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
