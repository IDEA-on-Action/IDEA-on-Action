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
