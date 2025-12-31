/**
 * Minu Sandbox Client Unit Tests
 *
 * Sandbox 클라이언트 기능 단위 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MinuSandboxClient,
  createSandboxClient,
  sandboxClient,
} from "./sandbox-client";
import { ErrorScenario, SANDBOX_USERS } from "@/config/minu-sandbox";

describe("MinuSandboxClient", () => {
  let client: MinuSandboxClient;

  beforeEach(() => {
    client = createSandboxClient({ mockDelay: 0 }); // 테스트 시 지연 없음
  });

  describe("클라이언트 초기화", () => {
    it("기본 클라이언트 인스턴스가 생성되어야 함", () => {
      expect(sandboxClient).toBeInstanceOf(MinuSandboxClient);
    });

    it("커스텀 옵션으로 클라이언트 생성", () => {
      const customClient = createSandboxClient({
        errorScenario: ErrorScenario.RATE_LIMIT,
        mockDelay: 100,
      });

      expect(customClient).toBeInstanceOf(MinuSandboxClient);
    });

    it("에러 시나리오 설정", () => {
      client.setErrorScenario(ErrorScenario.UNAUTHORIZED);
      // 에러 시나리오가 설정되었는지 확인하기 위해 실제 API 호출 필요
      // 여기서는 메소드 호출이 에러를 던지지 않는지만 확인
      expect(() =>
        client.setErrorScenario(ErrorScenario.UNAUTHORIZED)
      ).not.toThrow();
    });

    it("액세스 토큰 설정", () => {
      const token = "test_access_token";
      expect(() => client.setAccessToken(token)).not.toThrow();
    });
  });

  describe("OAuth 인가 URL 생성", () => {
    it("유효한 OAuth URL 생성", () => {
      const state = "test_state_123";
      const codeChallenge = "test_code_challenge";

      const url = client.getAuthorizationUrl(state, codeChallenge);

      expect(url).toContain("oauth/authorize");
      expect(url).toContain(`state=${state}`);
      expect(url).toContain(`code_challenge=${codeChallenge}`);
      expect(url).toContain("code_challenge_method=S256");
      expect(url).toContain("response_type=code");
    });

    it("OAuth URL에 필요한 모든 파라미터 포함", () => {
      const url = client.getAuthorizationUrl("state", "challenge");

      expect(url).toContain("client_id=");
      expect(url).toContain("redirect_uri=");
      expect(url).toContain("scope=");
    });
  });

  describe("토큰 교환", () => {
    it("Sandbox 환경에서 Mock 토큰 반환", async () => {
      const result = await client.exchangeCodeForToken(
        "test_code",
        "test_verifier"
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.access_token).toContain("sandbox_access_token_");
      expect(result.data?.token_type).toBe("Bearer");
      expect(result.data?.expires_in).toBe(3600);
    });

    it("에러 시나리오 - Unauthorized", async () => {
      client.setErrorScenario(ErrorScenario.UNAUTHORIZED);

      const result = await client.exchangeCodeForToken("code", "verifier");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("unauthorized");
      expect(result.error?.status).toBe(401);
    });
  });

  describe("토큰 갱신", () => {
    it("Sandbox 환경에서 새로운 토큰 반환", async () => {
      const result = await client.refreshToken("test_refresh_token");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.access_token).toContain("refreshed");
    });

    it("에러 시나리오 - Rate Limit", async () => {
      client.setErrorScenario(ErrorScenario.RATE_LIMIT);

      const result = await client.refreshToken("token");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("rate_limit_exceeded");
      expect(result.error?.status).toBe(429);
    });
  });

  describe("토큰 폐기", () => {
    it("Sandbox 환경에서 성공 응답", async () => {
      const result = await client.revokeToken("test_token");

      expect(result.success).toBe(true);
    });

    it("에러 시나리오 - Server Error", async () => {
      client.setErrorScenario(ErrorScenario.SERVER_ERROR);

      const result = await client.revokeToken("token");

      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(500);
    });
  });

  describe("구독 정보 조회", () => {
    it("Free 플랜 사용자 구독 정보", async () => {
      const user = SANDBOX_USERS.free;
      const result = await client.getSubscription("find", user);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.plan).toBe("free");
      expect(result.data?.limits.searchCount).toBe(10);
      expect(result.data?.limits.aiAnalysis).toBe(false);
    });

    it("Pro 플랜 사용자 구독 정보", async () => {
      const user = SANDBOX_USERS.pro;
      const result = await client.getSubscription("find", user);

      expect(result.success).toBe(true);
      expect(result.data?.plan).toBe("pro");
      expect(result.data?.limits.searchCount).toBe(300);
      expect(result.data?.limits.aiAnalysis).toBe(true);
      expect(result.data?.limits.platforms).toBe(6);
    });

    it("Enterprise 플랜 - 무제한 기능", async () => {
      const user = SANDBOX_USERS.enterprise;
      const result = await client.getSubscription("find", user);

      expect(result.success).toBe(true);
      expect(result.data?.plan).toBe("enterprise");
      expect(result.data?.limits.searchCount).toBeGreaterThan(100000);
      expect(result.data?.limits.teamMembers).toBeDefined();
    });

    it("만료된 구독 상태", async () => {
      const user = SANDBOX_USERS.expired;
      const result = await client.getSubscription("find", user);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("expired");

      // 만료일이 과거인지 확인
      if (result.data?.expires_at) {
        const expiryDate = new Date(result.data.expires_at);
        expect(expiryDate.getTime()).toBeLessThan(Date.now());
      }
    });
  });

  describe("사용자 프로필 조회", () => {
    it("Mock 프로필 데이터 반환", async () => {
      const user = SANDBOX_USERS.pro;
      const result = await client.getUserProfile(user);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.email).toBe(user.email);
      expect(result.data?.plan).toBe("pro");
    });

    it("에러 시나리오 - Forbidden", async () => {
      client.setErrorScenario(ErrorScenario.FORBIDDEN);

      const result = await client.getUserProfile(SANDBOX_USERS.free);

      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(403);
    });
  });

  describe("세션 관리", () => {
    it("활성 세션 목록 조회", async () => {
      const result = await client.getSessions();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it("세션 정보 필수 필드 확인", async () => {
      const result = await client.getSessions();

      const session = result.data?.[0];
      expect(session).toHaveProperty("id");
      expect(session).toHaveProperty("created_at");
      expect(session).toHaveProperty("last_active");
    });
  });

  describe("Audit Log", () => {
    it("Audit Log 목록 조회", async () => {
      const result = await client.getAuditLogs();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it("Audit Log 필수 필드 확인", async () => {
      const result = await client.getAuditLogs();

      const log = result.data?.[0];
      expect(log).toHaveProperty("id");
      expect(log).toHaveProperty("event_type");
      expect(log).toHaveProperty("actor_id");
      expect(log).toHaveProperty("created_at");
    });
  });

  describe("MCP 상태 조회", () => {
    it("MCP 상태 정보 반환", async () => {
      const result = await client.getMCPStatus();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe("healthy");
      expect(result.data?.version).toContain("sandbox");
    });

    it("에러 시나리오 - Not Found", async () => {
      client.setErrorScenario(ErrorScenario.NOT_FOUND);

      const result = await client.getMCPStatus();

      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(404);
    });
  });

  describe("에러 시뮬레이션", () => {
    it("Network Error 시뮬레이션", async () => {
      client.setErrorScenario(ErrorScenario.NETWORK_ERROR);

      await expect(client.getSessions()).rejects.toThrow(/network/i);
    });

    it("Timeout 시뮬레이션", async () => {
      client.setErrorScenario(ErrorScenario.TIMEOUT);

      await expect(client.getMCPStatus()).rejects.toThrow(/timeout/i);
    });

    it("에러 없음 - 정상 응답", async () => {
      client.setErrorScenario(ErrorScenario.NONE);

      const result = await client.getMCPStatus();
      expect(result.success).toBe(true);
    });
  });
});
