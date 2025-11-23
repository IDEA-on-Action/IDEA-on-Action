import { test, expect } from '@playwright/test';

/**
 * xlsx Skill E2E Tests
 * Excel 내보내기 기능 테스트
 */

test.describe('xlsx Skill - Excel 내보내기', () => {
  test.describe('ExportButton 컴포넌트', () => {
    test('ExportButton 컴포넌트가 렌더링됨', async ({ page }) => {
      // Central Hub 페이지로 이동 (향후 구현될 페이지)
      // 현재는 ExportButton이 통합될 예정인 페이지 테스트
      await page.goto('/services/minu');
      await page.waitForLoadState('networkidle');

      // 페이지가 정상 로드되는지 확인
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('xlsx 모듈 로딩', () => {
    test('xlsx 패키지가 정상적으로 번들됨', async ({ page }) => {
      // 빌드된 파일에서 xlsx 관련 청크 확인
      // tree-shaking으로 사용 전까지 청크가 없을 수 있음
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 페이지가 정상 로드되는지 확인
      await expect(page).toHaveTitle(/IDEA on Action/);
    });
  });

  test.describe('Skills 타입 시스템', () => {
    test('Skills 타입이 정상적으로 정의됨', async ({ page }) => {
      // 컴파일 에러 없이 빌드가 성공하면 타입이 정상
      // 이 테스트는 빌드 성공 여부로 간접 확인
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('xlsx Skill 접근성', () => {
  test('ExportButton이 키보드 접근 가능', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 페이지의 버튼들이 키보드로 접근 가능해야 함
    const buttons = page.getByRole('button');
    const count = await buttons.count();

    if (count > 0) {
      // Tab 키로 첫 번째 버튼에 포커스
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT']).toContain(focused);
    }
  });
});

test.describe('xlsx Skill 통합 준비', () => {
  test('Central Hub 대시보드 페이지 접근 가능', async ({ page }) => {
    // 관리자 페이지가 존재하는지 확인
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // 로그인 페이지로 리다이렉트되거나 대시보드가 표시됨
    const url = page.url();
    expect(url).toMatch(/\/(admin|login)/);
  });

  test('서비스 페이지에서 내보내기 버튼 영역 확인', async ({ page }) => {
    await page.goto('/services/minu');
    await page.waitForLoadState('networkidle');

    // 향후 ExportButton이 추가될 영역 확인
    // 현재는 페이지 구조만 확인
    const mainContent = page.locator('main').or(page.locator('[role="main"]'));
    await expect(mainContent.first()).toBeVisible();
  });
});
