/**
 * E2E 테스트: Central Hub 실시간 대시보드
 *
 * Minu 서비스의 실시간 모니터링 및 알림 기능 검증
 * - 서비스 헬스 상태 표시
 * - 실시간 알림 수신
 * - 탭 전환 동작
 * - 알림 읽음 처리
 * - Excel 내보내기
 *
 * @module tests/e2e/admin/central-hub-realtime
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// 테스트 설정
// ============================================================================

test.describe('Central Hub 실시간 대시보드', () => {
  // 각 테스트 전에 Admin 로그인
  test.beforeEach(async ({ page }) => {
    // Admin 로그인 페이지로 이동
    await page.goto('/admin/login');

    // 로그인 폼 입력
    await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@ideaonaction.ai');
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'admin123');

    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');

    // 대시보드로 리다이렉트 대기
    await page.waitForURL('/admin/dashboard', { timeout: 10000 });
  });

  // ============================================================================
  // 테스트 케이스 1: 대시보드 페이지 로드
  // ============================================================================

  test('TC-001: Central Hub 대시보드가 정상적으로 로드된다', async ({ page }) => {
    // Central Hub 대시보드로 이동
    await page.goto('/admin/central-hub');

    // 페이지 제목 확인
    await expect(page.locator('h1')).toContainText('Central Hub Dashboard');

    // 서브 타이틀 확인
    await expect(page.locator('p.text-muted-foreground')).toContainText('Minu 서비스의 상태와 이벤트를 모니터링합니다');

    // Excel 내보내기 버튼 확인
    await expect(page.locator('button:has-text("Excel 내보내기")')).toBeVisible();

    // 탭 UI 확인
    await expect(page.locator('div[role="tablist"]')).toBeVisible();
  });

  // ============================================================================
  // 테스트 케이스 2: 서비스 헬스 카드 표시
  // ============================================================================

  test('TC-002: 4개 서비스의 헬스 카드가 표시된다', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // 서비스 헬스 카드 그리드 확인
    const serviceCards = page.locator('[data-testid^="service-health-card-"]');
    await expect(serviceCards).toHaveCount(4);

    // 각 서비스 카드 내용 확인
    const services = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'];

    for (const serviceId of services) {
      const card = page.locator(`[data-testid="service-health-card-${serviceId}"]`);
      await expect(card).toBeVisible();

      // 서비스명 확인
      await expect(card.locator('.service-name')).toBeVisible();

      // 상태 인디케이터 확인 (operational/degraded/down/maintenance)
      await expect(card.locator('.status-indicator')).toBeVisible();

      // 메트릭 표시 확인 (업타임, 응답시간 등)
      await expect(card.locator('.metrics')).toBeVisible();
    }
  });

  // ============================================================================
  // 테스트 케이스 3: Alerts 탭 전환
  // ============================================================================

  test('TC-003: Overview 탭에서 다른 탭으로 전환할 수 있다', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // 기본적으로 Overview 탭이 선택되어 있는지 확인
    await expect(page.locator('button[role="tab"][data-state="active"]')).toContainText('Overview');

    // StatisticsChart가 표시되는지 확인
    await expect(page.locator('[data-testid="statistics-chart"]')).toBeVisible();

    // Events 탭으로 전환
    await page.click('button[role="tab"]:has-text("Events")');

    // Events 탭이 활성화되었는지 확인
    await expect(page.locator('button[role="tab"][data-state="active"]')).toContainText('Events');

    // EventTimeline이 표시되는지 확인
    await expect(page.locator('[data-testid="event-timeline"]')).toBeVisible();

    // Issues 탭으로 전환
    await page.click('button[role="tab"]:has-text("Issues")');

    // Issues 탭이 활성화되었는지 확인
    await expect(page.locator('button[role="tab"][data-state="active"]')).toContainText('Issues');

    // IssueList가 표시되는지 확인
    await expect(page.locator('[data-testid="issue-list"]')).toBeVisible();
  });

  // ============================================================================
  // 테스트 케이스 4: 알림 목록 표시
  // ============================================================================

  test('TC-004: 실시간 알림 목록이 표시된다', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // RealtimeAlertPanel 확인 (Overview 탭)
    const alertPanel = page.locator('[data-testid="realtime-alert-panel"]');
    await expect(alertPanel).toBeVisible();

    // 알림 목록 확인
    const alerts = page.locator('[data-testid^="alert-item-"]');
    const alertCount = await alerts.count();

    if (alertCount > 0) {
      // 첫 번째 알림 내용 확인
      const firstAlert = alerts.first();
      await expect(firstAlert.locator('.alert-title')).toBeVisible();
      await expect(firstAlert.locator('.alert-message')).toBeVisible();
      await expect(firstAlert.locator('.alert-timestamp')).toBeVisible();

      // 심각도 배지 확인 (critical/high/medium/low)
      await expect(firstAlert.locator('.severity-badge')).toBeVisible();
    }
  });

  // ============================================================================
  // 테스트 케이스 5: 알림 읽음 처리
  // ============================================================================

  test('TC-005: 알림을 읽음 처리할 수 있다', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // 읽지 않은 알림 찾기
    const unreadAlert = page.locator('[data-testid^="alert-item-"][data-unread="true"]').first();

    if (await unreadAlert.isVisible()) {
      // 알림 클릭 (읽음 처리)
      await unreadAlert.click();

      // 읽음 상태로 변경되었는지 확인 (data-unread="false")
      await expect(unreadAlert).toHaveAttribute('data-unread', 'false');

      // 읽음 표시 아이콘 확인
      await expect(unreadAlert.locator('.read-indicator')).toBeVisible();
    }
  });

  // ============================================================================
  // 테스트 케이스 6: "모두 읽음" 버튼
  // ============================================================================

  test('TC-006: "모두 읽음" 버튼으로 모든 알림을 읽음 처리할 수 있다', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // "모두 읽음" 버튼 클릭
    const markAllReadButton = page.locator('button:has-text("모두 읽음")');

    if (await markAllReadButton.isVisible()) {
      await markAllReadButton.click();

      // 성공 토스트 확인
      await expect(page.locator('.sonner-toast')).toContainText('모든 알림을 읽음 처리했습니다');

      // 읽지 않은 알림이 없는지 확인
      const unreadAlerts = page.locator('[data-testid^="alert-item-"][data-unread="true"]');
      await expect(unreadAlerts).toHaveCount(0);
    }
  });

  // ============================================================================
  // 테스트 케이스 7: 연결 상태 인디케이터
  // ============================================================================

  test('TC-007: Realtime 연결 상태 인디케이터가 표시된다', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // 연결 상태 인디케이터 확인
    const connectionStatus = page.locator('[data-testid="realtime-connection-status"]');
    await expect(connectionStatus).toBeVisible();

    // 연결 상태 확인 (connected/connecting/disconnected/error)
    const status = await connectionStatus.getAttribute('data-status');
    expect(['connected', 'connecting', 'disconnected', 'error']).toContain(status);

    // 연결 상태에 따른 아이콘 확인
    if (status === 'connected') {
      await expect(connectionStatus.locator('.icon-connected')).toBeVisible();
    }
  });

  // ============================================================================
  // 테스트 케이스 8: 이벤트 탭 실시간 업데이트
  // ============================================================================

  test('TC-008: Events 탭에서 실시간 이벤트가 표시된다', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // Events 탭으로 전환
    await page.click('button[role="tab"]:has-text("Events")');

    // EventTimeline 확인
    const eventTimeline = page.locator('[data-testid="event-timeline"]');
    await expect(eventTimeline).toBeVisible();

    // 이벤트 목록 확인
    const events = page.locator('[data-testid^="event-item-"]');
    const initialCount = await events.count();

    if (initialCount > 0) {
      // 첫 번째 이벤트 내용 확인
      const firstEvent = events.first();
      await expect(firstEvent.locator('.event-type')).toBeVisible();
      await expect(firstEvent.locator('.event-service')).toBeVisible();
      await expect(firstEvent.locator('.event-timestamp')).toBeVisible();
    }

    // 실시간 업데이트 시뮬레이션 (새로고침 없이 이벤트 추가되는지 확인)
    // 실제 프로덕션에서는 Supabase Realtime으로 자동 업데이트
    // 여기서는 페이지가 Realtime 구독을 설정했는지 확인
    await expect(page.locator('[data-testid="realtime-subscribed"]')).toHaveAttribute('data-subscribed', 'true');
  });

  // ============================================================================
  // 테스트 케이스 9: 이슈 탭 필터링
  // ============================================================================

  test('TC-009: Issues 탭에서 이슈를 필터링할 수 있다', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // Issues 탭으로 전환
    await page.click('button[role="tab"]:has-text("Issues")');

    // IssueList 확인
    const issueList = page.locator('[data-testid="issue-list"]');
    await expect(issueList).toBeVisible();

    // 심각도 필터 확인
    const severityFilter = page.locator('[data-testid="severity-filter"]');
    await expect(severityFilter).toBeVisible();

    // "Critical" 필터 선택
    await severityFilter.click();
    await page.click('button:has-text("Critical")');

    // 필터링된 이슈 확인
    const issues = page.locator('[data-testid^="issue-item-"]');
    const issueCount = await issues.count();

    if (issueCount > 0) {
      // 모든 이슈가 Critical인지 확인
      for (let i = 0; i < issueCount; i++) {
        const severityBadge = issues.nth(i).locator('.severity-badge');
        await expect(severityBadge).toContainText('Critical');
      }
    }

    // 상태 필터 확인
    const statusFilter = page.locator('[data-testid="status-filter"]');
    await expect(statusFilter).toBeVisible();

    // "Open" 필터 선택
    await statusFilter.click();
    await page.click('button:has-text("Open")');

    // 필터가 적용되었는지 확인
    const openIssues = page.locator('[data-testid^="issue-item-"][data-status="open"]');
    const openCount = await openIssues.count();

    // Open 상태 이슈만 표시되는지 확인
    await expect(issues).toHaveCount(openCount);
  });

  // ============================================================================
  // 테스트 케이스 10: Excel 내보내기 버튼
  // ============================================================================

  test('TC-010: Excel 내보내기 버튼을 클릭하면 다운로드가 시작된다', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // 다운로드 이벤트 감지 설정
    const downloadPromise = page.waitForEvent('download');

    // Excel 내보내기 버튼 클릭
    await page.click('button:has-text("Excel 내보내기")');

    // 성공 토스트 확인
    await expect(page.locator('.sonner-toast')).toContainText('내보내기가 완료되었습니다');

    // 다운로드 파일 확인
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/central-hub-.*\.xlsx/);

    // 파일 크기 확인 (0바이트가 아닌지)
    const path = await download.path();
    if (path) {
      const fs = await import('fs');
      const stats = fs.statSync(path);
      expect(stats.size).toBeGreaterThan(0);
    }
  });

  // ============================================================================
  // 추가 테스트: Realtime 재연결
  // ============================================================================

  test('TC-011: Realtime 연결이 끊겼을 때 자동으로 재연결된다', async ({ page }) => {
    await page.goto('/admin/central-hub');

    // 연결 상태 확인
    const connectionStatus = page.locator('[data-testid="realtime-connection-status"]');
    await expect(connectionStatus).toHaveAttribute('data-status', 'connected');

    // 네트워크 오프라인 시뮬레이션
    await page.context().setOffline(true);

    // 연결 끊김 상태 확인
    await expect(connectionStatus).toHaveAttribute('data-status', 'disconnected', { timeout: 5000 });

    // 네트워크 복구
    await page.context().setOffline(false);

    // 자동 재연결 확인 (최대 10초 대기)
    await expect(connectionStatus).toHaveAttribute('data-status', 'connected', { timeout: 10000 });

    // 재연결 후 데이터가 정상적으로 표시되는지 확인
    const serviceCards = page.locator('[data-testid^="service-health-card-"]');
    await expect(serviceCards).toHaveCount(4);
  });
});
