/**
 * MCP Authentication Utilities
 *
 * MCP 토큰 인증 관련 유틸리티 함수
 *
 * @module lib/mcp-auth
 */

import type {
  MCPTokenRequest,
  MCPTokenResponse,
  MCPTokenVerifyRequest,
  MCPTokenVerifyResponse,
  MCPTokenRefreshRequest,
  MCPTokenRefreshResponse,
  MCPTokenRevokeRequest,
  MCPTokenRevokeResponse,
  MCPAuthError,
  MCPAuthErrorCode,
  MCPServiceName,
  MCPTokenStorageData,
  MCP_AUTH_STORAGE_KEY,
} from '@/types/auth/mcp-auth.types';
import {
  createMCPAuthError,
  DEFAULT_TOKEN_EXPIRES_IN,
} from '@/types/auth/mcp-auth.types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * MCP 서버 URL
 */
const MCP_SERVER_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MCP_SERVER_URL) ||
  'http://localhost:3001';

/**
 * MCP 인증 엔드포인트
 */
const MCP_AUTH_ENDPOINTS = {
  token: '/auth/token',
  verify: '/auth/verify',
  refresh: '/auth/refresh',
  revoke: '/auth/revoke',
} as const;

// ============================================================================
// Storage Utilities
// ============================================================================

const STORAGE_KEY = 'mcp_auth_token';

/**
 * 토큰을 로컬 스토리지에 저장
 */
export function saveTokenToStorage(data: MCPTokenStorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('MCP 토큰 저장 실패:', error);
  }
}

/**
 * 로컬 스토리지에서 토큰 로드
 */
export function loadTokenFromStorage(): MCPTokenStorageData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as MCPTokenStorageData;
  } catch (error) {
    console.warn('MCP 토큰 로드 실패:', error);
    return null;
  }
}

/**
 * 로컬 스토리지에서 토큰 삭제
 */
export function removeTokenFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('MCP 토큰 삭제 실패:', error);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 현재 사용자의 Workers JWT 토큰 가져오기
 */
async function getUserToken(): Promise<string | null> {
  try {
    const stored = localStorage.getItem('workers_auth_tokens');
    if (!stored) return null;
    const tokens = JSON.parse(stored);
    return tokens?.accessToken ?? null;
  } catch {
    return null;
  }
}

/**
 * HTTP 에러를 MCP 인증 에러로 변환
 */
function httpErrorToMCPAuthError(
  status: number,
  message: string,
  cause?: Error
): MCPAuthError {
  let code: MCPAuthErrorCode;

  switch (status) {
    case 400:
      code = 'MCP_AUTH_006'; // 유효하지 않은 토큰
      break;
    case 401:
      code = 'MCP_AUTH_005'; // 토큰 만료
      break;
    case 403:
      code = 'MCP_AUTH_007'; // 서비스 접근 권한 없음
      break;
    case 500:
    case 502:
    case 503:
      code = 'MCP_AUTH_008'; // 인증 서버 오류
      break;
    default:
      code = 'MCP_AUTH_010'; // 알 수 없는 오류
  }

  return createMCPAuthError(code, message, cause);
}

/**
 * MCP 서버에 인증 요청
 */
async function mcpAuthRequest<TRequest, TResponse>(
  endpoint: string,
  data: TRequest,
  authToken?: string
): Promise<TResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${MCP_SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw httpErrorToMCPAuthError(
        response.status,
        errorData.message || response.statusText
      );
    }

    return (await response.json()) as TResponse;
  } catch (error) {
    // 이미 MCPAuthError인 경우 그대로 throw
    if ((error as MCPAuthError).code?.startsWith('MCP_AUTH_')) {
      throw error;
    }

    // 네트워크 에러
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw createMCPAuthError(
        'MCP_AUTH_009',
        '네트워크 연결 실패',
        error as Error
      );
    }

    throw createMCPAuthError(
      'MCP_AUTH_010',
      error instanceof Error ? error.message : '알 수 없는 오류',
      error as Error
    );
  }
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * MCP 토큰 요청
 *
 * 지정된 서비스에 대한 액세스 토큰과 리프레시 토큰을 발급받습니다.
 *
 * @param serviceName - 대상 서비스 이름
 * @param scopes - 요청할 권한 범위 (선택)
 * @param expiresIn - 토큰 유효 시간 (초, 기본 3600)
 * @returns 토큰 응답
 * @throws MCPAuthError
 *
 * @example
 * ```ts
 * const response = await requestMCPToken('minu-find', ['read', 'write']);
 * console.log(response.accessToken);
 * ```
 */
export async function requestMCPToken(
  serviceName: MCPServiceName,
  scopes?: string[],
  expiresIn?: number
): Promise<MCPTokenResponse> {
  // 사용자 JWT 토큰 가져오기
  const userToken = await getUserToken();
  if (!userToken) {
    throw createMCPAuthError('MCP_AUTH_001', '로그인이 필요합니다');
  }

  const request: MCPTokenRequest = {
    serviceName,
    scopes,
    userToken,
    expiresIn: expiresIn ?? DEFAULT_TOKEN_EXPIRES_IN,
  };

  try {
    const response = await mcpAuthRequest<MCPTokenRequest, MCPTokenResponse>(
      MCP_AUTH_ENDPOINTS.token,
      request,
      userToken
    );

    // 토큰 저장
    const storageData: MCPTokenStorageData = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: response.expiresAt,
      serviceName: response.serviceName,
      scopes: response.scopes,
      createdAt: new Date().toISOString(),
    };
    saveTokenToStorage(storageData);

    return response;
  } catch (error) {
    // 에러 코드 보정
    if ((error as MCPAuthError).code === 'MCP_AUTH_010') {
      throw createMCPAuthError(
        'MCP_AUTH_001',
        (error as MCPAuthError).details,
        (error as MCPAuthError).cause
      );
    }
    throw error;
  }
}

/**
 * MCP 토큰 검증
 *
 * 토큰의 유효성을 검증하고 상태 정보를 반환합니다.
 *
 * @param token - 검증할 토큰
 * @param serviceName - 서비스별 권한 확인 (선택)
 * @returns 검증 결과
 * @throws MCPAuthError
 *
 * @example
 * ```ts
 * const result = await verifyMCPToken(accessToken);
 * if (result.valid) {
 *   console.log('토큰 유효, 남은 시간:', result.remainingTime);
 * }
 * ```
 */
export async function verifyMCPToken(
  token: string,
  serviceName?: MCPServiceName
): Promise<MCPTokenVerifyResponse> {
  const request: MCPTokenVerifyRequest = {
    token,
    serviceName,
  };

  try {
    return await mcpAuthRequest<MCPTokenVerifyRequest, MCPTokenVerifyResponse>(
      MCP_AUTH_ENDPOINTS.verify,
      request,
      token
    );
  } catch (error) {
    // 에러 코드 보정
    if ((error as MCPAuthError).code === 'MCP_AUTH_010') {
      throw createMCPAuthError(
        'MCP_AUTH_002',
        (error as MCPAuthError).details,
        (error as MCPAuthError).cause
      );
    }
    throw error;
  }
}

/**
 * MCP 토큰 갱신
 *
 * 리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급받습니다.
 *
 * @param refreshToken - 리프레시 토큰
 * @returns 새로운 토큰 응답
 * @throws MCPAuthError
 *
 * @example
 * ```ts
 * const newTokens = await refreshMCPToken(refreshToken);
 * console.log('새 액세스 토큰:', newTokens.accessToken);
 * ```
 */
export async function refreshMCPToken(
  refreshToken: string
): Promise<MCPTokenRefreshResponse> {
  const request: MCPTokenRefreshRequest = {
    refreshToken,
  };

  try {
    const response = await mcpAuthRequest<MCPTokenRefreshRequest, MCPTokenRefreshResponse>(
      MCP_AUTH_ENDPOINTS.refresh,
      request,
      refreshToken
    );

    // 토큰 저장 업데이트
    const storageData: MCPTokenStorageData = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: response.expiresAt,
      serviceName: response.serviceName,
      scopes: response.scopes,
      createdAt: new Date().toISOString(),
    };
    saveTokenToStorage(storageData);

    return response;
  } catch (error) {
    // 에러 코드 보정
    if ((error as MCPAuthError).code === 'MCP_AUTH_010') {
      throw createMCPAuthError(
        'MCP_AUTH_003',
        (error as MCPAuthError).details,
        (error as MCPAuthError).cause
      );
    }
    throw error;
  }
}

/**
 * MCP 토큰 폐기
 *
 * 액세스 토큰 또는 리프레시 토큰을 폐기합니다.
 *
 * @param token - 폐기할 토큰
 * @param tokenType - 토큰 유형 (기본: 'access')
 * @throws MCPAuthError
 *
 * @example
 * ```ts
 * await revokeMCPToken(accessToken);
 * // 또는 리프레시 토큰도 함께 폐기
 * await revokeMCPToken(refreshToken, 'refresh');
 * ```
 */
export async function revokeMCPToken(
  token: string,
  tokenType: 'access' | 'refresh' = 'access'
): Promise<void> {
  const request: MCPTokenRevokeRequest = {
    token,
    tokenType,
  };

  try {
    await mcpAuthRequest<MCPTokenRevokeRequest, MCPTokenRevokeResponse>(
      MCP_AUTH_ENDPOINTS.revoke,
      request,
      token
    );

    // 로컬 스토리지에서 토큰 삭제
    removeTokenFromStorage();
  } catch (error) {
    // 에러 코드 보정
    if ((error as MCPAuthError).code === 'MCP_AUTH_010') {
      throw createMCPAuthError(
        'MCP_AUTH_004',
        (error as MCPAuthError).details,
        (error as MCPAuthError).cause
      );
    }
    throw error;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 토큰 만료까지 남은 시간 계산 (초)
 *
 * @param expiresAt - 만료 시간 (ISO 8601 문자열 또는 Date)
 * @returns 남은 시간 (초), 만료된 경우 0
 */
export function calculateTokenExpiresIn(expiresAt: string | Date): number {
  const expiresDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const diff = expiresDate.getTime() - now.getTime();
  return Math.max(0, Math.floor(diff / 1000));
}

/**
 * 토큰 갱신이 필요한지 확인
 *
 * @param expiresAt - 만료 시간
 * @param thresholdSeconds - 임계값 (기본: 300초 = 5분)
 * @returns 갱신 필요 여부
 */
export function needsTokenRefresh(
  expiresAt: string | Date,
  thresholdSeconds: number = 300
): boolean {
  const remainingTime = calculateTokenExpiresIn(expiresAt);
  return remainingTime > 0 && remainingTime <= thresholdSeconds;
}

/**
 * 토큰이 만료되었는지 확인
 *
 * @param expiresAt - 만료 시간
 * @returns 만료 여부
 */
export function isTokenExpired(expiresAt: string | Date): boolean {
  return calculateTokenExpiresIn(expiresAt) <= 0;
}

/**
 * 저장된 토큰 로드 및 유효성 확인
 *
 * @returns 유효한 토큰 데이터 또는 null
 */
export function getStoredTokenIfValid(): MCPTokenStorageData | null {
  const stored = loadTokenFromStorage();
  if (!stored) return null;

  // 만료된 경우 삭제
  if (isTokenExpired(stored.expiresAt)) {
    removeTokenFromStorage();
    return null;
  }

  return stored;
}

/**
 * MCP 인증 에러인지 확인
 *
 * @param error - 확인할 에러
 * @returns MCP 인증 에러 여부
 */
export function isMCPAuthError(error: unknown): error is MCPAuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as MCPAuthError).code === 'string' &&
    (error as MCPAuthError).code.startsWith('MCP_AUTH_')
  );
}
