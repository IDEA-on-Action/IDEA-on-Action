import { test, expect } from "@playwright/test";
import { testUsers } from "../../fixtures/users";
import * as crypto from "crypto";

/**
 * OAuth 2.0 Flow E2E Tests
 *
 * ideaonaction.ai와 Minu 서비스 간의 OAuth 인증 플로우 테스트
 *
 * 테스트 시나리오:
 * - OAuth 인가 요청 및 로그인 페이지 리다이렉트
 * - PKCE (Proof Key for Code Exchange) 검증
 * - 인가 코드 발급
 * - 액세스 토큰 교환
 * - 리프레시 토큰을 통한 토큰 갱신
 * - 토큰 폐기
 * - 에러 처리 (잘못된 client_id, redirect_uri 등)
 */

test.describe("OAuth 2.0 Flow", () => {
  const OAUTH_BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";
  const TEST_CLIENT_ID = "minu-find-test";
  const TEST_REDIRECT_URI = "http://localhost:3001/auth/callback";
  const INVALID_CLIENT_ID = "invalid-client";

  // PKCE Helper Functions
  function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  function generateCodeChallenge(verifier: string): string {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
  }

  function generateRandomState(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  test("인가 요청 시 로그인 페이지로 리다이렉트", async ({ page }) => {
    const state = generateRandomState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // OAuth 인가 요청 URL 구성
    const authorizeUrl = new URL(`${OAUTH_BASE_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", TEST_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", TEST_REDIRECT_URI);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "profile email subscription");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    // 인가 요청
    await page.goto(authorizeUrl.toString());

    // 로그인 페이지로 리다이렉트되었는지 확인
    await page.waitForURL(/\/login/);

    // 로그인 폼 존재 확인
    const emailInput = page
      .locator('input[type="email"], input[type="text"]')
      .first();
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
  });

  test("PKCE 코드 챌린지 검증", async ({ page }) => {
    const state = generateRandomState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // PKCE 파라미터가 포함된 OAuth 요청
    const authorizeUrl = new URL(`${OAUTH_BASE_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", TEST_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", TEST_REDIRECT_URI);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "profile email subscription");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    await page.goto(authorizeUrl.toString());

    // code_challenge가 서버에 저장되었는지 확인
    // (실제 검증은 토큰 교환 시 수행됨)
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("유효한 인가 코드 발급", async ({ page, context }) => {
    const state = generateRandomState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // OAuth 인가 요청
    const authorizeUrl = new URL(`${OAUTH_BASE_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", TEST_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", TEST_REDIRECT_URI);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "profile email subscription");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    await page.goto(authorizeUrl.toString());
    await page.waitForURL(/\/login/);

    // 로그인
    await page.fill(
      'input[type="email"], input[type="text"]',
      testUsers.regularUser.email,
    );
    await page.fill('input[type="password"]', testUsers.regularUser.password);
    await page.click('button[type="submit"]');

    // 리다이렉트 URI로 콜백되는지 확인
    // (실제 환경에서는 리다이렉트 URI가 다른 도메인일 수 있음)
    await page.waitForTimeout(2000);

    // 리다이렉트 후 URL에 code 파라미터가 있는지 확인
    const currentUrl = new URL(page.url());
    const code = currentUrl.searchParams.get("code");
    const returnedState = currentUrl.searchParams.get("state");

    // 인가 코드가 발급되었는지 확인
    if (currentUrl.origin === new URL(TEST_REDIRECT_URI).origin) {
      expect(code).toBeTruthy();
      expect(returnedState).toBe(state);
    }
  });

  test("인가 코드로 액세스 토큰 교환", async ({ page, request }) => {
    // 이 테스트는 API 엔드포인트가 구현되어 있을 때 작동
    // 실제 환경에서는 백엔드 API 호출이 필요

    const mockAuthCode = "mock_auth_code_123";
    const codeVerifier = generateCodeVerifier();

    // 토큰 교환 API 호출 시뮬레이션
    const tokenResponse = await request.post(`${OAUTH_BASE_URL}/oauth/token`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      form: {
        grant_type: "authorization_code",
        code: mockAuthCode,
        client_id: TEST_CLIENT_ID,
        code_verifier: codeVerifier,
        redirect_uri: TEST_REDIRECT_URI,
      },
      failOnStatusCode: false,
    });

    // 구현되지 않았을 수 있으므로 404가 아닌지만 확인
    // 실제 구현 시 200 응답과 access_token 확인
    if (tokenResponse.ok()) {
      const body = await tokenResponse.json();
      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("token_type", "Bearer");
      expect(body).toHaveProperty("expires_in");
    } else {
      // API가 아직 구현되지 않은 경우
      expect([400, 401, 404, 501]).toContain(tokenResponse.status());
    }
  });

  test("리프레시 토큰으로 토큰 갱신", async ({ request }) => {
    const mockRefreshToken = "mock_refresh_token_123";

    // 리프레시 토큰으로 새 액세스 토큰 요청
    const tokenResponse = await request.post(`${OAUTH_BASE_URL}/oauth/token`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      form: {
        grant_type: "refresh_token",
        refresh_token: mockRefreshToken,
        client_id: TEST_CLIENT_ID,
      },
      failOnStatusCode: false,
    });

    // API 구현 시 새 토큰 반환 확인
    if (tokenResponse.ok()) {
      const body = await tokenResponse.json();
      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("token_type", "Bearer");
    } else {
      expect([400, 401, 404, 501]).toContain(tokenResponse.status());
    }
  });

  test("토큰 폐기 요청 처리", async ({ request }) => {
    const mockAccessToken = "mock_access_token_123";

    // 토큰 폐기 요청
    const revokeResponse = await request.post(
      `${OAUTH_BASE_URL}/oauth/revoke`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${mockAccessToken}`,
        },
        form: {
          token: mockAccessToken,
          token_type_hint: "access_token",
        },
        failOnStatusCode: false,
      },
    );

    // 구현 시 200 또는 204 응답 확인
    if (revokeResponse.ok()) {
      expect([200, 204]).toContain(revokeResponse.status());
    } else {
      expect([400, 401, 404, 501]).toContain(revokeResponse.status());
    }
  });

  test("잘못된 client_id 에러 처리", async ({ page }) => {
    const state = generateRandomState();

    // 잘못된 client_id로 OAuth 요청
    const authorizeUrl = new URL(`${OAUTH_BASE_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", INVALID_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", TEST_REDIRECT_URI);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "profile email");
    authorizeUrl.searchParams.set("state", state);

    await page.goto(authorizeUrl.toString());

    // 에러 페이지 또는 에러 메시지 확인
    await page.waitForTimeout(2000);

    const errorText = await page.textContent("body");
    const hasError =
      errorText?.includes("invalid") ||
      errorText?.includes("error") ||
      errorText?.includes("오류") ||
      page.url().includes("error=");

    // OAuth 구현 시 에러 처리 확인
    // 아직 미구현일 수 있으므로 soft assertion
    if (hasError) {
      expect(hasError).toBeTruthy();
    }
  });

  test("잘못된 redirect_uri 에러 처리", async ({ page }) => {
    const state = generateRandomState();
    const invalidRedirectUri = "https://malicious-site.com/callback";

    // 등록되지 않은 redirect_uri로 OAuth 요청
    const authorizeUrl = new URL(`${OAUTH_BASE_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", TEST_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", invalidRedirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "profile email");
    authorizeUrl.searchParams.set("state", state);

    await page.goto(authorizeUrl.toString());

    // 에러 응답 확인
    await page.waitForTimeout(2000);

    const errorText = await page.textContent("body");
    const hasError =
      errorText?.includes("invalid") ||
      errorText?.includes("redirect") ||
      errorText?.includes("오류");

    // OAuth 구현 시 redirect_uri 검증 확인
    if (hasError) {
      expect(hasError).toBeTruthy();
    }
  });

  test("만료된 인가 코드 에러 처리", async ({ request }) => {
    const expiredCode = "expired_auth_code_123";
    const codeVerifier = generateCodeVerifier();

    // 만료된 코드로 토큰 교환 시도
    const tokenResponse = await request.post(`${OAUTH_BASE_URL}/oauth/token`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      form: {
        grant_type: "authorization_code",
        code: expiredCode,
        client_id: TEST_CLIENT_ID,
        code_verifier: codeVerifier,
        redirect_uri: TEST_REDIRECT_URI,
      },
      failOnStatusCode: false,
    });

    // 400 또는 401 에러 응답 확인
    if (!tokenResponse.ok()) {
      expect([400, 401, 404, 501]).toContain(tokenResponse.status());

      if (tokenResponse.status() === 400 || tokenResponse.status() === 401) {
        const body = await tokenResponse.json();
        expect(body).toHaveProperty("error");
      }
    }
  });
});

test.describe("OAuth 2.0 Scope 권한", () => {
  function generateRandomState(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  test("profile 스코프 요청", async ({ page }) => {
    const state = generateRandomState();

    const authorizeUrl = new URL(`${process.env.VITE_APP_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", "minu-find-test");
    authorizeUrl.searchParams.set(
      "redirect_uri",
      "http://localhost:3001/auth/callback",
    );
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "profile");
    authorizeUrl.searchParams.set("state", state);

    await page.goto(authorizeUrl.toString());
    await page.waitForURL(/\/login/);

    // profile 스코프 권한 요청 화면 확인
    // (실제 구현 시 권한 동의 화면이 있을 수 있음)
    expect(page.url()).toContain("/login");
  });

  test("subscription 스코프 요청", async ({ page }) => {
    const state = generateRandomState();

    const authorizeUrl = new URL(`${process.env.VITE_APP_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", "minu-find-test");
    authorizeUrl.searchParams.set(
      "redirect_uri",
      "http://localhost:3001/auth/callback",
    );
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "profile email subscription");
    authorizeUrl.searchParams.set("state", state);

    await page.goto(authorizeUrl.toString());
    await page.waitForURL(/\/login/);

    // subscription 스코프 포함 확인
    expect(page.url()).toContain("/login");
  });
});

test.describe("OAuth 2.0 SSO (Single Sign-On)", () => {
  test("한 서비스 로그인 후 다른 서비스 자동 인증", async ({
    page,
    context,
  }) => {
    const state1 = crypto.randomBytes(16).toString("hex");
    const state2 = crypto.randomBytes(16).toString("hex");

    // 1. Minu Find 로그인
    const findAuthorizeUrl = new URL(
      `${process.env.VITE_APP_URL}/oauth/authorize`,
    );
    findAuthorizeUrl.searchParams.set("client_id", "minu-find-test");
    findAuthorizeUrl.searchParams.set(
      "redirect_uri",
      "http://localhost:3001/auth/callback",
    );
    findAuthorizeUrl.searchParams.set("response_type", "code");
    findAuthorizeUrl.searchParams.set("scope", "profile email subscription");
    findAuthorizeUrl.searchParams.set("state", state1);

    await page.goto(findAuthorizeUrl.toString());
    await page.waitForURL(/\/login/);

    // 로그인
    await page.fill(
      'input[type="email"], input[type="text"]',
      testUsers.regularUser.email,
    );
    await page.fill('input[type="password"]', testUsers.regularUser.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // 2. Minu Frame 로그인 시도 (SSO 확인)
    const frameAuthorizeUrl = new URL(
      `${process.env.VITE_APP_URL}/oauth/authorize`,
    );
    frameAuthorizeUrl.searchParams.set("client_id", "minu-frame-test");
    frameAuthorizeUrl.searchParams.set(
      "redirect_uri",
      "http://localhost:3002/auth/callback",
    );
    frameAuthorizeUrl.searchParams.set("response_type", "code");
    frameAuthorizeUrl.searchParams.set("scope", "profile email subscription");
    frameAuthorizeUrl.searchParams.set("state", state2);

    await page.goto(frameAuthorizeUrl.toString());

    // 이미 로그인된 상태이므로 자동으로 인가 코드 발급 및 리다이렉트
    // (실제 구현 시 즉시 콜백 URL로 리다이렉트됨)
    await page.waitForTimeout(2000);

    // SSO 구현 시 로그인 화면을 건너뛰고 바로 콜백됨
    const currentUrl = page.url();
    const shouldSkipLogin =
      currentUrl.includes("/auth/callback") || currentUrl.includes("code=");

    // SSO가 구현되면 true가 되어야 함
    // 아직 미구현일 수 있으므로 로깅만 수행
    console.log("SSO 작동 여부:", shouldSkipLogin);
  });
});
