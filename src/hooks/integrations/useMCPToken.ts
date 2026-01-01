/**
 * MCP OAuth Token Hook
 *
 * OAuth 2.0 표준을 따르는 MCP 토큰 관리 훅
 * - Authorization Code 교환
 * - Refresh Token 갱신
 * - Token 저장/조회/삭제
 * - 자동 검증
 *
 * @module hooks/useMCPToken
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import type {
  OAuthTokenResponse,
  ExchangeCodeParams,
  StoredTokens,
  TokenValidation,
  TokenStatus,
  UseMCPTokenReturn,
  JWTPayload,
} from '@/types/mcp-auth.types';

// ============================================================================
// 상수
// ============================================================================

const TOKEN_STORAGE_KEY = 'mcp_oauth_tokens';
const WORKERS_API_URL = import.meta.env.VITE_WORKERS_API_URL || 'https://api.ideaonaction.ai';
const TOKEN_ENDPOINT = `${WORKERS_API_URL}/api/v1/oauth/token`;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * JWT 디코딩 (검증 없이 페이로드만 추출)
 */
function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * 토큰 저장
 */
function saveTokens(tokens: OAuthTokenResponse): void {
  const stored: StoredTokens = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    token_type: tokens.token_type,
    scope: tokens.scope,
    created_at: Date.now(),
  };

  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(stored));
}

/**
 * 저장된 토큰 조회
 */
function loadTokens(): StoredTokens | null {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;

    return JSON.parse(stored) as StoredTokens;
  } catch {
    return null;
  }
}

/**
 * 토큰 삭제
 */
function removeTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * 토큰 유효성 검증
 */
function validateTokenInternal(token: string): TokenValidation {
  const payload = decodeJWT(token);

  if (!payload) {
    return {
      status: 'invalid' as TokenStatus,
      error: 'Invalid JWT format',
    };
  }

  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    return {
      status: 'expired' as TokenStatus,
      payload,
      expires_at: payload.exp * 1000,
      remaining_seconds: 0,
    };
  }

  return {
    status: 'valid' as TokenStatus,
    payload,
    expires_at: payload.exp ? payload.exp * 1000 : undefined,
    remaining_seconds: payload.exp ? payload.exp - now : undefined,
  };
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * MCP OAuth Token Hook
 *
 * OAuth 2.0 표준을 따르는 토큰 관리 훅입니다.
 * Edge Function /oauth-token과 통신하여 토큰을 발급/갱신합니다.
 *
 * @example
 * ```tsx
 * function OAuthCallback() {
 *   const { exchangeCode, isLoading, error } = useMCPToken();
 *
 *   useEffect(() => {
 *     const code = new URLSearchParams(location.search).get('code');
 *     if (code) {
 *       exchangeCode({
 *         code,
 *         redirect_uri: 'https://find.minu.best/callback',
 *         client_id: 'minu-find',
 *         client_secret: 'xxx',
 *       });
 *     }
 *   }, []);
 *
 *   return isLoading ? <div>Loading...</div> : <div>Done!</div>;
 * }
 * ```
 */
export function useMCPToken(): UseMCPTokenReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tokens, setTokens] = useState<StoredTokens | null>(() => loadTokens());

  // ========================================================================
  // Authorization Code 교환
  // ========================================================================

  const exchangeCode = useCallback(
    async (params: ExchangeCodeParams): Promise<OAuthTokenResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: params.code,
            redirect_uri: params.redirect_uri,
            client_id: params.client_id,
            client_secret: params.client_secret,
            code_verifier: params.code_verifier,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error_description || `Token exchange failed: ${response.status}`
          );
        }

        const data: OAuthTokenResponse = await response.json();

        // 토큰 저장
        saveTokens(data);
        setTokens(loadTokens());

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ========================================================================
  // Refresh Token 갱신
  // ========================================================================

  const refreshToken = useCallback(
    async (refreshTokenParam?: string): Promise<OAuthTokenResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const currentTokens = tokens || loadTokens();
        const tokenToUse = refreshTokenParam || currentTokens?.refresh_token;

        if (!tokenToUse) {
          throw new Error('No refresh token available');
        }

        // client_id는 저장된 토큰에서 추출 (실제로는 설정에서 가져와야 함)
        const payload = currentTokens?.access_token
          ? decodeJWT(currentTokens.access_token)
          : null;
        const clientId = payload?.aud || 'unknown';

        const response = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: tokenToUse,
            client_id: clientId,
            client_secret: '', // 실제로는 환경 변수에서 가져와야 함
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error_description || `Token refresh failed: ${response.status}`
          );
        }

        const data: OAuthTokenResponse = await response.json();

        // 토큰 저장
        saveTokens(data);
        setTokens(loadTokens());

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [tokens]
  );

  // ========================================================================
  // 토큰 무효화 (로그아웃)
  // ========================================================================

  const revokeToken = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // 실제로는 /oauth/revoke 엔드포인트를 호출해야 하지만
      // 현재는 로컬 저장소만 삭제
      removeTokens();
      setTokens(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ========================================================================
  // 토큰 조회 및 관리
  // ========================================================================

  const getStoredTokens = useCallback((): StoredTokens | null => {
    return tokens || loadTokens();
  }, [tokens]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const currentTokens = tokens || loadTokens();

    if (!currentTokens) {
      return null;
    }

    // 토큰 유효성 검증
    const validation = validateTokenInternal(currentTokens.access_token);

    if (validation.status === 'valid') {
      return currentTokens.access_token;
    }

    // 만료된 경우 자동 갱신 시도
    if (validation.status === 'expired' && currentTokens.refresh_token) {
      try {
        const refreshed = await refreshToken(currentTokens.refresh_token);
        return refreshed.access_token;
      } catch {
        return null;
      }
    }

    return null;
  }, [tokens, refreshToken]);

  const validateToken = useCallback(
    (token?: string): TokenValidation => {
      const tokenToValidate = token || tokens?.access_token;

      if (!tokenToValidate) {
        return {
          status: 'missing' as TokenStatus,
          error: 'No token provided',
        };
      }

      return validateTokenInternal(tokenToValidate);
    },
    [tokens]
  );

  const storeTokens = useCallback((newTokens: OAuthTokenResponse): void => {
    saveTokens(newTokens);
    setTokens(loadTokens());
  }, []);

  const clearTokens = useCallback((): void => {
    removeTokens();
    setTokens(null);
  }, []);

  // ========================================================================
  // 사용자 로그아웃 시 자동 정리
  // ========================================================================

  useEffect(() => {
    if (!user && tokens) {
      clearTokens();
    }
  }, [user, tokens, clearTokens]);

  // ========================================================================
  // Return
  // ========================================================================

  return {
    exchangeCode,
    refreshToken,
    revokeToken,
    getStoredTokens,
    getAccessToken,
    validateToken,
    storeTokens,
    clearTokens,
    isLoading,
    error,
  };
}

export default useMCPToken;
