/**
 * MCP Authentication Hook
 *
 * MCP 토큰 인증을 위한 React 훅
 * - 토큰 요청, 검증, 갱신, 폐기
 * - 자동 갱신 로직 (만료 5분 전)
 * - React Query 기반 상태 관리
 *
 * @module hooks/useMCPAuth
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  requestMCPToken,
  verifyMCPToken,
  refreshMCPToken,
  revokeMCPToken,
  getStoredTokenIfValid,
  removeTokenFromStorage,
  calculateTokenExpiresIn,
  needsTokenRefresh,
  isMCPAuthError,
} from '@/lib/mcp-auth';
import { cacheConfig } from '@/lib/react-query';
import type {
  MCPAuthState,
  MCPAuthError,
  MCPServiceName,
  MCPTokenResponse,
  MCPTokenVerifyResponse,
  UseMCPAuthResult,
  TOKEN_REFRESH_THRESHOLD_SECONDS,
  TOKEN_REFRESH_CHECK_INTERVAL,
} from '@/types/mcp-auth.types';
import { createMCPAuthError } from '@/types/mcp-auth.types';

// ============================================================================
// Query Keys
// ============================================================================

export const mcpAuthQueryKeys = {
  all: ['mcp-auth'] as const,
  token: () => [...mcpAuthQueryKeys.all, 'token'] as const,
  verify: () => [...mcpAuthQueryKeys.all, 'verify'] as const,
  state: () => [...mcpAuthQueryKeys.all, 'state'] as const,
};

// ============================================================================
// Constants
// ============================================================================

/** 토큰 갱신 임계값 (초) - 만료 5분 전 */
const REFRESH_THRESHOLD = 5 * 60;

/** 자동 갱신 체크 간격 (밀리초) - 1분 */
const REFRESH_CHECK_INTERVAL = 60 * 1000;

// ============================================================================
// Initial State
// ============================================================================

const initialAuthState: MCPAuthState = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  serviceName: null,
  scopes: [],
  isAuthenticated: false,
  isRefreshing: false,
  lastError: null,
};

// ============================================================================
// Main Hook
// ============================================================================

/**
 * MCP 인증 훅
 *
 * MCP 서비스에 대한 토큰 기반 인증을 관리합니다.
 * - 토큰 요청/검증/갱신/폐기
 * - 자동 토큰 갱신 (만료 5분 전)
 * - 로컬 스토리지 기반 세션 유지
 * - React Query 기반 상태 관리
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     state,
 *     isLoading,
 *     requestToken,
 *     isTokenValid,
 *     needsRefresh,
 *   } = useMCPAuth();
 *
 *   // 토큰 요청
 *   const handleLogin = async () => {
 *     try {
 *       await requestToken('minu-find', ['read', 'write']);
 *       console.log('인증 성공!');
 *     } catch (error) {
 *       console.error('인증 실패:', error);
 *     }
 *   };
 *
 *   if (state.isAuthenticated) {
 *     return <div>인증됨: {state.serviceName}</div>;
 *   }
 *
 *   return <button onClick={handleLogin}>로그인</button>;
 * }
 * ```
 */
export function useMCPAuth(): UseMCPAuthResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 인증 상태
  const [authState, setAuthState] = useState<MCPAuthState>(() => {
    // 초기화 시 저장된 토큰 로드
    const stored = getStoredTokenIfValid();
    if (stored) {
      return {
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        expiresAt: new Date(stored.expiresAt),
        serviceName: stored.serviceName,
        scopes: stored.scopes,
        isAuthenticated: true,
        isRefreshing: false,
        lastError: null,
      };
    }
    return initialAuthState;
  });

  // 자동 갱신 타이머 ref
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ========================================================================
  // 토큰 검증 쿼리
  // ========================================================================

  const verifyQuery = useQuery({
    queryKey: mcpAuthQueryKeys.verify(),
    queryFn: async (): Promise<MCPTokenVerifyResponse | null> => {
      if (!authState.accessToken) return null;
      return verifyMCPToken(authState.accessToken, authState.serviceName ?? undefined);
    },
    enabled: !!authState.accessToken,
    ...cacheConfig.short,
    retry: 1,
    refetchInterval: REFRESH_CHECK_INTERVAL, // 1분마다 검증
  });

  // ========================================================================
  // 토큰 요청 뮤테이션
  // ========================================================================

  const requestTokenMutation = useMutation({
    mutationFn: async ({
      serviceName,
      scopes,
    }: {
      serviceName: MCPServiceName;
      scopes?: string[];
    }): Promise<MCPTokenResponse> => {
      return requestMCPToken(serviceName, scopes);
    },
    onSuccess: (response) => {
      setAuthState({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: new Date(response.expiresAt),
        serviceName: response.serviceName,
        scopes: response.scopes,
        isAuthenticated: true,
        isRefreshing: false,
        lastError: null,
      });

      // 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: mcpAuthQueryKeys.verify() });
    },
    onError: (error) => {
      const mcpError = isMCPAuthError(error)
        ? error
        : createMCPAuthError('MCP_AUTH_001', String(error));

      setAuthState((prev) => ({
        ...prev,
        lastError: mcpError,
      }));
    },
  });

  // ========================================================================
  // 토큰 갱신 뮤테이션
  // ========================================================================

  const refreshTokenMutation = useMutation({
    mutationFn: async (): Promise<MCPTokenResponse> => {
      if (!authState.refreshToken) {
        throw createMCPAuthError('MCP_AUTH_003', '리프레시 토큰이 없습니다');
      }
      return refreshMCPToken(authState.refreshToken);
    },
    onMutate: () => {
      setAuthState((prev) => ({ ...prev, isRefreshing: true }));
    },
    onSuccess: (response) => {
      setAuthState({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: new Date(response.expiresAt),
        serviceName: response.serviceName,
        scopes: response.scopes,
        isAuthenticated: true,
        isRefreshing: false,
        lastError: null,
      });

      // 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: mcpAuthQueryKeys.verify() });
    },
    onError: (error) => {
      const mcpError = isMCPAuthError(error)
        ? error
        : createMCPAuthError('MCP_AUTH_003', String(error));

      setAuthState((prev) => ({
        ...prev,
        isRefreshing: false,
        lastError: mcpError,
      }));
    },
  });

  // ========================================================================
  // 토큰 폐기 뮤테이션
  // ========================================================================

  const revokeTokenMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (authState.accessToken) {
        await revokeMCPToken(authState.accessToken);
      }
      if (authState.refreshToken) {
        await revokeMCPToken(authState.refreshToken, 'refresh');
      }
    },
    onSuccess: () => {
      setAuthState(initialAuthState);
      removeTokenFromStorage();

      // 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: mcpAuthQueryKeys.all });
    },
    onError: (error) => {
      const mcpError = isMCPAuthError(error)
        ? error
        : createMCPAuthError('MCP_AUTH_004', String(error));

      setAuthState((prev) => ({
        ...prev,
        lastError: mcpError,
      }));
    },
  });

  // ========================================================================
  // 계산된 값
  // ========================================================================

  const tokenExpiresIn = useMemo(() => {
    if (!authState.expiresAt) return null;
    return calculateTokenExpiresIn(authState.expiresAt);
  }, [authState.expiresAt]);

  const isTokenValid = useMemo(() => {
    if (!authState.isAuthenticated || !tokenExpiresIn) return false;
    return tokenExpiresIn > 0;
  }, [authState.isAuthenticated, tokenExpiresIn]);

  const needsRefreshFlag = useMemo(() => {
    if (!authState.expiresAt) return false;
    return needsTokenRefresh(authState.expiresAt, REFRESH_THRESHOLD);
  }, [authState.expiresAt]);

  // ========================================================================
  // 자동 갱신 로직
  // ========================================================================

  useEffect(() => {
    // 자동 갱신 조건 확인
    if (!authState.isAuthenticated || !authState.refreshToken) {
      return;
    }

    // 이전 타이머 정리
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // 자동 갱신 체크
    const checkAndRefresh = async () => {
      if (!authState.expiresAt || authState.isRefreshing) return;

      const shouldRefresh = needsTokenRefresh(authState.expiresAt, REFRESH_THRESHOLD);

      if (shouldRefresh) {
        console.log('[MCP Auth] 토큰 자동 갱신 시작...');
        try {
          await refreshTokenMutation.mutateAsync();
          console.log('[MCP Auth] 토큰 자동 갱신 성공');
        } catch (error) {
          console.error('[MCP Auth] 토큰 자동 갱신 실패:', error);
        }
      }
    };

    // 즉시 체크 (컴포넌트 마운트 시)
    checkAndRefresh();

    // 주기적 체크 설정
    refreshTimerRef.current = setInterval(checkAndRefresh, REFRESH_CHECK_INTERVAL);

    // 클린업
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
    // refreshTokenMutation은 의도적으로 제외 - mutation 객체는 매 렌더마다 새로 생성되어
    // 의존성에 포함하면 무한 루프가 발생합니다. mutateAsync는 안정적인 함수 참조입니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authState.isAuthenticated,
    authState.refreshToken,
    authState.expiresAt,
    authState.isRefreshing,
  ]);

  // ========================================================================
  // 사용자 로그아웃 시 토큰 정리
  // ========================================================================

  useEffect(() => {
    if (!user && authState.isAuthenticated) {
      // 사용자가 로그아웃하면 MCP 토큰도 정리
      setAuthState(initialAuthState);
      removeTokenFromStorage();
    }
  }, [user, authState.isAuthenticated]);

  // ========================================================================
  // Public API
  // ========================================================================

  const requestToken = useCallback(
    async (serviceName: MCPServiceName, scopes?: string[]): Promise<MCPTokenResponse> => {
      return requestTokenMutation.mutateAsync({ serviceName, scopes });
    },
    [requestTokenMutation]
  );

  const verifyToken = useCallback(async (): Promise<MCPTokenVerifyResponse> => {
    if (!authState.accessToken) {
      throw createMCPAuthError('MCP_AUTH_002', '액세스 토큰이 없습니다');
    }
    return verifyMCPToken(authState.accessToken, authState.serviceName ?? undefined);
  }, [authState.accessToken, authState.serviceName]);

  const refreshTokenFn = useCallback(async (): Promise<MCPTokenResponse> => {
    return refreshTokenMutation.mutateAsync();
  }, [refreshTokenMutation]);

  const revokeToken = useCallback(async (): Promise<void> => {
    return revokeTokenMutation.mutateAsync();
  }, [revokeTokenMutation]);

  const clearAuth = useCallback(() => {
    setAuthState(initialAuthState);
    removeTokenFromStorage();
    queryClient.invalidateQueries({ queryKey: mcpAuthQueryKeys.all });
  }, [queryClient]);

  // ========================================================================
  // Return
  // ========================================================================

  const isLoading =
    requestTokenMutation.isPending ||
    refreshTokenMutation.isPending ||
    revokeTokenMutation.isPending;

  const isError =
    requestTokenMutation.isError ||
    refreshTokenMutation.isError ||
    revokeTokenMutation.isError;

  const error =
    authState.lastError ||
    (requestTokenMutation.error as MCPAuthError | null) ||
    (refreshTokenMutation.error as MCPAuthError | null) ||
    (revokeTokenMutation.error as MCPAuthError | null);

  return {
    state: authState,
    isLoading,
    isError,
    error,

    requestToken,
    verifyToken,
    refreshToken: refreshTokenFn,
    revokeToken,
    clearAuth,

    isTokenValid,
    tokenExpiresIn,
    needsRefresh: needsRefreshFlag,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * MCP 인증 상태만 조회하는 훅
 *
 * 인증 액션이 필요 없고 상태만 확인할 때 사용합니다.
 *
 * @example
 * ```tsx
 * function ProtectedContent() {
 *   const { isAuthenticated, serviceName } = useMCPAuthState();
 *
 *   if (!isAuthenticated) {
 *     return <LoginPrompt />;
 *   }
 *
 *   return <div>서비스: {serviceName}</div>;
 * }
 * ```
 */
export function useMCPAuthState() {
  const { state, isTokenValid, tokenExpiresIn, needsRefresh } = useMCPAuth();

  return {
    ...state,
    isTokenValid,
    tokenExpiresIn,
    needsRefresh,
  };
}

/**
 * 특정 서비스에 대한 인증 상태를 확인하는 훅
 *
 * @param serviceName - 확인할 서비스 이름
 *
 * @example
 * ```tsx
 * function MinuFindFeature() {
 *   const { isAuthenticated, isCurrentService } = useMCPServiceAuth('minu-find');
 *
 *   if (!isAuthenticated || !isCurrentService) {
 *     return <div>Minu Find 인증이 필요합니다</div>;
 *   }
 *
 *   return <MinuFindContent />;
 * }
 * ```
 */
export function useMCPServiceAuth(serviceName: MCPServiceName) {
  const auth = useMCPAuth();

  const isCurrentService = auth.state.serviceName === serviceName;

  return {
    ...auth,
    isCurrentService,
    isServiceAuthenticated: auth.state.isAuthenticated && isCurrentService,
  };
}

/**
 * MCP 토큰을 헤더에 포함하여 반환하는 훅
 *
 * API 호출 시 Authorization 헤더로 사용합니다.
 *
 * @example
 * ```tsx
 * function ApiComponent() {
 *   const { getAuthHeaders, isAuthenticated } = useMCPAuthHeaders();
 *
 *   const fetchData = async () => {
 *     const response = await fetch('/api/data', {
 *       headers: getAuthHeaders(),
 *     });
 *     // ...
 *   };
 * }
 * ```
 */
export function useMCPAuthHeaders() {
  const { state, isTokenValid } = useMCPAuth();

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!state.accessToken || !isTokenValid) {
      return {};
    }

    return {
      Authorization: `Bearer ${state.accessToken}`,
    };
  }, [state.accessToken, isTokenValid]);

  return {
    getAuthHeaders,
    isAuthenticated: state.isAuthenticated && isTokenValid,
    accessToken: isTokenValid ? state.accessToken : null,
  };
}

export default useMCPAuth;
