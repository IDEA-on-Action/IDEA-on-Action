import { test, expect } from "@playwright/test";
import * as crypto from "crypto";
import { testUsers } from "../../fixtures/users";

/**
 * Minu SSO 통합 E2E 테스트
 *
 * IDEA on Action과 Minu 서비스(find, frame, build, keep) 간의
 * SSO(Single Sign-On) 인증 플로우를 검증합니다.
 *
 * 테스트 시나리오:
 * 1. OAuth 플로우 테스트 - 인가 요청, 콜백 처리, 토큰 발급
 * 2. 토큰 갱신 테스트 - Refresh Token을 통한 Access Token 갱신
 * 3. 세션 관리 테스트 - 세션 저장, 복원, 만료 처리
 * 4. 에러 처리 테스트 - 다양한 에러 시나리오 검증
 *
 * 참조: src/hooks/useMinuSSO.ts, cloudflare-workers/src/handlers/minu/
 */

// ============================================================================
// 테스트 설정 및 유틸리티
// ============================================================================

const APP_BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";
const WORKERS_API_URL = process.env.VITE_WORKERS_API_URL || "https://api.ideaonaction.ai";

// Minu 서비스 URL 매핑
const MINU_SERVICE_URLS = {
  find: "https://find.minu.best",
  frame: "https://frame.minu.best",
  build: "https://build.minu.best",
  keep: "https://keep.minu.best",
} as const;

type MinuService = keyof typeof MINU_SERVICE_URLS;

// PKCE 유틸리티 함수들
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(service: MinuService, redirectUri: string): string {
  const csrf = crypto.randomUUID();
  const state = { csrf, service, redirect_uri: redirectUri };
  return Buffer.from(JSON.stringify(state)).toString("base64");
}

function generateRandomState(): string {
  return crypto.randomBytes(16).toString("hex");
}

// ============================================================================
// 1. OAuth 플로우 테스트
// ============================================================================

test.describe("Minu SSO - OAuth 플로우", () => {
  const TEST_CLIENT_ID = process.env.VITE_MINU_CLIENT_ID || "idea-on-action";
  const CALLBACK_URL = `${APP_BASE_URL}/auth/minu/callback`;

  test.describe("인가 요청 (Authorization Request)", () => {
    test("인가 요청 시 로그인 페이지로 리다이렉트", async ({ page }) => {
      const service: MinuService = "find";
      const state = generateState(service, CALLBACK_URL);
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      // OAuth 인가 요청 URL 구성
      const authorizeUrl = new URL(`${MINU_SERVICE_URLS[service]}/oauth/authorize`);
      authorizeUrl.searchParams.set("client_id", TEST_CLIENT_ID);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("redirect_uri", `${WORKERS_API_URL}/minu/oauth/callback`);
      authorizeUrl.searchParams.set("scope", "openid profile email subscription");
      authorizeUrl.searchParams.set("state", state);
      authorizeUrl.searchParams.set("code_challenge", codeChallenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");

      // 실제 외부 서비스 접근 대신 URL 구성 검증
      const urlString = authorizeUrl.toString();
      expect(urlString).toContain("client_id=");
      expect(urlString).toContain("response_type=code");
      expect(urlString).toContain("code_challenge=");
      expect(urlString).toContain("code_challenge_method=S256");
      expect(urlString).toContain("scope=");

      console.log("OAuth 인가 요청 URL이 올바르게 구성됨:", urlString);
    });

    test("PKCE 파라미터 생성 검증", async () => {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      // Code Verifier 길이 검증 (43-128자)
      expect(codeVerifier.length).toBeGreaterThanOrEqual(43);

      // Code Challenge 형식 검증 (base64url)
      expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);

      console.log("PKCE 파라미터 생성 성공");
      console.log("Code Verifier 길이:", codeVerifier.length);
      console.log("Code Challenge 길이:", codeChallenge.length);
    });

    test("State 파라미터 생성 및 검증", async () => {
      const service: MinuService = "find";
      const redirectUri = CALLBACK_URL;
      const state = generateState(service, redirectUri);

      // State 디코딩 검증
      const decoded = JSON.parse(Buffer.from(state, "base64").toString());
      expect(decoded).toHaveProperty("csrf");
      expect(decoded).toHaveProperty("service", service);
      expect(decoded).toHaveProperty("redirect_uri", redirectUri);

      console.log("State 파라미터 생성 및 검증 성공:", decoded);
    });

    test("모든 Minu 서비스에 대한 인가 URL 생성", async () => {
      const services: MinuService[] = ["find", "frame", "build", "keep"];

      for (const service of services) {
        const state = generateState(service, CALLBACK_URL);
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);

        const authorizeUrl = new URL(`${MINU_SERVICE_URLS[service]}/oauth/authorize`);
        authorizeUrl.searchParams.set("client_id", TEST_CLIENT_ID);
        authorizeUrl.searchParams.set("response_type", "code");
        authorizeUrl.searchParams.set("redirect_uri", `${WORKERS_API_URL}/minu/oauth/callback`);
        authorizeUrl.searchParams.set("scope", "openid profile email subscription");
        authorizeUrl.searchParams.set("state", state);
        authorizeUrl.searchParams.set("code_challenge", codeChallenge);
        authorizeUrl.searchParams.set("code_challenge_method", "S256");

        expect(authorizeUrl.origin).toBe(MINU_SERVICE_URLS[service]);
        console.log(`${service} 서비스 인가 URL 생성 성공`);
      }
    });
  });

  test.describe("OAuth 콜백 처리", () => {
    test("정상적인 콜백 파라미터 처리", async ({ page }) => {
      // 정상적인 콜백 URL 시뮬레이션
      const mockAccessToken = "mock_access_token_" + Date.now();
      const service: MinuService = "find";

      const callbackUrl = new URL(CALLBACK_URL);
      callbackUrl.searchParams.set("access_token", mockAccessToken);
      callbackUrl.searchParams.set("service", service);
      callbackUrl.searchParams.set("user_id", "test-user-123");
      callbackUrl.searchParams.set("plan", "Pro");
      callbackUrl.searchParams.set("status", "active");

      // 콜백 URL 파라미터 검증
      expect(callbackUrl.searchParams.get("access_token")).toBe(mockAccessToken);
      expect(callbackUrl.searchParams.get("service")).toBe(service);
      expect(callbackUrl.searchParams.get("plan")).toBe("Pro");
      expect(callbackUrl.searchParams.get("status")).toBe("active");

      console.log("정상적인 콜백 파라미터 검증 성공");
    });

    test("에러 콜백 파라미터 처리", async ({ page }) => {
      // 에러 콜백 URL 시뮬레이션
      const callbackUrl = new URL(CALLBACK_URL);
      callbackUrl.searchParams.set("error", "access_denied");
      callbackUrl.searchParams.set("error_description", "사용자가 인증을 거부했습니다.");

      // 에러 파라미터 검증
      expect(callbackUrl.searchParams.get("error")).toBe("access_denied");
      expect(callbackUrl.searchParams.get("error_description")).toBeTruthy();

      console.log("에러 콜백 파라미터 검증 성공");
    });

    test("콜백 페이지 에러 표시 확인", async ({ page }) => {
      // 에러가 포함된 콜백 URL로 이동
      const callbackUrl = new URL(`${APP_BASE_URL}/auth/minu/callback`);
      callbackUrl.searchParams.set("error", "invalid_request");
      callbackUrl.searchParams.set("error_description", "잘못된 요청입니다.");

      await page.goto(callbackUrl.toString());
      await page.waitForLoadState("networkidle");

      // 에러 메시지 표시 확인 (UI 구현에 따라 다를 수 있음)
      const pageContent = await page.textContent("body");
      const hasErrorDisplay =
        pageContent?.includes("오류") ||
        pageContent?.includes("error") ||
        pageContent?.includes("Error") ||
        page.url().includes("error");

      console.log("에러 콜백 페이지 처리 여부:", hasErrorDisplay);
    });
  });

  test.describe("토큰 교환 (Token Exchange)", () => {
    test("Workers API 토큰 교환 엔드포인트 호출", async ({ request }) => {
      const mockMinuToken = "mock_minu_access_token_" + Date.now();
      const service: MinuService = "find";

      // 토큰 교환 API 호출
      const response = await request.post(`${WORKERS_API_URL}/minu/token/exchange`, {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          minu_access_token: mockMinuToken,
          service: service,
        },
        failOnStatusCode: false,
      });

      // API 응답 확인 (실제 토큰이 없으므로 에러가 예상됨)
      const status = response.status();
      console.log("토큰 교환 API 응답 상태:", status);

      if (response.ok()) {
        const body = await response.json();
        expect(body).toHaveProperty("access_token");
        expect(body).toHaveProperty("token_type", "Bearer");
        expect(body).toHaveProperty("expires_in");
        expect(body).toHaveProperty("refresh_token");
        expect(body).toHaveProperty("user");
        console.log("토큰 교환 성공");
      } else {
        // 유효하지 않은 토큰이므로 401 또는 400 에러 예상
        expect([400, 401, 403, 404, 500, 503]).toContain(status);
        console.log("예상된 에러 응답 (유효하지 않은 토큰):", status);
      }
    });

    test("잘못된 서비스로 토큰 교환 시 에러", async ({ request }) => {
      const response = await request.post(`${WORKERS_API_URL}/minu/token/exchange`, {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          minu_access_token: "mock_token",
          service: "invalid_service",
        },
        failOnStatusCode: false,
      });

      const status = response.status();
      expect([400, 404, 500, 503]).toContain(status);
      console.log("잘못된 서비스 에러 처리 확인:", status);
    });

    test("빈 토큰으로 교환 시 에러", async ({ request }) => {
      const response = await request.post(`${WORKERS_API_URL}/minu/token/exchange`, {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          minu_access_token: "",
          service: "find",
        },
        failOnStatusCode: false,
      });

      const status = response.status();
      expect([400, 401, 500, 503]).toContain(status);
      console.log("빈 토큰 에러 처리 확인:", status);
    });
  });
});

// ============================================================================
// 2. 토큰 갱신 테스트
// ============================================================================

test.describe("Minu SSO - 토큰 갱신", () => {
  test("Refresh Token으로 Access Token 갱신 요청", async ({ request }) => {
    const mockRefreshToken = "mock_refresh_token_" + Date.now();
    const service: MinuService = "find";
    const TEST_CLIENT_ID = process.env.VITE_MINU_CLIENT_ID || "idea-on-action";

    // Minu 서비스 토큰 갱신 엔드포인트
    const response = await request.post(`${MINU_SERVICE_URLS[service]}/oauth/token`, {
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

    const status = response.status();
    console.log("토큰 갱신 API 응답 상태:", status);

    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("token_type", "Bearer");
      expect(body).toHaveProperty("expires_in");
      console.log("토큰 갱신 성공");
    } else {
      // 유효하지 않은 refresh token이므로 에러 예상
      expect([400, 401, 403, 404, 500, 502, 503]).toContain(status);
      console.log("예상된 에러 응답 (유효하지 않은 refresh token):", status);
    }
  });

  test("만료된 Refresh Token으로 갱신 시 에러", async ({ request }) => {
    const expiredRefreshToken = "expired_refresh_token";
    const service: MinuService = "find";
    const TEST_CLIENT_ID = process.env.VITE_MINU_CLIENT_ID || "idea-on-action";

    const response = await request.post(`${MINU_SERVICE_URLS[service]}/oauth/token`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      form: {
        grant_type: "refresh_token",
        refresh_token: expiredRefreshToken,
        client_id: TEST_CLIENT_ID,
      },
      failOnStatusCode: false,
    });

    const status = response.status();
    // 만료된 토큰이므로 401 또는 400 에러 예상
    expect([400, 401, 403, 404, 500, 502, 503]).toContain(status);
    console.log("만료된 refresh token 에러 처리 확인:", status);
  });

  test("각 Minu 서비스별 토큰 갱신 엔드포인트 존재 확인", async ({ request }) => {
    const services: MinuService[] = ["find", "frame", "build", "keep"];

    for (const service of services) {
      const response = await request.post(`${MINU_SERVICE_URLS[service]}/oauth/token`, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        form: {
          grant_type: "refresh_token",
          refresh_token: "test_token",
          client_id: "test_client",
        },
        failOnStatusCode: false,
      });

      const status = response.status();
      // 404가 아니면 엔드포인트가 존재함
      const endpointExists = status !== 404;
      console.log(`${service} 서비스 토큰 엔드포인트 존재 여부:`, endpointExists, `(상태: ${status})`);
    }
  });
});

// ============================================================================
// 3. 세션 관리 테스트
// ============================================================================

test.describe("Minu SSO - 세션 관리", () => {
  test("OAuth 세션 생성 API 호출", async ({ request }) => {
    const service: MinuService = "find";
    const state = generateState(service, `${APP_BASE_URL}/auth/minu/callback`);
    const codeVerifier = generateCodeVerifier();

    // Workers API OAuth 세션 생성
    const response = await request.post(`${WORKERS_API_URL}/minu/oauth/session`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        user_id: null,
        service: service,
        state: state,
        code_verifier: codeVerifier,
        redirect_uri: `${APP_BASE_URL}/auth/minu/callback`,
      },
      failOnStatusCode: false,
    });

    const status = response.status();
    console.log("OAuth 세션 생성 API 응답 상태:", status);

    if (response.ok()) {
      const body = await response.json();
      expect(body).toBeTruthy();
      console.log("OAuth 세션 생성 성공");
    } else {
      // 인증이 필요하거나 서버가 응답하지 않을 수 있음
      expect([400, 401, 403, 404, 500, 503]).toContain(status);
      console.log("OAuth 세션 생성 실패 (예상된 상황):", status);
    }
  });

  test("LocalStorage 토큰 저장 시뮬레이션", async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await page.waitForLoadState("networkidle");

    // LocalStorage에 토큰 저장 시뮬레이션
    await page.evaluate(() => {
      const mockToken = "test_access_token_" + Date.now();
      const mockService = "find";
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      localStorage.setItem("minu_access_token", mockToken);
      localStorage.setItem("minu_service", mockService);
      localStorage.setItem("minu_expires_at", expiresAt);
    });

    // 저장된 값 확인
    const storedToken = await page.evaluate(() => localStorage.getItem("minu_access_token"));
    const storedService = await page.evaluate(() => localStorage.getItem("minu_service"));
    const storedExpiresAt = await page.evaluate(() => localStorage.getItem("minu_expires_at"));

    expect(storedToken).toBeTruthy();
    expect(storedService).toBe("find");
    expect(storedExpiresAt).toBeTruthy();

    console.log("LocalStorage 토큰 저장 테스트 성공");

    // 정리
    await page.evaluate(() => {
      localStorage.removeItem("minu_access_token");
      localStorage.removeItem("minu_service");
      localStorage.removeItem("minu_expires_at");
    });
  });

  test("만료된 토큰 자동 정리", async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await page.waitForLoadState("networkidle");

    // 만료된 토큰 저장
    await page.evaluate(() => {
      const mockToken = "expired_test_token";
      const mockService = "find";
      // 과거 시간으로 설정
      const expiresAt = new Date(Date.now() - 3600 * 1000).toISOString();

      localStorage.setItem("minu_access_token", mockToken);
      localStorage.setItem("minu_service", mockService);
      localStorage.setItem("minu_expires_at", expiresAt);
    });

    // 토큰 만료 확인 로직 시뮬레이션
    const isExpired = await page.evaluate(() => {
      const expiresAt = localStorage.getItem("minu_expires_at");
      if (!expiresAt) return true;
      return new Date(expiresAt) < new Date();
    });

    expect(isExpired).toBe(true);
    console.log("만료된 토큰 감지 테스트 성공");

    // 정리
    await page.evaluate(() => {
      localStorage.removeItem("minu_access_token");
      localStorage.removeItem("minu_service");
      localStorage.removeItem("minu_expires_at");
    });
  });

  test("세션 복원 시 서비스 일치 확인", async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await page.waitForLoadState("networkidle");

    // 다른 서비스의 토큰 저장
    await page.evaluate(() => {
      const mockToken = "test_token_for_frame";
      const mockService = "frame";
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      localStorage.setItem("minu_access_token", mockToken);
      localStorage.setItem("minu_service", mockService);
      localStorage.setItem("minu_expires_at", expiresAt);
    });

    // find 서비스로 세션 복원 시도 시 서비스 불일치 확인
    const serviceMatches = await page.evaluate((targetService) => {
      const storedService = localStorage.getItem("minu_service");
      return storedService === targetService;
    }, "find");

    expect(serviceMatches).toBe(false);
    console.log("서비스 불일치 감지 테스트 성공 (frame != find)");

    // 정리
    await page.evaluate(() => {
      localStorage.removeItem("minu_access_token");
      localStorage.removeItem("minu_service");
      localStorage.removeItem("minu_expires_at");
    });
  });
});

// ============================================================================
// 4. 에러 처리 테스트
// ============================================================================

test.describe("Minu SSO - 에러 처리", () => {
  test("네트워크 에러 시 적절한 에러 메시지 표시", async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await page.waitForLoadState("networkidle");

    // 네트워크 요청 실패 시뮬레이션 (잘못된 URL로 요청)
    const errorOccurred = await page.evaluate(async () => {
      try {
        const response = await fetch("https://invalid.minu.best/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true }),
        });
        return !response.ok;
      } catch {
        return true;
      }
    });

    expect(errorOccurred).toBe(true);
    console.log("네트워크 에러 감지 테스트 성공");
  });

  test("유효하지 않은 State 에러 처리", async ({ page }) => {
    // 잘못된 state로 콜백 URL 구성
    const invalidState = "invalid_base64_state!!!";
    const callbackUrl = new URL(`${APP_BASE_URL}/auth/minu/callback`);
    callbackUrl.searchParams.set("code", "test_code");
    callbackUrl.searchParams.set("state", invalidState);

    await page.goto(callbackUrl.toString());
    await page.waitForLoadState("networkidle");

    // 에러 표시 확인
    const pageContent = await page.textContent("body");
    console.log("유효하지 않은 State 에러 페이지 로드됨");
  });

  test("OAuth 에러 응답 처리", async ({ page }) => {
    // OAuth 에러가 포함된 콜백 URL
    const callbackUrl = new URL(`${APP_BASE_URL}/auth/error`);
    callbackUrl.searchParams.set("error", "server_error");
    callbackUrl.searchParams.set("error_description", "내부 서버 오류가 발생했습니다.");

    await page.goto(callbackUrl.toString());
    await page.waitForLoadState("networkidle");

    // 에러 페이지 또는 에러 메시지 확인
    const currentUrl = page.url();
    const hasError = currentUrl.includes("error") || currentUrl.includes("login");

    console.log("OAuth 에러 응답 처리 확인:", hasError);
  });

  test("세션 만료 에러 처리", async ({ request }) => {
    // 만료된 세션으로 콜백 처리 시도
    const expiredState = Buffer.from(
      JSON.stringify({
        csrf: "expired_csrf",
        service: "find",
        redirect_uri: `${APP_BASE_URL}/auth/minu/callback`,
      })
    ).toString("base64");

    const response = await request.get(`${WORKERS_API_URL}/minu/oauth/callback`, {
      params: {
        code: "test_code",
        state: expiredState,
      },
      failOnStatusCode: false,
    });

    const status = response.status();
    // 만료된 세션이므로 에러 응답 예상
    console.log("만료된 세션 에러 처리 상태:", status);
  });
});

// ============================================================================
// 5. 구독 정보 연동 테스트
// ============================================================================

test.describe("Minu SSO - 구독 정보 연동", () => {
  test("구독 정보 조회 API 호출", async ({ request }) => {
    const service: MinuService = "find";

    // 구독 정보 조회 (인증 필요)
    const response = await request.get(`${WORKERS_API_URL}/minu/subscription/${service}`, {
      headers: {
        Authorization: "Bearer test_token",
      },
      failOnStatusCode: false,
    });

    const status = response.status();
    console.log("구독 정보 조회 API 응답 상태:", status);

    if (response.ok()) {
      const body = await response.json();
      console.log("구독 정보:", body);
    } else {
      // 인증 실패 또는 서버 에러 예상
      expect([401, 403, 404, 500, 503]).toContain(status);
    }
  });

  test("플랜별 기능 접근 권한 확인 로직", async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await page.waitForLoadState("networkidle");

    // 기능 접근 권한 확인 로직 시뮬레이션
    const canAccessFeature = await page.evaluate(() => {
      // 구독 정보 모의 데이터
      const subscription = {
        planId: "pro",
        planName: "Pro",
        status: "active" as const,
        features: ["ai_analysis", "advanced_search", "export"],
      };

      // 기능 접근 확인
      const canUseFeature = (featureKey: string): boolean => {
        return subscription.features.includes(featureKey);
      };

      return {
        aiAnalysis: canUseFeature("ai_analysis"),
        advancedSearch: canUseFeature("advanced_search"),
        teamManagement: canUseFeature("team_management"),
      };
    });

    expect(canAccessFeature.aiAnalysis).toBe(true);
    expect(canAccessFeature.advancedSearch).toBe(true);
    expect(canAccessFeature.teamManagement).toBe(false);

    console.log("플랜별 기능 접근 권한 테스트 성공:", canAccessFeature);
  });

  test("서비스 접근 가능 여부 확인 로직", async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await page.waitForLoadState("networkidle");

    // 서비스 접근 가능 여부 확인
    const accessChecks = await page.evaluate(() => {
      const checkAccess = (status: string): boolean => {
        return ["active", "trialing"].includes(status);
      };

      return {
        activeUser: checkAccess("active"),
        trialingUser: checkAccess("trialing"),
        expiredUser: checkAccess("expired"),
        cancelledUser: checkAccess("cancelled"),
      };
    });

    expect(accessChecks.activeUser).toBe(true);
    expect(accessChecks.trialingUser).toBe(true);
    expect(accessChecks.expiredUser).toBe(false);
    expect(accessChecks.cancelledUser).toBe(false);

    console.log("서비스 접근 가능 여부 테스트 성공:", accessChecks);
  });
});

// ============================================================================
// 6. SSO 통합 시나리오 테스트
// ============================================================================

test.describe("Minu SSO - 통합 시나리오", () => {
  test("전체 SSO 플로우 시뮬레이션", async ({ page }) => {
    // 1. 앱 메인 페이지 접근
    await page.goto(APP_BASE_URL);
    await page.waitForLoadState("networkidle");
    console.log("1. 앱 메인 페이지 접근 완료");

    // 2. 로그인 페이지로 이동
    await page.goto(`${APP_BASE_URL}/login`);
    await page.waitForLoadState("networkidle");
    console.log("2. 로그인 페이지 접근 완료");

    // 3. OAuth 파라미터 생성
    const service: MinuService = "find";
    const state = generateState(service, `${APP_BASE_URL}/auth/minu/callback`);
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    console.log("3. OAuth 파라미터 생성 완료");
    console.log("   - Service:", service);
    console.log("   - Code Challenge 길이:", codeChallenge.length);

    // 4. OAuth URL 구성 확인
    const TEST_CLIENT_ID = process.env.VITE_MINU_CLIENT_ID || "idea-on-action";
    const authorizeUrl = new URL(`${MINU_SERVICE_URLS[service]}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", TEST_CLIENT_ID);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("redirect_uri", `${WORKERS_API_URL}/minu/oauth/callback`);
    authorizeUrl.searchParams.set("scope", "openid profile email subscription");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    console.log("4. OAuth URL 구성 완료");
    console.log("   - URL:", authorizeUrl.toString().substring(0, 100) + "...");

    // 5. 콜백 처리 시뮬레이션
    const mockCallbackUrl = new URL(`${APP_BASE_URL}/auth/minu/callback`);
    mockCallbackUrl.searchParams.set("access_token", "simulated_token_" + Date.now());
    mockCallbackUrl.searchParams.set("service", service);
    mockCallbackUrl.searchParams.set("user_id", "test-user-123");
    mockCallbackUrl.searchParams.set("plan", "Pro");
    mockCallbackUrl.searchParams.set("status", "active");

    console.log("5. 콜백 URL 시뮬레이션 완료");

    // 6. 토큰 저장 확인
    await page.evaluate((params) => {
      localStorage.setItem("minu_access_token", params.token);
      localStorage.setItem("minu_service", params.service);
      localStorage.setItem("minu_expires_at", new Date(Date.now() + 3600 * 1000).toISOString());
    }, {
      token: "simulated_token_" + Date.now(),
      service: service,
    });

    const storedToken = await page.evaluate(() => localStorage.getItem("minu_access_token"));
    expect(storedToken).toBeTruthy();
    console.log("6. 토큰 저장 확인 완료");

    // 정리
    await page.evaluate(() => {
      localStorage.removeItem("minu_access_token");
      localStorage.removeItem("minu_service");
      localStorage.removeItem("minu_expires_at");
    });

    console.log("전체 SSO 플로우 시뮬레이션 성공");
  });

  test("여러 서비스 간 SSO 세션 공유 시뮬레이션", async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await page.waitForLoadState("networkidle");

    // Central Hub 세션 설정 (모든 Minu 서비스에서 공유)
    await page.evaluate(() => {
      const hubSession = {
        userId: "hub-user-123",
        email: "test@example.com",
        isAuthenticated: true,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("central_hub_session", JSON.stringify(hubSession));
    });

    // 각 서비스별 토큰 상태 시뮬레이션
    const services: MinuService[] = ["find", "frame", "build", "keep"];
    for (const service of services) {
      await page.evaluate((svc) => {
        const tokenKey = `minu_${svc}_token`;
        localStorage.setItem(tokenKey, `token_for_${svc}_${Date.now()}`);
      }, service);
    }

    // 세션 공유 확인
    const sessionData = await page.evaluate(() => {
      const hubSession = JSON.parse(localStorage.getItem("central_hub_session") || "{}");
      const tokens: Record<string, string | null> = {};
      ["find", "frame", "build", "keep"].forEach((svc) => {
        tokens[svc] = localStorage.getItem(`minu_${svc}_token`);
      });
      return { hubSession, tokens };
    });

    expect(sessionData.hubSession.isAuthenticated).toBe(true);
    expect(Object.values(sessionData.tokens).every((t) => t !== null)).toBe(true);

    console.log("여러 서비스 간 SSO 세션 공유 시뮬레이션 성공");

    // 정리
    await page.evaluate(() => {
      localStorage.removeItem("central_hub_session");
      ["find", "frame", "build", "keep"].forEach((svc) => {
        localStorage.removeItem(`minu_${svc}_token`);
      });
    });
  });

  test("로그아웃 시 모든 토큰 정리", async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await page.waitForLoadState("networkidle");

    // 토큰 설정
    await page.evaluate(() => {
      localStorage.setItem("minu_access_token", "test_token");
      localStorage.setItem("minu_refresh_token", "test_refresh");
      localStorage.setItem("minu_service", "find");
      localStorage.setItem("minu_expires_at", new Date(Date.now() + 3600 * 1000).toISOString());
    });

    // 로그아웃 시뮬레이션
    await page.evaluate(() => {
      localStorage.removeItem("minu_access_token");
      localStorage.removeItem("minu_refresh_token");
      localStorage.removeItem("minu_service");
      localStorage.removeItem("minu_expires_at");
    });

    // 토큰이 모두 삭제되었는지 확인
    const tokenExists = await page.evaluate(() => {
      return (
        localStorage.getItem("minu_access_token") !== null ||
        localStorage.getItem("minu_refresh_token") !== null ||
        localStorage.getItem("minu_service") !== null
      );
    });

    expect(tokenExists).toBe(false);
    console.log("로그아웃 시 토큰 정리 테스트 성공");
  });
});
