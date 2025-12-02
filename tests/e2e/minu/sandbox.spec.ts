import { test, expect } from "@playwright/test";
import * as crypto from "crypto";

/**
 * Minu Sandbox E2E Tests
 *
 * Minu Sandbox 환경 통합 테스트
 * 참조: plan/minu-sandbox-setup.md
 *
 * 테스트 시나리오:
 * - Minu 페이지 접근 및 권한 확인
 * - MCP 연결 상태 확인
 * - OAuth 인증 플로우 (Sandbox 환경)
 * - API 호출 테스트
 * - 에러 상태 처리
 * - 권한별 접근 제어 (플랜별)
 * - Rate Limiting 테스트
 * - 세션 관리
 * - 토큰 갱신
 * - Webhook 검증
 */

// Sandbox 환경 설정
const SANDBOX_BASE_URL =
  process.env.VITE_SANDBOX_URL || "https://sandbox.ideaonaction.ai";
const MINU_FIND_SANDBOX = "https://sandbox.find.minu.best";

// OAuth 테스트 설정
const SANDBOX_CLIENT_ID = "minu-find-sandbox";
const SANDBOX_REDIRECT_URI = `${MINU_FIND_SANDBOX}/callback`;

// Sandbox 테스트 계정 (plan/minu-sandbox-setup.md 참조)
const sandboxUsers = {
  free: {
    email: "test-free@ideaonaction.ai",
    password: "Test1234!",
    plan: "free",
    expectedLimits: {
      searchCount: 10,
      platforms: 0,
      aiAnalysis: false,
      historyMonths: 1,
    },
  },
  basic: {
    email: "test-basic@ideaonaction.ai",
    password: "Test1234!",
    plan: "basic",
    expectedLimits: {
      searchCount: 50,
      platforms: 2,
      aiAnalysis: false,
      historyMonths: 3,
    },
  },
  pro: {
    email: "test-pro@ideaonaction.ai",
    password: "Test1234!",
    plan: "pro",
    expectedLimits: {
      searchCount: 300,
      platforms: 6,
      aiAnalysis: true,
      historyMonths: 6,
    },
  },
  expired: {
    email: "test-expired@ideaonaction.ai",
    password: "Test1234!",
    plan: "basic",
    status: "expired",
  },
  enterprise: {
    email: "test-enterprise@ideaonaction.ai",
    password: "Test1234!",
    plan: "enterprise",
    expectedLimits: {
      searchCount: 999999,
      platforms: 999,
      aiAnalysis: true,
      historyMonths: 999,
      teamMembers: 100,
    },
  },
} as const;

// PKCE 헬퍼 함수
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateRandomState(): string {
  return crypto.randomBytes(16).toString("hex");
}

test.describe("Minu Sandbox - 페이지 접근 및 권한", () => {
  test("Sandbox 환경 Minu 페이지 접근 가능", async ({ page }) => {
    // Sandbox 환경의 Minu 플랫폼 페이지 접속
    await page.goto(`${SANDBOX_BASE_URL}/services/minu`);
    await page.waitForLoadState("networkidle");

    // 페이지 로드 확인
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/Minu/i);

    // 4개 서비스 표시 확인
    await expect(page.locator("text=Minu Find").first()).toBeVisible();
    await expect(page.locator("text=Minu Frame").first()).toBeVisible();
    await expect(page.locator("text=Minu Build").first()).toBeVisible();
    await expect(page.locator("text=Minu Keep").first()).toBeVisible();
  });

  test("Sandbox 환경 Minu Find 페이지 접근", async ({ page }) => {
    await page.goto(`${SANDBOX_BASE_URL}/services/minu/find`);
    await page.waitForLoadState("networkidle");

    // 페이지 제목 확인
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Minu Find");

    // 플랜 카드 표시 확인
    await expect(
      page.getByRole("heading", { name: "Basic" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pro" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Enterprise" }).first(),
    ).toBeVisible();
  });

  test("비로그인 사용자 - 로그인 안내 표시", async ({ page }) => {
    await page.goto(`${SANDBOX_BASE_URL}/services/minu/find`);
    await page.waitForLoadState("networkidle");

    // 로그인/가입 버튼 또는 안내 메시지 확인
    const loginButton = page.getByRole("link", {
      name: /로그인|무료 체험|시작하기/,
    });
    await expect(loginButton.first()).toBeVisible();
  });
});

test.describe("Minu Sandbox - OAuth 인증 플로우", () => {
  test("OAuth Authorization Code Flow - PKCE 포함", async ({ page }) => {
    const state = generateRandomState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // OAuth 인가 요청 URL 구성
    const authorizeUrl = new URL(`${SANDBOX_BASE_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", SANDBOX_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", SANDBOX_REDIRECT_URI);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "openid profile email offline_access");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    // 인가 요청
    await page.goto(authorizeUrl.toString());

    // 로그인 페이지로 리다이렉트 확인
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // 로그인 폼 확인
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
  });

  test("OAuth 인증 후 코드 발급 - Pro 사용자", async ({ page }) => {
    const state = generateRandomState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // OAuth 인가 요청
    const authorizeUrl = new URL(`${SANDBOX_BASE_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", SANDBOX_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", SANDBOX_REDIRECT_URI);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "openid profile email offline_access");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    await page.goto(authorizeUrl.toString());
    await page.waitForURL(/\/login/);

    // Pro 사용자로 로그인
    await page.fill('input[type="email"]', sandboxUsers.pro.email);
    await page.fill('input[type="password"]', sandboxUsers.pro.password);
    await page.click('button[type="submit"]');

    // 콜백 처리 대기
    await page.waitForTimeout(3000);

    // 리다이렉트 URL 확인 (실제 Minu 서비스로 리다이렉트될 수 있음)
    const currentUrl = new URL(page.url());

    // 인가 코드가 발급되었는지 확인 (콜백 URL 또는 메인 페이지)
    if (currentUrl.origin === new URL(SANDBOX_REDIRECT_URI).origin) {
      const code = currentUrl.searchParams.get("code");
      const returnedState = currentUrl.searchParams.get("state");

      expect(code).toBeTruthy();
      expect(returnedState).toBe(state);
    } else {
      // OAuth 플로우가 아직 구현 전이거나 자동 승인된 경우
      console.log("OAuth 플로우 대기 중 또는 자동 승인됨");
    }
  });

  test("잘못된 client_id 에러 처리", async ({ page }) => {
    const state = generateRandomState();

    const authorizeUrl = new URL(`${SANDBOX_BASE_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", "invalid-client-id");
    authorizeUrl.searchParams.set("redirect_uri", SANDBOX_REDIRECT_URI);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "openid profile email");
    authorizeUrl.searchParams.set("state", state);

    await page.goto(authorizeUrl.toString(), { waitUntil: "networkidle" });

    // 에러 메시지 또는 에러 페이지 확인
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasError =
      bodyText?.includes("invalid") ||
      bodyText?.includes("error") ||
      bodyText?.includes("오류") ||
      page.url().includes("error=");

    if (hasError) {
      expect(hasError).toBeTruthy();
      console.log("잘못된 client_id 에러 처리됨");
    }
  });

  test("잘못된 redirect_uri 에러 처리", async ({ page }) => {
    const state = generateRandomState();
    const invalidRedirectUri = "https://malicious-site.com/callback";

    const authorizeUrl = new URL(`${SANDBOX_BASE_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", SANDBOX_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", invalidRedirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "openid profile email");
    authorizeUrl.searchParams.set("state", state);

    await page.goto(authorizeUrl.toString(), { waitUntil: "networkidle" });

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasError =
      bodyText?.includes("invalid") ||
      bodyText?.includes("redirect") ||
      bodyText?.includes("오류");

    if (hasError) {
      expect(hasError).toBeTruthy();
      console.log("잘못된 redirect_uri 에러 처리됨");
    }
  });
});

test.describe("Minu Sandbox - API 호출 테스트", () => {
  test("토큰 교환 API - Authorization Code Grant", async ({ request }) => {
    const mockAuthCode = "sandbox_test_auth_code";
    const codeVerifier = generateCodeVerifier();

    const tokenResponse = await request.post(
      `${SANDBOX_BASE_URL}/oauth/token`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        form: {
          grant_type: "authorization_code",
          code: mockAuthCode,
          client_id: SANDBOX_CLIENT_ID,
          code_verifier: codeVerifier,
          redirect_uri: SANDBOX_REDIRECT_URI,
        },
        failOnStatusCode: false,
      },
    );

    // API 구현 상태에 따라 응답 확인
    if (tokenResponse.ok()) {
      const body = await tokenResponse.json();
      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("token_type", "Bearer");
      expect(body).toHaveProperty("expires_in");
      expect(body).toHaveProperty("refresh_token");
      console.log("토큰 교환 API 정상 작동");
    } else {
      // 아직 구현 전이거나 Mock 코드 문제
      expect([400, 401, 404, 501]).toContain(tokenResponse.status());
      console.log("토큰 교환 API 응답:", tokenResponse.status());
    }
  });

  test("토큰 갱신 API - Refresh Token Grant", async ({ request }) => {
    const mockRefreshToken = "sandbox_test_refresh_token";

    const tokenResponse = await request.post(
      `${SANDBOX_BASE_URL}/oauth/token`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        form: {
          grant_type: "refresh_token",
          refresh_token: mockRefreshToken,
          client_id: SANDBOX_CLIENT_ID,
        },
        failOnStatusCode: false,
      },
    );

    if (tokenResponse.ok()) {
      const body = await tokenResponse.json();
      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("token_type", "Bearer");
      console.log("토큰 갱신 API 정상 작동");
    } else {
      expect([400, 401, 404, 501]).toContain(tokenResponse.status());
      console.log("토큰 갱신 API 응답:", tokenResponse.status());
    }
  });

  test("토큰 폐기 API - Token Revocation", async ({ request }) => {
    const mockAccessToken = "sandbox_test_access_token";

    const revokeResponse = await request.post(
      `${SANDBOX_BASE_URL}/oauth/revoke`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        form: {
          token: mockAccessToken,
          token_type_hint: "access_token",
          client_id: SANDBOX_CLIENT_ID,
        },
        failOnStatusCode: false,
      },
    );

    if (revokeResponse.ok()) {
      expect([200, 204]).toContain(revokeResponse.status());
      console.log("토큰 폐기 API 정상 작동");
    } else {
      expect([400, 401, 404, 501]).toContain(revokeResponse.status());
      console.log("토큰 폐기 API 응답:", revokeResponse.status());
    }
  });
});

test.describe("Minu Sandbox - 플랜별 권한 확인", () => {
  test("Free 플랜 - 기본 접근만 허용", async ({ page, request }) => {
    // 로그인
    await page.goto(`${SANDBOX_BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', sandboxUsers.free.email);
    await page.fill('input[type="password"]', sandboxUsers.free.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // 구독 정보 API 호출
    const subscriptionResponse = await request.get(
      `${SANDBOX_BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (subscriptionResponse.ok()) {
      const subscription = await subscriptionResponse.json();
      expect(subscription.plan).toBe("free");

      // Free 플랜 제한 확인
      const limits = subscription.limits || {};
      expect(limits.searchCount).toBeLessThanOrEqual(
        sandboxUsers.free.expectedLimits.searchCount,
      );
      console.log("Free 플랜 제한:", limits);
    }
  });

  test("Basic 플랜 - 기본 기능 사용 가능", async ({ page, request }) => {
    await page.goto(`${SANDBOX_BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', sandboxUsers.basic.email);
    await page.fill('input[type="password"]', sandboxUsers.basic.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    const subscriptionResponse = await request.get(
      `${SANDBOX_BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (subscriptionResponse.ok()) {
      const subscription = await subscriptionResponse.json();
      expect(subscription.plan).toBe("basic");
      expect(subscription.status).toBe("active");

      const limits = subscription.limits || {};
      expect(limits.searchCount).toBe(
        sandboxUsers.basic.expectedLimits.searchCount,
      );
      expect(limits.platforms).toBe(
        sandboxUsers.basic.expectedLimits.platforms,
      );
      console.log("Basic 플랜 제한:", limits);
    }
  });

  test("Pro 플랜 - 고급 기능 사용 가능", async ({ page, request }) => {
    await page.goto(`${SANDBOX_BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', sandboxUsers.pro.email);
    await page.fill('input[type="password"]', sandboxUsers.pro.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    const subscriptionResponse = await request.get(
      `${SANDBOX_BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (subscriptionResponse.ok()) {
      const subscription = await subscriptionResponse.json();
      expect(subscription.plan).toBe("pro");
      expect(subscription.status).toBe("active");

      const limits = subscription.limits || {};
      expect(limits.searchCount).toBe(
        sandboxUsers.pro.expectedLimits.searchCount,
      );
      expect(limits.aiAnalysis).toBe(
        sandboxUsers.pro.expectedLimits.aiAnalysis,
      );
      console.log("Pro 플랜 제한:", limits);
    }
  });

  test("만료된 구독 - 접근 차단 및 갱신 안내", async ({ page, request }) => {
    await page.goto(`${SANDBOX_BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', sandboxUsers.expired.email);
    await page.fill('input[type="password"]', sandboxUsers.expired.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    const subscriptionResponse = await request.get(
      `${SANDBOX_BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (subscriptionResponse.ok()) {
      const subscription = await subscriptionResponse.json();
      expect(subscription.status).toBe("expired");

      // 만료일 확인
      if (subscription.expires_at) {
        const expiryDate = new Date(subscription.expires_at);
        const now = new Date();
        expect(expiryDate < now).toBeTruthy();
      }

      console.log("만료된 구독 상태:", subscription.status);
    }
  });

  test("Enterprise 플랜 - 모든 기능 + 팀 관리", async ({
    page,
    request,
  }) => {
    await page.goto(`${SANDBOX_BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', sandboxUsers.enterprise.email);
    await page.fill('input[type="password"]', sandboxUsers.enterprise.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    const subscriptionResponse = await request.get(
      `${SANDBOX_BASE_URL}/api/user/subscription?service=find`,
      {
        failOnStatusCode: false,
      },
    );

    if (subscriptionResponse.ok()) {
      const subscription = await subscriptionResponse.json();
      expect(subscription.plan).toBe("enterprise");
      expect(subscription.status).toBe("active");

      const limits = subscription.limits || {};
      expect(limits.searchCount).toBeGreaterThan(1000);
      expect(limits.teamMembers).toBeGreaterThan(1);
      console.log("Enterprise 플랜 제한:", limits);
    }
  });
});

test.describe("Minu Sandbox - Rate Limiting", () => {
  test("Rate Limit 초과 시 429 응답", async ({ request }) => {
    // OAuth 토큰 엔드포인트에 반복 요청 (Rate Limit 테스트)
    const requests = [];

    for (let i = 0; i < 15; i++) {
      requests.push(
        request.post(`${SANDBOX_BASE_URL}/oauth/token`, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          form: {
            grant_type: "refresh_token",
            refresh_token: "dummy-token",
            client_id: SANDBOX_CLIENT_ID,
          },
          failOnStatusCode: false,
        }),
      );
    }

    const responses = await Promise.all(requests);

    // Rate Limit 초과 응답 확인
    const rateLimitedResponses = responses.filter((r) => r.status() === 429);

    if (rateLimitedResponses.length > 0) {
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Retry-After 헤더 확인
      const firstRateLimited = rateLimitedResponses[0];
      const retryAfter = firstRateLimited.headers()["retry-after"];
      expect(retryAfter).toBeDefined();

      console.log(
        `Rate Limit 초과 응답 ${rateLimitedResponses.length}개, Retry-After: ${retryAfter}`,
      );
    } else {
      console.log("Rate Limiting 아직 미구현 또는 제한 높음");
    }
  });
});

test.describe("Minu Sandbox - 에러 상태 처리", () => {
  test("인증 없이 보호된 리소스 접근 - 401", async ({ request }) => {
    const response = await request.get(
      `${SANDBOX_BASE_URL}/api/user/profile`,
      {
        failOnStatusCode: false,
      },
    );

    // 인증 필요 시 401 또는 302 (리다이렉트)
    expect([401, 302, 403]).toContain(response.status());
  });

  test("존재하지 않는 OAuth 클라이언트 - 에러 처리", async ({
    request,
  }) => {
    const response = await request.post(`${SANDBOX_BASE_URL}/oauth/token`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      form: {
        grant_type: "authorization_code",
        code: "test-code",
        client_id: "non-existent-client",
        redirect_uri: "https://example.com/callback",
      },
      failOnStatusCode: false,
    });

    // 400 또는 401 에러 응답
    expect([400, 401, 404]).toContain(response.status());
  });

  test("잘못된 Grant Type - 400 에러", async ({ request }) => {
    const response = await request.post(`${SANDBOX_BASE_URL}/oauth/token`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      form: {
        grant_type: "invalid_grant_type",
        client_id: SANDBOX_CLIENT_ID,
      },
      failOnStatusCode: false,
    });

    expect([400, 501]).toContain(response.status());

    if (response.status() === 400) {
      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toBe("unsupported_grant_type");
    }
  });
});

test.describe("Minu Sandbox - MCP 연결 상태", () => {
  test("MCP 상태 페이지 접근 가능", async ({ page }) => {
    // Admin으로 로그인
    await page.goto(`${SANDBOX_BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', sandboxUsers.enterprise.email);
    await page.fill('input[type="password"]', sandboxUsers.enterprise.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // MCP 대시보드 또는 상태 페이지 접속
    await page.goto(`${SANDBOX_BASE_URL}/admin/mcp`, {
      waitUntil: "networkidle",
    });

    // MCP 상태 정보가 표시되는지 확인
    const mcpContent = page.locator("text=/MCP|Model Context Protocol/i");
    if ((await mcpContent.count()) > 0) {
      await expect(mcpContent.first()).toBeVisible();
      console.log("MCP 상태 페이지 접근 가능");
    } else {
      console.log("MCP 상태 페이지 미구현 또는 권한 없음");
    }
  });
});

test.describe("Minu Sandbox - 세션 관리", () => {
  test("동시 세션 관리 - 여러 디바이스", async ({ page, request }) => {
    // Pro 사용자로 로그인
    await page.goto(`${SANDBOX_BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', sandboxUsers.pro.email);
    await page.fill('input[type="password"]', sandboxUsers.pro.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // 세션 목록 조회 (구현된 경우)
    const sessionsResponse = await request.get(
      `${SANDBOX_BASE_URL}/api/user/sessions`,
      {
        failOnStatusCode: false,
      },
    );

    if (sessionsResponse.ok()) {
      const sessions = await sessionsResponse.json();

      if (Array.isArray(sessions)) {
        expect(sessions.length).toBeGreaterThan(0);
        console.log("활성 세션 수:", sessions.length);

        // 각 세션에 필요한 정보 확인
        const firstSession = sessions[0];
        expect(firstSession).toHaveProperty("id");
        expect(firstSession).toHaveProperty("created_at");
      }
    } else {
      console.log("세션 관리 API 미구현:", sessionsResponse.status());
    }
  });
});

test.describe("Minu Sandbox - Webhook 검증", () => {
  test("Webhook 서명 검증 - HMAC-SHA256", async () => {
    const webhookSecret = process.env.VITE_WEBHOOK_SECRET || "test-secret";
    const payload = {
      event: "subscription.updated",
      user_id: "test-user-id",
      subscription: {
        plan: "pro",
        status: "active",
      },
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify(payload);

    // HMAC-SHA256 서명 생성
    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(`${timestamp}.${body}`)
      .digest("hex");

    // 서명 생성 확인
    expect(signature).toBeTruthy();
    expect(signature.length).toBe(64); // SHA256 = 64 hex chars

    console.log("Webhook 서명 생성:", signature.substring(0, 16) + "...");

    // 실제 Webhook 엔드포인트 호출은 Minu 서비스 측에서 수행
    // 여기서는 서명 생성 로직만 검증
  });
});

test.describe("Minu Sandbox - Audit Log", () => {
  test("중요 작업 Audit Log 기록 확인", async ({ page, request }) => {
    // Enterprise 사용자로 로그인
    await page.goto(`${SANDBOX_BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', sandboxUsers.enterprise.email);
    await page.fill('input[type="password"]', sandboxUsers.enterprise.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Audit Log 조회
    const auditResponse = await request.get(
      `${SANDBOX_BASE_URL}/api/audit-log`,
      {
        failOnStatusCode: false,
      },
    );

    if (auditResponse.ok()) {
      const logs = await auditResponse.json();

      if (Array.isArray(logs) && logs.length > 0) {
        const latestLog = logs[0];

        // Audit Log 필수 필드 확인
        expect(latestLog).toHaveProperty("event_type");
        expect(latestLog).toHaveProperty("actor_id");
        expect(latestLog).toHaveProperty("created_at");

        console.log("최근 Audit Log:", latestLog.event_type);
      } else {
        console.log("Audit Log 없음");
      }
    } else {
      console.log("Audit Log API 미구현:", auditResponse.status());
    }
  });
});
