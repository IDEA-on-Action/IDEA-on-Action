/**
 * Minu Sandbox 환경 설정
 *
 * Minu 서비스 연동 테스트를 위한 Sandbox 환경 설정
 * 참조: plan/minu-sandbox-setup.md
 */

export type MinuServiceType = "find" | "frame" | "build" | "keep";
export type MinuPlanType = "free" | "basic" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "expired" | "canceled" | "past_due";

/**
 * Minu 플랜별 제한 설정
 */
export interface MinuPlanLimits {
  searchCount: number; // 월 검색 횟수
  platforms: number; // 지원 플랫폼 수
  aiAnalysis: boolean; // AI 분석 기능 사용 가능 여부
  historyMonths: number; // 히스토리 보관 기간 (개월)
  teamMembers?: number; // 팀 멤버 수 (Enterprise만)
  apiCallsPerMinute?: number; // API 호출 제한 (분당)
}

/**
 * 플랜별 기본 제한 설정
 */
export const PLAN_LIMITS: Record<MinuPlanType, MinuPlanLimits> = {
  free: {
    searchCount: 10,
    platforms: 0,
    aiAnalysis: false,
    historyMonths: 1,
    apiCallsPerMinute: 5,
  },
  basic: {
    searchCount: 50,
    platforms: 2,
    aiAnalysis: false,
    historyMonths: 3,
    apiCallsPerMinute: 10,
  },
  pro: {
    searchCount: 300,
    platforms: 6,
    aiAnalysis: true,
    historyMonths: 6,
    apiCallsPerMinute: 30,
  },
  enterprise: {
    searchCount: 999999,
    platforms: 999,
    aiAnalysis: true,
    historyMonths: 999,
    teamMembers: 100,
    apiCallsPerMinute: 100,
  },
};

/**
 * Sandbox 테스트 계정
 */
export interface SandboxUser {
  email: string;
  password: string;
  plan: MinuPlanType;
  status?: SubscriptionStatus;
  expectedLimits: MinuPlanLimits;
}

/**
 * Sandbox 테스트 사용자 목록
 */
export const SANDBOX_USERS: Record<string, SandboxUser> = {
  free: {
    email: "test-free@ideaonaction.ai",
    password: "Test1234!",
    plan: "free",
    status: "active",
    expectedLimits: PLAN_LIMITS.free,
  },
  basic: {
    email: "test-basic@ideaonaction.ai",
    password: "Test1234!",
    plan: "basic",
    status: "active",
    expectedLimits: PLAN_LIMITS.basic,
  },
  pro: {
    email: "test-pro@ideaonaction.ai",
    password: "Test1234!",
    plan: "pro",
    status: "active",
    expectedLimits: PLAN_LIMITS.pro,
  },
  expired: {
    email: "test-expired@ideaonaction.ai",
    password: "Test1234!",
    plan: "basic",
    status: "expired",
    expectedLimits: PLAN_LIMITS.basic,
  },
  enterprise: {
    email: "test-enterprise@ideaonaction.ai",
    password: "Test1234!",
    plan: "enterprise",
    status: "active",
    expectedLimits: PLAN_LIMITS.enterprise,
  },
};

/**
 * Sandbox 환경 설정
 */
export interface SandboxConfig {
  enabled: boolean;
  baseUrl: string;
  minuFindUrl: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  mockDelay?: number; // API 응답 지연 시뮬레이션 (ms)
}

/**
 * 기본 Sandbox 설정
 */
export const SANDBOX_CONFIG: SandboxConfig = {
  enabled: import.meta.env.VITE_SANDBOX_ENABLED === "true" || false,
  baseUrl:
    import.meta.env.VITE_SANDBOX_URL || "https://sandbox.ideaonaction.ai",
  minuFindUrl: "https://sandbox.find.minu.best",
  clientId: "minu-find-sandbox",
  redirectUri: "https://sandbox.find.minu.best/callback",
  scopes: ["openid", "profile", "email", "offline_access"],
  mockDelay: 500, // 500ms 지연
};

/**
 * OAuth 엔드포인트
 */
export const OAUTH_ENDPOINTS = {
  authorize: `${SANDBOX_CONFIG.baseUrl}/oauth/authorize`,
  token: `${SANDBOX_CONFIG.baseUrl}/oauth/token`,
  revoke: `${SANDBOX_CONFIG.baseUrl}/oauth/revoke`,
  userInfo: `${SANDBOX_CONFIG.baseUrl}/oauth/userinfo`,
};

/**
 * API 엔드포인트
 */
export const API_ENDPOINTS = {
  subscription: (service: MinuServiceType) =>
    `${SANDBOX_CONFIG.baseUrl}/api/user/subscription?service=${service}`,
  profile: `${SANDBOX_CONFIG.baseUrl}/api/user/profile`,
  sessions: `${SANDBOX_CONFIG.baseUrl}/api/user/sessions`,
  history: (service: MinuServiceType) =>
    `${SANDBOX_CONFIG.baseUrl}/api/services/${service}/history`,
  auditLog: `${SANDBOX_CONFIG.baseUrl}/api/audit-log`,
  mcp: {
    status: `${SANDBOX_CONFIG.baseUrl}/admin/mcp`,
    health: `${SANDBOX_CONFIG.baseUrl}/api/mcp/health`,
  },
};

/**
 * 에러 시뮬레이션 시나리오
 */
export enum ErrorScenario {
  NONE = "none",
  RATE_LIMIT = "rate_limit",
  UNAUTHORIZED = "unauthorized",
  FORBIDDEN = "forbidden",
  NOT_FOUND = "not_found",
  SERVER_ERROR = "server_error",
  NETWORK_ERROR = "network_error",
  TIMEOUT = "timeout",
}

/**
 * Mock 응답 생성 헬퍼
 */
export interface MockResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    status: number;
  };
}

/**
 * Sandbox 환경 확인
 */
export function isSandboxEnabled(): boolean {
  return SANDBOX_CONFIG.enabled;
}

/**
 * 현재 환경 URL 반환
 */
export function getBaseUrl(): string {
  return isSandboxEnabled()
    ? SANDBOX_CONFIG.baseUrl
    : import.meta.env.VITE_APP_URL || "http://localhost:8080";
}

/**
 * Sandbox 사용자 가져오기
 */
export function getSandboxUser(key: string): SandboxUser | undefined {
  return SANDBOX_USERS[key];
}

/**
 * 플랜 제한 가져오기
 */
export function getPlanLimits(plan: MinuPlanType): MinuPlanLimits {
  return PLAN_LIMITS[plan];
}
