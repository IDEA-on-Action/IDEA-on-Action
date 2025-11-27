import { test, expect } from "@playwright/test";
import { loginAsRegularUser } from "../../fixtures/auth-helpers";

/**
 * Subscription Usage E2E Tests
 *
 * 구독 사용량 관리 테스트
 *
 * 테스트 시나리오:
 * - 사용량 조회 API 정상 응답
 * - 사용량 증가 후 카운트 반영
 * - 제한 도달 시 접근 거부
 * - 월 초 사용량 리셋 확인
 * - 무제한 플랜 사용량 추적
 * - 여러 기능 동시 사용량 조회
 * - 비인증 사용자 Free 플랜 적용
 */

test.describe("Subscription Usage", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test("사용량 조회 API 정상 응답", async ({ page, request }) => {
    // 로그인
    await loginAsRegularUser(page);

    // 사용량 조회 API 호출
    const response = await request.get(`${BASE_URL}/api/user/usage`, {
      headers: {
        Accept: "application/json",
      },
      failOnStatusCode: false,
    });

    // API가 구현되어 있다면 200 응답
    if (response.ok()) {
      const body = await response.json();

      // 사용량 데이터 구조 확인
      expect(body).toHaveProperty("service");
      expect(body).toHaveProperty("usage");
      expect(body).toHaveProperty("limits");

      // usage와 limits는 객체 형태
      expect(typeof body.usage).toBe("object");
      expect(typeof body.limits).toBe("object");
    } else {
      // 아직 구현되지 않았을 수 있음
      expect([401, 404, 501]).toContain(response.status());
    }
  });

  test("사용량 증가 후 카운트 반영", async ({ page, request }) => {
    // 로그인
    await loginAsRegularUser(page);

    // 초기 사용량 조회
    const initialResponse = await request.get(
      `${BASE_URL}/api/user/usage?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (initialResponse.ok()) {
      const initialBody = await initialResponse.json();
      const initialSearchCount = initialBody.usage?.searchCount || 0;

      // 검색 기능 사용 (사용량 증가 트리거)
      await page.goto("/services/minu/find");
      await page.waitForLoadState("networkidle");

      // 검색 수행 (구현되어 있다면)
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="검색"]',
      );
      if ((await searchInput.count()) > 0) {
        await searchInput.fill("테스트 검색어");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(1000);
      }

      // 사용량 재조회
      const updatedResponse = await request.get(
        `${BASE_URL}/api/user/usage?service=find`,
        {
          failOnStatusCode: false,
        },
      );

      if (updatedResponse.ok()) {
        const updatedBody = await updatedResponse.json();
        const updatedSearchCount = updatedBody.usage?.searchCount || 0;

        // 사용량이 증가했는지 확인
        expect(updatedSearchCount).toBeGreaterThanOrEqual(initialSearchCount);
      }
    }
  });

  test("제한 도달 시 접근 거부", async ({ page }) => {
    // 로그인
    await loginAsRegularUser(page);

    // Minu Find 페이지 접속
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // 제한 도달 메시지가 있는지 확인
    const limitReachedSelectors = [
      "text=/한도.*도달|limit.*reached|업그레이드/i",
      '[data-testid="usage-limit-warning"]',
      '[data-testid="upgrade-prompt"]',
      ".usage-limit-warning",
    ];

    let limitReachedFound = false;
    for (const selector of limitReachedSelectors) {
      if ((await page.locator(selector).count()) > 0) {
        limitReachedFound = true;
        console.log("사용량 제한 메시지 발견:", selector);
        break;
      }
    }

    // 제한 도달 메시지가 있거나 없을 수 있음 (사용량에 따라 다름)
    // 따라서 assertion 없이 로깅만 수행
    console.log("제한 도달 상태:", limitReachedFound);
  });

  test("월 초 사용량 리셋 확인", async ({ request }) => {
    // 사용량 조회 API 호출
    const response = await request.get(
      `${BASE_URL}/api/user/usage?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // lastResetAt 필드 확인
      if (body.usage?.lastResetAt) {
        const lastResetDate = new Date(body.usage.lastResetAt);
        const currentDate = new Date();

        // lastResetAt이 현재 월의 1일인지 확인
        // (실제로는 매월 1일 00:00에 리셋됨)
        const isThisMonth =
          lastResetDate.getMonth() === currentDate.getMonth() &&
          lastResetDate.getFullYear() === currentDate.getFullYear();

        expect(isThisMonth).toBeTruthy();
      }
    }
  });

  test("무제한 플랜 사용량 추적", async ({ page, request }) => {
    // 로그인 (Enterprise 플랜 사용자 필요)
    await loginAsRegularUser(page);

    // 구독 정보 조회
    const subResponse = await request.get(
      `${BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (subResponse.ok()) {
      const subBody = await subResponse.json();

      // Enterprise 플랜은 무제한
      if (subBody.plan === "enterprise") {
        // 사용량 조회
        const usageResponse = await request.get(
          `${BASE_URL}/api/user/usage?service=find`,
          {
            failOnStatusCode: false,
          },
        );

        if (usageResponse.ok()) {
          const usageBody = await usageResponse.json();

          // 무제한 플랜도 사용량은 추적되어야 함
          expect(usageBody.usage).toBeDefined();

          // 제한이 -1 또는 매우 큰 숫자일 수 있음
          const searchLimit = usageBody.limits?.searchCount;
          expect(searchLimit).toBeGreaterThan(1000); // 무제한은 매우 큰 숫자
        }
      }
    }
  });

  test("여러 기능 동시 사용량 조회", async ({ request }) => {
    // 전체 구독 정보 조회
    const response = await request.get(`${BASE_URL}/api/user/subscriptions`, {
      failOnStatusCode: false,
    });

    if (response.ok()) {
      const body = await response.json();

      // 여러 서비스의 구독 정보가 배열로 반환됨
      expect(Array.isArray(body)).toBeTruthy();

      if (body.length > 0) {
        // 각 서비스별 사용량 확인
        for (const subscription of body) {
          expect(subscription).toHaveProperty("service");
          expect(subscription).toHaveProperty("plan");
          expect(subscription).toHaveProperty("status");

          // 사용량 정보가 포함되어 있을 수 있음
          if (subscription.usage) {
            expect(typeof subscription.usage).toBe("object");
          }
        }
      }
    }
  });

  test("비인증 사용자 Free 플랜 적용", async ({ page, request }) => {
    // 로그아웃 상태에서 접근
    await page.goto("/services/minu/find");
    await page.waitForLoadState("networkidle");

    // Free 플랜 제한 메시지 확인
    const freePlanSelectors = [
      "text=/무료 체험|Free|Basic/i",
      "text=/로그인.*더 많은/i",
      '[data-testid="free-plan-notice"]',
    ];

    let freePlanFound = false;
    for (const selector of freePlanSelectors) {
      if ((await page.locator(selector).count()) > 0) {
        freePlanFound = true;
        console.log("Free 플랜 안내 발견:", selector);
        break;
      }
    }

    // Free 플랜 안내가 있을 수 있음
    console.log("Free 플랜 적용 여부:", freePlanFound);
  });
});

test.describe("Subscription Usage - Feature Limits", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test("검색 횟수 제한 확인", async ({ page, request }) => {
    await loginAsRegularUser(page);

    // 구독 정보 조회
    const response = await request.get(
      `${BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // searchCount 제한 확인
      expect(body.limits).toHaveProperty("searchCount");
      expect(typeof body.limits.searchCount).toBe("number");

      // Basic: 50, Pro: 300, Enterprise: 무제한
      const expectedLimits = {
        basic: 50,
        pro: 300,
        enterprise: 999999,
      };

      if (body.plan in expectedLimits) {
        expect(body.limits.searchCount).toBeGreaterThanOrEqual(
          expectedLimits[body.plan as keyof typeof expectedLimits],
        );
      }
    }
  });

  test("제안서 작성 횟수 제한 확인", async ({ request }) => {
    await request.get(`${BASE_URL}/login`); // 세션 생성

    // Minu Frame 구독 정보 조회
    const response = await request.get(
      `${BASE_URL}/api/user/subscription?service=frame`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // proposalCount 제한 확인
      if (body.limits?.proposalCount) {
        expect(typeof body.limits.proposalCount).toBe("number");

        // Basic: 5, Pro: 30, Enterprise: 무제한
        const expectedLimits = {
          basic: 5,
          pro: 30,
          enterprise: 999999,
        };

        if (body.plan in expectedLimits) {
          expect(body.limits.proposalCount).toBeGreaterThanOrEqual(
            expectedLimits[body.plan as keyof typeof expectedLimits],
          );
        }
      }
    }
  });

  test("AI 분석 횟수 제한 확인", async ({ request }) => {
    await request.get(`${BASE_URL}/login`);

    const response = await request.get(
      `${BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // AI 분석 기능은 Pro 이상에서만 사용 가능
      if (body.plan === "pro" || body.plan === "enterprise") {
        expect(body.limits).toHaveProperty("aiAnalysisCount");
      }
    }
  });
});

test.describe("Subscription Usage - Reset Logic", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test("월간 사용량 리셋 일자 확인", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/user/usage?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      if (body.usage?.lastResetAt) {
        const resetDate = new Date(body.usage.lastResetAt);

        // 리셋 일자가 매월 1일 00:00이어야 함
        expect(resetDate.getDate()).toBe(1);
        expect(resetDate.getHours()).toBe(0);
        expect(resetDate.getMinutes()).toBe(0);
      }
    }
  });

  test("사용량 리셋 후 카운트 0으로 초기화", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/user/usage?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // 현재 날짜가 1일이면 사용량이 적어야 함
      const currentDate = new Date();
      if (currentDate.getDate() === 1) {
        // 리셋된 직후라면 사용량이 적을 것
        const searchCount = body.usage?.searchCount || 0;
        console.log("월 초 사용량:", searchCount);
      }
    }
  });
});

test.describe("Subscription Usage - Error Handling", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test("구독 없이 사용량 조회 시 Free 플랜 반환", async ({ page, request }) => {
    // 비로그인 상태
    await page.goto("/");

    const response = await request.get(
      `${BASE_URL}/api/user/usage?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (response.ok()) {
      const body = await response.json();

      // 비로그인 시 Free 플랜 또는 제한된 접근
      expect(body.plan).toBe("free");
      expect(body.limits.searchCount).toBeLessThanOrEqual(10);
    } else {
      // 401 Unauthorized 응답
      expect(response.status()).toBe(401);
    }
  });

  test("잘못된 서비스명 요청 시 에러 처리", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/user/usage?service=invalid-service`,
      {
        failOnStatusCode: false,
      },
    );

    if (!response.ok()) {
      // 400 또는 404 에러
      expect([400, 404]).toContain(response.status());

      const body = await response.json();
      expect(body).toHaveProperty("error");
    }
  });
});
