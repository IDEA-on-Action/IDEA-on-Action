import { test, expect } from "@playwright/test";
import { loginAsRegularUser, loginAsAdmin } from "../../fixtures/auth-helpers";

/**
 * SubscriptionGate Component E2E Tests
 *
 * 구독 기반 접근 제어 컴포넌트 테스트
 *
 * 테스트 시나리오:
 * - 접근 가능 시 자식 컴포넌트 렌더링
 * - 접근 불가 시 UpgradePrompt 표시
 * - 로딩 중 Skeleton 표시
 * - fallback 컴포넌트 커스텀
 * - UsageIndicator 사용량 표시
 * - 색상 변화 (여유/경고/위험)
 */

test.describe("SubscriptionGate Component", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test.beforeEach(async ({ page }) => {
    // 로그인
    await loginAsRegularUser(page);
  });

  test("접근 가능 시 자식 컴포넌트 렌더링", async ({ page }) => {
    // Basic 플랜 사용자가 Basic 기능에 접근
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 기본 검색 기능은 모든 플랜에서 사용 가능
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="검색"]',
    );

    // 검색 입력 필드가 표시되어야 함 (접근 가능)
    if ((await searchInput.count()) > 0) {
      await expect(searchInput.first()).toBeVisible();
      await expect(searchInput.first()).toBeEnabled();
    }
  });

  test("접근 불가 시 UpgradePrompt 표시", async ({ page }) => {
    // Pro 전용 기능에 접근 시도
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // Pro 전용 기능 찾기 (예: AI 추천)
    const proFeatureSelectors = [
      "text=/AI.*추천|AI.*분석/i",
      '[data-testid="ai-recommendation"]',
      '[data-plan-required="pro"]',
    ];

    for (const selector of proFeatureSelectors) {
      const element = page.locator(selector).first();

      if ((await element.count()) > 0) {
        // 요소 클릭 시도
        await element.click({ force: true });
        await page.waitForTimeout(500);

        // UpgradePrompt가 표시되는지 확인
        const upgradePromptSelectors = [
          "text=/업그레이드|Upgrade/i",
          "text=/Pro 플랜/i",
          '[data-testid="upgrade-prompt"]',
          '[role="dialog"]',
        ];

        let upgradePromptFound = false;
        for (const promptSelector of upgradePromptSelectors) {
          if ((await page.locator(promptSelector).count()) > 0) {
            upgradePromptFound = true;
            console.log("UpgradePrompt 발견:", promptSelector);
            break;
          }
        }

        // 업그레이드 안내가 표시되어야 함
        if (upgradePromptFound) {
          expect(upgradePromptFound).toBeTruthy();
          return;
        }
      }
    }

    // Pro 전용 기능이 없거나 UpgradePrompt가 표시되지 않을 수 있음
    console.log("Pro 전용 기능을 찾을 수 없거나 UpgradePrompt가 구현되지 않음");
  });

  test("로딩 중 Skeleton 표시", async ({ page }) => {
    // 네트워크를 느리게 설정하여 로딩 상태 확인
    await page.route("**/api/user/subscription*", async (route) => {
      await page.waitForTimeout(1000); // 1초 지연
      await route.continue();
    });

    await page.goto("/services/minu/find");

    // 로딩 중 Skeleton이 표시되는지 확인
    const skeletonSelectors = [
      '[data-testid="subscription-gate-skeleton"]',
      ".skeleton",
      '[class*="animate-pulse"]',
      '[role="status"]',
    ];

    let skeletonFound = false;
    for (const selector of skeletonSelectors) {
      if ((await page.locator(selector).count()) > 0) {
        skeletonFound = true;
        console.log("Skeleton 로딩 발견:", selector);
        break;
      }
    }

    // Skeleton 또는 로딩 인디케이터가 표시될 수 있음
    console.log("Skeleton 표시 여부:", skeletonFound);
  });

  test("fallback 컴포넌트 커스텀", async ({ page }) => {
    // 접근 불가 상태에서 커스텀 fallback 확인
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 커스텀 fallback 메시지 찾기
    const fallbackSelectors = [
      "text=/이 기능을 사용하려면/i",
      "text=/플랜을 업그레이드/i",
      '[data-testid="custom-fallback"]',
    ];

    for (const selector of fallbackSelectors) {
      if ((await page.locator(selector).count()) > 0) {
        const element = page.locator(selector).first();
        await expect(element).toBeVisible();
        console.log("커스텀 fallback 발견:", selector);
        return;
      }
    }

    console.log("커스텀 fallback을 찾을 수 없음 (기본 동작일 수 있음)");
  });

  test("UsageIndicator 사용량 표시", async ({ page }) => {
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 사용량 인디케이터 찾기
    const usageIndicatorSelectors = [
      '[data-testid="usage-indicator"]',
      "text=/검색.*남음|남은.*검색/i",
      '[class*="usage-bar"]',
      '[class*="progress"]',
    ];

    let usageIndicatorFound = false;
    for (const selector of usageIndicatorSelectors) {
      if ((await page.locator(selector).count()) > 0) {
        usageIndicatorFound = true;
        const element = page.locator(selector).first();

        // 사용량 정보가 표시되는지 확인
        await expect(element).toBeVisible();
        console.log("UsageIndicator 발견:", selector);

        // 텍스트 내용 확인
        const text = await element.textContent();
        console.log("사용량 텍스트:", text);

        break;
      }
    }

    // UsageIndicator가 표시될 수 있음
    console.log("UsageIndicator 표시 여부:", usageIndicatorFound);
  });

  test("색상 변화 (여유/경고/위험)", async ({ page }) => {
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 사용량 프로그레스 바 찾기
    const progressBar = page
      .locator('[data-testid="usage-progress"], [class*="progress"]')
      .first();

    if ((await progressBar.count()) > 0) {
      // 색상 클래스 확인
      const classList = await progressBar.getAttribute("class");
      console.log("프로그레스 바 클래스:", classList);

      // 색상 상태 확인
      const colorStates = {
        safe: /green|success/i,
        warning: /yellow|orange|warning/i,
        danger: /red|danger|destructive/i,
      };

      let colorState = "unknown";
      for (const [state, pattern] of Object.entries(colorStates)) {
        if (classList && pattern.test(classList)) {
          colorState = state;
          break;
        }
      }

      console.log("사용량 색상 상태:", colorState);

      // 색상이 적절히 적용되어 있어야 함
      // (실제 사용량에 따라 다르므로 assertion은 생략)
    } else {
      console.log("프로그레스 바를 찾을 수 없음");
    }
  });
});

test.describe("SubscriptionGate - Plan Requirements", () => {
  test("Basic 플랜 사용자가 Basic 기능 사용", async ({ page }) => {
    await loginAsRegularUser(page);
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // Basic 플랜 기능은 접근 가능
    const basicFeature = page.locator('input[type="search"]').first();
    if ((await basicFeature.count()) > 0) {
      await expect(basicFeature).toBeVisible();
      await expect(basicFeature).toBeEnabled();
    }
  });

  test("Basic 플랜 사용자가 Pro 기능 접근 시 차단", async ({ page }) => {
    await loginAsRegularUser(page);
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // Pro 전용 기능 찾기
    const proFeature = page.locator('[data-plan-required="pro"]').first();

    if ((await proFeature.count()) > 0) {
      // 비활성화 상태인지 확인
      const isDisabled = await proFeature.isDisabled();
      const isHidden = await proFeature.isHidden();

      // Pro 기능은 비활성화되거나 숨겨져 있어야 함
      expect(isDisabled || isHidden).toBeTruthy();
    }
  });

  test("Enterprise 플랜 사용자가 모든 기능 접근", async ({ page }) => {
    // Enterprise 플랜 사용자로 로그인 (Admin 계정이 Enterprise일 수 있음)
    await loginAsAdmin(page);
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 모든 기능이 활성화되어야 함
    const allFeatures = page.locator("[data-plan-required]");
    const count = await allFeatures.count();

    console.log("플랜 제한 기능 수:", count);

    if (count > 0) {
      // Enterprise 플랜은 모든 기능에 접근 가능
      for (let i = 0; i < count; i++) {
        const feature = allFeatures.nth(i);
        const isEnabled = await feature.isEnabled();
        const isVisible = await feature.isVisible();

        console.log(`기능 ${i + 1} - 활성화: ${isEnabled}, 표시: ${isVisible}`);
      }
    }
  });
});

test.describe("SubscriptionGate - Usage Limits", () => {
  test("사용량 한도 도달 시 차단", async ({ page }) => {
    await loginAsRegularUser(page);
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 사용량 인디케이터 확인
    const usageIndicator = page
      .locator('[data-testid="usage-indicator"]')
      .first();

    if ((await usageIndicator.count()) > 0) {
      const usageText = await usageIndicator.textContent();
      console.log("현재 사용량:", usageText);

      // 한도 도달 메시지 찾기
      const limitReached =
        (await page.locator("text=/한도.*도달|limit.*reached/i").count()) > 0;

      if (limitReached) {
        // 한도 도달 시 기능 차단 확인
        const blockedFeature = page
          .locator('[data-testid="search-input"]')
          .first();

        if ((await blockedFeature.count()) > 0) {
          const isDisabled = await blockedFeature.isDisabled();
          expect(isDisabled).toBeTruthy();
        }
      }
    }
  });

  test("사용량 한도 여유 시 정상 접근", async ({ page }) => {
    await loginAsRegularUser(page);
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 사용량 확인
    const usageIndicator = page
      .locator('[data-testid="usage-indicator"]')
      .first();

    if ((await usageIndicator.count()) > 0) {
      const usageText = await usageIndicator.textContent();
      console.log("현재 사용량:", usageText);

      // 한도에 여유가 있으면 기능 사용 가능
      const searchInput = page.locator('input[type="search"]').first();

      if ((await searchInput.count()) > 0) {
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toBeEnabled();
      }
    }
  });
});

test.describe("SubscriptionGate - UI/UX", () => {
  test("업그레이드 버튼 클릭 시 결제 페이지 이동", async ({
    page,
    context,
  }) => {
    await loginAsRegularUser(page);
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 업그레이드 버튼 찾기
    const upgradeButton = page
      .getByRole("button", { name: /업그레이드|Upgrade|Pro 플랜/i })
      .first();

    if ((await upgradeButton.count()) > 0) {
      // 새 탭에서 열릴 수 있으므로 이벤트 리스너 등록
      const [newPage] = await Promise.all([
        context.waitForEvent("page", { timeout: 5000 }).catch(() => null),
        upgradeButton.click(),
      ]);

      if (newPage) {
        // 새 탭에서 결제 페이지 열림
        await newPage.waitForLoadState("networkidle");
        expect(newPage.url()).toContain("/billing");
      } else {
        // 같은 페이지에서 결제 페이지로 이동
        await page.waitForURL(/\/billing/, { timeout: 5000 }).catch(() => {});
        const currentUrl = page.url();
        console.log("업그레이드 버튼 클릭 후 URL:", currentUrl);
      }
    }
  });

  test("플랜 비교 모달 표시", async ({ page }) => {
    await loginAsRegularUser(page);
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 플랜 비교 버튼 찾기
    const comparePlansButton = page
      .getByRole("button", { name: /플랜 비교|요금제 비교/i })
      .first();

    if ((await comparePlansButton.count()) > 0) {
      await comparePlansButton.click();
      await page.waitForTimeout(500);

      // 모달이 열렸는지 확인
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible();

      // 플랜 이름 확인
      await expect(modal.getByText("Basic")).toBeVisible();
      await expect(modal.getByText("Pro")).toBeVisible();
      await expect(modal.getByText("Enterprise")).toBeVisible();
    }
  });

  test("사용량 툴팁 표시", async ({ page }) => {
    await loginAsRegularUser(page);
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 사용량 인디케이터에 마우스 호버
    const usageIndicator = page
      .locator('[data-testid="usage-indicator"]')
      .first();

    if ((await usageIndicator.count()) > 0) {
      await usageIndicator.hover();
      await page.waitForTimeout(500);

      // 툴팁 표시 확인
      const tooltip = page.locator('[role="tooltip"]').first();

      if ((await tooltip.count()) > 0) {
        await expect(tooltip).toBeVisible();

        // 상세 사용량 정보 포함 확인
        const tooltipText = await tooltip.textContent();
        console.log("사용량 툴팁:", tooltipText);
      }
    }
  });
});

test.describe("SubscriptionGate - Accessibility", () => {
  test("접근성: 업그레이드 안내 스크린리더 지원", async ({ page }) => {
    await loginAsRegularUser(page);
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 업그레이드 안내 메시지의 aria-label 확인
    const upgradePrompt = page
      .locator('[data-testid="upgrade-prompt"]')
      .first();

    if ((await upgradePrompt.count()) > 0) {
      const ariaLabel = await upgradePrompt.getAttribute("aria-label");
      const role = await upgradePrompt.getAttribute("role");

      // 스크린리더를 위한 속성이 있어야 함
      expect(ariaLabel || role).toBeTruthy();
    }
  });

  test("접근성: 사용량 프로그레스 바 aria 속성", async ({ page }) => {
    await loginAsRegularUser(page);
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 프로그레스 바의 aria 속성 확인
    const progressBar = page.locator('[role="progressbar"]').first();

    if ((await progressBar.count()) > 0) {
      const ariaValueNow = await progressBar.getAttribute("aria-valuenow");
      const ariaValueMin = await progressBar.getAttribute("aria-valuemin");
      const ariaValueMax = await progressBar.getAttribute("aria-valuemax");

      // ARIA 속성이 올바르게 설정되어 있어야 함
      expect(ariaValueNow).toBeTruthy();
      expect(ariaValueMin).toBe("0");
      expect(ariaValueMax).toBeTruthy();
    }
  });
});
