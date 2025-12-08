/**
 * Minu Sandbox 클라이언트
 *
 * Minu 서비스 API 호출을 위한 Sandbox 환경 클라이언트
 * 테스트 시 실제 API 대신 모의 응답을 반환하거나 에러를 시뮬레이션
 */

import {
  SANDBOX_CONFIG,
  OAUTH_ENDPOINTS,
  API_ENDPOINTS,
  ErrorScenario,
  type MockResponse,
  type MinuServiceType,
  type MinuPlanType,
  type SandboxUser,
  PLAN_LIMITS,
  isSandboxEnabled,
} from "@/config/minu-sandbox";

/**
 * 구독 정보 응답 타입
 */
export interface SubscriptionResponse {
  plan: MinuPlanType;
  status: "active" | "expired" | "canceled" | "past_due";
  service: MinuServiceType;
  limits: {
    searchCount: number;
    platforms: number;
    aiAnalysis: boolean;
    historyMonths: number;
    teamMembers?: number;
  };
  usage?: {
    searchCount: number;
    lastResetDate: string;
  };
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * OAuth 토큰 응답 타입
 */
export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * 사용자 프로필 응답 타입
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  plan: MinuPlanType;
  created_at: string;
}

/**
 * 세션 정보 타입
 */
export interface SessionInfo {
  id: string;
  user_agent: string;
  ip_address?: string;
  created_at: string;
  last_active: string;
}

/**
 * Audit Log 타입
 */
export interface AuditLogEntry {
  id: string;
  event_type: string;
  actor_id: string;
  target_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * Sandbox 클라이언트 옵션
 */
export interface SandboxClientOptions {
  errorScenario?: ErrorScenario;
  mockDelay?: number;
  accessToken?: string;
}

/**
 * Minu Sandbox 클라이언트 클래스
 */
export class MinuSandboxClient {
  private errorScenario: ErrorScenario = ErrorScenario.NONE;
  private mockDelay: number;
  private accessToken?: string;

  constructor(options: SandboxClientOptions = {}) {
    this.errorScenario = options.errorScenario || ErrorScenario.NONE;
    this.mockDelay = options.mockDelay ?? SANDBOX_CONFIG.mockDelay ?? 500;
    this.accessToken = options.accessToken;
  }

  /**
   * 에러 시나리오 설정
   */
  setErrorScenario(scenario: ErrorScenario): void {
    this.errorScenario = scenario;
  }

  /**
   * 액세스 토큰 설정
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Mock 지연 적용
   */
  private async applyMockDelay(): Promise<void> {
    if (this.mockDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.mockDelay));
    }
  }

  /**
   * 에러 시뮬레이션
   */
  private simulateError(): MockResponse | null {
    switch (this.errorScenario) {
      case ErrorScenario.RATE_LIMIT:
        return {
          success: false,
          error: {
            code: "rate_limit_exceeded",
            message: "Too many requests. Please try again later.",
            status: 429,
          },
        };

      case ErrorScenario.UNAUTHORIZED:
        return {
          success: false,
          error: {
            code: "unauthorized",
            message: "Authentication required.",
            status: 401,
          },
        };

      case ErrorScenario.FORBIDDEN:
        return {
          success: false,
          error: {
            code: "forbidden",
            message: "Access denied.",
            status: 403,
          },
        };

      case ErrorScenario.NOT_FOUND:
        return {
          success: false,
          error: {
            code: "not_found",
            message: "Resource not found.",
            status: 404,
          },
        };

      case ErrorScenario.SERVER_ERROR:
        return {
          success: false,
          error: {
            code: "internal_server_error",
            message: "An internal server error occurred.",
            status: 500,
          },
        };

      case ErrorScenario.NETWORK_ERROR:
        throw new Error("Network error: Unable to connect to server");

      case ErrorScenario.TIMEOUT:
        throw new Error("Request timeout");

      default:
        return null;
    }
  }

  /**
   * OAuth 인가 URL 생성
   */
  getAuthorizationUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: SANDBOX_CONFIG.clientId,
      redirect_uri: SANDBOX_CONFIG.redirectUri,
      response_type: "code",
      scope: SANDBOX_CONFIG.scopes.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return `${OAUTH_ENDPOINTS.authorize}?${params.toString()}`;
  }

  /**
   * OAuth 토큰 교환 (Mock)
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string
  ): Promise<MockResponse<TokenResponse>> {
    await this.applyMockDelay();

    const errorResponse = this.simulateError();
    if (errorResponse) return errorResponse;

    // 기본적으로 Mock 토큰 반환 (프로덕션 환경에서만 실제 API 호출)
    if (isSandboxEnabled() || !this.accessToken) {
      return {
        success: true,
        data: {
          access_token: `sandbox_access_token_${Date.now()}`,
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: `sandbox_refresh_token_${Date.now()}`,
          scope: SANDBOX_CONFIG.scopes.join(" "),
        },
      };
    }

    // 프로덕션 환경에서는 실제 API 호출
    try {
      const response = await fetch(OAUTH_ENDPOINTS.token, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: SANDBOX_CONFIG.clientId,
          code_verifier: codeVerifier,
          redirect_uri: SANDBOX_CONFIG.redirectUri,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: "token_exchange_failed",
            message: "Failed to exchange authorization code",
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Unknown error",
          status: 0,
        },
      };
    }
  }

  /**
   * 토큰 갱신 (Mock)
   */
  async refreshToken(
    refreshToken: string
  ): Promise<MockResponse<TokenResponse>> {
    await this.applyMockDelay();

    const errorResponse = this.simulateError();
    if (errorResponse) return errorResponse;

    if (isSandboxEnabled() || !this.accessToken) {
      return {
        success: true,
        data: {
          access_token: `sandbox_access_token_refreshed_${Date.now()}`,
          token_type: "Bearer",
          expires_in: 3600,
        },
      };
    }

    try {
      const response = await fetch(OAUTH_ENDPOINTS.token, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: SANDBOX_CONFIG.clientId,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: "token_refresh_failed",
            message: "Failed to refresh token",
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Unknown error",
          status: 0,
        },
      };
    }
  }

  /**
   * 토큰 폐기
   */
  async revokeToken(token: string): Promise<MockResponse<void>> {
    await this.applyMockDelay();

    const errorResponse = this.simulateError();
    if (errorResponse) return errorResponse;

    if (isSandboxEnabled() || !this.accessToken) {
      return { success: true };
    }

    try {
      const response = await fetch(OAUTH_ENDPOINTS.revoke, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          token,
          token_type_hint: "access_token",
          client_id: SANDBOX_CONFIG.clientId,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: "token_revoke_failed",
            message: "Failed to revoke token",
            status: response.status,
          },
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Unknown error",
          status: 0,
        },
      };
    }
  }

  /**
   * 구독 정보 조회 (Mock)
   */
  async getSubscription(
    service: MinuServiceType,
    user?: SandboxUser
  ): Promise<MockResponse<SubscriptionResponse>> {
    await this.applyMockDelay();

    const errorResponse = this.simulateError();
    if (errorResponse) return errorResponse;

    // user가 제공되면 무조건 Mock 데이터 반환 (테스트용)
    if (user) {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      return {
        success: true,
        data: {
          plan: user.plan,
          status: user.status || "active",
          service,
          limits: user.expectedLimits,
          usage: {
            searchCount: Math.floor(
              Math.random() * user.expectedLimits.searchCount
            ),
            lastResetDate: now.toISOString(),
          },
          expires_at:
            user.status === "expired"
              ? new Date(now.getTime() - 86400000).toISOString()
              : expiresAt.toISOString(),
          created_at: new Date(now.getTime() - 2592000000).toISOString(),
          updated_at: now.toISOString(),
        },
      };
    }

    // 프로덕션 환경
    try {
      const response = await fetch(API_ENDPOINTS.subscription(service), {
        headers: this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {},
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: "subscription_fetch_failed",
            message: "Failed to fetch subscription",
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Unknown error",
          status: 0,
        },
      };
    }
  }

  /**
   * 사용자 프로필 조회 (Mock)
   */
  async getUserProfile(
    user?: SandboxUser
  ): Promise<MockResponse<UserProfileResponse>> {
    await this.applyMockDelay();

    const errorResponse = this.simulateError();
    if (errorResponse) return errorResponse;

    if (user) {
      return {
        success: true,
        data: {
          id: `sandbox_user_${user.plan}`,
          email: user.email,
          name: `Test ${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} User`,
          plan: user.plan,
          created_at: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      };
    }

    try {
      const response = await fetch(API_ENDPOINTS.profile, {
        headers: this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {},
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: "profile_fetch_failed",
            message: "Failed to fetch user profile",
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Unknown error",
          status: 0,
        },
      };
    }
  }

  /**
   * 세션 목록 조회 (Mock)
   */
  async getSessions(): Promise<MockResponse<SessionInfo[]>> {
    await this.applyMockDelay();

    const errorResponse = this.simulateError();
    if (errorResponse) return errorResponse;

    // 기본적으로 Mock 데이터 반환 (프로덕션 환경에서만 실제 API 호출)
    if (isSandboxEnabled() || !this.accessToken) {
      const now = new Date();
      return {
        success: true,
        data: [
          {
            id: "session_1",
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            ip_address: "192.168.1.1",
            created_at: new Date(now.getTime() - 3600000).toISOString(),
            last_active: now.toISOString(),
          },
        ],
      };
    }

    try {
      const response = await fetch(API_ENDPOINTS.sessions, {
        headers: this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {},
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: "sessions_fetch_failed",
            message: "Failed to fetch sessions",
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Unknown error",
          status: 0,
        },
      };
    }
  }

  /**
   * Audit Log 조회 (Mock)
   */
  async getAuditLogs(): Promise<MockResponse<AuditLogEntry[]>> {
    await this.applyMockDelay();

    const errorResponse = this.simulateError();
    if (errorResponse) return errorResponse;

    if (isSandboxEnabled() || !this.accessToken) {
      const now = new Date();
      return {
        success: true,
        data: [
          {
            id: "audit_1",
            event_type: "subscription.updated",
            actor_id: "sandbox_user_pro",
            target_id: "subscription_1",
            metadata: { plan: "pro", status: "active" },
            created_at: new Date(now.getTime() - 7200000).toISOString(),
          },
          {
            id: "audit_2",
            event_type: "user.login",
            actor_id: "sandbox_user_pro",
            created_at: new Date(now.getTime() - 3600000).toISOString(),
          },
        ],
      };
    }

    try {
      const response = await fetch(API_ENDPOINTS.auditLog, {
        headers: this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {},
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: "audit_log_fetch_failed",
            message: "Failed to fetch audit logs",
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Unknown error",
          status: 0,
        },
      };
    }
  }

  /**
   * MCP 상태 확인 (Mock)
   */
  async getMCPStatus(): Promise<
    MockResponse<{ status: string; version: string }>
  > {
    await this.applyMockDelay();

    const errorResponse = this.simulateError();
    if (errorResponse) return errorResponse;

    // 기본적으로 Mock 데이터 반환
    if (isSandboxEnabled() || !this.accessToken) {
      return {
        success: true,
        data: {
          status: "healthy",
          version: "1.0.0-sandbox",
        },
      };
    }

    try {
      const response = await fetch(API_ENDPOINTS.mcp.health, {
        headers: this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {},
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: "mcp_status_failed",
            message: "Failed to fetch MCP status",
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Unknown error",
          status: 0,
        },
      };
    }
  }
}

/**
 * 기본 Sandbox 클라이언트 인스턴스
 */
export const sandboxClient = new MinuSandboxClient();

/**
 * Sandbox 클라이언트 팩토리
 */
export function createSandboxClient(
  options?: SandboxClientOptions
): MinuSandboxClient {
  return new MinuSandboxClient(options);
}
