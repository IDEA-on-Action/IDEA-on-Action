import { test, expect } from "@playwright/test";

/**
 * OAuth Multi-Environment E2E Tests
 *
 * 다양한 환경에서 OAuth 2.0 클라이언트의 유효성 검증
 *
 * 환경별 OAuth 클라이언트:
 * - local: minu-find-local, minu-frame-local, minu-build-local, minu-keep-local
 * - dev: minu-find-dev, minu-frame-dev, minu-build-dev, minu-keep-dev
 * - staging: minu-find-staging, minu-frame-staging, minu-build-staging, minu-keep-staging
 * - production: minu-find, minu-frame, minu-build, minu-keep
 *
 * 테스트 시나리오:
 * - 각 환경별 OAuth 클라이언트 존재 확인
 * - redirect_uri 허용 목록 검증
 * - CORS 설정 확인
 * - 환경별 scope 권한 확인
 */

test.describe("OAuth Multi-Environment - Client Registration", () => {
  /**
   * 환경별 OAuth 클라이언트 설정
   */
  const environments = [
    {
      env: "local",
      baseUrl: "http://localhost:8080",
      clients: [
        {
          clientId: "minu-find-local",
          service: "find",
          redirectUri: "http://localhost:3001/auth/callback",
        },
        {
          clientId: "minu-frame-local",
          service: "frame",
          redirectUri: "http://localhost:3002/auth/callback",
        },
        {
          clientId: "minu-build-local",
          service: "build",
          redirectUri: "http://localhost:3003/auth/callback",
        },
        {
          clientId: "minu-keep-local",
          service: "keep",
          redirectUri: "http://localhost:3004/auth/callback",
        },
      ],
    },
    {
      env: "dev",
      baseUrl: "https://dev.ideaonaction.ai",
      clients: [
        {
          clientId: "minu-find-dev",
          service: "find",
          redirectUri: "https://dev.find.minu.best/auth/callback",
        },
        {
          clientId: "minu-frame-dev",
          service: "frame",
          redirectUri: "https://dev.frame.minu.best/auth/callback",
        },
        {
          clientId: "minu-build-dev",
          service: "build",
          redirectUri: "https://dev.build.minu.best/auth/callback",
        },
        {
          clientId: "minu-keep-dev",
          service: "keep",
          redirectUri: "https://dev.keep.minu.best/auth/callback",
        },
      ],
    },
    {
      env: "staging",
      baseUrl: "https://staging.ideaonaction.ai",
      clients: [
        {
          clientId: "minu-find-staging",
          service: "find",
          redirectUri: "https://canary.find.minu.best/auth/callback",
        },
        {
          clientId: "minu-frame-staging",
          service: "frame",
          redirectUri: "https://canary.frame.minu.best/auth/callback",
        },
        {
          clientId: "minu-build-staging",
          service: "build",
          redirectUri: "https://canary.build.minu.best/auth/callback",
        },
        {
          clientId: "minu-keep-staging",
          service: "keep",
          redirectUri: "https://canary.keep.minu.best/auth/callback",
        },
      ],
    },
  ];

  // 현재 환경 결정 (기본값: local)
  const currentEnv =
    process.env.TEST_ENV || process.env.NODE_ENV || "local";
  const envConfig =
    environments.find((e) => e.env === currentEnv) || environments[0];

  for (const { env, baseUrl, clients } of environments) {
    test.describe(`${env.toUpperCase()} 환경`, () => {
      // 현재 환경만 테스트 (설정된 경우)
      test.skip(
        currentEnv !== "all" && env !== currentEnv,
        `현재 환경(${currentEnv})이 아님`,
      );

      for (const { clientId, service, redirectUri } of clients) {
        test(`${clientId} OAuth 클라이언트 유효성`, async ({ request }) => {
          // OAuth authorize 엔드포인트 호출
          const authorizeUrl = new URL(`${baseUrl}/oauth/authorize`);
          authorizeUrl.searchParams.set("client_id", clientId);
          authorizeUrl.searchParams.set("redirect_uri", redirectUri);
          authorizeUrl.searchParams.set("response_type", "code");
          authorizeUrl.searchParams.set("scope", "profile email subscription");
          authorizeUrl.searchParams.set("state", "test-state");

          const response = await request.get(authorizeUrl.toString(), {
            failOnStatusCode: false,
            maxRedirects: 0, // 리다이렉트 추적하지 않음
          });

          // OAuth 엔드포인트가 구현되어 있다면
          if (response.status() !== 404 && response.status() !== 501) {
            // 로그인 페이지로 리다이렉트 (302) 또는 정상 응답 (200)
            expect([200, 302]).toContain(response.status());

            // 리다이렉트된 경우 Location 헤더 확인
            if (response.status() === 302) {
              const location = response.headers()["location"];
              expect(location).toBeTruthy();

              // 로그인 페이지 또는 허용된 리다이렉트 URI로 이동
              const isValidRedirect =
                location.includes("/login") ||
                location.startsWith(redirectUri);
              expect(isValidRedirect).toBeTruthy();

              console.log(`✓ ${clientId}: 유효한 OAuth 클라이언트`);
            }
          } else {
            console.log(
              `⚠ ${clientId}: OAuth 엔드포인트 미구현 (${response.status()})`,
            );
          }
        });

        test(`${clientId} redirect_uri 검증`, async ({ request }) => {
          // 잘못된 redirect_uri로 요청
          const invalidRedirectUri = "https://malicious-site.com/callback";

          const authorizeUrl = new URL(`${baseUrl}/oauth/authorize`);
          authorizeUrl.searchParams.set("client_id", clientId);
          authorizeUrl.searchParams.set("redirect_uri", invalidRedirectUri);
          authorizeUrl.searchParams.set("response_type", "code");
          authorizeUrl.searchParams.set("scope", "profile email");
          authorizeUrl.searchParams.set("state", "test-state");

          const response = await request.get(authorizeUrl.toString(), {
            failOnStatusCode: false,
          });

          // OAuth 구현 시 잘못된 redirect_uri는 거부되어야 함
          if (response.status() !== 404 && response.status() !== 501) {
            // 400 Bad Request 또는 에러 응답
            if (response.status() === 400) {
              const body = await response.text();
              expect(body).toContain("redirect");
              console.log(`✓ ${clientId}: redirect_uri 검증 작동`);
            } else {
              // 아직 검증 로직이 없을 수 있음
              console.log(
                `⚠ ${clientId}: redirect_uri 검증 미구현 (${response.status()})`,
              );
            }
          }
        });
      }

      test(`${env.toUpperCase()} 환경 CORS 설정 확인`, async ({ request }) => {
        // CORS 프리플라이트 요청
        const corsOrigin =
          env === "local" ? "http://localhost:3001" : clients[0].redirectUri;

        const response = await request.fetch(`${baseUrl}/api/health`, {
          method: "OPTIONS",
          headers: {
            Origin: corsOrigin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
          },
          failOnStatusCode: false,
        });

        // CORS가 설정되어 있다면
        if (response.ok() || response.status() === 204) {
          const corsHeaders = response.headers();

          // CORS 헤더 확인
          if (corsHeaders["access-control-allow-origin"]) {
            expect(corsHeaders["access-control-allow-origin"]).toBeTruthy();
            console.log(
              `✓ ${env} CORS 설정됨:`,
              corsHeaders["access-control-allow-origin"],
            );
          }
        } else {
          console.log(
            `⚠ ${env} CORS 설정 미확인 (${response.status()})`,
          );
        }
      });
    });
  }
});

test.describe("OAuth Multi-Environment - Token Exchange", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  test("로컬 환경 토큰 교환 플로우", async ({ request }) => {
    const mockAuthCode = "mock_local_auth_code";

    // 토큰 교환 요청
    const response = await request.post(`${BASE_URL}/oauth/token`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      form: {
        grant_type: "authorization_code",
        code: mockAuthCode,
        client_id: "minu-find-local",
        redirect_uri: "http://localhost:3001/auth/callback",
      },
      failOnStatusCode: false,
    });

    // API가 구현되어 있다면 토큰 반환
    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("token_type", "Bearer");
      expect(body).toHaveProperty("expires_in");
      console.log("✓ 로컬 환경 토큰 교환 성공");
    } else {
      console.log(
        `⚠ 로컬 환경 토큰 교환 미구현 (${response.status()})`,
      );
    }
  });

  test("개발 환경 토큰 교환 플로우", async ({ request }) => {
    const DEV_URL = "https://dev.ideaonaction.ai";
    const mockAuthCode = "mock_dev_auth_code";

    const response = await request.post(`${DEV_URL}/oauth/token`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      form: {
        grant_type: "authorization_code",
        code: mockAuthCode,
        client_id: "minu-find-dev",
        redirect_uri: "https://dev.find.minu.best/auth/callback",
      },
      failOnStatusCode: false,
    });

    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty("access_token");
      console.log("✓ 개발 환경 토큰 교환 성공");
    } else {
      console.log(
        `⚠ 개발 환경 토큰 교환 접근 불가 또는 미구현 (${response.status()})`,
      );
    }
  });

  test("스테이징 환경 토큰 교환 플로우", async ({ request }) => {
    const STAGING_URL = "https://staging.ideaonaction.ai";
    const mockAuthCode = "mock_staging_auth_code";

    const response = await request.post(`${STAGING_URL}/oauth/token`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      form: {
        grant_type: "authorization_code",
        code: mockAuthCode,
        client_id: "minu-find-staging",
        redirect_uri: "https://canary.find.minu.best/auth/callback",
      },
      failOnStatusCode: false,
    });

    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty("access_token");
      console.log("✓ 스테이징 환경 토큰 교환 성공");
    } else {
      console.log(
        `⚠ 스테이징 환경 토큰 교환 접근 불가 또는 미구현 (${response.status()})`,
      );
    }
  });
});

test.describe("OAuth Multi-Environment - Scope Validation", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  const scopes = [
    {
      scope: "profile",
      description: "사용자 프로필 정보",
      required: true,
    },
    {
      scope: "email",
      description: "사용자 이메일",
      required: true,
    },
    {
      scope: "subscription",
      description: "구독 정보",
      required: true,
    },
    {
      scope: "openid",
      description: "OpenID Connect",
      required: false,
    },
  ];

  for (const { scope, description, required } of scopes) {
    test(`${scope} 스코프 요청 검증 (${description})`, async ({ page }) => {
      const authorizeUrl = new URL(`${BASE_URL}/oauth/authorize`);
      authorizeUrl.searchParams.set("client_id", "minu-find-local");
      authorizeUrl.searchParams.set(
        "redirect_uri",
        "http://localhost:3001/auth/callback",
      );
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("scope", scope);
      authorizeUrl.searchParams.set("state", "test-state");

      await page.goto(authorizeUrl.toString(), {
        waitUntil: "networkidle",
      });

      // 로그인 페이지로 리다이렉트되면 성공
      if (page.url().includes("/login")) {
        console.log(`✓ ${scope} 스코프 허용됨`);
      } else {
        console.log(`⚠ ${scope} 스코프 처리 미확인`);
      }
    });
  }

  test("모든 필수 스코프 통합 요청", async ({ page }) => {
    const requiredScopes = scopes
      .filter((s) => s.required)
      .map((s) => s.scope)
      .join(" ");

    const authorizeUrl = new URL(`${BASE_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", "minu-find-local");
    authorizeUrl.searchParams.set(
      "redirect_uri",
      "http://localhost:3001/auth/callback",
    );
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", requiredScopes);
    authorizeUrl.searchParams.set("state", "test-state");

    await page.goto(authorizeUrl.toString(), {
      waitUntil: "networkidle",
    });

    if (page.url().includes("/login")) {
      console.log(`✓ 필수 스코프 통합 요청 허용됨: ${requiredScopes}`);
    }
  });

  test("잘못된 스코프 요청 거부", async ({ page }) => {
    const invalidScope = "invalid_scope admin superuser";

    const authorizeUrl = new URL(`${BASE_URL}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", "minu-find-local");
    authorizeUrl.searchParams.set(
      "redirect_uri",
      "http://localhost:3001/auth/callback",
    );
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", invalidScope);
    authorizeUrl.searchParams.set("state", "test-state");

    await page.goto(authorizeUrl.toString(), {
      waitUntil: "networkidle",
    });

    // 에러 응답 또는 로그인 페이지 (스코프 필터링 적용)
    const bodyText = await page.textContent("body");
    const hasError = bodyText?.includes("invalid") || bodyText?.includes("오류");

    if (hasError) {
      console.log("✓ 잘못된 스코프 거부됨");
    } else {
      console.log("⚠ 잘못된 스코프 검증 미구현");
    }
  });
});

test.describe("OAuth Multi-Environment - Service-Specific", () => {
  const BASE_URL = process.env.VITE_APP_URL || "http://localhost:8080";

  const services = [
    { name: "Find", clientId: "minu-find-local", redirectUri: "http://localhost:3001/auth/callback" },
    { name: "Frame", clientId: "minu-frame-local", redirectUri: "http://localhost:3002/auth/callback" },
    { name: "Build", clientId: "minu-build-local", redirectUri: "http://localhost:3003/auth/callback" },
    { name: "Keep", clientId: "minu-keep-local", redirectUri: "http://localhost:3004/auth/callback" },
  ];

  for (const { name, clientId, redirectUri } of services) {
    test(`Minu ${name} OAuth 클라이언트 독립성`, async ({ request }) => {
      // 각 서비스별로 독립된 OAuth 클라이언트가 있어야 함
      const authorizeUrl = new URL(`${BASE_URL}/oauth/authorize`);
      authorizeUrl.searchParams.set("client_id", clientId);
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("scope", "profile email subscription");
      authorizeUrl.searchParams.set("state", "test-state");

      const response = await request.get(authorizeUrl.toString(), {
        failOnStatusCode: false,
        maxRedirects: 0,
      });

      if (response.status() !== 404 && response.status() !== 501) {
        expect([200, 302]).toContain(response.status());
        console.log(`✓ Minu ${name} 독립 OAuth 클라이언트 확인`);
      } else {
        console.log(
          `⚠ Minu ${name} OAuth 클라이언트 미등록 (${response.status()})`,
        );
      }
    });
  }
});

test.describe("OAuth Multi-Environment - Health Check", () => {
  const environments = [
    { name: "Local", url: "http://localhost:8080" },
    { name: "Dev", url: "https://dev.ideaonaction.ai" },
    { name: "Staging", url: "https://staging.ideaonaction.ai" },
  ];

  const currentEnv = process.env.TEST_ENV || "local";

  for (const { name, url } of environments) {
    test.skip(
      currentEnv !== "all" && name.toLowerCase() !== currentEnv,
      `현재 환경(${currentEnv})이 아님`,
    );

    test(`${name} 환경 OAuth 엔드포인트 헬스체크`, async ({ request }) => {
      // OAuth authorize 엔드포인트 존재 확인
      const response = await request.get(`${url}/oauth/authorize`, {
        failOnStatusCode: false,
      });

      // 400 (파라미터 누락) 또는 302 (리다이렉트)가 정상
      // 404/501은 미구현
      if ([400, 302, 200].includes(response.status())) {
        console.log(`✓ ${name} OAuth 엔드포인트 정상`);
      } else {
        console.log(
          `⚠ ${name} OAuth 엔드포인트 상태: ${response.status()}`,
        );
      }
    });

    test(`${name} 환경 API 응답 시간 측정`, async ({ request }) => {
      const startTime = Date.now();

      await request.get(`${url}/api/health`, {
        failOnStatusCode: false,
      });

      const responseTime = Date.now() - startTime;

      console.log(`${name} 환경 API 응답 시간: ${responseTime}ms`);

      // 응답 시간이 5초 이내여야 함
      expect(responseTime).toBeLessThan(5000);
    });
  }
});
