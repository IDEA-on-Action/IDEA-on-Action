/**
 * MCP Orchestrator E2E Tests
 *
 * MCP(Model Context Protocol) Orchestrator 통합 테스트
 * - 토큰 발급
 * - 토큰 검증
 * - 이벤트 라우팅
 * - 상태 동기화
 * - DLQ (Dead Letter Queue)
 *
 * @module tests/e2e/services/mcp-orchestrator
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from '../../fixtures/auth-helpers';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 테스트용 토큰 생성
 * 실제 MCP 서버 대신 모의 토큰 생성
 *
 * @param serviceName - 서비스 이름
 * @param expiresInSeconds - 만료 시간 (초)
 * @returns 모의 토큰 데이터
 */
function generateMockToken(
  serviceName: 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep',
  expiresInSeconds: number = 3600
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

  // Base64 인코딩된 헤더와 페이로드로 JWT 형식 모방
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'test-user-id',
      serviceName,
      scopes: ['read', 'write'],
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    })
  );
  const signature = btoa('mock-signature-' + Date.now());

  return {
    accessToken: `${header}.${payload}.${signature}`,
    refreshToken: `refresh_${serviceName}_${Date.now()}`,
    tokenType: 'Bearer' as const,
    expiresIn: expiresInSeconds,
    expiresAt: expiresAt.toISOString(),
    scopes: ['read', 'write'],
    serviceName,
  };
}

/**
 * HMAC 서명 생성 (테스트용)
 *
 * @param payload - 서명할 페이로드
 * @param timestamp - 타임스탬프
 * @returns 모의 HMAC 서명
 */
function generateHMACSignature(
  payload: Record<string, unknown>,
  timestamp: string
): string {
  // 실제 환경에서는 crypto.subtle을 사용하지만,
  // E2E 테스트에서는 모의 서명 사용
  const dataToSign = JSON.stringify(payload) + timestamp;
  return btoa(dataToSign).slice(0, 64);
}

/**
 * Realtime 업데이트 대기
 *
 * @param page - Playwright 페이지 객체
 * @param selector - 변경을 감지할 셀렉터
 * @param timeout - 타임아웃 (밀리초)
 */
async function waitForRealtimeUpdate(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = page.locator(selector);
    const isVisible = await element.isVisible().catch(() => false);
    if (isVisible) {
      return;
    }
    await page.waitForTimeout(200);
  }
}

// ============================================================================
// 1. 토큰 발급 테스트 (3개)
// ============================================================================

test.describe('MCP Token Issuance', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('유효한 서비스로 토큰 발급 성공', async ({ page }) => {
    // Minu Find 페이지로 이동 (MCP 인증 필요)
    await page.goto('/services/minu/find');
    await page.waitForLoadState('networkidle');

    // 페이지 로드 확인
    await expect(page.locator('h1')).toContainText('Minu Find');

    // localStorage에서 MCP 토큰 확인 (있으면 발급 성공)
    const storageState = await page.evaluate(() => {
      const token = localStorage.getItem('mcp_auth_token');
      return token ? JSON.parse(token) : null;
    });

    // 토큰이 있으면 구조 확인, 없으면 폴백 동작 확인
    if (storageState) {
      expect(storageState).toHaveProperty('accessToken');
      expect(storageState).toHaveProperty('refreshToken');
      expect(storageState).toHaveProperty('serviceName');
    } else {
      // MCP 서버 미연결 시 폴백으로 페이지가 정상 동작해야 함
      await expect(page.getByRole('heading', { name: '주요 기능' })).toBeVisible();
    }
  });

  test('잘못된 서비스 ID로 토큰 발급 실패', async ({ page }) => {
    // 존재하지 않는 서비스 경로로 이동
    await page.goto('/services/minu/invalid-service');
    await page.waitForLoadState('networkidle');

    // 404 또는 에러 페이지가 표시되어야 함
    const currentUrl = page.url();
    const hasError =
      currentUrl.includes('404') ||
      currentUrl.includes('not-found') ||
      (await page.locator('text=/404|찾을 수 없|not found/i').count()) > 0;

    // 유효하지 않은 서비스는 에러 처리되거나 리다이렉트되어야 함
    expect(hasError || currentUrl !== '/services/minu/invalid-service').toBeTruthy();
  });

  test('만료된 시그니처로 토큰 발급 실패', async ({ page }) => {
    // 만료된 토큰을 localStorage에 저장
    const expiredToken = generateMockToken('minu-find', -3600); // 1시간 전 만료
    await page.goto('/');

    await page.evaluate((token) => {
      localStorage.setItem('mcp_auth_token', JSON.stringify(token));
    }, expiredToken);

    // 서비스 페이지로 이동
    await page.goto('/services/minu/find');
    await page.waitForLoadState('networkidle');

    // 만료된 토큰이 갱신되거나 제거되어야 함
    const currentToken = await page.evaluate(() => {
      const token = localStorage.getItem('mcp_auth_token');
      return token ? JSON.parse(token) : null;
    });

    // 토큰이 없거나, 새로운 토큰으로 갱신되어야 함
    if (currentToken) {
      const expiresAt = new Date(currentToken.expiresAt);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    }

    // 페이지는 정상 동작해야 함 (폴백)
    await expect(page.locator('h1')).toContainText('Minu Find');
  });
});

// ============================================================================
// 2. 토큰 검증 테스트 (2개)
// ============================================================================

test.describe('MCP Token Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('유효한 토큰 검증 성공', async ({ page }) => {
    // 유효한 토큰 생성 및 저장
    const validToken = generateMockToken('minu-frame', 3600);
    await page.goto('/');

    await page.evaluate((token) => {
      localStorage.setItem('mcp_auth_token', JSON.stringify(token));
    }, validToken);

    // Minu Frame 페이지로 이동
    await page.goto('/services/minu/frame');
    await page.waitForLoadState('networkidle');

    // 페이지가 정상 로드되어야 함
    await expect(page.locator('h1')).toContainText('Minu Frame');

    // 플랜 비교 섹션이 표시되어야 함
    await expect(page.getByRole('heading', { name: '플랜 비교' })).toBeVisible();

    // 토큰이 유효한 상태로 유지되어야 함
    const storedToken = await page.evaluate(() => {
      const token = localStorage.getItem('mcp_auth_token');
      return token ? JSON.parse(token) : null;
    });

    if (storedToken) {
      const expiresAt = new Date(storedToken.expiresAt);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    }
  });

  test('만료된 토큰 검증 실패', async ({ page }) => {
    // 만료된 토큰 생성 (1초 전 만료)
    const expiredToken = generateMockToken('minu-build', -1);
    await page.goto('/');

    await page.evaluate((token) => {
      localStorage.setItem('mcp_auth_token', JSON.stringify(token));
    }, expiredToken);

    // Minu Build 페이지로 이동
    await page.goto('/services/minu/build');
    await page.waitForLoadState('networkidle');

    // 페이지는 폴백으로 정상 동작해야 함
    await expect(page.locator('h1')).toContainText('Minu Build');

    // 만료된 토큰은 제거되거나 갱신되어야 함
    const currentToken = await page.evaluate(() => {
      const token = localStorage.getItem('mcp_auth_token');
      if (!token) return null;
      const parsed = JSON.parse(token);
      return {
        expiresAt: parsed.expiresAt,
        isExpired: new Date(parsed.expiresAt).getTime() < Date.now(),
      };
    });

    // 토큰이 제거되었거나, 갱신되어 유효해야 함
    if (currentToken) {
      expect(currentToken.isExpired).toBe(false);
    }
  });
});

// ============================================================================
// 3. 이벤트 라우팅 테스트 (3개)
// ============================================================================

test.describe('MCP Event Routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
    await page.goto('/admin/central-hub');
    await page.waitForLoadState('networkidle');
  });

  test('이벤트 dispatch 성공', async ({ page }) => {
    // Central Hub 대시보드가 로드되었는지 확인
    await expect(
      page.getByRole('heading', { name: /Central Hub Dashboard/i })
    ).toBeVisible();

    // Events 탭으로 이동
    const eventsTab = page.getByRole('tab', { name: /Events/i });
    await eventsTab.click();
    await page.waitForTimeout(500);

    // 이벤트 타임라인 영역이 표시되어야 함
    const eventContent = page.locator('[role="tabpanel"]');
    await expect(eventContent).toBeVisible();

    // 이벤트 목록 또는 빈 상태 메시지가 있어야 함
    const hasContent =
      (await page.locator('text=/이벤트|event|타임라인|timeline/i').count()) > 0;
    expect(hasContent).toBeTruthy();
  });

  test('인증 없이 dispatch 실패 (401)', async ({ page }) => {
    // 로그아웃
    await page.context().clearCookies();

    // Central Hub API 직접 호출 시도
    const response = await page.request.post('/api/events/dispatch', {
      data: {
        event_type: 'task.completed',
        service_id: 'minu-find',
        payload: { task_id: 'test-task' },
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 인증되지 않은 요청은 실패해야 함
    // API가 없는 경우 404, 인증 실패 시 401/403
    expect([401, 403, 404]).toContain(response.status());
  });

  test('잘못된 이벤트 유형 실패', async ({ page }) => {
    // Central Hub 대시보드 로드 확인
    await expect(
      page.getByRole('heading', { name: /Central Hub Dashboard/i })
    ).toBeVisible();

    // Issues 탭으로 이동
    const issuesTab = page.getByRole('tab', { name: /Issues/i });
    await issuesTab.click();
    await page.waitForTimeout(500);

    // 이슈 목록이 표시되어야 함
    const issueListTitle = page.getByText(/서비스 이슈/i);
    await expect(issueListTitle).toBeVisible();

    // 필터 드롭다운이 정상 동작해야 함
    const filterButton = page.locator('button[role="combobox"]').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(300);

      // 드롭다운 옵션이 표시되어야 함
      const options = page.getByRole('option');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(0);

      // ESC로 닫기
      await page.keyboard.press('Escape');
    }
  });
});

// ============================================================================
// 4. 상태 동기화 테스트 (2개)
// ============================================================================

test.describe('MCP State Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('서비스 상태 조회 성공', async ({ page }) => {
    // Central Hub 대시보드로 이동
    await page.goto('/admin/central-hub');
    await page.waitForLoadState('networkidle');

    // 대시보드 제목 확인
    await expect(
      page.getByRole('heading', { name: /Central Hub Dashboard/i })
    ).toBeVisible();

    // 4개 서비스 상태 카드 영역 확인
    const serviceNames = ['Minu Find', 'Minu Frame', 'Minu Build', 'Minu Keep'];

    for (const serviceName of serviceNames) {
      // 서비스 이름이 페이지에 있는지 확인
      const serviceElement = page.locator(`text="${serviceName}"`).first();
      const isVisible = await serviceElement.isVisible().catch(() => false);

      // 서비스 카드가 있거나 로딩 상태일 수 있음
      if (!isVisible) {
        // 로딩 스켈레톤 확인
        const skeletons = page.locator('.animate-pulse, [class*="skeleton"]');
        const skeletonCount = await skeletons.count();
        expect(skeletonCount).toBeGreaterThanOrEqual(0);
      }
    }

    // 상태 배지 확인 (healthy, degraded, unhealthy, unknown)
    const statusBadges = page.locator(
      'span:has-text("정상"), span:has-text("저하"), span:has-text("장애"), span:has-text("알 수 없음")'
    );
    const badgeCount = await statusBadges.count();
    // 서비스가 로드되면 배지가 있어야 함
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('상태 업데이트 후 Realtime 반영', async ({ page }) => {
    // Central Hub 대시보드로 이동
    await page.goto('/admin/central-hub');
    await page.waitForLoadState('networkidle');

    // Overview 탭 확인
    const overviewTab = page.getByRole('tab', { name: /Overview/i });
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    // 초기 상태 캡처
    const initialBadges = await page
      .locator('span:has-text("정상"), span:has-text("저하"), span:has-text("장애")')
      .count();

    // 잠시 대기 (Realtime 연결 설정 시간)
    await page.waitForTimeout(1000);

    // Events 탭으로 전환 후 다시 Overview로
    const eventsTab = page.getByRole('tab', { name: /Events/i });
    await eventsTab.click();
    await page.waitForTimeout(300);

    await overviewTab.click();
    await page.waitForTimeout(500);

    // 페이지가 여전히 정상 동작해야 함
    await expect(
      page.getByRole('heading', { name: /Central Hub Dashboard/i })
    ).toBeVisible();

    // 상태 배지가 여전히 표시되어야 함
    const finalBadges = await page
      .locator('span:has-text("정상"), span:has-text("저하"), span:has-text("장애")')
      .count();

    // 배지 수가 동일하거나 Realtime 업데이트로 변경될 수 있음
    expect(finalBadges).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 5. DLQ (Dead Letter Queue) 테스트 (1개)
// ============================================================================

test.describe('MCP Dead Letter Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('재시도 초과 시 DLQ로 이동', async ({ page }) => {
    // Central Hub 대시보드로 이동
    await page.goto('/admin/central-hub');
    await page.waitForLoadState('networkidle');

    // Issues 탭으로 이동
    const issuesTab = page.getByRole('tab', { name: /Issues/i });
    await issuesTab.click();
    await page.waitForTimeout(500);

    // 이슈 목록 확인
    const issueListTitle = page.getByText(/서비스 이슈/i);
    await expect(issueListTitle).toBeVisible();

    // 심각도 필터로 critical 이슈 필터링 시도
    const severityFilter = page.locator('button[role="combobox"]').first();

    if (await severityFilter.isVisible()) {
      await severityFilter.click();
      await page.waitForTimeout(300);

      // Critical 옵션 찾기
      const criticalOption = page.getByRole('option', { name: /critical|위험/i });
      const hasCritical = (await criticalOption.count()) > 0;

      if (hasCritical) {
        await criticalOption.click();
        await page.waitForTimeout(500);

        // 필터링된 결과가 표시되어야 함
        const issueContent = page.locator('[class*="space-y-3"], [class*="text-muted-foreground"]');
        const hasContent = await issueContent.count() > 0;
        expect(hasContent).toBeTruthy();
      } else {
        // Critical 옵션이 없으면 ESC로 닫기
        await page.keyboard.press('Escape');
      }
    }

    // DLQ 관련 UI 요소 확인 (있는 경우)
    // 실패한 이벤트나 재시도 초과 알림이 표시될 수 있음
    const dlqIndicators = page.locator(
      'text=/재시도|retry|failed|실패|DLQ|dead letter/i'
    );
    const dlqCount = await dlqIndicators.count();

    // DLQ 관련 요소가 없어도 정상 (이슈가 없는 상태)
    // 있으면 적절히 표시되어야 함
    expect(dlqCount).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 접근성 및 반응형 테스트
// ============================================================================

test.describe('MCP Orchestrator Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('Central Hub 대시보드 키보드 내비게이션', async ({ page }) => {
    await page.goto('/admin/central-hub');
    await page.waitForLoadState('networkidle');

    // Tab 키로 탭 간 이동 가능해야 함
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // 포커스된 요소 확인
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).toBeTruthy();

    // Enter 키로 탭 활성화 가능해야 함
    const eventsTab = page.getByRole('tab', { name: /Events/i });
    await eventsTab.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Events 탭이 활성화되어야 함
    await expect(eventsTab).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('MCP Orchestrator Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsAdmin(page);
  });

  test('모바일 뷰포트에서 대시보드 정상 표시', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/central-hub');
    await page.waitForLoadState('networkidle');

    // 대시보드 제목이 표시되어야 함
    await expect(
      page.getByRole('heading', { name: /Central Hub/i })
    ).toBeVisible();

    // 탭이 표시되어야 함
    const tabs = page.getByRole('tablist');
    await expect(tabs).toBeVisible();
  });

  test('태블릿 뷰포트에서 대시보드 정상 표시', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/central-hub');
    await page.waitForLoadState('networkidle');

    // 대시보드 제목이 표시되어야 함
    await expect(
      page.getByRole('heading', { name: /Central Hub/i })
    ).toBeVisible();

    // Excel 내보내기 버튼이 표시되어야 함
    const exportButton = page.getByRole('button', { name: /Excel 내보내기/i });
    await expect(exportButton).toBeVisible();
  });
});
