/**
 * MCP Authentication Types
 *
 * MCP 토큰 인증 관련 타입 정의
 *
 * @module types/mcp-auth
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * MCP 인증 에러 코드
 */
export type MCPAuthErrorCode =
  | 'MCP_AUTH_001' // 토큰 요청 실패
  | 'MCP_AUTH_002' // 토큰 검증 실패
  | 'MCP_AUTH_003' // 토큰 갱신 실패
  | 'MCP_AUTH_004' // 토큰 폐기 실패
  | 'MCP_AUTH_005' // 토큰 만료
  | 'MCP_AUTH_006' // 유효하지 않은 토큰
  | 'MCP_AUTH_007' // 서비스 접근 권한 없음
  | 'MCP_AUTH_008' // 인증 서버 오류
  | 'MCP_AUTH_009' // 네트워크 오류
  | 'MCP_AUTH_010'; // 알 수 없는 오류

/**
 * 에러 코드별 메시지 매핑
 */
export const MCP_AUTH_ERROR_MESSAGES: Record<MCPAuthErrorCode, string> = {
  MCP_AUTH_001: '토큰 요청에 실패했습니다',
  MCP_AUTH_002: '토큰 검증에 실패했습니다',
  MCP_AUTH_003: '토큰 갱신에 실패했습니다',
  MCP_AUTH_004: '토큰 폐기에 실패했습니다',
  MCP_AUTH_005: '토큰이 만료되었습니다',
  MCP_AUTH_006: '유효하지 않은 토큰입니다',
  MCP_AUTH_007: '서비스 접근 권한이 없습니다',
  MCP_AUTH_008: '인증 서버에 오류가 발생했습니다',
  MCP_AUTH_009: '네트워크 연결에 실패했습니다',
  MCP_AUTH_010: '알 수 없는 오류가 발생했습니다',
};

// ============================================================================
// Token Types
// ============================================================================

/**
 * MCP 토큰 유형
 */
export type MCPTokenType = 'access' | 'refresh';

/**
 * MCP 토큰 상태
 */
export type MCPTokenStatus =
  | 'valid'      // 유효한 토큰
  | 'expired'    // 만료된 토큰
  | 'revoked'    // 폐기된 토큰
  | 'invalid';   // 유효하지 않은 토큰

/**
 * Minu 서비스 ID (인증 대상)
 */
export type MCPServiceName =
  | 'minu-find'
  | 'minu-frame'
  | 'minu-build'
  | 'minu-keep';

// ============================================================================
// Request Types
// ============================================================================

/**
 * MCP 토큰 요청
 */
export interface MCPTokenRequest {
  /** 대상 서비스 이름 */
  serviceName: MCPServiceName;
  /** 요청 범위 (권한) */
  scopes?: string[];
  /** 사용자 JWT 토큰 (Supabase) */
  userToken?: string;
  /** 토큰 유효 시간 (초, 기본 3600) */
  expiresIn?: number;
}

/**
 * MCP 토큰 검증 요청
 */
export interface MCPTokenVerifyRequest {
  /** 검증할 토큰 */
  token: string;
  /** 대상 서비스 (선택, 서비스별 권한 확인시) */
  serviceName?: MCPServiceName;
}

/**
 * MCP 토큰 갱신 요청
 */
export interface MCPTokenRefreshRequest {
  /** 리프레시 토큰 */
  refreshToken: string;
}

/**
 * MCP 토큰 폐기 요청
 */
export interface MCPTokenRevokeRequest {
  /** 폐기할 토큰 */
  token: string;
  /** 토큰 유형 */
  tokenType?: MCPTokenType;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * MCP 토큰 응답
 */
export interface MCPTokenResponse {
  /** 액세스 토큰 */
  accessToken: string;
  /** 리프레시 토큰 */
  refreshToken: string;
  /** 토큰 유형 (Bearer) */
  tokenType: 'Bearer';
  /** 만료 시간 (초) */
  expiresIn: number;
  /** 만료 타임스탬프 (ISO 8601) */
  expiresAt: string;
  /** 부여된 범위 */
  scopes: string[];
  /** 대상 서비스 */
  serviceName: MCPServiceName;
}

/**
 * MCP 토큰 검증 결과
 */
export interface MCPTokenVerifyResponse {
  /** 유효 여부 */
  valid: boolean;
  /** 토큰 상태 */
  status: MCPTokenStatus;
  /** 만료 시간 (유효한 경우) */
  expiresAt?: string;
  /** 남은 시간 (초) */
  remainingTime?: number;
  /** 사용자 ID */
  userId?: string;
  /** 서비스 이름 */
  serviceName?: MCPServiceName;
  /** 부여된 범위 */
  scopes?: string[];
}

/**
 * MCP 토큰 갱신 결과
 */
export type MCPTokenRefreshResponse = MCPTokenResponse;

/**
 * MCP 토큰 폐기 결과
 */
export interface MCPTokenRevokeResponse {
  /** 폐기 성공 여부 */
  revoked: boolean;
  /** 메시지 */
  message: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * MCP 인증 에러
 */
export interface MCPAuthError {
  /** 에러 코드 */
  code: MCPAuthErrorCode;
  /** 에러 메시지 */
  message: string;
  /** 상세 정보 */
  details?: string;
  /** HTTP 상태 코드 */
  httpStatus?: number;
  /** 원본 에러 */
  cause?: Error;
  /** 타임스탬프 */
  timestamp: string;
}

/**
 * MCP 인증 에러 생성 헬퍼
 */
export function createMCPAuthError(
  code: MCPAuthErrorCode,
  details?: string,
  cause?: Error
): MCPAuthError {
  return {
    code,
    message: MCP_AUTH_ERROR_MESSAGES[code],
    details,
    cause,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Hook State Types
// ============================================================================

/**
 * MCP 인증 상태
 */
export interface MCPAuthState {
  /** 현재 액세스 토큰 */
  accessToken: string | null;
  /** 현재 리프레시 토큰 */
  refreshToken: string | null;
  /** 만료 시간 */
  expiresAt: Date | null;
  /** 인증된 서비스 */
  serviceName: MCPServiceName | null;
  /** 부여된 범위 */
  scopes: string[];
  /** 인증 여부 */
  isAuthenticated: boolean;
  /** 토큰 갱신 중 여부 */
  isRefreshing: boolean;
  /** 마지막 에러 */
  lastError: MCPAuthError | null;
}

/**
 * MCP 인증 훅 반환 타입
 */
export interface UseMCPAuthResult {
  /** 현재 인증 상태 */
  state: MCPAuthState;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 발생 여부 */
  isError: boolean;
  /** 에러 객체 */
  error: MCPAuthError | null;

  /** 토큰 요청 */
  requestToken: (serviceName: MCPServiceName, scopes?: string[]) => Promise<MCPTokenResponse>;
  /** 토큰 검증 */
  verifyToken: () => Promise<MCPTokenVerifyResponse>;
  /** 토큰 갱신 */
  refreshToken: () => Promise<MCPTokenResponse>;
  /** 토큰 폐기 (로그아웃) */
  revokeToken: () => Promise<void>;
  /** 인증 상태 초기화 */
  clearAuth: () => void;

  /** 토큰 유효 여부 */
  isTokenValid: boolean;
  /** 토큰 만료까지 남은 시간 (초) */
  tokenExpiresIn: number | null;
  /** 토큰 갱신 필요 여부 (5분 전) */
  needsRefresh: boolean;
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * MCP 토큰 저장 데이터
 */
export interface MCPTokenStorageData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  serviceName: MCPServiceName;
  scopes: string[];
  createdAt: string;
}

/**
 * 로컬 스토리지 키
 */
export const MCP_AUTH_STORAGE_KEY = 'mcp_auth_token';

// ============================================================================
// Constants
// ============================================================================

/**
 * 토큰 갱신 임계값 (초)
 * 만료 5분 전에 자동 갱신
 */
export const TOKEN_REFRESH_THRESHOLD_SECONDS = 5 * 60;

/**
 * 기본 토큰 만료 시간 (초)
 */
export const DEFAULT_TOKEN_EXPIRES_IN = 60 * 60; // 1시간

/**
 * 토큰 갱신 체크 간격 (밀리초)
 */
export const TOKEN_REFRESH_CHECK_INTERVAL = 60 * 1000; // 1분

// ============================================================================
// OAuth 2.0 표준 타입 (Edge Function용)
// ============================================================================

/**
 * OAuth Grant Type
 */
export type OAuthGrantType = 'authorization_code' | 'refresh_token';

/**
 * OAuth 토큰 요청 (Authorization Code Grant)
 */
export interface OAuthTokenRequestAuthCode {
  grant_type: 'authorization_code';
  code: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
  code_verifier?: string; // PKCE
}

/**
 * OAuth 토큰 요청 (Refresh Token Grant)
 */
export interface OAuthTokenRequestRefresh {
  grant_type: 'refresh_token';
  refresh_token: string;
  client_id: string;
  client_secret: string;
}

/**
 * OAuth 토큰 요청 (Union Type)
 */
export type OAuthTokenRequest =
  | OAuthTokenRequestAuthCode
  | OAuthTokenRequestRefresh;

/**
 * OAuth 토큰 응답 (표준)
 */
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: 'Bearer';
  scope?: string;
}

/**
 * OAuth 에러 응답 (RFC 6749)
 */
export interface OAuthErrorResponse {
  error: 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'unauthorized_client' | 'unsupported_grant_type' | 'invalid_scope';
  error_description?: string;
  error_uri?: string;
}

// ============================================================================
// JWT 페이로드 타입
// ============================================================================

/**
 * JWT 표준 Claims (RFC 7519)
 */
export interface JWTPayload {
  /** Subject (User ID) */
  sub: string;

  /** Issuer */
  iss: string;

  /** Audience (Client ID) */
  aud: string;

  /** Expiration Time (Unix timestamp, seconds) */
  exp: number;

  /** Issued At (Unix timestamp, seconds) */
  iat: number;

  /** JWT ID (Unique identifier for token) */
  jti?: string;

  /** Scope (OAuth 2.0) */
  scope?: string;

  /** Session ID (for refresh token) */
  sid?: string;

  /** User Email */
  email?: string;

  /** User Name */
  name?: string;

  /** User Avatar URL */
  picture?: string;

  /** Custom Claims */
  [key: string]: unknown;
}

/**
 * 디코딩된 JWT 토큰 정보
 */
export interface DecodedJWT {
  header: {
    alg: string;
    typ: string;
    kid?: string;
  };
  payload: JWTPayload;
  signature: string;
}

// ============================================================================
// useMCPToken Hook 타입 (OAuth 표준)
// ============================================================================

/**
 * Exchange Code 파라미터
 */
export interface ExchangeCodeParams {
  code: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
  code_verifier?: string;
}

/**
 * Stored Token 정보
 */
export interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // Unix timestamp (milliseconds)
  token_type: 'Bearer';
  scope?: string;
  created_at: number; // Unix timestamp (milliseconds)
}

/**
 * Token Status
 */
export type TokenStatus = 'valid' | 'expired' | 'invalid' | 'missing';

/**
 * Token Validation Result
 */
export interface TokenValidation {
  status: TokenStatus;
  payload?: JWTPayload;
  error?: string;
  expires_at?: number;
  remaining_seconds?: number;
}

/**
 * useMCPToken Hook 반환 타입
 */
export interface UseMCPTokenReturn {
  /**
   * Authorization Code를 Access Token으로 교환
   */
  exchangeCode: (params: ExchangeCodeParams) => Promise<OAuthTokenResponse>;

  /**
   * Refresh Token으로 새 Access Token 발급
   */
  refreshToken: (refreshToken?: string) => Promise<OAuthTokenResponse>;

  /**
   * 토큰 무효화 (로그아웃)
   */
  revokeToken: () => Promise<void>;

  /**
   * 현재 저장된 토큰 조회
   */
  getStoredTokens: () => StoredTokens | null;

  /**
   * Access Token 가져오기 (자동 갱신 포함)
   */
  getAccessToken: () => Promise<string | null>;

  /**
   * 토큰 유효성 검증
   */
  validateToken: (token?: string) => TokenValidation;

  /**
   * 토큰 저장
   */
  storeTokens: (tokens: OAuthTokenResponse) => void;

  /**
   * 토큰 삭제
   */
  clearTokens: () => void;

  /**
   * 로딩 상태
   */
  isLoading: boolean;

  /**
   * 에러 상태
   */
  error: Error | null;
}

// ============================================================================
// Edge Function 환경 변수
// ============================================================================

/**
 * OAuth Token Edge Function 환경 변수
 */
export interface OAuthTokenEnv {
  /** JWT Secret Key (HS256) */
  JWT_SECRET: string;

  /** JWT Issuer */
  JWT_ISSUER: string;

  /** Access Token Expiration (seconds, default: 3600) */
  ACCESS_TOKEN_EXPIRATION?: string;

  /** Refresh Token Expiration (seconds, default: 2592000 = 30 days) */
  REFRESH_TOKEN_EXPIRATION?: string;

  /** Supabase URL */
  SUPABASE_URL: string;

  /** Supabase Service Role Key */
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// ============================================================================
// DB 스키마 타입
// ============================================================================

/**
 * OAuth Authorization Code (DB)
 */
export interface OAuthCodeRecord {
  code: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  scope?: string;
  code_challenge?: string;
  code_challenge_method?: 'S256' | 'plain';
  expires_at: string;
  used_at?: string;
  created_at: string;
}

/**
 * OAuth Session (DB)
 */
export interface OAuthSessionRecord {
  id: string;
  user_id: string;
  client_id: string;
  access_token_jti: string;
  refresh_token_jti?: string;
  scope?: string;
  expires_at: string;
  created_at: string;
  last_used_at?: string;
  revoked_at?: string;
}
