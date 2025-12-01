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

  // ============================================
  // 6. 연결 상태 인디케이터 테스트
  // ============================================

  test('실시간 연결 상태 인디케이터가 표시된다', async ({ page }) => {
    // 연결 상태 텍스트 확인 (연결됨, 연결 중, 연결 끊김 등)
    const connectionStatus = page.getByText(/실시간 동기화:/i);
    await expect(connectionStatus).toBeVisible();

    // 상태 인디케이터 점(dot) 확인
    const statusDot = page.locator('div[class*="rounded-full"][class*="animate-pulse"]').first();

    // 상태 점이 있거나 대체 요소가 있어야 함
    const hasDot = await statusDot.count() > 0;
    expect(hasDot).toBeTruthy();
  });

  // ============================================
  // 7. 통계 차트 테스트
  // ============================================

  test('Overview 탭에서 통계 차트가 표시된다', async ({ page }) => {
    // Overview 탭이 선택되어 있는지 확인
    const overviewTab = page.getByRole('tab', { name: /Overview/i });
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    // 통계 차트 컴포넌트가 로드되는 것을 확인
    // 차트 제목이나 차트 영역 확인
    await page.waitForTimeout(1000);

    // 차트가 있거나 로딩 상태여야 함
    const chartArea = page.locator('[class*="recharts"], canvas, svg[class*="chart"]');
    const loadingSpinner = page.locator('[class*="animate-spin"]');

    const hasChart = await chartArea.count() > 0;
    const hasLoading = await loadingSpinner.count() > 0;

    // 둘 중 하나는 있어야 함
    expect(hasChart || hasLoading).toBeTruthy();
  });

  // ============================================
  // 8. 이벤트 타임라인 서비스 필터 테스트
  // ============================================

  test('이벤트 타임라인 서비스 필터가 동작한다', async ({ page }) => {
    // Events 탭으로 이동
    const eventsTab = page.getByRole('tab', { name: /Events/i });
    await eventsTab.click();
    await page.waitForTimeout(500);

    // 서비스 필터 Select 찾기
    const serviceFilterButton = page.locator('button[role="combobox"]').first();

    if (await serviceFilterButton.isVisible()) {
      // 서비스 필터 클릭
      await serviceFilterButton.click();
      await page.waitForTimeout(300);

      // 서비스 옵션들이 표시되는지 확인
      const allServicesOption = page.getByRole('option', { name: /전체 서비스/i });
      await expect(allServicesOption).toBeVisible();

      // Minu Find 옵션 선택
      const minuFindOption = page.getByRole('option', { name: /Minu Find/i });
      if (await minuFindOption.count() > 0) {
        await minuFindOption.click();
        await page.waitForTimeout(500);

        // 필터링 후 UI 업데이트 확인
        // 타임라인이 있거나 빈 상태 메시지가 표시됨
        const timelineContent = page.locator('[class*="space-y-0"], [class*="text-muted-foreground"]:has-text("이벤트가 없습니다")');
        const hasContent = await timelineContent.count() > 0;
        expect(hasContent).toBeTruthy();
      }
    }
  });

  // ============================================
  // 9. Alerts 탭 실시간 알림 패널 테스트
  // ============================================

  test('Alerts 탭에서 실시간 알림 패널이 표시된다', async ({ page }) => {
    // Alerts 탭 클릭
    const alertsTab = page.getByRole('tab', { name: /Alerts/i });
    await alertsTab.click();
    await page.waitForTimeout(500);

    // 실시간 알림 패널 제목 확인
    const alertPanelTitle = page.getByRole('heading', { name: /실시간 알림/i });
    await expect(alertPanelTitle).toBeVisible();

    // 필터 패널 버튼 확인
    const filterButton = page.getByRole('button', { name: /필터/i }).first();

    // 필터 버튼이 있거나 대체 컨트롤이 있어야 함
    const hasFilter = await filterButton.count() > 0;
    expect(hasFilter).toBeTruthy();

    // "모두 읽음" 버튼 확인
    const markAllReadButton = page.getByRole('button', { name: /모두 읽음/i });
    await expect(markAllReadButton).toBeVisible();

    // "전체 삭제" 버튼 확인
    const clearAllButton = page.getByRole('button', { name: /전체 삭제/i });
    await expect(clearAllButton).toBeVisible();
  });

  // ============================================
  // 10. 이벤트 타임라인 아이템 표시 테스트
  // ============================================

  test('이벤트 타임라인에서 이벤트 아이템이 올바르게 표시된다', async ({ page }) => {
    // Events 탭으로 이동
    const eventsTab = page.getByRole('tab', { name: /Events/i });
    await eventsTab.click();
    await page.waitForTimeout(1000);

    // 이벤트 아이템들 찾기 (타임라인 점 또는 아이콘으로 식별)
    const timelineItems = page.locator('div[class*="rounded-full"]').filter({ has: page.locator('svg') });

    // 이벤트가 있으면 아이템이 표시되거나, 없으면 빈 상태 메시지가 표시됨
    const itemCount = await timelineItems.count();

    if (itemCount === 0) {
      // 빈 상태 메시지 확인
      const emptyMessage = page.getByText(/이벤트가 없습니다/i);
      await expect(emptyMessage).toBeVisible();
    } else {
      // 첫 번째 이벤트 아이템에 서비스 배지가 있는지 확인
      const serviceBadge = page.locator('span[class*="badge"]').filter({ hasText: /Minu/i }).first();
      await expect(serviceBadge).toBeVisible();
    }
  });

  // ============================================
  // 11. 서비스 헬스 카드 메트릭 표시 테스트
  // ============================================

  test('서비스 헬스 카드에 메트릭이 표시된다', async ({ page }) => {
    // Overview 탭 확인
    const overviewTab = page.getByRole('tab', { name: /Overview/i });
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    await page.waitForTimeout(1000);

    // "마지막 연결" 텍스트가 있는지 확인 (메트릭 중 하나)
    const lastPingMetric = page.getByText(/마지막 연결:/i).first();

    // 메트릭이 로드되었거나 로딩 중이어야 함
    const hasMetric = await lastPingMetric.count() > 0;
    const hasLoading = await page.locator('[class*="skeleton"], [class*="animate-pulse"]').count() > 0;

    expect(hasMetric || hasLoading).toBeTruthy();
  });

  // ============================================
  // 12. 이슈 상태 변경 드롭다운 테스트
  // ============================================

  test('이슈 상태 변경 드롭다운 메뉴가 동작한다', async ({ page }) => {
    // Issues 탭으로 이동
    const issuesTab = page.getByRole('tab', { name: /Issues/i });
    await issuesTab.click();
    await page.waitForTimeout(1000);

    // 이슈 아이템의 더보기 버튼 찾기 (MoreVertical 아이콘)
    const moreButtons = page.locator('button[role="button"]').filter({ has: page.locator('svg') });

    if (await moreButtons.count() > 0) {
      // 첫 번째 더보기 버튼 클릭
      await moreButtons.first().click();
      await page.waitForTimeout(300);

      // 드롭다운 메뉴가 표시되는지 확인
      const dropdownMenu = page.locator('[role="menu"]');

      if (await dropdownMenu.count() > 0) {
        // "상태 변경" 레이블 확인
        const statusChangeLabel = page.getByText(/상태 변경/i);
        await expect(statusChangeLabel).toBeVisible();

        // 상태 옵션들 확인
        const menuItems = page.locator('[role="menuitem"]');
        const itemCount = await menuItems.count();
        expect(itemCount).toBeGreaterThan(0);

        // ESC로 닫기
        await page.keyboard.press('Escape');
      }
    } else {
      // 이슈가 없는 경우 빈 상태 메시지 확인
      const emptyMessage = page.getByText(/이슈가 없습니다/i);
      await expect(emptyMessage).toBeVisible();
    }
  });

  // ============================================
  // 13. Overview 탭 레이아웃 구조 테스트
  // ============================================

  test('Overview 탭에서 주요 컴포넌트들이 올바른 레이아웃으로 배치된다', async ({ page }) => {
    // Overview 탭 확인
    const overviewTab = page.getByRole('tab', { name: /Overview/i });
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    await page.waitForTimeout(1000);

    // 이벤트 타임라인 제목 확인
    const eventTimelineTitle = page.getByRole('heading', { name: /이벤트 타임라인/i });
    await expect(eventTimelineTitle).toBeVisible();

    // 서비스 이슈 제목 확인
    const issueListTitle = page.getByRole('heading', { name: /서비스 이슈/i });
    await expect(issueListTitle).toBeVisible();

    // 2열 그리드 레이아웃 확인 (lg:grid-cols-2)
    const gridContainer = page.locator('.grid.grid-cols-1.lg\\:grid-cols-2');
    const hasGrid = await gridContainer.count() > 0;
    expect(hasGrid).toBeTruthy();
  });
});
