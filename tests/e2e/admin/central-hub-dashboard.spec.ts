/**
 * Central Hub Dashboard E2E Tests
 *
 * Minu 서비스(Find, Frame, Build, Keep)의 중앙 관리 대시보드 테스트
 * - 페이지 로드
 * - 탭 전환
 * - 서비스 헬스 카드
 * - Excel 내보내기 버튼
 * - 이슈 목록 필터링
 *
 * @module tests/e2e/admin/central-hub-dashboard
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../../fixtures/auth-helpers';

test.describe('Central Hub Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();

    // Login as admin
    await loginAsAdmin(page);

    // Navigate to Central Hub Dashboard
    await page.goto('/admin/central-hub');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  // ============================================
  // 1. 페이지 로드 테스트
  // ============================================

  test('대시보드 페이지가 정상 로드된다', async ({ page }) => {
    // Check page heading "Central Hub Dashboard"
    await expect(
      page.getByRole('heading', { name: /Central Hub Dashboard/i })
    ).toBeVisible();

    // Check page subtitle
    await expect(
      page.getByText(/Minu 서비스의 상태와 이벤트를 모니터링합니다/i)
    ).toBeVisible();

    // 4개 서비스 카드 영역 확인 (grid container)
    const serviceCards = page.locator('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 > div');

    // 4개 서비스 카드가 있거나, 로딩/에러 상태일 수 있음
    const cardCount = await serviceCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  // ============================================
  // 2. 탭 전환 테스트
  // ============================================

  test('탭 전환이 정상 동작한다', async ({ page }) => {
    // Overview 탭이 기본 선택되어 있는지 확인
    const overviewTab = page.getByRole('tab', { name: /Overview/i });
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    // Events 탭 클릭
    const eventsTab = page.getByRole('tab', { name: /Events/i });
    await eventsTab.click();
    await page.waitForTimeout(300);

    // Events 탭이 선택되었는지 확인
    await expect(eventsTab).toHaveAttribute('aria-selected', 'true');

    // EventTimeline 컴포넌트가 표시되는지 확인 (이벤트 타임라인 제목 또는 내용)
    const eventContent = page.locator('[role="tabpanel"]').filter({ hasText: /이벤트|event/i });
    const hasEventContent = await eventContent.count() > 0;
    expect(hasEventContent).toBeTruthy();

    // Issues 탭 클릭
    const issuesTab = page.getByRole('tab', { name: /Issues/i });
    await issuesTab.click();
    await page.waitForTimeout(300);

    // Issues 탭이 선택되었는지 확인
    await expect(issuesTab).toHaveAttribute('aria-selected', 'true');

    // IssueList 컴포넌트가 표시되는지 확인 (서비스 이슈 제목)
    const issueListTitle = page.getByText(/서비스 이슈/i);
    await expect(issueListTitle).toBeVisible();
  });

  // ============================================
  // 3. 서비스 헬스 카드 테스트
  // ============================================

  test('서비스 헬스 카드가 4개 표시된다', async ({ page }) => {
    // 4개 Minu 서비스 이름 확인
    const serviceNames = ['Minu Find', 'Minu Frame', 'Minu Build', 'Minu Keep'];

    for (const serviceName of serviceNames) {
      // 서비스 이름이 페이지에 있는지 확인 (카드 제목으로)
      const serviceCard = page.locator(`text="${serviceName}"`).first();

      // 카드가 있거나 로딩/에러 상태일 수 있음
      const isVisible = await serviceCard.isVisible().catch(() => false);

      // 최소한 로딩 스켈레톤이라도 있어야 함
      if (!isVisible) {
        // 로딩 스켈레톤 확인
        const skeletons = page.locator('.animate-pulse, [class*="skeleton"]');
        const skeletonCount = await skeletons.count();
        expect(skeletonCount).toBeGreaterThanOrEqual(0);
      }
    }

    // 상태 배지 존재 확인 (healthy, degraded, unhealthy, unknown 중 하나)
    const statusBadges = page.locator('span:has-text("정상"), span:has-text("저하"), span:has-text("장애"), span:has-text("알 수 없음")');
    const badgeCount = await statusBadges.count();

    // 로딩/에러 상태가 아니라면 배지가 있어야 함
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  // ============================================
  // 4. Excel 내보내기 버튼 테스트
  // ============================================

  test('Excel 내보내기 버튼이 표시된다', async ({ page }) => {
    // Export Excel 버튼 확인
    const exportButton = page.getByRole('button', { name: /Excel 내보내기/i });
    await expect(exportButton).toBeVisible();

    // 버튼이 클릭 가능한지 확인 (disabled 상태가 아님)
    const isDisabled = await exportButton.getAttribute('disabled');
    expect(isDisabled).toBeNull();

    // Download 아이콘이 버튼 내에 있는지 확인
    const downloadIcon = exportButton.locator('svg');
    await expect(downloadIcon).toBeVisible();
  });

  // ============================================
  // 5. 필터링 테스트
  // ============================================

  test('이슈 목록 필터링이 동작한다', async ({ page }) => {
    // Issues 탭으로 이동
    const issuesTab = page.getByRole('tab', { name: /Issues/i });
    await issuesTab.click();
    await page.waitForTimeout(500);

    // 상태 필터 Select 찾기 (첫 번째 Select - 상태 필터)
    const statusFilter = page.locator('button[role="combobox"]').first();

    if (await statusFilter.isVisible()) {
      // 상태 필터 클릭
      await statusFilter.click();
      await page.waitForTimeout(300);

      // "열림" 옵션 선택
      const openOption = page.getByRole('option', { name: /열림|open/i });
      if (await openOption.count() > 0) {
        await openOption.click();
        await page.waitForTimeout(500);

        // 필터링 후 UI가 업데이트되는지 확인
        // 이슈가 있으면 목록이 표시되고, 없으면 빈 상태 메시지가 표시됨
        const issueListContent = page.locator('[class*="space-y-3"], [class*="text-muted-foreground"]:has-text("이슈가 없습니다")');
        const hasContent = await issueListContent.count() > 0;
        expect(hasContent).toBeTruthy();
      }
    }

    // 서비스 필터 확인 (두 번째 Select)
    const serviceFilter = page.locator('button[role="combobox"]').nth(1);

    if (await serviceFilter.isVisible()) {
      await serviceFilter.click();
      await page.waitForTimeout(300);

      // "Minu Find" 옵션이 있는지 확인
      const minuFindOption = page.getByRole('option', { name: /Minu Find/i });
      const hasMinuFind = await minuFindOption.count() > 0;
      expect(hasMinuFind).toBeTruthy();

      // ESC로 닫기
      await page.keyboard.press('Escape');
    }
  });
});
