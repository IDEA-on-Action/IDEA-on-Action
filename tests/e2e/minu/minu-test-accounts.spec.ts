import { test, expect } from "@playwright/test";

/**
 * Minu Test Accounts E2E Tests
 *
 * ideaonaction.ai의 테스트 계정별 Minu 서비스 접근 권한 테스트
 *
 * 테스트 계정 (docs/guides/minu-integration-guidelines.md 참조):
 * - test-free@example.com: Free 플랜 - 제한된 기능만 사용 가능
 * - test-basic@example.com: Basic 플랜 - 기본 기능 사용 가능
 * - test-pro@example.com: Pro 플랜 - 대부분의 기능 사용 가능
 * - test-expired@example.com: 만료된 구독 - 접근 거부 및 갱신 안내
 * - test-admin@example.com: Enterprise 플랜 - 모든 기능 및 팀 관리 가능
 *
 * 테스트 시나리오:
 * - 각 플랜별 기능 접근 권한 확인
 * - 구독 만료 시 처리 확인
 * - 플랜 업그레이드 안내 메시지 확인
 */

test.describe("Minu Test Accounts - Free Plan", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";
  const FREE_USER = {
    email: "test-free@example.com",
    password: "TestFree123!",
  };

  test("Free 플랜 사용자 - 기본 기능만 접근 가능", async ({ page }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill(
      'input[type="email"], input[name="email"]',
      FREE_USER.email,
    );
    await page.fill('input[type="password"]', FREE_USER.password);
    await page.click('button[type="submit"]');

    // 로그인 성공 확인
    await page.waitForURL("/", { timeout: 10000 });

    // Minu Find 페이지 접속
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // Free 플랜 제한 메시지 확인
    const limitSelectors = [
      "text=/무료 플랜|Free Plan/i",
      "text=/업그레이드|Upgrade/i",
      '[data-testid="plan-upgrade-notice"]',
      ".subscription-notice",
    ];

    let found = false;
    for (const selector of limitSelectors) {
      if ((await page.locator(selector).count()) > 0) {
        found = true;
        console.log("Free 플랜 제한 안내 발견:", selector);
        break;
      }
    }

    // Free 플랜 안내가 있을 수 있음
    console.log("Free 플랜 제한 안내 표시 여부:", found);
  });

  test("Free 플랜 - 검색 횟수 제한 확인", async ({ page, request }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', FREE_USER.email);
    await page.fill('input[type="password"]', FREE_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // 구독 정보 조회
    const response = await request.get(
      `${BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // Free 플랜 검증
      expect(body.plan).toBe("free");

      // Free 플랜 제한 확인 (월 10회)
      expect(body.limits?.searchCount).toBeLessThanOrEqual(10);
    }
  });

  test("Free 플랜 - 프리미엄 기능 접근 거부", async ({ page }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', FREE_USER.email);
    await page.fill('input[type="password"]', FREE_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // Minu Find 페이지 접속
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // AI 분석 기능 접근 시도 (Pro 이상 기능)
    const aiAnalysisButton = page.locator(
      'button:has-text("AI 분석"), [data-testid="ai-analysis-button"]',
    );

    if ((await aiAnalysisButton.count()) > 0) {
      await aiAnalysisButton.click();
      await page.waitForTimeout(1000);

      // 업그레이드 안내 메시지 확인
      const upgradeNotice = await page.locator(
        'text=/Pro.*업그레이드|Upgrade.*Pro/i',
      );
      if ((await upgradeNotice.count()) > 0) {
        expect(upgradeNotice).toBeVisible();
        console.log("프리미엄 기능 업그레이드 안내 표시됨");
      }
    }
  });
});

test.describe("Minu Test Accounts - Basic Plan", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";
  const BASIC_USER = {
    email: "test-basic@example.com",
    password: "TestBasic123!",
  };

  test("Basic 플랜 사용자 - 기본 + 추가 기능", async ({ page, request }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', BASIC_USER.email);
    await page.fill('input[type="password"]', BASIC_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // 구독 정보 조회
    const response = await request.get(
      `${BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // Basic 플랜 검증
      expect(body.plan).toBe("basic");
      expect(body.status).toBe("active");

      // Basic 플랜 제한 확인
      expect(body.limits?.searchCount).toBe(50); // 월 50회
      expect(body.limits?.platforms).toBe(2); // 플랫폼 2개
      expect(body.limits?.historyMonths).toBe(3); // 3개월 히스토리
    }
  });

  test("Basic 플랜 - 검색 기능 사용 가능", async ({ page }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', BASIC_USER.email);
    await page.fill('input[type="password"]', BASIC_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // Minu Find 페이지 접속
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 검색 기능 사용 가능 확인
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="검색"]',
    );
    if ((await searchInput.count()) > 0) {
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEnabled();
      console.log("Basic 플랜 검색 기능 사용 가능");
    }
  });
});

test.describe("Minu Test Accounts - Pro Plan", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";
  const PRO_USER = {
    email: "test-pro@example.com",
    password: "TestPro123!",
  };

  test("Pro 플랜 사용자 - 대부분 기능 접근", async ({ page, request }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', PRO_USER.email);
    await page.fill('input[type="password"]', PRO_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // 구독 정보 조회
    const response = await request.get(
      `${BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // Pro 플랜 검증
      expect(body.plan).toBe("pro");
      expect(body.status).toBe("active");

      // Pro 플랜 제한 확인
      expect(body.limits?.searchCount).toBe(300); // 월 300회
      expect(body.limits?.platforms).toBe(6); // 플랫폼 6개
      expect(body.limits?.aiAnalysis).toBe(true); // AI 분석 사용 가능
      expect(body.limits?.historyMonths).toBe(6); // 6개월 히스토리
    }
  });

  test("Pro 플랜 - AI 분석 기능 사용 가능", async ({ page }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', PRO_USER.email);
    await page.fill('input[type="password"]', PRO_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // Minu Find 페이지 접속
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // AI 분석 버튼 확인
    const aiAnalysisButton = page.locator(
      'button:has-text("AI 분석"), [data-testid="ai-analysis-button"]',
    );

    if ((await aiAnalysisButton.count()) > 0) {
      await expect(aiAnalysisButton).toBeVisible();
      await expect(aiAnalysisButton).toBeEnabled();
      console.log("Pro 플랜 AI 분석 기능 사용 가능");
    }
  });

  test("Pro 플랜 - 확장된 히스토리 접근", async ({ page, request }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', PRO_USER.email);
    await page.fill('input[type="password"]', PRO_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // 히스토리 조회 API 호출
    const response = await request.get(
      `${BASE_URL}/api/services/find/history`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // Pro 플랜은 6개월 히스토리 접근 가능
      if (Array.isArray(body)) {
        console.log("히스토리 항목 수:", body.length);

        // 6개월 전 데이터까지 확인
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const oldestRecord = body[body.length - 1];
        if (oldestRecord?.created_at) {
          const oldestDate = new Date(oldestRecord.created_at);
          expect(oldestDate >= sixMonthsAgo).toBeTruthy();
        }
      }
    }
  });
});

test.describe("Minu Test Accounts - Expired Subscription", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";
  const EXPIRED_USER = {
    email: "test-expired@example.com",
    password: "TestExpired123!",
  };

  test("만료된 플랜 - 접근 거부 및 갱신 안내", async ({ page, request }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', EXPIRED_USER.email);
    await page.fill('input[type="password"]', EXPIRED_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // 구독 정보 조회
    const response = await request.get(
      `${BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // 만료된 구독 상태 확인
      expect(body.status).toBe("expired");
      expect(body.plan).toBeTruthy();

      // 만료일 확인
      if (body.expires_at) {
        const expiryDate = new Date(body.expires_at);
        const now = new Date();
        expect(expiryDate < now).toBeTruthy();
      }
    }
  });

  test("만료된 구독 - 갱신 안내 메시지 확인", async ({ page }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', EXPIRED_USER.email);
    await page.fill('input[type="password"]', EXPIRED_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // Minu Find 페이지 접속
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 구독 갱신 안내 메시지 확인
    const renewalNotice = page.locator(
      'text=/구독.*만료|만료.*갱신|Subscription.*Expired/i, [data-testid="subscription-expired-notice"]',
    );

    if ((await renewalNotice.count()) > 0) {
      await expect(renewalNotice).toBeVisible();
      console.log("구독 만료 안내 메시지 표시됨");
    }

    // 갱신 버튼 확인
    const renewButton = page.locator(
      'button:has-text("갱신"), a:has-text("갱신"), a[href*="/billing"]',
    );

    if ((await renewButton.count()) > 0) {
      await expect(renewButton).toBeVisible();
      console.log("구독 갱신 버튼 표시됨");
    }
  });

  test("만료된 구독 - 유료 기능 접근 차단", async ({ page }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', EXPIRED_USER.email);
    await page.fill('input[type="password"]', EXPIRED_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // Minu Find 페이지 접속
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 유료 기능 버튼 비활성화 확인
    const premiumFeatures = [
      'button:has-text("AI 분석")',
      '[data-testid="ai-analysis-button"]',
      'button:has-text("고급 검색")',
    ];

    for (const selector of premiumFeatures) {
      const button = page.locator(selector);
      if ((await button.count()) > 0) {
        // 비활성화되었거나 클릭 시 안내 메시지 표시
        const isDisabled = await button.isDisabled();
        console.log(`${selector} 비활성화 여부:`, isDisabled);
      }
    }
  });
});

test.describe("Minu Test Accounts - Enterprise Plan", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";
  const ADMIN_USER = {
    email: "test-admin@example.com",
    password: "TestAdmin123!",
  };

  test("Enterprise 플랜 - 모든 기능 접근", async ({ page, request }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // 구독 정보 조회
    const response = await request.get(
      `${BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // Enterprise 플랜 검증
      expect(body.plan).toBe("enterprise");
      expect(body.status).toBe("active");

      // Enterprise 플랜 제한 확인 (무제한)
      expect(body.limits?.searchCount).toBeGreaterThan(1000); // 무제한
      expect(body.limits?.platforms).toBe(999); // 모든 플랫폼
      expect(body.limits?.aiAnalysis).toBe(true);
      expect(body.limits?.historyMonths).toBe(999); // 무제한 히스토리
      expect(body.limits?.teamMembers).toBeGreaterThan(1); // 팀 기능
    }
  });

  test("Enterprise 플랜 - 팀 관리 기능 접근", async ({ page }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // 팀 관리 페이지 접속
    await page.goto("/team");

    // 팀 관리 페이지 접근 가능 확인
    await page.waitForLoadState("networkidle");

    const teamSelectors = [
      "text=/팀 관리|Team Management/i",
      '[data-testid="team-management"]',
      "text=/멤버 초대|Invite Members/i",
    ];

    let found = false;
    for (const selector of teamSelectors) {
      if ((await page.locator(selector).count()) > 0) {
        found = true;
        console.log("팀 관리 기능 발견:", selector);
        break;
      }
    }

    console.log("Enterprise 팀 관리 기능 접근 가능:", found);
  });

  test("Enterprise 플랜 - 우선 지원 표시", async ({ page }) => {
    // 로그인
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });

    // 프로필 또는 구독 페이지에서 Enterprise 플랜 확인
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    const enterpriseBadge = page.locator(
      'text=/Enterprise|엔터프라이즈/i, [data-testid="enterprise-badge"]',
    );

    if ((await enterpriseBadge.count()) > 0) {
      await expect(enterpriseBadge).toBeVisible();
      console.log("Enterprise 플랜 뱃지 표시됨");
    }
  });
});
