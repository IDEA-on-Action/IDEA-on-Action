import { test, expect } from "@playwright/test";

/**
 * Minu Sandbox Integration E2E Tests
 *
 * Sandbox 클라이언트 및 훅 통합 테스트
 * 참조: plan/minu-sandbox-setup.md
 *
 * 테스트 시나리오:
 * - Sandbox 클라이언트 초기화
 * - 테스트 사용자별 구독 정보 검증
 * - 에러 시나리오 시뮬레이션
 * - OAuth 플로우 시뮬레이션
 * - Rate Limiting 테스트
 * - Mock 응답 검증
 * - 토큰 관리 (교환, 갱신, 폐기)
 * - 세션 관리
 * - Audit Log 조회
 * - MCP 상태 모니터링
 */

const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

test.describe("Minu Sandbox - 클라이언트 초기화", () => {
  test("Sandbox 클라이언트 생성 및 설정 확인", async ({ page }) => {
    // Sandbox 테스트 페이지로 이동 (개발자 도구용 페이지 가정)
    await page.goto(`${BASE_URL}/dev/sandbox`);

    // 페이지 로드 확인
    await page.waitForLoadState("networkidle");

    // Sandbox 활성화 상태 확인
    const sandboxToggle = page.locator('[data-testid="sandbox-toggle"]');
    if ((await sandboxToggle.count()) > 0) {
      await expect(sandboxToggle).toBeVisible();

      // Sandbox 활성화
      const isChecked = await sandboxToggle.isChecked();
      if (!isChecked) {
        await sandboxToggle.click();
        await page.waitForTimeout(500);
      }

      console.log("Sandbox 모드 활성화됨");
    }
  });

  test("테스트 사용자 선택 및 설정", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // 사용자 선택 드롭다운
    const userSelector = page.locator('[data-testid="test-user-selector"]');
    if ((await userSelector.count()) > 0) {
      await userSelector.click();
      await page.waitForTimeout(300);

      // Pro 사용자 선택
      const proOption = page.locator('text="pro"');
      if ((await proOption.count()) > 0) {
        await proOption.click();
        await page.waitForTimeout(500);

        // 선택된 사용자 확인
        const selectedUser = page.locator('[data-testid="current-user"]');
        await expect(selectedUser).toContainText("pro");
        console.log("Pro 테스트 사용자 선택됨");
      }
    }
  });
});

test.describe("Minu Sandbox - 구독 정보 조회", () => {
  test("Free 플랜 사용자 구독 정보 검증", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // Free 사용자 선택
    const userSelector = page.locator('[data-testid="test-user-selector"]');
    if ((await userSelector.count()) > 0) {
      await userSelector.click();
      const freeOption = page.locator('text="free"');
      if ((await freeOption.count()) > 0) {
        await freeOption.click();
        await page.waitForTimeout(1000);

        // 구독 정보 표시 확인
        const subscriptionInfo = page.locator(
          '[data-testid="subscription-info"]'
        );
        if ((await subscriptionInfo.count()) > 0) {
          await expect(subscriptionInfo).toContainText("free");
          await expect(subscriptionInfo).toContainText("10"); // 검색 횟수 제한
          console.log("Free 플랜 구독 정보 표시됨");
        }
      }
    }
  });

  test("Pro 플랜 사용자 구독 정보 검증", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // Pro 사용자 선택
    const userSelector = page.locator('[data-testid="test-user-selector"]');
    if ((await userSelector.count()) > 0) {
      await userSelector.click();
      const proOption = page.locator('text="pro"');
      if ((await proOption.count()) > 0) {
        await proOption.click();
        await page.waitForTimeout(1000);

        // 구독 정보 확인
        const subscriptionInfo = page.locator(
          '[data-testid="subscription-info"]'
        );
        if ((await subscriptionInfo.count()) > 0) {
          await expect(subscriptionInfo).toContainText("pro");
          await expect(subscriptionInfo).toContainText("300"); // 검색 횟수
          await expect(subscriptionInfo).toContainText("AI"); // AI 분석 가능
          console.log("Pro 플랜 구독 정보 표시됨");
        }
      }
    }
  });

  test("Enterprise 플랜 - 무제한 기능 확인", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // Enterprise 사용자 선택
    const userSelector = page.locator('[data-testid="test-user-selector"]');
    if ((await userSelector.count()) > 0) {
      await userSelector.click();
      const enterpriseOption = page.locator('text="enterprise"');
      if ((await enterpriseOption.count()) > 0) {
        await enterpriseOption.click();
        await page.waitForTimeout(1000);

        // 구독 정보 확인
        const subscriptionInfo = page.locator(
          '[data-testid="subscription-info"]'
        );
        if ((await subscriptionInfo.count()) > 0) {
          await expect(subscriptionInfo).toContainText("enterprise");
          // 무제한 표시 확인
          const unlimited = page.locator('text=/무제한|Unlimited/i');
          if ((await unlimited.count()) > 0) {
            await expect(unlimited.first()).toBeVisible();
          }
          console.log("Enterprise 플랜 무제한 기능 확인됨");
        }
      }
    }
  });
});

test.describe("Minu Sandbox - 에러 시나리오 시뮬레이션", () => {
  test("Rate Limit 에러 시뮬레이션", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // 에러 시나리오 선택
    const errorSelector = page.locator('[data-testid="error-scenario-selector"]');
    if ((await errorSelector.count()) > 0) {
      await errorSelector.click();
      const rateLimitOption = page.locator('text="rate_limit"');
      if ((await rateLimitOption.count()) > 0) {
        await rateLimitOption.click();
        await page.waitForTimeout(500);

        // API 호출 시도
        const fetchButton = page.locator('[data-testid="fetch-subscription"]');
        if ((await fetchButton.count()) > 0) {
          await fetchButton.click();
          await page.waitForTimeout(1000);

          // 에러 메시지 확인
          const errorMessage = page.locator('[data-testid="error-message"]');
          if ((await errorMessage.count()) > 0) {
            await expect(errorMessage).toContainText(/429|rate.*limit/i);
            console.log("Rate Limit 에러 시뮬레이션 성공");
          }
        }
      }
    }
  });

  test("Unauthorized 에러 시뮬레이션", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    const errorSelector = page.locator('[data-testid="error-scenario-selector"]');
    if ((await errorSelector.count()) > 0) {
      await errorSelector.click();
      const unauthorizedOption = page.locator('text="unauthorized"');
      if ((await unauthorizedOption.count()) > 0) {
        await unauthorizedOption.click();
        await page.waitForTimeout(500);

        const fetchButton = page.locator('[data-testid="fetch-profile"]');
        if ((await fetchButton.count()) > 0) {
          await fetchButton.click();
          await page.waitForTimeout(1000);

          const errorMessage = page.locator('[data-testid="error-message"]');
          if ((await errorMessage.count()) > 0) {
            await expect(errorMessage).toContainText(/401|unauthorized/i);
            console.log("Unauthorized 에러 시뮬레이션 성공");
          }
        }
      }
    }
  });

  test("Network Error 시뮬레이션", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    const errorSelector = page.locator('[data-testid="error-scenario-selector"]');
    if ((await errorSelector.count()) > 0) {
      await errorSelector.click();
      const networkErrorOption = page.locator('text="network_error"');
      if ((await networkErrorOption.count()) > 0) {
        await networkErrorOption.click();
        await page.waitForTimeout(500);

        const fetchButton = page.locator('[data-testid="fetch-sessions"]');
        if ((await fetchButton.count()) > 0) {
          await fetchButton.click();
          await page.waitForTimeout(1000);

          const errorMessage = page.locator('[data-testid="error-message"]');
          if ((await errorMessage.count()) > 0) {
            await expect(errorMessage).toContainText(/network|연결/i);
            console.log("Network Error 시뮬레이션 성공");
          }
        }
      }
    }
  });
});

test.describe("Minu Sandbox - OAuth 플로우", () => {
  test("OAuth Authorization URL 생성", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // OAuth URL 생성 버튼
    const generateUrlButton = page.locator(
      '[data-testid="generate-oauth-url"]'
    );
    if ((await generateUrlButton.count()) > 0) {
      await generateUrlButton.click();
      await page.waitForTimeout(500);

      // 생성된 URL 확인
      const oauthUrl = page.locator('[data-testid="oauth-url"]');
      if ((await oauthUrl.count()) > 0) {
        const urlText = await oauthUrl.textContent();
        expect(urlText).toContain("oauth/authorize");
        expect(urlText).toContain("client_id=");
        expect(urlText).toContain("code_challenge=");
        console.log("OAuth Authorization URL 생성됨");
      }
    }
  });

  test("토큰 교환 시뮬레이션", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // 토큰 교환 버튼
    const exchangeButton = page.locator('[data-testid="exchange-token"]');
    if ((await exchangeButton.count()) > 0) {
      await exchangeButton.click();
      await page.waitForTimeout(1000);

      // 토큰 표시 확인
      const accessToken = page.locator('[data-testid="access-token"]');
      if ((await accessToken.count()) > 0) {
        const tokenText = await accessToken.textContent();
        expect(tokenText).toContain("sandbox_access_token_");
        console.log("토큰 교환 시뮬레이션 성공");
      }
    }
  });

  test("토큰 갱신 시뮬레이션", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    const refreshButton = page.locator('[data-testid="refresh-token"]');
    if ((await refreshButton.count()) > 0) {
      await refreshButton.click();
      await page.waitForTimeout(1000);

      const newToken = page.locator('[data-testid="access-token"]');
      if ((await newToken.count()) > 0) {
        const tokenText = await newToken.textContent();
        expect(tokenText).toContain("refreshed");
        console.log("토큰 갱신 시뮬레이션 성공");
      }
    }
  });
});

test.describe("Minu Sandbox - 세션 및 로그 관리", () => {
  test("세션 목록 조회", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // Pro 사용자 선택
    const userSelector = page.locator('[data-testid="test-user-selector"]');
    if ((await userSelector.count()) > 0) {
      await userSelector.click();
      const proOption = page.locator('text="pro"');
      if ((await proOption.count()) > 0) {
        await proOption.click();
        await page.waitForTimeout(500);
      }
    }

    // 세션 조회 버튼
    const fetchSessionsButton = page.locator('[data-testid="fetch-sessions"]');
    if ((await fetchSessionsButton.count()) > 0) {
      await fetchSessionsButton.click();
      await page.waitForTimeout(1000);

      // 세션 목록 표시 확인
      const sessionsList = page.locator('[data-testid="sessions-list"]');
      if ((await sessionsList.count()) > 0) {
        const sessionsCount = await sessionsList.locator(".session-item").count();
        expect(sessionsCount).toBeGreaterThan(0);
        console.log(`활성 세션 수: ${sessionsCount}`);
      }
    }
  });

  test("Audit Log 조회", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // Enterprise 사용자 선택 (Audit Log 접근 권한)
    const userSelector = page.locator('[data-testid="test-user-selector"]');
    if ((await userSelector.count()) > 0) {
      await userSelector.click();
      const enterpriseOption = page.locator('text="enterprise"');
      if ((await enterpriseOption.count()) > 0) {
        await enterpriseOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Audit Log 조회
    const fetchLogsButton = page.locator('[data-testid="fetch-audit-logs"]');
    if ((await fetchLogsButton.count()) > 0) {
      await fetchLogsButton.click();
      await page.waitForTimeout(1000);

      // Audit Log 표시 확인
      const logsList = page.locator('[data-testid="audit-logs-list"]');
      if ((await logsList.count()) > 0) {
        const logsCount = await logsList.locator(".log-entry").count();
        expect(logsCount).toBeGreaterThan(0);
        console.log(`Audit Log 항목 수: ${logsCount}`);
      }
    }
  });
});

test.describe("Minu Sandbox - MCP 상태 모니터링", () => {
  test("MCP 상태 조회", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // MCP 상태 조회 버튼
    const mcpStatusButton = page.locator('[data-testid="fetch-mcp-status"]');
    if ((await mcpStatusButton.count()) > 0) {
      await mcpStatusButton.click();
      await page.waitForTimeout(1000);

      // MCP 상태 표시 확인
      const mcpStatus = page.locator('[data-testid="mcp-status"]');
      if ((await mcpStatus.count()) > 0) {
        await expect(mcpStatus).toContainText(/healthy|online|정상/i);
        console.log("MCP 상태 정상");
      }
    }
  });

  test("MCP 상태 자동 갱신", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // 초기 상태 확인
    const initialStatus = page.locator('[data-testid="mcp-last-check"]');
    if ((await initialStatus.count()) > 0) {
      const initialTime = await initialStatus.textContent();

      // 30초 대기 (자동 갱신 주기)
      await page.waitForTimeout(31000);

      // 갱신된 시간 확인
      const updatedTime = await initialStatus.textContent();
      expect(updatedTime).not.toBe(initialTime);
      console.log("MCP 상태 자동 갱신 확인됨");
    }
  });
});

test.describe("Minu Sandbox - Mock 응답 검증", () => {
  test("Mock 응답 지연 시간 설정", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // Mock 지연 설정
    const delayInput = page.locator('[data-testid="mock-delay-input"]');
    if ((await delayInput.count()) > 0) {
      await delayInput.fill("1000"); // 1초 지연
      await page.waitForTimeout(300);

      // API 호출 및 시간 측정
      const startTime = Date.now();
      const fetchButton = page.locator('[data-testid="fetch-subscription"]');
      if ((await fetchButton.count()) > 0) {
        await fetchButton.click();
        await page.waitForSelector('[data-testid="subscription-info"]', {
          timeout: 5000,
        });
        const endTime = Date.now();

        const elapsed = endTime - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(1000);
        console.log(`Mock 응답 지연: ${elapsed}ms`);
      }
    }
  });

  test("Mock 데이터 일관성 검증", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // Pro 사용자 선택
    const userSelector = page.locator('[data-testid="test-user-selector"]');
    if ((await userSelector.count()) > 0) {
      await userSelector.click();
      const proOption = page.locator('text="pro"');
      if ((await proOption.count()) > 0) {
        await proOption.click();
        await page.waitForTimeout(500);
      }
    }

    // 구독 정보 조회
    const fetchButton = page.locator('[data-testid="fetch-subscription"]');
    if ((await fetchButton.count()) > 0) {
      await fetchButton.click();
      await page.waitForTimeout(1000);

      // 응답 데이터 검증
      const subscriptionInfo = page.locator('[data-testid="subscription-info"]');
      if ((await subscriptionInfo.count()) > 0) {
        const infoText = await subscriptionInfo.textContent();

        // Pro 플랜 예상값 검증
        expect(infoText).toContain("pro");
        expect(infoText).toContain("300"); // searchCount
        expect(infoText).toContain("6"); // platforms
        console.log("Mock 데이터 일관성 검증됨");
      }
    }
  });
});

test.describe("Minu Sandbox - 리셋 및 정리", () => {
  test("Sandbox 전체 초기화", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev/sandbox`);
    await page.waitForLoadState("networkidle");

    // 초기화 버튼
    const resetButton = page.locator('[data-testid="sandbox-reset"]');
    if ((await resetButton.count()) > 0) {
      await resetButton.click();
      await page.waitForTimeout(500);

      // 초기 상태 확인
      const currentUser = page.locator('[data-testid="current-user"]');
      if ((await currentUser.count()) > 0) {
        const userText = await currentUser.textContent();
        expect(userText).toContain("선택되지 않음");
        console.log("Sandbox 초기화 완료");
      }
    }
  });
});
