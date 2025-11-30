/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useMCPAuth Hook 테스트
 *
 * MCP 토큰 인증 훅 테스트
 * - 토큰 요청/검증/갱신/폐기
 * - 자동 토큰 갱신 로직
 * - 로컬 스토리지 세션 관리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useMCPAuth, {
  useMCPAuthState,
  useMCPServiceAuth,
  useMCPAuthHeaders,
} from '@/hooks/useMCPAuth';
import * as mcpAuthLib from '@/lib/mcp-auth';
import type { MCPTokenResponse, MCPTokenVerifyResponse } from '@/types/mcp-auth.types';
import React from 'react';

// Mock dependencies
vi.mock('@/lib/mcp-auth', () => ({
  requestMCPToken: vi.fn(),
  verifyMCPToken: vi.fn(),
  refreshMCPToken: vi.fn(),
  revokeMCPToken: vi.fn(),
  getStoredTokenIfValid: vi.fn(),
  removeTokenFromStorage: vi.fn(),
  calculateTokenExpiresIn: vi.fn(),
  needsTokenRefresh: vi.fn(),
  isMCPAuthError: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  })),
}));

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMCPAuth', () => {
  const mockTokenResponse: MCPTokenResponse = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-123',
    tokenType: 'Bearer',
    expiresIn: 3600,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    scopes: ['read', 'write'],
    serviceName: 'minu-find',
  };

  const mockVerifyResponse: MCPTokenVerifyResponse = {
    valid: true,
    status: 'valid',
    expiresAt: mockTokenResponse.expiresAt,
    remainingTime: 3600,
    userId: 'user-123',
    serviceName: 'minu-find',
    scopes: ['read', 'write'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // 기본 mock 설정
    vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(null);
    vi.mocked(mcpAuthLib.calculateTokenExpiresIn).mockReturnValue(3600);
    vi.mocked(mcpAuthLib.needsTokenRefresh).mockReturnValue(false);
    vi.mocked(mcpAuthLib.isMCPAuthError).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('초기화', () => {
    it('초기 상태는 인증되지 않은 상태여야 함', () => {
      // Execute
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.accessToken).toBeNull();
      expect(result.current.state.refreshToken).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('저장된 유효한 토큰이 있으면 세션을 복원해야 함', () => {
      // Setup
      const storedToken = {
        accessToken: 'stored-access-token',
        refreshToken: 'stored-refresh-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        serviceName: 'minu-find' as const,
        scopes: ['read'],
        createdAt: new Date().toISOString(),
      };

      vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(storedToken);

      // Execute
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.state.isAuthenticated).toBe(true);
      expect(result.current.state.accessToken).toBe(storedToken.accessToken);
      expect(result.current.state.serviceName).toBe(storedToken.serviceName);
    });

    it('저장된 토큰이 없으면 초기 상태여야 함', () => {
      // Setup
      vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(null);

      // Execute
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.accessToken).toBeNull();
    });
  });

  describe('requestToken', () => {
    it('토큰을 성공적으로 요청해야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Execute
      await act(async () => {
        await result.current.requestToken('minu-find', ['read', 'write']);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
      });

      expect(result.current.state.accessToken).toBe(mockTokenResponse.accessToken);
      expect(result.current.state.serviceName).toBe('minu-find');
      expect(mcpAuthLib.requestMCPToken).toHaveBeenCalledWith('minu-find', ['read', 'write']);
    });

    it('토큰 요청 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const error = new Error('Token request failed');
      vi.mocked(mcpAuthLib.requestMCPToken).mockRejectedValue(error);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Execute
      await act(async () => {
        try {
          await result.current.requestToken('minu-find');
        } catch (e) {
          // 에러 무시
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.state.isAuthenticated).toBe(false);
    });

    it('토큰 요청 후 쿼리를 무효화해야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Execute
      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
      });
    });
  });

  describe('verifyToken', () => {
    it('토큰을 성공적으로 검증해야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.verifyMCPToken).mockResolvedValue(mockVerifyResponse);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // 먼저 토큰 획득
      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Execute
      let verifyResult: MCPTokenVerifyResponse | undefined;
      await act(async () => {
        verifyResult = await result.current.verifyToken();
      });

      // Assert
      expect(verifyResult).toEqual(mockVerifyResponse);
      expect(mcpAuthLib.verifyMCPToken).toHaveBeenCalledWith(
        mockTokenResponse.accessToken,
        'minu-find'
      );
    });

    it('액세스 토큰이 없으면 에러를 던져야 함', async () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Execute & Assert
      await expect(async () => {
        await result.current.verifyToken();
      }).rejects.toThrow('액세스 토큰이 없습니다');
    });
  });

  describe('refreshToken', () => {
    it('토큰을 성공적으로 갱신해야 함', async () => {
      // Setup
      const newTokenResponse = {
        ...mockTokenResponse,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.refreshMCPToken).mockResolvedValue(newTokenResponse);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // 먼저 토큰 획득
      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Execute
      await act(async () => {
        await result.current.refreshToken();
      });

      // Assert
      await waitFor(() => {
        expect(result.current.state.accessToken).toBe('new-access-token');
      });

      expect(result.current.state.isRefreshing).toBe(false);
    });

    it('토큰 갱신 중 isRefreshing 플래그를 설정해야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.refreshMCPToken).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockTokenResponse), 100);
          })
      );

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // 먼저 토큰 획득
      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Execute
      act(() => {
        result.current.refreshToken();
      });

      // Assert - 갱신 중
      await waitFor(() => {
        expect(result.current.state.isRefreshing).toBe(true);
      });

      // 타이머 진행
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Assert - 갱신 완료
      await waitFor(() => {
        expect(result.current.state.isRefreshing).toBe(false);
      });
    });

    it('리프레시 토큰이 없으면 에러를 던져야 함', async () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Execute & Assert
      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (e) {
          // 에러 발생 예상
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('토큰 갱신 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.refreshMCPToken).mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Execute
      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (e) {
          // 에러 무시
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.state.isRefreshing).toBe(false);
      });
    });
  });

  describe('revokeToken', () => {
    it('토큰을 성공적으로 폐기해야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.revokeMCPToken).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Execute
      await act(async () => {
        await result.current.revokeToken();
      });

      // Assert
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(false);
      });

      expect(result.current.state.accessToken).toBeNull();
      expect(result.current.state.refreshToken).toBeNull();
      expect(mcpAuthLib.removeTokenFromStorage).toHaveBeenCalled();
    });

    it('액세스 토큰과 리프레시 토큰을 모두 폐기해야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.revokeMCPToken).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Execute
      await act(async () => {
        await result.current.revokeToken();
      });

      // Assert
      expect(mcpAuthLib.revokeMCPToken).toHaveBeenCalledTimes(2);
      expect(mcpAuthLib.revokeMCPToken).toHaveBeenCalledWith(mockTokenResponse.accessToken);
      expect(mcpAuthLib.revokeMCPToken).toHaveBeenCalledWith(
        mockTokenResponse.refreshToken,
        'refresh'
      );
    });
  });

  describe('clearAuth', () => {
    it('인증 상태를 완전히 초기화해야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Execute
      act(() => {
        result.current.clearAuth();
      });

      // Assert
      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.accessToken).toBeNull();
      expect(result.current.state.refreshToken).toBeNull();
      expect(mcpAuthLib.removeTokenFromStorage).toHaveBeenCalled();
    });
  });

  describe('자동 토큰 갱신', () => {
    it('만료 임박 시 자동으로 토큰을 갱신해야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.needsTokenRefresh).mockReturnValue(true);
      vi.mocked(mcpAuthLib.refreshMCPToken).mockResolvedValue(mockTokenResponse);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Execute - 1분 경과 시뮬레이션
      await act(async () => {
        vi.advanceTimersByTime(60 * 1000);
      });

      // Assert
      await waitFor(() => {
        expect(mcpAuthLib.refreshMCPToken).toHaveBeenCalled();
      });
    });

    it('만료가 임박하지 않으면 갱신하지 않아야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.needsTokenRefresh).mockReturnValue(false);
      vi.mocked(mcpAuthLib.refreshMCPToken).mockResolvedValue(mockTokenResponse);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Execute - 1분 경과 시뮬레이션
      await act(async () => {
        vi.advanceTimersByTime(60 * 1000);
      });

      // Assert
      expect(mcpAuthLib.refreshMCPToken).not.toHaveBeenCalled();
    });

    it('자동 갱신 중 에러 발생 시 에러를 로깅해야 함', async () => {
      // Setup
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.needsTokenRefresh).mockReturnValue(true);
      vi.mocked(mcpAuthLib.refreshMCPToken).mockRejectedValue(new Error('Auto refresh failed'));

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Execute
      await act(async () => {
        vi.advanceTimersByTime(60 * 1000);
      });

      // Assert
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[MCP Auth] 토큰 자동 갱신 실패'),
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('토큰 유효성 검사', () => {
    it('유효한 토큰일 때 isTokenValid가 true여야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.calculateTokenExpiresIn).mockReturnValue(3600);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Assert
      expect(result.current.isTokenValid).toBe(true);
      expect(result.current.tokenExpiresIn).toBe(3600);
    });

    it('만료된 토큰일 때 isTokenValid가 false여야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.calculateTokenExpiresIn).mockReturnValue(-1);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Assert
      expect(result.current.isTokenValid).toBe(false);
    });

    it('needsRefresh 플래그를 올바르게 반환해야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);
      vi.mocked(mcpAuthLib.needsTokenRefresh).mockReturnValue(true);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.requestToken('minu-find');
      });

      // Assert
      expect(result.current.needsRefresh).toBe(true);
    });
  });
});

describe('useMCPAuthState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(null);
  });

  it('인증 상태만 반환해야 함', () => {
    // Execute
    const { result } = renderHook(() => useMCPAuthState(), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });
});

describe('useMCPServiceAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(null);
    vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      scopes: ['read'],
      serviceName: 'minu-find',
    });
  });

  it('특정 서비스 인증 상태를 확인해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useMCPServiceAuth('minu-find'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.requestToken('minu-find');
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isCurrentService).toBe(true);
    });

    expect(result.current.isServiceAuthenticated).toBe(true);
  });

  it('다른 서비스일 때 isCurrentService가 false여야 함', async () => {
    // Execute
    const { result } = renderHook(() => useMCPServiceAuth('minu-build'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.requestToken('minu-find');
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isCurrentService).toBe(false);
    });

    expect(result.current.isServiceAuthenticated).toBe(false);
  });
});

describe('useMCPAuthHeaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(null);
    vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue({
      accessToken: 'token-123',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      scopes: ['read'],
      serviceName: 'minu-find',
    });
    vi.mocked(mcpAuthLib.calculateTokenExpiresIn).mockReturnValue(3600);
  });

  it('유효한 토큰으로 Authorization 헤더를 생성해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useMCPAuthHeaders(), {
      wrapper: createWrapper(),
    });

    // 먼저 토큰 획득
    await act(async () => {
      const authResult = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });
      await authResult.result.current.requestToken('minu-find');
    });

    // 새로운 훅 렌더링
    const { result: headerResult } = renderHook(() => useMCPAuthHeaders(), {
      wrapper: createWrapper(),
    });

    // Assert
    const headers = headerResult.current.getAuthHeaders();
    expect(headers).toEqual({
      Authorization: 'Bearer token-123',
    });
  });

  it('토큰이 없을 때 빈 객체를 반환해야 함', () => {
    // Execute
    const { result } = renderHook(() => useMCPAuthHeaders(), {
      wrapper: createWrapper(),
    });

    // Assert
    const headers = result.current.getAuthHeaders();
    expect(headers).toEqual({});
  });
});
